import React, { useState, useEffect } from 'react';
import { BacktestSettings } from '../../backtest/types';
import { ALL_SYMBOLS } from '../../backtest/symbolSpecs';
import { Play, Settings2 } from 'lucide-react';
import { getAllStrategies, getStrategy } from '../../backtest/strategies/StrategyRegistry';

interface BacktestSetupPanelProps {
  onStart: (settings: BacktestSettings, strategyId: string, strategyConfig: any) => void;
  isLoading: boolean;
}

const DEFAULT_SETTINGS: BacktestSettings = {
  symbol: 'XAUUSD',
  timeframe: '1d',
  startDate: '2026-01-01',
  endDate: new Date().toISOString().split('T')[0],
  startingBalance: 10000,
  riskMode: 'risk_percent',
  riskPercent: 1.0,
  fixedLot: 0.1,
  rrRatio: '1:2',
  stopLossMethod: 'manual',
  takeProfitMethod: 'manual',
  tradingSession: 'All',
  maxTradesPerDay: 5,
  commissionPerLot: 7,
  spreadPoints: 1.5,
  slippagePoints: 0,
  maxDailyLoss: 0,
  maxConsecutiveLosses: 0,
  breakEvenTriggerR: 0,
  trailingStopDistancePips: 0
};

export default function BacktestSetupPanel({ onStart, isLoading }: BacktestSetupPanelProps) {
  const [settings, setSettings] = useState<BacktestSettings>(DEFAULT_SETTINGS);
  const [strategyId, setStrategyId] = useState('manual');
  const [strategyConfig, setStrategyConfig] = useState<any>({});

  useEffect(() => {
    const strat = getStrategy(strategyId);
    if (strat) {
      setStrategyConfig(strat.getDefaultConfig());
    }
  }, [strategyId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let parsedValue: any = value;
    
    if (type === 'number') {
      parsedValue = parseFloat(value);
    }
    
    setSettings(prev => ({ ...prev, [name]: parsedValue }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStart(settings, strategyId, strategyConfig);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
          <Settings2 className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">New Backtest Session</h2>
          <p className="text-sm text-slate-500">Configure parameters for historical replay</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Parameters */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider">Asset & Dates</h3>
            
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Symbol</label>
              <select 
                name="symbol" 
                value={settings.symbol} 
                onChange={handleChange}
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
              >
                {ALL_SYMBOLS.map(sym => (
                  <option key={sym} value={sym}>{sym}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Start Date</label>
              <input 
                type="date" 
                name="startDate" 
                value={settings.startDate} 
                onChange={handleChange}
                required
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">End Date</label>
              <input 
                type="date" 
                name="endDate" 
                value={settings.endDate} 
                onChange={handleChange}
                required
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
              />
            </div>
          </div>

          {/* Account & Risk */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider">Account & Risk</h3>
            
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Starting Balance (USD)</label>
              <input 
                type="number" 
                name="startingBalance" 
                value={settings.startingBalance} 
                onChange={handleChange}
                min={100}
                required
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Risk Mode</label>
              <select 
                name="riskMode" 
                value={settings.riskMode} 
                onChange={handleChange}
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
              >
                <option value="risk_percent">Risk % per Trade</option>
                <option value="fixed_lot">Fixed Lot Size</option>
              </select>
            </div>

            {settings.riskMode === 'risk_percent' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Risk %</label>
                <input 
                  type="number" 
                  name="riskPercent" 
                  value={settings.riskPercent} 
                  onChange={handleChange}
                  min={0.1} max={100} step={0.1}
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Fixed Lot</label>
                <input 
                  type="number" 
                  name="fixedLot" 
                  value={settings.fixedLot} 
                  onChange={handleChange}
                  min={0.01} step={0.01}
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
                />
              </div>
            )}
          </div>

          {/* Strategy & Costs */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider">Strategy & Costs</h3>
            
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Strategy</label>
              <select 
                value={strategyId} 
                onChange={(e) => setStrategyId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
              >
                {getAllStrategies().map(strat => (
                  <option key={strat.id} value={strat.id}>{strat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Commission per Lot ($)</label>
              <input 
                type="number" 
                name="commissionPerLot" 
                value={settings.commissionPerLot} 
                onChange={handleChange}
                min={0} step={0.5}
                required
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Spread (pts)</label>
                <input 
                  type="number" 
                  name="spreadPoints" 
                  value={settings.spreadPoints} 
                  onChange={handleChange}
                  min={0} step={0.1}
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Slippage</label>
                <input 
                  type="number" 
                  name="slippagePoints" 
                  value={settings.slippagePoints} 
                  onChange={handleChange}
                  min={0} step={0.1}
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Advanced Risk Management */}
        <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Advanced Risk Limits</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Max Daily Loss ($)</label>
              <input type="number" name="maxDailyLoss" value={settings.maxDailyLoss} onChange={handleChange} min="0" placeholder="0 = disable" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-sm outline-none" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Max Consec. Losses</label>
              <input type="number" name="maxConsecutiveLosses" value={settings.maxConsecutiveLosses} onChange={handleChange} min="0" placeholder="0 = disable" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-sm outline-none" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Break Even Trigger (R)</label>
              <input type="number" name="breakEvenTriggerR" value={settings.breakEvenTriggerR} onChange={handleChange} min="0" step="0.5" placeholder="0 = disable" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-sm outline-none" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Trailing Stop (Pips)</label>
              <input type="number" name="trailingStopDistancePips" value={settings.trailingStopDistancePips} onChange={handleChange} min="0" placeholder="0 = disable" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-sm outline-none" />
            </div>
          </div>
        </div>

        {/* Dynamic Strategy Configuration */}
        {strategyId !== 'manual' && getStrategy(strategyId) && (
          <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">{getStrategy(strategyId)?.name} Settings</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {getStrategy(strategyId)?.getConfigSchema().map(field => (
                <div key={field.name}>
                  <label className="block text-xs text-slate-500 mb-1" title={field.description}>{field.label}</label>
                  {field.type === 'select' ? (
                    <select
                      value={strategyConfig[field.name] ?? field.defaultValue}
                      onChange={(e) => setStrategyConfig({...strategyConfig, [field.name]: e.target.value})}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-sm outline-none"
                    >
                      {field.options?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  ) : field.type === 'boolean' ? (
                    <input 
                      type="checkbox" 
                      checked={strategyConfig[field.name] ?? field.defaultValue}
                      onChange={(e) => setStrategyConfig({...strategyConfig, [field.name]: e.target.checked})}
                      className="mt-1"
                    />
                  ) : (
                    <input 
                      type={field.type === 'number' ? 'number' : 'text'}
                      value={strategyConfig[field.name] ?? field.defaultValue}
                      onChange={(e) => setStrategyConfig({...strategyConfig, [field.name]: field.type === 'number' ? parseFloat(e.target.value) : e.target.value})}
                      min={field.min} max={field.max} step={field.step}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-sm outline-none"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg flex items-center gap-2 transition disabled:opacity-50"
          >
            {isLoading ? (
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Start Backtest
          </button>
        </div>
      </form>
    </div>
  );
}
