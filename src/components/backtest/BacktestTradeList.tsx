import React from 'react';
import { BacktestTrade } from '../../backtest/types';

interface BacktestTradeListProps {
  openTrades: BacktestTrade[];
  closedTrades: BacktestTrade[];
  currentPrice?: number;
}

export default function BacktestTradeList({ openTrades, closedTrades, currentPrice }: BacktestTradeListProps) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col h-full shadow-sm">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Trades</h3>
        <div className="flex gap-2 text-xs font-semibold">
          <span className="text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">Open: {openTrades.length}</span>
          <span className="text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">Closed: {closedTrades.length}</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto min-h-[200px]">
        {openTrades.length === 0 && closedTrades.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-slate-400">
            No trades taken yet
          </div>
        ) : (
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900/90 backdrop-blur border-b border-slate-100 dark:border-slate-800 text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-2 font-semibold">#</th>
                <th className="px-4 py-2 font-semibold">Status</th>
                <th className="px-4 py-2 font-semibold">Type</th>
                <th className="px-4 py-2 font-semibold">Lots</th>
                <th className="px-4 py-2 font-semibold">Entry Price</th>
                <th className="px-4 py-2 font-semibold">Exit Price</th>
                <th className="px-4 py-2 font-semibold text-right">Profit ($)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {[...openTrades].reverse().map(trade => (
                <tr key={trade.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{trade.tradeNumber}</td>
                  <td className="px-4 py-2">
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">
                      Open
                    </span>
                  </td>
                  <td className={`px-4 py-2 font-bold ${trade.direction === 'Buy' ? 'text-blue-600 dark:text-blue-400' : 'text-orange-500'}`}>
                    {trade.direction}
                  </td>
                  <td className="px-4 py-2 font-mono text-slate-700 dark:text-slate-300">{trade.lotSize.toFixed(2)}</td>
                  <td className="px-4 py-2 font-mono text-slate-700 dark:text-slate-300">{trade.entryPrice.toFixed(5)}</td>
                  <td className="px-4 py-2 font-mono text-slate-400">-</td>
                  <td className="px-4 py-2 text-right font-mono text-slate-400">-</td>
                </tr>
              ))}
              
              {[...closedTrades].reverse().map(trade => {
                const isWin = (trade.profit || 0) > 0;
                return (
                  <tr key={trade.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{trade.tradeNumber}</td>
                    <td className="px-4 py-2">
                      <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                        {trade.result}
                      </span>
                    </td>
                    <td className={`px-4 py-2 font-bold ${trade.direction === 'Buy' ? 'text-blue-600 dark:text-blue-400' : 'text-orange-500'}`}>
                      {trade.direction}
                    </td>
                    <td className="px-4 py-2 font-mono text-slate-700 dark:text-slate-300">{trade.lotSize.toFixed(2)}</td>
                    <td className="px-4 py-2 font-mono text-slate-700 dark:text-slate-300">{trade.entryPrice.toFixed(5)}</td>
                    <td className="px-4 py-2 font-mono text-slate-700 dark:text-slate-300">{trade.exitPrice?.toFixed(5)}</td>
                    <td className={`px-4 py-2 text-right font-mono font-bold ${isWin ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {isWin ? '+' : ''}{trade.profit?.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
