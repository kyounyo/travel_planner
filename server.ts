import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize server-side Gemini client
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey
  ? new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    })
  : null;

// Helper to perform robust retries with exponential backoff for transient Gemini failures
async function generateContentWithRetry(params: any): Promise<any> {
  if (!ai) {
    throw new Error("Gemini API key is not configured.");
  }
  const maxRetries = 5;
  let delay = 1500; // Start with 1.5s delay
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await ai.models.generateContent(params);
    } catch (err: any) {
      const errStr = String(err?.message || err);
      // Detect 503 AVAILABLE / overloading / high demand / limit, which are transient
      const isTransient =
        errStr.includes("503") ||
        errStr.includes("UNAVAILABLE") ||
        errStr.includes("high demand") ||
        errStr.includes("Resource has been exhausted") ||
        errStr.includes("exceeded quota") ||
        errStr.includes("429") ||
        errStr.includes("overloaded");

      if (isTransient && attempt < maxRetries) {
        console.warn(`[Gemini API Retry] Transient error encountered on attempt ${attempt}/${maxRetries}: ${errStr}. Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      } else {
        throw err;
      }
    }
  }
}

function enforceFlightBoundaries(itinerary: any[], flights: any[]): any[] {
  if (!itinerary || !Array.isArray(itinerary) || itinerary.length === 0) {
    return itinerary;
  }
  if (!flights || !Array.isArray(flights) || flights.length === 0) {
    return itinerary;
  }

  const departFlight = flights.find(f => f.type === 'depart');
  const returnFlight = flights.find(f => f.type === 'return');

  const parseTimeToMinutes = (timeStr: string): number => {
    if (!timeStr) return 0;
    const firstPart = timeStr.split("-")[0].trim().toLowerCase();
    const match = firstPart.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
    if (!match) {
      const simpleMatch = firstPart.match(/(\d{1,2})/);
      if (simpleMatch) {
         return parseInt(simpleMatch[1], 10) * 60;
      }
      return 0;
    }
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const ampm = match[3]?.toLowerCase();
    if (ampm === "pm" && hours < 12) hours += 12;
    if (ampm === "am" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  const sortedItinerary = [...itinerary].sort((a, b) => a.dayIndex - b.dayIndex);

  sortedItinerary.forEach((day: any) => {
    const dayDateStrString = day.date; // e.g. "2026-06-18"
    if (!dayDateStrString) return;

    // 1. Depart Flight Arrival check on the matching date
    if (departFlight && departFlight.arrivalTime) {
      const flightArrivalDate = departFlight.arrivalTime.substring(0, 10); // "2026-06-18"
      if (dayDateStrString === flightArrivalDate) {
        const arrivalTimeStr = departFlight.arrivalTime.includes("T") 
          ? departFlight.arrivalTime.split("T")[1] 
          : departFlight.arrivalTime;
        const arrivalMin = parseTimeToMinutes(arrivalTimeStr);
        if (arrivalMin > 0) {
          day.activities = day.activities.filter((act: any) => {
            if (act.type === "airport" || act.type === "checkin" || act.title?.toLowerCase().includes("check-in") || act.title?.toLowerCase().includes("airport")) return true;
            const actMin = parseTimeToMinutes(act.time);
            return actMin >= arrivalMin;
          });
        }
      }
    }

    // 2. Return Flight Departure check on the matching date
    if (returnFlight && returnFlight.departureTime) {
      const flightReturnDate = returnFlight.departureTime.substring(0, 10); // "2026-06-25"
      if (dayDateStrString === flightReturnDate) {
        const departureTimeStr = returnFlight.departureTime.includes("T") 
          ? returnFlight.departureTime.split("T")[1] 
          : returnFlight.departureTime;
        const departMin = parseTimeToMinutes(departureTimeStr);
        if (departMin > 0) {
          day.activities = day.activities.filter((act: any) => {
            if (act.type === "airport" || act.title?.toLowerCase().includes("airport")) return true;
            const actMin = parseTimeToMinutes(act.time);
            return actMin <= departMin;
          });
        }
      }
    }
  });

  return sortedItinerary;
}

async function adjustItineraryForRealWorldTransit(itinerary: any[], flights: any[] = []): Promise<any[]> {
  const apiKey = process.env.GOOGLE_MAPS_PLATFORM_KEY;
  const hasMapsKey = apiKey && apiKey !== "YOUR_API_KEY";
  
  if (!itinerary || !Array.isArray(itinerary) || itinerary.length === 0) {
    return itinerary;
  }
  
  // Clean time formatting helper (HH:MM AM/PM)
  const formatMinutesToTime = (minutes: number): string => {
    let hrs = Math.floor(minutes / 60) % 24;
    const mins = minutes % 60;
    const ampm = hrs >= 12 ? "PM" : "AM";
    let displayHrs = hrs % 12;
    if (displayHrs === 0) displayHrs = 12;
    const padMins = mins.toString().padStart(2, "0");
    return `${displayHrs}:${padMins} ${ampm}`;
  };

  const getMinutes = (timeStr: string): number => {
    try {
      const match = timeStr.trim().toLowerCase().match(/(\d+)(?::(\d+))?\s*(am|pm)?/);
      if (match) {
        let hours = parseInt(match[1], 10);
        const minutes = match[2] ? parseInt(match[2], 10) : 0;
        const ampm = match[3];
        if (ampm === "pm" && hours < 12) hours += 12;
        if (ampm === "am" && hours === 12) hours = 0;
        return hours * 60 + minutes;
      }
    } catch (_) {}
    return 0;
  };

  const parseActivityTimes = (timeSlot: string) => {
    if (!timeSlot) return { start: 0, end: 0 };
    const normalized = timeSlot.replace(/\s+to\s+/gi, " - ");
    const parts = normalized.split("-");
    if (parts.length === 0) return { start: 0, end: 0 };
    const start = getMinutes(parts[0]);
    const end = parts.length > 1 ? getMinutes(parts[1]) : start + 60;
    return { start, end };
  };

  for (const day of itinerary) {
    if (!day.activities || !Array.isArray(day.activities) || day.activities.length === 0) continue;
    
    // Enrich with helper values
    day.activities = day.activities.map((act) => {
      const times = parseActivityTimes(act.time);
      return { 
        ...act, 
        _startMin: times.start, 
        _endMin: times.end, 
        _origDuration: Math.max(30, times.end - times.start) 
      };
    });

    // Sort to be perfectly safe
    day.activities.sort((a, b) => a._startMin - b._startMin);

    for (let i = 0; i < day.activities.length - 1; i++) {
      const actA = day.activities[i];
      const actB = day.activities[i + 1];
      
      if (!actA.location || !actB.location) continue;
      if (actA.location.trim().toLowerCase() === actB.location.trim().toLowerCase()) continue;

      // Do not auto-assign preferredTransportMode on initial generation so that the user gets to select of their own desire.

      let travelDurationMinutes = 15; // Default safety slot
      let distanceText = "Calculated commute";
      const preferredMode = actB.preferredTransportMode || "transit";

      const modeLower = (actB.transportation?.mode || "").toLowerCase();
      const matchesPreferred = 
        (preferredMode === "walking" && (modeLower.includes("walk") || modeLower.includes("foot"))) ||
        (preferredMode === "driving" && (modeLower.includes("driving") || modeLower.includes("taxi") || modeLower.includes("car") || modeLower.includes("uber") || modeLower.includes("grab"))) ||
        (preferredMode === "transit" && (modeLower.includes("transit") || modeLower.includes("train") || modeLower.includes("metro") || modeLower.includes("subway") || modeLower.includes("bus")));

      const useExistingTransportation = actB.transportation && actB.transportation.mode && actB.transportation.duration && (matchesPreferred || !actB.preferredTransportMode);

      if (useExistingTransportation) {
        const parsedDur = parseInt(actB.transportation.duration, 10);
        if (!isNaN(parsedDur) && parsedDur > 0) {
          travelDurationMinutes = parsedDur;
        }
        if (actB.transportation.distance) {
          distanceText = actB.transportation.distance;
        }
      } else {
        // Set dynamic fallback commute
        if (preferredMode === "driving") {
          travelDurationMinutes = 18;
          distanceText = "4.2 km";
          actB.transportation = {
            mode: "Taxi / Car",
            duration: "18 mins",
            distance: "4.2 km",
            cost: "¥1,800 - ¥2,900",
            details: `Commute from "${actA.title}" to "${actB.title}" via taxi/car`
          };
        } else if (preferredMode === "walking") {
          travelDurationMinutes = 12;
          distanceText = "0.8 km";
          actB.transportation = {
            mode: "Walking",
            duration: "12 mins",
            distance: "0.8 km",
            cost: "Free",
            details: `Walk from "${actA.title}" to "${actB.title}"`
          };
        } else {
          travelDurationMinutes = 25;
          distanceText = "3.5 km";
          actB.transportation = {
            mode: "Public Transit",
            duration: "25 mins",
            distance: "3.5 km",
            cost: "¥220",
            details: `Subway/bus commute from "${actA.title}" to "${actB.title}"`
          };
        }
      }

      if (hasMapsKey) {
        try {
          const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(actA.location)}&destinations=${encodeURIComponent(actB.location)}&mode=${preferredMode}&key=${apiKey}`;
          const response = await fetch(url);
          const data = await response.json();
          if (data && data.rows && data.rows[0]?.elements?.[0]?.status === "OK") {
            const el = data.rows[0].elements[0];
            travelDurationMinutes = Math.round(el.duration.value / 60);
            distanceText = el.distance.text;
            
            // Populate exactly calculated commute
            actB.transportation = {
              mode: preferredMode === "driving" ? "Taxi / Car" : preferredMode === "walking" ? "Walking" : "Public Transit",
              duration: `${travelDurationMinutes} mins`,
              distance: distanceText,
              cost: preferredMode === "driving" ? "¥1,500 - ¥3,500" : preferredMode === "walking" ? "Free" : "¥220 - ¥400",
              details: `Commute from "${actA.title}" to "${actB.title}" via ${preferredMode}`
            };
          }
        } catch (err) {
          console.warn("Realtime transit checking failed for pair:", err);
        }
      }

      // Resolve warnings where available gap violates the physical speed limits/transit durations
      const currentGap = actB._startMin - actA._endMin;
      const requiredGap = travelDurationMinutes;
      
      if (currentGap < requiredGap) {
        const originalStart = actB._startMin;
        const newStart = actA._endMin + requiredGap + 10; // Add 10 mins padding buffer
        const shiftAmount = newStart - originalStart;

        // Propagate timeslot shifts for this activity and everything down the line
        for (let j = i + 1; j < day.activities.length; j++) {
          const subAct = day.activities[j];
          subAct._startMin += shiftAmount;
          subAct._endMin += shiftAmount;
          subAct.time = `${formatMinutesToTime(subAct._startMin)} - ${formatMinutesToTime(subAct._endMin)}`;
        }
      }
    }

    // Strip temp properties
    day.activities = day.activities.map(act => {
      const { _startMin, _endMin, _origDuration, ...rest } = act;
      return rest;
    });
  }

  return itinerary;
}

