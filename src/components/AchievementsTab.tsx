import React from 'react';
import { Trophy, Lock, CheckCircle2, TrendingUp, Flame, Filter } from 'lucide-react';

export default function AchievementsTab({ user, trades }: { user?: any, trades?: any[] }) {
  // Compute start date from user creation or first trade
  const startDateStr = user?.createdAt 
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : (trades && trades.length > 0 
        ? new Date(Math.min(...trades.map(t => new Date(t.date).getTime()))).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'Today');

  // Simple streak calculation: count unique weeks traded
  const currentStreak = trades ? new Set(trades.map(t => {
    const d = new Date(t.date);
    d.setHours(0,0,0,0);
    const diff = d.getDate() - d.getDay();
    return new Date(d.setDate(diff)).toISOString(); // Unique string per week
  })).size : 0;
  
  const bestStreak = Math.max(currentStreak, 2); // Mock best streak based on current
  
  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side - Stats & Weekly Log */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full text-xs font-semibold mb-4 border border-blue-500/20">
              <Trophy className="h-4 w-4" />
              Collector Showcase
            </div>
            
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Achievements</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
              Track the milestones that mark your progress across accounts, journaling, and consistency.
            </p>



            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Recent Weekly Log</h3>
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">2/6 logged</span>
            </div>

            <div className="grid grid-cols-6 gap-2">
              {/* Missed Weeks */}
              {[
                { date: 'Aug 3 - 9' },
                { date: 'Aug 10 - 16' },
                { date: 'Aug 17 - 23' },
                { date: 'Aug 24 - 30' },
              ].map((week, i) => (
                <div key={i} className="bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 rounded-lg p-3 text-center flex flex-col items-center justify-between h-24">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{week.date}</div>
                  <div className="text-slate-400 dark:text-slate-600 font-bold">-</div>
                  <div className="text-xs font-semibold text-slate-400 dark:text-slate-500">Missed</div>
                </div>
              ))}
              {/* Logged Weeks */}
              {[
                { date: 'Aug 31 - Sep 6' },
                { date: 'This week' },
              ].map((week, i) => (
                <div key={i} className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-lg p-3 text-center flex flex-col items-center justify-between h-24">
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">{week.date}</div>
                  <div className="bg-emerald-100 dark:bg-emerald-500/20 p-1.5 rounded-full">
                    <Flame className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />
                  </div>
                  <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-500">Logged</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side - Streak Tracker */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 flex flex-col relative overflow-hidden">
          {/* Flame Icon Background */}
          <div className="absolute top-0 right-0 w-32 h-32 opacity-5 dark:opacity-10 blur-xl bg-blue-500 rounded-full translate-x-8 -translate-y-8"></div>
          
          <div className="flex justify-between items-start mb-6 z-10">
            <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 shadow-inner border border-slate-200 dark:border-slate-700 flex items-center justify-center w-24 h-24 relative overflow-hidden">
              {/* Background glow for the fire */}
              <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full"></div>
              {/* Hue-rotated 3D native emoji for a beautiful blue fire effect */}
              <div className="text-6xl leading-none relative z-10 select-none animate-pulse" style={{ filter: 'hue-rotate(200deg) saturate(1.5) drop-shadow(0 4px 12px rgba(59,130,246,0.6))' }}>
                🔥
              </div>
            </div>
            <div className="text-right flex flex-col items-end">
              <div className="inline-flex items-center whitespace-nowrap gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-[11px] font-bold mb-3 shadow-sm">
                <Flame className="h-3 w-3" />
                This week locked in
              </div>
              <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">2/12 weekly ranks</div>
            </div>
          </div>

          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1 z-10">{currentStreak}-week streak</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 z-10">
            Keep logging in weekly to climb the streak ladder.
          </p>

          <div className="grid grid-cols-2 gap-4 mb-8 z-10">
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700/50">
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Best run</div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">{bestStreak} weeks</div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700/50">
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Started</div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">{startDateStr}</div>
            </div>
          </div>

          <div className="mt-auto z-10">
            <div className="flex justify-between items-end mb-2">
              <div>
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Next streak rank</div>
                <div className="text-sm text-blue-600 dark:text-blue-400 font-medium mt-1">Flame Keeper: 2/4 weeks</div>
              </div>
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">2/12</div>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div className="bg-blue-500 h-full rounded-full" style={{ width: '50%' }}></div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
