import React, { useState, useEffect } from 'react';
import { ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { BacktestEngine } from '../../backtest/BacktestEngine';
import { OhlcCandle } from '../../backtest/types';
import { SYMBOL_SPECS, SYMBOL_ALIASES } from '../../backtest/symbolSpecs';

interface BacktestTradeEntryProps {
  engine: BacktestEngine;
  currentCandle: OhlcCandle | null;
}

export default function BacktestTradeEntry({ engine, currentCandle }: BacktestTradeEntryProps) {
  const [slPips, setSlPips] = useState(20);
  const [tpPips, setTpPips] = useState(40);
  
  if (!currentCandle) return null;

  const currentPrice = currentCandle.close;
  const sym = engine.settings.symbol.toUpperCase().trim();
  const spec = SYMBOL_SPECS[SYMBOL_ALIASES[sym] || sym] || { pipSize: 0.0001, pipValuePerLot: 10, contractSize: 100000 };
  
  const handleBuy = () => {
    const sl = currentPrice - (slPips * spec.pipSize);
    const tp = currentPrice + (tpPips * spec.pipSize);
    engine.openTrade('Buy', currentPrice, sl, tp, 'Manual Buy');
  };

  const handleSell = () => {
    const sl = currentPrice + (slPips * spec.pipSize);
    const tp = currentPrice - (tpPips * spec.pipSize);
    engine.openTrade('Sell', currentPrice, sl, tp, 'Manual Sell');
  };

  const buyLotSize = engine.calculateLotSize(currentPrice, currentPrice - (slPips * spec.pipSize));
  const sellLotSize = engine.calculateLotSize(currentPrice, currentPrice + (slPips * spec.pipSize));

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Manual Entry</h3>
        <div className="text-right">
          <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-0.5">Current Price</div>
          <div className="text-lg font-mono font-bold text-slate-900 dark:text-white leading-none">
            {currentPrice.toFixed(spec.pipSize < 0.01 ? 5 : 2)}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Stop Loss (Pips)</label>
          <input 
            type="number" 
            value={slPips} 
            onChange={(e) => setSlPips(Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Take Profit (Pips)</label>
          <input 
            type="number" 
            value={tpPips} 
            onChange={(e) => setTpPips(Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleBuy}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition flex flex-col items-center justify-center gap-1 group"
        >
          <div className="flex items-center gap-2">
            <ArrowUpCircle className="h-5 w-5 group-hover:-translate-y-1 transition-transform" />
            <span>BUY</span>
          </div>
          <span className="text-[10px] text-blue-200 font-mono">{buyLotSize.toFixed(2)} Lots</span>
        </button>
        
        <button
          onClick={handleSell}
          className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-lg transition flex flex-col items-center justify-center gap-1 group"
        >
          <div className="flex items-center gap-2">
            <ArrowDownCircle className="h-5 w-5 group-hover:translate-y-1 transition-transform" />
            <span>SELL</span>
          </div>
          <span className="text-[10px] text-orange-200 font-mono">{sellLotSize.toFixed(2)} Lots</span>
        </button>
      </div>
    </div>
  );
}
