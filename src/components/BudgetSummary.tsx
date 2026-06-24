import React, { useState, useEffect } from "react";
import { Trip } from "../types";
import travelData from "../../travelData.json";
import { 
  DollarSign, AlertTriangle, Scale, Coins, Trash2, Plus, ArrowRight
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
  INR: 83.5,
  PHP: 58.5,
  HKD: 7.8,
  TWD: 32.4,
  NZD: 1.63,
  CHF: 0.89,
  AED: 3.67,
  SAR: 3.75,
  ZAR: 18.2,
  NGN: 1450.0,
  KES: 130.0,
  EGP: 47.5,
  MAD: 10.0,
  GHS: 14.8
};

let dynamicRates: Record<string, number> | null = null;

const fetchLiveRates = () => {
  fetch("https://currency-rates.github.io/rates.json")
    .then(res => {
      if (res.ok) return res.json();
      throw new Error("Rates API error");
    })
    .then(data => {
      if (data && typeof data === "object" && !Array.isArray(data)) {
        dynamicRates = data;
      }
    })
    .catch(err => {
      console.warn("Failed to fetch live currency rates, using fallback.", err);
    });
};

try {
  fetchLiveRates();
} catch (_) {}

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
  INR: "₹",
  PHP: "₱",
  HKD: "HK$",
  TWD: "NT$",
  NZD: "NZ$",
  CHF: "CHF",
  AED: "AED",
  SAR: "SR",
  ZAR: "R",
  NGN: "₦",
  KES: "KSh",
  EGP: "E£",
  MAD: "DH",
  GHS: "GH₵"
};

const AVAILABLE_CURRENCIES = ["USD", "EUR", "GBP", "JPY", "SGD", "AUD", "CAD", "MYR", "CNY", "KRW", "THB", "IDR", "INR", "PHP", "HKD", "TWD", "NZD", "CHF", "AED", "SAR", "ZAR", "NGN", "KES", "EGP", "MAD", "GHS"];

interface TravelCountry {
  country: string;
  country_code: string | null;
  currency_code: string | null;
  states: string[];
}

const typedTravelData = travelData as TravelCountry[];

const mapCountryToCurrency = (country: string): string => {
  const norm = (country || "").toLowerCase().trim();
  if (!norm) return "USD";

  const match = typedTravelData.find(c => c.country.toLowerCase() === norm);
  if (match && match.currency_code) {
    return match.currency_code;
  }

  const partialMatch = typedTravelData.find(c => 
    norm.includes(c.country.toLowerCase()) || 
    c.country.toLowerCase().includes(norm)
  );
  if (partialMatch && partialMatch.currency_code) {
    return partialMatch.currency_code;
  }

  if (norm.includes("us") || norm.includes("america") || norm.includes("united states")) return "USD";
  if (norm.includes("uk") || norm.includes("london") || norm.includes("united kingdom")) return "GBP";
  if (norm.includes("europe") || norm.includes("france") || norm.includes("germany") || norm.includes("italy")) return "EUR";

  return "USD";
};

const convertAmount = (amount: number, from: string, to: string): number => {
  const cleanFrom = (from || "USD").toUpperCase();
  const cleanTo = (to || "USD").toUpperCase();
  if (cleanFrom === cleanTo) return amount;
  const rates = dynamicRates || USD_RATES;
  const fromRate = rates[cleanFrom] || 1.0;
  const toRate = rates[cleanTo] || 1.0;
  return (amount / fromRate) * toRate;
};

interface BudgetSummaryProps {
  trip: Trip;
  onUpdateTrip: (updatedTrip: Trip) => void;
}

