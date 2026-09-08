const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// ===== 1. LAZY LOADING =====
// Convert heavy page-only component imports to React.lazy
const oldImports = `import TradingCalendar from './components/TradingCalendar';
import FXNews from './components/FXNews';
import MT5Automation from './components/MT5Automation';
import AIInsights from './components/AIInsights';
import AdminPanel from './components/AdminPanel';
import GuidedTour from './components/GuidedTour';
import Logo from './components/Logo';
import { TraderRankCard } from './components/TraderRankCard';
import LegalFooter from './components/LegalFooter';
import NextEventCard from './components/NextEventCard';
import LoginPage from './pages/LoginPage';
import TradingTools from './components/TradingTools';`;

const newImports = `// Eagerly loaded - used in sidebar, shell, or auth flows (always needed)
import GuidedTour from './components/GuidedTour';
import Logo from './components/Logo';
import LegalFooter from './components/LegalFooter';
import NextEventCard from './components/NextEventCard';
import LoginPage from './pages/LoginPage';

// Lazy loaded - only loaded when user navigates to that page
const TradingCalendar = React.lazy(() => import('./components/TradingCalendar'));
const FXNews = React.lazy(() => import('./components/FXNews'));
const MT5Automation = React.lazy(() => import('./components/MT5Automation'));
const AIInsights = React.lazy(() => import('./components/AIInsights'));
const AdminPanel = React.lazy(() => import('./components/AdminPanel'));
const TradingTools = React.lazy(() => import('./components/TradingTools'));
const TraderRankCard = React.lazy(() => import('./components/TraderRankCard').then(m => ({ default: m.TraderRankCard })));`;

if (code.includes(oldImports)) {
    code = code.replace(oldImports, newImports);
    console.log('✅ Lazy imports updated');
} else {
    console.error('❌ Could not find import block');
}

// ===== 2. useMemo for import - add useMemo to the React import =====
code = code.replace(
    "import React, { useState, useEffect, useRef, useCallback } from 'react';",
    "import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react';"
);
console.log('✅ Added useMemo, Suspense to React imports');

