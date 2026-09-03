import React, { useState, useEffect, useRef } from 'react';
import { Play, FileText, BarChart2 } from 'lucide-react';
import BacktestSetupPanel from './BacktestSetupPanel';
import BacktestChart from './BacktestChart';
import BacktestControls from './BacktestControls';
import BacktestTradeEntry from './BacktestTradeEntry';
import BacktestTradeList from './BacktestTradeList';
import BacktestResultsPanel from './BacktestResultsPanel';
import { BacktestEngine } from '../../backtest/BacktestEngine';
import { BacktestSettings, OhlcCandle, BacktestTrade } from '../../backtest/types';
import { ManualStrategy } from '../../backtest/strategies/ManualStrategy';
import { EMAStrategy } from '../../backtest/strategies/EMAStrategy';

interface BacktestPageProps {
  theme: 'light' | 'dark';
  userId: string;
}

export default function BacktestPage({ theme, userId }: BacktestPageProps) {
  const [engine, setEngine] = useState<BacktestEngine | null>(null);
  const [status, setStatus] = useState<'setup' | 'running' | 'finished'>('setup');
  const [loading, setLoading] = useState(false);
  
  // States mapped from engine to React for UI updates
  const [cursor, setCursor] = useState(-1);
  const [currentCandle, setCurrentCandle] = useState<OhlcCandle | null>(null);
  const [openTrades, setOpenTrades] = useState<BacktestTrade[]>([]);
  const [closedTrades, setClosedTrades] = useState<BacktestTrade[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(500);

  // We need to keep a ref to the interval for play/pause in React context
  // though engine also tracks it.
  const playIntervalRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, []);

  const handleStart = async (settings: BacktestSettings, strategyId: string, strategyConfig: any) => {
    setLoading(true);
    try {
      // 1. Fetch OHLC data for the selected symbol, timeframe, and dates
      // We reuse the existing proxy
      const res = await fetch(`/api/chart/ohlc?symbol=${encodeURIComponent(settings.symbol)}&timeframe=${settings.timeframe}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      
      if (json.error) throw new Error(json.error);
      if (!json.candles || json.candles.length === 0) throw new Error("No data found");
      
      // Filter by dates
      const startTimestamp = new Date(settings.startDate).getTime() / 1000;
      const endTimestamp = new Date(settings.endDate).getTime() / 1000 + 86400; // include end date
      
      const filteredCandles = json.candles.filter((c: any) => c.time >= startTimestamp && c.time <= endTimestamp);
      
      if (filteredCandles.length === 0) {
        alert("No price data found in this date range. Try adjusting dates.");
        setLoading(false);
        return;
      }

      // 2. Init engine
      const newEngine = new BacktestEngine(settings, {
        onCandleAdvance: (c, candle) => {
          setCursor(c);
          setCurrentCandle(candle);
        },
        onTradeOpen: (trade) => {
          setOpenTrades(prev => [...prev, trade]);
        },
        onTradeClose: (trade) => {
          setOpenTrades(prev => prev.filter(t => t.id !== trade.id));
          setClosedTrades(prev => [...prev, trade]);
        },
        onFinished: (results) => {
          setStatus('finished');
          setIsPlaying(false);
          if (playIntervalRef.current) clearInterval(playIntervalRef.current);
        }
      });
      
      // 3. Set strategy
      if (strategyId === 'ema_crossover') {
        newEngine.setStrategy(new EMAStrategy(), strategyConfig);
      } else {
        newEngine.setStrategy(new ManualStrategy(), strategyConfig);
      }
      
      newEngine.setCandles(filteredCandles);
      setEngine(newEngine);
      setCursor(0);
      setCurrentCandle(filteredCandles[0]);
      setStatus('running');
      setOpenTrades([]);
      setClosedTrades([]);
      
    } catch (err: any) {
      alert("Failed to start backtest: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = () => {
    if (!engine || status === 'finished') return;
    setIsPlaying(true);
    playIntervalRef.current = setInterval(() => {
      engine.stepForward();
    }, speed);
  };

  const handlePause = () => {
    setIsPlaying(false);
    if (playIntervalRef.current) clearInterval(playIntervalRef.current);
  };

  const handleStep = () => {
    if (!engine || isPlaying || status === 'finished') return;
    engine.stepForward();
  };

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    if (isPlaying) {
      handlePause();
      setTimeout(() => {
        setIsPlaying(true);
        playIntervalRef.current = setInterval(() => {
          engine?.stepForward();
        }, newSpeed);
      }, 50);
    }
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset this backtest? All unsaved progress will be lost.")) {
      handlePause();
      setStatus('setup');
      setEngine(null);
      setCursor(-1);
      setCurrentCandle(null);
      setOpenTrades([]);
      setClosedTrades([]);
    }
  };

  if (status === 'setup') {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Backtest Engine</h1>
          <p className="text-sm text-slate-500 mt-1">Simulate strategies on historical data without risking real capital.</p>
        </div>
        <BacktestSetupPanel onStart={handleStart} isLoading={loading} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Controls */}
      <BacktestControls 
        isPlaying={isPlaying}
        onPlay={handlePlay}
        onPause={handlePause}
        onStepForward={handleStep}
        onReset={handleReset}
        speed={speed}
        onSpeedChange={handleSpeedChange}
        currentDate={currentCandle ? new Date((currentCandle.time as number) * 1000).toISOString() : undefined}
        isFinished={status === 'finished'}
      />
      
      {/* Chart */}
      <div className="flex-1" style={{ minHeight: '500px' }}>
        <BacktestChart 
          theme={theme}
          symbol={engine!.settings.symbol}
          backtestTrades={[...closedTrades, ...openTrades]}
          candles={engine?.getCandlesUpToCursor() || []}
        />
      </div>
      
      {/* Trade Entry & List Panels */}
      {status === 'running' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1">
            <BacktestTradeEntry 
              engine={engine!} 
              currentCandle={currentCandle} 
            />
          </div>
          <div className="md:col-span-2">
            <BacktestTradeList 
              openTrades={openTrades} 
              closedTrades={closedTrades}
              currentPrice={currentCandle?.close} 
            />
          </div>
        </div>
      )}

      {/* Results Panel */}
      {status === 'finished' && engine && (
        <BacktestResultsPanel 
          results={engine.calculateResults()}
          onClose={handleReset}
          onSave={async () => {
            const results = engine.calculateResults();
            const sessionData = {
              name: `Backtest - ${engine.settings.symbol} - ${new Date().toLocaleDateString()}`,
              symbol: engine.settings.symbol,
              timeframe: engine.settings.timeframe,
              start_date: engine.settings.startDate,
              end_date: engine.settings.endDate,
              starting_balance: engine.settings.startingBalance,
              settings: engine.settings,
              results: results,
              equity_curve: engine.equityCurve,
              status: 'completed',
              strategy_name: engine['strategy']?.name || 'Manual',
              strategy_config: engine['strategyConfig'] || {}
            };

            try {
              const res = await fetch('/api/backtest/sessions', {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'x-auth-user-id': userId // From props
                },
                body: JSON.stringify(sessionData)
              });
              if (!res.ok) throw new Error('Failed to save');
              alert('Session saved successfully!');
            } catch (err: any) {
              alert('Failed to save session: ' + err.message);
            }
          }}
        />
      )}
    </div>
  );
}
