import React, { useState, useEffect } from "react";
import { Trip, Activity, ActivityRating, DayItinerary } from "../types";
import { 
  Calendar, MapPin, Clock, DollarSign, Heart, Star, Navigation, 
  Download, ArrowRight, Share2, Clipboard, Moon, Hotel, Plane,
  ChevronRight, Compass, Settings, CheckCircle2, ChevronDown, Check,
  ExternalLink, Edit, Trash2, Plus, AlertTriangle, Sparkles, Loader2,
  ArrowUp, ArrowDown
} from "lucide-react";

const USD_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.78,
  JPY: 156.5,
  SGD: 1.35,
  AUD: 1.51,
  CAD: 1.37,
  MYR: 4.71,
  CNY: 7.25,
  KRW: 1380.0,
  THB: 36.7,
  IDR: 16400.0,
  INR: 83.5
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  SGD: "S$",
  AUD: "A$",
  CAD: "C$",
  MYR: "RM",
  CNY: "¥",
  KRW: "₩",
  THB: "฿",
  IDR: "Rp",
  INR: "₹"
};

const AVAILABLE_CURRENCIES = ["USD", "EUR", "GBP", "JPY", "SGD", "AUD", "CAD", "MYR", "CNY", "KRW", "THB", "IDR", "INR"];

const getActivityLabel = (activity: Activity, trip: Trip): "Want-to-go" | "Flight" | "Hotel" | "AI suggested" => {
  if (activity.label) {
    if (["Want-to-go", "Flight", "Hotel", "AI suggested"].includes(activity.label)) {
      return activity.label as any;
    }
  }

  // Check manual/classification based on type & content
  const titleLower = (activity.title || "").toLowerCase();
  const descLower = (activity.description || "").toLowerCase();
  const typeLower = (activity.type || "").toLowerCase();
  const locLower = (activity.location || "").toLowerCase();

  // Flight classification
  if (
    typeLower === "airport" || 
    typeLower === "flight" || 
    titleLower.includes("flight") || 
    titleLower.includes("boarding") || 
    titleLower.includes("depart") || 
    titleLower.includes("arrive") || 
    descLower.includes("flight") || 
    descLower.includes("terminal")
  ) {
    return "Flight";
  }

  // Hotel classification
  if (
    typeLower === "checkin" || 
    typeLower === "hotel" ||
    typeLower === "stay" ||
    titleLower.includes("hotel") || 
    titleLower.includes("check-in") || 
    titleLower.includes("check in") || 
    titleLower.includes("hostel") || 
    titleLower.includes("resort") || 
    descLower.includes("hotel") || 
    descLower.includes("stay at") ||
    descLower.includes("room check-in")
  ) {
    return "Hotel";
  }

  // Want-to-go classification
  const isWantToGoPlace = (trip.wantToGoPlaces || []).some(
    place => place.toLowerCase().trim() === locLower.trim() || place.toLowerCase().trim() === titleLower.trim()
  );
  if (isWantToGoPlace || activity.id.startsWith("act_user_")) {
    return "Want-to-go";
  }

  // Default fallback is AI suggested
  return "AI suggested";
};

const renderLabelBadge = (activity: Activity, trip: Trip) => {
  const label = getActivityLabel(activity, trip);
  
  let labelStyle = "";
  let icon = null;
  
  if (label === "Want-to-go") {
    labelStyle = "bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/60";
    icon = <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />;
  } else if (label === "Flight") {
    labelStyle = "bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200/60";
    icon = <Plane className="w-2.5 h-2.5 text-sky-500" />;
  } else if (label === "Hotel") {
    labelStyle = "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/60";
    icon = <Hotel className="w-2.5 h-2.5 text-emerald-500" />;
  } else {
    // "AI suggested"
    labelStyle = "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/60";
    icon = <Compass className="w-2.5 h-2.5 text-indigo-500" />;
  }

  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full transition-all duration-200 ${labelStyle}`} title={`Type: ${label}`}>
      {icon}
      <span>{label}</span>
    </span>
  );
};

const categorizeActivityTime = (timeStr: string): "Morning" | "Afternoon" | "Evening" => {
  if (!timeStr) return "Morning";
  const clean = timeStr.trim().toLowerCase();

  // Keyword check first
  if (clean.includes("morning")) return "Morning";
  if (clean.includes("evening") || clean.includes("night") || clean.includes("dinner") || clean.includes("sunset")) return "Evening";
  if (clean.includes("afternoon") || clean.includes("lunch")) return "Afternoon";

  // Check using live start minutes
  const startMinutes = getStartTimeInMinutes(timeStr);
  if (startMinutes > 0) {
    if (startMinutes >= 17 * 60) return "Evening";
    if (startMinutes >= 12 * 60) return "Afternoon";
    return "Morning";
  }

  // Fallback if no colon/time is parsed but has digits
  const match = clean.match(/(\d+)/);
  if (!match) return "Morning";

  let hour = parseInt(match[1], 10);
  const isPm = clean.includes("pm");
  const isAm = clean.includes("am");

  if (isPm && hour < 12) {
    hour += 12;
  } else if (isAm && hour === 12) {
    hour = 0;
  }

  if (hour >= 12 && hour < 17) return "Afternoon";
  if (hour >= 17) return "Evening";
  return "Morning";
};

const getSlotActivities = (day: DayItinerary | undefined, slot: "Morning" | "Afternoon" | "Evening"): Activity[] => {
  if (!day) return [];
  
  // Filter activities that match this category
  const filtered = day.activities.filter(act => categorizeActivityTime(act.time) === slot);
  
  if (filtered.length > 0) {
    return filtered;
  }
  
  // If empty, return a dynamic mock/suggested activity to satisfy "all of these placeholders have one or more than one activities"!
  const defaultActivities = {
    Morning: {
      id: `placeholder_morning_${day.dayIndex}`,
      time: "08:30 AM",
      title: "Morning Coffee & Local Walk",
      description: "Enjoy a fresh cup of coffee and explore nearby bakeries, parks, and quiet local streets.",
      type: "sightseeing",
      location: day.activities[0]?.location || "City Center",
      label: "AI suggested",
      openingHours: "Open all day"
    },
    Afternoon: {
      id: `placeholder_afternoon_${day.dayIndex}`,
      time: "02:00 PM",
      title: "Afternoon Cultural Discovery",
      description: "Take a stroll around local streets, visit nearby museums, galleries, or enjoy a traditional local lunch.",
      type: "leisure",
      location: day.activities[0]?.location || "City Center",
      label: "AI suggested",
      openingHours: "Open all day"
    },
    Evening: {
      id: `placeholder_evening_${day.dayIndex}`,
      time: "07:00 PM",
      title: "Evening Dinner & Night Walk",
      description: "Savor local specialties at a cozy dining spot and take in the city skyline under the glowing stars.",
      type: "food",
      location: day.activities[0]?.location || "City Center",
      label: "AI suggested",
      openingHours: "Open late"
    }
  };
  
  return [defaultActivities[slot]];
};

const isPeriodHiddenByFlight = (day: DayItinerary | undefined, period: "Morning" | "Afternoon" | "Evening", trip: Trip): boolean => {
  if (!day) return false;

  const getPeriodForTime = (dateTimeStr: string): "Morning" | "Afternoon" | "Evening" => {
    if (!dateTimeStr) return "Morning";
    const timePortion = dateTimeStr.includes("T") ? dateTimeStr.split("T")[1] : dateTimeStr;
    return categorizeActivityTime(timePortion);
  };

  const departFlight = trip.flights?.find(f => f.type === "depart");
  const returnFlight = trip.flights?.find(f => f.type === "return");

  if (departFlight?.arrivalTime) {
    const arrDate = departFlight.arrivalTime.split("T")[0];
    if (day.date === arrDate) {
      const arrPeriod = getPeriodForTime(departFlight.arrivalTime);
      if (arrPeriod === "Afternoon") {
        if (period === "Morning") return true;
      } else if (arrPeriod === "Evening") {
        if (period === "Morning" || period === "Afternoon") return true;
      }
    }
  }

  if (returnFlight?.departureTime) {
    const depDate = returnFlight.departureTime.split("T")[0];
    if (day.date === depDate) {
      const depPeriod = getPeriodForTime(returnFlight.departureTime);
      if (depPeriod === "Morning") {
        if (period === "Afternoon" || period === "Evening") return true;
      } else if (depPeriod === "Afternoon") {
        if (period === "Evening") return true;
      }
    }
  }

  return false;
};

const convertAmount = (amount: number, from: string, to: string): number => {
  const cleanFrom = (from || "USD").toUpperCase();
  const cleanTo = (to || "USD").toUpperCase();
  if (cleanFrom === cleanTo) return amount;
  const fromRate = USD_RATES[cleanFrom] || 1.0;
  const toRate = USD_RATES[cleanTo] || 1.0;
  return (amount / fromRate) * toRate;
};

const convertPriceString = (text: string | undefined, base: string = "USD", target: string = "USD"): string => {
  if (!text) return "N/A";
  const cleanBase = (base || "USD").toUpperCase();
  const cleanTarget = (target || "USD").toUpperCase();
  if (cleanBase === cleanTarget) return text;

  try {
    const regex = /(?:[\$¥€£₩฿₹]|S\$|RM|Rp|RMB)\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)/gi;
    let hasMatches = false;
    const replaced = text.replace(regex, (match, p1) => {
      hasMatches = true;
      const num = parseFloat(p1.replace(/,/g, ""));
      if (!isNaN(num)) {
        const conv = convertAmount(num, cleanBase, cleanTarget);
        const targetSymbol = CURRENCY_SYMBOLS[cleanTarget] || "$";
        return `${targetSymbol}${conv.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
      }
      return match;
    });

    if (hasMatches) return replaced;
  } catch (err) {
    console.warn("Error parsing price text:", err);
  }

  const pureNum = parseFloat(text.replace(/[^0-9.]/g, ""));
  if (!isNaN(pureNum) && /^\d+$/.test(text.trim().replace(/,/g, ""))) {
    const conv = convertAmount(pureNum, cleanBase, cleanTarget);
    const targetSymbol = CURRENCY_SYMBOLS[cleanTarget] || "$";
    return `${targetSymbol}${conv.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  return text;
};

const getStartTimeInMinutes = (timeSlot: string): number => {
  try {
    const normalized = timeSlot.replace(/\s+to\s+/gi, " - ");
    const parts = normalized.split("-");
    if (parts.length === 0) return 0;
    const startText = parts[0].trim().toLowerCase();
    
    // Matched both hour-only (e.g. "10 am") and full (e.g. "10:30 am")
    const match = startText.match(/(\d+)(?::(\d+))?\s*(am|pm)?/);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = match[2] ? parseInt(match[2], 10) : 0;
      const ampm = match[3];
      if (ampm === "pm" && hours < 12) hours += 12;
      if (ampm === "am" && hours === 12) hours = 0;
      return hours * 60 + minutes;
    }
  } catch (e) {
    console.error(e);
  }
  return 0;
};

const getScheduledDayOfPlace = (placeName: string, itinerary: any[] | undefined): number | null => {
  if (!itinerary) return null;
  const clean = placeName.trim().toLowerCase();
  for (const day of itinerary) {
    for (const act of day.activities) {
      const actTitle = act.title.trim().toLowerCase();
      if (actTitle === clean || clean.includes(actTitle) || actTitle.includes(clean)) {
        return day.dayIndex;
      }
    }
  }
  return null;
};

const getAISuggestedDayForPlace = (placeName: string, itinerary: any[] | undefined) => {
  if (!itinerary || itinerary.length === 0) return { suggestedDayIdx: 1, reason: "balanced exploration schedule" };
  
  const cleanPlace = placeName.toLowerCase();
  let bestDayIdx = -1;
  let maxScore = 0;
  let matchedReason = "";

  const placeTokens = cleanPlace.split(/[\s,.\-()]+/).filter(t => t.length > 2);

  for (const day of itinerary) {
    let score = 0;
    let matchedAttractionName = "";
    const cleanTheme = day.theme.toLowerCase();
    
    placeTokens.forEach(token => {
      if (cleanTheme.includes(token)) {
        score += 3;
      }
    });

    for (const act of day.activities) {
      const cleanTitle = act.title.toLowerCase();
      const cleanDesc = act.description.toLowerCase();
      const cleanLoc = act.location.toLowerCase();

      placeTokens.forEach(token => {
        if (cleanTitle.includes(token)) {
          score += 5;
          if (!matchedAttractionName) matchedAttractionName = act.title;
        } else if (cleanLoc.includes(token)) {
          score += 4;
          if (!matchedAttractionName) matchedAttractionName = act.title;
        } else if (cleanDesc.includes(token)) {
          score += 2;
        }
      });
    }

    if (score > maxScore) {
      maxScore = score;
      bestDayIdx = day.dayIndex;
      matchedReason = matchedAttractionName 
        ? `shares proximity with your planned visit to ${matchedAttractionName}`
        : `matches the Day's Focus: "${day.theme}"`;
    }
  }

  if (bestDayIdx === -1) {
    const neighborhoodMappers: Record<string, string[]> = {
      "shibuya": ["shibuya", "scramble", "hachiko", "harajuku", "yoyogi", "meiji jingu", "takeshita", "omotesando"],
      "shinjuku": ["shinjuku", "gyoen", "kabukicho", "metropolitan government", "golden gai", "omoide yokocho"],
      "asakusa": ["asakusa", "sensoji", "senso-ji", "kaminarimon", "nakamise", "sumida", "skytree"],
      "akihabara": ["akihabara", "ueno", "ameyoko", "electric town", "maid", "anime", "kanda"],
      "tsukiji": ["tsukiji", "ginza", "toyosu", "teamlab planets", "teamlab", "fish market"],
      "odaiba": ["odaiba", "palette town", "gundam", "rainbow bridge", "teamlab borderless"],
      "marina bay": ["marina", "mbs", "gardens by the bay", "sands", "singapore flyer", "merlion", "artscience"],
      "sentosa": ["sentosa", "uss", "universal studios", "siloso", "palawan", "cable car"],
      "kyoto": ["gion", "fushimi inari", "kiyomizu-dera", "kinkaku-ji", "arashiyama", "bamboo forest", "kamo river"],
      "osaka": ["dotonbori", "osaka castle", "umeda", "namba", "shinsekai", "universal studios japan", "usj"],
      "paris": ["eiffel", "louvre", "notre dame", "champs-elysees", "arc de triomphe", "montmartre", "sacre-coeur", "seine"],
      "london": ["big ben", "london eye", "tower bridge", "british museum", "buckingham", "westminster", "hyde park", "soho"],
      "new york": ["times square", "central park", "empire state", "statue of liberty", "brooklyn bridge", "broadway", "manhattan"]
    };

    let detectedNeighborhood = "";
    for (const [nb, keywords] of Object.entries(neighborhoodMappers)) {
      if (cleanPlace.includes(nb) || keywords.some(k => cleanPlace.includes(k))) {
        detectedNeighborhood = nb;
        break;
      }
    }

    if (detectedNeighborhood) {
      for (const day of itinerary) {
        const dayContent = (day.theme + " " + day.activities.map(a => a.title + " " + a.location).join(" ")).toLowerCase();
        if (dayContent.includes(detectedNeighborhood) || neighborhoodMappers[detectedNeighborhood].some(k => dayContent.includes(k))) {
          bestDayIdx = day.dayIndex;
          matchedReason = `located in the same ${detectedNeighborhood.toUpperCase()} district planned for this day`;
          break;
        }
      }
    }
  }

  if (bestDayIdx === -1) {
    let minActivities = 999;
    let targetDayIdx = 1;
    for (const day of itinerary) {
      if (day.activities.length < minActivities) {
        minActivities = day.activities.length;
        targetDayIdx = day.dayIndex;
      }
    }
    bestDayIdx = targetDayIdx;
    matchedReason = `suggested here to balance your daily pacing comfortable`;
  }

  return {
    suggestedDayIdx: bestDayIdx,
    reason: matchedReason
  };
};

