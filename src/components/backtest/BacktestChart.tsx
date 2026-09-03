import React, { useMemo } from 'react';
import TradingViewChart from '../TradingViewChart';
import { Trade } from '../../types';
import { BacktestTrade } from '../../backtest/types';

interface BacktestChartProps {
  theme: 'light' | 'dark';
  backtestTrades: BacktestTrade[];
  symbol: string;
  selectedTradeId?: string | null;
  onTradeMarkerClick?: (tradeId: string) => void;
  isFinished?: boolean;
  candles: any[];
}

export default function BacktestChart({
  theme,
  backtestTrades,
  symbol,
  selectedTradeId,
  onTradeMarkerClick,
  isFinished,
  candles
}: BacktestChartProps) {
  
  // Map BacktestTrade to Journal Trade so TradingViewChart can render markers correctly
  const mappedTrades = useMemo<Trade[]>(() => {
    return backtestTrades.map(bt => {
      return {
        id: bt.id,
        accountId: 'backtest_acc',
        date: bt.entryTime, // Used for placing marker
        symbol: bt.symbol,
        type: bt.direction, // 'Buy' | 'Sell'
        lotSize: bt.lotSize,
        entryPrice: bt.entryPrice,
        exitPrice: bt.exitPrice || 0,
        stopLoss: bt.stopLoss,
        takeProfit: bt.takeProfit,
        profit: bt.profit || 0,
        commission: bt.commission,
        swap: 0,
        riskPercentage: 0,
        tags: [],
        notes: bt.comment,
        isMt5Sync: false
      } as Trade;
    });
  }, [backtestTrades]);

  return (
    <div className="relative h-full w-full flex flex-col">
      <div className="absolute top-4 right-20 z-10 bg-orange-500 text-white text-[10px] font-black tracking-wider px-2 py-1 rounded shadow-sm border border-orange-600 uppercase pointer-events-none">
        BACKTEST MODE
      </div>
      
      <div className="flex-1 min-h-[400px]">
        <TradingViewChart 
          trades={mappedTrades}
          theme={theme}
          initialSymbol={symbol}
          selectedTradeId={selectedTradeId}
          onTradeMarkerClick={onTradeMarkerClick}
          overrideData={candles}
          hideControls={true}
        />
      </div>
    </div>
  );
}