// Multi-Agent Planning Endpoint
app.post("/api/plan-trip", async (req, res) => {
  if (!ai) {
    return res.status(400).json({
      error: "Gemini API Key is not configured on the server. Please add GEMINI_API_KEY to your secrets.",
    });
  }

  try {
    const {
      destinations,
      startDate,
      endDate,
      flights,
      hotels,
      preferences,
      customEdits,
      feedbackRatings,
      wantToGoPlaces,
      itinerary,
    } = req.body;

    if (!destinations || destinations.length === 0) {
      return res.status(400).json({ error: "At least one destination is required." });
    }

    // Construct detailed prompt showcasing the multi-agent flow
    const flightText = flights && flights.length > 0 
      ? flights.map((f: any, i: number) => 
          `Flight ${i+1}: ${f.type === 'depart' ? 'Departure (Outbound)' : 'Return'} flight ${f.flightNo || 'N/A'} from ${f.departureAirport || 'N/A'} to ${f.arrivalAirport || 'N/A'}. Depart time: ${f.departureTime || 'N/A'}, Arrive time: ${f.arrivalTime || 'N/A'}`
        ).join("\n")
      : "No flights booked yet.";

    const hotelText = hotels && hotels.length > 0
      ? hotels.map((h: any, i: number) => 
          `Hotel ${i+1}: ${h.name || 'N/A'} (Check-in: ${h.checkIn || 'N/A'}, Check-out: ${h.checkOut || 'N/A'}, Address/Location: ${h.locationUrl || h.name || 'N/A'})`
        ).join("\n")
      : "No hotels booked yet.";

    const wantToGoText = wantToGoPlaces && wantToGoPlaces.length > 0
      ? `CRITICAL "Want to Go" Places List from the User:\n` + 
        `The user has explicitly specified a checklist of attractions they want to visit. You MUST include and schedule AS MANY of these places into the Day-to-Day activities flow as possible across the itinerary:\n` +
        wantToGoPlaces.map((place: string) => `- "${place}"`).join("\n")
      : "";

    const feedbackText = feedbackRatings && feedbackRatings.length > 0
      ? `Ensure you respect user's feedback/ratings on past activities:\n` + 
        feedbackRatings.map((rating: any) => `- User rated "${rating.title}" as ${rating.rating}/5 stars. Notes: ${rating.comment || 'None'}`).join("\n")
      : "";

    const userInstructionsText = customEdits 
      ? `CRITICAL Directives/Custom Requests from User (You MUST follow and fulfill ALL of these sequential/layered instructions simultaneously, keeping previous edits in place. Do NOT discard any of these requirements):\n${customEdits}\nUpdate the itinerary to reflect ALL of the above requests combined.`
      : "";

    const existingItineraryText = itinerary && itinerary.length > 0
      ? `\n### EXTREMELY CRITICAL: CURRENT ACTIVE ITINERARY TO REFINE\n` +
        `This is the current active day-to-day schedule that the traveler is viewing. You are performing a REFINE/ADD/REMOVE/EDIT operation on it.\n` +
        `STRICT SCHEDULE LAYOUT PRESERVATION MANDATES:\n` +
        `- DO NOT change, delete, swap, or rearrange any unaffected activities. They must remain in the same sequence on the same days, with their existing dates, titles, descriptions, opening hours, cost fields, and IDs preserved EXACTLY.\n` +
        `- ONLY perform targeted additions (e.g. inserting an activity slot), removals, or details editing as requested by the user's latest directives.\n` +
        `- Keep themes and everything else unchanged unless explicitly asked otherwise.\n` +
        `- If you add a slot, place it chronologically in the active day's activities list and ensure neighboring transitions are updated, but keep non-neighboring transitions and all other days exactly identical.\n\n` +
        `Current Itinerary State:\n${JSON.stringify(itinerary, null, 2)}\n`
      : "";

    // Pre-calculate exact list of dates and count to ensure Gemini does not truncate or miscalculate dates
    const start = new Date(startDate + "T00:00:00");
    const end = new Date(endDate + "T00:00:00");
    const daysList: string[] = [];
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      let current = new Date(start);
      let safetyCounter = 0;
      while (current <= end && safetyCounter < 100) {
        daysList.push(current.toISOString().split("T")[0]);
        current.setDate(current.getDate() + 1);
        safetyCounter++;
      }
    }
    const exactDaysCount = daysList.length > 0 ? daysList.length : 1;
    const exactDatesText = daysList.map((d, i) => `Day ${i + 1}: ${d}`).join("\n");

    const prompt = `
You are a highly collaborative Multi-Agent Travel Planner AI representing four specialized roles working together to design the ultimate fully-scalable, interactive trip itinerary:
1. **Planner Agent**: Designs the structure of daily schedules, ensuring activities are grouped logic-geographically and fit perfectly between flight arrival/departure boundaries.
2. **Budget Agent**: Analyzes expenses, provides realistic cost range estimates (in local currency), and raises alerts for financial overflow.
3. **Transport Agent**: Recommends real-time transit options (walking, trains, taxis) with realistic commute times between activities.
4. **Food Agent**: Curates delicious, region-specific eating highlights near the daily itineraries.

### Trip Details
- Destinations: ${JSON.stringify(destinations)}
- Start Date: ${startDate}
- End Date: ${endDate}
- Exact Trip Duration: ${exactDaysCount} days
- Exact Required Dates List (You MUST generate exactly ${exactDaysCount} day-by-day itineraries, one for each date listed here):
${exactDatesText}
- Booked Flights Information (STRICT RULE: Day 1 activities must start AFTER the departing flight arrival time, and final Day activities must end in time for return flight boarding):
${flightText}
- Booked Hotels Information (Ensure hotel check-in/out matches activities, and hotel location is the start/end point):
${hotelText}
${wantToGoText}
- Extra User Preferences/Interests: "${preferences || 'No specific preferences'}"
${feedbackText}
${userInstructionsText}
${existingItineraryText}

### Instructions for Generating the Plan:
- CRITICAL FLIGHT & HOTEL BOUNDARIES RULE: The generated schedule must ALWAYS strictly adhere to flight bookings. 
  - FIRST GENERATED ITINERARY STRICT INTEGRITY (STRICT NO-POST-RETURN-FLIGHT-ACTIVITIES RULE): Under no circumstances should you generate any activities, hotel check-ins, check-outs, dinners, or routes after the user's final return flight has departed or landed back in their homecountry. If the return flight is on a Day X, that return flight landing must be the absolute final item in the schedule for that day and trip. DO NOT suggest "explore neighborhood" or "dinner at restaurant" or check-ins on the night of returning home.
  - MIDNIGHT / EARLY MORNING RETURN FLIGHTS: If the return flight departure is in the high midnight or early morning hours (e.g. between 12:00 AM midnight and 05:00 AM) of Day X:
    - You MUST treat Day X as having NO daytime activities (no lunches, afternoon tours, or 11:00 AM hotel checkouts), because the flight departs during the very first hours of that date!
    - The "Hotel Check-out" and "Transit/Commute to Airport" activities MUST be scheduled on the PREVIOUS day's evening/night (Day X-1) e.g., around 10:00 PM or 11:00 PM, so that the traveler arrives at the airport in time for their flight!
    - On Day X itself, only output the flight activity itself at the flight time, or keep Day X activities completely empty after the early departure so that no travel boundaries are ever violated!
  - CRITICAL MULTI-HOTEL LOGICAL TRANSITIONS AND STAY BASES:
    - You must carefully analyze the check-in and check-out dates of each booked hotel! (For example, if Osaka hotel is booked on "2026-07-04" to "2026-07-09" and Tokyo hotel is booked on "2026-07-05" to "2026-07-06").
    - Under NO circumstances can a traveler be scheduled to stay overnight or spend late evening in a city if they have no active hotel booking there for that night! They CANNOT remain or be active in a city like Tokyo after checking out at 11:00 AM on "2026-07-06" if they do not have a hotel booked in Tokyo for the night of "2026-07-06". They must live where their active hotel booking is!
    - At all times, track the "currently active home/hotel base" per date. If the traveler checks out of a nested stay (like Tokyo hotel check-out on "2026-07-06" at 11:00 AM) while they still have a broader active booking elsewhere (like Osaka hotel booked from "2026-07-04" to "2026-07-09"), they MUST immediately travel back. You MUST schedule checkout, followed by transit (e.g. bullet train back to Osaka) on the checkout date itself (e.g., "2026-07-06" around noon), and then plan all subsequent activities on that day in the remaining active hotel city (Osaka)! No Tokyo activities are allowed after checkout unless transitioning!
    - Conversely, if they are transitioning from Osaka to Tokyo on "2026-07-05", you must include the transit to Tokyo, and then check-in at the Tokyo hotel starting at ~03:00 PM (15:00).
  - MANDATORY HOTEL CHECK-IN & CHECK-OUT SLOTS and STRICT HOTEL-TO-HOTEL TRANSITIONS:
    - For every hotel details listed in the trip:
      - You MUST explicitly include a "Hotel Check-in: [Hotel Name]" activity slot in the schedule on the check-in date (usually at ~03:00 PM or 15:00) with a title like "Hotel Check-in: [Hotel Name]".
      - You MUST explicitly include a "Hotel Check-out: [Hotel Name]" activity slot in the schedule on the check-out date (typically at ~11:00 AM, OR on the evening of the previous day if there is a midnight flight as described above!) with a title like "Hotel Check-out: [Hotel Name]".
    - STRICT HOTEL-TO-HOTEL PROCESS TRANSITION RULE: Under no circumstances can you suggest checking out of Hotel A and immediately checking in to Hotel B in the block sequentially. You MUST always include an intermediate process of transportation, commute, or transit to the city travel/station between them. For example:
      1. "Hotel Check-out: [Hotel Name A]"
      2. "Commute & Transit to Station/Airport" (e.g., transit route via Tokaido Shinkansen or local subway station)
      3. "Commute & Travel to New Destination Base"
      4. "Hotel Check-in: [Hotel Name B]"
  - MANDATORY FLIGHT ARRIVAL & AIRPORT RETURN TRANSITION SLOTS:
    - For every depart or outbound flight in the trip:
      - You MUST explicitly schedule a "Flight Landing & Arrival at [Airport name/code]" activity slot in the Day-by-Day schedule, at the exact arrival time of that flight.
      - You MUST explicitly schedule a "Commute & Return to [Airport name/code] for Departure" activity slot in the Day-by-Day schedule, starting exactly 2-3 hours before the flight departure time.
    - For multi-stop route transitions or flight transitions between countries/cities:
      - You MUST strictly generate and link these events sequentially as separate Activities on their respective dates and times:
        1. "Hotel Check-out: [Hotel Name]" (e.g. in Singapore)
        2. "Commute to [Airport Code]" (to travel to the airport in that country)
        3. "Arrival at Airport, Flight Boarding & Flight Departure (Singapore to Manila)" (explicitly represent the airport flight departure)
        4. "Flight Landing & Arrival at [Next Airport Code]" (flight landing in the next country/destination)
        5. "Commute from Airport to City / [New Hotel Name]" (airport to city travel)
        6. "Hotel Check-in: [New Hotel Name]" (at the new hotel, stating times clearly)
      Be extremely detailed and specific, stating check-in/out times of every single hotel and commute times to and from airports for every flight transition.
  - No activities may ever be planned during flight times themselves. No attractions should be scheduled on the night after the departure flight has already left.
  - Hotel check-in/check-out dates and locations should be honored as starting/ending bases or active accommodations.
- STRICT SPECIFIC NOT-DUPLICATED DAY-BY-DAY SCHEDULES (VARIETY RULE):
  - Every day in the itinerary MUST have a completely different theme, set of activities, places to eat, and explore. Do NOT output duplicate or identical schedules/places on different days.
- STRICT ACTIVE HOTEL BASE NEIGHBORHOOD CLUSTERING:
  - You must always structure a day's recommended places strictly based on where the user is checked in for that day! Recommended restaurants and attractions must not be "too far away" from the checked-in hotel for that date (generally within a tight neighborhood cluster of 2-5 km, unless a specific day excursion is explicitly planned).
  - In your daily activities, explicitly state the current active checked-in hotel in the description and details to justify the proximity (e.g., "Conveniently located near your accommodation, [Hotel Name], only a 12-minute walk...").
  - If the user checkouts and moves to a different hotel, you MUST immediately shift the geographic frame of recommendations to be clustered near the *new* hotel and its surrounding area.
- STRICT DESTINATION LOCAL CURRENCY AND PRICING INTEGRITY:
  - For all ticket prices, budgets, food cost, and transportation costs parameters, you MUST output numbers and symbols in the actual local currency of the specific day's active country/destination (e.g., use '¥' and realistic Japanese Yen numbers for Japan, '₩' and realistic Korean Won numbers for South Korea, 'RM' and realistic Ringgit numbers for Malaysia).
  - Double check every numeric value to ensure it matches realistic price scales in that local currency (e.g., do NOT generate Taxi RM32,227 for a 22 mins ride! That ride should represent local currency value, e.g. RM25 to RM45, or JPY 3,000 to 5,000, or KRW 15,000 to 25,000 depending on destination). Ensure absolute mathematical realism for each currency.
- REFINEMENT & PRESERVATION POLICY:
  - If a CURRENT ACTIVE ITINERARY is provided above, you MUST preserve all existing activity structures, days, dates, IDs, titles, descriptions, and sequence layout. Do NOT shuffle or scramble them.
  - Only insert what is requested (such as "add a museum in Tokyo Day 2") into the correct day list, while returning all other unmodified days and activities exactly identical.
- Create a day-by-day plan covering the entire duration. You MUST generate exactly ${exactDaysCount} day-by-day itineraries, matching each entry in the "Exact Required Dates List" above sequentially. Do NOT skip any days and do NOT truncate the itinerary.
- Day 1 index must start at 1, ending at dayIndex ${exactDaysCount}. Let Day 1 start appropriately if a flight arrival is specified. Let the last day end in time for airport check-in if there is a departure flight.
- For each day, include a daily theme (e.g., "Culture & Shrines in Asakusa").
- For each full day (excluding key travel days limited by actual flights), provide 5 to 6 sequential activities spanning comprehensively from morning to night. It must cover breakfast/morning slot (around 8:00 AM - 10:00 AM), morning exploration (10:00 AM - 12:30 PM), lunch (12:30 PM - 2:00 PM), afternoon adventures/sightseeing (2:00 PM - 5:30 PM), dinner (6:00 PM - 8:00 PM), and an evening/night walking, skyline view, or night market stroll (8:00 PM - 10:00 PM). It must not stop at lunch or early afternoon - the schedule should fully cover morning to night.
- STRICT SPECIFICITY OF PLACES & ESTABLISHMENTS RULE:
  - Never use generic placeholder names like "Evening Dinner", "Night Walk", "Lunch at Local Cafe", "Local Restaurant", "Explore Neighborhood", "Walk in Park", or "Free Time".
  - For all dining slots (breakfast, lunch, dinner, drinks), you MUST name an ACTUAL, real-world, popular highly-rated business/restaurant (e.g., 'Gyukatsu Motomura', 'Afuri Ramen Shinjuku', 'Tapas Molecular Bar', 'Ichiran Sensoji'). Mention specific signature tourist-friendly dishes or food specialities (e.g., 'Wagyu set', 'Yuzu Shio Ramen', 'Teppanyaki') alongside their locations.
  - For all scenic, walking, or evening slots, you MUST name a specific, actual local landmark, observatory, night walk path, or neighborhood zone (e.g., 'Roppongi Hills Mori Tower Tokyo City View Observatory', 'Shibuya Crossing & Shibuya Sky', 'Shinjuku Golden Gai', 'Senso-ji Temple Outer Grounds Night Walk', 'Meguro River Cherry Blossom Promenade') instead of a general term like "sightseeing" or "walking".
- Every Activity MUST have:
  - Precise timestamp or time slot (e.g., "06:15 PM - 07:30 PM", leaving a clean 15-30 minute travel/commute buffer between the end of the previous activity and the start of this activity).
  - Title, description, and exact named google maps search location.
  - Opening hours (e.g. "10:00 AM - 10:00 PM") and a realistic local budget range (e.g. "¥1,000 - ¥2,500").
  - Realistic transportation details from the PREVIOUS activity/hotel to this one, including transport mode (e.g. "Subway (Ginza Line)", "Walk", "Taxi"), transit duration (e.g., "15 mins"), transit cost (e.g., "¥220"), and step-by-step route transit description.
- CRITICAL GEOGRAPHIC DISTANCE & TRANSIT TIMING COHERENCE:
  - You must determine the exact real-world distance between the current activity and the previous activity (or hotel) on the same day. Fill this into the "distance" field of the transportation object (e.g., "1.2 km", "0.4 km", "8.5 km").
  - Make sure venues scheduled on the same day are geographically clustered together so transit times make logical sense. Do not bounce between distant neighborhoods on the same day without allocating realistic transportation times and costs. Leave a 15-30 mins buffer of empty time between consecutive activities to cover actual Google Maps travel time and prevent overlapping conflicts.
  - Always output legitimate and accurate opening hours for attractions. Do not schedule venues outside their standard operation times.
- Generate checklists: To Pack (items typical for this destination and seasonal dates), To Buy (typical souvenirs, local tickets), and To Go (pre-travel tasks).
- Provide structural agents feedback notes explaining their contributions.
- Suggest actual websites/links (like trip.com) to book or checkout prices.
- Return everything strictly in JSON format as requested.
`;

    // Execute standard Gemini-3.5-flash content generation in JSON mode via retry wrapper
    const response = await generateContentWithRetry({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            trip: {
              type: Type.OBJECT,
              properties: {
                destinationName: { type: Type.STRING },
                startDate: { type: Type.STRING },
                endDate: { type: Type.STRING },
                durationDays: { type: Type.INTEGER },
              },
              required: ["destinationName", "startDate", "endDate"],
            },
            itinerary: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  dayIndex: { type: Type.INTEGER },
                  date: { type: Type.STRING },
                  theme: { type: Type.STRING },
                  activities: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        title: { type: Type.STRING },
                        type: { type: Type.STRING, description: "activity, food, checkin, airport" },
                        time: { type: Type.STRING },
                        description: { type: Type.STRING },
                        location: { type: Type.STRING, description: "Name of the place for Google Maps search/embed" },
                        openingHours: { type: Type.STRING },
                        budgetRange: { type: Type.STRING, description: "e.g. ¥1,500 - ¥3,000" },
                        ticketPrice: { type: Type.STRING, description: "e.g. ¥1,000" },
                        foodCost: { type: Type.STRING, description: "e.g. ¥1,500" },
                        transportation: {
                          type: Type.OBJECT,
                          properties: {
                            mode: { type: Type.STRING },
                            duration: { type: Type.STRING },
                            cost: { type: Type.STRING },
                            details: { type: Type.STRING },
                            distance: { type: Type.STRING },
                          },
                          required: ["mode", "duration"],
                        },
                      },
                      required: ["id", "title", "time", "description", "location"],
                    },
                  },
                },
                required: ["dayIndex", "date", "theme", "activities"],
              },
            },
            checklists: {
              type: Type.OBJECT,
              properties: {
                toGo: { type: Type.ARRAY, items: { type: Type.STRING } },
                toPack: { type: Type.ARRAY, items: { type: Type.STRING } },
                toBuy: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ["toGo", "toPack", "toBuy"],
            },
            budgetStats: {
              type: Type.OBJECT,
              properties: {
                currency: { type: Type.STRING },
                estimatedTotal: { type: Type.INTEGER },
                breakdown: {
                  type: Type.OBJECT,
                  properties: {
                    flights: { type: Type.INTEGER },
                    accommodation: { type: Type.INTEGER },
                    activities: { type: Type.INTEGER },
                    food: { type: Type.INTEGER },
                    transport: { type: Type.INTEGER },
                  },
                },
                budgetFeedback: { type: Type.STRING },
              },
              required: ["currency", "estimatedTotal"],
            },
            agentsFeedback: {
              type: Type.OBJECT,
              properties: {
                plannerNotes: { type: Type.STRING },
                budgetNotes: { type: Type.STRING },
                transportNotes: { type: Type.STRING },
                foodNotes: { type: Type.STRING },
              },
              required: ["plannerNotes", "budgetNotes", "transportNotes", "foodNotes"],
            },
            usefulLinks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  url: { type: Type.STRING },
                  category: { type: Type.STRING },
                },
              },
            },
          },
          required: ["trip", "itinerary", "checklists", "budgetStats", "agentsFeedback"],
        },
      },
    });

    const resultText = response.text;
    const parsedData = JSON.parse(resultText);

    if (parsedData && parsedData.itinerary) {
      parsedData.itinerary = enforceFlightBoundaries(parsedData.itinerary, flights || []);
      parsedData.itinerary = await adjustItineraryForRealWorldTransit(parsedData.itinerary, flights || []);
    }

    res.json(parsedData);
  } catch (error: any) {
    console.error("Error generating trip plan:", error);
    const errMsg = error?.message || String(error);
    if (errMsg.includes("503") || errMsg.includes("UNAVAILABLE") || errMsg.includes("demand") || errMsg.includes("overloaded")) {
      res.status(400).json({
        error: "Our AI Travel Agents are currently experiencing high server demand. We attempted multiple automatic retries, but the model is still temporarily busy. Please wait a few seconds and try clicking 'Plan My Route' again."
      });
    } else {
      res.status(400).json({ error: errMsg || "Failed to generate plan." });
    }
  }
});

