import { 
  BacktestSettings, 
  BacktestTrade, 
  BacktestResults, 
  OhlcCandle, 
  EquityCurvePoint,
  StrategySignal
} from './types';
import { calculateTradeProfit, SYMBOL_SPECS, SYMBOL_ALIASES } from './symbolSpecs';
import { IBacktestStrategy } from './strategies/StrategyInterface';

export interface BacktestEngineCallbacks {
  onCandleAdvance: (cursor: number, candle: OhlcCandle) => void;
  onTradeOpen: (trade: BacktestTrade) => void;
  onTradeClose: (trade: BacktestTrade) => void;
  onFinished: (results: BacktestResults) => void;
}

export class BacktestEngine {
  private candles: OhlcCandle[] = [];
  public cursor: number = -1;
  public settings: BacktestSettings;
  
  public currentBalance: number;
  public closedTrades: BacktestTrade[] = [];
  public openTrades: BacktestTrade[] = [];
  public equityCurve: EquityCurvePoint[] = [];
  
  private callbacks?: BacktestEngineCallbacks;
  private strategy: IBacktestStrategy | null = null;
  private strategyConfig: any = {};
  
  private isPlaying: boolean = false;
  private playIntervalId: any = null;

  constructor(settings: BacktestSettings, callbacks?: BacktestEngineCallbacks) {
    this.settings = settings;
    this.currentBalance = settings.startingBalance;
    this.callbacks = callbacks;
    this.equityCurve.push({
      time: settings.startDate, // Will be updated to first candle time
      balance: this.currentBalance,
      drawdown: 0
    });
  }

  public setStrategy(strategy: IBacktestStrategy, config: any) {
    this.strategy = strategy;
    this.strategyConfig = config;
  }

  public setCandles(candles: OhlcCandle[]) {
    this.candles = candles;
    this.cursor = 0; // Point to the first candle
    if (this.candles.length > 0 && this.equityCurve.length === 1) {
      this.equityCurve[0].time = new Date(this.candles[0].time as number * 1000).toISOString();
    }
  }

  public getCandlesUpToCursor(): OhlcCandle[] {
    if (this.cursor < 0 || this.candles.length === 0) return [];
    return this.candles.slice(0, this.cursor + 1);
  }

  public getCurrentCandle(): OhlcCandle | null {
    if (this.cursor >= 0 && this.cursor < this.candles.length) {
      return this.candles[this.cursor];
    }
    return null;
  }

  // Calculate lot size based on risk percent
  public calculateLotSize(entryPrice: number, stopLoss: number): number {
    if (this.settings.riskMode === 'fixed_lot') {
      return this.settings.fixedLot;
    }
    
    // Risk percent mode
    const riskAmount = this.currentBalance * (this.settings.riskPercent / 100);
    const sym = this.settings.symbol.toUpperCase().trim();
    const resolved = SYMBOL_ALIASES[sym] || sym;
    const spec = SYMBOL_SPECS[resolved];
    
    if (!spec || entryPrice === stopLoss) return 0.01; // fallback
    
    const pipsAtRisk = Math.abs(entryPrice - stopLoss) / spec.pipSize;
    if (pipsAtRisk <= 0) return 0.01;
    
    const pipValueTotal = riskAmount / pipsAtRisk;
    let lots = pipValueTotal / spec.pipValuePerLot;
    
    // Clamp limits, e.g. min 0.01, max 100
    lots = Math.max(0.01, Math.min(100, Math.floor(lots * 100) / 100));
    return lots;
  }

