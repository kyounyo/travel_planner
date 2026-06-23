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

const POPULAR_COUNTRIES = [
  { name: "South Africa", currency: "ZAR", flag: "🇿🇦" },
  { name: "Singapore", currency: "SGD", flag: "🇸🇬" },
  { name: "Malaysia", currency: "MYR", flag: "🇲🇾" },
  { name: "Nigeria", currency: "NGN", flag: "🇳🇬" },
  { name: "United States", currency: "USD", flag: "🇺🇸" },
  { name: "Japan", currency: "JPY", flag: "🇯🇵" },
  { name: "United Kingdom", currency: "GBP", flag: "🇬🇧" },
  { name: "Egypt", currency: "EGP", flag: "🇪🇬" },
  { name: "Kenya", currency: "KES", flag: "🇰🇪" },
  { name: "Australia", currency: "AUD", flag: "🇦🇺" },
  { name: "Canada", currency: "CAD", flag: "🇨🇦" },
  { name: "China", currency: "CNY", flag: "🇨🇳" },
  { name: "South Korea", currency: "KRW", flag: "🇰🇷" },
  { name: "Thailand", currency: "THB", flag: "🇹🇭" },
  { name: "Indonesia", currency: "IDR", flag: "🇮🇩" },
  { name: "India", currency: "INR", flag: "🇮🇳" },
  { name: "Philippines", currency: "PHP", flag: "🇵🇭" },
  { name: "Hong Kong", currency: "HKD", flag: "🇭🇰" },
  { name: "Taiwan", currency: "TWD", flag: "🇹🇼" },
  { name: "New Zealand", currency: "NZD", flag: "🇳🇿" },
  { name: "Morocco", currency: "MAD", flag: "🇲🇦" },
  { name: "Ghana", currency: "GHS", flag: "🇬🇭" },
  { name: "Switzerland", currency: "CHF", flag: "🇨🇭" },
  { name: "Germany", currency: "EUR", flag: "🇩🇪" },
  { name: "France", currency: "EUR", flag: "🇫🇷" },
  { name: "Italy", currency: "EUR", flag: "🇮🇹" },
  { name: "Spain", currency: "EUR", flag: "🇪🇸" },
  { name: "United Arab Emirates", currency: "AED", flag: "🇦🇪" },
  { name: "Saudi Arabia", currency: "SAR", flag: "🇸🇦" }
];

