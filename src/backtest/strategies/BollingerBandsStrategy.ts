import { IBacktestStrategy, StrategyConfigField } from './StrategyInterface';
import { OhlcCandle, StrategySignal } from '../types';

export class BollingerBandsStrategy implements IBacktestStrategy {
  name = 'Bollinger Bands';
  id = 'bollinger_bands';
  description = 'Trades mean-reversion when price closes outside the Bollinger Bands.';

  getDefaultConfig() {
    return {
      length: 20,
      stdDev: 2,
      direction: 'Both',
      stopLossPips: 20,
      takeProfitPips: 40
    };
  }

  getConfigSchema(): StrategyConfigField[] {
    return [
      { name: 'length', label: 'Period Length', type: 'number', defaultValue: 20, min: 2 },
      { name: 'stdDev', label: 'Standard Deviation', type: 'number', defaultValue: 2, min: 0.1, step: 0.1 },
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
    if (index < config.length) return { type: 'NONE' };

    // Calculate SMA
    let sum = 0;
    for (let i = index - config.length + 1; i <= index; i++) {
      sum += candles[i].close;
    }
    const sma = sum / config.length;

    // Calculate Variance & StdDev
    let varianceSum = 0;
    for (let i = index - config.length + 1; i <= index; i++) {
      varianceSum += Math.pow(candles[i].close - sma, 2);
    }
    const stdDev = Math.sqrt(varianceSum / config.length);

    const upperBand = sma + (config.stdDev * stdDev);
    const lowerBand = sma - (config.stdDev * stdDev);

    const currentCandle = candles[index];
    const prevCandle = candles[index - 1];

    const allowLong = config.direction === 'Both' || config.direction === 'Long Only';
    const allowShort = config.direction === 'Both' || config.direction === 'Short Only';
    const pipSize = 0.0001;

    // Price crossed below lower band and closed back above (Mean Reversion Buy)
    if (allowLong && prevCandle.close < lowerBand && currentCandle.close > lowerBand) {
      return { 
        type: 'BUY',
        stopLoss: config.stopLossPips ? currentCandle.close - (config.stopLossPips * pipSize) : undefined,
        takeProfit: config.takeProfitPips ? currentCandle.close + (config.takeProfitPips * pipSize) : undefined,
        reason: 'BB Mean Reversion Buy'
      };
    }

    // Price crossed above upper band and closed back below (Mean Reversion Sell)
    if (allowShort && prevCandle.close > upperBand && currentCandle.close < upperBand) {
      return { 
        type: 'SELL',
        stopLoss: config.stopLossPips ? currentCandle.close + (config.stopLossPips * pipSize) : undefined,
        takeProfit: config.takeProfitPips ? currentCandle.close - (config.takeProfitPips * pipSize) : undefined,
        reason: 'BB Mean Reversion Sell'
      };
    }

    return { type: 'NONE' };
  }
}