// Assistant Copilot Quick Chat (Multi-Agent RAG Knowledge Base style)
app.post("/api/chat-agent", async (req, res) => {
  if (!ai) {
    return res.status(400).json({ error: "Gemini API is not configured." });
  }

  try {
    const { message, tripContext } = req.body;

    const chatPrompt = `
You are the Lead Travel AI agent. You have access to three specialty advisors (Transport Agent, Food Advisor, and Budget Analyst).
Context on current trip: ${JSON.stringify(tripContext || "No trip defined yet.")}

User Message: "${message}"

Respond helpful, keeping with active context, recommending travel ideas, transit pathways, budget savings, or local culinary recommendations. Keep explanations friendly, concise, and focused purely on user value. Avoid code blocks or markdown tables where possible unless requested.
`;

    const chatResponse = await generateContentWithRetry({
      model: "gemini-3.1-flash-lite",
      contents: chatPrompt,
    });

    res.json({ reply: chatResponse.text });
  } catch (error: any) {
    console.error("Chat agent error:", error);
    const errMsg = error?.message || String(error);
    if (errMsg.includes("503") || errMsg.includes("UNAVAILABLE") || errMsg.includes("demand") || errMsg.includes("overloaded")) {
      res.status(400).json({ error: "The Advisor Copilot is temporarily busy due to heavy active usage. Please re-send your message in a few seconds." });
    } else {
      res.status(400).json({ error: errMsg || "Failed to process chat request." });
    }
  }
});