const AIRPORT_MAP: Record<string, { code: string, name: string }[]> = {
  "south africa": [
    { code: "CPT", name: "Cape Town International Airport" },
    { code: "JNB", name: "O.R. Tambo International Airport, Johannesburg" }
  ],
  "johannesburg": [{ code: "JNB", name: "O.R. Tambo International Airport" }],
  "cape town": [{ code: "CPT", name: "Cape Town International Airport" }],
  "singapore": [{ code: "SIN", name: "Singapore Changi Airport" }],
  "malaysia": [
    { code: "KUL", name: "Kuala Lumpur International Airport" },
    { code: "BKI", name: "Kota Kinabalu International Airport" }
  ],
  "kuala lumpur": [{ code: "KUL", name: "Kuala Lumpur International Airport" }],
  "nigeria": [
    { code: "LOS", name: "Murtala Muhammed International Airport, Lagos" },
    { code: "ABV", name: "Nnamdi Azikiwe International Airport, Abuja" }
  ],
  "lagos": [{ code: "LOS", name: "Murtala Muhammed International Airport" }],
  "abuja": [{ code: "ABV", name: "Nnamdi Azikiwe International Airport" }],
  "united states": [
    { code: "JFK", name: "John F. Kennedy International Airport, New York" },
    { code: "LAX", name: "Los Angeles International Airport" },
    { code: "SFO", name: "San Francisco International Airport" },
    { code: "ORD", name: "O'Hare International Airport, Chicago" }
  ],
  "los angeles": [{ code: "LAX", name: "Los Angeles International Airport" }],
  "san francisco": [{ code: "SFO", name: "San Francisco International Airport" }],
  "new york": [
    { code: "JFK", name: "John F. Kennedy International Airport" },
    { code: "LGA", name: "LaGuardia Airport" },
    { code: "EWR", name: "Newark Liberty International Airport" }
  ],
  "japan": [
    { code: "NRT", name: "Tokyo Narita International Airport" },
    { code: "HND", name: "Tokyo Haneda Airport" },
    { code: "KIX", name: "Osaka Kansai International Airport" }
  ],
  "tokyo": [
    { code: "NRT", name: "Tokyo Narita International Airport" },
    { code: "HND", name: "Tokyo Haneda Airport" }
  ],
  "osaka": [{ code: "KIX", name: "Osaka Kansai International Airport" }],
  "united kingdom": [
    { code: "LHR", name: "London Heathrow Airport" },
    { code: "LGW", name: "London Gatwick Airport" },
    { code: "MAN", name: "Manchester Airport" }
  ],
  "london": [
    { code: "LHR", name: "London Heathrow Airport" },
    { code: "LGW", name: "London Gatwick Airport" }
  ],
  "egypt": [
    { code: "CAI", name: "Cairo International Airport" },
    { code: "HRG", name: "Hurghada International Airport" }
  ],
  "cairo": [{ code: "CAI", name: "Cairo International Airport" }],
  "kenya": [
    { code: "NBO", name: "Jomo Kenyatta International Airport, Nairobi" },
    { code: "MBA", name: "Moi International Airport, Mombasa" }
  ],
  "nairobi": [{ code: "NBO", name: "Jomo Kenyatta International Airport" }],
  "australia": [
    { code: "SYD", name: "Sydney Kingsford Smith Airport" },
    { code: "MEL", name: "Melbourne Airport" },
    { code: "BNE", name: "Brisbane Airport" }
  ],
  "sydney": [{ code: "SYD", name: "Sydney Kingsford Smith Airport" }],
  "melbourne": [{ code: "MEL", name: "Melbourne Airport" }],
  "brisbane": [{ code: "BNE", name: "Brisbane Airport" }],
  "canada": [
    { code: "YYZ", name: "Toronto Pearson International Airport" },
    { code: "YVR", name: "Vancouver International Airport" }
  ],
  "toronto": [{ code: "YYZ", name: "Toronto Pearson International Airport" }],
  "vancouver": [{ code: "YVR", name: "Vancouver International Airport" }],
  "china": [
    { code: "PEK", name: "Beijing Capital International Airport" },
    { code: "PVG", name: "Shanghai Pudong International Airport" },
    { code: "CAN", name: "Guangzhou Baiyun International Airport" }
  ],
  "beijing": [{ code: "PEK", name: "Beijing Capital International Airport" }],
  "shanghai": [{ code: "PVG", name: "Shanghai Pudong International Airport" }],
  "south korea": [
    { code: "ICN", name: "Seoul Incheon International Airport" },
    { code: "GMP", name: "Seoul Gimpo International Airport" }
  ],
  "seoul": [
    { code: "ICN", name: "Seoul Incheon International Airport" },
    { code: "GMP", name: "Seoul Gimpo International Airport" }
  ],
  "thailand": [
    { code: "BKK", name: "Bangkok Suvarnabhumi Airport" },
    { code: "DMK", name: "Bangkok Don Mueang International" },
    { code: "HKT", name: "Phuket International Airport" }
  ],
  "bangkok": [
    { code: "BKK", name: "Bangkok Suvarnabhumi Airport" },
    { code: "DMK", name: "Bangkok Don Mueang International" }
  ],
  "phuket": [{ code: "HKT", name: "Phuket International Airport" }],
  "indonesia": [
    { code: "CGK", name: "Jakarta Soekarno-Hatta International Airport" },
    { code: "DPS", name: "Bali Ngurah Rai International Airport" }
  ],
  "jakarta": [{ code: "CGK", name: "Jakarta Soekarno-Hatta International Airport" }],
  "bali": [{ code: "DPS", name: "Bali Ngurah Rai International Airport" }],
  "denpasar": [{ code: "DPS", name: "Bali Ngurah Rai International Airport" }],
  "india": [
    { code: "DEL", name: "Delhi Indira Gandhi International Airport" },
    { code: "BOM", name: "Mumbai Chhatrapati Shivaji Airport" }
  ],
  "delhi": [{ code: "DEL", name: "Delhi Indira Gandhi International Airport" }],
  "mumbai": [{ code: "BOM", name: "Mumbai Chhatrapati Shivaji Airport" }],
  "philippines": [
    { code: "MNL", name: "Manila Ninoy Aquino International Airport" },
    { code: "CEB", name: "Cebu Mactan International Airport" }
  ],
  "manila": [{ code: "MNL", name: "Manila Ninoy Aquino International Airport" }],
  "hong kong": [{ code: "HKG", name: "Hong Kong International Airport" }],
  "taiwan": [{ code: "TPE", name: "Taiwan Taoyuan International Airport" }],
  "taipei": [{ code: "TPE", name: "Taiwan Taoyuan International Airport" }],
  "new zealand": [
    { code: "AKL", name: "Auckland Airport" },
    { code: "CHC", name: "Christchurch International Airport" }
  ],
  "auckland": [{ code: "AKL", name: "Auckland Airport" }],
  "morocco": [
    { code: "CMN", name: "Mohammed V International Airport, Casablanca" },
    { code: "RAK", name: "Marrakesh Menara Airport" }
  ],
  "casablanca": [{ code: "CMN", name: "Mohammed V International Airport" }],
  "marrakesh": [{ code: "RAK", name: "Marrakesh Menara Airport" }],
  "ghana": [{ code: "ACC", name: "Kotoka International Airport, Accra" }],
  "accra": [{ code: "ACC", name: "Kotoka International Airport" }],
  "switzerland": [
    { code: "ZRH", name: "Zurich Airport" },
    { code: "GVA", name: "Geneva Airport" }
  ],
  "zurich": [{ code: "ZRH", name: "Zurich Airport" }],
  "germany": [
    { code: "FRA", name: "Frankfurt Airport" },
    { code: "MUC", name: "Munich Airport" }
  ],
  "frankfurt": [{ code: "FRA", name: "Frankfurt Airport" }],
  "munich": [{ code: "MUC", name: "Munich Airport" }],
  "france": [
    { code: "CDG", name: "Paris Charles de Gaulle Airport" },
    { code: "ORY", name: "Paris Orly Airport" }
  ],
  "paris": [
    { code: "CDG", name: "Paris Charles de Gaulle Airport" },
    { code: "ORY", name: "Paris Orly Airport" }
  ],
  "italy": [
    { code: "FCO", name: "Rome Fiumicino Airport" },
    { code: "MXP", name: "Milan Malpensa Airport" }
  ],
  "rome": [{ code: "FCO", name: "Rome Fiumicino Airport" }],
  "spain": [
    { code: "MAD", name: "Madrid-Barajas Airport" },
    { code: "BCN", name: "Barcelona-El Prat Airport" }
  ],
  "madrid": [{ code: "MAD", name: "Madrid-Barajas Airport" }],
  "barcelona": [{ code: "BCN", name: "Barcelona-El Prat Airport" }],
  "united arab emirates": [
    { code: "DXB", name: "Dubai International Airport" },
    { code: "AUH", name: "Abu Dhabi International Airport" }
  ],
  "dubai": [{ code: "DXB", name: "Dubai International Airport" }],
  "abu dhabi": [{ code: "AUH", name: "Abu Dhabi International Airport" }],
  "saudi arabia": [
    { code: "RUH", name: "King Khalid International Airport, Riyadh" },
    { code: "JED", name: "King Abdulaziz International Airport, Jeddah" }
  ],
  "riyadh": [{ code: "RUH", name: "King Khalid International Airport" }],
  "jeddah": [{ code: "JED", name: "King Abdulaziz International Airport" }],
  "vietnam": [
    { code: "HAN", name: "Noi Bai International Airport, Hanoi" },
    { code: "SGN", name: "Tan Son Nhat International Airport, Ho Chi Minh" }
  ],
  "hanoi": [{ code: "HAN", name: "Noi Bai International Airport" }],
  "ho chi minh": [{ code: "SGN", name: "Tan Son Nhat International Airport" }],
  "maldives": [{ code: "MLE", name: "Velana International Airport, Male" }],
  "male": [{ code: "MLE", name: "Velana International Airport, Male" }],
  "netherlands": [{ code: "AMS", name: "Amsterdam Airport Schiphol" }],
  "amsterdam": [{ code: "AMS", name: "Amsterdam Airport Schiphol" }]
};

const getTodayString = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

interface MustGoPlace {
  name: string;
  description: string;
}