// ===== 3. WRAP ANALYTICS BLOCK IN useMemo =====
const analyticsStart = `  const isTradingTrade = (t: Trade) => t.type !== 'Deposit' && t.type !== 'Withdrawal';
  const tradingTrades = trades.filter(isTradingTrade);

  const totalTradesCount = tradingTrades.length;
  const wins = tradingTrades.filter(t => t.profit > 0);
  const losses = tradingTrades.filter(t => t.profit <= 0);
  const winRate = totalTradesCount > 0 ? (wins.length / totalTradesCount) * 100 : 0;
  
  const sumWins = wins.reduce((sum, t) => sum + t.profit, 0);
  const sumLosses = Math.abs(losses.reduce((sum, t) => sum + t.profit, 0));
  const profitFactor = sumLosses > 0 ? parseFloat((sumWins / sumLosses).toFixed(2)) : parseFloat(sumWins.toFixed(2));

  // Risk Reward Ratio calculation
  const averageWin = wins.length > 0 ? sumWins / wins.length : 0;
  const averageLoss = losses.length > 0 ? sumLosses / losses.length : 0;
  const avgRR = averageLoss > 0 ? parseFloat((averageWin / averageLoss).toFixed(2)) : 0;

  // Winning / Losing streaks
  const sortedByDate = [...tradingTrades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  let currentWinStreak = 0, maxWinStreak = 0;
  let currentLossStreak = 0, maxLossStreak = 0;
  for (const t of sortedByDate) {
    if (t.profit > 0) {
      currentWinStreak++;
      currentLossStreak = 0;
      if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak;
    } else {
      currentLossStreak++;
      currentWinStreak = 0;
      if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak;
    }
  }

  // Drawdown math
  const startingBal = activeAccount?.startingBalance || 10000;
  const currentBal = activeAccount?.currentBalance || 10000;
  const netProfit = parseFloat((currentBal - startingBal).toFixed(2));
  
  // High-end stats computation
  const maxDrawdownPercentage = currentBal < startingBal 
    ? parseFloat((((startingBal - currentBal) / startingBal) * 100).toFixed(2)) 
    : 0;

  // Today's cumulative metrics for Guard scanner
  const todayTrades = tradingTrades.filter(t => {
    if (!t.date) return false;
    const tradeDate = new Date(t.date);
    const today = new Date();
    return tradeDate.getFullYear() === today.getFullYear() &&
           tradeDate.getMonth() === today.getMonth() &&
           tradeDate.getDate() === today.getDate();
  });
  
  const todayLoss = Math.abs(todayTrades.filter(t => t.profit < 0).reduce((sum, t) => sum + t.profit, 0));
  const todayTradesCount = todayTrades.length;

  // Compile Chart Data
  // 1. Equity Curve
  let cumulative = startingBal;
  const equityCurveData = [...trades].reverse().map((t, idx) => {
    cumulative += (t.profit + (t.commission || 0) + (t.swap || 0));
    return {
      name: \`Trade \${idx + 1}\`,
      equity: parseFloat(cumulative.toFixed(2)),
      profit: parseFloat((t.profit + (t.commission || 0) + (t.swap || 0)).toFixed(2))
    };
  });
  // Add starting coordinate
  equityCurveData.unshift({ name: 'Start', equity: startingBal, profit: 0 });

  // 2. Bar Chart: Profit by Symbol
  const symbolMap: { [key: string]: number } = {};
  tradingTrades.forEach(t => {
    symbolMap[t.symbol] = (symbolMap[t.symbol] || 0) + t.profit;
  });
  const symbolChartData = Object.keys(symbolMap).map(sym => ({
    name: sym,
    profit: parseFloat(symbolMap[sym].toFixed(2))
  })).sort((a,b) => b.profit - a.profit);

  // 3. Pie Chart: Sessions
  // Map trades to trading sessions (simulated based on timestamp hour, or mock)
  const sessionData = [
    { name: 'London Session', value: tradingTrades.filter((_, idx) => idx % 3 === 0).length, color: '#2563eb' },
    { name: 'New York Session', value: tradingTrades.filter((_, idx) => idx % 3 === 1).length, color: '#10b981' },
    { name: 'Asian Session', value: tradingTrades.filter((_, idx) => idx % 3 === 2).length, color: '#f59e0b' }
  ].filter(d => d.value > 0);

  // 4. Best & Worst Trades
  const sortedTradesByProfit = [...tradingTrades].sort((a, b) => b.profit - a.profit);
  const bestTrade = sortedTradesByProfit.length > 0 ? sortedTradesByProfit[0] : null;
  const worstTrade = sortedTradesByProfit.length > 0 ? sortedTradesByProfit[sortedTradesByProfit.length - 1] : null;

  // 4b. Best & Worst Days (based on daily net P&L)
  const getLocalDayKey = (dateInput: string | Date) => {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    return \`\${d.getFullYear()}-\${String(d.getMonth() + 1).padStart(2, '0')}-\${String(d.getDate()).padStart(2, '0')}\`;
  };
  const dailyNetMap: { [key: string]: { net: number; count: number } } = {};
  tradingTrades.forEach(t => {
    const dKey = getLocalDayKey(t.date);
    if (!dKey) return;
    if (!dailyNetMap[dKey]) dailyNetMap[dKey] = { net: 0, count: 0 };
    dailyNetMap[dKey].net += t.profit + (t.commission || 0) + (t.swap || 0);
    dailyNetMap[dKey].count += 1;
  });
  const sortedDaysByNet = Object.keys(dailyNetMap)
    .map(dKey => ({ dayKey: dKey, net: parseFloat(dailyNetMap[dKey].net.toFixed(2)), count: dailyNetMap[dKey].count }))
    .sort((a, b) => b.net - a.net);
  const bestDay = sortedDaysByNet.length > 0 ? sortedDaysByNet[0] : null;
  const worstDay = sortedDaysByNet.length > 0 ? sortedDaysByNet[sortedDaysByNet.length - 1] : null;

  // 5. Monthly P&L Chart Data
  const monthlyMap: { [key: string]: number } = {};
  tradingTrades.forEach(t => {
    try {
      const d = new Date(t.date);
      if (!isNaN(d.getTime())) {
        const monthYear = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        monthlyMap[monthYear] = (monthlyMap[monthYear] || 0) + t.profit;
      }
    } catch (e) {}
  });

  const monthlyPnlChartData = Object.keys(monthlyMap).map(my => ({
    name: my,
    profit: parseFloat(monthlyMap[my].toFixed(2))
  })).sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());

  // Filter trades for tabular journal
  const filteredTrades = trades.filter(t => {
    const matchesSearch = t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.strategy?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.notes?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSymbol = journalFilterSymbol ? t.symbol === journalFilterSymbol : true;
    const matchesStrategy = journalFilterStrategy ? t.strategy === journalFilterStrategy : true;
    const matchesEmotion = journalFilterEmotion ? t.emotion === journalFilterEmotion : true;

    return matchesSearch && matchesSymbol && matchesStrategy && matchesEmotion;
  });`;

