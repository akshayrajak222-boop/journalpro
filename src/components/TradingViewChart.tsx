/**
 * TradingViewChart.tsx
 *
 * A professional candlestick chart built on TradingView Lightweight Charts™
 * (Apache 2.0 license).
 *
 * Features:
 *  - OHLC candlestick data fetched via the /api/chart/ohlc server proxy (Yahoo Finance)
 *  - Default symbol: XAUUSD
 *  - Timeframes: 1m, 5m, 15m, 30m, 1h, 4h, 1d
 *  - Symbol search input with autocomplete
 *  - Trade markers (BUY / SELL / win / loss colour-coded)
 *  - SL/TP/Entry/Exit price lines on selected trade
 *  - Scroll-to-trade when a journal row is selected
 *  - Marker click fires onTradeMarkerClick callback
 *  - Dark / light theme sync
 *  - Responsive via ResizeObserver
 *  - Error state — never crashes the page
 */

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  memo,
} from 'react';
import {
  createChart,
  ColorType,
  CrosshairMode,
  IChartApi,
  ISeriesApi,
  CandlestickSeries,
  SeriesMarker,
  Time,
  IPriceLine,
  createSeriesMarkers,
  ISeriesMarkersPluginApi,
} from 'lightweight-charts';
import { Search, RefreshCw, Maximize2, AlertCircle, TrendingUp, X } from 'lucide-react';
import { Trade } from '../types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface OhlcCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface TradingViewChartProps {
  /** Only the current user's trades — scoped by the parent (App.tsx) */
  trades: Trade[];
  theme: 'light' | 'dark';
  /** ID of a trade selected in the journal table */
  selectedTradeId?: string | null;
  /** Fired when the user clicks a trade marker on the chart */
  onTradeMarkerClick?: (tradeId: string) => void;
  /** Default initial symbol (e.g. 'XAUUSD') */
  initialSymbol?: string;
  /** Pass data directly to bypass the internal fetch (used by BacktestEngine) */
  overrideData?: OhlcCandle[];
  /** Hide the top control bar (symbol, timeframe, etc) */
  hideControls?: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TIMEFRAMES = [
  { label: '1m',  value: '1m'  },
  { label: '5m',  value: '5m'  },
  { label: '15m', value: '15m' },
  { label: '30m', value: '30m' },
  { label: '1H',  value: '1h'  },
  { label: '4H',  value: '4h'  },
  { label: '1D',  value: '1d'  },
];

const DEFAULT_TIMEFRAME = '1d';

// Popular symbols for autocomplete
const POPULAR_SYMBOLS = [
  'XAUUSD','XAGUSD','EURUSD','GBPUSD','USDJPY','USDCHF','USDCAD',
  'AUDUSD','NZDUSD','EURGBP','EURJPY','EURAUD','GBPJPY','EURCHF',
  'GBPAUD','AUDJPY','NZDJPY','USDCAD',
  'BTCUSD','ETHUSD','US30','US500','NAS100','USOIL',
];

// ─── Chart theme factory ──────────────────────────────────────────────────────

function getChartOptions(theme: 'light' | 'dark') {
  const isDark = theme === 'dark';
  return {
    layout: {
      background: { type: ColorType.Solid, color: isDark ? '#09090b' : '#ffffff' },
      textColor: isDark ? '#94a3b8' : '#64748b',
      fontFamily: "'Inter', 'ui-sans-serif', system-ui, sans-serif",
      fontSize: 11,
    },
    grid: {
      vertLines: { color: isDark ? '#1e293b' : '#f1f5f9' },
      horzLines: { color: isDark ? '#1e293b' : '#f1f5f9' },
    },
    crosshair: {
      mode: CrosshairMode.Normal,
      vertLine: {
        color: isDark ? '#475569' : '#94a3b8',
        labelBackgroundColor: isDark ? '#1e293b' : '#f8fafc',
      },
      horzLine: {
        color: isDark ? '#475569' : '#94a3b8',
        labelBackgroundColor: isDark ? '#1e293b' : '#f8fafc',
      },
    },
    rightPriceScale: {
      borderColor: isDark ? '#1e293b' : '#e2e8f0',
    },
    timeScale: {
      borderColor: isDark ? '#1e293b' : '#e2e8f0',
      timeVisible: true,
      secondsVisible: false,
    },
  };
}

