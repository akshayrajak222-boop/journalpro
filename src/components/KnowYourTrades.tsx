import React, { useState, useMemo } from 'react';
import { Lock, Activity } from 'lucide-react';
import { Trade, TradingAccount } from '../types';
import { ResponsiveContainer, LineChart, Line, Tooltip } from 'recharts';

interface KnowYourTradesProps {
  trades: Trade[];
  accounts: TradingAccount[];
  isPro: boolean;
}

// EXACTLY 3 MODES
const MODES = [
  { id: 'Scalping', label: 'Scalping (0-5m)', maxMins: 5 },
  { id: 'Intraday', label: 'Intraday (5m-4h)', maxMins: 240 },
  { id: 'Day Holding', label: 'Day Holding (>4h)', maxMins: Infinity }
];

export default function KnowYourTrades({ trades, accounts, isPro }: KnowYourTradesProps) {
  const [dateFilter, setDateFilter] = useState('All Time');
  const [accountFilter, setAccountFilter] = useState('All');
  const [selectedMode, setSelectedMode] = useState<string | null>(null);

  // Filter trades globally based on date and account
  const filteredTrades = useMemo(() => {
    let result = trades.filter(t => t.exitTime); // Only completed trades
    if (accountFilter !== 'All') {
      result = result.filter(t => t.accountId === accountFilter);
    }
    
    const now = new Date();
    let cutoff = new Date(0);
    if (dateFilter === '7D') cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    else if (dateFilter === '30D') cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    else if (dateFilter === '90D') cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    else if (dateFilter === '1Y') cutoff = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    if (dateFilter !== 'All Time' && dateFilter !== 'Custom') {
      result = result.filter(t => new Date(t.date) >= cutoff);
    }
    
    return result;
  }, [trades, accountFilter, dateFilter]);

  // Classify into EXACTLY 3 modes
  const classifiedTrades = useMemo(() => {
    const modes = MODES.map(m => ({ ...m, trades: [] as Trade[] }));
    
    filteredTrades.forEach(trade => {
      if (!trade.exitTime) return;
      const entry = new Date(trade.date).getTime();
      const exit = new Date(trade.exitTime).getTime();
      const diffMins = (exit - entry) / (1000 * 60);
      
      const mode = modes.find(m => diffMins <= m.maxMins);
      if (mode) mode.trades.push(trade);
    });
    
    return modes;
  }, [filteredTrades]);

  const calculateStats = (modeTrades: Trade[]) => {
    const count = modeTrades.length;
    if (count === 0) return { count: 0, winRate: 0, avgTime: '0s', totalPnL: 0, avgPnL: 0, chartData: [] };
    
    const wins = modeTrades.filter(t => t.profit > 0).length;
    const winRate = (wins / count) * 100;
    const totalPnL = modeTrades.reduce((sum, t) => sum + t.profit, 0);
    const avgPnL = totalPnL / count;
    
    const totalTimeMins = modeTrades.reduce((sum, t) => {
      const entry = new Date(t.date).getTime();
      const exit = new Date(t.exitTime!).getTime();
      return sum + (exit - entry) / (1000 * 60);
    }, 0);
    const avgMins = totalTimeMins / count;
    let avgTime = '';
    if (avgMins < 60) avgTime = `${Math.floor(avgMins)}m ${Math.floor((avgMins % 1) * 60)}s`;
    else if (avgMins < 1440) avgTime = `${Math.floor(avgMins / 60)}h ${Math.floor(avgMins % 60)}m`;
    else avgTime = `${Math.floor(avgMins / 1440)}d ${Math.floor((avgMins % 1440) / 60)}h`;

    const sorted = [...modeTrades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let cumulative = 0;
    // Add an initial 0 point for a proper trend start
    const chartData = [{ date: 'Start', value: 0 }];
    sorted.forEach(t => {
      cumulative += t.profit;
      chartData.push({ date: new Date(t.date).toLocaleDateString(), value: cumulative });
    });

    return { count, winRate, avgTime, totalPnL, avgPnL, chartData };
  };

  const getOverallStats = () => {
    if (filteredTrades.length === 0) return null;
    
    const days = new Set(filteredTrades.map(t => t.date.split('T')[0])).size || 1;
    const wins = filteredTrades.filter(t => t.profit > 0);
    const losses = filteredTrades.filter(t => t.profit <= 0);
    const totalProfit = wins.reduce((s, t) => s + t.profit, 0);
    const totalLoss = losses.reduce((s, t) => s + t.profit, 0);
    const net = totalProfit + totalLoss;
    
    return {
      avgTradesPerDay: (filteredTrades.length / days).toFixed(1),
      avgProfitPerDay: (totalProfit / days).toFixed(2),
      avgLossPerDay: (totalLoss / days).toFixed(2),
      avgNetPerDay: (net / days).toFixed(2),
    };
  };

  const overall = getOverallStats();
  
  // Find the style with the most trades for the summary
  const mostCommonStyle = [...classifiedTrades].sort((a, b) => b.trades.length - a.trades.length)[0];
  const mostCommonStats = calculateStats(mostCommonStyle.trades);

  const displayedTrades = selectedMode
    ? classifiedTrades.find(m => m.id === selectedMode)?.trades || []
    : filteredTrades;

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">Know Your Trades</h2>
          <p className="text-slate-500 text-sm">Analyze your true trading style and behavior</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select 
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500 transition-colors"
          >
            {['7D', '30D', '90D', '1Y', 'All Time', 'Custom'].map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <select 
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500 transition-colors"
          >
            <option value="All">All Accounts</option>
            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
          </select>
        </div>
      </div>

      {/* Summary */}
      {mostCommonStyle.trades.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-xl p-4 flex items-start gap-4">
          <div className="bg-blue-100 dark:bg-blue-800 p-2 rounded-lg text-blue-600 dark:text-blue-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white mb-1">Your Trading Style</h3>
            <p className="text-slate-600 dark:text-slate-300 text-sm">
              Your most common trading style is <strong className="text-blue-600 dark:text-blue-400">{mostCommonStyle.label}</strong>, 
              with an average holding time of <strong>{mostCommonStats.avgTime}</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Mode Cards (Exactly 3) */}
      <h3 className="font-bold text-slate-900 dark:text-white text-lg mt-8 mb-2">Trading Modes</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {classifiedTrades.map(mode => {
          const stats = calculateStats(mode.trades);
          const isSelected = selectedMode === mode.id;
          
          return (
            <div 
              key={mode.id}
              onClick={() => setSelectedMode(isSelected ? null : mode.id)}
              className={`bg-white dark:bg-slate-800 border rounded-xl p-6 cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                isSelected 
                  ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md' 
                  : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-slate-600 shadow-sm'
              }`}
            >
              <div>
                <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-sm mb-4">{mode.label}</h3>
                
                <div className="grid grid-cols-2 gap-y-2 text-sm text-slate-600 dark:text-slate-300 mb-6 font-medium">
                  <div>{stats.count} Trades</div>
                  <div className={`text-right ${stats.winRate >= 50 ? 'text-emerald-500' : 'text-rose-500'}`}>{stats.winRate.toFixed(0)}% Win Rate</div>
                  <div>Avg. {stats.avgTime}</div>
                  <div className={`text-right font-bold ${stats.totalPnL >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {stats.totalPnL >= 0 ? '+' : ''}${stats.totalPnL.toFixed(2)} Total P&L
                  </div>
                </div>
              </div>

              {/* VISIBLE GRAPH CONTAINER */}
              <div className="w-full h-32 mt-auto border-t border-slate-100 dark:border-slate-700/50 pt-4 flex flex-col">
                <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-widest text-center mb-2">P&L Trend</div>
                <div className="flex-1 w-full relative">
                  {stats.count > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={stats.chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                        <Tooltip 
                          contentStyle={{ 
                            fontSize: '12px', 
                            padding: '8px', 
                            borderRadius: '8px',
                            border: 'none',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                          }} 
                        />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          stroke={stats.totalPnL >= 0 ? '#10b981' : '#f43f5e'} 
                          strokeWidth={2} 
                          dot={false}
                          activeDot={{ r: 4 }} 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400 font-medium">
                      No trades available
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {overall && (
        <div className="mt-8">
          <h3 className="font-bold text-slate-900 dark:text-white text-lg mb-4">Daily Performance</h3>
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Avg Trades / Day</div>
                <div className="text-xl font-bold text-slate-900 dark:text-white">{overall.avgTradesPerDay}</div>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Avg Profit / Day</div>
                <div className="text-xl font-bold text-emerald-500">+${overall.avgProfitPerDay}</div>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Avg Loss / Day</div>
                <div className="text-xl font-bold text-rose-500">-${overall.avgLossPerDay}</div>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Avg Net P&L / Day</div>
                <div className={`text-xl font-bold ${Number(overall.avgNetPerDay) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {Number(overall.avgNetPerDay) >= 0 ? '+' : ''}${overall.avgNetPerDay}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trade List */}
      {selectedMode && (
        <div className="mt-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">
              {selectedMode.toUpperCase()} TRADES
            </h3>
            <button onClick={() => setSelectedMode(null)} className="text-sm px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-semibold">
              Hide Trades
            </button>
          </div>
          <div className="max-h-[500px] overflow-y-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 sticky top-0 z-10">
              <tr>
                <th className="px-5 py-3 font-semibold uppercase tracking-wider text-xs">Symbol</th>
                <th className="px-5 py-3 font-semibold uppercase tracking-wider text-xs">Type</th>
                <th className="px-5 py-3 font-semibold uppercase tracking-wider text-xs">Size</th>
                <th className="px-5 py-3 font-semibold uppercase tracking-wider text-xs">Entry Price</th>
                <th className="px-5 py-3 font-semibold uppercase tracking-wider text-xs">Exit Price</th>
                <th className="px-5 py-3 font-semibold uppercase tracking-wider text-xs">Entry Time</th>
                <th className="px-5 py-3 font-semibold uppercase tracking-wider text-xs">Exit Time</th>
                <th className="px-5 py-3 font-semibold uppercase tracking-wider text-xs text-right">Net Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {displayedTrades.map(t => (
                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">{t.symbol}</td>
                  <td className={`px-5 py-4 font-bold ${t.type === 'Buy' ? 'text-blue-500' : 'text-rose-500'}`}>{t.type}</td>
                  <td className="px-5 py-4 text-slate-600 dark:text-slate-300 font-medium">{t.lotSize}</td>
                  <td className="px-5 py-4 text-slate-600 dark:text-slate-300 font-mono">{t.entryPrice}</td>
                  <td className="px-5 py-4 text-slate-600 dark:text-slate-300 font-mono">{t.exitPrice}</td>
                  <td className="px-5 py-4 text-slate-500 dark:text-slate-400 text-xs">{new Date(t.date).toLocaleString()}</td>
                  <td className="px-5 py-4 text-slate-500 dark:text-slate-400 text-xs">{t.exitTime ? new Date(t.exitTime).toLocaleString() : '-'}</td>
                  <td className={`px-5 py-4 font-bold text-right font-mono ${t.profit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {t.profit >= 0 ? '+' : ''}${t.profit.toFixed(2)}
                  </td>
                </tr>
              ))}
              {displayedTrades.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-500 text-base font-medium">No trades found for this filter.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  );
}
