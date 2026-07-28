import React from 'react';
import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  Award, 
  Zap, 
  Crown, 
  Sparkles, 
  Trophy, 
  ShieldAlert, 
  Gauge, 
  TrendingUp, 
  AlertTriangle, 
  Activity, 
  HeartPulse, 
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Wallet,
  Scale,
  PieChart,
  Hash
} from 'lucide-react';

export interface TradingAccountData {
  id: string;
  name: string;
  accountNumber?: string;
  broker?: string;
  type?: string;
  startingBalance: number;
  currentBalance: number;
  currency: string;
}

interface TraderRankCardProps {
  account: TradingAccountData | null;
  formatValue?: (val: number) => string;
  netProfit?: number;
  winRate?: number;
  winsCount?: number;
  totalTradesCount?: number;
}

export const TraderRankCard: React.FC<TraderRankCardProps> = ({ 
  account, 
  formatValue,
  netProfit,
  winRate,
  winsCount,
  totalTradesCount
}) => {
  const initialBalance = account?.startingBalance ?? 10000;
  const currentBalance = account?.currentBalance ?? 10000;
  const currency = account?.currency || 'USD';

  const defaultFormatter = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  const fmt = formatValue || defaultFormatter;

  // Growth Math
  const netDiff = currentBalance - initialBalance;
  const growthPct = initialBalance > 0 ? (netDiff / initialBalance) * 100 : 0;
  const isGrowth = growthPct >= 0;

  const netProfitVal = netProfit !== undefined ? netProfit : netDiff;
  const winRateVal = winRate !== undefined ? winRate : 0;
  const totalTradesVal = totalTradesCount !== undefined ? totalTradesCount : 0;
  const winsVal = winsCount !== undefined ? winsCount : 0;

  // Rank / Status Resolution
  const getRankData = () => {
    if (isGrowth) {
      // GROWTH RANKS
      if (growthPct <= 5) {
        // 0% - 5%: Disciplined
        const prog = Math.min(100, Math.max(0, (growthPct / 5) * 100));
        return {
          title: 'Disciplined',
          tierLabel: 'Tier 1 • Foundation Trader',
          isGrowth: true,
          icon: ShieldCheck,
          badgeBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/30',
          gradientBg: 'from-emerald-100 via-teal-50 to-transparent dark:from-emerald-500/10 dark:via-teal-500/5',
          barColor: 'bg-gradient-to-r from-emerald-500 to-teal-400',
          textColor: 'text-emerald-600 dark:text-emerald-400',
          progressPct: prog,
          nextMilestone: `Reach +5.0% Growth for Expert Trader (${(5 - growthPct).toFixed(1)}% remaining)`,
          targetRange: '0% – 5.0% Growth'
        };
      } else if (growthPct <= 10) {
        // >5% - 10%: Expert Trader
        const prog = Math.min(100, Math.max(0, ((growthPct - 5) / 5) * 100));
        return {
          title: 'Expert Trader',
          tierLabel: 'Tier 2 • Consistent Edge',
          isGrowth: true,
          icon: Award,
          badgeBg: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300 border-blue-300 dark:border-blue-500/30',
          gradientBg: 'from-blue-100 via-indigo-50 to-transparent dark:from-blue-500/10 dark:via-indigo-500/5',
          barColor: 'bg-gradient-to-r from-blue-500 to-indigo-500',
          textColor: 'text-blue-600 dark:text-blue-400',
          progressPct: prog,
          nextMilestone: `Reach +10.0% Growth for Master Rank (${(10 - growthPct).toFixed(1)}% remaining)`,
          targetRange: '5.0% – 10.0% Growth'
        };
      } else if (growthPct <= 20) {
        // >10% - 20%: Master
        const prog = Math.min(100, Math.max(0, ((growthPct - 10) / 10) * 100));
        return {
          title: 'Master',
          tierLabel: 'Tier 3 • Market Mastery',
          isGrowth: true,
          icon: Zap,
          badgeBg: 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300 border-purple-300 dark:border-purple-500/30',
          gradientBg: 'from-purple-100 via-indigo-50 to-transparent dark:from-purple-500/10 dark:via-indigo-500/5',
          barColor: 'bg-gradient-to-r from-purple-500 to-indigo-600',
          textColor: 'text-purple-600 dark:text-purple-400',
          progressPct: prog,
          nextMilestone: `Reach +20.0% Growth for Elite Rank (${(20 - growthPct).toFixed(1)}% remaining)`,
          targetRange: '10.0% – 20.0% Growth'
        };
      } else if (growthPct <= 50) {
        // >20% - 50%: Elite
        const prog = Math.min(100, Math.max(0, ((growthPct - 20) / 30) * 100));
        return {
          title: 'Elite',
          tierLabel: 'Tier 4 • High Performer',
          isGrowth: true,
          icon: Crown,
          badgeBg: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 border-amber-300 dark:border-amber-500/30',
          gradientBg: 'from-amber-100 via-yellow-50 to-transparent dark:from-amber-500/10 dark:via-yellow-500/5',
          barColor: 'bg-gradient-to-r from-amber-500 to-yellow-400',
          textColor: 'text-amber-600 dark:text-amber-400',
          progressPct: prog,
          nextMilestone: `Reach +50.0% Growth for Legend Rank (${(50 - growthPct).toFixed(1)}% remaining)`,
          targetRange: '20.0% – 50.0% Growth'
        };
      } else if (growthPct <= 80) {
        // >50% - 80%: Legend
        const prog = Math.min(100, Math.max(0, ((growthPct - 50) / 30) * 100));
        return {
          title: 'Legend',
          tierLabel: 'Tier 5 • Legendary Trader',
          isGrowth: true,
          icon: Sparkles,
          badgeBg: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300 border-rose-300 dark:border-rose-500/30',
          gradientBg: 'from-rose-100 via-orange-50 to-transparent dark:from-rose-500/10 dark:via-orange-500/5',
          barColor: 'bg-gradient-to-r from-rose-500 to-amber-500',
          textColor: 'text-rose-600 dark:text-rose-400',
          progressPct: prog,
          nextMilestone: `Reach +80.0% Growth for GOD Rank (${(80 - growthPct).toFixed(1)}% remaining)`,
          targetRange: '50.0% – 80.0% Growth'
        };
      } else {
        // >80%: GOD
        return {
          title: 'GOD',
          tierLabel: 'Apex Tier • Supreme Master',
          isGrowth: true,
          icon: Flame,
          badgeBg: 'bg-gradient-to-r from-amber-200 via-yellow-200 to-amber-200 text-amber-800 dark:from-amber-400/30 dark:via-yellow-300/40 dark:to-amber-500/30 dark:text-amber-100 border-amber-400 dark:border-amber-400/60 shadow-amber-500/20 shadow-lg',
          gradientBg: 'from-amber-100 via-yellow-50 to-amber-50 dark:from-amber-500/20 dark:via-yellow-500/10 dark:to-amber-600/5',
          barColor: 'bg-gradient-to-r from-yellow-400 via-amber-500 to-amber-300',
          textColor: 'text-amber-500 dark:text-amber-300',
          progressPct: 100,
          nextMilestone: '⚡ Maximum Rank Unlocked! GOD-tier performance achieved.',
          targetRange: '> 80.0% Growth',
          isSpecialGod: true,
          specialMessage: '⚡ GODLIKE PERFORMANCE! You have achieved supreme market mastery with over +80% capital growth.'
        };
      }
    } else {
      // DRAWDOWN STATUS SYSTEM (growthPct < 0)
      const absDrawdown = Math.abs(growthPct); // positive percentage e.g. 8.5%

      if (absDrawdown <= 5) {
        // 0% to -5%: Stable
        const prog = Math.min(100, Math.max(0, ((5 - absDrawdown) / 5) * 100));
        return {
          title: 'Stable',
          tierLabel: 'Minor Retracement',
          isGrowth: false,
          icon: ShieldAlert,
          badgeBg: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300 border-slate-300 dark:border-slate-400/30',
          gradientBg: 'from-slate-100 via-slate-50 to-transparent dark:from-slate-500/10 dark:via-slate-400/5',
          barColor: 'bg-gradient-to-r from-teal-500 to-emerald-400',
          textColor: 'text-slate-700 dark:text-slate-300',
          progressPct: prog,
          nextMilestone: `Recover +${absDrawdown.toFixed(1)}% to reach Break-even (Initial Balance)`,
          targetRange: '0% to -5.0% Drawdown'
        };
      } else if (absDrawdown <= 10) {
        // -5% to -10%: Under Pressure
        const prog = Math.min(100, Math.max(0, ((10 - absDrawdown) / 5) * 100));
        return {
          title: 'Under Pressure',
          tierLabel: 'Increased Exposure',
          isGrowth: false,
          icon: Gauge,
          badgeBg: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 border-amber-300 dark:border-amber-500/30',
          gradientBg: 'from-amber-100 via-orange-50 to-transparent dark:from-amber-500/10 dark:via-orange-500/5',
          barColor: 'bg-gradient-to-r from-amber-400 to-yellow-500',
          textColor: 'text-amber-700 dark:text-amber-400',
          progressPct: prog,
          nextMilestone: `Recover ${(absDrawdown - 5).toFixed(1)}% to restore Stable Status (-5.0%)`,
          targetRange: '-5.0% to -10.0% Drawdown'
        };
      } else if (absDrawdown <= 20) {
        // -10% to -20%: Recovery Mode
        const prog = Math.min(100, Math.max(0, ((20 - absDrawdown) / 10) * 100));
        return {
          title: 'Recovery Mode',
          tierLabel: 'Capital Preservation',
          isGrowth: false,
          icon: TrendingUp,
          badgeBg: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300 border-orange-300 dark:border-orange-500/30',
          gradientBg: 'from-orange-100 via-amber-50 to-transparent dark:from-orange-500/10 dark:via-amber-500/5',
          barColor: 'bg-gradient-to-r from-orange-500 to-amber-500',
          textColor: 'text-orange-600 dark:text-orange-400',
          progressPct: prog,
          nextMilestone: `Recover ${(absDrawdown - 10).toFixed(1)}% to exit Recovery Mode (-10.0%)`,
          targetRange: '-10.0% to -20.0% Drawdown'
        };
      } else if (absDrawdown <= 30) {
        // -20% to -30%: High Risk
        const prog = Math.min(100, Math.max(0, ((30 - absDrawdown) / 10) * 100));
        return {
          title: 'High Risk',
          tierLabel: 'Strict Risk Enforcement',
          isGrowth: false,
          icon: AlertTriangle,
          badgeBg: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300 border-rose-300 dark:border-rose-500/30',
          gradientBg: 'from-rose-100 via-red-50 to-transparent dark:from-rose-500/10 dark:via-red-500/5',
          barColor: 'bg-gradient-to-r from-rose-500 to-red-500',
          textColor: 'text-rose-600 dark:text-rose-400',
          progressPct: prog,
          nextMilestone: `Recover ${(absDrawdown - 20).toFixed(1)}% to reduce risk level (-20.0%)`,
          targetRange: '-20.0% to -30.0% Drawdown'
        };
      } else if (absDrawdown <= 50) {
        // -30% to -50%: Critical
        const prog = Math.min(100, Math.max(0, ((50 - absDrawdown) / 20) * 100));
        return {
          title: 'Critical',
          tierLabel: 'Severe Drawdown Warning',
          isGrowth: false,
          icon: Activity,
          badgeBg: 'bg-red-100 text-red-700 dark:bg-red-600/20 dark:text-red-200 border-red-300 dark:border-red-500/40',
          gradientBg: 'from-red-100 via-rose-50 to-transparent dark:from-red-600/15 dark:via-rose-600/5',
          barColor: 'bg-gradient-to-r from-red-600 to-rose-600',
          textColor: 'text-red-600 dark:text-red-400',
          progressPct: prog,
          nextMilestone: `Recover ${(absDrawdown - 30).toFixed(1)}% to exit Critical zone (-30.0%)`,
          targetRange: '-30.0% to -50.0% Drawdown'
        };
      } else {
        // Below -50%: Account Survivor
        const prog = Math.min(100, Math.max(0, ((100 - absDrawdown) / 50) * 100));
        return {
          title: 'Account Survivor',
          tierLabel: 'Extreme Market Resilience',
          isGrowth: false,
          icon: HeartPulse,
          badgeBg: 'bg-gradient-to-r from-red-200 via-rose-200 to-amber-200 text-red-700 dark:from-red-900/30 dark:via-rose-900/30 dark:to-amber-900/30 dark:text-rose-200 border-red-300 dark:border-rose-500/50',
          gradientBg: 'from-red-100 via-rose-50 to-amber-50 dark:from-red-950/20 dark:via-rose-950/10 dark:to-transparent',
          barColor: 'bg-gradient-to-r from-rose-600 via-red-500 to-amber-500',
          textColor: 'text-rose-500 dark:text-rose-400',
          progressPct: prog,
          nextMilestone: `Recover ${(absDrawdown - 50).toFixed(1)}% to leave Survivor status (-50.0%)`,
          targetRange: 'Below -50.0% Drawdown',
          isSpecialSurvivor: true,
          specialMessage: 'Every great trader has survived difficult markets. Refocus your strategy, protect remaining capital, and rebuild step-by-step.'
        };
      }
    }
  };

  const rankData = getRankData();
  const IconComponent = rankData.icon;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`relative overflow-hidden bg-[#fdfbf7] dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs hover:shadow-md transition-all duration-300 space-y-5 ${
        rankData.isSpecialGod ? 'ring-2 ring-amber-400/40 dark:ring-amber-400/30' : ''
      }`}
    >
      {/* Background Subtle Gradient Overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br ${rankData.gradientBg} pointer-events-none`} />

      {/* GOD Rank Celebratory Shimmer Animation */}
      {rankData.isSpecialGod && (
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-400/20 rounded-full blur-3xl animate-pulse pointer-events-none" />
      )}

      {/* Header Row: Title, Account Name & Animated Badge */}
      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Scale className="h-3.5 w-3.5 text-slate-400" />
              {isGrowth ? 'Trader Rank System' : 'Drawdown Protection System'}
            </span>
            {account && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
                {account.name}
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2 font-display">
            <span>{rankData.title}</span>
            {rankData.isSpecialGod && (
              <span className="inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 uppercase tracking-widest animate-bounce">
                Apex ⚡
              </span>
            )}
          </h2>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {rankData.tierLabel}
          </p>
        </div>

        {/* Animated Badge */}
        <motion.div 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
          className={`relative z-10 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border font-bold text-xs shadow-xs backdrop-blur-xs transition-all ${rankData.badgeBg}`}
        >
          <motion.div
            animate={rankData.isSpecialGod ? { rotate: [0, 10, -10, 0] } : { scale: [1, 1.15, 1] }}
            transition={{ repeat: Infinity, duration: 2.5 }}
          >
            <IconComponent className="h-4 w-4 shrink-0" />
          </motion.div>
          <span className="tracking-wide uppercase font-extrabold">{rankData.title}</span>
        </motion.div>
      </div>

      {/* GOD or Survivor Special Banner Message */}
      {rankData.specialMessage && (
        <motion.div 
          initial={{ scale: 0.98, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-start gap-3 shadow-2xs ${
            rankData.isSpecialGod
              ? 'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-200'
              : 'bg-rose-100 border-rose-300 text-rose-800 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-200'
          }`}
        >
          {rankData.isSpecialGod ? (
            <Trophy className="h-5 w-5 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
          ) : (
            <HeartPulse className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
          )}
          <p className="leading-relaxed font-medium">{rankData.specialMessage}</p>
        </motion.div>
      )}

      {/* Metrics Grid: Growth %, Initial Balance, Current Balance, Net Profit, Win Rate, Total Trades */}
      <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 bg-slate-50/80 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80">
        
        {/* Growth/Drawdown % */}
        <div className="space-y-0.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">
            {isGrowth ? 'Growth Rate' : 'Drawdown Rate'}
          </span>
          <div className="flex items-center gap-1">
            {isGrowth ? (
              <ArrowUpRight className="h-4 w-4 text-emerald-500 shrink-0" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-rose-500 shrink-0" />
            )}
            <span className={`text-base sm:text-lg font-black font-display ${isGrowth ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {isGrowth ? '+' : ''}{growthPct.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Initial Balance */}
        <div className="space-y-0.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">
            Initial Balance
          </span>
          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
            <Wallet className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="text-sm sm:text-base font-bold font-display truncate">
              {fmt(initialBalance)}
            </span>
          </div>
        </div>

        {/* Current Balance */}
        <div className="space-y-0.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">
            Current Balance
          </span>
          <div className="flex items-center gap-1.5 text-slate-900 dark:text-white">
            <Target className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
            <span className="text-sm sm:text-base font-extrabold font-display truncate">
              {fmt(currentBalance)}
            </span>
          </div>
        </div>

        {/* Net Profit */}
        <div className="space-y-0.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">
            Net Profit
          </span>
          <div className="flex items-center gap-1">
            <span className={`text-sm sm:text-base font-extrabold font-display truncate ${netProfitVal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {netProfitVal >= 0 ? '+' : ''}{fmt(netProfitVal)}
            </span>
          </div>
        </div>

        {/* Win Rate */}
        <div className="space-y-0.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">
            Win Rate
          </span>
          <div className="flex items-center gap-1.5 text-slate-900 dark:text-white">
            <PieChart className="h-3.5 w-3.5 text-blue-500 shrink-0" />
            <span className="text-sm sm:text-base font-extrabold font-display truncate">
              {winRateVal.toFixed(1)}%
            </span>
            <span className="text-[10px] text-slate-400 font-semibold shrink-0">
              ({winsVal}/{totalTradesVal})
            </span>
          </div>
        </div>

        {/* Total Trades */}
        <div className="space-y-0.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">
            Total Trades
          </span>
          <div className="flex items-center gap-1.5 text-slate-900 dark:text-white">
            <Hash className="h-3.5 w-3.5 text-purple-500 shrink-0" />
            <span className="text-sm sm:text-base font-extrabold font-display truncate">
              {totalTradesVal}
            </span>
          </div>
        </div>

      </div>

      {/* Progress / Loading Position Bar */}
      <div className="relative z-10 space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping inline-block" />
            Rank Progress Position
          </span>
          <span className="text-[11px] font-bold text-slate-400">
            {rankData.targetRange}
          </span>
        </div>

        {/* Progress Track */}
        <div className="relative h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200/60 dark:border-slate-700/60">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(5, rankData.progressPct)}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={`h-full rounded-full shadow-xs ${rankData.barColor}`}
          />
        </div>

        {/* Next Milestone Subtext */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
          <span className="font-medium truncate">{rankData.nextMilestone}</span>
          <span className="font-bold text-slate-700 dark:text-slate-200 shrink-0 ml-2">
            {rankData.progressPct.toFixed(0)}%
          </span>
        </div>
      </div>
    </motion.div>
  );
};
