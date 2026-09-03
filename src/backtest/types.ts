export interface BacktestSettings {
  symbol: string;
  timeframe: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  startingBalance: number;
  riskMode: 'risk_percent' | 'fixed_lot';
  riskPercent: number;
  fixedLot: number;
  rrRatio: string; // '1:1', '1:1.5', '1:2', '1:3', 'custom'
  stopLossMethod: 'manual' | 'atr' | 'swing_high_low' | 'fixed_pips';
  takeProfitMethod: 'manual' | 'rr' | 'fixed_pips';
  tradingSession: 'All' | 'London' | 'New York' | 'Tokyo';
  maxTradesPerDay: number;
  commissionPerLot: number;
  spreadPoints: number;
  slippagePoints: number;
}

export interface BacktestTrade {
  id: string;
  tradeNumber: number;
  entryTime: string; // ISO
  exitTime?: string; // ISO
  symbol: string;
  direction: 'Buy' | 'Sell';
  entryPrice: number;
  exitPrice?: number;
  stopLoss: number;
  takeProfit: number;
  lotSize: number;
  riskAmount: number;
  profit?: number;
  commission: number;
  spreadCost: number;
  slippageCost: number;
  result?: 'TP' | 'SL' | 'Manual Close' | 'Neutral'; // Neutral for exactly 0 profit
  rMultiple?: number;
  balanceAfter?: number;
  comment?: string;
  isOpen: boolean;
}

export interface EquityCurvePoint {
  time: string; // ISO or date string
  balance: number;
  drawdown: number; // percentage
}

export interface BacktestResults {
  startingBalance: number;
  endingBalance: number;
  netPnL: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number; // percentage
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  profitFactor: number;
  maxDrawdown: number; // percentage
  averageRR: number;
  totalFees: number; // commission + spread + slippage
  totalCommission: number;
  totalSpreadCost: number;
  totalSlippageCost: number;
  winningStreak: number;
  losingStreak: number;
  bestDay: number;
  worstDay: number;
  bestWeek: number;
  worstWeek: number;
  bestMonth: number;
  worstMonth: number;
}

export interface BacktestSession {
  id?: string;
  user_id?: string;
  name: string;
  symbol: string;
  timeframe: string;
  start_date: string;
  end_date: string;
  starting_balance: number;
  settings: BacktestSettings;
  results?: BacktestResults;
  equity_curve?: EquityCurvePoint[];
  status: 'draft' | 'running' | 'completed';
  strategy_name: string;
  strategy_config: any;
  created_at?: string;
  updated_at?: string;
}

export interface OhlcCandle {
  time: number | string; // Unix timestamp in seconds or string format depending on charting lib
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export type StrategySignalType = 'BUY' | 'SELL' | 'NONE';

export interface StrategySignal {
  type: StrategySignalType;
  stopLoss?: number;
  takeProfit?: number;
  reason?: string;
}
