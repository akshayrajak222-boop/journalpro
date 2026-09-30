import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Target, Trophy, ArrowRight, Activity, TrendingUp, Calendar, Zap, Shield, ChevronLeft } from 'lucide-react';
import { Trade, TradingAccount } from '../types';

interface ChallengesDashboardProps {
  trades: Trade[];
  accounts: TradingAccount[];
}

const CHALLENGES = [
  {
    id: '20-day-20-pip',
    title: '20-Day 20-Pip Challenge',
    shortDescription: 'Maintain a 20 pip average profit per trading day for 20 days.',
    description: 'The 20-Day 20-Pip Challenge is designed to build consistency and discipline. Your goal is to secure at least +20 pips per trading day. Only days with active trades count.',
    rules: [
      'Trade at least 1 position per day',
      'Achieve a net of +20 pips across all trades that day',
      'Maintain the streak for 20 trading days'
    ],
    durationDays: 20,
    targetType: 'pip',
    targetValue: 20
  },
  {
    id: '100-day-3-percent',
    title: '100-Day 3% Challenge',
    shortDescription: 'Achieve a 3% account growth consistently over 100 days.',
    description: 'Focus on steady, compounding growth rather than home runs. This challenge tests your ability to protect capital while aiming for a realistic 3% total growth.',
    rules: [
      'Protect your capital',
      'Achieve a total 3% account growth from the start date',
      'No single trade should risk more than 2%'
    ],
    durationDays: 100,
    targetType: 'percentage',
    targetValue: 3
  }
];

