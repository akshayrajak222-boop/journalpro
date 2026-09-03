import { IBacktestStrategy, StrategyConfigField } from './StrategyInterface';
import { OhlcCandle, StrategySignal } from '../types';

export class EMAStrategy implements IBacktestStrategy {
  name = 'EMA Crossover';
  id = 'ema_crossover';
  description = 'A standard exponential moving average crossover strategy. Generates a BUY signal when the fast EMA crosses above the slow EMA, and a SELL signal when it crosses below.';

  getDefaultConfig(): Record<string, any> {
    return {
      fastPeriod: 9,
      slowPeriod: 21,
      stopLossPips: 20,
      takeProfitPips: 40,
    };
  }

  getConfigSchema(): StrategyConfigField[] {
    return [
      {
        name: 'fastPeriod',
        label: 'Fast EMA Period',
        type: 'number',
        defaultValue: 9,
        min: 1,
        max: 200,
        description: 'Period for the faster moving average'
      },
      {
        name: 'slowPeriod',
        label: 'Slow EMA Period',
        type: 'number',
        defaultValue: 21,
        min: 1,
        max: 500,
        description: 'Period for the slower moving average'
      },
      {
        name: 'stopLossPips',
        label: 'Stop Loss (Pips)',
        type: 'number',
        defaultValue: 20,
        min: 0,
        description: 'Fixed stop loss in pips (0 to disable)'
      },
      {
        name: 'takeProfitPips',
        label: 'Take Profit (Pips)',
        type: 'number',
        defaultValue: 40,
        min: 0,
        description: 'Fixed take profit in pips (0 to disable)'
      }
    ];
  }

  // Calculate EMA for an array of values
  private calculateEMA(values: number[], period: number): number | null {
    if (values.length < period) return null;
    
    // SMA for the first EMA value
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += values[i];
    }
    let ema = sum / period;
    
    const multiplier = 2 / (period + 1);
    
    // Calculate EMA for the rest
    for (let i = period; i < values.length; i++) {
      ema = (values[i] - ema) * multiplier + ema;
    }
    
    return ema;
  }

  generateSignal(candles: OhlcCandle[], index: number, config: any): StrategySignal {
    // Need at least enough candles + 1 for crossover check
    const fastPeriod = config.fastPeriod || 9;
    const slowPeriod = config.slowPeriod || 21;
    
    if (index < slowPeriod) {
      return { type: 'NONE' };
    }
    
    // Extract closing prices
    const closingPrices = candles.slice(0, index + 1).map(c => c.close);
    
    // We need current EMA and previous EMA to check for a cross
    const currentFastEMA = this.calculateEMA(closingPrices, fastPeriod);
    const currentSlowEMA = this.calculateEMA(closingPrices, slowPeriod);
    
    const prevClosingPrices = closingPrices.slice(0, -1);
    const prevFastEMA = this.calculateEMA(prevClosingPrices, fastPeriod);
    const prevSlowEMA = this.calculateEMA(prevClosingPrices, slowPeriod);
    
    if (currentFastEMA === null || currentSlowEMA === null || prevFastEMA === null || prevSlowEMA === null) {
      return { type: 'NONE' };
    }
    
    // Current candle (the one that just closed)
    const currentCandle = candles[index];
    const pipSize = 0.0001; // Simplification, in a real scenario we'd need to pass the symbol spec to the strategy
    
    // Check for crossovers
    if (prevFastEMA <= prevSlowEMA && currentFastEMA > currentSlowEMA) {
      // Cross UP -> BUY
      const sl = config.stopLossPips ? currentCandle.close - (config.stopLossPips * pipSize) : 0;
      const tp = config.takeProfitPips ? currentCandle.close + (config.takeProfitPips * pipSize) : 0;
      
      return {
        type: 'BUY',
        stopLoss: sl > 0 ? sl : undefined,
        takeProfit: tp > 0 ? tp : undefined,
        reason: `Fast EMA (${fastPeriod}) crossed above Slow EMA (${slowPeriod})`
      };
    } 
    else if (prevFastEMA >= prevSlowEMA && currentFastEMA < currentSlowEMA) {
      // Cross DOWN -> SELL
      const sl = config.stopLossPips ? currentCandle.close + (config.stopLossPips * pipSize) : 0;
      const tp = config.takeProfitPips ? currentCandle.close - (config.takeProfitPips * pipSize) : 0;
      
      return {
        type: 'SELL',
        stopLoss: sl > 0 ? sl : undefined,
        takeProfit: tp > 0 ? tp : undefined,
        reason: `Fast EMA (${fastPeriod}) crossed below Slow EMA (${slowPeriod})`
      };
    }
    
    return { type: 'NONE' };
  }
}
