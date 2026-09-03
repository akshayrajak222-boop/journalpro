import { OhlcCandle, StrategySignal } from '../types';

export interface StrategyConfigField {
  name: string;
  label: string;
  type: 'number' | 'string' | 'select' | 'boolean';
  options?: { label: string; value: string | number }[];
  defaultValue: any;
  min?: number;
  max?: number;
  step?: number;
  description?: string;
}

export interface IBacktestStrategy {
  name: string;
  id: string; // unique identifier
  description: string;
  
  // Return the default configuration for the strategy
  getDefaultConfig(): Record<string, any>;
  
  // Return the schema for the configuration UI
  getConfigSchema(): StrategyConfigField[];
  
  // Called on each candle close.
  // candles: Array of all candles up to the current one (inclusive).
  // index: The index of the current candle in the array.
  // config: The user's configuration for this strategy.
  generateSignal(candles: OhlcCandle[], index: number, config: any): StrategySignal;
}