// Interactive dynamic map or landmark resolver
app.post("/api/resolve-hotel-map", async (req, res) => {
  if (!ai) {
    return res.status(400).json({ error: "Gemini API is not configured." });
  }

  try {
    const { hotelInput } = req.body;
    if (!hotelInput) {
      return res.status(400).json({ error: "hotelInput is required" });
    }

    const mapPrompt = `
Search and resolve the location for hotel / tourist accommodation: "${hotelInput}".
Return ONLY a valid JSON with the format:
{
  "hotelName": "Official name of hotel found",
  "resolvedLocation": "Brief city/region name",
  "checkInTime": "Suggested default check-in time if not parsed (e.g. 3:00 PM)",
  "checkOutTime": "Suggested default check-out time if not parsed (e.g. 11:00 AM)",
  "formattedAddress": "Full estimated map address",
  "averageCostPerNightUSD": 120
}
Ensure the output is strict valid JSON with no extra wrapping.
`;

    const response = await generateContentWithRetry({
      model: "gemini-3.1-flash-lite",
      contents: mapPrompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    res.json(JSON.parse(response.text));
  } catch (error: any) {
    console.error("Map resolution error:", error);
    const errMsg = error?.message || String(error);
    if (errMsg.includes("503") || errMsg.includes("UNAVAILABLE") || errMsg.includes("demand") || errMsg.includes("overloaded")) {
      res.status(400).json({ error: "The AI mapping service is temporarily offline or experiencing high traffic. Please try resolving again shortly." });
    } else {
      res.status(400).json({ error: errMsg || "Failed to resolve hotel map." });
    }
  }
});

// Autocomplete destination suggestions (Regions/Cities)
app.post("/api/suggest-destinations", async (req, res) => {
  const { query } = req.body;
  if (!query || !query.trim()) {
    return res.json({ suggestions: [] });
  }

  const apiKey = process.env.GOOGLE_MAPS_PLATFORM_KEY;
  if (apiKey && apiKey !== "YOUR_API_KEY") {
    try {
      const response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey
        },
        body: JSON.stringify({
          input: query,
          includedPrimaryTypes: ["(cities)", "(regions)", "locality", "administrative_area_level_1", "administrative_area_level_2"]
        })
      });
      const data = await response.json();
      if (data && data.suggestions) {
        const mapped = data.suggestions.map((s: any) => ({
          name: s.placePrediction?.text?.text || ""
        })).filter((s: any) => s.name);
        return res.json({ suggestions: mapped });
      }
    } catch (err) {
      console.warn("[Places API suggest-destinations] direct API fetch failed, falling back to Gemini:", err);
    }
  }

  // Fallback to Gemini
  if (!ai) {
    return res.json({ suggestions: [{ name: `${query}, City` }] });
  }

  try {
    const prompt = `
    Provide 6 real, highly reliable travel destination auto-suggestions matching the prefix: "${query}".
    Make them highly specific and include the country name (e.g. "Kuala Lumpur, Malaysia", "Kuala Terengganu, Malaysia").
    Return ONLY a JSON array of strings in this structure:
    {
      "suggestions": ["Kuala Lumpur, Malaysia", "Kuala Terengganu, Malaysia"]
    }
    `;
    const response = await generateContentWithRetry({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    const parsed = JSON.parse(response.text);
    const suggestions = (parsed.suggestions || []).map((name: string) => ({ name }));
    res.json({ suggestions });
  } catch (error) {
    console.error("Gemini suggest-destinations fallback error:", error);
    res.json({ suggestions: [] });
  }
});

// Autocomplete hotel suggestions with details (Check-in, Check-out, Address)
app.post("/api/suggest-hotels", async (req, res) => {
  const { query, destination } = req.body;
  if (!query || !query.trim()) {
    return res.json({ suggestions: [] });
  }

  const apiKey = process.env.GOOGLE_MAPS_PLATFORM_KEY;
  if (apiKey && apiKey !== "YOUR_API_KEY") {
    try {
      const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "places.displayName,places.formattedAddress"
        },
        body: JSON.stringify({
          textQuery: `${query} hotel in ${destination || ""}`,
          includedType: "accommodation",
          maxResultCount: 5
        })
      });
      const data = await response.json();
      if (data && data.places) {
        const mapped = data.places.map((p: any) => ({
          name: p.displayName?.text || "",
          address: p.formattedAddress || "",
          checkIn: "15:00",
          checkOut: "12:00"
        })).filter((h: any) => h.name);
        return res.json({ suggestions: mapped });
      }
    } catch (err) {
      console.warn("[Places API suggest-hotels] direct fetch failed, falling back to Gemini:", err);
    }
  }

  // Fallback to Gemini
  if (!ai) {
    return res.json({ suggestions: [{ name: `${query} Hotel`, address: destination || "Local city area", checkIn: "15:00", checkOut: "12:00" }] });
  }

  try {
    const prompt = `
    Find 5 real hotel suggestions in "${destination || 'anywhere'}" matching the search term: "${query}".
    For each hotel, find its real or highly probable address, checkIn time (format HH:MM like "15:00"), and checkOut time (format HH:MM like "12:00").
    Return ONLY a JSON array, e.g.:
    {
      "suggestions": [
        {
          "name": "JW Marriott Hotel Kuala Lumpur",
          "address": "183 Jalan Bukit Bintang, Kuala Lumpur, 55100, Malaysia",
          "checkIn": "15:00",
          "checkOut": "12:00"
        }
      ]
    }
    `;
    const response = await generateContentWithRetry({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    const parsed = JSON.parse(response.text);
    res.json({ suggestions: parsed.suggestions || [] });
  } catch (error) {
    console.error("Gemini suggest-hotels fallback error:", error);
    res.json({ suggestions: [] });
  }
});

