import React, { useState, useEffect } from "react";
import AuthScreen from "./components/AuthScreen";
import TripCreator from "./components/TripCreator";
import ItineraryDisplay from "./components/ItineraryDisplay";
import BudgetSummary from "./components/BudgetSummary";
import CopilotPanel from "./components/CopilotPanel";
import { UserProfile, Trip, ActivityRating } from "./types";
import { 
  Compass, LogOut, Plane, Sparkles, FolderOpen, LogIn, Heart, 
  MapPin, PlusCircle, ArrowLeft, Loader2, Calendar, DollarSign, Package, Trash2
} from "lucide-react";

const enforceFlightBoundariesClient = (itinerary: any[], flights: any[]): any[] => {
  if (!itinerary || !Array.isArray(itinerary) || itinerary.length === 0) {
    return itinerary;
  }
  if (!flights || !Array.isArray(flights) || flights.length === 0) {
    return itinerary;
  }

  const departFlight = flights.find(f => f.type === "depart");
  const returnFlight = flights.find(f => f.type === "return");

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
    const dayDateStr = day.date;
    if (!dayDateStr) return;

    // 1. Depart Flight Arrival check on matching date
    if (departFlight && departFlight.arrivalTime) {
      const flightArrivalDate = departFlight.arrivalTime.substring(0, 10);
      if (dayDateStr === flightArrivalDate) {
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

    // 2. Return Flight Departure check on matching date
    if (returnFlight && returnFlight.departureTime) {
      const flightReturnDate = returnFlight.departureTime.substring(0, 10);
      if (dayDateStr === flightReturnDate) {
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
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isReplanning, setIsReplanning] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const [replanError, setReplanError] = useState("");
  const [isCreatingNewTrip, setIsCreatingNewTrip] = useState(false);
  const [tripIdToConfirmDelete, setTripIdToConfirmDelete] = useState<string | null>(null);

  // Bookmark states
  const [favoritedActivities, setFavoritedActivities] = useState<string[]>([]);
  
  // Rating states (Feedback Loop)
  const [activityRatings, setActivityRatings] = useState<ActivityRating[]>([]);

  // Navigation tab for active trip
  const [activeTab, setActiveTab] = useState<"itinerary" | "budget" | "copilot">("itinerary");

  // Load User, Trips, Favs, and Ratings on boot
  useEffect(() => {
    const cachedUser = localStorage.getItem("travel_planner_curr_user");
    if (cachedUser) {
      try {
        const u = JSON.parse(cachedUser);
        setCurrentUser(u);
        loadUserTripsAndState(u.id);
      } catch (err) {
        console.error(err);
      }
    }
  }, []);

  const loadUserTripsAndState = (userId: string) => {
    // Load trips
    const cachedTrips = localStorage.getItem(`saved_trips_${userId}`);
    if (cachedTrips) {
      try {
        const parsed = JSON.parse(cachedTrips);
        setTrips(parsed);
        if (parsed.length > 0) {
          setSelectedTripId(parsed[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    }

    // Load favorites
    const cachedFavs = localStorage.getItem(`fav_activities_${userId}`);
    if (cachedFavs) {
      try {
        setFavoritedActivities(JSON.parse(cachedFavs));
      } catch {}
    }

    // Load ratings
    const cachedRatings = localStorage.getItem(`ratings_${userId}`);
    if (cachedRatings) {
      try {
        setActivityRatings(JSON.parse(cachedRatings));
      } catch {}
    }
  };

  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    loadUserTripsAndState(user.id);
  };

  const handleLogout = () => {
    localStorage.removeItem("travel_planner_curr_user");
    setCurrentUser(null);
    setTrips([]);
    setSelectedTripId(null);
    setFavoritedActivities([]);
    setActivityRatings([]);
  };

  // Generate completely new trip plan using Multi-Agent server route
  const handleCreateTrip = async (draftTrip: Trip) => {
    setIsGenerating(true);
    setGenerationError("");
    try {
      const res = await fetch("/api/plan-trip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destinations: draftTrip.destinations,
          startDate: draftTrip.startDate,
          endDate: draftTrip.endDate,
          flights: draftTrip.flights,
          hotels: draftTrip.hotels,
          preferences: draftTrip.preferences,
          wantToGoPlaces: draftTrip.wantToGoPlaces,
          feedbackRatings: activityRatings // Pass rated items to model for custom personalization!
        }),
      });

      if (!res.ok) {
        let errMsg = "Generation endpoint failed.";
        try {
          const errDetails = await res.json();
          errMsg = errDetails.error || errMsg;
        } catch {
          try {
            const rawBody = await res.text();
            if (rawBody && (rawBody.includes("<html") || rawBody.includes("503") || rawBody.includes("demand"))) {
              errMsg = "The AI Travel Agents are currently experiencing extremely high demand. We attempted a robust retry automatically, but the model is still temporarily busy. Please wait 5-10 seconds and try clicking 'Plan My Route' again.";
            } else if (rawBody && rawBody.length < 200) {
              errMsg = rawBody;
            }
          } catch {}
        }
        throw new Error(errMsg);
      }

      let completePlan;
      try {
        completePlan = await res.json();
      } catch (err) {
        throw new Error("The AI Travel Agents returned a busy signal. Please wait a few seconds and try clicking 'Plan My Route' again.");
      }

      const finalizedTrip: Trip = {
        ...draftTrip,
        itinerary: completePlan.itinerary,
        checklists: completePlan.checklists,
        budgetStats: completePlan.budgetStats,
        agentsFeedback: completePlan.agentsFeedback,
        usefulLinks: completePlan.usefulLinks,
        hasUserEdits: false,
      };

      const updatedTrips = [finalizedTrip, ...trips];
      setTrips(updatedTrips);
      if (currentUser) {
        localStorage.setItem(`saved_trips_${currentUser.id}`, JSON.stringify(updatedTrips));
      }
      setSelectedTripId(finalizedTrip.id);
      setActiveTab("itinerary");
      setIsCreatingNewTrip(false);

    } catch (err: any) {
      console.error(err);
      setGenerationError(err.message || "Failed to negotiate with AI Travel agents. Please check network.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Re-plan trip based on natural language inputs
  const handleUpdateTripEdits = async (customRequest: string) => {
    if (!selectedTripId || !currentUser) return;
    const currentTrip = trips.find(t => t.id === selectedTripId);
    if (!currentTrip) return;

    setIsReplanning(true);
    setReplanError("");
    try {
      const oldHistory = currentTrip.customEditsHistory || (currentTrip.customEdits ? [currentTrip.customEdits] : []);
      const updatedHistory = [...oldHistory, customRequest.trim()];
      const accumulatedEdits = updatedHistory.map((req, idx) => `${idx + 1}. ${req}`).join("\n");

      const res = await fetch("/api/plan-trip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destinations: currentTrip.destinations,
          startDate: currentTrip.startDate,
          endDate: currentTrip.endDate,
          flights: currentTrip.flights,
          hotels: currentTrip.hotels,
          preferences: currentTrip.preferences,
          wantToGoPlaces: currentTrip.wantToGoPlaces,
          customEdits: accumulatedEdits,
          feedbackRatings: activityRatings,
          itinerary: currentTrip.itinerary
        }),
      });

      if (!res.ok) {
        let errMsg = "Re-planning failed due to server error.";
        try {
          const errDetails = await res.json();
          errMsg = errDetails.error || errMsg;
        } catch {
          try {
            const rawBody = await res.text();
            if (rawBody && (rawBody.includes("<html") || rawBody.includes("503") || rawBody.includes("demand"))) {
              errMsg = "The AI Travel Agents are currently experiencing extremely high demand. We attempted a robust retry automatically, but the model is still temporarily busy. Please wait 5-10 seconds and try checking again shortly.";
            } else if (rawBody && rawBody.length < 200) {
              errMsg = rawBody;
            }
          } catch {}
        }
        throw new Error(errMsg);
      }

      let updatedPlan;
      try {
        updatedPlan = await res.json();
      } catch (err) {
        throw new Error("AI Travel Agents returned a busy signature. Please wait a few seconds and try updating again.");
      }

      const adjustedTrip: Trip = {
        ...currentTrip,
        customEdits: customRequest,
        customEditsHistory: updatedHistory,
        itinerary: updatedPlan.itinerary,
        checklists: updatedPlan.checklists,
        budgetStats: updatedPlan.budgetStats,
        agentsFeedback: updatedPlan.agentsFeedback,
        hasUserEdits: false,
      };

      const updatedTrips = trips.map(t => t.id === selectedTripId ? adjustedTrip : t);
      setTrips(updatedTrips);
      localStorage.setItem(`saved_trips_${currentUser.id}`, JSON.stringify(updatedTrips));

    } catch (err: any) {
      console.error("Re-planning error:", err);
      setReplanError(err.message || "Failed to customize trip schedule. please check network or try again.");
    } finally {
      setIsReplanning(false);
    }
  };

  // Toggle favorite attractions
  const handleToggleFavorite = (title: string) => {
    if (!currentUser) return;
    let updated;
    if (favoritedActivities.includes(title)) {
      updated = favoritedActivities.filter(item => item !== title);
    } else {
      updated = [...favoritedActivities, title];
    }
    setFavoritedActivities(updated);
    localStorage.setItem(`fav_activities_${currentUser.id}`, JSON.stringify(updated));
  };

  // Record feedback / ratings
  const handleRateActivity = (ratingItem: ActivityRating) => {
    if (!currentUser) return;
    const exists = activityRatings.find(r => r.title === ratingItem.title);
    let updated;
    if (exists) {
      updated = activityRatings.map(r => r.title === ratingItem.title ? ratingItem : r);
    } else {
      updated = [...activityRatings, ratingItem];
    }
    setActivityRatings(updated);
    localStorage.setItem(`ratings_${currentUser.id}`, JSON.stringify(updated));
  };

  // Directly update trip properties, itinerary, checklists and budget status
  const handleUpdateTrip = (updatedTrip: Trip) => {
    if (!currentUser) return;
    
    let finalTrip = { ...updatedTrip };
    
    const originalTrip = trips.find(t => t.id === finalTrip.id);
    if (originalTrip) {
      const changedItinerary = JSON.stringify(originalTrip.itinerary) !== JSON.stringify(finalTrip.itinerary);
      const changedFlights = JSON.stringify(originalTrip.flights) !== JSON.stringify(finalTrip.flights);
      const changedHotels = JSON.stringify(originalTrip.hotels) !== JSON.stringify(finalTrip.hotels);
      const changedChecklists = JSON.stringify(originalTrip.checklists) !== JSON.stringify(finalTrip.checklists);
      if (changedItinerary || changedFlights || changedHotels || changedChecklists) {
        finalTrip.hasUserEdits = true;
      }
    } else {
      finalTrip.hasUserEdits = true;
    }

    if (finalTrip.itinerary && finalTrip.flights) {
      finalTrip.itinerary = enforceFlightBoundariesClient(finalTrip.itinerary, finalTrip.flights);
    }

    const updatedTrips = trips.map(t => t.id === finalTrip.id ? finalTrip : t);
    setTrips(updatedTrips);
    localStorage.setItem(`saved_trips_${currentUser.id}`, JSON.stringify(updatedTrips));
  };

  // Delete a trip and clear its state/history
  const handleDeleteTrip = (tripId: string) => {
    if (!currentUser) return;
    
    const updatedTrips = trips.filter(t => t.id !== tripId);
    setTrips(updatedTrips);
    localStorage.setItem(`saved_trips_${currentUser.id}`, JSON.stringify(updatedTrips));
    if (selectedTripId === tripId) {
      setSelectedTripId(null);
    }
    setTripIdToConfirmDelete(null);
  };

  // Export trip itinerary as high-quality client-side .ics file
  const handleExportCalendar = () => {
    const activeTrip = trips.find(t => t.id === selectedTripId);
    if (!activeTrip || !activeTrip.itinerary) return;

    let icsLines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//AISTUDIO//AI Travel Planner v1.0//EN",
    ];

    activeTrip.itinerary.forEach((day, dIdx) => {
      day.activities.forEach((act, aIdx) => {
        // Compose dates safely or use current
        const eventDateStr = day.date.replace(/-/g, ""); // "20260620"
        
        // Simple mock hourly block to make google calendar look amazing
        const startHour = 9 + (aIdx * 3);
        const endHour = startHour + 2;
        
        const pad = (num: number) => num.toString().padStart(2, "0");
        
        const timestampStart = `${eventDateStr}T${pad(startHour)}0000Z`;
        const timestampEnd = `${eventDateStr}T${pad(endHour)}0000Z`;

        const desc = `${act.description}\\nOpening Hours: ${act.openingHours || 'N/A'}\\nBudget: ${act.budgetRange || 'N/A'}`;

        icsLines.push(
          "BEGIN:VEVENT",
          `UID:${act.id}@aitravelplanner`,
          `DTSTAMP:${eventDateStr}T090000Z`,
          `DTSTART:${timestampStart}`,
          `DTEND:${timestampEnd}`,
          `SUMMARY:${act.title}`,
          `LOCATION:${act.location}`,
          `DESCRIPTION:${desc}`,
          "END:VEVENT"
        );
      });
    });

    icsLines.push("END:VCALENDAR");

    const blob = new Blob([icsLines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${activeTrip.destinationName.replace(/\s+/g, '_')}_Itinerary.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddNewTripClick = () => {
    setSelectedTripId(null);
    setIsCreatingNewTrip(true);
  };

  const activeTrip = trips.find(t => t.id === selectedTripId);

  // Authenticate first
  if (!currentUser) {
    return <AuthScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-900">
      
      {/* GLOBAL NAVBAR */}
      <header className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between sticky top-0 z-40 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <Compass className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-slate-900">AI Travel Planner</h1>
            <p className="text-[10px] text-slate-400 font-mono">Specialized AI Co-pilot & Booking Manager</p>
          </div>
        </div>

        {/* User Info & logouts */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 p-1.5 px-3 bg-slate-50 rounded-xl border border-slate-200/55">
            <span className="text-sm">{currentUser.avatar}</span>
            <span className="text-xs font-semibold text-slate-700">{currentUser.username}</span>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 border border-slate-200/60 rounded-xl transition cursor-pointer text-slate-500"
            title="Log out session"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* CORE FRAMEWORK WORKSPACE */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-8">
        
        {/* Error notification banner */}
        {generationError && (
          <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl text-xs font-medium flex items-center gap-2">
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span>{generationError}</span>
          </div>
        )}

        {/* LOADING ANIMATION FOR NEW GENERATIONS */}
        {isGenerating ? (
          <div className="min-h-[500px] bg-white rounded-3xl border border-slate-100 shadow-xl p-8 flex flex-col items-center justify-center text-center space-y-6">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              <Sparkles className="w-8 h-8 text-indigo-500 absolute inset-0 m-auto animate-pulse" />
            </div>
            
            <div className="space-y-2 max-w-sm">
              <h2 className="text-base font-semibold text-slate-900">Assembling Your Bespoke Itinerary...</h2>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">Our planner, transport, and local food experts are coordinating coordinates, validating travel durations, and verifying attraction details with the Google Maps Platform.</p>
            </div>
          </div>
        ) : !selectedTripId ? (
          
          /* TRIP LIST VIEW & CREATION TRIGGER */
          <div className="space-y-8">
            
            {/* Quick Stats Panel */}
            {trips.length > 0 && !isCreatingNewTrip && (
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Your Travel Vault</h2>
                  <p className="text-xs text-slate-400 mt-1">Isolating {trips.length} custom designed agendas for {currentUser.username}</p>
                </div>
                <button
                  onClick={handleAddNewTripClick}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer transition flex items-center gap-1.5"
                >
                  <PlusCircle className="w-4 h-4 text-indigo-400" /> New Plan
                </button>
              </div>
            )}

            {/* List Trips Grid or Trip Creator */}
            {isCreatingNewTrip || trips.length === 0 ? (
              <div className="space-y-4">
                {trips.length > 0 && (
                  <div className="flex justify-start">
                    <button
                      onClick={() => setIsCreatingNewTrip(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition flex items-center gap-1.5"
                    >
                      ← Back to Vault
                    </button>
                  </div>
                )}
                <TripCreator 
                  currentUserId={currentUser.id} 
                  onTripCreated={handleCreateTrip} 
                  isLoading={isGenerating} 
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {trips.map((trip) => (
                  <div 
                    key={trip.id} 
                    onClick={() => {
                      if (tripIdToConfirmDelete === trip.id) return;
                      setSelectedTripId(trip.id);
                    }}
                    className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-xs hover:shadow-md hover:border-slate-300 transition-all cursor-pointer relative overflow-hidden group flex flex-col justify-between h-48"
                  >
                    {tripIdToConfirmDelete === trip.id && (
                      <div 
                        className="absolute inset-0 bg-slate-950/95 backdrop-blur-xs flex flex-col justify-between p-6 text-white z-20"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold tracking-tight text-rose-400 flex items-center gap-1.5 font-mono uppercase">
                            ⚠️ Delete Travel Plan?
                          </h4>
                          <p className="text-slate-300 text-[11px] leading-relaxed">
                            This cannot be undone. All custom itineraries and flights for <strong>{trip.destinationName}</strong> will be lost.
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDeleteTrip(trip.id)}
                            className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[11px] font-bold cursor-pointer transition text-center"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => setTripIdToConfirmDelete(null)}
                            className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[11px] font-bold cursor-pointer transition text-center"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase">
                          {trip.startDate} to {trip.endDate}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setTripIdToConfirmDelete(trip.id);
                          }}
                          title="Delete plan"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer relative z-10 animate-fade-in"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <h3 className="text-base font-semibold text-slate-900 mt-2 truncate">
                        {trip.destinationName}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {trip.preferences || "Custom scheduled holiday with flight/hotel tailored buffers."}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-indigo-600 mt-2">
                      <span>Interactive Dashboard</span>
                      <span className="text-slate-400 group-hover:translate-x-1 transition text-sm">→</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          
          /* ACTIVE TRIP INTERACTIVE COCKPIT */
          <div className="space-y-6">
            
            {/* Header / Trip Navigation Hub */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                <button
                  onClick={() => { setSelectedTripId(null); setIsCreatingNewTrip(false); }}
                  className="text-xs font-bold font-mono text-slate-400 hover:text-slate-900 flex items-center gap-1.5 mb-1 transition cursor-pointer"
                >
                  ← Travel Vault
                </button>
                <h2 className="text-xl font-bold tracking-tight text-slate-950">
                  {activeTrip?.destinationName}
                </h2>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {activeTrip?.startDate} to {activeTrip?.endDate}
                  </span>
                  {activeTrip?.flights && activeTrip.flights.length > 0 && (
                    <span className="text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded font-bold text-[10px] uppercase">
                      ✈️ Outbound & Return booked
                    </span>
                  )}
                  {activeTrip?.hotels && activeTrip.hotels.length > 0 && (
                    <span className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-bold text-[10px] uppercase">
                      🏨 Hotel cataloged
                    </span>
                  )}
                </div>
              </div>

              {/* Toolbar Control tabs */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/55 p-1 rounded-2xl self-start md:self-auto shrink-0">
                <button
                  onClick={() => setActiveTab("itinerary")}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition ${
                    activeTab === "itinerary"
                      ? "bg-white text-slate-950 shadow-xs border border-slate-200/50"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Itinerary
                </button>
                <button
                  onClick={() => setActiveTab("budget")}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition ${
                    activeTab === "budget"
                      ? "bg-white text-slate-950 shadow-xs border border-slate-200/50"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Budget auditing
                </button>
                <button
                  onClick={() => setActiveTab("copilot")}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition ${
                    activeTab === "copilot"
                      ? "bg-white text-slate-950 shadow-xs border border-slate-200/50"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Checklists & Chat
                </button>
              </div>
            </div>

            {/* DYNAMIC Tab rendering workspace */}
            <div className="transition-all duration-300">
              {activeTab === "itinerary" && activeTrip && (
                <ItineraryDisplay 
                  trip={activeTrip} 
                  favoritedActivities={favoritedActivities}
                  onToggleFavorite={handleToggleFavorite}
                  onRateActivity={handleRateActivity}
                  ratings={activityRatings}
                  onExportCalendar={handleExportCalendar}
                  onUpdateTripEdits={handleUpdateTripEdits}
                  isReplanning={isReplanning}
                  replanError={replanError}
                  onUpdateTrip={handleUpdateTrip}
                />
              )}

              {activeTab === "budget" && activeTrip && (
                <BudgetSummary 
                  trip={activeTrip} 
                  onUpdateTrip={handleUpdateTrip}
                />
              )}

              {activeTab === "copilot" && activeTrip && (
                <CopilotPanel 
                  trip={activeTrip} 
                  onUpdateTrip={handleUpdateTrip}
                />
              )}
            </div>
          </div>
        )}
      </main>

      {/* FOOTER CO-OP CREDIT */}
      <footer className="bg-white border-t border-slate-150 py-6 px-6 text-center text-slate-400 text-[10px] font-mono mt-auto">
        AI Travel Planner — Experience curated through high-precision Google Maps Routing & Gemini Intelligence.
      </footer>
    </div>
  );
}
