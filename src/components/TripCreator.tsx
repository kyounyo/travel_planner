import React, { useState, useEffect } from "react";
import { FlightInfo, HotelInfo, Trip } from "../types";
import { 
  Plus, Trash2, Calendar, Plane, Hotel, Navigation, Sparkles, MapPin, 
  ArrowRight, Search, Loader2, Info
} from "lucide-react";

interface TripCreatorProps {
  currentUserId: string;
  onTripCreated: (trip: Trip) => void;
  isLoading: boolean;
}

export default function TripCreator({ currentUserId, onTripCreated, isLoading }: TripCreatorProps) {
  // Main states - Start empty so user gets clean input flow
  const [destinations, setDestinations] = useState<string[]>([]);
  const [newDestInput, setNewDestInput] = useState("");
  const [startDate, setStartDate] = useState("2026-06-20");
  const [endDate, setEndDate] = useState("2026-06-25");

  // Booking states
  const [hasFlights, setHasFlights] = useState(false);
  const [flights, setFlights] = useState<FlightInfo[]>([
    {
      id: "f_1",
      type: "depart",
      flightNo: "",
      departureAirport: "",
      arrivalAirport: "",
      departureTime: "2026-06-20T11:55",
      arrivalTime: "2026-06-20T17:15"
    },
    {
      id: "f_2",
      type: "return",
      flightNo: "",
      departureAirport: "",
      arrivalAirport: "",
      departureTime: "2026-06-25T11:10",
      arrivalTime: "2026-06-25T17:30"
    }
  ]);

  const [hasHotels, setHasHotels] = useState(false);
  const [hotels, setHotels] = useState<HotelInfo[]>([
    {
      id: "h_1",
      name: "",
      locationUrl: "",
      checkIn: "2026-06-20T15:00",
      checkOut: "2026-06-25T12:00"
    }
  ]);

  const [preferences, setPreferences] = useState("");
  const [wantToGoPlaces, setWantToGoPlaces] = useState<string[]>([]);
  const [newWantToGoInput, setNewWantToGoInput] = useState("");

  // Destination Autocomplete State
  const [destSuggestions, setDestSuggestions] = useState<{ name: string }[]>([]);
  const [isSearchingDest, setIsSearchingDest] = useState(false);
  const [showDestDropdown, setShowDestDropdown] = useState(false);

  // Accommodation / Hotel Autocomplete State
  const [activeHotelSearchId, setActiveHotelSearchId] = useState<string | null>(null);
  const [hotelSuggestions, setHotelSuggestions] = useState<any[]>([]);
  const [isSearchingHotel, setIsSearchingHotel] = useState(false);

  // Airport Autocomplete State
  const [activeAirportSearch, setActiveAirportSearch] = useState<{ flightId: string; field: "departureAirport" | "arrivalAirport" } | null>(null);
  const [airportSuggestions, setAirportSuggestions] = useState<any[]>([]);
  const [isSearchingAirport, setIsSearchingAirport] = useState(false);

  // Places I Want to Go Autocomplete state
  const [showWantToGoDropdown, setShowWantToGoDropdown] = useState(false);
  const [wantToGoSuggestions, setWantToGoSuggestions] = useState<any[]>([]);
  const [isSearchingWantToGo, setIsSearchingWantToGo] = useState(false);

  // Debounced travel destination suggestions from Places / Gemini API
  useEffect(() => {
    if (newDestInput.trim().length < 2) {
      setDestSuggestions([]);
      setShowDestDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingDest(true);
      try {
        const res = await fetch("/api/suggest-destinations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: newDestInput.trim() })
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.suggestions) {
            setDestSuggestions(data.suggestions);
            setShowDestDropdown(data.suggestions.length > 0);
          }
        }
      } catch (err) {
        console.error("Error fetching destination suggestions:", err);
      } finally {
        setIsSearchingDest(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [newDestInput]);

  // Debounced hotel accommodation suggestions & details from Places / Gemini API
  useEffect(() => {
    if (!activeHotelSearchId) {
      setHotelSuggestions([]);
      return;
    }
    const activeHotel = hotels.find(h => h.id === activeHotelSearchId);
    if (!activeHotel || !activeHotel.name || activeHotel.name.trim().length < 2) {
      setHotelSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingHotel(true);
      try {
        const res = await fetch("/api/suggest-hotels", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            query: activeHotel.name.trim(),
            destination: destinations.join(" & ") || activeHotel.name
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.suggestions) {
            setHotelSuggestions(data.suggestions);
          }
        }
      } catch (err) {
        console.error("Error fetching hotel suggestions:", err);
      } finally {
        setIsSearchingHotel(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [activeHotelSearchId, hotels?.map(h => h.name).join(",")]);

  // Debounced airport suggestions
  useEffect(() => {
    if (!activeAirportSearch) {
      setAirportSuggestions([]);
      return;
    }
    const activeFlight = flights.find(f => f.id === activeAirportSearch.flightId);
    if (!activeFlight) return;
    const query = activeAirportSearch.field === "departureAirport" ? activeFlight.departureAirport : activeFlight.arrivalAirport;

    if (!query || query.trim().length < 1) {
      setAirportSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingAirport(true);
      try {
        const res = await fetch("/api/suggest-airports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: query.trim() })
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.suggestions) {
            setAirportSuggestions(data.suggestions);
          }
        }
      } catch (err) {
        console.error("Error fetching airport suggestions:", err);
      } finally {
        setIsSearchingAirport(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [activeAirportSearch, flights?.map(f => f.departureAirport + "_" + f.arrivalAirport).join(",")]);

  // Debounced attractions want-to-go suggestions
  useEffect(() => {
    if (newWantToGoInput.trim().length < 2) {
      setWantToGoSuggestions([]);
      setShowWantToGoDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingWantToGo(true);
      try {
        const res = await fetch("/api/suggest-attractions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            query: newWantToGoInput.trim(),
            destinations: destinations
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.suggestions) {
            setWantToGoSuggestions(data.suggestions);
            setShowWantToGoDropdown(data.suggestions.length > 0);
          }
        }
      } catch (err) {
        console.error("Error fetching attraction suggestions:", err);
      } finally {
        setIsSearchingWantToGo(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [newWantToGoInput, destinations?.join(",")]);

  const handleSelectAirportSuggestion = (flightId: string, field: "departureAirport" | "arrivalAirport", airportCode: string) => {
    setFlights(flights.map(f => f.id === flightId ? { ...f, [field]: airportCode } : f));
    setActiveAirportSearch(null);
    setAirportSuggestions([]);
  };

  const handleSelectWantToGoSuggestion = (suggestionName: string) => {
    if (!wantToGoPlaces.some(p => p.toLowerCase() === suggestionName.toLowerCase())) {
      setWantToGoPlaces([...wantToGoPlaces, suggestionName]);
    }
    setNewWantToGoInput("");
    setWantToGoSuggestions([]);
    setShowWantToGoDropdown(false);
  };

  // Keep flight and hotel dates of existing bookings dynamically in sync with main Trip dates
  useEffect(() => {
    setFlights(prev => prev.map(f => {
      if (f.type === "depart") {
        const timePart = f.departureTime && f.departureTime.includes("T") ? f.departureTime.split("T")[1] : "11:55";
        const arrTimePart = f.arrivalTime && f.arrivalTime.includes("T") ? f.arrivalTime.split("T")[1] : "17:15";
        return { 
          ...f, 
          departureTime: `${startDate}T${timePart}`, 
          arrivalTime: `${startDate}T${arrTimePart}` 
        };
      } else if (f.type === "return") {
        const timePart = f.departureTime && f.departureTime.includes("T") ? f.departureTime.split("T")[1] : "11:10";
        const arrTimePart = f.arrivalTime && f.arrivalTime.includes("T") ? f.arrivalTime.split("T")[1] : "17:30";
        return { 
          ...f, 
          departureTime: `${endDate}T${timePart}`, 
          arrivalTime: `${endDate}T${arrTimePart}` 
        };
      }
      return f;
    }));

    setHotels(prev => prev.map(h => {
      const checkInTime = h.checkIn && h.checkIn.includes("T") ? h.checkIn.split("T")[1] : "15:00";
      const checkOutTime = h.checkOut && h.checkOut.includes("T") ? h.checkOut.split("T")[1] : "12:00";
      return {
        ...h,
        checkIn: `${startDate}T${checkInTime}`,
        checkOut: `${endDate}T${checkOutTime}`
      };
    }));
  }, [startDate, endDate]);

  const handleStartDateChange = (newDate: string) => {
    setStartDate(newDate);
    if (endDate < newDate) {
      setEndDate(newDate);
    }
  };

  const handleSelectHotelSuggestion = (hotelId: string, suggestion: any) => {
    const defaultCheckIn = suggestion.checkIn || "15:00";
    const defaultCheckOut = suggestion.checkOut || "12:00";

    setHotels(hotels.map(h => h.id === hotelId ? {
      ...h,
      name: suggestion.name,
      locationUrl: suggestion.address || h.locationUrl || "",
      checkIn: `${startDate}T${defaultCheckIn}`,
      checkOut: `${endDate}T${defaultCheckOut}`
    } : h));
    setActiveHotelSearchId(null);
    setHotelSuggestions([]);
  };

  const handleAddWantToGo = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newWantToGoInput.trim();
    if (!clean) return;
    if (!wantToGoPlaces.some(p => p.toLowerCase() === clean.toLowerCase())) {
      setWantToGoPlaces([...wantToGoPlaces, clean]);
    }
    setNewWantToGoInput("");
  };

  const handleRemoveWantToGo = (place: string) => {
    setWantToGoPlaces(wantToGoPlaces.filter(p => p !== place));
  };

  // AI resolving state
  const [resolvingHotelId, setResolvingHotelId] = useState<string | null>(null);

  // Destinations Handlers
  const handleAddDestination = () => {
    if (newDestInput.trim() && !destinations.includes(newDestInput.trim())) {
      setDestinations([...destinations, newDestInput.trim()]);
      setNewDestInput("");
    }
  };

  const handleRemoveDestination = (index: number) => {
    setDestinations(destinations.filter((_, i) => i !== index));
  };

  // Flights Handlers
  const handleAddFlight = () => {
    const newFlight: FlightInfo = {
      id: "f_" + Date.now(),
      type: "depart",
      flightNo: "",
      departureAirport: "",
      arrivalAirport: "",
      departureTime: "",
      arrivalTime: ""
    };
    setFlights([...flights, newFlight]);
  };

  const handleRemoveFlight = (id: string) => {
    setFlights(flights.filter(f => f.id !== id));
  };

  const handleUpdateFlight = (id: string, field: keyof FlightInfo, value: string) => {
    setFlights(flights.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  // Hotels Handlers
  const handleAddHotel = () => {
    const newHotel: HotelInfo = {
      id: "h_" + Date.now(),
      name: "",
      locationUrl: "",
      checkIn: "",
      checkOut: ""
    };
    setHotels([...hotels, newHotel]);
  };

  const handleRemoveHotel = (id: string) => {
    setHotels(hotels.filter(h => h.id !== id));
  };

  const handleUpdateHotel = (id: string, field: keyof HotelInfo, value: string) => {
    setHotels(hotels.map(h => h.id === id ? { ...h, [field]: value } : h));
  };

  // Resolve raw pasted hotel URL or query with server Gemini AI
  const handleResolveHotelWithAI = async (id: string, rawInput: string) => {
    if (!rawInput.trim()) return;
    setResolvingHotelId(id);
    try {
      const res = await fetch("/api/resolve-hotel-map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotelInput: rawInput }),
      });
      if (res.ok) {
        const data = await res.json();
        setHotels(hotels.map(h => h.id === id ? {
          ...h,
          name: data.hotelName || h.name,
          locationUrl: data.formattedAddress || h.locationUrl,
          checkIn: data.checkInTime ? `${startDate}T15:00` : h.checkIn,
          checkOut: data.checkOutTime ? `${endDate}T11:00` : h.checkOut,
        } : h));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setResolvingHotelId(null);
    }
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalTrip: Trip = {
      id: "t_" + Date.now().toString(36),
      userId: currentUserId,
      destinationName: destinations.join(" & "),
      destinations: destinations,
      startDate: startDate,
      endDate: endDate,
      flights: hasFlights ? flights : [],
      hotels: hasHotels ? hotels : [],
      preferences: preferences.trim(),
      wantToGoPlaces: wantToGoPlaces,
      createdAt: new Date().toISOString()
    };

    onTripCreated(finalTrip);
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden">
      <div className="bg-slate-900 text-white px-8 py-8 relative">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Sparkles className="w-24 h-24 text-indigo-400" />
        </div>
        <h2 className="text-xl font-bold tracking-tight">Design Your Holiday</h2>
        <p className="text-xs text-slate-400 mt-1">Specify destination goals, flight times, and accommodations for precise schedule modeling</p>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-8">
        
        {/* Destination Multi-Stop Planner */}
        <div className="space-y-4">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
            Destinations (Add all stops)
          </label>
          <div className="flex gap-2 max-w-md relative z-10">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <MapPin className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Add landmark, city, or country..."
                value={newDestInput}
                onChange={(e) => {
                  setNewDestInput(e.target.value);
                  setShowDestDropdown(true);
                }}
                onFocus={() => setShowDestDropdown(true)}
                onBlur={() => {
                  setTimeout(() => setShowDestDropdown(false), 250);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddDestination();
                  }
                }}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 hover:bg-slate-100/50 focus:bg-white text-slate-800 text-sm border border-slate-200 focus:border-indigo-600 rounded-xl transition outline-none"
              />

              {/* Destination Dropdown */}
              {showDestDropdown && (newDestInput.trim().length >= 2 || isSearchingDest) && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto divide-y divide-slate-100">
                  {isSearchingDest && (
                    <div className="flex items-center gap-2 px-4 py-3 text-xs text-slate-400 font-medium">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                      <span>Sourcing matching destinations...</span>
                    </div>
                  )}
                  {!isSearchingDest && destSuggestions.length === 0 && (
                    <div className="px-4 py-3 text-xs text-slate-500 italic">
                      No matching list found. Press Enter to add manually.
                    </div>
                  )}
                  {destSuggestions.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onMouseDown={() => {
                        if (!destinations.includes(s.name)) {
                          setDestinations([...destinations, s.name]);
                        }
                        setNewDestInput("");
                        setShowDestDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-xs text-slate-700 font-medium flex items-center gap-2 transition"
                    >
                      <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span>{s.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleAddDestination}
              className="px-4 py-2 bg-[#F1F5F9] hover:bg-[#E2E8F0] border border-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-slate-500" /> Add Stop
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {destinations.length === 0 ? (
              <div className="text-xs text-amber-600 font-semibold bg-amber-50/70 border border-amber-100 rounded-xl px-4 py-2.5 w-full flex items-center gap-1.5 leading-relaxed">
                ⚠️ Click "Add Stop" above to define your destinations (e.g., Paris, Seoul, Bali).
              </div>
            ) : (
              destinations.map((dest, i) => (
                <span 
                  key={i} 
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F8FAFC] border border-slate-200 text-slate-800 rounded-lg text-xs font-semibold uppercase tracking-wider"
                >
                  <span>{dest}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveDestination(i)}
                    className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full p-0.5 transition cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </span>
              ))
            )}
          </div>
        </div>

        {/* Date Ranges */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
              Start Date
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Calendar className="w-4 h-4" />
              </span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 text-slate-800 text-sm border border-slate-200 focus:border-indigo-600 rounded-xl transition outline-none"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
              End Date
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Calendar className="w-4 h-4" />
              </span>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 text-slate-800 text-sm border border-slate-200 focus:border-indigo-600 rounded-xl transition outline-none"
                required
              />
            </div>
          </div>
        </div>

        {/* Flights Check System */}
        <div className="border border-slate-200 bg-[#F8FAFC] rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Plane className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Flight Information</h3>
                <p className="text-xs text-slate-400">Enter ticket numbers and timetables to tailor Day 1 & Day N arrival buffers</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={hasFlights}
                onChange={(e) => setHasFlights(e.target.checked)}
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              <span className="ml-2 text-xs font-bold text-slate-400 uppercase tracking-widest">Booked</span>
            </label>
          </div>

          {hasFlights && (
            <div className="space-y-4 pt-2">
              {flights.map((flight, idx) => (
                <div key={flight.id} className="relative bg-white border border-slate-200 rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                      Flight #{idx + 1} ({flight.type === 'depart' ? 'Outbound' : 'Return'})
                    </span>
                    <div className="flex items-center gap-2">
                      <select
                        value={flight.type}
                        onChange={(e) => handleUpdateFlight(flight.id, "type", e.target.value as any)}
                        className="text-xs px-2 py-1 bg-[#F8FAFC] rounded border border-slate-200 font-bold uppercase tracking-wider"
                      >
                        <option value="depart">Depart</option>
                        <option value="return">Return</option>
                      </select>
                      {flights.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveFlight(flight.id)}
                          className="text-rose-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <input
                        type="text"
                        placeholder="Flight Number (e.g. SQ638)"
                        value={flight.flightNo}
                        onChange={(e) => handleUpdateFlight(flight.id, "flightNo", e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 text-slate-800 text-xs border border-slate-200 rounded-lg focus:bg-white focus:border-indigo-600 outline-none"
                        required
                      />
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Departure Airport (e.g. SIN)"
                        value={flight.departureAirport}
                        onChange={(e) => {
                          handleUpdateFlight(flight.id, "departureAirport", e.target.value);
                          setActiveAirportSearch({ flightId: flight.id, field: "departureAirport" });
                        }}
                        onFocus={() => setActiveAirportSearch({ flightId: flight.id, field: "departureAirport" })}
                        onBlur={() => {
                          setTimeout(() => {
                            setActiveAirportSearch(prev => prev?.flightId === flight.id && prev?.field === "departureAirport" ? null : prev);
                          }, 300);
                        }}
                        className="w-full px-3 py-2 bg-slate-50 text-slate-800 text-xs border border-slate-200 rounded-lg focus:bg-white focus:border-indigo-600 outline-none"
                        required
                      />
                      {activeAirportSearch?.flightId === flight.id && activeAirportSearch?.field === "departureAirport" && (flight.departureAirport.trim().length > 0 || isSearchingAirport) && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto divide-y divide-slate-100">
                          {isSearchingAirport && (
                            <div className="flex items-center gap-2 px-3 py-2.5 text-[10px] text-slate-400 font-medium">
                              <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />
                              <span>Searching airports...</span>
                            </div>
                          )}
                          {!isSearchingAirport && airportSuggestions.length === 0 && (
                            <div className="px-3 py-2.5 text-[10px] text-slate-400 italic">
                              No matching airport found
                            </div>
                          )}
                          {airportSuggestions.map((s, aIdx) => (
                            <button
                              key={aIdx}
                              type="button"
                              onMouseDown={() => handleSelectAirportSuggestion(flight.id, "departureAirport", s.code)}
                              className="w-full text-left px-3 py-2 hover:bg-slate-50 text-xs text-slate-700 font-semibold cursor-pointer flex flex-col transition"
                            >
                              <span className="text-slate-900 font-bold">
                                ✈️ {s.code}
                              </span>
                              <span className="text-[9px] text-slate-400 truncate max-w-full">
                                {s.name}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Arrival Airport (e.g. NRT)"
                        value={flight.arrivalAirport}
                        onChange={(e) => {
                          handleUpdateFlight(flight.id, "arrivalAirport", e.target.value);
                          setActiveAirportSearch({ flightId: flight.id, field: "arrivalAirport" });
                        }}
                        onFocus={() => setActiveAirportSearch({ flightId: flight.id, field: "arrivalAirport" })}
                        onBlur={() => {
                          setTimeout(() => {
                            setActiveAirportSearch(prev => prev?.flightId === flight.id && prev?.field === "arrivalAirport" ? null : prev);
                          }, 300);
                        }}
                        className="w-full px-3 py-2 bg-slate-50 text-slate-800 text-xs border border-slate-200 rounded-lg focus:bg-white focus:border-indigo-600 outline-none"
                        required
                      />
                      {activeAirportSearch?.flightId === flight.id && activeAirportSearch?.field === "arrivalAirport" && (flight.arrivalAirport.trim().length > 0 || isSearchingAirport) && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto divide-y divide-slate-100">
                          {isSearchingAirport && (
                            <div className="flex items-center gap-2 px-3 py-2.5 text-[10px] text-slate-400 font-medium">
                              <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />
                              <span>Searching airports...</span>
                            </div>
                          )}
                          {!isSearchingAirport && airportSuggestions.length === 0 && (
                            <div className="px-3 py-2.5 text-[10px] text-slate-400 italic">
                              No matching airport found
                            </div>
                          )}
                          {airportSuggestions.map((s, aIdx) => (
                            <button
                              key={aIdx}
                              type="button"
                              onMouseDown={() => handleSelectAirportSuggestion(flight.id, "arrivalAirport", s.code)}
                              className="w-full text-left px-3 py-2 hover:bg-slate-50 text-xs text-slate-700 font-semibold cursor-pointer flex flex-col transition"
                            >
                              <span className="text-slate-900 font-bold">
                                ✈️ {s.code}
                              </span>
                              <span className="text-[9px] text-slate-400 truncate max-w-full">
                                {s.name}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1 font-mono uppercase tracking-wider">Depart Time</label>
                      <input
                        type="datetime-local"
                        value={flight.departureTime}
                        onChange={(e) => handleUpdateFlight(flight.id, "departureTime", e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 text-slate-800 border border-slate-200 rounded-lg focus:bg-white focus:border-indigo-600 outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1 font-mono uppercase tracking-wider">Arrive Time</label>
                      <input
                        type="datetime-local"
                        value={flight.arrivalTime}
                        onChange={(e) => handleUpdateFlight(flight.id, "arrivalTime", e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 text-slate-800 border border-slate-200 rounded-lg focus:bg-white focus:border-indigo-600 outline-none"
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddFlight}
                className="w-full py-2 bg-white hover:bg-[#F8FAFC] border border-dashed border-slate-200 hover:border-slate-300 rounded-xl text-xs text-indigo-650 font-bold uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Add Additional Leg
              </button>
            </div>
          )}
        </div>

        {/* Hotels Check System */}
        <div className="border border-slate-200 bg-[#F8FAFC] rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Hotel className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Accommodation / Hotel</h3>
                <p className="text-xs text-slate-400">Pasting location helps the Transport Agent calculate commutes from hotel lobby basecamp</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={hasHotels}
                onChange={(e) => setHasHotels(e.target.checked)}
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              <span className="ml-2 text-xs font-bold text-slate-400 uppercase tracking-widest">Booked</span>
            </label>
          </div>

          {hasHotels && (
            <div className="space-y-4 pt-2">
              {hotels.map((hotel, idx) => (
                <div key={hotel.id} className="relative bg-white border border-slate-200 rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                      Hotel #{idx + 1}
                    </span>
                    {hotels.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveHotel(hotel.id)}
                        className="text-rose-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1 font-mono uppercase tracking-wider">Hotel Name or paste Google Map Link </label>
                      <div className="flex gap-2 relative">
                        <input
                          type="text"
                          placeholder="e.g. Shinjuku Hotel, or Google Map URL..."
                          value={hotel.name}
                          onChange={(e) => {
                            handleUpdateHotel(hotel.id, "name", e.target.value);
                            setActiveHotelSearchId(hotel.id);
                          }}
                          onFocus={() => setActiveHotelSearchId(hotel.id)}
                          onBlur={() => {
                            setTimeout(() => {
                              setActiveHotelSearchId(prev => prev === hotel.id ? null : prev);
                            }, 300);
                          }}
                          className="w-full px-3 py-2 bg-slate-50 text-slate-800 text-xs border border-slate-200 rounded-lg focus:bg-white focus:border-indigo-600 outline-none"
                          required
                        />

                        {/* Floating Autocomplete for Active Hotel Input */}
                        {activeHotelSearchId === hotel.id && (hotel.name.trim().length >= 2 || isSearchingHotel) && (
                          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto divide-y divide-slate-100">
                            {isSearchingHotel && (
                              <div className="flex items-center gap-2 px-4 py-3 text-xs text-slate-400 font-medium">
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                                <span>Verifying hotel details...</span>
                              </div>
                            )}
                            {!isSearchingHotel && hotelSuggestions.length === 0 && (
                              <div className="px-4 py-3 text-xs text-slate-500 italic">
                                Sourcing matching hotels in destinations...
                              </div>
                            )}
                            {hotelSuggestions.map((s, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onMouseDown={() => handleSelectHotelSuggestion(hotel.id, s)}
                                className="w-full text-left px-4 py-3 hover:bg-slate-50 text-xs text-slate-700 font-semibold cursor-pointer flex flex-col gap-0.5 transition"
                              >
                                <span className="text-slate-900 font-bold flex items-center gap-1.5">
                                  <Hotel className="w-3.5 h-3.5 text-indigo-600" />
                                  {s.name}
                                </span>
                                {s.address && (
                                  <span className="text-[10px] text-slate-400 font-medium pl-5 truncate max-w-xs md:max-w-md">
                                    {s.address}
                                  </span>
                                )}
                                <span className="text-[9px] text-indigo-600 font-bold font-mono pl-5 uppercase flex gap-2 pt-0.5">
                                  <span>Check-in: {s.checkIn || "15:00"}</span>
                                  <span>Check-out: {s.checkOut || "12:00"}</span>
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1 font-mono uppercase tracking-wider">Details/Google Map Address</label>
                      <input
                        type="text"
                        placeholder="Google map query text..."
                        value={hotel.locationUrl}
                        onChange={(e) => handleUpdateHotel(hotel.id, "locationUrl", e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 text-slate-800 text-xs border border-slate-200 rounded-lg focus:bg-white focus:border-indigo-600 outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1 font-mono uppercase tracking-wider">Check-in Date/Time</label>
                        <input
                          type="datetime-local"
                          value={hotel.checkIn}
                          onChange={(e) => handleUpdateHotel(hotel.id, "checkIn", e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 text-slate-100/50 text-slate-800 border border-slate-200 rounded-lg focus:bg-white focus:border-indigo-600 outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1 font-mono uppercase tracking-wider">Check-out Date/Time</label>
                        <input
                          type="datetime-local"
                          value={hotel.checkOut}
                          onChange={(e) => handleUpdateHotel(hotel.id, "checkOut", e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 text-slate-800 border border-slate-200 rounded-lg focus:bg-white focus:border-indigo-600 outline-none"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddHotel}
                className="w-full py-2 bg-white hover:bg-[#F8FAFC] border border-dashed border-slate-200 hover:border-slate-350 rounded-xl text-xs text-indigo-650 font-bold uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Add Another Hotel
              </button>
            </div>
          )}
        </div>

        {/* Wishlist / Want to Go Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                📝 Places I Want to Go (Wishlist Bucket)
              </label>
              <p className="text-xs text-slate-400 mt-1">
                List the landmarks and experiences you most want to visit. The Multi-Agent Planner will fit them into the schedule automatically.
              </p>
            </div>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-bold font-mono">
              {wantToGoPlaces.length} Saved
            </span>
          </div>

          <div className="relative max-w-lg">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Museums, local food spots, landmarks..."
                value={newWantToGoInput}
                onChange={(e) => {
                  setNewWantToGoInput(e.target.value);
                  setShowWantToGoDropdown(true);
                }}
                onFocus={() => setShowWantToGoDropdown(true)}
                onBlur={() => {
                  setTimeout(() => {
                    setShowWantToGoDropdown(false);
                  }, 300);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddWantToGo(e);
                  }
                }}
                className="flex-1 px-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white text-slate-800 text-xs border border-slate-200 focus:border-indigo-650 rounded-xl transition outline-none"
              />
              <button
                type="button"
                onClick={(e) => handleAddWantToGo(e)}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer flex-shrink-0"
              >
                Add Place
              </button>
            </div>

            {/* Floating Autocomplete for Wishlist / Attractions */}
            {showWantToGoDropdown && (newWantToGoInput.trim().length >= 2 || isSearchingWantToGo) && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto divide-y divide-slate-100">
                {isSearchingWantToGo && (
                  <div className="flex items-center gap-2 px-4 py-3 text-xs text-slate-400 font-medium">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                    <span>Searching specific places...</span>
                  </div>
                )}
                {!isSearchingWantToGo && wantToGoSuggestions.length === 0 && (
                  <div className="px-4 py-3 text-xs text-slate-500 italic">
                    Type to match landmarks in destinations...
                  </div>
                )}
                {wantToGoSuggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onMouseDown={() => handleSelectWantToGoSuggestion(s.name)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 text-xs text-slate-700 font-semibold cursor-pointer flex flex-col gap-0.5 transition"
                  >
                    <span className="text-slate-900 font-bold flex items-center gap-1.5">
                      📍 {s.name}
                    </span>
                    {s.address && (
                      <span className="text-[10px] text-slate-400 pl-5 truncate">
                        {s.address}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {wantToGoPlaces.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-2">
              {wantToGoPlaces.map((place, idx) => (
                <div
                  key={idx}
                  className="bg-indigo-50 border border-indigo-150 pl-3.5 pr-2.5 py-1.5 rounded-full flex items-center gap-1.5 text-xs text-indigo-800 font-semibold shadow-xs"
                >
                  <span>{place}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveWantToGo(place)}
                    className="text-indigo-400 hover:text-indigo-700 transition cursor-pointer font-bold rounded-full w-4 h-4 flex items-center justify-center text-[10px]"
                    title="Remove from wishlist"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No custom places added to your wishlist bucket yet. Type above to add.</p>
          )}
        </div>

        {/* Notes & Special Needs Panel */}
        <div className="space-y-4">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
            Special Requirements & Preferences
          </label>
          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-start gap-2.5 text-xs text-indigo-850 mb-2">
            <Info className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
            <p className="leading-relaxed">
              Explain your desired schedule in natural language. For instance, write 
              <strong> "I want to visit Mt. Fuji on Day 4, spend Day 3 at Tokyo DisneySea, and prefer food joints that serve Halal/Veg Ramen."</strong> 
              Our agents will assemble it into existence.
            </p>
          </div>
          <textarea
            placeholder="e.g. Budget minded, focusing on photography landmarks, love sushi, avoid crowded markets..."
            value={preferences}
            onChange={(e) => setPreferences(e.target.value)}
            rows={4}
            className="w-full p-4 bg-slate-50 hover:bg-slate-100/50 focus:bg-white text-slate-800 text-sm border border-slate-200 focus:border-indigo-600 rounded-2xl transition outline-none resize-none placeholder:text-slate-400"
          />
        </div>

        {/* Submit */}
        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={isLoading || destinations.length === 0}
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-widest rounded-xl cursor-pointer disabled:opacity-50 transition active:scale-98 flex items-center gap-2 shadow-lg shadow-indigo-600/15"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-indigo-200" />
                Interrogating Agents...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-white" />
                Plan My Route
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