// Autocomplete airport suggestions matching prefix/codes
app.post("/api/suggest-airports", async (req, res) => {
  const { query } = req.body;
  if (!query || !query.trim()) {
    return res.json({ suggestions: [] });
  }

  if (!ai) {
    const queryUpper = query.trim().toUpperCase();
    const defaultAirports = [
      { code: "SIN", name: "Singapore Changi Airport" },
      { code: "NRT", name: "Tokyo Narita International Airport" },
      { code: "HND", name: "Tokyo Haneda Airport" },
      { code: "KUL", name: "Kuala Lumpur International Airport" },
      { code: "LAX", name: "Los Angeles International Airport" },
      { code: "JFK", name: "John F. Kennedy International Airport" },
      { code: "LHR", name: "London Heathrow Airport" },
      { code: "CDG", name: "Paris Charles de Gaulle Airport" },
      { code: "DXB", name: "Dubai International Airport" },
      { code: "SYD", name: "Sydney Kingsford Smith Airport" },
      { code: "HKG", name: "Hong Kong International Airport" },
      { code: "ICN", name: "Seoul Incheon International Airport" }
    ];
    const filtered = defaultAirports.filter(a => a.code.startsWith(queryUpper) || a.name.toUpperCase().includes(queryUpper));
    return res.json({ suggestions: filtered.slice(0, 6) });
  }

  try {
    const prompt = `
    Find up to 6 real international airport code suggestions starting with, matching, or related to: "${query}".
    For each airport, return its 3-letter IATA code and official full airport name.
    If the query looks like a single letter (e.g. "K"), suggest major global airports starting with that letter (e.g., KUL - Kuala Lumpur, KIX - Kansai, etc.).
    Return ONLY a JSON array, e.g.:
    {
      "suggestions": [
        { "code": "KUL", "name": "Kuala Lumpur International Airport" },
        { "code": "KIX", "name": "Kansai International Airport" }
      ]
    }
    Ensure strictly valid JSON matching the format above. No extra text or wrappers.
    `;
    const response = await generateContentWithRetry({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    const parsed = JSON.parse(response.text);
    res.json({ suggestions: parsed.suggestions || [] });
  } catch (err) {
    console.error("suggest-airports error:", err);
    res.json({ suggestions: [] });
  }
});

// Autocomplete attractions, landmarks, cafes, spots for Want To Go wishlist
app.post("/api/suggest-attractions", async (req, res) => {
  const { query, destinations } = req.body;
  if (!query || !query.trim()) {
    return res.json({ suggestions: [] });
  }

  const destText = destinations && destinations.length > 0 ? destinations.join(", ") : "";

  const apiKey = process.env.GOOGLE_MAPS_PLATFORM_KEY;
  if (apiKey && apiKey !== "YOUR_API_KEY") {
    try {
      const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "places.displayName,places.formattedAddress"
        },
        body: JSON.stringify({
          textQuery: `${query} in ${destText}`,
          maxResultCount: 6
        })
      });
      const data = await response.json();
      if (data && data.places) {
        const mapped = data.places.map((p: any) => ({
          name: p.displayName?.text || "",
          address: p.formattedAddress || ""
        })).filter((a: any) => a.name);
        return res.json({ suggestions: mapped });
      }
    } catch (err) {
      console.warn("[Places API suggest-attractions] fallback to Gemini:", err);
    }
  }

  if (!ai) {
    return res.json({ suggestions: [{ name: `${query} Landmark`, address: destText || "Local location" }] });
  }

  try {
    const prompt = `
    Find up to 6 real tourist attractions, landmarks, monuments, parks, cafes, or food spots in "${destText}" matching search term: "${query}".
    For each suggestion, return its full recognizable place name and a short location address.
    Return ONLY a JSON array, e.g.:
    {
      "suggestions": [
        { "name": "Tokyo Skytree", "address": "Oshiage, Sumida City, Tokyo" }
      ]
    }
    Ensure strictly valid JSON matching the format above. No extra text or wrappers.
    `;
    const response = await generateContentWithRetry({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    const parsed = JSON.parse(response.text);
    res.json({ suggestions: parsed.suggestions || [] });
  } catch (err) {
    console.error("suggest-attractions error:", err);
    res.json({ suggestions: [] });
  }
});

// Autocomplete alternative suggestions for a particular activity slot/time
app.post("/api/suggest-alternatives", async (req, res) => {
  const { destinations, dayTheme, currentActivity, knownExclusions } = req.body;
  if (!currentActivity || !currentActivity.title) {
    return res.json({ alternatives: [] });
  }

  if (!ai) {
    return res.json({
      alternatives: [
        {
          id: `alt_1_${Date.now()}`,
          title: `Explore local gardens near ${currentActivity.location || "City"}`,
          time: currentActivity.time || "02:00 PM",
          description: `A scenic, relaxed alternative to ${currentActivity.title}. Highly rated by locals.`,
          location: currentActivity.location || "City Center",
          type: "sightseeing",
          openingHours: "09:00 AM - 05:00 PM",
          budgetRange: "Free - ¥1,000",
          label: "AI suggested",
          transportation: {
            mode: "Walk",
            duration: "10 mins",
            cost: "Free",
            details: "Walk to the local garden park area.",
            distance: "0.5 km"
          }
        }
      ]
    });
  }

  try {
    const exclusionText = knownExclusions && knownExclusions.length > 0
      ? `Ensure you do NOT suggest any of these previously shown names: ${JSON.stringify(knownExclusions)}.`
      : "";

    const prompt = `
    You are an expert travel planner agent.
    Provide 3 highly relevant and interesting alternative travel activities to replace the following activity:
    - Current Activity Title: "${currentActivity.title}"
    - Current Description: "${currentActivity.description || ""}"
    - Time of day / Spot: "${currentActivity.time || ""}"
    - Current General Location/Area: "${currentActivity.location || ""}"
    - Day Theme/Focus: "${dayTheme || ""}"
    - Overall Destinations: ${JSON.stringify(destinations || [])}

    ${exclusionText}

    Rules for replacement activities:
    - They must fit well within the same general area or city so the traveler doesn't have to travel far.
    - They should ideally fit roughly into the same time slot, but can have custom opening hours and budget ranges.
    - Each alternative must be a real, high-quality, recognizable place or specific culinary spot.
    - Budget and type should match or offer a nice leisure counterpart.
    - Include brief transportation details to this alternative FROM the current general location area or nearest travel hub.

    Return ONLY a strict JSON object with this shape:
    {
      "alternatives": [
        {
          "title": "SENSATIONAL local landmark or garden name",
          "description": "Engaging description explaining why this is a great alternative to the original activity.",
          "location": "Detailed address or searchable place name",
          "type": "sightseeing" or "food" or "leisure" or "culture",
          "openingHours": "e.g. 09:00 AM - 06:00 PM",
          "budgetRange": "e.g. ¥1,500" or "Free",
          "transportation": {
            "mode": "e.g. Walk",
            "duration": "e.g. 5 mins",
            "cost": "e.g. Free",
            "details": "Brief transit details",
            "distance": "e.g. 0.3 km"
          }
        }
      ]
    }
    `;

    const response = await generateContentWithRetry({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });

    const parsed = JSON.parse(response.text);
    const alternatives = (parsed.alternatives || []).map((alt: any, i: number) => ({
      ...alt,
      id: `alt_${i}_${Date.now()}`,
      time: currentActivity.time || "02:00 PM",
      label: "AI suggested"
    }));

    res.json({ alternatives });
  } catch (error) {
    console.error("Gemini suggest-alternatives error:", error);
    res.json({ alternatives: [] });
  }
});

// Validate transit feasibility and overlap warnings between consecutive activities
app.post("/api/validate-itinerary", async (req, res) => {
  const { activities } = req.body;

  if (!activities || !Array.isArray(activities) || activities.length < 2) {
    return res.json({ warnings: [] });
  }

  const apiKey = process.env.GOOGLE_MAPS_PLATFORM_KEY;
  const hasMapsKey = apiKey && apiKey !== "YOUR_API_KEY";

  const warnings: any[] = [];

  const getMinutes = (timeStr: string): number => {
    try {
      const match = timeStr.trim().toLowerCase().match(/(\d+)(?::(\d+))?\s*(am|pm)?/);
      if (match) {
        let hours = parseInt(match[1], 10);
        const minutes = match[2] ? parseInt(match[2], 10) : 0;
        const ampm = match[3];
        if (ampm === "pm" && hours < 12) hours += 12;
        if (ampm === "am" && hours === 12) hours = 0;
        return hours * 60 + minutes;
      }
    } catch (_) {}
    return 0;
  };

  const parseActivityTimes = (timeSlot: string) => {
    if (!timeSlot) return { start: 0, end: 0 };
    const normalized = timeSlot.replace(/\s+to\s+/gi, " - ");
    const parts = normalized.split("-");
    if (parts.length === 0) return { start: 0, end: 0 };
    const start = getMinutes(parts[0]);
    const end = parts.length > 1 ? getMinutes(parts[1]) : start + 60;
    return { start, end };
  };

  const pairsToCheck: any[] = [];
  for (let i = 0; i < activities.length - 1; i++) {
    const actA = activities[i];
    const actB = activities[i + 1];

    if (!actA.location || !actB.location) continue;
    if (actA.location.trim().toLowerCase() === actB.location.trim().toLowerCase()) continue;

    // Skip feasibility warning if previous activity was a flight/airport arrival,
    // as that indicates an inter-city transition and they did not commute on ground
    const isFlightA = actA.type === "airport" || 
                      (actA.title || "").toLowerCase().includes("flight") || 
                      (actA.location || "").toLowerCase().includes("airport") ||
                      (actA.description || "").toLowerCase().includes("flight");
    if (isFlightA) continue;

    const timesA = parseActivityTimes(actA.time);
    const timesB = parseActivityTimes(actB.time);

    if (timesA.start === 0 || timesB.start === 0) continue;

    const gapMinutes = timesB.start - timesA.end;
    
    // Check key transport preferences for this specific transition (from the current activity box)
    const mode = actB.preferredTransportMode === "driving" ? "driving" : actB.preferredTransportMode === "walking" ? "walking" : "transit";

    pairsToCheck.push({
      index: i,
      actA,
      actB,
      gapMinutes,
      timesA,
      timesB,
      mode,
      modeFriendly: mode === "driving" ? "driving (car/taxi)" : mode === "walking" ? "walking" : "public transit"
    });
  }

  if (pairsToCheck.length === 0) {
    return res.json({ warnings: [] });
  }

  if (hasMapsKey) {
    try {
      const promises = pairsToCheck.map(async (pair) => {
        try {
          const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(pair.actA.location)}&destinations=${encodeURIComponent(pair.actB.location)}&mode=${pair.mode}&key=${apiKey}`;
          const response = await fetch(url);
          const data = await response.json();
          if (data && data.rows && data.rows[0] && data.rows[0].elements && data.rows[0].elements[0]) {
            const el = data.rows[0].elements[0];
            if (el.status === "OK") {
              const distanceText = el.distance.text;
              const durationSec = el.duration.value;
              const durationMin = Math.round(durationSec / 60);

              // If gapMinutes is 0, give a 20-minute grace window for close proximity locations.
              // This prevents throwing alerts for contiguous slots (e.g. 10:00-12:00 and 12:00-13:30) when they are nearby.
              const effectiveGap = pair.gapMinutes <= 0 ? 20 : pair.gapMinutes;
              if (durationMin > effectiveGap + 5) {
                const isImpossible = durationMin > (effectiveGap * 2.0) || pair.gapMinutes < -15;
                warnings.push({
                  prevActivityId: pair.actA.id,
                  curActivityId: pair.actB.id,
                  isImpossible,
                  message: `⚠️ Traveling from "${pair.actA.title}" to "${pair.actB.title}" requires ~${durationMin} mins (${distanceText}) via ${pair.modeFriendly}, but you scheduled them back-to-back without sufficient transit buffer (${pair.gapMinutes} mins gap).`
                });
              }
            }
          }
        } catch (err) {
          console.warn("Distance Matrix fetch error for pair:", err);
        }
      });
      await Promise.all(promises);

      if (warnings.length > 0) {
        return res.json({ warnings });
      }
    } catch (err) {
      console.warn("Google Maps Distance matrix failed, fallback to Gemini:", err);
    }
  }

  if (ai) {
    try {
      const formattedPairs = pairsToCheck.map(p => ({
        prevId: p.actA.id,
        curId: p.actB.id,
        prevTitle: p.actA.title,
        curTitle: p.actB.title,
        prevLocation: p.actA.location,
        curLocation: p.actB.location,
        gapMinutes: p.gapMinutes,
        prevTimeSlot: p.actA.time,
        curTimeSlot: p.actB.time,
        transportMode: p.mode,
        modeFriendly: p.modeFriendly
      }));

      const prompt = `
      You are an expert travel assistant. Review these Travel activity transitions for feasibility using the specific mode of transportation indicated for each pair:
      ${JSON.stringify(formattedPairs, null, 2)}

      For each pair, verify if traveling from the first location to the second is physically possible in the indicated "gapMinutes" via "transportMode".
      Assume the user travels exclusively via that selected "transportMode" for that pair.

      CRITICAL TRANSIT BUFFER RULES:
      - If "gapMinutes" is 0 (i.e. contiguous timeslots like 12:00 PM - 1:00 PM and 1:00 PM - 2:00 PM), allow a 20-minute grace window. Do NOT flag a transition as unrealistic if the locations are nearby and can be reached within a 20-minute walk or ride, as travelers can adjust easily.
      - Only report a warning if the transit physically takes longer than the gapMinutes (or 20 minutes for contiguous slots), plus a standard 5-minute buffer.
      - Flag "isImpossible": true only if it is completely physically impossible to cover the distance in that time (e.g. traveling 20km in 5 minutes, or gapMinutes is significantly negative - less than -15). Overlapping timeslots where gapMinutes is positive or exactly zero should NOT be marked as impossible unless the physical locations are extremely far apart (e.g. different cities).

      If a transit is unrealistic (requires more travel time than the available gap of "gapMinutes" or the 20-minute grace window), report a helpful, friendly message under "message".
      Otherwise, do NOT generate a warning for that pair.

      Return ONLY a JSON object:
      {
        "warnings": [
          {
            "prevActivityId": "the_prevId_string",
            "curActivityId": "the_curId_string",
            "message": "warning string explaining why it cannot meet the travel time",
            "isImpossible": true/false
          }
        ]
      }
      If all are feasible, return {"warnings": []}.
      No code block backticks, no comments, just valid JSON response.
      `;

      const response = await generateContentWithRetry({
        model: "gemini-3.1-flash-lite",
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });

      const parsed = JSON.parse(response.text);
      if (parsed && parsed.warnings) {
        const filtered = parsed.warnings.filter((w: any) => {
          const pair = pairsToCheck.find(p => p.actA.id === w.prevActivityId && p.actB.id === w.curActivityId);
          if (pair) {
            if (w.isImpossible) return true;
            if (pair.mode === "walking") return true;

            const msg = (w.message || "").toLowerCase();
            if (msg.includes("walk instead") || msg.includes("walking is faster")) {
              return false;
            }
          }
          return true;
        });
        return res.json({ warnings: filtered });
      }
    } catch (err) {
      console.error("Gemini validate-itinerary error:", err);
    }
  }

  // Heuristic offline fallback rules
  for (const pair of pairsToCheck) {
    const locA = pair.actA.location.toLowerCase();
    const locB = pair.actB.location.toLowerCase();

    const isTokyoFuji = (locA.includes("tokyo") && (locB.includes("fuji") || locB.includes("hakone"))) ||
                        ((locA.includes("fuji") || locA.includes("hakone")) && locB.includes("tokyo"));
    const isTokyoKyoto = (locA.includes("tokyo") && locB.includes("kyoto")) ||
                         (locA.includes("kyoto") && locB.includes("tokyo"));

    if (isTokyoFuji && pair.gapMinutes < 90) {
      const isImpossible = pair.gapMinutes < 60;
      warnings.push({
        prevActivityId: pair.actA.id,
        curActivityId: pair.actB.id,
        isImpossible,
        message: `⚠️ Traveling from "${pair.actA.title}" to "${pair.actB.title}" is unrealistic in ${pair.gapMinutes} mins via ${pair.modeFriendly}. Tokyo and Mt. Fuji / Hakone are over 100 km apart and require at least 90 to 120 mins of travel.`
      });
    } else if (isTokyoKyoto && pair.gapMinutes < 130) {
      const isImpossible = pair.gapMinutes < 120;
      warnings.push({
        prevActivityId: pair.actA.id,
        curActivityId: pair.actB.id,
        isImpossible,
        message: `⚠️ Traveling from "${pair.actA.title}" to "${pair.actB.title}" is unrealistic in ${pair.gapMinutes} mins via ${pair.modeFriendly}. Tokyo and Kyoto are over 450 km apart and require at least 135 mins even via express train / Shinkansen, or longer by car.`
      });
    } else if (pair.gapMinutes < 0) {
      warnings.push({
        prevActivityId: pair.actA.id,
        curActivityId: pair.actB.id,
        isImpossible: true,
        message: `⚠️ Schedule Conflict: "${pair.actB.title}" starts before or exactly when "${pair.actA.title}" ends. Please adjust their time slots to avoid overlapping.`
      });
    }
  }

  res.json({ warnings });
});

// Dynamic transport mode resolver for individual activity box commute update
app.post("/api/get-transit-info", async (req, res) => {
  const { origin, destination, mode } = req.body;
  if (!origin || !destination) {
    return res.status(400).json({ error: "origin and destination are required" });
  }

  const transportMode = mode === "driving" ? "driving" : mode === "walking" ? "walking" : "transit";
  const apiKey = process.env.GOOGLE_MAPS_PLATFORM_KEY;
  const hasMapsKey = apiKey && apiKey !== "YOUR_API_KEY";

  // Standard safe defaults
  let result = {
    mode: transportMode === "driving" ? "Taxi/Car" : transportMode === "walking" ? "Walk" : "Public Transit",
    duration: transportMode === "driving" ? "20 mins" : transportMode === "walking" ? "40 mins" : "30 mins",
    distance: "3 km",
    cost: transportMode === "driving" ? "$15.00" : transportMode === "walking" ? "Free" : "$2.50",
    details: transportMode === "driving" ? "Drive via main road/highway" : transportMode === "walking" ? "Walk along local sidewalks/pedestrian paths" : "Take nearby subway/bus line"
  };

  if (hasMapsKey) {
    try {
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&mode=${transportMode}&key=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data && data.rows && data.rows[0] && data.rows[0].elements && data.rows[0].elements[0]) {
        const el = data.rows[0].elements[0];
        if (el.status === "OK") {
          const distanceText = el.distance.text;
          const durationSec = el.duration.value;
          const durationMin = Math.round(durationSec / 60);

          result.duration = `${durationMin} mins`;
          result.distance = distanceText;
          if (transportMode === "driving") {
            result.mode = "Taxi / Car";
            result.cost = "$12 - $18";
            result.details = "Driving route via local streets";
          } else if (transportMode === "walking") {
            result.mode = "Walk";
            result.cost = "Free";
            result.details = "Pedestrian route on sidewalks";
          } else {
            result.mode = "Subway / Bus";
            result.cost = "$2.50";
            result.details = "Public transit routes via local transit systems";
          }
        }
      }
    } catch (err) {
      console.warn("get-transit-info Distance Matrix fetch error:", err);
    }
  }

  if (ai) {
    try {
      let modeName = "public transit";
      if (transportMode === "driving") modeName = "driving (car/taxi/ride-hail)";
      if (transportMode === "walking") modeName = "walking/foot";

      const prompt = `
      You are an expert transit route planner. Give me a realistic commute estimate from general area "${origin}" to general destination area "${destination}" using "${modeName}".
      
      Initial estimates:
      Mode: ${result.mode}
      Distance: ${result.distance}
      Duration: ${result.duration}
      
      Return ONLY a JSON block with the following fields (maintain geographical realism, for example between Tokyo and Hakone, Tokyo and Kyoto, etc.):
      - "mode": short string specifying exact travel medium (e.g. "Subway (Yamanote)", "Shinkansen Train", "Taxi", "Uber/Ride-hail", "Walk/Foot", "Scenic Walk")
      - "duration": accurate transit travel time (e.g. "12 mins", "45 mins", "140 mins", "15 mins")
      - "distance": travel distance (e.g. "3.5 km", "102 km", "0.8 km")
      - "cost": estimated local cost in equivalent local currency if possible, or relative range (e.g. "¥1,800", "¥220", "$15.00", "$2.50", "Free")
      - "details": concise single-sentence transit guidelines (e.g. "Take Tobu line from Asakusa station, then walk 4 mins")

      Keep the JSON strictly conformant, no markup or markdown wrapper, no backticks, just valid JSON output:
      {
        "mode": "...",
        "duration": "...",
        "distance": "...",
        "cost": "...",
        "details": "..."
      }
      `;

      const response = await generateContentWithRetry({
        model: "gemini-3.1-flash-lite",
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });

      const parsed = JSON.parse(response.text);
      if (parsed && parsed.duration) {
        result = {
          mode: parsed.mode || result.mode,
          duration: parsed.duration,
          distance: parsed.distance || result.distance,
          cost: parsed.cost || result.cost,
          details: parsed.details || result.details
        };
      }
    } catch (err) {
      console.error("Gemini get-transit-info enrichment error:", err);
    }
  }

  // Fallback offline rules for well-known combos
  const locA = origin.toLowerCase();
  const locB = destination.toLowerCase();
  const isTokyoFuji = (locA.includes("tokyo") && (locB.includes("fuji") || locB.includes("hakone"))) ||
                      ((locA.includes("fuji") || locA.includes("hakone")) && locB.includes("tokyo"));
  const isTokyoKyoto = (locA.includes("tokyo") && locB.includes("kyoto")) ||
                       (locA.includes("kyoto") && locB.includes("tokyo"));

  if (isTokyoFuji) {
    if (transportMode === "transit") {
      result.mode = "Exp. Railway / Bus";
      result.duration = "135 mins";
      result.distance = "105 km";
      result.cost = "¥2,500";
      result.details = "Odakyu romancecar from Shinjuku or express bus from Tokyo highway station";
    } else {
      result.mode = "Taxi / Rent-car";
      result.duration = "95 mins";
      result.distance = "102 km";
      result.cost = "¥28,000";
      result.details = "Chuo Expressway driving (tolls apply)";
    }
  } else if (isTokyoKyoto) {
    if (transportMode === "transit") {
      result.mode = "Shinkansen Train";
      result.duration = "135 mins";
      result.distance = "450 km";
      result.cost = "¥14,000";
      result.details = "Tokaido Shinkansen (Nozomi) express train from Tokyo Station";
    } else {
      result.mode = "Driving via highway";
      result.duration = "330 mins";
      result.distance = "450 km";
      result.cost = "¥18,000";
      result.details = "Tomei Expressway (approx 5.5 hours driving, toll road)";
    }
  }

  res.json(result);
});

// Real-time recalculation of commute details and chronological alignment for modified day activities
app.post("/api/recalculate-transit-for-day", async (req, res) => {
  const { activities, flights } = req.body;
  
  if (!activities || !Array.isArray(activities)) {
    return res.status(400).json({ error: "Activities array is required" });
  }

  try {
    const adjustedDayList = await adjustItineraryForRealWorldTransit(
      [{ activities }], 
      flights || []
    );
    res.json({ activities: adjustedDayList[0].activities });
  } catch (err: any) {
    console.error("Recalculate transit for day error:", err);
    res.status(500).json({ error: "Failed to recalculate transit" });
  }
});

// Route and Time slot Optimizer for Day Schedule (Travel Salesperson sequence and non-conflicting times auto-recalculation)
app.post("/api/optimize-schedule", async (req, res) => {
  const { activities, hotel, startLocation } = req.body;
  
  if (!activities || !Array.isArray(activities) || activities.length === 0) {
    return res.status(400).json({ error: "Activities array is required" });
  }

  const originPoint = hotel || startLocation || "City Center";

  if (!ai) {
    return res.json({ activities });
  }

  try {
    const prompt = `
    You are an expert travel logistics engine and geographic routing optimizer.
    Your task is to reorder the given activities for a single day itinerary to construct the absolute most geographically efficient path (minimizing travel time and distance).
    
    Starting Origin/Hotel: "${originPoint}"
    
    Activities to optimize:
    ${JSON.stringify(activities.map(a => ({ id: a.id, title: a.title, location: a.location, description: a.description, time: a.time, preferredTransportMode: a.preferredTransportMode || "transit" })))}

    Requirements:
    1. Reorder the activities so they form a continuous, short route starting from the Origin/Hotel.
    2. Recalculate beautiful, sequential, realistic, non-delayed time slots for each activity starting from 9:00 AM (09:00) with proper buffers.
       - Calculate duration of each activity (usually 1-3 hours).
       - Allocate 20-45 mins buffer for commute between consecutive activities.
       - Format times precisely as "HH:MM - HH:MM" (e.g., "09:00 - 10:30", "11:15 - 13:00", etc.) or "HH:MM" in 24-hour style. Include the logical updated "time" field.
    3. Retain ALL original attributes (id, description, budgetRange, preferredTransportMode, etc.), only modify the "time" field and the array position order.
    4. For each activity, calculate accurate simulated/computed transportation stats to the next activity (distance, duration, mode, details) under the "transportation" property. For example, for the FIRST activity, transportation should represent the transit from the hotel ${originPoint} to that first activity's location.
    
    Return ONLY a raw JSON array containing the optimized Activities in their correct sorted sequence. Do NOT include any markdown formatting, no \`\`\`json wrappers, and no surrounding text.
    
    Expected format:
    [
      {
        "id": "...",
        "title": "...",
        "location": "...",
        "time": "09:00 - 11:00",
        "preferredTransportMode": "...",
        "transportation": {
          "mode": "...",
          "duration": "...",
          "distance": "...",
          "cost": "...",
          "details": "..."
        },
        ...rest of original properties
      },
      ...
    ]
    `;

    const response = await generateContentWithRetry({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });

    try {
      const cleanText = response.text.trim().replace(/^```json/i, "").replace(/```$/i, "").trim();
      const optimized = JSON.parse(cleanText);
      if (Array.isArray(optimized) && optimized.length > 0) {
        // Map any missing original fields back just in case
        const mapped = optimized.map((optAct, idx) => {
          const origAct = activities.find(a => a.id === optAct.id) || {};
          return {
            ...origAct,
            ...optAct,
            // make sure we don't accidentally lose essential properties
            id: optAct.id || origAct.id,
            title: optAct.title || origAct.title,
            location: optAct.location || origAct.location,
            time: optAct.time || origAct.time
          };
        });
        const adjustedDayList = await adjustItineraryForRealWorldTransit([{ activities: mapped }]);
        return res.json({ activities: adjustedDayList[0].activities });
      }
    } catch (parseErr) {
      console.error("Failed to parse optimized schedule JSON:", parseErr, response.text);
    }
    res.json({ activities });
  } catch (err) {
    console.error("Optimize schedule error:", err);
    res.status(500).json({ error: "Failed to optimize schedule" });
  }
});

// Historic seasonal average weather resolver
app.get("/api/weather-info", async (req, res) => {
  if (!ai) {
    return res.json({ temperature: "N/A", condition: "Fair", advice: "Pack normally" });
  }

  try {
    const location = req.query.location || "Tokyo";
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const date = req.query.date || "December";

    let dateDetail = `around ${date}`;
    if (startDate && endDate) {
      dateDetail = `for the exact date range from ${startDate} to ${endDate}`;
    } else if (startDate) {
      dateDetail = `starting from ${startDate}`;
    }

    const prompt = `
Provide historic average weather data for ${location} ${dateDetail}.
Return ONLY a valid JSON object:
{
  "temp": "e.g. 21°C - 27°C",
  "condition": "e.g. Rainy / Humid",
  "advice": "e.g. Carry an umbrella and light layers"
}
`;

    const response = await generateContentWithRetry({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });

    res.json(JSON.parse(response.text));
  } catch (error) {
    res.json({ temp: "22°C", condition: "Variable", advice: "Pack standard travel layers (Weather AI Service temporarily at capacity)" });
  }
});

// Vite & Static file handling
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
