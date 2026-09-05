import { IBacktestStrategy } from './StrategyInterface';
import { ManualStrategy } from './ManualStrategy';
import { EMAStrategy } from './EMAStrategy';
import { RSIStrategy } from './RSIStrategy';
import { MACDStrategy } from './MACDStrategy';
import { BollingerBandsStrategy } from './BollingerBandsStrategy';
import { BreakoutStrategy } from './BreakoutStrategy';

export const STRATEGY_REGISTRY: Record<string, IBacktestStrategy> = {
  'manual': new ManualStrategy(),
  'ema_crossover': new EMAStrategy(),
  'rsi': new RSIStrategy(),
  'macd': new MACDStrategy(),
  'bollinger_bands': new BollingerBandsStrategy(),
  'breakout': new BreakoutStrategy(),
};

export function getStrategy(id: string): IBacktestStrategy | undefined {
  return STRATEGY_REGISTRY[id];
}

export function getAllStrategies(): IBacktestStrategy[] {
  return Object.values(STRATEGY_REGISTRY);
}
