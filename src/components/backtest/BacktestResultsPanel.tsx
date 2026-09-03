import React from 'react';
import { BacktestResults } from '../../backtest/types';
import { Target, TrendingUp, TrendingDown, DollarSign, Activity, AlertCircle } from 'lucide-react';

interface BacktestResultsPanelProps {
  results: BacktestResults;
  onClose: () => void;
  onSave: () => void;
}

export default function BacktestResultsPanel({ results, onClose, onSave }: BacktestResultsPanelProps) {
  const isProfitable = results.netPnL >= 0;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg ${isProfitable ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'}`}>
            {isProfitable ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Backtest Completed</h2>
            <p className="text-sm text-slate-500">Summary of your strategy's performance</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-lg transition">
            Close
          </button>
          <button onClick={onSave} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition">
            Save Session
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Net Profit */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <DollarSign className="h-4 w-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider">Net PnL</h3>
          </div>
          <p className={`text-2xl font-black font-mono ${isProfitable ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {isProfitable ? '+' : ''}{results.netPnL.toFixed(2)}
          </p>
          <div className="mt-2 text-xs font-medium text-slate-500">
            Final Balance: <span className="text-slate-700 dark:text-slate-300 font-mono">${results.endingBalance.toFixed(2)}</span>
          </div>
        </div>

        {/* Win Rate */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <Target className="h-4 w-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider">Win Rate</h3>
          </div>
          <p className="text-2xl font-black font-mono text-slate-900 dark:text-white">
            {results.winRate.toFixed(1)}%
          </p>
          <div className="mt-2 text-xs font-medium text-slate-500">
            {results.winningTrades} Wins / {results.losingTrades} Losses
          </div>
        </div>

        {/* Profit Factor */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <Activity className="h-4 w-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider">Profit Factor</h3>
          </div>
          <p className="text-2xl font-black font-mono text-slate-900 dark:text-white">
            {results.profitFactor.toFixed(2)}
          </p>
          <div className="mt-2 text-xs font-medium text-slate-500">
            Avg Win: <span className="text-emerald-600 dark:text-emerald-400">${results.averageWin.toFixed(2)}</span> / Avg Loss: <span className="text-rose-600 dark:text-rose-400">${Math.abs(results.averageLoss).toFixed(2)}</span>
          </div>
        </div>

        {/* Max Drawdown */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <AlertCircle className="h-4 w-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider">Max Drawdown</h3>
          </div>
          <p className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400">
            {results.maxDrawdown.toFixed(2)}%
          </p>
          <div className="mt-2 text-xs font-medium text-slate-500">
            Total Trades: <span className="text-slate-700 dark:text-slate-300 font-mono">{results.totalTrades}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">Extremes</h4>
          <div className="bg-slate-50 dark:bg-slate-800/30 rounded-lg p-4 space-y-3 border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Largest Win</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400">+${results.largestWin.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Largest Loss</span>
              <span className="font-mono text-rose-600 dark:text-rose-400">${results.largestLoss.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-slate-200 dark:border-slate-700">
              <span className="text-slate-500">Max Win Streak</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">{results.winningStreak} trades</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Max Loss Streak</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">{results.losingStreak} trades</span>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">Costs</h4>
          <div className="bg-slate-50 dark:bg-slate-800/30 rounded-lg p-4 space-y-3 border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Total Commissions</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">${results.totalCommission.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Total Spread Cost</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">${results.totalSpreadCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Total Slippage Cost</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">${results.totalSlippageCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-slate-200 dark:border-slate-700">
              <span className="text-slate-500 font-bold">Total Fees Paid</span>
              <span className="font-mono font-bold text-rose-600 dark:text-rose-400">${results.totalFees.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