export default function ChallengesDashboard({ trades, accounts }: ChallengesDashboardProps) {
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null);
  const [joinedChallenges, setJoinedChallenges] = useState<Record<string, { startDate: string }>>({});

  useEffect(() => {
    const saved = localStorage.getItem('fxjp_challenges');
    if (saved) {
      try {
        setJoinedChallenges(JSON.parse(saved));
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const handleJoin = (id: string) => {
    const updated = { ...joinedChallenges, [id]: { startDate: new Date().toISOString() } };
    setJoinedChallenges(updated);
    localStorage.setItem('fxjp_challenges', JSON.stringify(updated));
  };

  const selectedChallenge = CHALLENGES.find(c => c.id === selectedChallengeId);

  // Group trades by date (YYYY-MM-DD)
  const tradesByDay = useMemo(() => {
    const groups: Record<string, Trade[]> = {};
    trades.forEach(t => {
      const dateStr = new Date(t.date).toISOString().split('T')[0];
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(t);
    });
    return groups;
  }, [trades]);

  const calculateProgress = (challenge: typeof CHALLENGES[0]) => {
    const joined = joinedChallenges[challenge.id];
    if (!joined) return { completedDays: 0, streak: 0, progressTracker: [], dailyPips: {} };

    const startDate = new Date(joined.startDate);
    startDate.setHours(0, 0, 0, 0);

    // Filter trades after start date
    const eligibleDates = Object.keys(tradesByDay)
      .filter(date => new Date(date) >= startDate)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    let completedDays = 0;
    let currentStreak = 0;
    const progressTracker: { date: string; success: boolean; value: number }[] = [];
    const dailyPips: Record<string, number> = {};

    let totalProfitPercentage = 0;

    eligibleDates.forEach(date => {
      const dayTrades = tradesByDay[date];
      
      if (challenge.targetType === 'pip') {
        // Approximate pips from profit if pip calculation is too complex without specs,
        // for demo purposes we assume 1 standard lot = $10 per pip. 
        // A simple heuristic: calculate sum of profits / 10 per lot.
        let totalPips = 0;
        dayTrades.forEach(t => {
          if (t.type === 'Buy' || t.type === 'Sell') {
            const priceDiff = t.type === 'Buy' ? t.exitPrice - t.entryPrice : t.entryPrice - t.exitPrice;
            // standard heuristic if pair has JPY, else standard
            const multiplier = t.symbol.includes('JPY') ? 100 : 10000; 
            totalPips += (priceDiff * multiplier);
          }
        });
        dailyPips[date] = totalPips;
        const success = totalPips >= challenge.targetValue;
        if (success) {
          completedDays++;
          currentStreak++;
        } else {
          currentStreak = 0;
        }
        progressTracker.push({ date, success, value: totalPips });
      } else if (challenge.targetType === 'percentage') {
        // Find the account balance to calculate %
        // Simplified: use starting balance of the active account or first account
        const account = accounts.find(a => a.id === dayTrades[0]?.accountId) || accounts[0];
        const balance = account ? account.startingBalance : 10000;
        
        let dailyProfit = 0;
        dayTrades.forEach(t => { dailyProfit += t.profit; });
        const dailyPercent = (dailyProfit / balance) * 100;
        totalProfitPercentage += dailyPercent;
        
        const success = totalProfitPercentage >= challenge.targetValue;
        if (success) {
          completedDays = challenge.durationDays; // reached target
        }
        progressTracker.push({ date, success, value: totalProfitPercentage });
      }
    });

    return { completedDays, streak: currentStreak, progressTracker, dailyPips, totalProfitPercentage };
  };

  return (
    <div className="w-full max-w-7xl mx-auto pb-12">
      <AnimatePresence mode="wait">
        {!selectedChallengeId ? (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                <Target className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Trading Challenges</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">Push your limits and build discipline.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {CHALLENGES.map((challenge, idx) => {
                const { completedDays, streak } = calculateProgress(challenge);
                const isJoined = !!joinedChallenges[challenge.id];
                const progressPercent = Math.min((completedDays / challenge.durationDays) * 100, 100);

                return (
                  <motion.div
                    key={challenge.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="group relative bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer flex flex-col"
                    onClick={() => setSelectedChallengeId(challenge.id)}
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                    
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-700 dark:text-slate-300 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/10 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        <Trophy className="h-6 w-6" />
                      </div>
                      {isJoined && (
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 text-xs font-bold rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                    
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{challenge.title}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 flex-grow">{challenge.shortDescription}</p>
                    
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
                        <span className="block text-xs font-medium text-slate-400 dark:text-slate-500 mb-1">Target</span>
                        <span className="block text-sm font-bold text-slate-700 dark:text-slate-200">
                          {challenge.targetType === 'pip' ? `+${challenge.targetValue} Pips/Day` : `${challenge.targetValue}% Growth`}
                        </span>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
                        <span className="block text-xs font-medium text-slate-400 dark:text-slate-500 mb-1">Duration</span>
                        <span className="block text-sm font-bold text-slate-700 dark:text-slate-200">
                          {challenge.durationDays} Days
                        </span>
                      </div>
                    </div>

                    {isJoined && (
                      <div className="mb-6">
                        <div className="flex justify-between text-xs font-bold mb-2">
                          <span className="text-slate-500">Progress</span>
                          <span className="text-indigo-600 dark:text-indigo-400">{completedDays} / {challenge.durationDays}</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-indigo-500 h-full rounded-full transition-all duration-1000"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                        <div className="flex items-center gap-2 mt-3 text-xs font-medium text-amber-600 dark:text-amber-500">
                          <Zap className="h-4 w-4" />
                          {streak} Day Streak
                        </div>
                      </div>
                    )}

                    <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {isJoined ? 'View Progress' : 'View Challenge'}
                      <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="details"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="space-y-6"
          >
            {selectedChallenge && (() => {
              const { completedDays, streak, progressTracker, totalProfitPercentage } = calculateProgress(selectedChallenge);
              const isJoined = !!joinedChallenges[selectedChallenge.id];
              const progressPercent = Math.min((completedDays / selectedChallenge.durationDays) * 100, 100);

              return (
                <>
                  <button 
                    onClick={() => setSelectedChallengeId(null)}
                    className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back to Challenges
                  </button>

                  <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
                      <div>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-3 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                            <Trophy className="h-6 w-6" />
                          </div>
                          {isJoined && (
                            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 text-xs font-bold rounded-full">
                              Active Challenge
                            </span>
                          )}
                        </div>
                        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">{selectedChallenge.title}</h1>
                        <p className="text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
                          {selectedChallenge.description}
                        </p>
                      </div>
                      {!isJoined ? (
                        <button 
                          onClick={() => handleJoin(selectedChallenge.id)}
                          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-sm whitespace-nowrap"
                        >
                          Join Challenge
                        </button>
                      ) : (
                        <div className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl whitespace-nowrap flex items-center gap-2">
                          <Activity className="h-4 w-4" /> Tracking Active
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 mb-2">
                          <Target className="h-5 w-5 text-indigo-500" />
                          <span className="font-bold">Target</span>
                        </div>
                        <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                          {selectedChallenge.targetType === 'pip' ? `+${selectedChallenge.targetValue} Pips/Day` : `${selectedChallenge.targetValue}% Total`}
                        </div>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 mb-2">
                          <Calendar className="h-5 w-5 text-blue-500" />
                          <span className="font-bold">Duration</span>
                        </div>
                        <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                          {selectedChallenge.durationDays} Days
                        </div>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 mb-2">
                          <Shield className="h-5 w-5 text-emerald-500" />
                          <span className="font-bold">Rules</span>
                        </div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white">
                          Strict parameters
                        </div>
                      </div>
                    </div>

                    <div className="mb-10">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Challenge Rules</h3>
                      <ul className="space-y-3">
                        {selectedChallenge.rules.map((rule, i) => (
                          <li key={i} className="flex items-start gap-3 text-slate-600 dark:text-slate-400">
                            <span className="mt-1 w-1.5 h-1.5 bg-indigo-500 rounded-full flex-shrink-0" />
                            {rule}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {isJoined && (
                      <div className="border-t border-slate-100 dark:border-slate-800 pt-8">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Your Progress</h3>
                          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500 font-bold bg-amber-50 dark:bg-amber-500/10 px-4 py-2 rounded-xl">
                            <Zap className="h-5 w-5" />
                            {streak} Day Streak
                          </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 mb-6">
                          <div className="flex justify-between text-sm font-bold mb-3">
                            <span className="text-slate-600 dark:text-slate-400">
                              {selectedChallenge.targetType === 'pip' ? 'Completed Days' : 'Total Progress'}
                            </span>
                            <span className="text-indigo-600 dark:text-indigo-400 text-lg">
                              {selectedChallenge.targetType === 'pip' 
                                ? `${completedDays} / ${selectedChallenge.durationDays} Days`
                                : `${totalProfitPercentage.toFixed(2)}% / ${selectedChallenge.targetValue}%`}
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 h-3 rounded-full overflow-hidden mb-4">
                            <div 
                              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-1000 relative"
                              style={{ width: `${progressPercent}%` }}
                            >
                              <div className="absolute top-0 right-0 bottom-0 left-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc4JyBoZWlnaHQ9JzgnPgo8cmVjdCB3aWR0aD0nOCcgaGVpZ2h0PSc4JyBmaWxsPSd0cmFuc3BhcmVudCcvPgo8cGF0aCBkPSdNMCA0TDQgMGg0TDQgOGgtNHonIGZpbGw9J3JnYmEoMjU1LDI1NSwyNTUsMC4xNSknLz4KPC9zdmc+')] opacity-50" />
                            </div>
                          </div>
                          <p className="text-xs text-slate-500 text-center font-medium">
                            Automatically tracking progress from your journaled trades.
                          </p>
                        </div>
                        
                        {progressTracker.length > 0 && (
                          <div>
                            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4">Recent Days</h4>
                            <div className="flex flex-wrap gap-2">
                              {progressTracker.slice(-10).map((pt, i) => (
                                <div 
                                  key={i} 
                                  className={`px-3 py-2 rounded-lg border text-xs font-bold flex flex-col items-center gap-1 ${
                                    pt.success 
                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400'
                                      : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                                  }`}
                                  title={pt.date}
                                >
                                  <span>{new Date(pt.date).toLocaleDateString(undefined, { weekday: 'short' })}</span>
                                  {pt.success ? <Trophy className="h-3 w-3" /> : <Activity className="h-3 w-3" />}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
