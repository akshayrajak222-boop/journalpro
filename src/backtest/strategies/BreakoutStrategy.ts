import { IBacktestStrategy, StrategyConfigField } from './StrategyInterface';
import { OhlcCandle, StrategySignal } from '../types';

export class BreakoutStrategy implements IBacktestStrategy {
  name = 'Support & Resistance Breakout';
  id = 'breakout';
  description = 'Trades breakouts of recent N-candle highs or lows.';

  getDefaultConfig() {
    return {
      lookback: 20,
      bufferPips: 2,
      direction: 'Both',
      stopLossPips: 20,
      takeProfitPips: 40
    };
  }

  getConfigSchema(): StrategyConfigField[] {
    return [
      { name: 'lookback', label: 'Lookback Period (Candles)', type: 'number', defaultValue: 20, min: 2 },
      { name: 'bufferPips', label: 'Breakout Buffer (Pips)', type: 'number', defaultValue: 2, min: 0 },
      { 
        name: 'direction', 
        label: 'Trade Direction', 
        type: 'select', 
        options: [
          { label: 'Both', value: 'Both' },
          { label: 'Long Only', value: 'Long Only' },
          { label: 'Short Only', value: 'Short Only' }
        ],
        defaultValue: 'Both'
      },
      { name: 'stopLossPips', label: 'Stop Loss (Pips)', type: 'number', defaultValue: 20, min: 0 },
      { name: 'takeProfitPips', label: 'Take Profit (Pips)', type: 'number', defaultValue: 40, min: 0 },
    ];
  }

  generateSignal(candles: OhlcCandle[], index: number, config: any): StrategySignal {
    if (index < config.lookback + 1) return { type: 'NONE' };

    // Find highest high and lowest low of the lookback period (excluding current candle)
    let highestHigh = -Infinity;
    let lowestLow = Infinity;
    
    for (let i = index - config.lookback; i < index; i++) {
      if (candles[i].high > highestHigh) highestHigh = candles[i].high;
      if (candles[i].low < lowestLow) lowestLow = candles[i].low;
    }

    const pipSize = 0.0001;
    const buffer = (config.bufferPips || 0) * pipSize;
    
    const upperLevel = highestHigh + buffer;
    const lowerLevel = lowestLow - buffer;

    const currentCandle = candles[index];

    const allowLong = config.direction === 'Both' || config.direction === 'Long Only';
    const allowShort = config.direction === 'Both' || config.direction === 'Short Only';

    // Breakout up
    if (allowLong && currentCandle.close > upperLevel) {
      return { 
        type: 'BUY',
        stopLoss: config.stopLossPips ? currentCandle.close - (config.stopLossPips * pipSize) : undefined,
        takeProfit: config.takeProfitPips ? currentCandle.close + (config.takeProfitPips * pipSize) : undefined,
        reason: 'Bullish Breakout'
      };
    }

    // Breakout down
    if (allowShort && currentCandle.close < lowerLevel) {
      return { 
        type: 'SELL',
        stopLoss: config.stopLossPips ? currentCandle.close + (config.stopLossPips * pipSize) : undefined,
        takeProfit: config.takeProfitPips ? currentCandle.close - (config.takeProfitPips * pipSize) : undefined,
        reason: 'Bearish Breakout'
      };
    }

    return { type: 'NONE' };
  }
}