const CANDLE_COLORS = {
  upColor: '#10b981',
  downColor: '#ef4444',
  borderUpColor: '#10b981',
  borderDownColor: '#ef4444',
  wickUpColor: '#10b981',
  wickDownColor: '#ef4444',
};

// ─── Marker builder ───────────────────────────────────────────────────────────

function buildMarkersForSymbol(trades: Trade[], symbol: string): SeriesMarker<Time>[] {
  const markers: SeriesMarker<Time>[] = [];

  const symbolTrades = trades.filter(
    t => t.symbol?.toUpperCase() === symbol.toUpperCase()
      && t.type !== 'Deposit'
      && t.type !== 'Withdrawal'
  );

  for (const trade of symbolTrades) {
    if (!trade.date) continue;
    const ts = Math.floor(new Date(trade.date).getTime() / 1000) as Time;
    const isWin = trade.profit >= 0;
    const isBuy = trade.type === 'Buy';

    // Entry marker
    markers.push({
      time: ts,
      position: isBuy ? 'belowBar' : 'aboveBar',
      color: isBuy ? '#3b82f6' : '#f97316',
      shape: isBuy ? 'arrowUp' : 'arrowDown',
      text: `${trade.type}`,
      id: `entry_${trade.id}`,
      size: 1.3,
    } as SeriesMarker<Time>);

    // Result marker (1-second offset to allow both markers on same candle)
    const exitTs = ((ts as number) + 1) as Time;
    markers.push({
      time: exitTs,
      position: isWin ? 'aboveBar' : 'belowBar',
      color: isWin ? '#10b981' : '#ef4444',
      shape: 'circle',
      text: `${trade.profit >= 0 ? '+' : ''}${trade.profit.toFixed(2)}`,
      id: `result_${trade.id}`,
      size: 0.8,
    } as SeriesMarker<Time>);
  }

  // Sort ascending by time (required by lightweight-charts)
  return markers.sort((a, b) => (a.time as number) - (b.time as number));
}

// ─── Main Component ───────────────────────────────────────────────────────────