interface ItineraryDisplayProps {
  trip: Trip;
  favoritedActivities: string[];
  onToggleFavorite: (activityTitle: string) => void;
  onRateActivity: (rating: ActivityRating) => void;
  ratings: ActivityRating[];
  onExportCalendar: () => void;
  onUpdateTripEdits: (edits: string) => void;
  isReplanning: boolean;
  replanError?: string;
  onUpdateTrip: (updatedTrip: Trip) => void;
}

export default function ItineraryDisplay({
  trip,
  favoritedActivities,
  onToggleFavorite,
  onRateActivity,
  ratings,
  onExportCalendar,
  onUpdateTripEdits,
  isReplanning,
  replanError,
  onUpdateTrip
}: ItineraryDisplayProps) {
  // Navigation tabs
  const [activeDayIdx, setActiveDayIdx] = useState(1);
  const [focusedLocation, setFocusedLocation] = useState<string>(
    trip.itinerary && trip.itinerary[0]?.activities[0]?.location || trip.destinations[0]
  );
  
  // Custom natural-language assistant edits input
  const [naturalLanguageInput, setNaturalLanguageInput] = useState("");

  // Direct inline editing states
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [editTime, setEditTime] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editHours, setEditHours] = useState("");
  const [editBudget, setEditBudget] = useState("");
  const [editLabel, setEditLabel] = useState("");

  // Addition states
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [newActTime, setNewActTime] = useState("");
  const [newActTitle, setNewActTitle] = useState("");
  const [newActDesc, setNewActDesc] = useState("");
  const [newActLocation, setNewActLocation] = useState("");
  const [newActHours, setNewActHours] = useState("");
  const [newActBudget, setNewActBudget] = useState("");
  const [newActLabel, setNewActLabel ] = useState("Want-to-go");

  // Flight Editing/Addition states
  const [editingFlightId, setEditingFlightId] = useState<string | null>(null);
  const [editFlightType, setEditFlightType] = useState<"depart" | "return">("depart");
  const [editFlightNo, setEditFlightNo] = useState("");
  const [editFlightDepAirport, setEditFlightDepAirport] = useState("");
  const [editFlightArrAirport, setEditFlightArrAirport] = useState("");
  const [editFlightDepTime, setEditFlightDepTime] = useState("");
  const [editFlightArrTime, setEditFlightArrTime] = useState("");

  const [isAddingFlight, setIsAddingFlight] = useState(false);
  const [newFlightType, setNewFlightType] = useState<"depart" | "return">("depart");
  const [newFlightNo, setNewFlightNo] = useState("");
  const [newFlightDepAirport, setNewFlightDepAirport] = useState("");
  const [newFlightArrAirport, setNewFlightArrAirport] = useState("");
  const [newFlightDepTime, setNewFlightDepTime] = useState("");
  const [newFlightArrTime, setNewFlightArrTime] = useState("");

  // Hotel Editing/Addition states
  const [editingHotelId, setEditingHotelId] = useState<string | null>(null);
  const [editHotelName, setEditHotelName] = useState("");
  const [editHotelLocation, setEditHotelLocation] = useState("");
  const [editHotelCheckIn, setEditHotelCheckIn] = useState("");
  const [editHotelCheckOut, setEditHotelCheckOut] = useState("");

  const [isAddingHotel, setIsAddingHotel] = useState(false);
  const [newHotelName, setNewHotelName] = useState("");
  const [newHotelLocation, setNewHotelLocation] = useState("");
  const [newHotelCheckIn, setNewHotelCheckIn] = useState("");
  const [newHotelCheckOut, setNewHotelCheckOut] = useState("");

  // Wishlist addition state
  const [newWishlistInput, setNewWishlistInput] = useState("");
  const [wishlistAlert, setWishlistAlert] = useState<string | null>(null);

  // States for interactive alternative suggestions
  const [expandedAltActivityId, setExpandedAltActivityId] = useState<string | null>(null);
  const [alternativesMap, setAlternativesMap] = useState<Record<string, any[]>>({});
  const [alternativesLoading, setAlternativesLoading] = useState<boolean>(false);
  const [exclusionsMap, setExclusionsMap] = useState<Record<string, string[]>>({});

  const baseCurrency = trip.budgetStats?.currency || "USD";
  const displayCurrency = trip.displayCurrency || baseCurrency;

  const activeDay = trip.itinerary?.find(d => d.dayIndex === activeDayIdx) || trip.itinerary?.[0];

  // Travel Feasibility and Time conflicts warnings state
  const [travelWarnings, setTravelWarnings] = useState<{ prevActivityId: string; curActivityId: string; message: string; isImpossible?: boolean }[]>([]);
  const [isValidatingTravel, setIsValidatingTravel] = useState(false);
  const [updatingTransitIds, setUpdatingTransitIds] = useState<Record<string, boolean>>({});
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizeSuccessMsg, setOptimizeSuccessMsg] = useState("");

  // Drag and Drop States
  const [draggedActivityId, setDraggedActivityId] = useState<string | null>(null);
  const [dragOverActivityId, setDragOverActivityId] = useState<string | null>(null);

  // Debounced travel time and distance route validator
  useEffect(() => {
    // Clear out warnings immediately when activeDayIdx, activities, or transportation preference updates
    setTravelWarnings([]);

    if (!activeDay || !activeDay.activities || activeDay.activities.length < 2) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsValidatingTravel(true);
      try {
        const response = await fetch("/api/validate-itinerary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            activities: activeDay.activities
          })
        });
        if (response.ok) {
          const data = await response.json();
          if (data && data.warnings) {
            setTravelWarnings(data.warnings);
          }
        }
      } catch (err) {
        console.error("Itinerary travel validation call failed:", err);
      } finally {
        setIsValidatingTravel(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [
    activeDayIdx, 
    activeDay?.activities?.map(a => `${a.id}_${a.time}_${a.location}_${a.preferredTransportMode || "transit"}`).join("|")
  ]);

  const fetchAlternativesForActivity = async (activity: Activity, forceNext = false) => {
    setAlternativesLoading(true);
    setExpandedAltActivityId(activity.id);

    const prevExclusions = exclusionsMap[activity.id] || [];
    // Also exclude currently shown alternative choices to prevent duplicates on "Next"
    const currentAlts = alternativesMap[activity.id] || [];
    const newExclusions = [...prevExclusions, activity.title, ...currentAlts.map((a: any) => a.title)];

    try {
      const res = await fetch("/api/suggest-alternatives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destinations: trip.destinations,
          dayTheme: activeDay?.theme || "",
          currentActivity: {
            title: activity.title,
            description: activity.description,
            time: activity.time,
            location: activity.location,
            type: activity.type
          },
          knownExclusions: newExclusions
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.alternatives && data.alternatives.length > 0) {
          setAlternativesMap(prev => ({
            ...prev,
            [activity.id]: data.alternatives
          }));
          if (forceNext) {
            setExclusionsMap(prev => ({
              ...prev,
              [activity.id]: newExclusions
            }));
          }
        }
      }
    } catch (err) {
      console.error("Error fetching alternatives:", err);
    } finally {
      setAlternativesLoading(false);
    }
  };

  const handleSwapActivity = (originalActivityId: string, alternateChoice: any) => {
    if (!trip.itinerary) return;

    const updatedItinerary = trip.itinerary.map(day => {
      if (day.dayIndex !== activeDayIdx) return day;
      return {
        ...day,
        activities: day.activities.map(act => {
          if (act.id === originalActivityId) {
            return {
              ...act,
              title: alternateChoice.title,
              description: alternateChoice.description,
              location: alternateChoice.location,
              type: alternateChoice.type || act.type,
              openingHours: alternateChoice.openingHours || act.openingHours,
              budgetRange: alternateChoice.budgetRange || act.budgetRange,
              transportation: alternateChoice.transportation || act.transportation,
              label: "AI suggested"
            };
          }
          return act;
        })
      };
    });

    onUpdateTrip({
      ...trip,
      itinerary: updatedItinerary
    });

    setExpandedAltActivityId(null);
  };

  const handleFocusLocation = (loc: string) => {
    if (loc) {
      setFocusedLocation(loc);
    }
  };

  const handleApplyCustomEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (naturalLanguageInput.trim()) {
      onUpdateTripEdits(naturalLanguageInput.trim());
      setNaturalLanguageInput("");
    }
  };

  const handleClearEditsHistory = () => {
    onUpdateTrip({
      ...trip,
      customEditsHistory: [],
      customEdits: undefined
    });
  };

  // Check if an activity is favorited
  const isFav = (title: string) => favoritedActivities.includes(title);

  // Get current rating of activity
  const getRating = (title: string) => {
    const found = ratings.find(r => r.title === title);
    return found ? found.rating : 0;
  };

  // Convert custom datetime ISO into human scale e.g. "10:30 AM, Sat"
  const formatTime = (isoString?: string) => {
    if (!isoString) return "N/A";
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ", " + d.toLocaleDateString([], { weekday: 'short' });
    } catch {
      return isoString;
    }
  };

  const handleStartEdit = (act: Activity) => {
    setEditingActivityId(act.id);
    setEditTime(act.time || "");
    setEditTitle(act.title || "");
    setEditDesc(act.description || "");
    setEditLocation(act.location || "");
    setEditHours(act.openingHours || "");
    setEditBudget(act.budgetRange || "");
    setEditLabel(act.label || getActivityLabel(act, trip));
  };

  const handleSaveActivityEdit = (actId: string) => {
    if (!trip.itinerary) return;
    const updatedItinerary = trip.itinerary.map(day => {
      if (day.dayIndex !== activeDayIdx) return day;

      const isPlaceholder = actId.startsWith("placeholder_");
      let nextActivities = day.activities;
      if (isPlaceholder) {
        // Create an actual activity object based on the edited inputs
        const newAct: Activity = {
          id: `act_user_${Date.now()}`,
          time: editTime,
          title: editTitle,
          description: editDesc,
          location: editLocation || "City Center",
          type: "activity",
          openingHours: editHours,
          budgetRange: editBudget,
          label: editLabel,
          transportation: {
            mode: "Walk",
            duration: "10 mins",
            cost: "0",
            details: "Self walking"
          }
        };
        nextActivities = [...day.activities, newAct];
      } else {
        nextActivities = day.activities.map(act => {
          if (act.id !== actId) return act;
          return {
            ...act,
            time: editTime,
            title: editTitle,
            description: editDesc,
            location: editLocation,
            openingHours: editHours,
            budgetRange: editBudget,
            label: editLabel
          };
        });
      }

      // Sort activities chronologically by start time
      const sorted = [...nextActivities].sort((a, b) => {
        return getStartTimeInMinutes(a.time) - getStartTimeInMinutes(b.time);
      });

      // Recalculate transit info dynamically for the updated schedule
      recalculateAndSaveTransitForDay(sorted, activeDayIdx);

      return {
        ...day,
        activities: sorted
      };
    });
    onUpdateTrip({
      ...trip,
      itinerary: updatedItinerary
    });
    setEditingActivityId(null);
  };

  const recalculateAndSaveTransitForDay = async (activitiesList: Activity[], dayIndex: number) => {
    try {
      const resp = await fetch("/api/recalculate-transit-for-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activities: activitiesList,
          flights: trip.flights || []
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data && Array.isArray(data.activities)) {
          const updatedItinerary = (trip.itinerary || []).map(day => {
            if (day.dayIndex !== dayIndex) return day;
            return {
              ...day,
              activities: data.activities
            };
          });
          onUpdateTrip({
            ...trip,
            itinerary: updatedItinerary
          });
        }
      }
    } catch (err) {
      console.error("Failed to recalculate transit for day on modification:", err);
    }
  };

  const handleRemoveActivity = (actId: string) => {
    if (!trip.itinerary) return;
    const currentDay = trip.itinerary.find(d => d.dayIndex === activeDayIdx);
    if (!currentDay) return;
    const nextActivities = currentDay.activities.filter(act => act.id !== actId);

    // Recalculate transit dynamically when an activity is wiped
    recalculateAndSaveTransitForDay(nextActivities, activeDayIdx);

    const updatedItinerary = trip.itinerary.map(day => {
      if (day.dayIndex !== activeDayIdx) return day;
      return {
        ...day,
        activities: nextActivities
      };
    });
    onUpdateTrip({
      ...trip,
      itinerary: updatedItinerary
    });
  };

  const handleMoveActivity = async (activityId: string, direction: "up" | "down") => {
    if (!activeDay || !activeDay.activities || !trip.itinerary) return;
    
    const activities = [...activeDay.activities];
    const index = activities.findIndex(a => a.id === activityId);
    if (index === -1) return;
    
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= activities.length) return;
    
    // Swap activities in the array
    const temp = activities[index];
    activities[index] = activities[targetIndex];
    activities[targetIndex] = temp;
    
    // Swap their time slot strings chronologically so they occupy each other's slots beautifully
    const tempTime = activities[index].time;
    activities[index].time = activities[targetIndex].time;
    activities[targetIndex].time = tempTime;
    
    // Render the updated swap state immediately in trip state
    const updatedItinerary = trip.itinerary.map(day => {
      if (day.dayIndex !== activeDayIdx) return day;
      return {
        ...day,
        activities
      };
    });
    onUpdateTrip({
      ...trip,
      itinerary: updatedItinerary
    });

    // Request high-precision/fallback transit and commute recalculation asynchronously
    await recalculateAndSaveTransitForDay(activities, activeDayIdx);
  };

  const handleDropActivitySwap = async (draggedId: string, droppedOnId: string) => {
    if (!draggedId || !droppedOnId || draggedId === droppedOnId) return;
    if (!activeDay || !activeDay.activities || !trip.itinerary) return;

    // Reject if either is/contains a virtual on-the-fly placeholder
    if (draggedId.startsWith("placeholder_") || droppedOnId.startsWith("placeholder_")) {
      return;
    }

    const activities = [...activeDay.activities];
    const draggedIdx = activities.findIndex(a => a.id === draggedId);
    const droppedOnIdx = activities.findIndex(a => a.id === droppedOnId);

    if (draggedIdx === -1 || droppedOnIdx === -1) return;

    // Swap the elements in array order
    const temp = activities[draggedIdx];
    activities[draggedIdx] = activities[droppedOnIdx];
    activities[droppedOnIdx] = temp;

    // Swap their time slot strings to keep chronological order consistent with positions
    const tempTime = activities[draggedIdx].time;
    activities[draggedIdx].time = activities[droppedOnIdx].time;
    activities[droppedOnIdx].time = tempTime;

    // Update state immediately for zero-latency UI re-render
    const updatedItinerary = trip.itinerary.map(day => {
      if (day.dayIndex !== activeDayIdx) return day;
      return {
        ...day,
        activities
      };
    });

    onUpdateTrip({
      ...trip,
      itinerary: updatedItinerary
    });

    // Recalculate transit & travel margins dynamically
    await recalculateAndSaveTransitForDay(activities, activeDayIdx);
  };

  const handleOptimizeRoute = async () => {
    if (!activeDay || !activeDay.activities || activeDay.activities.length < 2) return;
    setIsOptimizing(true);
    setOptimizeSuccessMsg("");
    try {
      const hotelName = trip.hotels && trip.hotels.length > 0 ? trip.hotels[0].name : "";
      const startLoc = trip.destinations && trip.destinations.length > 0 ? trip.destinations[0] : "City Center";
      
      const response = await fetch("/api/optimize-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activities: activeDay.activities,
          hotel: hotelName,
          startLocation: startLoc
        })
      });

      if (response.ok) {
        const body = await response.json();
        if (body && Array.isArray(body.activities)) {
          // Update the activities inside the current activeDay
          const updatedItinerary = trip.itinerary?.map(day => {
            if (day.dayIndex !== activeDayIdx) return day;
            return {
              ...day,
              activities: body.activities
            };
          }) || [];
          
          onUpdateTrip({
            ...trip,
            itinerary: updatedItinerary
          });

          setOptimizeSuccessMsg("✨ Route and sequence optimized successfully!");
          setTimeout(() => setOptimizeSuccessMsg(""), 4000);
        }
      }
    } catch (err) {
      console.error("Optimize route error:", err);
    } finally {
      setIsOptimizing(false);
    }
  };

  const getOriginLocationForActivity = (activityId: string): string => {
    if (!activeDay || !activeDay.activities) return "";
    const idx = activeDay.activities.findIndex(a => a.id === activityId);
    if (idx > 0) {
      return activeDay.activities[idx - 1].location;
    }
    // Fallback to accommodation hotel or default destination if it's the first activity
    if (trip.hotels && trip.hotels.length > 0) {
      return trip.hotels[0].name;
    }
    return trip.destinations[0] || "City Center";
  };

  const getTransitPointsForActivity = (activityId: string): { from: string; to: string } => {
    if (!activeDay || !activeDay.activities) return { from: "", to: "" };
    const idx = activeDay.activities.findIndex(a => a.id === activityId);
    if (idx === -1) return { from: "", to: "" };
    
    const to = activeDay.activities[idx].title || activeDay.activities[idx].location;
    let from = "";
    if (idx > 0) {
      from = activeDay.activities[idx - 1].title || activeDay.activities[idx - 1].location;
    } else {
      if (trip.hotels && trip.hotels.length > 0) {
        from = `🏨 ${trip.hotels[0].name}`;
      } else {
        from = trip.destinations[0] || "City Center";
      }
    }
    return { from, to };
  };

  const handleToggleActivityTransitMode = async (activityId: string, targetMode: "transit" | "driving" | "walking") => {
    if (!trip.itinerary || !activeDay) return;
    
    // Set loading indicator
    setUpdatingTransitIds(prev => ({ ...prev, [activityId]: true }));

    const origin = getOriginLocationForActivity(activityId);
    const activityObj = activeDay.activities.find(a => a.id === activityId);
    if (!activityObj || !origin) {
      setUpdatingTransitIds(prev => ({ ...prev, [activityId]: false }));
      return;
    }

    try {
      const response = await fetch("/api/get-transit-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin,
          destination: activityObj.location,
          mode: targetMode
        })
      });

      if (response.ok) {
        const newTransitData = await response.json();
        // Update this activity in the trip state
        const updatedItinerary = trip.itinerary.map(day => {
          if (day.dayIndex !== activeDayIdx) return day;
          return {
            ...day,
            activities: day.activities.map(act => {
              if (act.id !== activityId) return act;
              return {
                ...act,
                preferredTransportMode: targetMode,
                transportation: {
                  mode: newTransitData.mode,
                  duration: newTransitData.duration,
                  cost: newTransitData.cost || act.transportation?.cost || "",
                  details: newTransitData.details,
                  distance: newTransitData.distance || act.transportation?.distance || ""
                }
              };
            })
          };
        });

        onUpdateTrip({
          ...trip,
          itinerary: updatedItinerary
        });
      }
    } catch (err) {
      console.error("Failed to dynamically update activity transit:", err);
    } finally {
      setUpdatingTransitIds(prev => ({ ...prev, [activityId]: false }));
    }
  };

  const handleAddNewActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActTitle.trim()) return;

    const newAct: Activity = {
      id: "act_user_" + Date.now().toString(36),
      title: newActTitle.trim(),
      time: newActTime || "10:00 AM",
      description: newActDesc.trim() || "Custom planned tourist attraction or rest stop.",
      location: newActLocation.trim() || trip.destinations[0],
      type: "activity", // default
      openingHours: newActHours,
      budgetRange: newActBudget,
      label: newActLabel,
      transportation: {
        mode: "Walk",
        duration: "10 mins",
        cost: "",
        details: ""
      }
    };

    if (!trip.itinerary) return;
    const updatedItinerary = trip.itinerary.map(day => {
      if (day.dayIndex !== activeDayIdx) return day;
      const sorted = [...day.activities, newAct].sort((a, b) => {
        return getStartTimeInMinutes(a.time) - getStartTimeInMinutes(b.time);
      });
      return {
        ...day,
        activities: sorted
      };
    });

    onUpdateTrip({
      ...trip,
      itinerary: updatedItinerary
    });

    // Reset inputs
    setNewActTitle("");
    setNewActTime("");
    setNewActDesc("");
    setNewActLocation("");
    setNewActHours("");
    setNewActBudget("");
    setNewActLabel("Want-to-go");
    setIsAddingActivity(false);
  };

  // --- FLIGHT MANAGEMENT HANDLERS ---
  const handleStartEditFlight = (f: any) => {
    setEditingFlightId(f.id);
    setEditFlightType(f.type || "depart");
    setEditFlightNo(f.flightNo || "");
    setEditFlightDepAirport(f.departureAirport || "");
    setEditFlightArrAirport(f.arrivalAirport || "");
    setEditFlightDepTime(f.departureTime || "");
    setEditFlightArrTime(f.arrivalTime || "");
  };

  const handleSaveFlightEdit = (fId: string) => {
    const updatedFlights = (trip.flights || []).map(f => {
      if (f.id !== fId) return f;
      return {
        ...f,
        type: editFlightType,
        flightNo: editFlightNo,
        departureAirport: editFlightDepAirport,
        arrivalAirport: editFlightArrAirport,
        departureTime: editFlightDepTime,
        arrivalTime: editFlightArrTime
      };
    });
    onUpdateTrip({
      ...trip,
      flights: updatedFlights
    });
    setEditingFlightId(null);
  };

  const handleRemoveFlight = (fId: string) => {
    onUpdateTrip({
      ...trip,
      flights: (trip.flights || []).filter(f => f.id !== fId)
    });
  };

  const handleAddNewFlight = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFlightNo.trim()) return;
    const newF = {
      id: "f_user_" + Date.now().toString(36),
      type: newFlightType,
      flightNo: newFlightNo.trim(),
      departureAirport: newFlightDepAirport.trim() || "NRT",
      arrivalAirport: newFlightArrAirport.trim() || "SIN",
      departureTime: newFlightDepTime || `${trip.startDate}T11:00`,
      arrivalTime: newFlightArrTime || `${trip.startDate}T17:00`
    };
    onUpdateTrip({
      ...trip,
      flights: [...(trip.flights || []), newF]
    });
    // reset
    setNewFlightNo("");
    setNewFlightDepAirport("");
    setNewFlightArrAirport("");
    setNewFlightDepTime("");
    setNewFlightArrTime("");
    setIsAddingFlight(false);
  };

  // --- HOTEL MANAGEMENT HANDLERS ---
  const handleStartEditHotel = (h: any) => {
    setEditingHotelId(h.id);
    setEditHotelName(h.name || "");
    setEditHotelLocation(h.locationUrl || "");
    setEditHotelCheckIn(h.checkIn || "");
    setEditHotelCheckOut(h.checkOut || "");
  };

  const handleSaveHotelEdit = (hId: string) => {
    const updatedHotels = (trip.hotels || []).map(h => {
      if (h.id !== hId) return h;
      return {
        ...h,
        name: editHotelName,
        locationUrl: editHotelLocation,
        checkIn: editHotelCheckIn,
        checkOut: editHotelCheckOut
      };
    });
    onUpdateTrip({
      ...trip,
      hotels: updatedHotels
    });
    setEditingHotelId(null);
  };

  const handleRemoveHotel = (hId: string) => {
    onUpdateTrip({
      ...trip,
      hotels: (trip.hotels || []).filter(h => h.id !== hId)
    });
  };

  const handleAddNewHotel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHotelName.trim()) return;
    const newH = {
      id: "h_user_" + Date.now().toString(36),
      name: newHotelName.trim(),
      locationUrl: newHotelLocation.trim() || trip.destinations[0],
      checkIn: newHotelCheckIn || `${trip.startDate}T15:00`,
      checkOut: newHotelCheckOut || `${trip.endDate}T11:00`
    };
    onUpdateTrip({
      ...trip,
      hotels: [...(trip.hotels || []), newH]
    });
    setNewHotelName("");
    setNewHotelLocation("");
    setNewHotelCheckIn("");
    setNewHotelCheckOut("");
    setIsAddingHotel(false);
  };

  // --- WISHLIST / WANT TO GO HANDLERS ---
  const handleAddWishlistPlace = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newWishlistInput.trim();
    if (!clean) return;

    // Check if place is already in the itinerary schedule
    const scheduledDay = getScheduledDayOfPlace(clean, trip.itinerary);
    if (scheduledDay !== null) {
      setWishlistAlert(`"${clean}" is already scheduled in Day ${scheduledDay}!`);
      setTimeout(() => setWishlistAlert(null), 5000);
    }

    const currentList = trip.wantToGoPlaces || [];
    if (!currentList.includes(clean)) {
      onUpdateTrip({
        ...trip,
        wantToGoPlaces: [...currentList, clean]
      });
    } else if (scheduledDay === null) {
      // Just normal list warning
      setWishlistAlert(`"${clean}" is already in your wish list board.`);
      setTimeout(() => setWishlistAlert(null), 4000);
    }
    setNewWishlistInput("");
  };

  const handleRemoveWishlistPlace = (place: string) => {
    const currentList = trip.wantToGoPlaces || [];
    onUpdateTrip({
      ...trip,
      wantToGoPlaces: currentList.filter(p => p !== place)
    });
  };

  const handleInsertPlaceToDay = (place: string, targetDayIdx: number) => {
    // Generate a beautiful new activity centered in mid-afternoon slot (03:30 PM - 05:00 PM)
    // ensuring it is NOT placed at the end of the day because of chronological sorting!
    const newActivity: Activity = {
      id: "act_user_wish_" + Date.now().toString(36),
      title: place,
      time: "03:30 PM - 05:00 PM",
      description: `Exploring ${place}. Visited from your curated wish list of attractions.`,
      location: place,
      type: "activity",
      openingHours: "9:00 AM - 6:00 PM",
      budgetRange: "Varies",
      transportation: {
        mode: "Subway/Walk",
        duration: "15 mins",
        cost: "Free",
        details: "Transit path incorporated"
      }
    };

    if (!trip.itinerary) return;

    const updatedItinerary = trip.itinerary.map(day => {
      if (day.dayIndex !== targetDayIdx) return day;

      // Append and sort chronologically so it is ordered correctly in the schedule
      const unsorted = [...day.activities, newActivity];
      const sorted = unsorted.sort((a, b) => {
        return getStartTimeInMinutes(a.time) - getStartTimeInMinutes(b.time);
      });

      return {
        ...day,
        activities: sorted
      };
    });

    onUpdateTrip({
      ...trip,
      itinerary: updatedItinerary
    });

    setFocusedLocation(place);
  };

  // --- TIMELINE CONFLICT VALIDATOR ---
  const parseActivityTime = (dateStr: string, timeSlot: string) => {
    try {
      const firstPart = timeSlot.split("-")[0].trim(); // e.g. "10:00 AM"
      const match = firstPart.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (match) {
        let hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        const ampm = match[3].toUpperCase();
        if (ampm === "PM" && hours < 12) hours += 12;
        if (ampm === "AM" && hours === 12) hours = 0;
        return new Date(`${dateStr}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`);
      }
      return new Date(dateStr + "T00:00:00");
    } catch {
      return new Date(dateStr);
    }
  };

  const getScheduleConflicts = () => {
    const conflicts: Array<{ activityTitle: string; message: string; dayIndex: number }> = [];
    if (!trip.itinerary) return conflicts;

    const departFlight = trip.flights?.find(f => f.type === "depart");
    const returnFlight = trip.flights?.find(f => f.type === "return");

    const departLimit = departFlight?.arrivalTime ? new Date(departFlight.arrivalTime) : null;
    const returnLimit = returnFlight?.departureTime ? new Date(returnFlight.departureTime) : null;

    trip.itinerary.forEach(day => {
      day.activities.forEach(act => {
        const actDateTime = parseActivityTime(day.date, act.time);
        
        if (departLimit && actDateTime < departLimit) {
          conflicts.push({
            activityTitle: act.title,
            dayIndex: day.dayIndex,
            message: `Starts before Outbound Flight arrival (${formatTime(departFlight.arrivalTime)})`
          });
        }
        if (returnLimit && actDateTime > returnLimit) {
          conflicts.push({
            activityTitle: act.title,
            dayIndex: day.dayIndex,
            message: `Starts after Return Flight departure (${formatTime(returnFlight.departureTime)})`
          });
        }
      });
    });

    return conflicts;
  };

  const activeConflicts = getScheduleConflicts();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      {/* LEFT: Complete Timeline Flow (8 Cols) */}
      <div className="lg:col-span-8 space-y-8">
        
        {/* Day Selector Ribbon */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {trip.itinerary?.map((day) => (
              <button
                key={day.dayIndex}
                onClick={() => {
                  setActiveDayIdx(day.dayIndex);
                  if (day.activities.length > 0) {
                    setFocusedLocation(day.activities[0].location);
                  }
                }}
                className={`px-4 py-2 text-xs font-bold rounded-xl tracking-widest transition uppercase shrink-0 cursor-pointer ${
                  activeDayIdx === day.dayIndex
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-50 text-slate-500 hover:bg-slate-100/80 hover:text-slate-900"
                }`}
              >
                Day {day.dayIndex}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Display Currency selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Currency:</span>
              <select
                value={displayCurrency}
                onChange={(e) => {
                  onUpdateTrip({
                    ...trip,
                    displayCurrency: e.target.value
                  });
                }}
                className="bg-transparent text-slate-800 font-bold font-mono text-xs focus:outline-none cursor-pointer"
              >
                {AVAILABLE_CURRENCIES.map(curr => (
                  <option key={curr} value={curr}>{curr} ({CURRENCY_SYMBOLS[curr] || "$"})</option>
                ))}
              </select>
            </div>

            <button
              onClick={onExportCalendar}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 shadow-sm shadow-indigo-600/10"
              title="Export calendar schedule ICS"
            >
              <Download className="w-3.5 h-3.5 text-indigo-200" /> Export Schedule
            </button>
          </div>
        </div>

        {/* SCHEDULE FLIGHT DATE/TIME BOUNDARY VALIDATOR BANNER */}
        {activeConflicts.length > 0 ? (
          <div className="p-5 bg-amber-50/70 border border-amber-200/80 rounded-3xl space-y-3.5 shadow-sm text-slate-800 animate-fade-in animate-duration-300">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800">Travel Boundary Violation Warnings</h4>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Your planned activities violate booking boundaries. Adjust your custom schedule times or edit flight tickets in the booking board to align them perfectly.
                </p>
              </div>
            </div>
            <div className="space-y-1.5 pl-7">
              {activeConflicts.map((conf, idx) => (
                <div key={idx} className="text-xs flex flex-wrap items-center justify-between bg-white border border-amber-100/60 px-3.5 py-2 rounded-2xl gap-2 font-medium">
                  <span className="text-slate-700">
                    <span className="font-bold text-amber-700">Day {conf.dayIndex}</span>: "{conf.activityTitle}"
                  </span>
                  <span className="text-[10px] font-mono bg-amber-50 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-100 font-semibold uppercase">
                    {conf.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 bg-emerald-50/50 border border-emerald-150/80 rounded-3xl flex items-center gap-2.5 shadow-sm">
            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 flex-shrink-0" />
            <div>
              <span className="block text-xs font-bold text-emerald-800">Flight-Timeline Sync Verified</span>
              <span className="block text-[11px] text-slate-500 mt-0.5">All programmed activities conform cleanly within your booked flight departure and arrival limits.</span>
            </div>
          </div>
        )}

        {/* Dynamic Natural Language Customizer box */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 px-2 text-[10px] bg-indigo-50 text-indigo-600 font-mono rounded font-bold uppercase tracking-wider">Dynamic Router</span>
              <h3 className="text-sm font-bold tracking-tight text-slate-900">Customize or Refine Schedule</h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Let the multi-agent system reconstruct the timeline with customized adjustments</p>
          </div>
          <form onSubmit={handleApplyCustomEdit} className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. 'Day 3 Disneyland instead of Shrines' or 'stay in Hakone Ryokan Day 4 instead'..."
              value={naturalLanguageInput}
              onChange={(e) => setNaturalLanguageInput(e.target.value)}
              disabled={isReplanning}
              className="flex-1 px-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 text-slate-800 text-xs border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl transition outline-none"
            />
            <button
              type="submit"
              disabled={isReplanning || !naturalLanguageInput.trim()}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-1 disabled:opacity-50"
            >
              <Compass className={`w-3.5 h-3.5 ${isReplanning ? 'animate-spin text-indigo-400' : ''}`} />
              Update Plan
            </button>
          </form>

          {/* Active Constraints / Accumulated Refinement History */}
          {((trip.customEditsHistory && trip.customEditsHistory.length > 0) || trip.customEdits) && (
            <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4.5 space-y-2.5 text-xs animate-none">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 font-mono tracking-wider text-[10px] uppercase flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                  Accumulated Prompts History ({trip.customEditsHistory?.length || 1})
                </span>
                <button
                  type="button"
                  onClick={handleClearEditsHistory}
                  className="text-[10px] font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer bg-transparent border-0"
                  title="Clear all accumulated prompts and start fresh"
                >
                  Reset History
                </button>
              </div>
              <ol className="space-y-1.5 list-decimal pl-4.5 text-slate-700 font-medium font-sans">
                {(trip.customEditsHistory && trip.customEditsHistory.length > 0) ? (
                  trip.customEditsHistory.map((edit, idx) => (
                    <li key={idx} className="leading-snug">
                      {edit}
                    </li>
                  ))
                ) : (
                  <li className="leading-snug">{trip.customEdits}</li>
                )}
              </ol>
              <p className="text-[10px] text-slate-400 italic">
                All upcoming updates will respect the above requirements. Keep refining or click "Reset History" to start over.
              </p>
            </div>
          )}

          {replanError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-600 font-medium leading-relaxed">
              ⚠️ {replanError}
            </div>
          )}
        </div>

        {/* ACTIVE TIMELINE STREAM */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div className="mb-6 pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono font-bold text-indigo-600 uppercase tracking-widest block">
                Day {activeDay?.dayIndex} — {activeDay?.date}
              </span>
              <h3 className="text-lg font-bold tracking-tight text-slate-900 mt-0.5">
                {activeDay?.theme}
              </h3>
              <p className="text-[11px] text-indigo-650 font-semibold mt-1.5 flex items-center gap-1.5 bg-indigo-50/60 w-fit px-2.5 py-1 rounded-xl">
                <span>⚡</span> Tip: Drag and drop cards to swap schedule slots instantly!
              </p>
            </div>


          </div>

          <div className="relative pl-6 border-l border-slate-100 ml-4 pt-2 space-y-10">
            {(["Morning", "Afternoon", "Evening"] as const).map((period) => {
              if (isPeriodHiddenByFlight(activeDay, period, trip)) return null;
              const periodActivities = getSlotActivities(activeDay, period);

              return (
                <div key={period} className="space-y-4">
                  {/* Elegant Horizontal Divided Period Header */}
                  <div className="flex items-center gap-4 pt-1 pb-1">
                    <span className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-widest flex items-center gap-1.5 shrink-0">
                      {period === "Morning" ? "🌅 Morning" : period === "Afternoon" ? "☀️ Afternoon" : "🌙 Evening"}
                    </span>
                    <div className="h-[1px] bg-slate-200/60 flex-1"></div>
                    <span className="text-[9px] font-bold py-0.5 px-2 bg-slate-100 text-slate-500 rounded-full font-mono shrink-0">
                      {periodActivities.length} {periodActivities.length === 1 ? "slot" : "slots"}
                    </span>
                  </div>

                  <div className="space-y-6">
                    {periodActivities.map((activity, index) => {
              const isSelectedMap = focusedLocation.toLowerCase() === activity.location.toLowerCase();
              const isEditing = editingActivityId === activity.id;

              return (
                <div key={activity.id} className="relative group">
                  {/* Timeline bullet indicator */}
                  <span className={`absolute -left-10 top-1 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center transition-all ${
                    isSelectedMap 
                      ? 'bg-slate-900 ring-2 ring-slate-900 shadow-md scale-110' 
                      : 'bg-indigo-50 text-indigo-500 hover:bg-slate-900 hover:text-white'
                  }`}>
                    {activity.type === 'food' ? (
                      <span className="text-xs">🍜</span>
                    ) : activity.type === 'checkin' || activity.type === 'hotel' ? (
                      <span className="text-xs">🏨</span>
                    ) : activity.type === 'airport' || activity.type === 'transit' ? (
                      <span className="text-xs">✈️</span>
                    ) : (
                      <span className="text-xs">📍</span>
                    )}
                  </span>

                  {/* Activity Card */}
                  <div 
                    draggable={!isEditing && !activity.id.startsWith("placeholder_")}
                    onDragStart={(e) => {
                      setDraggedActivityId(activity.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => {
                      setDraggedActivityId(null);
                      setDragOverActivityId(null);
                    }}
                    onDragOver={(e) => {
                      if (draggedActivityId && draggedActivityId !== activity.id) {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                      }
                    }}
                    onDragEnter={() => {
                      if (draggedActivityId && draggedActivityId !== activity.id) {
                        setDragOverActivityId(activity.id);
                      }
                    }}
                    onDragLeave={() => {
                      if (dragOverActivityId === activity.id) {
                        setDragOverActivityId(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedActivityId && draggedActivityId !== activity.id) {
                        handleDropActivitySwap(draggedActivityId, activity.id);
                      }
                      setDragOverActivityId(null);
                    }}
                    className={`p-5 rounded-2xl transition-all duration-200 border cursor-grab active:cursor-grabbing ${
                      draggedActivityId === activity.id
                        ? "opacity-45 scale-[0.97] border-indigo-200 bg-slate-50/50"
                        : dragOverActivityId === activity.id
                        ? "border-indigo-500 bg-indigo-50/35 scale-[1.01] shadow-md border-dashed ring-2 ring-indigo-400/20"
                        : isSelectedMap
                        ? "bg-slate-50 border-slate-300 ring-1 ring-slate-300"
                        : "bg-white border-slate-100 hover:border-slate-300 hover:shadow-xs shadow-none"
                    }`}
                  >
                    {isEditing ? (
                      <form onSubmit={(e) => { e.preventDefault(); handleSaveActivityEdit(activity.id); }} className="space-y-3 p-1">
                        <div className="flex items-center justify-between border-b border-slate-150 pb-2">
                          <span className="text-xs font-bold text-slate-500 font-mono uppercase">Edit Activity Slot</span>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveActivity(activity.id)}
                            className="text-xs text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 cursor-pointer"
                            title="Remove completely"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Remove Attraction
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase font-mono">Time Slot</label>
                            <input 
                              type="text" 
                              className="w-full px-3 py-1.5 text-xs bg-slate-50 text-slate-800 border border-slate-200 focus:border-indigo-500 rounded-xl outline-none" 
                              value={editTime}
                              onChange={(e) => setEditTime(e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase font-mono">Opening Hours</label>
                            <input 
                              type="text" 
                              className="w-full px-3 py-1.5 text-xs bg-slate-50 text-slate-800 border border-slate-200 focus:border-indigo-500 rounded-xl outline-none" 
                              value={editHours}
                              placeholder="e.g. 10:00 AM - 10:00 PM"
                              onChange={(e) => setEditHours(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase font-mono">Attraction Title</label>
                            <input 
                              type="text" 
                              className="w-full px-3 py-1.5 text-xs bg-slate-50 text-slate-800 border border-slate-205 focus:border-indigo-500 rounded-xl outline-none font-semibold text-slate-900" 
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase font-mono">Location Search Name</label>
                            <input 
                              type="text" 
                              className="w-full px-3 py-1.5 text-xs bg-slate-50 text-slate-800 border border-slate-205 focus:border-indigo-500 rounded-xl outline-none" 
                              value={editLocation}
                              onChange={(e) => setEditLocation(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase font-mono">Budget / Ticket Price</label>
                          <input 
                            type="text" 
                            className="w-full px-3 py-1.5 text-xs bg-slate-50 text-slate-800 border border-slate-205 focus:border-indigo-500 rounded-xl outline-none" 
                            value={editBudget}
                            onChange={(e) => setEditBudget(e.target.value)}
                            placeholder="e.g. ¥1,500 - ¥3,000"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase font-mono">Schedule Label</label>
                          <select 
                            className="w-full px-3 py-1.5 text-xs bg-slate-50 text-slate-800 border border-slate-205 focus:border-indigo-500 rounded-xl outline-none" 
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                          >
                            <option value="Want-to-go">Want-to-go</option>
                            <option value="Flight">Flight</option>
                            <option value="Hotel">Hotel</option>
                            <option value="AI suggested">AI suggested</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase font-mono">Description / Notes</label>
                          <textarea 
                            className="w-full px-3 py-2 text-xs bg-slate-50 text-slate-800 border border-slate-205 focus:border-indigo-500 rounded-xl outline-none h-20 resize-none leading-relaxed" 
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                          <button 
                            type="button" 
                            onClick={() => setEditingActivityId(null)}
                            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-xl text-xs font-semibold transition cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button 
                            type="submit" 
                            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                          >
                            Save Changes
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        {/* Header line */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md">
                              {activity.time}
                            </span>
                            {renderLabelBadge(activity, trip)}
                            {activity.openingHours && (
                              <span className="text-[10px] font-semibold text-teal-600 bg-teal-50 px-2 py-0.5 rounded flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {activity.openingHours}
                              </span>
                            )}
                            {activity.budgetRange && (
                              <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded flex items-center gap-0.5">
                                <DollarSign className="w-3 h-3" />
                                {convertPriceString(activity.budgetRange, baseCurrency, displayCurrency)}
                              </span>
                            )}
                          </div>

                          {/* Micro interaction bar */}
                          <div className="flex items-center gap-1 self-end md:self-auto">
                            {/* Move Up Button */}
                            {(() => {
                              const globalIndex = activeDay ? activeDay.activities.findIndex(a => a.id === activity.id) : -1;
                              const canMoveUp = globalIndex > 0;
                              return canMoveUp && (
                                <button
                                  onClick={() => handleMoveActivity(activity.id, "up")}
                                  className="p-1.5 rounded-lg text-slate-450 hover:bg-slate-100 hover:text-indigo-650 transition-colors cursor-pointer"
                                  title="Move Up (Swap Order)"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                              );
                            })()}

                            {/* Move Down Button */}
                            {(() => {
                              const globalIndex = activeDay ? activeDay.activities.findIndex(a => a.id === activity.id) : -1;
                              const canMoveDown = globalIndex >= 0 && globalIndex < (activeDay?.activities?.length || 0) - 1;
                              return canMoveDown && (
                                <button
                                  onClick={() => handleMoveActivity(activity.id, "down")}
                                  className="p-1.5 rounded-lg text-slate-450 hover:bg-slate-100 hover:text-indigo-650 transition-colors cursor-pointer"
                                  title="Move Down (Swap Order)"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                              );
                            })()}

                            {/* Edit Button */}
                            <button
                              onClick={() => handleStartEdit(activity)}
                              className="p-1.5 rounded-lg text-slate-450 hover:bg-slate-100 hover:text-indigo-600 transition-colors cursor-pointer"
                              title="Edit Activity Inline"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => handleRemoveActivity(activity.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-650 transition-colors cursor-pointer"
                              title="Delete Activity"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Title and location clickable */}
                        <div className="mt-3">
                          <button
                            onClick={() => handleFocusLocation(activity.location)}
                            className="text-left font-medium text-slate-950 hover:text-indigo-600 transition flex items-center gap-1.5 cursor-pointer"
                          >
                            {activity.title}
                            <MapPin className="w-4 h-4 text-slate-450" />
                          </button>
                          <p className="text-xs text-slate-400 mt-1 font-mono font-medium">
                            {activity.location}
                          </p>
                          <p className="text-sm text-slate-500 mt-2 font-normal leading-relaxed">
                            {activity.description}
                          </p>
                        </div>

                        {/* Alternative Recommendation Section */}
                        <div className="mt-4 border-t border-slate-100 pt-3">
                          <button
                            type="button"
                            onClick={() => {
                              if (expandedAltActivityId === activity.id) {
                                setExpandedAltActivityId(null);
                              } else {
                                if (alternativesMap[activity.id]) {
                                  setExpandedAltActivityId(activity.id);
                                } else {
                                  fetchAlternativesForActivity(activity);
                                }
                              }
                            }}
                            className="w-full flex items-center justify-between px-3 py-2 bg-indigo-50/50 hover:bg-slate-100/80 text-indigo-700 hover:text-indigo-800 text-xs font-bold rounded-xl transition cursor-pointer"
                          >
                            <span className="flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5" />
                              {expandedAltActivityId === activity.id ? "Hide Alternative Options" : "✨ Explore Alternative Choices for This Slot"}
                            </span>
                            <span className="text-[10px] font-mono font-bold bg-white text-indigo-600 px-2 py-0.5 rounded-md border border-indigo-100">
                              AI Sourced
                            </span>
                          </button>

                          {expandedAltActivityId === activity.id && (
                            <div className="mt-3 p-3 bg-slate-50 rounded-2xl border border-slate-150 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-500 font-mono uppercase tracking-widest">
                                  Alternative Ideas
                                </span>
                                <button
                                  type="button"
                                  onClick={() => fetchAlternativesForActivity(activity, true)}
                                  disabled={alternativesLoading}
                                  className="text-xs text-indigo-605 hover:text-indigo-850 text-indigo-600 hover:text-indigo-850 font-bold flex items-center gap-1.5 bg-white border border-slate-200 hover:border-slate-305 px-2.5 py-1 rounded-xl shadow-xs transition duration-150 cursor-pointer disabled:opacity-50"
                                >
                                  {alternativesLoading ? (
                                    <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />
                                  ) : (
                                    <Sparkles className="w-3 h-3" />
                                  )}
                                  <span>Next Options ➡️</span>
                                </button>
                              </div>

                              {alternativesLoading && !alternativesMap[activity.id] ? (
                                <div className="flex flex-col items-center justify-center py-6 gap-2 bg-white rounded-xl border border-dashed border-slate-205">
                                  <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                                  <span className="text-[11px] font-bold text-slate-500 font-mono">Consulting personal AI Travel Agent...</span>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 gap-3">
                                  {(alternativesMap[activity.id] || []).map((altChoice: any, idx: number) => (
                                    <div key={altChoice.id || idx} className="bg-white p-3.5 rounded-xl border border-slate-150 shadow-xs flex flex-col justify-between gap-3 transition">
                                      <div className="flex items-center justify-between flex-wrap gap-2">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="text-[9px] font-mono font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">
                                            {altChoice.type || "sightseeing"}
                                          </span>
                                          {altChoice.openingHours && (
                                            <span className="text-[9px] font-bold bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded">
                                              {altChoice.openingHours}
                                            </span>
                                          )}
                                          {altChoice.budgetRange && (
                                            <span className="text-[9px] font-bold bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded">
                                              {altChoice.budgetRange}
                                            </span>
                                          )}
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => handleSwapActivity(activity.id, altChoice)}
                                          className="text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer"
                                        >
                                          Swap with This ✅
                                        </button>
                                      </div>

                                      <div>
                                        <h4 className="text-xs font-bold text-slate-900 transition">
                                          {altChoice.title}
                                        </h4>
                                        <span className="text-[9px] text-slate-450 font-bold block mt-0.5">
                                          📍 {altChoice.location}
                                        </span>
                                        <p className="text-[11px] text-slate-500 leading-normal mt-1">
                                          {altChoice.description}
                                        </p>
                                      </div>

                                      {altChoice.transportation && (
                                        <div className="text-[9px] font-medium text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-center gap-1 flex-wrap">
                                          <span className="font-bold text-slate-400">Est. Commute:</span>
                                          <span className="font-bold text-indigo-650">{altChoice.transportation.mode}</span>
                                          <span className="text-slate-400">({altChoice.transportation.duration})</span>
                                          {altChoice.transportation.distance && (
                                            <span className="bg-slate-200 text-slate-700 px-1 rounded font-bold font-mono text-[8px]">
                                              {altChoice.transportation.distance}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                  {!(alternativesMap[activity.id]?.length) && (
                                    <div className="text-xs font-semibold text-slate-400 italic text-center py-4">
                                      Generating alternative suggestions...
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Transit options bar container */}
                        <div className="mt-4 pt-4 border-t border-slate-100/80">

                          {/* Transit options bar underneath if applicable */}
                          {activity.transportation && (() => {
                            const idx = activeDay?.activities?.findIndex(a => a.id === activity.id) ?? -1;
                            const isArrivalStart = idx === 0 && (
                              activity.type === "airport" ||
                              (activity.title || "").toLowerCase().includes("flight") ||
                              (activity.title || "").toLowerCase().includes("arrive") ||
                              (activity.title || "").toLowerCase().includes("landing") ||
                              (activity.title || "").toLowerCase().includes("airport") ||
                              (activity.location || "").toLowerCase().includes("airport")
                            );
                            if (isArrivalStart) return null;

                            const { from, to } = getTransitPointsForActivity(activity.id);
                            return (
                              <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col gap-2">
                                {/* Route endpoints label row */}
                                <div className="flex flex-wrap items-center gap-1.5 bg-indigo-50/40 border border-indigo-100/50 p-2 px-3 rounded-2xl text-[11px] text-slate-700 shadow-3xs">
                                  <span className="text-indigo-600 font-bold uppercase tracking-wider text-[9px] font-mono bg-indigo-100/80 px-1.5 py-0.5 rounded-md">Route</span>
                                  <span className="font-extrabold truncate max-w-[130px] sm:max-w-xs text-slate-800" title={from}>{from}</span>
                                  <span className="text-indigo-400 font-black px-1">➔</span>
                                  <span className="font-extrabold truncate max-w-[130px] sm:max-w-xs text-slate-900" title={to}>{to}</span>
                                </div>

                                <div className="text-[11px] font-medium text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                  {/* Left: Commute Mode info/pill */}
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <Navigation className="w-3.5 h-3.5 text-indigo-500" strokeWidth={2.5} />
                                    <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Commute:</span>
                                    {updatingTransitIds[activity.id] ? (
                                      <span className="animate-pulse text-indigo-650 font-bold flex items-center gap-1">
                                        <span className="w-2.5 h-2.5 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin inline-block"></span>
                                        Recalculating commute...
                                      </span>
                                    ) : (
                                      <>
                                        <span className="text-[11px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold" title={activity.transportation.details}>
                                          {activity.transportation.mode}
                                        </span>
                                        <span className="text-slate-400 font-mono font-bold">({activity.transportation.duration || "N/A"})</span>
                                        {activity.transportation.distance && (
                                          <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold" title="Est. Geographic Distance">
                                            {activity.transportation.distance}
                                          </span>
                                        )}
                                        {activity.transportation.cost && (
                                          <span className="text-teal-600 font-bold bg-teal-50/60 px-1.5 py-0.5 rounded">
                                            {convertPriceString(activity.transportation.cost, baseCurrency, displayCurrency)}
                                          </span>
                                        )}
                                      </>
                                    )}
                                  </div>

                                  {/* Right: Toggle Button Group */}
                                  <div className="flex items-center gap-1 shrink-0 bg-slate-100 border border-slate-200/60 p-0.5 rounded-lg self-end sm:self-center">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleActivityTransitMode(activity.id, "transit")}
                                      disabled={updatingTransitIds[activity.id]}
                                      className={`px-2 py-1 rounded text-[10px] font-extrabold transition-all cursor-pointer ${
                                        (activity.preferredTransportMode || "transit") === "transit"
                                          ? "bg-white text-slate-900 border border-slate-200 shadow-3xs"
                                          : "text-slate-500 hover:text-slate-805 disabled:opacity-40"
                                      }`}
                                      title="Calculate commute via public transit"
                                    >
                                      🚇 Transit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleActivityTransitMode(activity.id, "driving")}
                                      disabled={updatingTransitIds[activity.id]}
                                      className={`px-2 py-1 rounded text-[10px] font-extrabold transition-all cursor-pointer ${
                                        activity.preferredTransportMode === "driving"
                                          ? "bg-white text-slate-900 border border-slate-200 shadow-3xs"
                                          : "text-slate-500 hover:text-slate-805 disabled:opacity-40"
                                        }`}
                                      title="Calculate commute via driving/taxi/rental car"
                                    >
                                      🚗 Taxi/Car
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleActivityTransitMode(activity.id, "walking")}
                                      disabled={updatingTransitIds[activity.id]}
                                      className={`px-2 py-1 rounded text-[10px] font-extrabold transition-all cursor-pointer ${
                                        activity.preferredTransportMode === "walking"
                                          ? "bg-white text-slate-900 border border-slate-200 shadow-3xs"
                                          : "text-slate-500 hover:text-slate-805 disabled:opacity-40"
                                      }`}
                                      title="Calculate commute via walking"
                                    >
                                      🚶 Walk
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </>
                    )}
                  </div>
 
                  {travelWarnings
                    .filter(w => w.prevActivityId === activity.id)
                    .map((w, wIdx) => {
                      const isImp = w.isImpossible;
                      return (
                        <div 
                          key={wIdx} 
                          className={`my-4 ml-6 pl-4 border-l-4 rounded-r-xl p-3 text-xs shadow-xs animate-fade-in flex flex-col gap-1 ring-1 ${
                            isImp 
                              ? "border-rose-500 bg-rose-50/75 text-rose-950 ring-rose-200"
                              : "border-amber-500 bg-amber-50/60 text-amber-950 ring-amber-200"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <AlertTriangle className={`w-4 h-4 shrink-0 ${isImp ? "text-rose-600 animate-pulse" : "text-amber-600"}`} />
                            <span className={`font-black uppercase tracking-widest font-mono text-[9px] ${isImp ? "text-rose-800" : "text-amber-800"}`}>
                              {isImp ? "Transit Feasibility Warning — IMPOSSIBLE" : "Transit Feasibility Warning"}
                            </span>
                          </div>
                          <p className={`text-[11px] leading-relaxed font-semibold ${isImp ? "text-rose-700" : "text-amber-700"}`}>
                            {w.message}
                          </p>
                        </div>
                      );
                    })}
                </div>
              );
            })}
                  </div>
                </div>
              );
            })}

            {/* Add Custom Activity Button & Form */}
            <div className="mt-6 pt-4 border-t border-slate-100 pl-4">
              {!isAddingActivity ? (
                <button
                  onClick={() => {
                    setIsAddingActivity(true);
                    setNewActTime("10:00 AM");
                  }}
                  className="w-full py-3 border-2 border-dashed border-slate-200 hover:border-indigo-500 text-slate-500 hover:text-indigo-600 rounded-2xl text-xs font-bold tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 bg-slate-50/20"
                >
                  <Plus className="w-4 h-4" /> Add Custom Activity to Schedule
                </button>
              ) : (
                <form onSubmit={handleAddNewActivity} className="bg-slate-50/50 p-5 border border-slate-200 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest font-mono">Create Custom Schedule Item</span>
                    <button 
                      type="button" 
                      onClick={() => setIsAddingActivity(false)}
                      className="text-slate-400 hover:text-slate-650 font-bold text-xs"
                    >
                      Close Form
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase font-mono">Time Slot (e.g. 09:00 AM - 11:30 AM)</label>
                      <input 
                        type="text" 
                        placeholder="e.g. 10:00 AM"
                        value={newActTime}
                        onChange={(e) => setNewActTime(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase font-mono">Operating Hours / Ticket Fee</label>
                      <input 
                        type="text" 
                        placeholder="e.g. 24 Hours / Free"
                        value={newActHours}
                        onChange={(e) => setNewActHours(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase font-mono">Activity/Food/Hotel Title</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Premium Ramen Lunch"
                        value={newActTitle}
                        onChange={(e) => setNewActTitle(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none text-slate-900"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase font-mono">Named Maps Search Location</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Shinjuku Golden Gai, Tokyo"
                        value={newActLocation}
                        onChange={(e) => setNewActLocation(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase font-mono">Estimated Local Cost Range</label>
                      <input 
                        type="text" 
                        placeholder="e.g. ¥1,500 - ¥3,000"
                        value={newActBudget}
                        onChange={(e) => setNewActBudget(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase font-mono">Schedule Label</label>
                      <select 
                        value={newActLabel}
                        onChange={(e) => setNewActLabel(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none"
                      >
                        <option value="Want-to-go">Want-to-go</option>
                        <option value="Flight">Flight</option>
                        <option value="Hotel">Hotel</option>
                        <option value="AI suggested">AI suggested</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase font-mono">Short Description / Travel Tip</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Try their traditional spicy red broth. Highly recommended."
                      value={newActDesc}
                      onChange={(e) => setNewActDesc(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button 
                      type="button" 
                      onClick={() => setIsAddingActivity(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-605 rounded-xl text-xs font-semibold transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="px-4 py-2 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Add to Timeline
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: MAPS IFRAME & RESERVATIONS TICKETS (4 Cols) */}
      <div className="lg:col-span-4 space-y-8">
        
        {/* Dynamic Map Component */}
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Interactive Map Focus</span>
            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 font-mono text-[9px] uppercase rounded">Keyless Embed</span>
          </div>

          <div className="w-full h-64 bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 relative shadow-inner">
            <iframe
              title="itinerary-map"
              width="100%"
              height="100%"
              frameBorder="0"
              src={`https://maps.google.com/maps?q=${encodeURIComponent(focusedLocation)}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
              allowFullScreen
              className="grayscale-[10%]"
            />
          </div>

          <p className="text-xs text-slate-400 font-medium text-center">
            Currently tracking: <strong className="text-indigo-600">{focusedLocation}</strong>
          </p>
        </div>

        {/* BOOKED FLIGHTS BOARDING PASSES INTERACTIVE */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Airport Boarding Passes ({ (trip.flights || []).length })</span>
            <button 
              type="button"
              onClick={() => setIsAddingFlight(!isAddingFlight)}
              className="px-2 py-1 text-[10px] bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg uppercase tracking-wider transition flex items-center gap-1 select-none cursor-pointer"
            >
              {isAddingFlight ? "Cancel" : <><Plus className="w-3 h-3" /> Add Pass</>}
            </button>
          </div>

          {isAddingFlight && (
            <form onSubmit={handleAddNewFlight} className="bg-slate-900 border border-indigo-500/30 text-white space-y-4 rounded-3xl p-5 shadow-lg text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-indigo-400 font-mono uppercase">🎫 Add Flight Ticket Card</span>
                <button type="button" onClick={() => setIsAddingFlight(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-450 uppercase mb-1 font-mono">Flight No</label>
                  <input 
                    type="text" 
                    placeholder="e.g. SQ638" 
                    value={newFlightNo} 
                    onChange={(e) => setNewFlightNo(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl outline-none text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-450 uppercase mb-1 font-mono">Type</label>
                  <select 
                    value={newFlightType} 
                    onChange={(e) => setNewFlightType(e.target.value as "depart" | "return")}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl outline-none text-slate-300"
                  >
                    <option value="depart">Outbound Departure</option>
                    <option value="return">Inbound Return</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-450 uppercase mb-1 font-mono">Origin Airport Code</label>
                  <input 
                    type="text" 
                    placeholder="e.g. SIN" 
                    value={newFlightDepAirport} 
                    onChange={(e) => setNewFlightDepAirport(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl outline-none text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-450 uppercase mb-1 font-mono">Dest Airport Code</label>
                  <input 
                    type="text" 
                    placeholder="e.g. NRT" 
                    value={newFlightArrAirport} 
                    onChange={(e) => setNewFlightArrAirport(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl outline-none text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-450 uppercase mb-1 font-mono">Departure Date/Time</label>
                  <input 
                    type="datetime-local" 
                    value={newFlightDepTime} 
                    onChange={(e) => setNewFlightDepTime(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl outline-none text-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-450 uppercase mb-1 font-mono">Arrival Date/Time</label>
                  <input 
                    type="datetime-local" 
                    value={newFlightArrTime} 
                    onChange={(e) => setNewFlightArrTime(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl outline-none text-slate-300"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={!newFlightNo.trim()}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Create Flight Voucher
              </button>
            </form>
          )}

          {(!trip.flights || trip.flights.length === 0) ? (
            <div className="bg-slate-50 border border-slate-200 border-dashed rounded-3xl p-6 text-center">
              <Plane className="w-8 h-8 text-slate-350 mx-auto stroke-[1.5]" />
              <p className="text-xs text-slate-500 font-bold mt-2">No Booked Flights Linked</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Add ticket passes above to enforce strict travel time limits on the AI itinerary.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {trip.flights.map((flight) => (
                <div key={flight.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
                  
                  {editingFlightId === flight.id ? (
                    <div className="space-y-3 text-xs bg-white text-slate-850">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                        <span className="font-bold text-slate-800 uppercase font-mono">Edit Flight: {flight.flightNo}</span>
                        <button type="button" onClick={() => setEditingFlightId(null)} className="text-slate-400 hover:text-slate-600">✕</button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 border-0">
                        <div>
                          <label className="block text-[10px] text-slate-500 uppercase font-mono">Flight No</label>
                          <input 
                            type="text" 
                            value={editFlightNo} 
                            onChange={(e) => setEditFlightNo(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 uppercase font-mono">Type</label>
                          <select 
                            value={editFlightType} 
                            onChange={(e) => setEditFlightType(e.target.value as "depart" | "return")}
                            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:border-indigo-500"
                          >
                            <option value="depart">Outbound Departure</option>
                            <option value="return">Inbound Return</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 border-0">
                        <div>
                          <label className="block text-[10px] text-slate-500 uppercase font-mono">Origin</label>
                          <input 
                            type="text" 
                            value={editFlightDepAirport} 
                            onChange={(e) => setEditFlightDepAirport(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 uppercase font-mono">Destination</label>
                          <input 
                            type="text" 
                            value={editFlightArrAirport} 
                            onChange={(e) => setEditFlightArrAirport(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 border-0">
                        <div>
                          <label className="block text-[10px] text-slate-500 uppercase font-mono">Depart Time</label>
                          <input 
                            type="datetime-local" 
                            value={editFlightDepTime} 
                            onChange={(e) => setEditFlightDepTime(e.target.value)}
                            className="w-full px-2 py-1 text-slate-800 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 uppercase font-mono">Arrive Time</label>
                          <input 
                            type="datetime-local" 
                            value={editFlightArrTime} 
                            onChange={(e) => setEditFlightArrTime(e.target.value)}
                            className="w-full px-2 py-1 text-slate-800 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 pt-1 border-0">
                        <button 
                          onClick={() => handleSaveFlightEdit(flight.id)}
                          className="flex-grow py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                        >
                          Save changes
                        </button>
                        <button 
                          onClick={() => handleRemoveFlight(flight.id)}
                          className="p-2 border border-slate-200 bg-white text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-800 bg-white border-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-bold font-mono text-slate-950 bg-slate-100 px-2.5 py-1 rounded-lg">
                          ✈️ {flight.flightNo}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider font-mono ${
                          flight.type === "depart" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-blue-50 text-blue-700 border border-blue-100"
                        }`}>
                          {flight.type === "depart" ? "Outbound" : "Return"}
                        </span>
                        <div className="flex items-center gap-1.5 font-bold font-mono text-slate-705">
                          <span>{flight.departureAirport}</span>
                          <span className="text-slate-400">➔</span>
                          <span>{flight.arrivalAirport}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 shrink-0">
                        <div className="text-left sm:text-right font-mono text-[10px] text-slate-500 whitespace-nowrap leading-relaxed animate-none">
                          <div><strong className="text-slate-700 font-semibold">DEP:</strong> {formatTime(flight.departureTime)}</div>
                          <div><strong className="text-slate-700 font-semibold">ARR:</strong> {formatTime(flight.arrivalTime)}</div>
                        </div>
                        
                        <button 
                          onClick={() => handleStartEditFlight(flight)}
                          className="p-1 text-slate-450 hover:text-indigo-650 hover:bg-slate-55 rounded-lg transition"
                          title="Edit Flight Entry"
                        >
                          ✎
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>


        {/* BOOKED HOTELS INFORMATION WITH ACTIVE EDITORS */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hotel Room Vouchers ({ (trip.hotels || []).length })</span>
            <button 
              type="button"
              onClick={() => setIsAddingHotel(!isAddingHotel)}
              className="px-2 py-1 text-[10px] bg-slate-950 hover:bg-slate-850 border border-slate-200 text-slate-800 font-bold rounded-lg uppercase tracking-wider transition flex items-center gap-1 select-none cursor-pointer"
            >
              {isAddingHotel ? "Cancel" : <><Plus className="w-3 h-3" /> Add Hotel</>}
            </button>
          </div>

          {isAddingHotel && (
            <form onSubmit={handleAddNewHotel} className="bg-white border border-indigo-400 space-y-4 rounded-3xl p-5 shadow-lg text-xs text-slate-800">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-xs font-bold text-indigo-700 font-mono uppercase">🏨 Link a Booking Stay</span>
                <button type="button" onClick={() => setIsAddingHotel(false)} className="text-slate-400 hover:text-slate-900">✕</button>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1">Hotel Title Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Kyoto Ryokan Anzu" 
                  value={newHotelName} 
                  onChange={(e) => setNewHotelName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1">Address / Location</label>
                <input 
                  type="text" 
                  placeholder="e.g. Shimogyo-ku, Kyoto, Japan" 
                  value={newHotelLocation} 
                  onChange={(e) => setNewHotelLocation(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-450 uppercase font-mono">Check-In</label>
                  <input 
                    type="datetime-local" 
                    value={newHotelCheckIn} 
                    onChange={(e) => setNewHotelCheckIn(e.target.value)}
                    className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-450 uppercase font-mono">Check-Out</label>
                  <input 
                    type="datetime-local" 
                    value={newHotelCheckOut} 
                    onChange={(e) => setNewHotelCheckOut(e.target.value)}
                    className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={!newHotelName.trim()}
                className="w-full py-2 bg-indigo-650 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Create Hotel Voucher
              </button>
            </form>
          )}

          {(!trip.hotels || trip.hotels.length === 0) ? (
            <div className="bg-slate-50 border border-slate-200 border-dashed rounded-3xl p-6 text-center">
              <Hotel className="w-8 h-8 text-slate-350 mx-auto stroke-[1.5]" />
              <p className="text-xs text-slate-500 font-bold mt-2">No Hotel Vouchers Linked</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Include a reservation stay above to bind itinerary stopovers instantly.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {trip.hotels.map((hotel) => (
                <div key={hotel.id} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col relative overflow-hidden">
                  
                  {editingHotelId === hotel.id ? (
                    <div className="space-y-3.5 text-xs text-slate-800">
                      <div className="flex justify-between items-center border-b pb-2">
                        <span className="font-bold text-indigo-700 uppercase font-mono">Edit Stay</span>
                        <button type="button" onClick={() => setEditingHotelId(null)} className="text-slate-400 hover:text-slate-900">✕</button>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase font-mono uppercase mb-0.5">Hotel Name</label>
                        <input 
                          type="text" 
                          value={editHotelName} 
                          onChange={(e) => setEditHotelName(e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase font-mono uppercase mb-0.5">Address</label>
                        <input 
                          type="text" 
                          value={editHotelLocation} 
                          onChange={(e) => setEditHotelLocation(e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-slate-400 uppercase font-mono">Check-In</label>
                          <input 
                            type="datetime-local" 
                            value={editHotelCheckIn} 
                            onChange={(e) => setEditHotelCheckIn(e.target.value)}
                            className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 uppercase font-mono">Check-Out</label>
                          <input 
                            type="datetime-local" 
                            value={editHotelCheckOut} 
                            onChange={(e) => setEditHotelCheckOut(e.target.value)}
                            className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleSaveHotelEdit(hotel.id)}
                          className="flex-grow py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition font-mono uppercase cursor-pointer"
                        >
                          Save stay
                        </button>
                        <button 
                          onClick={() => handleRemoveHotel(hotel.id)}
                          className="p-2 border border-slate-250 bg-white hover:bg-rose-50 text-rose-500 rounded-xl transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="border-l-4 border-slate-900 pl-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-slate-900">{hotel.name}</h4>
                          <button 
                            onClick={() => handleStartEditHotel(hotel)}
                            className="p-1 hover:bg-slate-50 text-slate-400 hover:text-indigo-600 rounded text-xs transition"
                            title="Edit Stay"
                          >
                            ✎
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono flex items-center mt-0.5 select-all">
                          📍 {hotel.locationUrl}
                        </p>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
                        <div>
                          <span className="block text-[9px] font-mono text-slate-400 uppercase">Check-In</span>
                          <span className="font-medium text-slate-800 mt-0.5 inline-block">{formatTime(hotel.checkIn)}</span>
                        </div>
                        <div>
                          <span className="block text-[9px] font-mono text-slate-400 uppercase">Check-Out</span>
                          <span className="font-medium text-slate-800 mt-0.5 inline-block">{formatTime(hotel.checkOut)}</span>
                        </div>
                      </div>

                      <div className="mt-4 p-2.5 bg-slate-50 rounded-xl flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-medium">Status: Reservation Active</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>


        {/* WANT TO GO WISHLIST PANEL */}
        <div className="bg-white border border-slate-250 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-indigo-650" />
              <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-widest">Places I Want to Go ({ (trip.wantToGoPlaces || []).length })</h4>
            </div>
            { (trip.wantToGoPlaces || []).length > 0 && (
              <span className="text-[9px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-mono font-bold">Wishlist</span>
            )}
          </div>

          <p className="text-[11px] text-slate-400 leading-normal">
            List down attractions. Click the suggested Day badge to instantly insert it, choose an options dropdown, or let AI recheck boundaries and suggest paths.
          </p>

          <form onSubmit={handleAddWishlistPlace} className="flex gap-1.5">
            <input 
              type="text" 
              placeholder="e.g. Meiji Jingu Shrine..."
              value={newWishlistInput}
              onChange={(e) => setNewWishlistInput(e.target.value)}
              className="flex-grow px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl outline-none"
            />
            <button 
              type="submit" 
              className="px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shrink-0 cursor-pointer"
            >
              Add
            </button>
          </form>

          {/* WARNING BANNER FOR DUPLICATE ACTIVITY DETECTED IN SCHEDULE */}
          {wishlistAlert && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-1.5 text-[11px] text-amber-900 font-medium animate-fade-in">
              <span className="text-amber-500">⚠️</span>
              <div>{wishlistAlert}</div>
            </div>
          )}

          {(!trip.wantToGoPlaces || trip.wantToGoPlaces.length === 0) ? (
            <p className="text-xs text-slate-400 italic py-1 text-center">No wishlist locations saved. Type above!</p>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto scrollbar-thin">
              {trip.wantToGoPlaces.map((place, i) => {
                const scheduledDay = getScheduledDayOfPlace(place, trip.itinerary);
                const rec = getAISuggestedDayForPlace(place, trip.itinerary);
                
                return (
                  <div key={i} className="flex flex-col p-3 bg-slate-50 border border-slate-150 rounded-2xl transition gap-2 group hover:border-slate-300">
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="truncate flex-1">
                        <span className="text-xs font-semibold text-slate-800 block truncate" title={place}>{place}</span>
                        
                        {scheduledDay !== null ? (
                          <span className="inline-flex mt-1 items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100 uppercase tracking-wide">
                            ✓ Added to Day {scheduledDay}
                          </span>
                        ) : (
                          <span className="inline-block mt-0.5 text-[10px] text-indigo-650 font-medium">
                            ✨ AI Suggests: <strong className="font-bold underline text-indigo-700">Day {rec.suggestedDayIdx}</strong> ({rec.reason})
                          </span>
                        )}
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => handleRemoveWishlistPlace(place)}
                        className="p-1 hover:bg-rose-50 border border-slate-200/50 rounded-lg text-slate-400 hover:text-rose-600 transition shrink-0 cursor-pointer"
                        title="Remove from wishlist"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {scheduledDay === null && (
                      <div className="flex flex-wrap items-center gap-1.5 justify-between pt-1.5 border-t border-slate-100">
                        <span className="text-[9px] text-slate-400 font-bold uppercase font-mono">Add to day:</span>
                        <div className="flex gap-1 items-center">
                          <button
                            type="button"
                            onClick={() => handleInsertPlaceToDay(place, rec.suggestedDayIdx)}
                            className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 hover:border-indigo-600 rounded-md text-[10px] font-bold transition flex items-center gap-0.5 cursor-pointer"
                          >
                            Add Day {rec.suggestedDayIdx}
                          </button>
                          
                          <select
                            onChange={(e) => {
                              const dVal = parseInt(e.target.value);
                              if (!isNaN(dVal)) {
                                handleInsertPlaceToDay(place, dVal);
                              }
                              e.target.value = ""; // reset dropdown selection
                            }}
                            defaultValue=""
                            className="px-1.5 py-0.5 text-[10px] bg-white border border-slate-250 hover:border-slate-350 rounded-md text-slate-500 font-medium cursor-pointer focus:outline-none"
                          >
                            <option value="" disabled>Choose...</option>
                            {trip.itinerary?.map(d => (
                              <option key={d.dayIndex} value={d.dayIndex}>Day {d.dayIndex}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>


      </div>
    </div>
  );
}
