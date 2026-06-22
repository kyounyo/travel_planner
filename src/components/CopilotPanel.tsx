import React, { useState, useEffect, useRef } from "react";
import Markdown from "react-markdown";
import { Trip } from "../types";
import { 
  CheckSquare, Square, Package, HelpCircle, Thermometer,
  CloudSun, ShoppingBag, Send, AlertCircle, Sparkles, Loader2,
  ExternalLink, ChevronRight, FileText, Trash2, Plus
} from "lucide-react";

interface CopilotPanelProps {
  trip: Trip;
  onUpdateTrip: (updatedTrip: Trip) => void;
}

interface Message {
  id: string;
  sender: "user" | "copilot";
  text: string;
  timestamp: string;
}

const formatDateRange = (start: string, end: string) => {
  if (!start) return "";
  try {
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) {
      return `${start} - ${end}`;
    }
    const opt: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
    return `${s.toLocaleDateString("en-US", opt)} - ${e.toLocaleDateString("en-US", opt)}`;
  } catch {
    return `${start} - ${end}`;
  }
};

export default function CopilotPanel({ trip, onUpdateTrip }: CopilotPanelProps) {
  // Checklists item state
  const [checklistToGo, setChecklistToGo] = useState<string[]>([]);
  const [checklistToPack, setChecklistToPack] = useState<string[]>([]);
  const [checklistToBuy, setChecklistToBuy] = useState<string[]>([]);

  // Ticks state
  const [completedItems, setCompletedItems] = useState<string[]>([]);

  // Add items inputs
  const [newToGo, setNewToGo] = useState("");
  const [newToPack, setNewToPack] = useState("");
  const [newToBuy, setNewToBuy] = useState("");

  // Weather state
  const [weatherData, setWeatherData] = useState<{
    temp: string;
    condition: string;
    advice: string;
  } | null>(null);
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);

  // Chat window state
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "m_init",
      sender: "copilot",
      text: "Hi! I'm your Travel Copilot, backed by our specialty Planner, Budget, Transport, and Food advisors. How can I help fine-tune your itinerary today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync checklist items when trip finishes loading
  useEffect(() => {
    if (trip.checklists) {
      setChecklistToGo(trip.checklists.toGo || []);
      setChecklistToPack(trip.checklists.toPack || []);
      setChecklistToBuy(trip.checklists.toBuy || []);
      setCompletedItems(trip.completedChecklistItems || []);
    }
  }, [trip]);

  // Load weather when trip location or dates change
  useEffect(() => {
    const fetchWeather = async () => {
      setIsWeatherLoading(true);
      try {
        const dest = trip.destinations[0] || "Tokyo";
        const start = trip.startDate || "";
        const end = trip.endDate || "";
        const res = await fetch(`/api/weather-info?location=${encodeURIComponent(dest)}&startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}`);
        if (res.ok) {
          const data = await res.json();
          setWeatherData(data);
        }
      } catch (err) {
        console.error("Error loaded weather:", err);
      } finally {
        setIsWeatherLoading(false);
      }
    };
    fetchWeather();
  }, [trip.destinations, trip.startDate, trip.endDate]);

  // Scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isChatLoading]);

  // Toggle checkbox
  const toggleItem = (item: string) => {
    const nextChecked = completedItems.includes(item)
      ? completedItems.filter(i => i !== item)
      : [...completedItems, item];
    setCompletedItems(nextChecked);
    onUpdateTrip({
      ...trip,
      completedChecklistItems: nextChecked,
    });
  };

  // Add list operations
  const handleAddItem = (type: "toGo" | "toPack" | "toBuy", text: string) => {
    if (!text.trim()) return;
    const cleanText = text.trim();
    
    let nextToGo = checklistToGo;
    let nextToPack = checklistToPack;
    let nextToBuy = checklistToBuy;

    if (type === "toGo") {
      nextToGo = [...checklistToGo, cleanText];
      setChecklistToGo(nextToGo);
      setNewToGo("");
    } else if (type === "toPack") {
      nextToPack = [...checklistToPack, cleanText];
      setChecklistToPack(nextToPack);
      setNewToPack("");
    } else if (type === "toBuy") {
      nextToBuy = [...checklistToBuy, cleanText];
      setChecklistToBuy(nextToBuy);
      setNewToBuy("");
    }

    onUpdateTrip({
      ...trip,
      checklists: {
        toGo: nextToGo,
        toPack: nextToPack,
        toBuy: nextToBuy
      }
    });
  };

  const handleRemoveItem = (type: "toGo" | "toPack" | "toBuy", item: string) => {
    let nextToGo = checklistToGo;
    let nextToPack = checklistToPack;
    let nextToBuy = checklistToBuy;

    if (type === "toGo") {
      nextToGo = checklistToGo.filter(i => i !== item);
      setChecklistToGo(nextToGo);
    } else if (type === "toPack") {
      nextToPack = checklistToPack.filter(i => i !== item);
      setChecklistToPack(nextToPack);
    } else if (type === "toBuy") {
      nextToBuy = checklistToBuy.filter(i => i !== item);
      setChecklistToBuy(nextToBuy);
    }

    const nextChecked = completedItems.filter(i => i !== item);
    setCompletedItems(nextChecked);

    onUpdateTrip({
      ...trip,
      completedChecklistItems: nextChecked,
      checklists: {
        toGo: nextToGo,
        toPack: nextToPack,
        toBuy: nextToBuy
      }
    });
  };

  // Chat Submit
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMsg: Message = {
      id: "msg_" + Date.now().toString(36),
      sender: "user",
      text: chatInput.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const res = await fetch("/api/chat-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg.text,
          tripContext: {
            destinationName: trip.destinationName,
            startDate: trip.startDate,
            endDate: trip.endDate,
            flights: trip.flights,
            hotels: trip.hotels,
            preferences: trip.preferences
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        const copilotMsg: Message = {
          id: "msg_" + (Date.now() + 1).toString(36),
          sender: "copilot",
          text: data.reply || "I've analyzed your context. Let me know if you would like me to adjust the main roadmap!",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, copilotMsg]);
      } else {
        throw new Error("Chat api request faulted");
      }
    } catch (err) {
      const errorMsg: Message = {
        id: "msg_err_" + Date.now().toString(36),
        sender: "copilot",
        text: "Sorry, I lost satellite signal momentarily. Let's try that again!",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      {/* CO-PILOT CHAT ADVISORS (7 cols) */}
      <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden flex flex-col h-[440px]">
        
        {/* Chat Header */}
        <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            <div>
              <h3 className="text-xs font-bold tracking-tight">Special Advisor Copilot</h3>
              <p className="text-[9px] text-slate-400 font-mono">Planner, Budget, Transit & Food Agents</p>
            </div>
          </div>
          <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-spin-slow" />
        </div>

        {/* Message Stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50">
          {messages.map((m) => (
            <div 
              key={m.id} 
              className={`flex flex-col max-w-[85%] ${m.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"}`}
            >
              <span className="text-[9px] text-slate-400 font-mono mb-1">{m.sender === "user" ? "You" : "Advisor Team"} • {m.timestamp}</span>
              <div 
                className={`p-3.5 rounded-2xl text-xs font-normal leading-relaxed shadow-xs ${
                  m.sender === "user" 
                    ? "bg-slate-950 text-white rounded-tr-none whitespace-pre-wrap" 
                    : "bg-white text-slate-800 border border-slate-200/60 rounded-tl-none"
                }`}
              >
                {m.sender === "user" ? (
                  m.text
                ) : (
                  <div className="markdown-body space-y-1 text-slate-800 leading-relaxed break-words">
                    <Markdown
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        strong: ({ children }) => <strong className="font-bold text-slate-950">{children}</strong>,
                        ul: ({ children }) => <ul className="list-disc pl-5 mb-2.5 last:mb-0 space-y-1">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-5 mb-2.5 last:mb-0 space-y-1">{children}</ol>,
                        li: ({ children }) => <li className="pl-0.5 text-slate-700">{children}</li>,
                      }}
                    >
                      {m.text}
                    </Markdown>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isChatLoading && (
            <div className="flex items-center gap-1.5 p-3 bg-white border border-slate-100 rounded-2xl w-40 text-xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
              <span className="text-slate-400 font-mono text-[10px] uppercase">Synthesizing...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Action input prompt */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-100 flex gap-2 bg-white">
          <input
            type="text"
            placeholder="Ask transport, custom food places, budget comparisons..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            disabled={isChatLoading}
            className="flex-1 px-4 py-2.5 bg-slate-50 text-slate-800 text-xs border border-slate-200 focus:border-indigo-500 hover:bg-slate-100/50 focus:bg-white rounded-xl transition outline-none"
          />
          <button
            type="submit"
            disabled={!chatInput.trim() || isChatLoading}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-50 rounded-xl cursor-pointer transition flex items-center justify-center shrink-0"
          >
            <Send className="w-4 h-4 text-indigo-400" />
          </button>
        </form>
      </div>

      {/* TRIP CHECKLISTS, WEATHER & USEFUL BOOKING LINKS (5 cols) */}
      <div className="lg:col-span-5 space-y-6">
        
        {/* Dynamic Weather Card */}
        <div className="bg-gradient-to-br from-indigo-900 to-slate-950 text-white p-5 rounded-3xl shadow-md space-y-3 relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/5 rounded-full opacity-30 blur-2xl"></div>
          
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-400">Seasonal Weather Prognosis</span>
              {trip.startDate && trip.endDate && (
                <span className="text-[11px] text-indigo-200/80 font-mono mt-0.5">
                  {formatDateRange(trip.startDate, trip.endDate)}
                </span>
              )}
            </div>
            <CloudSun className="w-5 h-5 text-indigo-300" />
          </div>

          {isWeatherLoading ? (
            <div className="flex items-center gap-2 py-4">
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span className="text-xs font-mono">Consulting weather datasets...</span>
            </div>
          ) : weatherData ? (
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono tracking-tight">{weatherData.temp}</span>
                <span className="text-xs text-indigo-300">({weatherData.condition})</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-normal">
                💡 <strong>Packing Advice:</strong> {weatherData.advice}
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No historical weather info resolved.</p>
          )}
        </div>

        {/* brings up a list of to go, to pack, to buy */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <CheckSquare className="w-4 h-4 text-indigo-650" />
            Trip Checklist Hub
          </h3>

          <div className="space-y-4">
            {/* Checklist: To Go */}
            <div className="space-y-2 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">1. Tasks To Go (Pre-travel)</span>
              
              {/* Add form */}
              <form onSubmit={(e) => { e.preventDefault(); handleAddItem("toGo", newToGo); }} className="flex gap-1.5">
                <input 
                  type="text" 
                  value={newToGo}
                  onChange={(e) => setNewToGo(e.target.value)}
                  placeholder="Add pre-travel task..."
                  className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-205 focus:border-indigo-500 outline-none rounded-xl text-slate-800"
                />
                <button type="submit" className="p-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition cursor-pointer flex items-center justify-center shrink-0">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </form>

              {checklistToGo.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic py-1 pl-1">No tasks logged.</p>
              ) : (
                <div className="space-y-1">
                  {checklistToGo.map((item, i) => {
                    const isDone = completedItems.includes(item);
                    return (
                      <div key={i} className="flex items-center justify-between group p-1 hover:bg-white rounded-lg transition">
                        <button
                          onClick={() => toggleItem(item)}
                          className="flex-1 text-left flex items-start gap-2 py-0.5 text-xs cursor-pointer font-medium"
                        >
                          {isDone ? (
                            <CheckSquare className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-350 shrink-0 mt-0.5" />
                          )}
                          <span className={isDone ? "line-through text-slate-400 font-normal" : "text-slate-700"}>{item}</span>
                        </button>
                        <button 
                          onClick={() => handleRemoveItem("toGo", item)}
                          className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-rose-500 md:opacity-0 md:group-hover:opacity-100 transition duration-150 cursor-pointer shrink-0"
                          title="Delete checklist item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Checklist: To Pack */}
            <div className="space-y-2 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">2. Items To Pack</span>
              
              {/* Add form */}
              <form onSubmit={(e) => { e.preventDefault(); handleAddItem("toPack", newToPack); }} className="flex gap-1.5">
                <input 
                  type="text" 
                  value={newToPack}
                  onChange={(e) => setNewToPack(e.target.value)}
                  placeholder="Add item to pack..."
                  className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-205 focus:border-indigo-500 outline-none rounded-xl text-slate-800"
                />
                <button type="submit" className="p-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition cursor-pointer flex items-center justify-center shrink-0">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </form>

              {checklistToPack.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic py-1 pl-1">No items logged.</p>
              ) : (
                <div className="space-y-1">
                  {checklistToPack.map((item, i) => {
                    const isDone = completedItems.includes(item);
                    return (
                      <div key={i} className="flex items-center justify-between group p-1 hover:bg-white rounded-lg transition">
                        <button
                          onClick={() => toggleItem(item)}
                          className="flex-1 text-left flex items-start gap-2 py-0.5 text-xs cursor-pointer font-medium"
                        >
                          {isDone ? (
                            <CheckSquare className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-350 shrink-0 mt-0.5" />
                          )}
                          <span className={isDone ? "line-through text-slate-400 font-normal" : "text-slate-700"}>{item}</span>
                        </button>
                        <button 
                          onClick={() => handleRemoveItem("toPack", item)}
                          className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-rose-500 md:opacity-0 md:group-hover:opacity-100 transition duration-150 cursor-pointer shrink-0"
                          title="Delete checklist item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Checklist: To Buy */}
            <div className="space-y-2 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">3. Things To Buy</span>
              
              {/* Add form */}
              <form onSubmit={(e) => { e.preventDefault(); handleAddItem("toBuy", newToBuy); }} className="flex gap-1.5">
                <input 
                  type="text" 
                  value={newToBuy}
                  onChange={(e) => setNewToBuy(e.target.value)}
                  placeholder="Add item to buy..."
                  className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-205 focus:border-indigo-500 outline-none rounded-xl text-slate-800"
                />
                <button type="submit" className="p-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition cursor-pointer flex items-center justify-center shrink-0">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </form>

              {checklistToBuy.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic py-1 pl-1">No items logged.</p>
              ) : (
                <div className="space-y-1">
                  {checklistToBuy.map((item, i) => {
                    const isDone = completedItems.includes(item);
                    return (
                      <div key={i} className="flex items-center justify-between group p-1 hover:bg-white rounded-lg transition">
                        <button
                          onClick={() => toggleItem(item)}
                          className="flex-1 text-left flex items-start gap-2 py-0.5 text-xs cursor-pointer font-medium"
                        >
                          {isDone ? (
                            <CheckSquare className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-350 shrink-0 mt-0.5" />
                          )}
                          <span className={isDone ? "line-through text-slate-440 font-normal" : "text-slate-700"}>{item}</span>
                        </button>
                        <button 
                          onClick={() => handleRemoveItem("toBuy", item)}
                          className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-rose-500 md:opacity-0 md:group-hover:opacity-100 transition duration-150 cursor-pointer shrink-0"
                          title="Delete checklist item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Brings up a list of booking links connected to websites like trip.com */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block">Direct Booking Hub</span>
          <div className="space-y-2">
            <a
              href="https://www.trip.com/flights"
              target="_blank"
              rel="noreferrer"
              className="p-3 bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-slate-200 rounded-2xl flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-800 transition"
            >
              <span className="flex items-center gap-1.5">
                <span>✈️</span> Checkout Flight Tickets (Trip.com)
              </span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
            </a>

            <a
              href="https://www.trip.com/hotels"
              target="_blank"
              rel="noreferrer"
              className="p-3 bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-slate-200 rounded-2xl flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-800 transition"
            >
              <span className="flex items-center gap-1.5">
                <span>🏨</span> Find Cheap Accommodations (Trip.com)
              </span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
