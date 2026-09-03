import { IBacktestStrategy, StrategyConfigField } from './StrategyInterface';
import { OhlcCandle, StrategySignal } from '../types';

export class ManualStrategy implements IBacktestStrategy {
  name = 'Manual';
  id = 'manual';
  description = 'Manual trading. You execute BUY and SELL orders yourself using the control panel.';

  getDefaultConfig(): Record<string, any> {
    return {};
  }

  getConfigSchema(): StrategyConfigField[] {
    return []; // No configuration for manual mode
  }

  generateSignal(candles: OhlcCandle[], index: number, config: any): StrategySignal {
    // Manual strategy never generates automated signals
    return { type: 'NONE' };
  }
}