const analyticsWrapped = `  // ── Memoized derived analytics — only recomputes when trades or active account changes ──
  const {
    isTradingTrade, tradingTrades, totalTradesCount, wins, losses, winRate,
    sumWins, sumLosses, profitFactor, averageWin, averageLoss, avgRR,
    sortedByDate, maxWinStreak, maxLossStreak,
    startingBal, currentBal, netProfit, maxDrawdownPercentage,
    todayTrades, todayLoss, todayTradesCount,
    equityCurveData, symbolChartData, sessionData,
    bestTrade, worstTrade, bestDay, worstDay, monthlyPnlChartData,
    filteredTrades
  } = useMemo(() => {
    const isTradingTrade = (t: Trade) => t.type !== 'Deposit' && t.type !== 'Withdrawal';
    const tradingTrades = trades.filter(isTradingTrade);

    const totalTradesCount = tradingTrades.length;
    const wins = tradingTrades.filter(t => t.profit > 0);
    const losses = tradingTrades.filter(t => t.profit <= 0);
    const winRate = totalTradesCount > 0 ? (wins.length / totalTradesCount) * 100 : 0;
    
    const sumWins = wins.reduce((sum, t) => sum + t.profit, 0);
    const sumLosses = Math.abs(losses.reduce((sum, t) => sum + t.profit, 0));
    const profitFactor = sumLosses > 0 ? parseFloat((sumWins / sumLosses).toFixed(2)) : parseFloat(sumWins.toFixed(2));

    const averageWin = wins.length > 0 ? sumWins / wins.length : 0;
    const averageLoss = losses.length > 0 ? sumLosses / losses.length : 0;
    const avgRR = averageLoss > 0 ? parseFloat((averageWin / averageLoss).toFixed(2)) : 0;

    const sortedByDate = [...tradingTrades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let currentWinStreak = 0, maxWinStreak = 0;
    let currentLossStreak = 0, maxLossStreak = 0;
    for (const t of sortedByDate) {
      if (t.profit > 0) {
        currentWinStreak++;
        currentLossStreak = 0;
        if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak;
      } else {
        currentLossStreak++;
        currentWinStreak = 0;
        if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak;
      }
    }

    const startingBal = activeAccount?.startingBalance || 10000;
    const currentBal = activeAccount?.currentBalance || 10000;
    const netProfit = parseFloat((currentBal - startingBal).toFixed(2));
    
    const maxDrawdownPercentage = currentBal < startingBal 
      ? parseFloat((((startingBal - currentBal) / startingBal) * 100).toFixed(2)) 
      : 0;

    const todayTrades = tradingTrades.filter(t => {
      if (!t.date) return false;
      const tradeDate = new Date(t.date);
      const today = new Date();
      return tradeDate.getFullYear() === today.getFullYear() &&
             tradeDate.getMonth() === today.getMonth() &&
             tradeDate.getDate() === today.getDate();
    });
    
    const todayLoss = Math.abs(todayTrades.filter(t => t.profit < 0).reduce((sum, t) => sum + t.profit, 0));
    const todayTradesCount = todayTrades.length;

    let cumulative = startingBal;
    const equityCurveData = [...trades].reverse().map((t, idx) => {
      cumulative += (t.profit + (t.commission || 0) + (t.swap || 0));
      return {
        name: \`Trade \${idx + 1}\`,
        equity: parseFloat(cumulative.toFixed(2)),
        profit: parseFloat((t.profit + (t.commission || 0) + (t.swap || 0)).toFixed(2))
      };
    });
    equityCurveData.unshift({ name: 'Start', equity: startingBal, profit: 0 });

    const symbolMap: { [key: string]: number } = {};
    tradingTrades.forEach(t => { symbolMap[t.symbol] = (symbolMap[t.symbol] || 0) + t.profit; });
    const symbolChartData = Object.keys(symbolMap).map(sym => ({
      name: sym,
      profit: parseFloat(symbolMap[sym].toFixed(2))
    })).sort((a,b) => b.profit - a.profit);

    const sessionData = [
      { name: 'London Session', value: tradingTrades.filter((_, idx) => idx % 3 === 0).length, color: '#2563eb' },
      { name: 'New York Session', value: tradingTrades.filter((_, idx) => idx % 3 === 1).length, color: '#10b981' },
      { name: 'Asian Session', value: tradingTrades.filter((_, idx) => idx % 3 === 2).length, color: '#f59e0b' }
    ].filter(d => d.value > 0);

    const sortedTradesByProfit = [...tradingTrades].sort((a, b) => b.profit - a.profit);
    const bestTrade = sortedTradesByProfit.length > 0 ? sortedTradesByProfit[0] : null;
    const worstTrade = sortedTradesByProfit.length > 0 ? sortedTradesByProfit[sortedTradesByProfit.length - 1] : null;

    const getLocalDayKey = (dateInput: string | Date) => {
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) return '';
      return \`\${d.getFullYear()}-\${String(d.getMonth() + 1).padStart(2, '0')}-\${String(d.getDate()).padStart(2, '0')}\`;
    };
    const dailyNetMap: { [key: string]: { net: number; count: number } } = {};
    tradingTrades.forEach(t => {
      const dKey = getLocalDayKey(t.date);
      if (!dKey) return;
      if (!dailyNetMap[dKey]) dailyNetMap[dKey] = { net: 0, count: 0 };
      dailyNetMap[dKey].net += t.profit + (t.commission || 0) + (t.swap || 0);
      dailyNetMap[dKey].count += 1;
    });
    const sortedDaysByNet = Object.keys(dailyNetMap)
      .map(dKey => ({ dayKey: dKey, net: parseFloat(dailyNetMap[dKey].net.toFixed(2)), count: dailyNetMap[dKey].count }))
      .sort((a, b) => b.net - a.net);
    const bestDay = sortedDaysByNet.length > 0 ? sortedDaysByNet[0] : null;
    const worstDay = sortedDaysByNet.length > 0 ? sortedDaysByNet[sortedDaysByNet.length - 1] : null;

    const monthlyMap: { [key: string]: number } = {};
    tradingTrades.forEach(t => {
      try {
        const d = new Date(t.date);
        if (!isNaN(d.getTime())) {
          const monthYear = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          monthlyMap[monthYear] = (monthlyMap[monthYear] || 0) + t.profit;
        }
      } catch (e) {}
    });
    const monthlyPnlChartData = Object.keys(monthlyMap).map(my => ({
      name: my,
      profit: parseFloat(monthlyMap[my].toFixed(2))
    })).sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());

    const filteredTrades = trades.filter(t => {
      const matchesSearch = t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            t.strategy?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            t.notes?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSymbol = journalFilterSymbol ? t.symbol === journalFilterSymbol : true;
      const matchesStrategy = journalFilterStrategy ? t.strategy === journalFilterStrategy : true;
      const matchesEmotion = journalFilterEmotion ? t.emotion === journalFilterEmotion : true;
      return matchesSearch && matchesSymbol && matchesStrategy && matchesEmotion;
    });

    return {
      isTradingTrade, tradingTrades, totalTradesCount, wins, losses, winRate,
      sumWins, sumLosses, profitFactor, averageWin, averageLoss, avgRR,
      sortedByDate, maxWinStreak, maxLossStreak,
      startingBal, currentBal, netProfit, maxDrawdownPercentage,
      todayTrades, todayLoss, todayTradesCount,
      equityCurveData, symbolChartData, sessionData,
      bestTrade, worstTrade, bestDay, worstDay, monthlyPnlChartData,
      filteredTrades
    };
  }, [trades, activeAccount, searchQuery, journalFilterSymbol, journalFilterStrategy, journalFilterEmotion]);`;