  // Opens a trade manually or via strategy
  public openTrade(direction: 'Buy' | 'Sell', entryPrice: number, sl: number, tp: number, comment?: string) {
    const currentCandle = this.getCurrentCandle();
    if (!currentCandle) return;
    
    // Enforce max trades per day
    if (this.settings.maxTradesPerDay > 0) {
      const todayString = new Date(currentCandle.time as number * 1000).toISOString().split('T')[0];
      const tradesToday = [...this.closedTrades, ...this.openTrades].filter(t => 
        t.entryTime.startsWith(todayString)
      ).length;
      
      if (tradesToday >= this.settings.maxTradesPerDay) {
        console.warn('Max trades per day reached.');
        return;
      }
    }

    const lots = this.calculateLotSize(entryPrice, sl);
    const riskAmount = this.currentBalance * (this.settings.riskPercent / 100); // Approximate if fixed lot
    
    const trade: BacktestTrade = {
      id: 'bt_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      tradeNumber: this.closedTrades.length + this.openTrades.length + 1,
      entryTime: new Date(currentCandle.time as number * 1000).toISOString(),
      symbol: this.settings.symbol,
      direction,
      entryPrice,
      stopLoss: sl,
      takeProfit: tp,
      lotSize: lots,
      riskAmount: this.settings.riskMode === 'fixed_lot' ? 0 : riskAmount,
      commission: this.settings.commissionPerLot * lots,
      spreadCost: (this.settings.spreadPoints * (SYMBOL_SPECS[SYMBOL_ALIASES[this.settings.symbol] || this.settings.symbol]?.pipValuePerLot || 10)) * lots, // Simplistic mapping
      slippageCost: 0,
      isOpen: true,
      comment
    };
    
    this.openTrades.push(trade);
    if (this.callbacks?.onTradeOpen) this.callbacks.onTradeOpen(trade);
  }
  
  public closeTrade(tradeId: string, exitPrice: number, exitTime: string, resultType: 'TP' | 'SL' | 'Manual Close' | 'Neutral', slippage: number = 0) {
    const index = this.openTrades.findIndex(t => t.id === tradeId);
    if (index === -1) return;
    
    const trade = this.openTrades[index];
    this.openTrades.splice(index, 1); // Remove from open
    
    trade.exitPrice = exitPrice;
    trade.exitTime = exitTime;
    trade.isOpen = false;
    trade.result = resultType;
    trade.slippageCost = slippage;
    
    const rawProfit = calculateTradeProfit(trade.symbol, trade.direction, trade.entryPrice, exitPrice, trade.lotSize) || 0;
    trade.profit = rawProfit - trade.commission - trade.spreadCost - trade.slippageCost;
    
    if (trade.riskAmount > 0) {
      trade.rMultiple = trade.profit / trade.riskAmount;
    } else {
      trade.rMultiple = 0;
    }
    
    this.currentBalance += trade.profit;
    trade.balanceAfter = this.currentBalance;
    
    this.closedTrades.push(trade);
    this.updateEquityCurve(exitTime);
    
    if (this.callbacks?.onTradeClose) this.callbacks.onTradeClose(trade);
  }

  private updateEquityCurve(timeStr: string) {
    const maxBalance = Math.max(this.settings.startingBalance, ...this.equityCurve.map(e => e.balance));
    const drawdown = this.currentBalance < maxBalance 
      ? ((maxBalance - this.currentBalance) / maxBalance) * 100 
      : 0;
      
    this.equityCurve.push({
      time: timeStr,
      balance: this.currentBalance,
      drawdown
    });
  }

