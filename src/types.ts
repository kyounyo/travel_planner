export interface UserProfile {
  id: string;
  username: string;
  avatar: string; // url or placeholder emoji
}

export interface FlightInfo {
  id: string;
  type: "depart" | "return";
  flightNo: string;
  departureAirport: string;
  arrivalAirport: string;
  departureTime: string; // e.g. "2026-06-18T10:00"
  arrivalTime: string;   // e.g. "2026-06-18T17:00"
}

export interface HotelInfo {
  id: string;
  name: string;
  locationUrl: string; // custom address or google maps query
  checkIn: string;     // Date or text
  checkOut: string;    // Date or text
}

export interface Activity {
  id: string;
  title: string;
  type: "activity" | "food" | "checkin" | "airport" | string;
  time: string;
  description: string;
  location: string;
  openingHours?: string;
  budgetRange?: string;
  ticketPrice?: string;
  foodCost?: string;
  label?: string;
  preferredTransportMode?: "transit" | "driving" | "walking";
  transportation?: {
    mode: string;
    duration: string;
    cost: string;
    details: string;
    distance?: string;
  };
}

export interface DayItinerary {
  dayIndex: number;
  date: string;
  theme: string;
  activities: Activity[];
  preferredTransportMode?: "transit" | "driving" | "walking";
}

export interface Trip {
  id: string;
  userId: string;
  destinationName: string;
  destinations: string[]; // multi-place support
  startDate: string;
  endDate: string;
  flights: FlightInfo[];
  hotels: HotelInfo[];
  preferences: string;
  customEdits?: string;
  customEditsHistory?: string[];
  itinerary?: DayItinerary[];
  checklists?: {
    toGo: string[];
    toPack: string[];
    toBuy: string[];
  };
  budgetStats?: {
    currency: string;
    estimatedTotal: number;
    breakdown: {
      flights: number;
      accommodation: number;
      activities: number;
      food: number;
      transport: number;
    };
    budgetFeedback?: string;
  };
  agentsFeedback?: {
    plannerNotes: string;
    budgetNotes: string;
    transportNotes: string;
    foodNotes: string;
  };
  usefulLinks?: Array<{
    title: string;
    url: string;
    category: string;
  }>;
  targetBudget?: number;
  customExpenses?: Array<{
    id: string;
    category: string;
    description: string;
    amount: number;
    date: string;
  }>;
  completedChecklistItems?: string[];
  wantToGoPlaces?: string[];
  displayCurrency?: string;
  aspectBudgets?: {
    flights?: number;
    accommodation?: number;
    activities?: number;
    food?: number;
    transport?: number;
    others?: number;
  };
  aspectSpendings?: {
    flights?: number;
    accommodation?: number;
    activities?: number;
    food?: number;
    transport?: number;
    others?: number;
  };
  createdAt: string;
}

export interface ActivityRating {
  activityId: string;
  title: string;
  rating: number; // 1-5
  comment?: string;
}