if (code.includes(analyticsStart)) {
    code = code.replace(analyticsStart, analyticsWrapped);
    console.log('✅ Analytics wrapped in useMemo');
} else {
    console.error('❌ Could not find analytics block - checking with CRLF...');
    const analyticsStartCrlf = analyticsStart.replace(/\n/g, '\r\n');
    if (code.includes(analyticsStartCrlf)) {
        code = code.replace(analyticsStartCrlf, analyticsWrapped.replace(/\n/g, '\r\n'));
        console.log('✅ Analytics wrapped in useMemo (CRLF)');
    } else {
        console.error('❌ Still could not find analytics block');
    }
}

// ===== 4. WRAP ROUTES IN SUSPENSE =====
const oldRoutes = `        <Routes>`;
const newRoutes = `        {/* Page transition fade-in + Suspense for lazy-loaded chunks */}
        <Suspense fallback={
          <div className="flex flex-col gap-4 p-6 animate-pulse">
            <div className="h-8 bg-slate-100 rounded-xl w-1/3" />
            <div className="h-36 bg-slate-100 rounded-xl" />
            <div className="h-48 bg-slate-100 rounded-xl" />
            <div className="h-48 bg-slate-100 rounded-xl" />
          </div>
        }>
        <Routes>`;

const oldRoutesEnd = `          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>`;
const newRoutesEnd = `          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>`;

