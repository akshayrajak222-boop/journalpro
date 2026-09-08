const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

function r(name, search, replacement) {
    if (code.includes(search)) {
        code = code.replace(search, replacement);
        console.log(`✅ ${name}`);
        return true;
    }
    const crlfSearch = search.replace(/\n/g, '\r\n');
    if (code.includes(crlfSearch)) {
        code = code.replace(crlfSearch, replacement.replace(/\n/g, '\r\n'));
        console.log(`✅ ${name} (CRLF)`);
        return true;
    }
    console.error(`❌ Could not match: ${name}`);
    return false;
}

// ===== 1. LAZY LOADING - fix the import block =====
r('Convert heavy imports to lazy',
`import TradingCalendar from './components/TradingCalendar';
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
import TradingTools from './components/TradingTools';`,
`// Eagerly loaded - used in sidebar, shell, or auth flows (always needed)
import GuidedTour from './components/GuidedTour';
import Logo from './components/Logo';
import LegalFooter from './components/LegalFooter';
import NextEventCard from './components/NextEventCard';
import LoginPage from './pages/LoginPage';

// Lazy loaded - only loaded when user navigates to that page (code splitting)
const TradingCalendar = React.lazy(() => import('./components/TradingCalendar'));
const FXNews = React.lazy(() => import('./components/FXNews'));
const MT5Automation = React.lazy(() => import('./components/MT5Automation'));
const AIInsights = React.lazy(() => import('./components/AIInsights'));
const AdminPanel = React.lazy(() => import('./components/AdminPanel'));
const TradingTools = React.lazy(() => import('./components/TradingTools'));
const TraderRankCard = React.lazy(() => import('./components/TraderRankCard').then(m => ({ default: m.TraderRankCard })));`
);

// ===== 2. ADD CACHE REFS =====
r('Add cache refs',
`  // FIX #2: Refs to guard against the onAuthStateChange / bootstrapSession
  // race condition and concurrent fetchAccountData calls.
  const bootstrapDoneRef = React.useRef(false);
  const isFetchingAccountsRef = React.useRef(false);`,
`  // FIX #2: Refs to guard against the onAuthStateChange / bootstrapSession
  // race condition and concurrent fetchAccountData calls.
  const bootstrapDoneRef = React.useRef(false);
  const isFetchingAccountsRef = React.useRef(false);

  // In-memory data cache to prevent redundant API calls when navigating between pages
  // TTL = 30s. Mutations (add/edit/delete trade/account) invalidate it via invalidateCache().
  const dataCacheRef = React.useRef<{
    ts: number;
    accounts: any[];
    trades: any[];
    riskSettings: any;
    tickets: any[];
    announcements: any[];
    accountId: string;
  } | null>(null);
  const DATA_CACHE_TTL_MS = 30_000;

  const isCacheValid = (accId?: string) => {
    if (!dataCacheRef.current) return false;
    if (Date.now() - dataCacheRef.current.ts >= DATA_CACHE_TTL_MS) return false;
    if (accId && dataCacheRef.current.accountId !== accId) return false;
    return true;
  };

  const invalidateCache = () => { dataCacheRef.current = null; };`
);

// ===== 3. USE CACHE IN fetchAccountData =====
r('Add cache check to fetchAccountData',
`  const fetchAccountData = async (overrideAccountId?: string) => {
    // FIX #4: Guard against concurrent fetches. If a fetch is already in flight,
    // skip this call to prevent an empty-data response from temporarily
    // overwriting real data that the first fetch is about to return.
    if (isFetchingAccountsRef.current) return;
    isFetchingAccountsRef.current = true;
    setLoading(true);`,
`  const fetchAccountData = async (overrideAccountId?: string) => {
    // Serve from cache if still fresh (navigation between pages won't re-fetch)
    if (!overrideAccountId && isCacheValid()) {
      const c = dataCacheRef.current!;
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
    setLoading(true);`
);

// ===== 4. POPULATE CACHE after successful fetch =====
r('Populate cache in fetchAccountData',
`      // Announcements
      const annRes = await authFetch('/api/announcements');
      const annData = await annRes.json();
      setAnnouncements(Array.isArray(annData.announcements) ? annData.announcements : []);

    } catch (e) {
      console.error('Error fetching dashboard tables:', e);
    } finally {
      setLoading(false);
      isFetchingAccountsRef.current = false;
    }`,
`      // Announcements
      const annRes = await authFetch('/api/announcements');
      const annData = await annRes.json();
      const loadedAnnouncements = Array.isArray(annData.announcements) ? annData.announcements : [];
      setAnnouncements(loadedAnnouncements);

    } catch (e) {
      console.error('Error fetching dashboard tables:', e);
    } finally {
      setLoading(false);
      isFetchingAccountsRef.current = false;
    }`
);

// ===== 5. INVALIDATE CACHE ON MUTATIONS =====
r('Add cache invalidation to fetchTradesAndParams',
`  const fetchTradesAndParams = async (accId: string) => {
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
  };`,
`  const fetchTradesAndParams = async (accId: string) => {
    try {
      const tradesRes = await authFetch(\`/api/trades?accountId=\${accId}\`);
      const tradesData = await tradesRes.json();
      setTrades(tradesData.trades || []);

      const riskRes = await authFetch(\`/api/risk-settings/\${accId}\`);
      const riskData = await riskRes.json();
      setRiskSettings(riskData.riskSettings || null);

      // Invalidate cache so the next navigation re-fetches fresh data
      invalidateCache();
    } catch (e) {
      console.error(e);
    }
  };`
);

// ===== 6. memoize formatValue with useCallback =====
r('Memoize formatValue with useCallback',
`  // UI Currency formatting
  const formatValue = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: activeAccount?.currency || 'USD'
    }).format(val);
  };`,
`  // UI Currency formatting — stable reference prevents child re-renders
  const formatValue = useCallback((val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: activeAccount?.currency || 'USD'
    }).format(val);
  }, [activeAccount?.currency]);`
);

fs.writeFileSync('src/App.tsx', code);
console.log('\n🎉 Second pass done!');