export default function BudgetSummary({ trip, onUpdateTrip }: BudgetSummaryProps) {
  const baseCurrency = trip.budgetStats?.currency || "USD";
  const displayCurrency = trip.displayCurrency || baseCurrency;

  useEffect(() => {
    if (!dynamicRates) {
      fetchLiveRates();
    }
  }, []);

  const homeCurr = mapCountryToCurrency(trip.homeCountry || "");
  const travelCurrs = Array.from(new Set([
    mapCountryToCurrency(trip.destinationName),
    ...(trip.destinations || []).map(d => mapCountryToCurrency(d))
  ])).filter(c => c !== homeCurr);
  const remainingCurrs = AVAILABLE_CURRENCIES.filter(c => c !== homeCurr && !travelCurrs.includes(c));

  const aspectBudgets = trip.aspectBudgets || {
    flights: 0,
    accommodation: 0,
    activities: 0,
    food: 0,
    transport: 0,
    others: 0
  };

  const aspectSpendings = trip.aspectSpendings || {
    flights: 0,
    accommodation: 0,
    activities: 0,
    food: 0,
    transport: 0,
    others: 0
  };

  const aspectsList = [
    { key: "flights", label: "Flights & Tickets", icon: "✈️", color: "bg-indigo-500" },
    { key: "accommodation", label: "Accommodation", icon: "🏨", color: "bg-purple-500" },
    { key: "activities", label: "Activities & Landmarks", icon: "🎟️", color: "bg-emerald-500" },
    { key: "food", label: "Food & Dining", icon: "🍜", color: "bg-rose-500" },
    { key: "transport", label: "Local Transport", icon: "🚇", color: "bg-amber-500" },
    { key: "others", label: "Shopping & Others", icon: "🛍️", color: "bg-slate-500" }
  ];

  // States for custom logged ledger item
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseCat, setExpenseCat] = useState("food");
  const [expenseAmt, setExpenseAmt] = useState("");

  // Local inputs state to avoid jumping cursor while typing converted values
  const [localBudgets, setLocalBudgets] = useState<Record<string, string>>({});
  const [localSpendings, setLocalSpendings] = useState<Record<string, string>>({});

  // Sync inputs with display currency and state changes
  useEffect(() => {
    const bObj: Record<string, string> = {};
    const sObj: Record<string, string> = {};
    
    aspectsList.forEach((item) => {
      const rawB = aspectBudgets[item.key as keyof typeof aspectBudgets] || 0;
      const convB = convertAmount(rawB, baseCurrency, displayCurrency);
      bObj[item.key] = rawB > 0 ? String(Math.round(convB)) : "";

      const rawS = aspectSpendings[item.key as keyof typeof aspectSpendings] || 0;
      const convS = convertAmount(rawS, baseCurrency, displayCurrency);
      sObj[item.key] = rawS > 0 ? String(Math.round(convS)) : "";
    });

    setLocalBudgets(bObj);
    setLocalSpendings(sObj);
  }, [trip.aspectBudgets, trip.aspectSpendings, displayCurrency]);

  const customExpenses = trip.customExpenses || [];
  const loggedExpensesTotal = customExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Total aspect budgets
  const totalAspectBudgetInBase = Object.values(aspectBudgets).reduce((sum, val) => sum + (val || 0), 0);
  const totalAspectBudgetInDisplay = convertAmount(totalAspectBudgetInBase, baseCurrency, displayCurrency);

  // Total aspect spendings
  const totalAspectSpendingInBase = Object.values(aspectBudgets && aspectSpendings ? aspectSpendings : {}).reduce((sum, val) => sum + (val || 0), 0);
  const grandTotalSpendingInBase = totalAspectSpendingInBase;
  const grandTotalSpendingInDisplay = convertAmount(grandTotalSpendingInBase, baseCurrency, displayCurrency);

  const remainingBudgetInDisplay = totalAspectBudgetInDisplay - grandTotalSpendingInDisplay;
  const isOverBudget = totalAspectBudgetInDisplay > 0 && grandTotalSpendingInDisplay > totalAspectBudgetInDisplay;
  const progressPercent = totalAspectBudgetInDisplay > 0 ? Math.min(Math.round((grandTotalSpendingInDisplay / totalAspectBudgetInDisplay) * 100), 100) : 0;

  const formatCurrency = (amount: number) => {
    const converted = convertAmount(amount, baseCurrency, displayCurrency);
    return `${Math.round(converted).toLocaleString()} ${displayCurrency}`;
  };

  const handleBudgetChange = (key: string, val: string) => {
    setLocalBudgets(prev => ({ ...prev, [key]: val }));
    const numeric = parseFloat(val) || 0;
    const inBase = convertAmount(numeric, displayCurrency, baseCurrency);
    
    const nextBudgets = {
      ...aspectBudgets,
      [key]: inBase
    };
    const nextTotalBase = Object.values(nextBudgets).reduce((sum, v) => sum + (v || 0), 0);

    onUpdateTrip({
      ...trip,
      aspectBudgets: nextBudgets,
      targetBudget: nextTotalBase
    });
  };

  const handleSpendingChange = (key: string, val: string) => {
    setLocalSpendings(prev => ({ ...prev, [key]: val }));
    const numeric = parseFloat(val) || 0;
    const inBase = convertAmount(numeric, displayCurrency, baseCurrency);

    onUpdateTrip({
      ...trip,
      aspectSpendings: {
        ...aspectSpendings,
        [key]: inBase
      }
    });
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseDesc.trim() || !expenseAmt) return;
    const amountInDisplay = parseFloat(expenseAmt);
    if (isNaN(amountInDisplay) || amountInDisplay <= 0) return;

    const amountInBase = convertAmount(amountInDisplay, displayCurrency, baseCurrency);

    const newExpense = {
      id: "exp_" + Date.now().toString(36),
      category: expenseCat,
      description: expenseDesc.trim(),
      amount: amountInBase,
      date: new Date().toLocaleDateString([], { month: "short", day: "numeric" })
    };

    // Update the specific aspect spending directly
    const revisedSpendings = {
      ...aspectSpendings,
      [expenseCat]: (aspectSpendings[expenseCat as keyof typeof aspectSpendings] || 0) + amountInBase
    };

    onUpdateTrip({
      ...trip,
      customExpenses: [...customExpenses, newExpense],
      aspectSpendings: revisedSpendings
    });

    setExpenseDesc("");
    setExpenseAmt("");
  };

  const handleRemoveExpense = (id: string) => {
    const expenseToRemove = customExpenses.find(e => e.id === id);
    if (!expenseToRemove) return;

    // Subtract the specific aspect spending directly
    const categoryKey = expenseToRemove.category;
    const revisedSpendings = {
      ...aspectSpendings,
      [categoryKey]: Math.max(0, (aspectSpendings[categoryKey as keyof typeof aspectSpendings] || 0) - expenseToRemove.amount)
    };

    onUpdateTrip({
      ...trip,
      customExpenses: customExpenses.filter(e => e.id !== id),
      aspectSpendings: revisedSpendings
    });
  };

  return (
    <div className="space-y-8">
      {/* HEADER SECTION WITH CURRENCY PICKER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 text-white rounded-3xl p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Trip Budget & Expenses</h2>
          <p className="text-xs text-slate-400 mt-1">Configure individual aspect limits and record exact travel spending ourselves</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs font-mono text-slate-400">Currency Mode:</span>
          <select
            value={displayCurrency}
            onChange={(e) => {
              onUpdateTrip({
                ...trip,
                displayCurrency: e.target.value
              });
            }}
            className="bg-slate-800 border border-slate-700 text-white text-xs font-bold font-mono py-2 px-3 rounded-xl focus:border-indigo-500 outline-none cursor-pointer"
          >
            <optgroup label="🏡 Home Country Currency">
              <option value={homeCurr}>
                {homeCurr} - Home
              </option>
            </optgroup>
            {travelCurrs.length > 0 && (
              <optgroup label="✈️ Travel Destination Currency">
                {travelCurrs.map(curr => (
                  <option key={curr} value={curr}>
                    {curr} - Destination
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label="🌐 All Other Currencies">
              {remainingCurrs.map(curr => (
                <option key={curr} value={curr}>
                  {curr}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>

      {/* OVERALL TRACKING PROGRESS CARD */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-4">
          <Scale className="w-4 h-4 text-slate-550" />
          General Financial Progress
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5 text-center">
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
            <span className="block text-[10px] uppercase font-mono text-slate-400 font-bold">Total Aspect Budget Limit</span>
            <span className="text-lg font-bold text-slate-800 font-mono mt-1 block">
              {formatCurrency(totalAspectBudgetInBase)}
            </span>
          </div>
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
            <span className="block text-[10px] uppercase font-mono text-slate-400 font-bold">Grand Total Spending</span>
            <span className="text-lg font-bold text-slate-800 font-mono mt-1 block">
              {formatCurrency(grandTotalSpendingInBase)}
            </span>
          </div>
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
            <span className="block text-[10px] uppercase font-mono text-slate-400 font-bold">Remaining Balance</span>
            <span className={`text-lg font-bold font-mono mt-1 block ${remainingBudgetInDisplay < 0 ? "text-rose-600" : "text-emerald-600"}`}>
              {remainingBudgetInDisplay < 0 ? "-" : ""}{formatCurrency(Math.abs(convertAmount(remainingBudgetInDisplay, displayCurrency, baseCurrency)))}
            </span>
          </div>
        </div>

        {totalAspectBudgetInDisplay > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>Overall Budget Burn Progress:</span>
              <span className="font-mono">{progressPercent}% Used</span>
            </div>
            <div className="w-full bg-[#E2E8F0] h-3 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  isOverBudget ? "bg-rose-500" : "bg-emerald-500"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            
            {isOverBudget && (
              <div className="p-3 bg-rose-50 text-rose-700 border border-rose-100 rounded-xl flex items-start gap-1.5 text-[11px] leading-snug mt-3">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <strong>Financial Overflow Alert:</strong> Your exact spending has exceeded your aspect budget limits by {formatCurrency(Math.abs(convertAmount(remainingBudgetInDisplay, displayCurrency, baseCurrency)))}. Try trimming down transport modes or restaurants!
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 bg-amber-50 text-amber-800 border border-amber-100 rounded-2xl text-[11px] leading-relaxed text-center">
            👋 Enter aspect budget limits below to visually track your overall spending progress here.
          </div>
        )}
      </div>

      {/* ASPECT SPECIFIC BUDGET AND SPENDING USER FILLABLE FORM GRID */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <Coins className="w-4 h-4 text-slate-550" />
            Aspect Specific Budgets & Spending
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Specify custom budgets and input precise spending for each travel aspect below:</p>
        </div>

        <div className="grid grid-cols-1 gap-4 mt-5">
          {aspectsList.map((item) => {
            const bVal = parseFloat(localBudgets[item.key] || "0") || 0;
            const sVal = parseFloat(localSpendings[item.key] || "0") || 0;
            const percentage = bVal > 0 ? Math.min(Math.round((sVal / bVal) * 100), 100) : 0;
            const symbol = CURRENCY_SYMBOLS[displayCurrency] || "$";

            return (
              <div key={item.key} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Info and icon */}
                <div className="flex items-center gap-3 w-full lg:w-1/4 shrink-0">
                  <span className="text-xl p-2 bg-white rounded-xl shadow-xs border border-slate-100">
                    {item.icon}
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">{item.label}</h4>
                    {bVal > 0 && (
                      <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                        {percentage}% of limit spent
                      </span>
                    )}
                  </div>
                </div>

                {/* Input Fields */}
                <div className="grid grid-cols-2 gap-3 w-full lg:w-2/5 shrink-0">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase font-mono">My Budget ({displayCurrency})</label>
                    <input
                      type="number"
                      placeholder="e.g. 1000"
                      value={localBudgets[item.key] || ""}
                      onChange={(e) => handleBudgetChange(item.key, e.target.value)}
                      className="w-full px-3 py-1.5 text-xs text-slate-800 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none"
                      min="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase font-mono">My Spending ({displayCurrency})</label>
                    <input
                      type="number"
                      placeholder="e.g. 850"
                      value={localSpendings[item.key] || ""}
                      onChange={(e) => handleSpendingChange(item.key, e.target.value)}
                      className="w-full px-3 py-1.5 text-xs text-slate-800 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none"
                      min="0"
                    />
                  </div>
                </div>

                {/* Bar progress */}
                <div className="w-full lg:w-1/4 flex flex-col justify-center">
                  <div className="flex justify-between text-[10px] font-mono text-slate-500 mb-1">
                    <span>Usage Bar</span>
                    <span>{percentage}%</span>
                  </div>
                  <div className="w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        sVal > bVal && bVal > 0 ? "bg-rose-500" : "bg-indigo-600"
                      }`}
                      style={{ width: `${bVal > 0 ? percentage : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CUSTOM LEDGER LIST (KEEP AS BACKUP FOR GIFT EXPENSES ETC) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <Coins className="w-4 h-4 text-indigo-600" />
            Custom Miscellaneous Expense Log
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Perfect for small purchases like gifts, snacks or custom attraction passes not covered in the default categories</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <form onSubmit={handleAddExpense} className="lg:col-span-4 bg-slate-50 p-4 border border-slate-200/50 rounded-2xl space-y-4">
            <span className="text-[10px] font-bold font-mono text-slate-500 uppercase tracking-wider block">Add Misc Ledger Item</span>
            
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-500 uppercase font-mono">Description</label>
              <input 
                type="text" 
                placeholder="e.g. Handmade Souvenirs"
                value={expenseDesc}
                onChange={(e) => setExpenseDesc(e.target.value)}
                className="w-full px-3 py-1.5 text-xs text-slate-800 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-500 uppercase font-mono">Category</label>
                <select 
                  value={expenseCat}
                  onChange={(e) => setExpenseCat(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs text-slate-800 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none"
                >
                  <option value="activities">🎟️ Activities</option>
                  <option value="food">🍜 Food & Dining</option>
                  <option value="transport">🚇 Local Transport</option>
                  <option value="accommodation">🏨 Accommodation</option>
                  <option value="others">🛍️ Shopping / Others</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-500 uppercase font-mono">Amount ({displayCurrency})</label>
                <input 
                  type="number" 
                  placeholder="e.g. 50"
                  value={expenseAmt}
                  onChange={(e) => setExpenseAmt(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs text-slate-800 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none"
                  min="0.01"
                  step="any"
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition duration-150 cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Log Misc Expense
            </button>
          </form>

          <div className="lg:col-span-8 flex flex-col justify-between">
            {customExpenses.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center text-slate-400 bg-slate-50/20">
                <p className="text-xs font-semibold text-slate-550 mb-0.5">Ledger is Empty</p>
                <p className="text-[10px] text-slate-400 max-w-sm">No special miscellaneous spent documented. Add souvenir or gift bills on the left!</p>
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto space-y-2 pr-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1.5 grid grid-cols-12 gap-2 px-2 font-mono">
                  <div className="col-span-5">Description</div>
                  <div className="col-span-3">Category</div>
                  <div className="col-span-2 text-right">Cost</div>
                  <div className="col-span-2 text-center">Action</div>
                </div>
                {customExpenses.map((exp) => (
                  <div key={exp.id} className="grid grid-cols-12 gap-2 items-center p-2 hover:bg-slate-50 rounded-xl transition text-xs border border-transparent hover:border-slate-100 bg-white">
                    <div className="col-span-5 font-medium text-slate-700">
                      {exp.description}
                      <span className="block text-[9px] text-slate-400 font-normal font-mono">{exp.date}</span>
                    </div>
                    <div className="col-span-3 text-slate-500 text-[11px] truncate uppercase font-mono">
                      {exp.category}
                    </div>
                    <div className="col-span-2 text-right font-mono font-bold text-slate-900 font-bold">
                      {formatCurrency(exp.amount)}
                    </div>
                    <div className="col-span-2 text-center">
                      <button 
                        onClick={() => handleRemoveExpense(exp.id)}
                        className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition duration-150 cursor-pointer"
                        title="Remove expense"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