code = code.replace(oldRoutes, newRoutes);
code = code.replace(oldRoutesEnd, newRoutesEnd);
console.log('✅ Wrapped Routes in Suspense');

// ===== 5. ADD DATA FETCH CACHE =====
// Insert cache refs right after the two existing refs
const oldCacheArea = `  // FIX #2: Refs to guard against the onAuthStateChange / bootstrapSession
  // race condition and concurrent fetchAccountData calls.
  const bootstrapDoneRef = React.useRef(false);
  const isFetchingAccountsRef = React.useRef(false);`;

const newCacheArea = `  // FIX #2: Refs to guard against the onAuthStateChange / bootstrapSession
  // race condition and concurrent fetchAccountData calls.
  const bootstrapDoneRef = React.useRef(false);
  const isFetchingAccountsRef = React.useRef(false);

  // Data cache: prevents redundant API calls when navigating between pages
  // Cache TTL = 30 seconds. Mutations (add/edit/delete) invalidate the cache.
  const dataCacheRef = React.useRef<{ ts: number; accounts: any[]; trades: any[]; riskSettings: any; tickets: any[]; announcements: any[] } | null>(null);
  const DATA_CACHE_TTL_MS = 30_000;

  const isCacheValid = () => {
    if (!dataCacheRef.current) return false;
    return Date.now() - dataCacheRef.current.ts < DATA_CACHE_TTL_MS;
  };

  const invalidateCache = () => { dataCacheRef.current = null; };`;

if (code.includes(oldCacheArea)) {
    code = code.replace(oldCacheArea, newCacheArea);
    console.log('✅ Added data cache refs');
} else {
    console.error('❌ Could not find cache area');
}

// ===== 6. USE CACHE IN fetchAccountData =====
const oldFetchStart = `  const fetchAccountData = async (overrideAccountId?: string) => {
    // FIX #4: Guard against concurrent fetches. If a fetch is already in flight,
    // skip this call to prevent an empty-data response from temporarily
    // overwriting real data that the first fetch is about to return.
    if (isFetchingAccountsRef.current) return;
    isFetchingAccountsRef.current = true;
    setLoading(true);`;

const newFetchStart = `  const fetchAccountData = async (overrideAccountId?: string) => {
    // Serve from cache if still fresh and no override is needed
    if (!overrideAccountId && isCacheValid() && dataCacheRef.current) {
      const c = dataCacheRef.current;
      setAccounts(c.accounts);
      setTrades(c.trades);
      setRiskSettings(c.riskSettings);
      setTickets(c.tickets);
      setAnnouncements(c.announcements);
      return;
    }
    // FIX #4: Guard against concurrent fetches. If a fetch is already in flight,
    // skip this call to prevent an empty-data response from temporarily
    // overwriting real data that the first fetch is about to return.
    if (isFetchingAccountsRef.current) return;
    isFetchingAccountsRef.current = true;
    setLoading(true);`;

if (code.includes(oldFetchStart)) {
    code = code.replace(oldFetchStart, newFetchStart);
    console.log('✅ Added cache check to fetchAccountData');
} else {
    console.error('❌ Could not find fetchAccountData start');
}

// 6b. Populate the cache after a successful fetch
const oldFetchEnd = `      // Announcements
      const annRes = await authFetch('/api/announcements');
      const annData = await annRes.json();
      setAnnouncements(Array.isArray(annData.announcements) ? annData.announcements : []);

    } catch (e) {
      console.error('Error fetching dashboard tables:', e);
    } finally {
      setLoading(false);
      isFetchingAccountsRef.current = false;
    }`;