  public stepForward() {
    if (this.cursor >= this.candles.length - 1) {
      this.pause();
      if (this.callbacks?.onFinished) this.callbacks.onFinished(this.calculateResults());
      return;
    }
    
    this.cursor++;
    const currentCandle = this.candles[this.cursor];
    const candleTimeStr = new Date(currentCandle.time as number * 1000).toISOString();
    
    // 1. Process Open Trades against this candle
    for (let i = this.openTrades.length - 1; i >= 0; i--) {
      const trade = this.openTrades[i];
      let hitSL = false;
      let hitTP = false;
      
      if (trade.direction === 'Buy') {
        hitSL = currentCandle.low <= trade.stopLoss;
        hitTP = currentCandle.high >= trade.takeProfit;
      } else {
        hitSL = currentCandle.high >= trade.stopLoss;
        hitTP = currentCandle.low <= trade.takeProfit;
      }
      
      if (hitSL && hitTP) {
        // CONSERVATIVE RULE: If both are hit in same candle, assume worst case (SL)
        // Add slippage logic here if needed based on settings
        this.closeTrade(trade.id, trade.stopLoss, candleTimeStr, 'SL', this.settings.slippagePoints * trade.lotSize * 10);
      } else if (hitSL) {
        this.closeTrade(trade.id, trade.stopLoss, candleTimeStr, 'SL', this.settings.slippagePoints * trade.lotSize * 10);
      } else if (hitTP) {
        this.closeTrade(trade.id, trade.takeProfit, candleTimeStr, 'TP', 0);
      }
    }
    
    // 2. Generate Signals from Strategy
    if (this.strategy && this.strategy.id !== 'manual') {
      const signal = this.strategy.generateSignal(this.getCandlesUpToCursor(), this.cursor, this.strategyConfig);
      
      if (signal.type === 'BUY' || signal.type === 'SELL') {
        // Determine SL/TP based on settings if not provided by strategy
        let sl = signal.stopLoss || 0;
        let tp = signal.takeProfit || 0;
        
        if (sl === 0 || tp === 0) {
           // For now, if the strategy didn't provide it, we might skip or use defaults.
           // In a full implementation, we'd apply ATR or swing logic here based on settings.
        }
        
        if (sl > 0 && tp > 0) {
          // Open trade at close price of the current candle (since signal is generated on close)
          this.openTrade(signal.type === 'BUY' ? 'Buy' : 'Sell', currentCandle.close, sl, tp, 'Strategy Signal');
        }
      }
    }
    
    if (this.callbacks?.onCandleAdvance) {
      this.callbacks.onCandleAdvance(this.cursor, currentCandle);
    }
  }
  
  public play(speedMs: number = 500) {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.playIntervalId = setInterval(() => {
      this.stepForward();
    }, speedMs);
  }
  
  public pause() {
    this.isPlaying = false;
    if (this.playIntervalId) {
      clearInterval(this.playIntervalId);
      this.playIntervalId = null;
    }
  }
  
  public calculateResults(): BacktestResults {
    const totalTrades = this.closedTrades.length;
    const winningTrades = this.closedTrades.filter(t => (t.profit || 0) > 0);
    const losingTrades = this.closedTrades.filter(t => (t.profit || 0) <= 0);
    
    const sumWins = winningTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
    const sumLosses = Math.abs(losingTrades.reduce((sum, t) => sum + (t.profit || 0), 0));
    
    let maxDrawdown = 0;
    if (this.equityCurve.length > 0) {
      maxDrawdown = Math.max(...this.equityCurve.map(e => e.drawdown));
    }
    
    // Streaks
    let currentWinStreak = 0, maxWinStreak = 0;
    let currentLossStreak = 0, maxLossStreak = 0;
    for (const t of this.closedTrades) {
      if ((t.profit || 0) > 0) {
        currentWinStreak++;
        currentLossStreak = 0;
        if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak;
      } else {
        currentLossStreak++;
        currentWinStreak = 0;
        if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak;
      }
    }

    return {
      startingBalance: this.settings.startingBalance,
      endingBalance: this.currentBalance,
      netPnL: this.currentBalance - this.settings.startingBalance,
      totalTrades,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0,
      averageWin: winningTrades.length > 0 ? sumWins / winningTrades.length : 0,
      averageLoss: losingTrades.length > 0 ? sumLosses / losingTrades.length : 0,
      largestWin: winningTrades.length > 0 ? Math.max(...winningTrades.map(t => t.profit || 0)) : 0,
      largestLoss: losingTrades.length > 0 ? Math.min(...losingTrades.map(t => t.profit || 0)) : 0,
      profitFactor: sumLosses > 0 ? sumWins / sumLosses : sumWins,
      maxDrawdown,
      averageRR: 0, // Simplified for now
      totalFees: this.closedTrades.reduce((s, t) => s + t.commission + t.spreadCost + t.slippageCost, 0),
      totalCommission: this.closedTrades.reduce((s, t) => s + t.commission, 0),
      totalSpreadCost: this.closedTrades.reduce((s, t) => s + t.spreadCost, 0),
      totalSlippageCost: this.closedTrades.reduce((s, t) => s + t.slippageCost, 0),
      winningStreak: maxWinStreak,
      losingStreak: maxLossStreak,
      bestDay: 0, // Placeholder
      worstDay: 0,
      bestWeek: 0,
      worstWeek: 0,
      bestMonth: 0,
      worstMonth: 0
    };
  }
}