const MUST_GO_DICT: Record<string, MustGoPlace[]> = {
  tokyo: [
    { name: "Shibuya Crossing", description: "The world's busiest pedestrian intersection, vibrant, neon-lit, and iconic." },
    { name: "Senso-ji Temple", description: "Tokyo's oldest and most iconic ancient Buddhist temple located in historical Asakusa." },
    { name: "Tokyo Skytree", description: "The tallest tower in Japan, presenting majestic 360-degree views of Tokyo." },
    { name: "Meiji Shrine", description: "A tranquil sanctuary set inside a magnificent forested park near Shibuya." },
    { name: "teamLab Planets", description: "A critically-acclaimed digital museum of interactive sensory light art installations." }
  ],
  kyoto: [
    { name: "Fushimi Inari Taisha", description: "Mountaintop shrine famous for its stunning path of thousands of scarlet torii gates." },
    { name: "Kinkaku-ji", description: "Kyoto's legendary Golden Pavilion, a Zen temple with the top two floors plated in gold leaf." },
    { name: "Arashiyama Bamboo Grove", description: "A dreamy pathway walking through towering, rustling emerald green stalks." },
    { name: "Gion District", description: "A beautifully preserved traditional entertainment district known for geisha heritage." }
  ],
  osaka: [
    { name: "Osaka Castle", description: "A historic 16th-century fortress and museum surrounded by thousands of cherry tree gardens." },
    { name: "Dotonbori", description: "Osaka's electric food street hub famous for spectacular billboards and street food." },
    { name: "Universal Studios Japan", description: "A world-renowned movie theme park featuring Super Nintendo World and Harry Potter." }
  ],
  manila: [
    { name: "Intramuros", description: "Historical walled Spanish enclave featuring Fort Santiago and colonial architecture." },
    { name: "Rizal Park", description: "An expansive evergreen national park dedicated to national hero Jose Rizal." },
    { name: "San Agustin Church", description: "The oldest stone baroque church in the Philippines, a UNESCO World Heritage site." },
    { name: "National Museum of Fine Arts", description: "Stunning galleries hosting historic Filipino masterpieces including Juan Luna's Spoliarium." }
  ],
  philippines: [
    { name: "Intramuros", description: "Spanish-era historic fortress city and cobblestone streets in Manila." },
    { name: "Rizal Park", description: "The iconic national park framing the history and heart of Manila." },
    { name: "San Agustin Church", description: "A historical UNESCO stone church boasting intricate, detailed baroque interiors." }
  ],
  singapore: [
    { name: "Gardens by the Bay", description: "An award-winning biodome featuring majestic Supertrees and a towering indoor waterfall." },
    { name: "Marina Bay Sands SkyPark", description: "The legendary architectural icon offering a suspended 360-degree sky deck overview." },
    { name: "Changi Jewel", description: "The incredible 40-meter tall indoor Rain Vortex fountain enveloped by lush botanical trails." }
  ],
  seoul: [
    { name: "Gyeongbokgung Palace", description: "The grandest main royal palace of the Joseon Dynasty, featuring the royal guard change walk." },
    { name: "N Seoul Tower", description: "A spectacular panoramic peak observatory on Mount Namsan, iconic for couples." },
    { name: "Bukchon Hanok Village", description: "A picturesque authentic village filled with hundred-year-old traditional Korean houses." }
  ],
  paris: [
    { name: "Eiffel Tower", description: "The legendary wrought-iron tower commanding Paris's scenic skyline." },
    { name: "Louvre Museum", description: "The world's grandest art capital, housing Leonardo da Vinci's Mona Lisa." },
    { name: "Arc de Triomphe", description: "An iconic monumental triumphal arch at the pinnacle of the elegant Champs-Élysées." }
  ],
  london: [
    { name: "British Museum", description: "World-famous museum showcasing millions of historical cultural artifacts from humanity." },
    { name: "London Eye", description: "The massive riverside landmark observation wheel with views over Big Ben." },
    { name: "Tower of London", description: "The medieval royal fortress holding a pristine array of royal crown jewels." }
  ],
  newyork: [
    { name: "Statue of Liberty", description: "The monumental colossal neoclassical sculpture representing freedom in New York Harbor." },
    { name: "Central Park", description: "An incredible 843-acre lush green park oasis within the core of Manhattan." },
    { name: "Times Square", description: "The stunningly lit, high-energy Broadway theater crossroad of Midtown." }
  ],
  rome: [
    { name: "Colosseum", description: "The massive historic Flavian amphitheater holding legends of gladiators." },
    { name: "Trevi Fountain", description: "An incredible 17th-century masterpiece of baroque water-sculpture design." },
    { name: "Vatican Museums", description: "The high assembly of galleries holding the gorgeous Sistine Chapel by Michelangelo." }
  ]
};

const getFutureDateString = (daysAhead: number) => {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const mapCountryToCurrency = (country: string): string => {
  const norm = (country || "").toLowerCase().trim();
  if (!norm) return "USD";
  
  const mapping: Record<string, string> = {
    "united states": "USD", "us": "USD", "usa": "USD", "america": "USD",
    "singapore": "SGD", "sg": "SGD", "sgp": "SGD",
    "malaysia": "MYR", "my": "MYR", "mys": "MYR",
    "japan": "JPY", "jp": "JPY", "jpn": "JPY", "tokyo": "JPY", "kyoto": "JPY", "osaka": "JPY",
    "united kingdom": "GBP", "uk": "GBP", "gb": "GBP", "england": "GBP", "london": "GBP",
    "australia": "AUD", "au": "AUD", "aus": "AUD", "sydney": "AUD", "melbourne": "AUD",
    "canada": "CAD", "ca": "CAD", "can": "CAD", "toronto": "CAD", "vancouver": "CAD",
    "china": "CNY", "cn": "CNY", "beijing": "CNY", "shanghai": "CNY",
    "south korea": "KRW", "korea": "KRW", "kr": "KRW", "seoul": "KRW",
    "thailand": "THB", "th": "THB", "bangkok": "THB", "phuket": "THB",
    "indonesia": "IDR", "id": "IDR", "jakarta": "IDR", "bali": "IDR",
    "india": "INR", "in": "INR", "delhi": "INR", "mumbai": "INR",
    "philippines": "PHP", "philippine": "PHP", "philipines": "PHP", "philiplhine": "PHP", "phlippines": "PHP", "ph": "PHP", "manila": "PHP",
    "hong kong": "HKD", "hk": "HKD", "hkg": "HKD",
    "taiwan": "TWD", "tw": "TWD", "taipei": "TWD",
    "new zealand": "NZD", "nz": "NZD", "auckland": "NZD",
    "switzerland": "CHF", "ch": "CHF", "swiss": "CHF", "zurich": "CHF",
    "united arab emirates": "AED", "uae": "AED", "dubai": "AED", "abu dhabi": "AED",
    "saudi arabia": "SAR", "sa": "SAR", "riyadh": "SAR",
    "south africa": "ZAR", "za": "ZAR", "johannesburg": "ZAR", "cape town": "ZAR",
    "nigeria": "NGN", "ng": "NGN", "lagos": "NGN",
    "egypt": "EGP", "eg": "EGP", "cairo": "EGP",
    "kenya": "KES", "ke": "KES", "nairobi": "KES",
    "morocco": "MAD", "ma": "MAD", "casablanca": "MAD", "marrakech": "MAD",
    "ghana": "GHS", "gh": "GHS", "accra": "GHS",
    "portugal": "EUR", "finland": "EUR", "ireland": "EUR", "paris": "EUR", "rome": "EUR"
  };

  if (mapping[norm]) return mapping[norm];

  const words = norm.split(/[\s,./()|-]+/);
  const sortedKeys = Object.keys(mapping).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (key.includes(" ")) {
      if (norm.includes(key)) return mapping[key];
    } else if (words.includes(key)) {
      return mapping[key];
    }
  }

  if (norm.includes("phil") || norm.includes("phli") || norm.includes("manila") || norm.includes("philipp")) {
    return "PHP";
  }
  if (norm.includes("sing") || norm.includes("merlion")) {
    return "SGD";
  }
  if (norm.includes("tokyo") || norm.includes("japan") || norm.includes("nrt") || norm.includes("hnd")) {
    return "JPY";
  }

  return "USD";
};