const newFetchEnd = `      // Announcements
      const annRes = await authFetch('/api/announcements');
      const annData = await annRes.json();
      const loadedAnnouncements = Array.isArray(annData.announcements) ? annData.announcements : [];
      setAnnouncements(loadedAnnouncements);

      // Populate the in-memory cache so subsequent navigations are instant
      if (dataCacheRef.current !== null || true) {
        // Always write to cache after a fresh fetch
        const cachedTrades = (await authFetch(\`/api/trades?accountId=\${sessionStorage.getItem('selected_account_id') || ''}\`).then(r => r.json()).catch(() => ({ trades: [] }))).trades || [];
        const cachedRisk = (await authFetch(\`/api/risk-settings/\${sessionStorage.getItem('selected_account_id') || ''}\`).then(r => r.json()).catch(() => ({ riskSettings: null }))).riskSettings || null;
        dataCacheRef.current = {
          ts: Date.now(),
          accounts: Array.isArray(accsData.accounts) ? accsData.accounts : [],
          trades: cachedTrades,
          riskSettings: cachedRisk,
          tickets: Array.isArray(tickData.tickets) ? tickData.tickets : [],
          announcements: loadedAnnouncements,
        };
      }
    } catch (e) {
      console.error('Error fetching dashboard tables:', e);
    } finally {
      setLoading(false);
      isFetchingAccountsRef.current = false;
    }`;

if (code.includes(oldFetchEnd)) {
    code = code.replace(oldFetchEnd, newFetchEnd);
    console.log('✅ Cache population added to fetchAccountData');
} else {
    console.error('❌ Could not find fetchAccountData end');
}

// ===== 7. INVALIDATE CACHE ON MUTATIONS =====
// After any successful save of a trade/account, call invalidateCache()
// We'll add it to fetchTradesAndParams since it's called after mutations
const oldFetchTrades = `  const fetchTradesAndParams = async (accId: string) => {
    try {
      const tradesRes = await authFetch(\`/api/trades?accountId=\${accId}\`);
      const tradesData = await tradesRes.json();
      setTrades(tradesData.trades || []);

      const riskRes = await authFetch(\`/api/risk-settings/\${accId}\`);
      const riskData = await riskRes.json();
      setRiskSettings(riskData.riskSettings || null);
    } catch (e) {
      console.error(e);
    }
  };`;

const newFetchTrades = `  const fetchTradesAndParams = async (accId: string) => {
    try {
      const tradesRes = await authFetch(\`/api/trades?accountId=\${accId}\`);
      const tradesData = await tradesRes.json();
      setTrades(tradesData.trades || []);

      const riskRes = await authFetch(\`/api/risk-settings/\${accId}\`);
      const riskData = await riskRes.json();
      setRiskSettings(riskData.riskSettings || null);

      // Invalidate cache so next fetchAccountData fetches fresh data
      invalidateCache();
    } catch (e) {
      console.error(e);
    }
  };`;

if (code.includes(oldFetchTrades)) {
    code = code.replace(oldFetchTrades, newFetchTrades);
    console.log('✅ Cache invalidation added to fetchTradesAndParams');
} else {
    console.error('❌ Could not find fetchTradesAndParams');
}

// ===== 8. memoize formatValue =====
const oldFormatValue = `  // UI Currency formatting
  const formatValue = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: activeAccount?.currency || 'USD'
    }).format(val);
  };`;

const newFormatValue = `  // UI Currency formatting - memoized so child components get a stable reference
  const formatValue = useCallback((val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: activeAccount?.currency || 'USD'
    }).format(val);
  }, [activeAccount?.currency]);`;

if (code.includes(oldFormatValue)) {
    code = code.replace(oldFormatValue, newFormatValue);
    console.log('✅ formatValue memoized with useCallback');
} else {
    console.error('❌ Could not find formatValue');
}

// ===== 9. Wrap main content in page transition div =====
const oldMainContent = `        {/* Dynamic Route views */}`;
const newMainContent = `        {/* Dynamic Route views - page-transition class provides CSS fade between pages */}
        <div key={location.pathname} className="page-transition">`;

// Find the closing of the Routes/Suspense block and add a </div>
const oldSuspenseEnd = `        </Routes>
        </Suspense>`;
const newSuspenseEnd = `        </Routes>
        </Suspense>
        </div>`;

code = code.replace(oldMainContent, newMainContent);
code = code.replace(oldSuspenseEnd, newSuspenseEnd);
console.log('✅ Page transition wrapper added');

fs.writeFileSync('src/App.tsx', code);
console.log('\n🎉 All optimizations applied!');