const TradingViewChart = memo(function TradingViewChart({
  trades,
  theme,
  selectedTradeId,
  onTradeMarkerClick,
  initialSymbol = 'XAUUSD',
  overrideData,
  hideControls = false,
}: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const markersPluginRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const priceLineRefs = useRef<IPriceLine[]>([]);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const initDoneRef = useRef(false);

  const [symbol, setSymbol] = useState(initialSymbol);
  const [symbolInput, setSymbolInput] = useState(initialSymbol);
  const [timeframe, setTimeframe] = useState(DEFAULT_TIMEFRAME);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // ─── Chart initialisation ─────────────────────────────────────────────────

  const destroyChart = useCallback(() => {
    resizeObserverRef.current?.disconnect();
    resizeObserverRef.current = null;
    if (chartRef.current) {
      try { chartRef.current.remove(); } catch (_) {}
      chartRef.current = null;
    }
    seriesRef.current = null;
    markersPluginRef.current = null;
    priceLineRefs.current = [];
  }, []);

  const initChart = useCallback(() => {
    if (!containerRef.current) return;
    destroyChart();

    const chart = createChart(containerRef.current, {
      ...getChartOptions(theme),
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      handleScroll: true,
      handleScale: true,
    });

    const series = chart.addSeries(CandlestickSeries, CANDLE_COLORS);
    chartRef.current = chart;
    seriesRef.current = series;

    // Click handler to map chart click → trade selection
    chart.subscribeClick((param) => {
      if (!param.time || !onTradeMarkerClick) return;
      const clickedTime = param.time as number;
      const clickedTrade = trades.find(t => {
        if (!t.date || t.type === 'Deposit' || t.type === 'Withdrawal') return false;
        const ts = Math.floor(new Date(t.date).getTime() / 1000);
        return Math.abs(ts - clickedTime) < 300; // within 5 min window
      });
      if (clickedTrade) onTradeMarkerClick(clickedTrade.id);
    });

    // Resize observer for responsive behaviour
    resizeObserverRef.current = new ResizeObserver(() => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    });
    resizeObserverRef.current.observe(containerRef.current);
    initDoneRef.current = true;
  }, [theme, destroyChart]);

  // ─── Fetch OHLC data ──────────────────────────────────────────────────────

  const fetchData = useCallback(async (sym: string, tf: string) => {
    if (!seriesRef.current) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/chart/ohlc?symbol=${encodeURIComponent(sym)}&timeframe=${tf}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: { candles: OhlcCandle[]; error?: string } = await res.json();

      if (json.error) {
        setError(json.error);
        setLoading(false);
        return;
      }

      if (!json.candles || json.candles.length === 0) {
        setError('No price data available for this symbol and timeframe.');
        setLoading(false);
        return;
      }

      const data = json.candles.map(c => ({
        time: c.time as Time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));

      if (seriesRef.current) {
        seriesRef.current.setData(data);
        chartRef.current?.timeScale().scrollToRealTime();
      }
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('Failed to load chart data:', err);
      setError('Unable to load chart data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Use overrideData if provided, else fetch normally
  useEffect(() => {
    if (!initDoneRef.current) return;
    if (overrideData) {
      if (seriesRef.current && overrideData.length > 0) {
        seriesRef.current.setData(overrideData.map(c => ({ ...c, time: c.time as Time })));
        // Optional: Do not force scroll to realtime if we are replaying
      }
    } else {
      fetchData(symbol, timeframe);
    }
  }, [symbol, timeframe, fetchData, overrideData]);

  // ─── Apply trade markers ──────────────────────────────────────────────────

  const applyMarkers = useCallback(() => {
    if (!seriesRef.current) return;
    const markers = buildMarkersForSymbol(trades, symbol);
    // v5 API: use createSeriesMarkers plugin
    if (!markersPluginRef.current) {
      try {
        markersPluginRef.current = createSeriesMarkers(seriesRef.current, markers);
      } catch (_) {}
    } else {
      try { markersPluginRef.current.setMarkers(markers); } catch (_) {}
    }
  }, [trades, symbol]);

  // ─── Apply SL/TP price lines for the selected trade ───────────────────────

  const clearPriceLines = useCallback(() => {
    if (!seriesRef.current) return;
    for (const pl of priceLineRefs.current) {
      try { seriesRef.current.removePriceLine(pl); } catch (_) {}
    }
    priceLineRefs.current = [];
  }, []);

  const applySLTP = useCallback(() => {
    clearPriceLines();
    if (!selectedTradeId || !seriesRef.current) return;
    const trade = trades.find(t => t.id === selectedTradeId);
    if (!trade) return;

    const newLines: IPriceLine[] = [];
    const addLine = (price: number, color: string, title: string, style: number) => {
      if (!price || !seriesRef.current) return;
      try {
        newLines.push(seriesRef.current.createPriceLine({ price, color, lineWidth: 1, lineStyle: style, axisLabelVisible: true, title }));
      } catch (_) {}
    };

    addLine(trade.entryPrice, trade.type === 'Buy' ? '#3b82f6' : '#f97316', `Entry ${trade.type}`, 0);
    if (trade.stopLoss)   addLine(trade.stopLoss,   '#ef4444', 'SL', 2);
    if (trade.takeProfit) addLine(trade.takeProfit,  '#10b981', 'TP', 2);
    if (trade.exitPrice && trade.exitPrice !== trade.entryPrice) {
      addLine(trade.exitPrice, trade.profit >= 0 ? '#10b981' : '#ef4444', `Exit ${trade.profit >= 0 ? '✓' : '✗'}`, 1);
    }
    priceLineRefs.current = newLines;
  }, [selectedTradeId, trades, clearPriceLines]);

  // ─── Scroll chart to selected trade's date ────────────────────────────────

  useEffect(() => {
    if (!selectedTradeId || !chartRef.current) return;
    const trade = trades.find(t => t.id === selectedTradeId);
    if (!trade?.date) return;

    const ts = Math.floor(new Date(trade.date).getTime() / 1000) as Time;
    setTimeout(() => {
      if (!chartRef.current) return;
      try {
        chartRef.current.timeScale().scrollToPosition(-10, true);
        const coord = chartRef.current.timeScale().timeToCoordinate(ts);
        if (coord !== null) {
          // Already visible; just ensure it's in view
        }
      } catch (_) {}
    }, 200);
  }, [selectedTradeId, trades]);

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  // Init chart on mount, re-init on theme change
  useEffect(() => {
    initChart();
    return destroyChart;
  }, [theme]); // intentionally only [theme] to avoid unnecessary re-init

  // Fetch data whenever symbol or timeframe changes (and after chart is ready)
  useEffect(() => {
    if (!initDoneRef.current) return;
    const timer = setTimeout(() => fetchData(symbol, timeframe), 80);
    return () => clearTimeout(timer);
  }, [symbol, timeframe]);

  // Initial data load after chart init
  useEffect(() => {
    const timer = setTimeout(() => fetchData(symbol, timeframe), 100);
    return () => clearTimeout(timer);
  }, [theme]); // Re-fetch after theme re-init

  // Update markers when trades array or symbol changes
  useEffect(() => {
    applyMarkers();
  }, [applyMarkers]);

  // Update SL/TP lines when selection changes
  useEffect(() => {
    applySLTP();
  }, [applySLTP]);

  // ─── Symbol search handlers ───────────────────────────────────────────────

  const handleSymbolInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setSymbolInput(val);
    if (val.length === 0) {
      setSuggestions(POPULAR_SYMBOLS.slice(0, 10));
      setShowSuggestions(true);
    } else {
      const matches = POPULAR_SYMBOLS.filter(s => s.startsWith(val) && s !== val);
      setSuggestions(matches.slice(0, 8));
      setShowSuggestions(matches.length > 0);
    }
  };

  const commitSymbol = (sym?: string) => {
    const newSym = (sym || symbolInput).toUpperCase().trim();
    if (!newSym) return;
    setSymbol(newSym);
    setSymbolInput(newSym);
    setShowSuggestions(false);
  };

  // ─── Styles ───────────────────────────────────────────────────────────────

  const isDark = theme === 'dark';
  const cardBg     = isDark ? 'bg-[#09090b] border-slate-800' : 'bg-white border-slate-200';
  const controlBg  = isDark ? 'bg-[#18181b] border-slate-800' : 'bg-slate-50/80 border-slate-200';
  const textMuted  = isDark ? 'text-slate-400' : 'text-slate-500';
  const textMain   = isDark ? 'text-slate-100' : 'text-slate-900';
  const btnActive  = 'bg-blue-600 text-white shadow-sm';
  const btnInactive = isDark
    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200';
  const inputCls = isDark
    ? 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500 focus:ring-blue-500/30 focus:border-blue-500'
    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:ring-blue-500/30 focus:border-blue-500';

  const wrapperClass = isFullscreen
    ? 'fixed inset-0 z-[9999] flex flex-col'
    : 'relative flex flex-col w-full h-full min-h-[420px]';

  return (
    <div className={`${wrapperClass} ${cardBg} border rounded-xl overflow-hidden shadow-sm`}>

      {/* ─── Top Toolbar ──────────────────────────────────────────────────────── */}
      {!hideControls && (
        <div className="absolute top-4 left-4 right-4 z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm pointer-events-auto">

        {/* Symbol search */}
        <div className="relative flex-shrink-0">
          <div className="flex items-center gap-1">
            <div className="relative">
              <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 ${textMuted} pointer-events-none`} />
              <input
                type="text"
                value={symbolInput}
                onChange={handleSymbolInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitSymbol();
                  if (e.key === 'Escape') setShowSuggestions(false);
                }}
                onFocus={() => {
                  const matches = symbolInput
                    ? POPULAR_SYMBOLS.filter(s => s.includes(symbolInput)).slice(0, 8)
                    : POPULAR_SYMBOLS.slice(0, 10);
                  setSuggestions(matches);
                  setShowSuggestions(true);
                }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 180)}
                placeholder="XAUUSD"
                className={`pl-7 pr-2 py-1.5 text-xs font-bold uppercase rounded-lg border w-24 focus:outline-none focus:ring-2 transition ${inputCls}`}
              />
            </div>
            <button
              onClick={() => commitSymbol()}
              className={`text-xs font-semibold px-2 py-1.5 rounded-lg transition ${btnInactive}`}
            >
              Go
            </button>
          </div>

          {/* Autocomplete */}
          {showSuggestions && suggestions.length > 0 && (
            <div className={`absolute top-full left-0 mt-1 w-36 rounded-xl shadow-2xl border z-[100] overflow-hidden ${isDark ? 'bg-[#18181b] border-slate-700' : 'bg-white border-slate-200'}`}>
              {suggestions.map(s => (
                <button
                  key={s}
                  onMouseDown={() => commitSymbol(s)}
                  className={`w-full text-left px-3 py-1.5 text-xs font-bold hover:bg-blue-600 hover:text-white transition border-b last:border-0 ${isDark ? 'border-slate-800 text-slate-200' : 'border-slate-50 text-slate-700'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Active symbol badge */}
        <span className={`text-xs font-black tracking-wider px-2 py-1 rounded-md ${isDark ? 'bg-slate-800 text-indigo-300' : 'bg-indigo-50 text-indigo-700'}`}>
          {symbol}
        </span>

        <div className={`w-px h-4 ${isDark ? 'bg-slate-700' : 'bg-slate-200'} mx-0.5 flex-shrink-0`} />

        {/* Timeframe selector */}
        <div className="flex items-center gap-1 flex-shrink-0 flex-wrap">
          {TIMEFRAMES.map(tf => (
            <button
              key={tf.value}
              onClick={() => setTimeframe(tf.value)}
              className={`text-xs font-bold px-2 py-1 rounded-md transition ${timeframe === tf.value ? btnActive : btnInactive}`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        <div className="flex-1 min-w-0" />

        {/* Selected trade info pill */}
        {selectedTradeId && (() => {
          const t = trades.find(tr => tr.id === selectedTradeId);
          if (!t) return null;
          return (
            <div className={`hidden sm:flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded-lg ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-blue-50 text-blue-800'}`}>
              <span className={t.type === 'Buy' ? 'text-blue-500' : 'text-orange-500'}>{t.type}</span>
              <span>{t.symbol}</span>
              <span className="opacity-60">@{t.entryPrice}</span>
              {t.stopLoss && <span className="text-rose-500">SL:{t.stopLoss}</span>}
              {t.takeProfit && <span className="text-emerald-500">TP:{t.takeProfit}</span>}
              <span className={`font-black ${t.profit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {t.profit >= 0 ? '+' : ''}{t.profit.toFixed(2)}
              </span>
            </div>
          );
        })()}

        {/* Last updated label */}
        {lastUpdated && !loading && (
          <span className={`hidden lg:block text-[10px] ${textMuted} flex-shrink-0`}>
            {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}

        {/* Refresh */}
        <button
          onClick={() => fetchData(symbol, timeframe)}
          disabled={loading}
          title="Refresh"
          className={`p-1.5 rounded-lg transition flex-shrink-0 ${btnInactive}`}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-blue-500' : ''}`} />
        </button>

        {/* Fullscreen */}
        <button
          onClick={() => setIsFullscreen(f => !f)}
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          className={`p-1.5 rounded-lg transition flex-shrink-0 ${btnInactive}`}
        >
          {isFullscreen ? <X className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </button>
      </div>
      )}

      {/* ── Chart area ──────────────────────────────────────────────────── */}
      <div className="relative flex-1 min-h-0">
        <div ref={containerRef} className="absolute inset-0 w-full h-full" />

        {/* Loading overlay */}
        {loading && (
          <div className={`absolute inset-0 flex flex-col items-center justify-center gap-2 z-10 ${isDark ? 'bg-[#09090b]/85' : 'bg-white/85'} backdrop-blur-[1px]`}>
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className={`text-xs ${textMuted}`}>Loading {symbol}…</span>
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className={`absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 p-6 ${isDark ? 'bg-[#09090b]/96' : 'bg-white/96'}`}>
            <div className={`p-3 rounded-full ${isDark ? 'bg-slate-800' : 'bg-amber-50'}`}>
              <AlertCircle className="h-6 w-6 text-amber-500" />
            </div>
            <div className="text-center space-y-1">
              <p className={`text-sm font-semibold ${textMain}`}>Chart data unavailable</p>
              <p className={`text-xs max-w-xs leading-relaxed ${textMuted}`}>{error}</p>
            </div>
            <button
              onClick={() => fetchData(symbol, timeframe)}
              className="text-xs font-semibold px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {/* ── Bottom legend ────────────────────────────────────────────────── */}
      <div className={`flex items-center gap-3 px-3 py-2 border-t text-[10px] font-medium flex-shrink-0 ${controlBg}`}>
        <TrendingUp className={`h-3 w-3 ${textMuted} flex-shrink-0`} />
        <div className={`flex items-center gap-2.5 ${textMuted} flex-wrap`}>
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-blue-500" />BUY entry</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-orange-500" />SELL entry</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />Win</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-rose-500" />Loss</span>
          {selectedTradeId && <><span className="flex items-center gap-1 text-rose-400">— SL</span><span className="flex items-center gap-1 text-emerald-400">— TP</span></>}
        </div>
        <div className="flex-1" />
        <span className={`${textMuted} hidden sm:block`}>Powered by TradingView Lightweight Charts™</span>
      </div>
    </div>
  );
});

export default TradingViewChart;
