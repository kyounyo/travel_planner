import React, { useState } from "react";
import { UserProfile } from "../types";
import { User, Shield, Compass, Sparkles } from "lucide-react";

interface AuthScreenProps {
  onLoginSuccess: (user: UserProfile) => void;
}

const AVATARS = [
  "✈️", "🗺️", "🎒", "🏔️", "🗼", "🌴", "🚗", "🍜", "🏄", "📸", "🚢", "🐨"
];

export default function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [username, setUsername] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError("Please enter a display name to personalize your travel dashboard.");
      return;
    }

    const newUser: UserProfile = {
      id: "u_" + Date.now().toString(36),
      username: username.trim(),
      avatar: selectedAvatar,
    };

    // Save profile locally
    localStorage.setItem("travel_planner_curr_user", JSON.stringify(newUser));
    onLoginSuccess(newUser);
  };

  const handleQuickDemo = () => {
    const demoUser: UserProfile = {
      id: "demo_user",
      username: "Nomad Explorer",
      avatar: "🏔️",
    };
    localStorage.setItem("travel_planner_curr_user", JSON.stringify(demoUser));
    onLoginSuccess(demoUser);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
      <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-600"></div>
      
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden flex flex-col">
        {/* Header Visual */}
        <div className="bg-slate-900 px-8 py-10 text-white relative overflow-hidden flex flex-col justify-end">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-zinc-800 rounded-full opacity-30 blur-2xl"></div>
          <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-indigo-500 rounded-full opacity-20 blur-3xl"></div>
          
          <div className="flex items-center gap-2 mb-2">
            <Compass className="w-6 h-6 text-indigo-400 animate-spin-slow" />
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Nomad AI v2.4</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">AI Travel Planner</h1>
          <p className="text-xs text-slate-400 mt-1">Travel architect with multi-agent scheduling engines</p>
        </div>

        {/* Content Form */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Your Display Name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <User className="w-4 h-4" />
                </span>
                <input
                  id="username"
                  type="text"
                  placeholder="e.g. Zoe Ong"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError("");
                  }}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white text-slate-800 border border-slate-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-xl transition outline-none text-sm font-medium"
                />
              </div>
              {error && <p className="text-rose-500 text-xs mt-1.5 font-medium">{error}</p>}
            </div>

            <div>
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Choose Avatar
              </span>
              <div className="grid grid-cols-6 gap-2">
                {AVATARS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setSelectedAvatar(emoji)}
                    className={`h-11 rounded-lg text-lg flex items-center justify-center transition border ${
                      selectedAvatar === emoji
                        ? "border-indigo-600 bg-indigo-50/50 scale-105"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-5050 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition active:scale-98 cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10"
            >
              <Sparkles className="w-4 h-4 text-white" />
              Initialize Portal
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-500 font-mono tracking-widest text-[10px]">Security Gateway</span>
            </div>
          </div>

          <button
            onClick={handleQuickDemo}
            className="w-full py-3 bg-slate-100 hover:bg-slate-200/85 text-slate-700 font-semibold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-2 border border-slate-250 border-slate-200/50"
          >
            <Shield className="w-4 h-4 text-slate-500" />
            Continue as Nomad Explorer (Demo)
          </button>
        </div>

        {/* Footer info */}
        <div className="bg-slate-50 px-8 py-4 border-t border-slate-200 text-center">
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
            Secure client-side localized sandbox state
          </p>
        </div>
      </div>
    </div>
  );
}