export default function TripCreator({ currentUserId, onTripCreated, isLoading }: TripCreatorProps) {
  // Main states - Start empty so user gets clean input flow
  const [destinations, setDestinations] = useState<string[]>([]);
  const [newDestInput, setNewDestInput] = useState("");
  const [startDate, setStartDate] = useState(getTodayString());
  const [endDate, setEndDate] = useState(getFutureDateString(5));
  const [homeCountry, setHomeCountry] = useState("");
  const [preferredCurrency, setPreferredCurrency] = useState("USD");
  const [showCountrySuggestions, setShowCountrySuggestions] = useState(false);

  // Booking states
  const [hasFlights, setHasFlights] = useState(false);
  const [flights, setFlights] = useState<FlightInfo[]>([
    {
      id: "f_1",
      type: "depart",
      flightNo: "",
      departureAirport: "",
      arrivalAirport: "",
      departureTime: `${getTodayString()}T11:55`,
      arrivalTime: `${getTodayString()}T17:15`
    },
    {
      id: "f_2",
      type: "return",
      flightNo: "",
      departureAirport: "",
      arrivalAirport: "",
      departureTime: `${getFutureDateString(5)}T11:10`,
      arrivalTime: `${getFutureDateString(5)}T17:30`
    }
  ]);

  const [hasHotels, setHasHotels] = useState(false);
  const [hotels, setHotels] = useState<HotelInfo[]>([
    {
      id: "h_1",
      name: "",
      locationUrl: "",
      checkIn: `${getTodayString()}T15:00`,
      checkOut: `${getFutureDateString(5)}T12:00`
    }
  ]);

  const [preferences, setPreferences] = useState("");
  const [wantToGoPlaces, setWantToGoPlaces] = useState<string[]>([]);
  const [newWantToGoInput, setNewWantToGoInput] = useState("");
  const [destinationStays, setDestinationStays] = useState<Record<string, { start: string; end: string }>>({});

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
    
    let queryVal = activeAirportSearch.field === "departureAirport" ? activeFlight.departureAirport : activeFlight.arrivalAirport;

    // Smart autofill suggestion query if they opened it empty
    if (!queryVal || queryVal.trim().length === 0) {
      if (activeFlight.type === "depart") {
        if (activeAirportSearch.field === "departureAirport") {
          queryVal = homeCountry || "SIN";
        } else {
          queryVal = destinations[0] || "Tokyo";
        }
      } else {
        if (activeAirportSearch.field === "departureAirport") {
          queryVal = destinations[destinations.length - 1] || destinations[0] || "Tokyo";
        } else {
          queryVal = homeCountry || "SIN";
        }
      }
    }

    if (!queryVal || queryVal.trim().length < 1) {
      setAirportSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingAirport(true);
      try {
        const res = await fetch("/api/suggest-airports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: queryVal.trim() })
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
    }, 200); // Faster bounce for quick reactive dropdowns

    return () => clearTimeout(timer);
  }, [activeAirportSearch, flights?.map(f => f.departureAirport + "_" + f.arrivalAirport).join(","), destinations.join("|"), homeCountry]);

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
    setFlights(prev => {
      const updated = prev.map(f => f.id === flightId ? { ...f, [field]: airportCode } : f);
      // Auto-mirror airports for standard 2-flight trips:
      if (updated.length === 2) {
        const f1 = updated[0];
        const f2 = updated[1];
        if (f1.id === flightId) {
          if (field === "departureAirport" && !f2.arrivalAirport) {
            f2.arrivalAirport = airportCode;
          } else if (field === "arrivalAirport" && !f2.departureAirport) {
            f2.departureAirport = airportCode;
          }
        } else if (f2.id === flightId) {
          if (field === "departureAirport" && !f1.arrivalAirport) {
            f1.arrivalAirport = airportCode;
          } else if (field === "arrivalAirport" && !f1.departureAirport) {
            f1.departureAirport = airportCode;
          }
        }
      }
      return updated;
    });
    setActiveAirportSearch(null);
    setAirportSuggestions([]);
  };

  const getMustGoSuggestions = () => {
    const list: { name: string; description: string; destination: string }[] = [];
    destinations.forEach(dest => {
      const norm = dest.toLowerCase().trim();
      for (const k of Object.keys(MUST_GO_DICT)) {
        const isFuzzyMatch = 
          norm === k || 
          norm.includes(k) || 
          k.includes(norm) ||
          (k.length >= 4 && norm.includes(k.substring(0, 4))) ||
          (norm.length >= 4 && k.includes(norm.substring(0, 4))) ||
          (k === "philippines" && (norm.includes("phil") || norm.includes("manila") || norm.includes("phli") || norm.includes("phili"))) ||
          (k === "singapore" && norm.includes("sing")) ||
          (k === "tokyo" && norm.includes("tok"));

        if (isFuzzyMatch) {
          MUST_GO_DICT[k].forEach(attr => {
            if (!list.some(item => item.name.toLowerCase() === attr.name.toLowerCase())) {
              list.push({ name: attr.name, description: attr.description, destination: dest });
            }
          });
        }
      }
    });
    return list;
  };

  const handleToggleMustGoSuggestion = (name: string) => {
    if (wantToGoPlaces.some(p => p.toLowerCase() === name.toLowerCase())) {
      setWantToGoPlaces(prev => prev.filter(p => p.toLowerCase() !== name.toLowerCase()));
    } else {
      setWantToGoPlaces(prev => [...prev, name]);
    }
  };

  const handleSelectWantToGoSuggestion = (suggestionName: string) => {
    if (!wantToGoPlaces.some(p => p.toLowerCase() === suggestionName.toLowerCase())) {
      setWantToGoPlaces([...wantToGoPlaces, suggestionName]);
    }
    setNewWantToGoInput("");
    setWantToGoSuggestions([]);
    setShowWantToGoDropdown(false);
  };

  // Keep destination stays up to date during multi-stop entries
  useEffect(() => {
    if (destinations.length > 0) {
      const parsedStart = new Date(startDate);
      const parsedEnd = new Date(endDate);
      if (!isNaN(parsedStart.getTime()) && !isNaN(parsedEnd.getTime())) {
        const totalNights = Math.max(1, Math.round((parsedEnd.getTime() - parsedStart.getTime()) / (1000 * 60 * 60 * 24)));
        const numDests = destinations.length;
        const nightsPerDest = Math.max(1, Math.floor(totalNights / numDests));

        setDestinationStays(prev => {
          const next = { ...prev };
          let changed = false;

          // Remove deleted destinations
          Object.keys(next).forEach(k => {
            if (!destinations.includes(k)) {
              delete next[k];
              changed = true;
            }
          });

          // Prepopulate default splits for any new destinations or off-limit ones
          destinations.forEach((dest, idx) => {
            const startDaysOffset = idx * nightsPerDest;
            const endDaysOffset = idx === numDests - 1 ? totalNights : (idx + 1) * nightsPerDest;

            const hotelStart = new Date(parsedStart);
            hotelStart.setDate(hotelStart.getDate() + startDaysOffset);

            const hotelEnd = new Date(parsedStart);
            hotelEnd.setDate(hotelEnd.getDate() + endDaysOffset);

            const hotelStartStr = hotelStart.toISOString().split("T")[0];
            const hotelEndStr = hotelEnd.toISOString().split("T")[0];

            if (!next[dest] || next[dest].start < startDate || next[dest].end > endDate || next[dest].start > next[dest].end) {
              next[dest] = { start: hotelStartStr, end: hotelEndStr };
              changed = true;
            }
          });

          return changed ? next : prev;
        });
      }
    } else {
      setDestinationStays({});
    }
  }, [destinations.join("|"), startDate, endDate]);

  useEffect(() => {
    if (destinations.length > 0) {
      const destCurrency = mapCountryToCurrency(destinations[0]);
      if (destCurrency) {
        setPreferredCurrency(destCurrency);
      }
    }
  }, [destinations.join("|")]);

  // Keep flight and hotel dates of existing bookings dynamically in sync with custom Stay dates / Trip dates
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

    if (destinations.length > 0) {
      setHotels(prev => {
        if (prev.length === 0) {
          return destinations.map((dest, idx) => {
            const stayDates = destinationStays[dest];
            const checkInDate = stayDates?.start || startDate;
            const checkOutDate = stayDates?.end || endDate;
            return {
              id: `h_${idx}_${Date.now()}`,
              name: "",
              locationUrl: dest,
              checkIn: `${checkInDate}T15:00`,
              checkOut: `${checkOutDate}T12:00`
            };
          });
        }

        // If there are existing hotels but some destinations don't have a hotel, append them
        const updated = [...prev];
        destinations.forEach((dest, idx) => {
          const hasHotel = updated.some(h => {
            const loc = (h.locationUrl || "").toLowerCase();
            const d = dest.toLowerCase();
            return loc.includes(d) || d.includes(loc);
          });
          if (!hasHotel && idx >= updated.length) {
            const stayDates = destinationStays[dest];
            const checkInDate = stayDates?.start || startDate;
            const checkOutDate = stayDates?.end || endDate;
            updated.push({
              id: `h_new_${idx}_${Date.now()}`,
              name: "",
              locationUrl: dest,
              checkIn: `${checkInDate}T15:00`,
              checkOut: `${checkOutDate}T12:00`
            });
          }
        });
        return updated;
      });
    } else {
      setHotels(prev => {
        const existing = prev[0];
        return [{
          id: existing?.id || "h_1",
          name: existing?.name || "",
          locationUrl: existing?.locationUrl || "",
          checkIn: `${startDate}T15:00`,
          checkOut: `${endDate}T12:00`
        }];
      });
    }
  }, [startDate, endDate, destinations.join("|"), destinationStays]);

  const getAirportRecommendationsForField = (flight: FlightInfo, field: "departureAirport" | "arrivalAirport") => {
    const list: { code: string; name: string; label: string; date?: string }[] = [];

    // Let's resolve what dates/stops map to this flight
    const flightDate = flight.departureTime ? flight.departureTime.split("T")[0] : null;

    // Helper to add safely
    const addAirportsForLoc = (loc: string, label: string, date?: string) => {
      const norm = loc.toLowerCase().trim();
      if (!norm) return;

      const parts = norm.split(/[\s,.-]+/).filter(Boolean);

      for (const key of Object.keys(AIRPORT_MAP)) {
        const isExactMatch = norm === key || norm.includes(key) || key.includes(norm);
        const isWordMatch = parts.some(p => p.length >= 3 && (key === p || key.includes(p)));

        if (isExactMatch || isWordMatch) {
          AIRPORT_MAP[key].forEach(a => {
            if (!list.some(item => item.code === a.code)) {
              list.push({ ...a, label, date });
            }
          });
        }
      }
    };

    // Let's analyze flight type & field
    if (flight.type === "depart") {
      if (field === "departureAirport") {
        if (homeCountry) {
          addAirportsForLoc(homeCountry, `Home (${homeCountry})`);
        } else {
          list.push({ code: "SIN", name: "Singapore Changi Airport", label: "Default Home Hub" });
        }
      } else {
        // Arrival for departures. Let's see stay dates!
        if (flightDate && destinations.length > 0) {
          let matched = false;
          destinations.forEach(dest => {
            const stay = destinationStays[dest];
            if (stay && flightDate >= stay.start && flightDate <= stay.end) {
              addAirportsForLoc(dest, `${dest} Stay`, `${stay.start} to ${stay.end}`);
              matched = true;
            }
          });
          if (!matched) {
            // First stop is default for arrival of departure flight
            const firstDest = destinations[0];
            if (firstDest) {
              const stay = destinationStays[firstDest];
              addAirportsForLoc(firstDest, `${firstDest} (First Stop)`, stay ? `${stay.start} to ${stay.end}` : undefined);
            }
          }
        } else if (destinations.length > 0) {
          const firstDest = destinations[0];
          const stay = destinationStays[firstDest];
          addAirportsForLoc(firstDest, `${firstDest} (First Stop)`, stay ? `${stay.start} to ${stay.end}` : undefined);
        }
      }
    } else {
      // return flights
      if (field === "departureAirport") {
        // Departing from last or active stop.
        if (flightDate && destinations.length > 0) {
          let matched = false;
          destinations.forEach(dest => {
            const stay = destinationStays[dest];
            if (stay && flightDate >= stay.start && flightDate <= stay.end) {
              addAirportsForLoc(dest, `${dest} Stay`, `${stay.start} to ${stay.end}`);
              matched = true;
            }
          });
          if (!matched) {
            const lastDest = destinations[destinations.length - 1] || destinations[0];
            if (lastDest) {
              const stay = destinationStays[lastDest];
              addAirportsForLoc(lastDest, `${lastDest} (Last Stop)`, stay ? `${stay.start} to ${stay.end}` : undefined);
            }
          }
        } else if (destinations.length > 0) {
          const lastDest = destinations[destinations.length - 1] || destinations[0];
          const stay = destinationStays[lastDest];
          addAirportsForLoc(lastDest, `${lastDest} (Last Stop)`, stay ? `${stay.start} to ${stay.end}` : undefined);
        }
      } else {
        // Arrival is homeCountry
        if (homeCountry) {
          addAirportsForLoc(homeCountry, `Home (${homeCountry})`);
        } else {
          list.push({ code: "SIN", name: "Singapore Changi Airport", label: "Default Home Hub" });
        }
      }
    }

    // Always include ALL itinerary destinations so they are easily accessible in the dropdown at all times!
    destinations.forEach(dest => {
      addAirportsForLoc(dest, `${dest}`);
    });

    if (homeCountry) {
      addAirportsForLoc(homeCountry, `Home (${homeCountry})`);
    }

    // Also filter the recommendations locally if they have typed something
    const typed = field === "departureAirport" ? flight.departureAirport : flight.arrivalAirport;
    if (typed && typed.trim().length > 0) {
      const q = typed.toLowerCase().trim();
      return list.filter(item => 
        item.code.toLowerCase().includes(q) || 
        item.name.toLowerCase().includes(q) || 
        item.label.toLowerCase().includes(q)
      ).slice(0, 25);
    }

    return list.slice(0, 25);
  };

  const handleStartDateChange = (newDate: string) => {
    setStartDate(newDate);
    if (endDate < newDate) {
      setEndDate(newDate);
    }
  };

  const handleUpdateDestinationStay = (dest: string, field: "start" | "end", value: string) => {
    const updatedStays = {
      ...destinationStays,
      [dest]: {
        ...(destinationStays[dest] || { start: startDate, end: endDate }),
        [field]: value
      }
    };
    
    // Ensure chronological safety per location
    const stay = updatedStays[dest];
    if (field === "start" && stay.end < value) {
      stay.end = value;
    } else if (field === "end" && stay.start > value) {
      stay.start = value;
    }
    
    setDestinationStays(updatedStays);

    // Compute min start and max end across all active destinations to expand or contract trip bounds
    let minStart = value;
    let maxEnd = value;
    
    destinations.forEach((d) => {
      const s = updatedStays[d];
      if (s) {
        if (s.start && s.start < minStart) minStart = s.start;
        if (s.end && s.end > maxEnd) maxEnd = s.end;
      }
    });

    setStartDate(minStart);
    if (maxEnd < minStart) {
      setEndDate(minStart);
    } else {
      setEndDate(maxEnd);
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
    setFlights(prev => {
      const updated = prev.map(f => f.id === id ? { ...f, [field]: value } : f);
      // Auto-mirror airports for standard 2-flight trips:
      if (updated.length === 2 && (field === "departureAirport" || field === "arrivalAirport")) {
        const f1 = updated[0];
        const f2 = updated[1];
        if (f1.id === id) {
          if (field === "departureAirport") {
            f2.arrivalAirport = value;
          } else if (field === "arrivalAirport") {
            f2.departureAirport = value;
          }
        } else if (f2.id === id) {
          if (field === "departureAirport") {
            f1.arrivalAirport = value;
          } else if (field === "arrivalAirport") {
            f1.departureAirport = value;
          }
        }
      }
      return updated;
    });
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
      destinationStays: destinationStays,
      startDate: startDate,
      endDate: endDate,
      flights: hasFlights ? flights : [],
      hotels: hasHotels ? hotels : [],
      preferences: preferences.trim(),
      wantToGoPlaces: wantToGoPlaces,
      displayCurrency: preferredCurrency,
      homeCountry: homeCountry,
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
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {destinations.length === 0 ? (
              <div className="text-xs text-amber-600 font-semibold bg-amber-50/70 border border-amber-100 rounded-xl px-4 py-2.5 w-full flex items-center gap-1.5 leading-relaxed">
                ⚠️ Type and press Enter/Select to define your destinations (e.g., Paris, Seoul, Bali).
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

        {/* Date Ranges (Only show for single or empty destinations to avoid clutter when multiple destinations are specified) */}
        {destinations.length < 2 && (
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
        )}

        {/* Destination Stays (Multi-stop stay intervals builder) */}
        {destinations.length >= 2 && (
          <div className="p-6 bg-indigo-50/40 border border-indigo-150 rounded-2xl space-y-4">
            <div className="flex items-start gap-2.5">
              <span className="text-lg">🗺️</span>
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-widest">
                  Stay Dates for each location
                </label>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                  Excellent! You have added <strong>{destinations.length} stops</strong>. Please specify when you will stay in each location. 
                  These custom intervals will automatically set your trip parameters, prefill your Accoms check-in/check-out, and help you plan Flights!
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {destinations.map((dest) => {
                const currentStay = destinationStays[dest] || { start: startDate, end: endDate };
                return (
                  <div key={dest} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-3xs hover:border-indigo-200 transition">
                    <h4 className="text-xs font-black text-slate-850 flex items-center gap-1.5 truncate">
                      <span className="text-sm">📍</span>
                      {dest}
                    </h4>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-wider font-mono">Stay From</label>
                        <input
                          type="date"
                          value={currentStay.start}
                          onChange={(e) => handleUpdateDestinationStay(dest, "start", e.target.value)}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:bg-white focus:border-indigo-600 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-wider font-mono">Stay To</label>
                        <input
                          type="date"
                          value={currentStay.end}
                          min={currentStay.start}
                          onChange={(e) => handleUpdateDestinationStay(dest, "end", e.target.value)}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:bg-white focus:border-indigo-600 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Home Country & Preferred Display Currency */}
        <div className="p-6 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-4">
          <div className="flex items-start gap-2.5">
            <span className="text-base mt-0.5">🏡</span>
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-widest">
                Home Country & Preferred Currency
              </label>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                Tell us where you are based. Type any country freely—our assistant will automatically preset your currency!
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-mono">
                My Home Country
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={homeCountry}
                  onFocus={() => setShowCountrySuggestions(true)}
                  onBlur={() => setTimeout(() => setShowCountrySuggestions(false), 200)}
                  onChange={(e) => {
                    const countryVal = e.target.value;
                    setHomeCountry(countryVal);
                    
                    // Smart helper to detect & map countries dynamically
                    const norm = countryVal.toLowerCase().trim();
                    const currencyMap: Record<string, string> = {
                      "united states": "USD", "us": "USD", "usa": "USD", "america": "USD",
                      "singapore": "SGD", "sg": "SGD", "sgp": "SGD",
                      "malaysia": "MYR", "my": "MYR", "mys": "MYR",
                      "japan": "JPY", "jp": "JPY", "jpn": "JPY", "tokyo": "JPY",
                      "united kingdom": "GBP", "uk": "GBP", "gb": "GBP", "england": "GBP", "london": "GBP",
                      "australia": "AUD", "au": "AUD", "aus": "AUD",
                      "canada": "CAD", "ca": "CAD", "can": "CAD",
                      "china": "CNY", "cn": "CNY", "beijing": "CNY",
                      "south korea": "KRW", "korea": "KRW", "kr": "KRW", "seoul": "KRW",
                      "thailand": "THB", "th": "THB", "bangkok": "THB",
                      "indonesia": "IDR", "id": "IDR", "jakarta": "IDR",
                      "india": "INR", "in": "INR", "delhi": "INR",
                      "philippines": "PHP", "ph": "PHP", "manila": "PHP",
                      "hong kong": "HKD", "hk": "HKD",
                      "taiwan": "TWD", "tw": "TWD",
                      "new zealand": "NZD", "nz": "NZD",
                      "switzerland": "CHF", "ch": "CHF", "swiss": "CHF",
                      "south africa": "ZAR", "za": "ZAR", "johannesburg": "ZAR", "cape town": "ZAR",
                      "nigeria": "NGN", "ng": "NGN", "lagos": "NGN",
                      "egypt": "EGP", "eg": "EGP", "cairo": "EGP",
                      "kenya": "KES", "ke": "KES", "nairobi": "KES",
                      "morocco": "MAD", "ma": "MAD", "casablanca": "MAD",
                      "ghana": "GHS", "gh": "GHS", "accra": "GHS",
                      "germany": "EUR", "france": "EUR", "italy": "EUR", "spain": "EUR", 
                      "netherlands": "EUR", "belgium": "EUR", "austria": "EUR", "greece": "EUR", 
                      "portugal": "EUR", "finland": "EUR", "ireland": "EUR", "europe": "EUR"
                    };

                    // Search for a keyword match in our dictionary
                    for (const key of Object.keys(currencyMap)) {
                      if (norm === key || norm.includes(key)) {
                        setPreferredCurrency(currencyMap[key]);
                        break;
                      }
                    }
                  }}
                  placeholder="e.g. Singapore, Japan, France, etc..."
                  className="w-full px-4 py-2.5 bg-white text-slate-800 text-sm border border-slate-200 focus:border-indigo-600 rounded-xl transition outline-none"
                />

                {showCountrySuggestions && (
                  <div className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg divide-y divide-slate-100">
                    <div className="px-3.5 py-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                      {homeCountry.trim() === "" ? "⭐️ Popular Hubs" : "Matches"}
                    </div>
                    {POPULAR_COUNTRIES.filter((c) => {
                      if (homeCountry.trim() === "") return true;
                      return (
                        c.name.toLowerCase().includes(homeCountry.toLowerCase()) ||
                        c.currency.toLowerCase().includes(homeCountry.toLowerCase())
                      );
                    })
                      .slice(0, 8)
                      .map((match) => (
                        <div
                          key={match.name}
                          onMouseDown={() => {
                            setHomeCountry(match.name);
                            setPreferredCurrency(match.currency);
                            setShowCountrySuggestions(false);
                          }}
                          className="flex items-center justify-between px-3.5 py-2.5 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer transition"
                        >
                          <div className="flex items-center gap-2">
                            <span>{match.flag}</span>
                            <span className="font-medium text-slate-800">{match.name}</span>
                          </div>
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded">
                            {match.currency}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-mono">
                Preferred Display Currency
              </label>
              <select
                value={preferredCurrency}
                onChange={(e) => setPreferredCurrency(e.target.value)}
                className="w-full px-4 py-2.5 bg-white text-slate-800 text-sm border border-slate-200 focus:border-indigo-600 rounded-xl transition font-semibold text-indigo-750 outline-none cursor-pointer"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="JPY">JPY (¥)</option>
                <option value="SGD">SGD (S$)</option>
                <option value="AUD">AUD (A$)</option>
                <option value="CAD">CAD (C$)</option>
                <option value="MYR">MYR (RM)</option>
                <option value="CNY">CNY (¥)</option>
                <option value="KRW">KRW (₩)</option>
                <option value="THB">THB (฿)</option>
                <option value="IDR">IDR (Rp)</option>
                <option value="INR">INR (₹)</option>
                <option value="PHP">PHP (₱)</option>
                <option value="HKD">HKD (HK$)</option>
                <option value="TWD">TWD (NT$)</option>
                <option value="NZD">NZD (NZ$)</option>
                <option value="CHF">CHF (CHF)</option>
                <option value="AED">AED (AED)</option>
                <option value="SAR">SAR (SR)</option>
                <option value="ZAR">ZAR (R)</option>
                <option value="NGN">NGN (₦)</option>
                <option value="KES">KES (KSh)</option>
                <option value="EGP">EGP (E£)</option>
                <option value="MAD">MAD (DH)</option>
                <option value="GHS">GHS (GH₵)</option>
              </select>
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
              {flights.map((flight, idx) => {
                const recommendedDepartures = getAirportRecommendationsForField(flight, "departureAirport");
                const recommendedArrivals = getAirportRecommendationsForField(flight, "arrivalAirport");

                return (
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
                        {activeAirportSearch?.flightId === flight.id && activeAirportSearch?.field === "departureAirport" && (
                          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-64 overflow-y-auto divide-y divide-slate-100">
                            {recommendedDepartures.length > 0 && (
                              <div>
                                <div className="px-3 py-1.5 bg-slate-50 text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
                                  <span>💡 Route Recommendations</span>
                                  {flight.departureAirport.trim().length > 0 && (
                                    <span className="text-[8px] bg-indigo-50 text-indigo-600 px-1 rounded">Filtered</span>
                                  )}
                                </div>
                                {recommendedDepartures.map((rec, rIdx) => (
                                  <button
                                    key={`rec_dep_${rIdx}`}
                                    type="button"
                                    onMouseDown={() => handleSelectAirportSuggestion(flight.id, "departureAirport", rec.code)}
                                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between border-b border-slate-50/50 transition cursor-pointer"
                                  >
                                    <div className="truncate">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-extrabold text-[#4F46E5] font-mono">✈️ {rec.code}</span>
                                        <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">{rec.label}</span>
                                      </div>
                                      <div className="text-[9px] text-slate-500 truncate">{rec.name}</div>
                                    </div>
                                    {rec.date && (
                                      <span className="text-[8px] font-bold font-mono px-1 py-0.5 bg-indigo-50 text-indigo-600 rounded">
                                        {rec.date}
                                      </span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}

                            <div>
                              <div className="px-3 py-1.5 bg-slate-50 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                {isSearchingAirport ? "🔍 Sourcing airport data..." : "🔍 Search Results & Matches"}
                              </div>
                              {isSearchingAirport && (
                                <div className="flex items-center gap-2 px-3 py-2.5 text-[10px] text-slate-400 font-medium">
                                  <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />
                                  <span>Searching airports...</span>
                                </div>
                              )}
                              {!isSearchingAirport && airportSuggestions.length > 0 && (
                                <div className="divide-y divide-slate-100">
                                  {airportSuggestions.map((s, aIdx) => (
                                    <button
                                      key={`dep_api_${aIdx}`}
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
                              {!isSearchingAirport && airportSuggestions.length === 0 && recommendedDepartures.length === 0 && (
                                <div className="px-3 py-2.5 text-[10px] text-slate-400 italic">
                                  No airports matched. You can type any custom 3-letter code!
                                </div>
                              )}
                            </div>
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
                        {activeAirportSearch?.flightId === flight.id && activeAirportSearch?.field === "arrivalAirport" && (
                          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-64 overflow-y-auto divide-y divide-slate-100">
                            {recommendedArrivals.length > 0 && (
                              <div>
                                <div className="px-3 py-1.5 bg-slate-50 text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
                                  <span>💡 Route Recommendations</span>
                                  {flight.arrivalAirport.trim().length > 0 && (
                                    <span className="text-[8px] bg-indigo-50 text-indigo-600 px-1 rounded">Filtered</span>
                                  )}
                                </div>
                                {recommendedArrivals.map((rec, rIdx) => (
                                  <button
                                    key={`rec_arr_${rIdx}`}
                                    type="button"
                                    onMouseDown={() => handleSelectAirportSuggestion(flight.id, "arrivalAirport", rec.code)}
                                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between border-b border-slate-50/50 transition cursor-pointer"
                                  >
                                    <div className="truncate">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-extrabold text-[#4F46E5] font-mono">✈️ {rec.code}</span>
                                        <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">{rec.label}</span>
                                      </div>
                                      <div className="text-[9px] text-slate-500 truncate">{rec.name}</div>
                                    </div>
                                    {rec.date && (
                                      <span className="text-[8px] font-bold font-mono px-1 py-0.5 bg-indigo-50 text-indigo-600 rounded">
                                        {rec.date}
                                      </span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}

                            <div>
                              <div className="px-3 py-1.5 bg-slate-50 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                {isSearchingAirport ? "🔍 Sourcing airport data..." : "🔍 Search Results & Matches"}
                              </div>
                              {isSearchingAirport && (
                                <div className="flex items-center gap-2 px-3 py-2.5 text-[10px] text-slate-400 font-medium">
                                  <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />
                                  <span>Searching airports...</span>
                                </div>
                              )}
                              {!isSearchingAirport && airportSuggestions.length > 0 && (
                                <div className="divide-y divide-slate-100">
                                  {airportSuggestions.map((s, aIdx) => (
                                    <button
                                      key={`arr_api_${aIdx}`}
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
                              {!isSearchingAirport && airportSuggestions.length === 0 && recommendedArrivals.length === 0 && (
                                <div className="px-3 py-2.5 text-[10px] text-slate-400 italic">
                                  No airports matched. You can type any custom 3-letter code!
                                </div>
                              )}
                            </div>
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

                  {/* Stay dates helper for flight card */}
                  <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono mr-1">Quick-Fill:</span>
                    <button
                      type="button"
                      onClick={() => {
                        handleUpdateFlight(flight.id, "departureTime", `${startDate}T09:00`);
                        handleUpdateFlight(flight.id, "arrivalTime", `${startDate}T13:00`);
                      }}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold transition cursor-pointer"
                    >
                      Trip Start ({startDate})
                    </button>
                    
                    {destinations.map((dest) => {
                      const stay = destinationStays[dest];
                      if (!stay) return null;
                      return (
                        <React.Fragment key={dest}>
                          <button
                            type="button"
                            onClick={() => {
                              handleUpdateFlight(flight.id, "departureTime", `${stay.start}T11:00`);
                              handleUpdateFlight(flight.id, "arrivalTime", `${stay.start}T15:00`);
                            }}
                            className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[10px] font-semibold transition cursor-pointer"
                            title={`Set flight date to stay-start at ${dest}`}
                          >
                            📍 {dest} In ({stay.start})
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleUpdateFlight(flight.id, "departureTime", `${stay.end}T14:00`);
                              handleUpdateFlight(flight.id, "arrivalTime", `${stay.end}T18:00`);
                            }}
                            className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[10px] font-semibold transition cursor-pointer"
                            title={`Set flight date to stay-end at ${dest}`}
                          >
                            🏁 {dest} Out ({stay.end})
                          </button>
                        </React.Fragment>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => {
                        handleUpdateFlight(flight.id, "departureTime", `${endDate}T11:00`);
                        handleUpdateFlight(flight.id, "arrivalTime", `${endDate}T15:00`);
                      }}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold transition cursor-pointer"
                    >
                      Trip End ({endDate})
                    </button>
                  </div>
                </div>
              );
            })}

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
                          placeholder={destinations[idx] ? `Hotel in ${destinations[idx]}` : "e.g. Shinjuku Hotel, or Google Map URL..."}
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

                    {/* Quick Sync Hotel stay dates with Destinations or Trip */}
                    <div className="space-y-1 border-t border-slate-105 border-slate-100 pt-3">
                      <span className="block text-[10px] font-black text-slate-400 tracking-widest font-mono uppercase">
                        ⏰ Quick Sync Stay Dates:
                      </span>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            handleUpdateHotel(hotel.id, "checkIn", `${startDate}T15:00`);
                            handleUpdateHotel(hotel.id, "checkOut", `${endDate}T12:00`);
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-bold text-[10px] transition cursor-pointer"
                          title="Set hotel stay for full duration of trip"
                        >
                          Full Trip ({startDate} to {endDate})
                        </button>

                        {destinations.map((dest) => {
                          const stay = destinationStays[dest] || { start: startDate, end: endDate };
                          return (
                            <button
                              key={dest}
                              type="button"
                              onClick={() => {
                                handleUpdateHotel(hotel.id, "checkIn", `${stay.start}T15:00`);
                                handleUpdateHotel(hotel.id, "checkOut", `${stay.end}T12:00`);
                              }}
                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100/40 rounded font-bold text-[10px] transition cursor-pointer"
                              title={`Sync hotel to matching stay dates for ${dest}`}
                            >
                              Sync {dest} ({stay.start} to {stay.end})
                            </button>
                          );
                        })}
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

          {/* Curated click-to-choose must-go attractions depends on selected destinations */}
          {destinations.length > 0 && getMustGoSuggestions().length > 0 && (
            <div className="bg-slate-50/60 border border-slate-200/50 p-4.5 rounded-2xl space-y-3 max-w-xl">
              <div>
                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">
                  🌟 Highly Recommended Must-Go Spots
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Click on an attraction below to quick-add it to your planned wishlist bucket:
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                {getMustGoSuggestions().map((item, index) => {
                  const isAlreadyAdded = wantToGoPlaces.some(p => p.toLowerCase() === item.name.toLowerCase());
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleToggleMustGoSuggestion(item.name)}
                      className={`p-3 rounded-xl border text-left transition-all duration-150 flex flex-col justify-between gap-1.5 cursor-pointer relative overflow-hidden ${
                        isAlreadyAdded
                          ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                          : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/10"
                      }`}
                    >
                      <div className="flex items-start justify-between w-full gap-2">
                        <span className="font-bold text-xs leading-tight">{item.name}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase shrink-0 font-mono tracking-wider ${
                          isAlreadyAdded ? "bg-white/10 text-white" : "bg-indigo-50/80 text-indigo-700"
                        }`}>
                          {item.destination}
                        </span>
                      </div>
                      <p className={`text-[10px] leading-relaxed line-clamp-2 ${isAlreadyAdded ? "text-slate-350 text-slate-300" : "text-slate-450"}`}>
                        {item.description}
                      </p>
                      <span className={`text-[9px] font-black uppercase self-end flex items-center gap-1 mt-1 font-mono tracking-widest ${
                        isAlreadyAdded ? "text-indigo-300" : "text-slate-400"
                      }`}>
                        {isAlreadyAdded ? "✓ Added to Wishlist" : "+ Add to Wishlist"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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
