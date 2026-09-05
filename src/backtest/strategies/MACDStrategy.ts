import { IBacktestStrategy, StrategyConfigField } from './StrategyInterface';
import { OhlcCandle, StrategySignal } from '../types';

export class MACDStrategy implements IBacktestStrategy {
  name = 'MACD Cross';
  id = 'macd';
  description = 'Trades based on the MACD line crossing the Signal line.';

  getDefaultConfig() {
    return {
      fastLength: 12,
      slowLength: 26,
      signalLength: 9,
      direction: 'Both',
      stopLossPips: 20,
      takeProfitPips: 40
    };
  }

  getConfigSchema(): StrategyConfigField[] {
    return [
      { name: 'fastLength', label: 'Fast Length', type: 'number', defaultValue: 12, min: 1 },
      { name: 'slowLength', label: 'Slow Length', type: 'number', defaultValue: 26, min: 1 },
      { name: 'signalLength', label: 'Signal Length', type: 'number', defaultValue: 9, min: 1 },
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

  // Basic EMA helper
  private calculateEMA(values: number[], period: number): number | null {
    if (values.length < period) return null;
    let sum = 0;
    for (let i = 0; i < period; i++) sum += values[i];
    let ema = sum / period;
    const multiplier = 2 / (period + 1);
    for (let i = period; i < values.length; i++) {
      ema = (values[i] - ema) * multiplier + ema;
    }
    return ema;
  }

  generateSignal(candles: OhlcCandle[], index: number, config: any): StrategySignal {
    const minLength = config.slowLength + config.signalLength;
    if (index < minLength) return { type: 'NONE' };

    const prices = candles.slice(0, index + 1).map(c => c.close);
    
    // Calculate full MACD series
    const macdSeries: number[] = [];
    for (let i = config.slowLength; i < prices.length; i++) {
      const slice = prices.slice(0, i + 1);
      const fastEma = this.calculateEMA(slice, config.fastLength);
      const slowEma = this.calculateEMA(slice, config.slowLength);
      if (fastEma !== null && slowEma !== null) {
        macdSeries.push(fastEma - slowEma);
      }
    }

    if (macdSeries.length < config.signalLength + 1) return { type: 'NONE' };

    // Calculate signal line
    const signalSeries: number[] = [];
    for (let i = config.signalLength; i <= macdSeries.length; i++) {
      const slice = macdSeries.slice(0, i);
      const signalEma = this.calculateEMA(slice, config.signalLength);
      if (signalEma !== null) signalSeries.push(signalEma);
    }

    if (signalSeries.length < 2) return { type: 'NONE' };

    const currentMacd = macdSeries[macdSeries.length - 1];
    const prevMacd = macdSeries[macdSeries.length - 2];
    
    const currentSignal = signalSeries[signalSeries.length - 1];
    const prevSignal = signalSeries[signalSeries.length - 2];

    const allowLong = config.direction === 'Both' || config.direction === 'Long Only';
    const allowShort = config.direction === 'Both' || config.direction === 'Short Only';

    const pipSize = 0.0001;
    const price = candles[index].close;

    // Cross up
    if (allowLong && prevMacd <= prevSignal && currentMacd > currentSignal) {
      return { 
        type: 'BUY',
        stopLoss: config.stopLossPips ? price - (config.stopLossPips * pipSize) : undefined,
        takeProfit: config.takeProfitPips ? price + (config.takeProfitPips * pipSize) : undefined,
        reason: 'MACD Bullish Cross'
      };
    }

    // Cross down
    if (allowShort && prevMacd >= prevSignal && currentMacd < currentSignal) {
      return { 
        type: 'SELL',
        stopLoss: config.stopLossPips ? price + (config.stopLossPips * pipSize) : undefined,
        takeProfit: config.takeProfitPips ? price - (config.takeProfitPips * pipSize) : undefined,
        reason: 'MACD Bearish Cross'
      };
    }

    return { type: 'NONE' };
  }
}
