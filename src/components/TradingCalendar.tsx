import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarRange, TrendingUp, TrendingDown, Clock, Info } from 'lucide-react';
import { Trade } from '../types';

interface TradingCalendarProps {
  trades: Trade[];
  currency: string;
}

export default function TradingCalendar({ trades, currency }: TradingCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 6, 11)); // Seed to match our metadata context
  const [selectedDayTrades, setSelectedDayTrades] = useState<Trade[] | null>(null);
  const [selectedDayString, setSelectedDayString] = useState<string | null>(null);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Helper to format currency
  const formatValue = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(val);
  };

  const getCurrencySymbol = (curr: string) => {
    const symbols: { [key: string]: string } = {
      USD: '$',
      EUR: '€',
      INR: '₹',
      GBP: '£',
      JPY: '¥',
      AUD: '$',
      CAD: '$'
    };
    return symbols[curr] || '$';
  };

  // Helper to convert date to timezone-agnostic local YYYY-MM-DD string matching our calendar grid
  const getLocalDateString = (dateInput: string | Date) => {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Group trades by day using local date to align with local calendar cells perfectly
  const tradesByDay = trades.reduce((acc: { [key: string]: { trades: Trade[]; netProfit: number } }, trade) => {
    const dStr = getLocalDateString(trade.date);
    if (!dStr) return acc;
    if (!acc[dStr]) {
      acc[dStr] = { trades: [], netProfit: 0 };
    }
    acc[dStr].trades.push(trade);
    const net = trade.profit + (trade.commission || 0) + (trade.swap || 0);
    acc[dStr].netProfit += net;
    return acc;
  }, {});

  // Calendar logic
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 (Sun) to 6 (Sat)
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDayTrades(null);
    setSelectedDayKey(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDayTrades(null);
    setSelectedDayKey(null);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Compile calendar cells
  const cells = [];
  // Empty slots before first day of month
  for (let i = 0; i < firstDayOfMonth; i++) {
    cells.push({ isPadding: true, day: 0 });
  }
  // Days of month
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push({ isPadding: false, day: i });
  }

  // Monthly totals
  let monthlyProfit = 0;
  let winDays = 0;
  let lossDays = 0;

  for (let i = 1; i <= daysInMonth; i++) {
    const formattedDay = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    const dayData = tradesByDay[formattedDay];
    if (dayData) {
      monthlyProfit += dayData.netProfit;
      if (dayData.netProfit > 0) winDays++;
      if (dayData.netProfit < 0) lossDays++;
    }
  }

  const handleDayClick = (dayNum: number) => {
    const formattedDay = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    setSelectedDayKey(formattedDay);
    const dayData = tradesByDay[formattedDay];
    setSelectedDayString(`${monthNames[month]} ${dayNum}, ${year}`);
    if (dayData) {
      setSelectedDayTrades(dayData.trades);
    } else {
      setSelectedDayTrades([]);
    }
  };

  return (
    <div id="trading-calendar-card" className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-6 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-lg">
            <CalendarRange className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white trading-calendar-title">Trading Performance Calendar</h2>
            <p className="text-xs text-slate-700 dark:text-slate-200 font-bold trading-calendar-desc">Color-coded daily profit and loss journal</p>
          </div>
        </div>
        
        {/* Navigation */}
        <div className="flex items-center gap-3 mt-4 md:mt-0">
          <button 
            onClick={handlePrevMonth}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-400 dark:border-slate-700 rounded-lg transition-colors bg-white dark:bg-slate-900/50"
          >
            <ChevronLeft className="h-5 w-5 text-slate-900 dark:text-white stroke-[3]" />
          </button>
          <span className="font-black text-slate-900 dark:text-white min-w-[120px] text-center text-sm md:text-base tracking-tight trading-calendar-month">
            {monthNames[month]} {year}
          </span>
          <button 
            onClick={handleNextMonth}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-400 dark:border-slate-700 rounded-lg transition-colors bg-white dark:bg-slate-900/50"
          >
            <ChevronRight className="h-5 w-5 text-slate-900 dark:text-white stroke-[3]" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-3">
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-xs font-black text-slate-900 dark:text-slate-100 py-1 calendar-day-name">{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {cells.map((cell, idx) => {
              if (cell.isPadding) {
                return <div key={`pad-${idx}`} className="h-14 sm:h-16 md:h-20 calendar-day-box opacity-40 rounded-lg"></div>;
              }

              const formattedDay = `${year}-${String(month + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`;
              const dayData = tradesByDay[formattedDay];
              const isSelected = selectedDayKey === formattedDay;
              
              let borderClass = "!border !border-slate-300 dark:!border-slate-800";
              let textAccent = "text-slate-800 dark:text-slate-300";
              let amountText = "";

              if (dayData) {
                if (dayData.netProfit > 0) {
                  borderClass = "!border-2 !border-emerald-500 dark:!border-emerald-600";
                  textAccent = "text-emerald-700 dark:text-emerald-400 font-extrabold";
                  amountText = `+${dayData.netProfit.toFixed(0)}`;
                } else if (dayData.netProfit < 0) {
                  borderClass = "!border-2 !border-rose-500 dark:!border-rose-600";
                  textAccent = "text-rose-700 dark:text-rose-400 font-extrabold";
                  amountText = dayData.netProfit.toFixed(0);
                }
              }

              return (
                <button
                  key={`day-${cell.day}`}
                  onClick={() => handleDayClick(cell.day)}
                  className={`h-14 sm:h-16 md:h-20 p-1 sm:p-2 text-left rounded-lg transition flex flex-col justify-between group relative calendar-day-box hover:!bg-slate-50 dark:hover:!bg-slate-800/50 transition-all duration-150 ${borderClass} ${
                    isSelected 
                      ? 'ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-slate-900 scale-[1.03] z-10 shadow-xs' 
                      : ''
                  }`}
                >
                  <span className="text-[11px] sm:text-xs font-black calendar-day-number text-slate-950 dark:text-slate-50 group-hover:text-black dark:group-hover:text-white">{cell.day}</span>
                  {amountText && (
                    <span className={`text-[10px] sm:text-xs md:text-sm font-black truncate block ${textAccent}`}>
                      {getCurrencySymbol(currency)}{Math.abs(Number(amountText))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sidebar / Stats Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-800/20 border border-slate-200/60 dark:border-slate-800/60 rounded-xl p-4 shadow-2xs calendar-sidebar-box">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Month Performance</h3>
            <div className="space-y-4">
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block">Net P/L</span>
                <span className={`text-lg font-bold ${monthlyProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {monthlyProfit >= 0 ? '+' : ''}{formatValue(monthlyProfit)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 border-t border-slate-100 dark:border-slate-800 pt-3">
                <div>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 block flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-emerald-500" /> Profitable Days
                  </span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{winDays}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 block flex items-center gap-1">
                    <TrendingDown className="h-3 w-3 text-rose-500" /> Loss Days
                  </span>
                  <span className="text-sm font-bold text-rose-600 dark:text-rose-400">{lossDays}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Expanded Selected Day Trades */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-4 max-h-[300px] overflow-y-auto calendar-sidebar-box">
            {selectedDayTrades === null ? (
              <div className="text-center py-6 text-slate-400 dark:text-slate-500">
                <Info className="h-5 w-5 mx-auto mb-2 opacity-50" />
                <p className="text-xs">Click a calendar day to view active orders and closed trade journals</p>
              </div>
            ) : selectedDayTrades.length === 0 ? (
              <div>
                <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">{selectedDayString}</h4>
                <p className="text-xs text-slate-400 dark:text-slate-500">No trading activity logged on this date.</p>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2 mb-3">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">{selectedDayString}</h4>
                  <span className="text-[10px] bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-bold">
                    {selectedDayTrades.length} Positions
                  </span>
                </div>
                <div className="space-y-3">
                  {selectedDayTrades.map((trade) => (
                    <div key={trade.id} className="p-2.5 bg-white dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/50 rounded-lg text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                      <div className="flex justify-between font-semibold mb-1">
                        <span className="text-slate-800 dark:text-slate-200">{trade.symbol}</span>
                        <span className={trade.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                          {trade.profit >= 0 ? '+' : ''}{formatValue(trade.profit)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500">
                        <span>{trade.type} • {trade.lotSize} Lots</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {new Date(trade.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {trade.notes && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-1 italic bg-white/60 dark:bg-slate-900/40 p-1 rounded">
                          "{trade.notes}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
