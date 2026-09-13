import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  BarChart3, BookOpen, Calendar, Shield, ShieldOff, HelpCircle, User, 
  ChevronRight, Sparkles, TrendingUp, TrendingDown, Layers, 
  DollarSign, Plus, CheckCircle2, ArrowRight,
  LogOut, Star, Compass, Trash2, Check, Download, AlertTriangle,
  Clock, Heart, Tag, Edit3, Image as ImageIcon, Eye, EyeOff, RefreshCw, Radio,
  Cpu, Terminal, Globe, Bell, CreditCard, Info, Activity, Menu, Sun, Moon, Brain, Upload,
  FileSpreadsheet, FileText, Mail, Wrench, X, Newspaper, Trophy, Lock, Flame
} from 'lucide-react';
import { 
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

import { 
  User as UserType, 
  TradingAccount, 
  Trade, 
  RiskSettings, 
  SupportTicket, 
  Announcement 
} from './types';

import { supabase } from './supabaseClient';

import TradingCalendar from './components/TradingCalendar';
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
import TradingTools from './components/TradingTools';
import AchievementsTab from './components/AchievementsTab';


// ─── Symbol Contract Specifications ─────────────────────────────────────────
// contractSize = number of units per 1 standard lot
// pipValue     = USD value of 1 pip per 1 standard lot (for USD-quoted pairs)
// For pairs where profit currency != USD, we use a simplified conversion.
interface SymbolSpec {
  contractSize: number; // units per lot
  pipSize: number;      // 1 pip in price units (e.g. 0.0001 for EURUSD, 0.01 for USDJPY)
  pipValuePerLot: number; // USD value of 1 pip movement for 1 standard lot
}

const SYMBOL_SPECS: Record<string, SymbolSpec> = {
  // Forex Majors
  EURUSD: { contractSize: 100000, pipSize: 0.0001, pipValuePerLot: 10 },
  GBPUSD: { contractSize: 100000, pipSize: 0.0001, pipValuePerLot: 10 },
  AUDUSD: { contractSize: 100000, pipSize: 0.0001, pipValuePerLot: 10 },
  NZDUSD: { contractSize: 100000, pipSize: 0.0001, pipValuePerLot: 10 },
  USDCAD: { contractSize: 100000, pipSize: 0.0001, pipValuePerLot: 10 },
  USDCHF: { contractSize: 100000, pipSize: 0.0001, pipValuePerLot: 10 },
  USDJPY: { contractSize: 100000, pipSize: 0.01,   pipValuePerLot: 9.09 }, // ~$9.09 per pip (varies with JPY rate)
  // Forex Crosses EUR
  EURGBP: { contractSize: 100000, pipSize: 0.0001, pipValuePerLot: 12.5 },
  EURJPY: { contractSize: 100000, pipSize: 0.01,   pipValuePerLot: 9.09 },
  EURAUD: { contractSize: 100000, pipSize: 0.0001, pipValuePerLot: 6.5 },
  EURCAD: { contractSize: 100000, pipSize: 0.0001, pipValuePerLot: 7.4 },
  EURCHF: { contractSize: 100000, pipSize: 0.0001, pipValuePerLot: 11.2 },
  EURNZD: { contractSize: 100000, pipSize: 0.0001, pipValuePerLot: 6.1 },
  // Forex Crosses GBP
  GBPJPY: { contractSize: 100000, pipSize: 0.01,   pipValuePerLot: 9.09 },
  GBPAUD: { contractSize: 100000, pipSize: 0.0001, pipValuePerLot: 6.5 },
  GBPCAD: { contractSize: 100000, pipSize: 0.0001, pipValuePerLot: 7.4 },
  GBPCHF: { contractSize: 100000, pipSize: 0.0001, pipValuePerLot: 11.2 },
  GBPNZD: { contractSize: 100000, pipSize: 0.0001, pipValuePerLot: 6.1 },
  // Forex Crosses AUD
  AUDJPY: { contractSize: 100000, pipSize: 0.01,   pipValuePerLot: 9.09 },
  AUDCAD: { contractSize: 100000, pipSize: 0.0001, pipValuePerLot: 7.4 },
  AUDCHF: { contractSize: 100000, pipSize: 0.0001, pipValuePerLot: 11.2 },
  AUDNZD: { contractSize: 100000, pipSize: 0.0001, pipValuePerLot: 6.1 },
  // Forex Crosses NZD
  NZDJPY: { contractSize: 100000, pipSize: 0.01,   pipValuePerLot: 9.09 },
  NZDCAD: { contractSize: 100000, pipSize: 0.0001, pipValuePerLot: 7.4 },
  NZDCHF: { contractSize: 100000, pipSize: 0.0001, pipValuePerLot: 11.2 },
  // Forex Crosses CAD/CHF
  CADJPY: { contractSize: 100000, pipSize: 0.01,   pipValuePerLot: 9.09 },
  CADCHF: { contractSize: 100000, pipSize: 0.0001, pipValuePerLot: 11.2 },
  CHFJPY: { contractSize: 100000, pipSize: 0.01,   pipValuePerLot: 9.09 },
  // Metals
  XAUUSD: { contractSize: 100, pipSize: 0.01, pipValuePerLot: 1 },   // Gold: 100 troy oz, $1 per $0.01 move per lot → $1 per pip
  XAGUSD: { contractSize: 5000, pipSize: 0.001, pipValuePerLot: 5 }, // Silver: 5000 oz
  XPTUSD: { contractSize: 100, pipSize: 0.01,  pipValuePerLot: 1 },  // Platinum
  XPDUSD: { contractSize: 100, pipSize: 0.01,  pipValuePerLot: 1 },  // Palladium
  // Crypto
  BTCUSD: { contractSize: 1,    pipSize: 0.01, pipValuePerLot: 0.01 },
  ETHUSD: { contractSize: 1,    pipSize: 0.01, pipValuePerLot: 0.01 },
  LTCUSD: { contractSize: 1,    pipSize: 0.01, pipValuePerLot: 0.01 },
  XRPUSD: { contractSize: 1,    pipSize: 0.0001, pipValuePerLot: 0.0001 },
  // Indices (CFDs)
  US30:   { contractSize: 1, pipSize: 1,    pipValuePerLot: 1 },
  US500:  { contractSize: 1, pipSize: 0.1,  pipValuePerLot: 0.1 },
  NAS100: { contractSize: 1, pipSize: 0.1,  pipValuePerLot: 0.1 },
  UK100:  { contractSize: 1, pipSize: 1,    pipValuePerLot: 0.88 },
  GER40:  { contractSize: 1, pipSize: 1,    pipValuePerLot: 1.1 },
  JPN225: { contractSize: 1, pipSize: 1,    pipValuePerLot: 0.0067 },
  // Oil
  USOIL:  { contractSize: 1000, pipSize: 0.01, pipValuePerLot: 10 },
  UKOIL:  { contractSize: 1000, pipSize: 0.01, pipValuePerLot: 10 },
};

// Common symbol aliases
const SYMBOL_ALIASES: Record<string, string> = {
  GOLD: 'XAUUSD', SILVER: 'XAGUSD', XAUUSD_m: 'XAUUSD',
  DJIA: 'US30', SPX500: 'US500', NASDAQ: 'NAS100',
  WTI: 'USOIL', BRENT: 'UKOIL',
};

// All available symbols for autocomplete
const ALL_SYMBOLS = [
  'XAUUSD','XAGUSD','XPTUSD','XPDUSD',
  'EURUSD','EURGBP','EURJPY','EURAUD','EURCAD','EURCHF','EURNZD',
  'GBPUSD','GBPJPY','GBPAUD','GBPCAD','GBPCHF','GBPNZD',
  'USDJPY','USDCAD','USDCHF',
  'AUDUSD','AUDJPY','AUDCAD','AUDCHF','AUDNZD',
  'NZDUSD','NZDJPY','NZDCAD','NZDCHF',
  'CADJPY','CADCHF','CHFJPY',
  'BTCUSD','ETHUSD','LTCUSD','XRPUSD',
  'US30','US500','NAS100','UK100','GER40','JPN225',
  'USOIL','UKOIL',
];

/**
 * Calculate profit/loss for a trade based on symbol contract specs.
 * Returns USD profit (positive = profit, negative = loss).
 */
function calculateTradeProfit(
  symbol: string,
  tradeType: 'Buy' | 'Sell',
  entryPrice: number,
  exitPrice: number,
  lotSize: number
): number | null {
  const sym = symbol.toUpperCase().trim();
  const resolved = SYMBOL_ALIASES[sym] || sym;
  const spec = SYMBOL_SPECS[resolved];

  if (!spec || isNaN(entryPrice) || isNaN(exitPrice) || isNaN(lotSize) || lotSize <= 0) {
    return null;
  }

  const priceDiff = tradeType === 'Buy'
    ? exitPrice - entryPrice
    : entryPrice - exitPrice;

  // Number of pips moved
  const pips = priceDiff / spec.pipSize;

  // Profit = pips × pipValuePerLot × lots
  const profit = pips * spec.pipValuePerLot * lotSize;

  return parseFloat(profit.toFixed(2));
}

async function applyFreezePane(xlsxArray: Uint8Array, ySplit: number): Promise<Uint8Array> {
  const fflate = await import('fflate');
  const files = fflate.unzipSync(xlsxArray);
  const key = 'xl/worksheets/sheet1.xml';
  if (!files[key]) return xlsxArray;
  let xml = fflate.strFromU8(files[key]);
  const pane = `<pane xSplit="0" ySplit="${ySplit}" topLeftCell="A${ySplit + 1}" activePane="bottomLeft" state="frozen"/>`;
  if (/<sheetView[^>]*?\/>/.test(xml)) {
    xml = xml.replace(/<sheetView([^>]*?)\/>/, `<sheetView$1>${pane}</sheetView>`);
  } else {
    xml = xml.replace(/<sheetView([^>]*?)>/, `<sheetView$1>${pane}`);
  }
  files[key] = fflate.strToU8(xml);
  return fflate.zipSync(files, { level: 6 });
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  // FIX #2: Refs to guard against the onAuthStateChange / bootstrapSession
  // race condition and concurrent fetchAccountData calls.
  const bootstrapDoneRef = React.useRef(false);
  const isFetchingAccountsRef = React.useRef(false);

  // FIX #1: Actually persist the session IDs to sessionStorage so that
  // authFetch can inject them as headers on every subsequent API call,
  // including after a page refresh where the React state is empty.
  const persistAuthSession = (userId: string, email?: string) => {
    if (typeof window === 'undefined') return;
    if (userId) window.sessionStorage.setItem('auth_user_id', userId);
    else window.sessionStorage.removeItem('auth_user_id');
    if (email) window.sessionStorage.setItem('auth_email', email);
    else window.sessionStorage.removeItem('auth_email');
    // Always remove any legacy localStorage copies to avoid stale reads
    window.localStorage.removeItem('auth_user_id');
    window.localStorage.removeItem('auth_email');
  };

  const persistSelectedAccount = (accountId: string) => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem('selected_account_id', accountId);
    window.localStorage.removeItem('selected_account_id');
  };

  const clearAuthSession = () => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.removeItem('auth_user_id');
    window.sessionStorage.removeItem('auth_email');
    window.sessionStorage.removeItem('selected_account_id');
    window.localStorage.removeItem('auth_user_id');
    window.localStorage.removeItem('auth_email');
    window.localStorage.removeItem('selected_account_id');
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(console.error);
  };

  // Auth states
  const [user, setUser] = useState<UserType | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authName, setAuthName] = useState('Akshay Raj');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [authPassword, setAuthPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  
  // OTP states
  const [isOtpMode, setIsOtpMode] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  // Forgot/Reset password states
  const [resetEmail, setResetEmail] = useState('');
  const [isResetOtpMode, setIsResetOtpMode] = useState(false);
  const [resetOtpCode, setResetOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  
  // Navigation
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // Scroll UI state
  const [isScrolled, setIsScrolled] = useState(false);
  const [showMobileNavNotifications, setShowMobileNavNotifications] = useState(false);
  const [showMobileNavProfile, setShowMobileNavProfile] = useState(false);

  const handleMainScroll = (e: React.UIEvent<HTMLElement>) => {
    setIsScrolled(e.currentTarget.scrollTop > 150);
  };

  React.useEffect(() => {
    const handleWindowScroll = () => {
      if (window.scrollY > 150) {
        setIsScrolled(true);
      } else if (window.scrollY <= 150 && isScrolled) {
        setIsScrolled(false);
      } else {
        setIsScrolled(window.scrollY > 150);
      }
    };
    window.addEventListener('scroll', handleWindowScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleWindowScroll);
  }, [isScrolled]);
  const [fxNewsInitialTab, setFxNewsInitialTab] = useState<'news' | 'calendar'>('news');

  const openEconomicCalendar = () => {
    setFxNewsInitialTab('calendar');
    setActiveTab('fxnews');
  };

  // Core business states
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [trades, setTrades] = useState<Trade[]>([]);
  const [riskSettings, setRiskSettings] = useState<RiskSettings | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  // Loading indicator states
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Onboarding Wizard states
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [showOnboardingWizard, setShowOnboardingWizard] = useState(false);
  const [obExperience, setObExperience] = useState<'Beginner' | 'Intermediate' | 'Professional'>('Intermediate');
  const [obStyle, setObStyle] = useState<'Scalping' | 'Day Trading' | 'Swing Trading'>('Day Trading');
  const [obMarkets, setObMarkets] = useState<string[]>(['Forex', 'Gold']);

  // Modals & New Form fields
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [newAccName, setNewAccName] = useState('');
  const [newAccBroker, setNewAccBroker] = useState('');
  const [newAccPlatform, setNewAccPlatform] = useState<'MT4' | 'MT5' | 'cTrader' | 'DXtrade'>('MT5');
  const [newAccType, setNewAccType] = useState<'Live' | 'Demo'>('Live');
  const [newAccInstitutionType, setNewAccInstitutionType] = useState<'Broker' | 'Prop Firm'>('Broker');
  const [newAccCurrency, setNewAccCurrency] = useState('USD');
  const [newAccBalance, setNewAccBalance] = useState('10000');
  
  const [accountCreationMethod, setAccountCreationMethod] = useState<'select' | 'manual' | 'mt5'>('select');
  const [newAccBalanceMode, setNewAccBalanceMode] = useState<'auto' | 'manual'>('auto');

  // Edit Account form fields
  const [showEditAccountModal, setShowEditAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<TradingAccount | null>(null);
  const [editAccName, setEditAccName] = useState('');
  const [editAccStartingBalance, setEditAccStartingBalance] = useState('');
  const [editAccCurrency, setEditAccCurrency] = useState('USD');

  // Trade form fields
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [editingTradeId, setEditingTradeId] = useState<string | null>(null);
  const [tradeDate, setTradeDate] = useState('');
  const [tradeExitTime, setTradeExitTime] = useState('');
  const [tradeSymbol, setTradeSymbol] = useState(() => localStorage.getItem('lastTradeSymbol') || 'XAUUSD');
  const [tradeType, setTradeType] = useState<'Buy' | 'Sell'>('Buy');
  const [tradeLotSize, setTradeLotSize] = useState('0.1');
  const [tradeEntryPrice, setTradeEntryPrice] = useState('4450');
  const [tradeExitPrice, setTradeExitPrice] = useState('4460');
  const [tradeSL, setTradeSL] = useState('');
  const [tradeTP, setTradeTP] = useState('');
  const [tradeProfit, setTradeProfit] = useState('100');
  const [tradeProfitIsAuto, setTradeProfitIsAuto] = useState(true);
  const [tradeComm, setTradeComm] = useState('0');
  const [tradeSwap, setTradeSwap] = useState('0');
  const [tradeRisk, setTradeRisk] = useState('1.0');
  const [tradeStrategy, setTradeStrategy] = useState('Order Block Rejection');
  const [tradeEmotion, setTradeEmotion] = useState<'Calm' | 'Excited' | 'Anxious' | 'FOMO' | 'Greedy' | 'Revenge'>('Calm');
  const [tradeNotes, setTradeNotes] = useState('');
  const [showNoteField, setShowNoteField] = useState(false);
  const [showEmotionField, setShowEmotionField] = useState(false);
  const [showStrategyField, setShowStrategyField] = useState(false);
  const [tradeScreenshot, setTradeScreenshot] = useState('');
  const [tradeTags, setTradeTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');
  // Symbol autocomplete
  const [symbolSuggestions, setSymbolSuggestions] = useState<string[]>([]);
  const [showSymbolDropdown, setShowSymbolDropdown] = useState(false);
  const symbolInputRef = useRef<HTMLInputElement>(null);
  const symbolDropdownRef = useRef<HTMLDivElement>(null);

  // Paste-from-MT5 modal state
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteRawText, setPasteRawText] = useState('');
  const [parsedTrades, setParsedTrades] = useState<any[]>([]);
  const [pasteImporting, setPasteImporting] = useState(false);

  // Delete trade confirmation modal state
  const [deleteConfirmTradeId, setDeleteConfirmTradeId] = useState<string | null>(null);
  const [deleteConfirmDontShow, setDeleteConfirmDontShow] = useState(false);
  const [deleteConfirmLoading, setDeleteConfirmLoading] = useState(false);

  // Dismissible drawdown warning (dismissal is scoped to the current account)
  const [dismissedDrawdownAccount, setDismissedDrawdownAccount] = useState<string | null>(null);

  // Support ticket form
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketCategory, setTicketCategory] = useState<'Support' | 'Billing' | 'Feature Request' | 'Bug' | 'Other'>('Other');
  const [ticketDescription, setTicketDescription] = useState('');

  // Filtering / Search state for Journal
  const [searchQuery, setSearchQuery] = useState('');
  const [journalFilterSymbol, setJournalFilterSymbol] = useState('');
  const [journalFilterStrategy, setJournalFilterStrategy] = useState('');
  const [journalFilterEmotion, setJournalFilterEmotion] = useState('');

  // Export Journal modal
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportPreset, setExportPreset] = useState('this-month');
  const [exportCustomStart, setExportCustomStart] = useState('');
  const [exportCustomEnd, setExportCustomEnd] = useState('');
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'pdf'>('xlsx');

  // Unified settings tab state
  const [settingsTab, setSettingsTab] = useState<'achievements' | 'general' | 'notifications' | 'subscription' | 'about' | 'theme' | 'risk' | 'help'>('achievements');
  const [activeAboutForm, setActiveAboutForm] = useState<'none' | 'support' | 'bug' | 'feature'>('none');
  const [isSettingsDropdownOpen, setIsSettingsDropdownOpen] = useState(false);

  // Sign-out confirmation modal
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  // First-time guided onboarding tour
  const [showGuidedTour, setShowGuidedTour] = useState(false);
  const [guidedTourStep, setGuidedTourStep] = useState(1);

  // One-time MT5 Sync tour (all users)
  const [showMT5Tour, setShowMT5Tour] = useState(false);
  const [mt5TourStep, setMT5TourStep] = useState(1);

  // Theme state with local persistence
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
    }
    return 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Interactive settings inputs
  const [settingsName, setSettingsName] = useState('');
  const [settingsEmail, setSettingsEmail] = useState('');
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [settingsCurrPassword, setSettingsCurrPassword] = useState('');
  const [settingsNewPassword, setSettingsNewPassword] = useState('');
  const [settingsConfirmPassword, setSettingsConfirmPassword] = useState('');

  // Selected currency
  const [selectedCurrency, setSelectedCurrency] = useState('USD');

  const isSupabaseConfigured = Boolean(
    import.meta.env.VITE_SUPABASE_URL &&
    import.meta.env.VITE_SUPABASE_KEY &&
    !import.meta.env.VITE_SUPABASE_URL.includes('your-project.supabase.co') &&
    !import.meta.env.VITE_SUPABASE_KEY.includes('your-anon-key')
  );
  const siteUrl = import.meta.env.VITE_SITE_URL?.trim();
  const authRedirectUrl =
    siteUrl ||
    (typeof window !== 'undefined' ? window.location.origin : '');

  const syncSupabaseUser = async (sessionUser: any) => {
    const userId = sessionUser?.id || '';
    const email = sessionUser?.email || '';
    if (!userId && !email) {
      setLoading(false);
      return;
    }

    const name =
      sessionUser?.user_metadata?.full_name ||
      sessionUser?.user_metadata?.name ||
      (email ? email.split('@')[0] : 'Trader');

    const authProvider = sessionUser?.app_metadata?.provider || 'email';

    // FIX #1 (applied): persistAuthSession now correctly writes to sessionStorage.
    // This ensures authFetch includes x-auth-user-id on all subsequent calls.
    persistAuthSession(userId, email);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'x-auth-user-id': userId,
          'x-auth-email': email 
        },
        body: JSON.stringify({ id: userId, email, name, isEmailVerified: true, provider: authProvider })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          // Keep sessionStorage in sync with the server's canonical user id
          persistAuthSession(data.user.id || userId, data.user.email || email);
          setUser(data.user);
          setShowOnboardingWizard(false);
          await fetchAccountData();
          // Check admin status directly after login
          try {
            const canonicalId = data.user.id || userId;
            const canonicalEmail = data.user.email || email;
            const adminRes = await fetch('/api/admin/check', {
              headers: { 'x-auth-user-id': canonicalId, 'x-auth-email': canonicalEmail }
            });
            if (adminRes.ok) {
              const adminData = await adminRes.json();
              setIsAdmin(!!adminData.isAdmin);
            }
          } catch (_) {}
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      console.error('Error syncing user with backend:', e);
    }

    setUser({
      id: userId || `user_${Date.now()}`,
      email,
      name,
      experience: 'Intermediate',
      tradingStyle: 'Day Trading',
      mainMarkets: ['Forex', 'Gold'],
      onboardingCompleted: false,
      isPro: false,
    });

    setShowOnboardingWizard(false);
    await fetchAccountData();
    setLoading(false);
  };

  // Notifications
  const [dailyTradingReminder, setDailyTradingReminder] = useState(true);
  const [maxDailyLossAlert, setMaxDailyLossAlert] = useState(true);
  const [journalCompletionReminder, setJournalCompletionReminder] = useState(false);

  // About Forms
  const [bugTitle, setBugTitle] = useState('');
  const [bugSeverity, setBugSeverity] = useState('Medium');
  const [bugSteps, setBugSteps] = useState('');
  const [featureRequestTitle, setFeatureRequestTitle] = useState('');
  const [featureRequestDesc, setFeatureRequestDesc] = useState('');

  // Sync profile details when user loads
  useEffect(() => {
    if (user) {
      setSettingsName(user.name);
      setSettingsEmail(user.email);
      // Check admin status from server (accounts for role updates in Supabase after login)
      authFetch('/api/admin/check')
        .then(res => res.json())
        .then(data => setIsAdmin(!!data.isAdmin))
        .catch(() => setIsAdmin(false));
    } else {
      setIsAdmin(false);
    }
  }, [user]);

  // Auth-based route redirection (avoid navigate() during render)
  useEffect(() => {
    if (!user) {
      if (location.pathname !== '/login') navigate('/login', { replace: true });
    } else if (location.pathname === '/login' || location.pathname === '/') {
      navigate('/dashboard', { replace: true });
    }
  }, [user, location.pathname]);

  // Guided tour: show for first-time users who have not created a portfolio
  useEffect(() => {
    if (!user || loading) return;
    if (localStorage.getItem('journal_tutorial_done') === '1') return;
    if (accounts.length === 0) {
      setGuidedTourStep(1);
      setShowGuidedTour(true);
    }
  }, [user, loading, accounts]);

  // Auto-advance from "Create Portfolio" to "Add First Trade" once a portfolio exists
  useEffect(() => {
    if (showGuidedTour && guidedTourStep === 2 && accounts.length > 0) {
      setGuidedTourStep(3);
    }
  }, [showGuidedTour, guidedTourStep, accounts]);

  // One-time MT5 Sync tour: introduces the MT5 Automation window and announces the sync fix for all users
  useEffect(() => {
    if (!user || loading) return;
    if (localStorage.getItem('journal_mt5_tour_done') === '1') return;
    if (showGuidedTour) return;
    if (localStorage.getItem('journal_tutorial_done') === '1' || accounts.length > 0) {
      setMT5TourStep(1);
      setShowMT5Tour(true);
    }
  }, [user, loading, showGuidedTour, accounts]);

  const startGuidedTour = () => {
    setGuidedTourStep(1);
    setShowGuidedTour(true);
  };

  const completeGuidedTour = () => {
    localStorage.setItem('journal_tutorial_done', '1');
    setShowGuidedTour(false);
  };

  const nextGuidedTourStep = () => {
    setGuidedTourStep(prev => {
      const next = prev + 1;
      if (next === 2) setActiveTab('accounts');
      if (next === 3) setActiveTab('dashboard');
      return Math.min(next, 4);
    });
  };

  const backGuidedTourStep = () => {
    setGuidedTourStep(prev => {
      const back = prev - 1;
      if (back === 2) setActiveTab('accounts');
      if (back === 1) setActiveTab('dashboard');
      return Math.max(back, 1);
    });
  };

  const startMT5Tour = () => {
    setMT5TourStep(1);
    setShowMT5Tour(true);
  };

  const completeMT5Tour = () => {
    localStorage.setItem('journal_mt5_tour_done', '1');
    setShowMT5Tour(false);
  };

  const nextMT5TourStep = () => {
    setMT5TourStep(prev => {
      const next = prev + 1;
      if (next === 2) setActiveTab('mt5');
      return Math.min(next, 3);
    });
  };

  const backMT5TourStep = () => {
    setMT5TourStep(prev => {
      const back = prev - 1;
      if (back === 1) setActiveTab('dashboard');
      return Math.max(back, 1);
    });
  };


  // Sync selected currency when activeAccount loads
  useEffect(() => {
    if (activeAccount) {
      setSelectedCurrency(activeAccount.currency);
    }
  }, [selectedAccountId, accounts]);

  // Load notification settings on mount
  useEffect(() => {
    const daily = localStorage.getItem('notif_daily');
    const loss = localStorage.getItem('notif_loss');
    const journal = localStorage.getItem('notif_journal');
    if (daily !== null) setDailyTradingReminder(daily === 'true');
    if (loss !== null) setMaxDailyLossAlert(loss === 'true');
    if (journal !== null) setJournalCompletionReminder(journal === 'true');
  }, []);

  // Chart customization states
  const [chartStyle, setChartStyle] = useState<'emerald' | 'indigo' | 'charcoal' | 'sunset'>('emerald');

  const getChartColors = () => {
    switch (chartStyle) {
      case 'emerald':
        return { stroke: '#10b981', gradient: '#10b981' };
      case 'indigo':
        return { stroke: '#6366f1', gradient: '#6366f1' };
      case 'charcoal':
        return { stroke: '#475569', gradient: '#475569' };
      case 'sunset':
        return { stroke: '#f59e0b', gradient: '#f59e0b' };
      default:
        return { stroke: '#10b981', gradient: '#10b981' };
    }
  };

  // active account
  const activeAccount = accounts.find(a => a.id === selectedAccountId);

  // authFetch — wraps native fetch and injects x-auth-user-id and x-auth-email headers
  const authFetch = (url: string, options: RequestInit = {}): Promise<Response> => {
    const storedUserId = sessionStorage.getItem('auth_user_id') || user?.id || '';
    const storedEmail = sessionStorage.getItem('auth_email') || user?.email || '';
    const method = (options.method || 'GET').toUpperCase();
    const needsContentType = ['POST', 'PUT', 'PATCH'].includes(method) && options.body;
    return fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        ...(needsContentType ? { 'Content-Type': 'application/json' } : {}),
        ...(storedUserId ? { 'x-auth-user-id': storedUserId } : {}),
        ...(storedEmail ? { 'x-auth-email': storedEmail } : {}),
        ...(options.headers || {}),
      },
    });
  };

  useEffect(() => {
    const bootstrapSession = async () => {
      try {
        if (isSupabaseConfigured) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            // Mark bootstrap in-progress so onAuthStateChange SIGNED_IN (which
            // fires concurrently) knows not to double-fetch.
            await syncSupabaseUser(session.user);
            bootstrapDoneRef.current = true;
            return;
          }
        }
      } catch (err) {
        console.error('Error loading Supabase session:', err);
      }

      // FIX #3: Write sessionStorage BEFORE calling fetchAccountData so that
      // authFetch has the correct user ID available when it builds headers.
      try {
        const storedId = sessionStorage.getItem('auth_user_id');
        const storedEmail = sessionStorage.getItem('auth_email');
        const headers: Record<string, string> = {};
        if (storedId) headers['x-auth-user-id'] = storedId;
        if (storedEmail) headers['x-auth-email'] = storedEmail;

        const res = await fetch('/api/auth/me', { headers, credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            // Persist the canonical IDs resolved by the server (cookie-based restore)
            // before we call fetchAccountData so authFetch has them available.
            persistAuthSession(data.user.id, data.user.email);
            setUser(data.user);
            setShowOnboardingWizard(false);
            await fetchAccountData();
            // Check admin status after session restore
            try {
              const adminHeaders = {
                'x-auth-user-id': data.user.id,
                'x-auth-email': data.user.email
              };
              const adminRes = await fetch('/api/admin/check', { headers: adminHeaders, credentials: 'include' });
              if (adminRes.ok) {
                const adminData = await adminRes.json();
                setIsAdmin(!!adminData.isAdmin);
              }
            } catch (_) {}
            setLoading(false);
            bootstrapDoneRef.current = true;
            return;
          }
        }
      } catch (e) {
        console.error('Error loading stored session:', e);
      }

      setLoading(false);
      bootstrapDoneRef.current = true;
    };

    bootstrapSession();

    let subscription: any = null;
    if (isSupabaseConfigured) {
      const subObj = supabase.auth.onAuthStateChange(async (event, session) => {
        // FIX #2: Guard against the race where onAuthStateChange(SIGNED_IN) fires
        // at the same time as bootstrapSession is still running (Supabase always
        // emits INITIAL_SESSION then SIGNED_IN on page load). We only call
        // syncSupabaseUser from here once bootstrap has fully completed — that way
        // this handler only reacts to genuine new sign-in events (e.g. after a
        // login form submission) and not to the initial session restore.
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') && session?.user) {
          if (!bootstrapDoneRef.current) {
            // Bootstrap is still running; it will handle data loading.
            return;
          }
          await syncSupabaseUser(session.user);
        }

        if (event === 'SIGNED_OUT') {
          clearAuthSession();
          setUser(null);
          setAccounts([]);
          setTrades([]);
          setSelectedAccountId('');
          setTickets([]);
          setAnnouncements([]);
          setRiskSettings(null);
          setEditingAccount(null);
          setEditingTradeId(null);
          setLoading(false);
        }
      });
      subscription = subObj.data?.subscription;
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [isSupabaseConfigured]);

  // Fetch all user accounts, active trades, risk params, support queues
  const fetchAccountData = async (overrideAccountId?: string) => {
    // FIX #4: Guard against concurrent fetches. If a fetch is already in flight,
    // skip this call to prevent an empty-data response from temporarily
    // overwriting real data that the first fetch is about to return.
    if (isFetchingAccountsRef.current) return;
    isFetchingAccountsRef.current = true;
    setLoading(true);
    try {
      // Accounts
      const accsRes = await authFetch('/api/accounts');
      const accsData = await accsRes.json();
      const loadedAccs = Array.isArray(accsData.accounts) ? accsData.accounts : [];

      if (loadedAccs.length > 0) {
        // Only update state when we have real data — never clear existing data
        // while a fresh load is in progress (prevents empty-data flash).
        setAccounts(loadedAccs);
        const storedSelectedId = sessionStorage.getItem('selected_account_id');
        // Prefer stored selection → then first account
        const defaultId = overrideAccountId
          ? overrideAccountId
          : (storedSelectedId && loadedAccs.some((a: any) => a.id === storedSelectedId)
            ? storedSelectedId
            : loadedAccs[0].id);

        setSelectedAccountId(defaultId);
        persistSelectedAccount(defaultId);
        await fetchTradesAndParams(defaultId);
      } else {
        // Server returned no accounts for this user. Only clear state if we
        // actually got a valid (authenticated) response — i.e. the response
        // body was parseable and the user is logged in. This avoids wiping data
        // when the server returns 401/empty due to a missing auth header.
        setAccounts([]);
        setSelectedAccountId('');
        setTrades([]);
        setRiskSettings(null);
        sessionStorage.removeItem('selected_account_id');
        localStorage.removeItem('selected_account_id');
      }

      // Support tickets
      const tickRes = await authFetch('/api/tickets');
      const tickData = await tickRes.json();
      setTickets(Array.isArray(tickData.tickets) ? tickData.tickets : []);

      // Announcements
      const annRes = await authFetch('/api/announcements');
      const annData = await annRes.json();
      setAnnouncements(Array.isArray(annData.announcements) ? annData.announcements : []);

    } catch (e) {
      console.error('Error fetching dashboard tables:', e);
    } finally {
      setLoading(false);
      isFetchingAccountsRef.current = false;
    }
  };

  const [tradesRefreshing, setTradesRefreshing] = useState(false);

  const refreshTrades = async () => {
    if (!selectedAccountId) return;
    setTradesRefreshing(true);
    try {
      const tradesRes = await authFetch(`/api/trades?accountId=${selectedAccountId}`);
      const tradesData = await tradesRes.json();
      setTrades(tradesData.trades || []);
      // Also refresh account balance
      const accsRes = await authFetch('/api/accounts');
      const accsData = await accsRes.json();
      if (Array.isArray(accsData.accounts)) setAccounts(accsData.accounts);
    } catch (e) {
      console.error('Error refreshing trades:', e);
    } finally {
      setTradesRefreshing(false);
    }
  };

  const fetchTradesAndParams = async (accId: string) => {
    try {
      const tradesRes = await authFetch(`/api/trades?accountId=${accId}`);
      const tradesData = await tradesRes.json();
      setTrades(tradesData.trades || []);

      const riskRes = await authFetch(`/api/risk-settings/${accId}`);
      const riskData = await riskRes.json();
      setRiskSettings(riskData.riskSettings || null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAccountChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const accId = e.target.value;
    setSelectedAccountId(accId);
    persistSelectedAccount(accId);
    await fetchTradesAndParams(accId);
  };

  // Auth Operations
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail) return;
    setActionLoading(true);
    setAuthError(null);
    try {
      if (isSupabaseConfigured) {
        try {
          const { data: supabaseData, error: supabaseError } = await supabase.auth.signInWithPassword({
            email: authEmail,
            password: authPassword
          });

          if (!supabaseError && supabaseData?.session?.user) {
            await syncSupabaseUser(supabaseData.session.user);
            return;
          }
        } catch (sErr) {
          console.warn('[AxyFx] Supabase login warning, falling back to backend:', sErr);
        }
      }

      // Login/Sync with Express backend
      persistAuthSession(sessionStorage.getItem('auth_user_id') || user?.id || '', authEmail);
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'x-auth-email': authEmail 
        },
        body: JSON.stringify({ email: authEmail, password: authPassword })
      });

      if (!res.ok) {
        const errorData = await res.json();
        setAuthError(errorData.error || 'Login failed.');
        return;
      }

      const data = await res.json();
      if (data.user) {
        persistAuthSession(data.user.id, data.user.email || authEmail);
        setUser(data.user);
        setShowOnboardingWizard(false);
        await fetchAccountData();
      }
    } catch (err: any) {
      console.error('[AxyFx] Login error:', err);
      setAuthError(`Login connection error: ${err?.message || err || 'Network or Parsing error'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authName) return;
    setActionLoading(true);
    setAuthError(null);
    try {
      // 1. Try registering with Supabase Auth in background if configured
      if (isSupabaseConfigured) {
        try {
          await supabase.auth.signUp({
            email: authEmail,
            password: authPassword,
            options: {
              data: {
                full_name: authName
              }
            }
          });
        } catch (sErr) {
          console.warn('[AxyFx] Supabase register background warning:', sErr);
        }
      }

      // 2. Register with Express Backend API (sends 6-digit OTP code via SendGrid / Resend)
      // Do NOT persist a session before OTP verification — otherwise a page refresh
      // while the OTP window is open would bypass verification.
      persistAuthSession(sessionStorage.getItem('auth_user_id') || user?.id || '');
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-email': authEmail },
        body: JSON.stringify({ email: authEmail, name: authName, password: authPassword })
      });

      if (!res.ok) {
        const errorData = await res.json();
        setAuthError(errorData.error || 'Failed to create account.');
        return;
      }

      const data = await res.json();
      // Prompt user for 6-digit OTP Verification code
      setIsOtpMode(true);
      if (data.devOtp) {
        setOtpCode(data.devOtp);
      } else {
        setOtpCode('');
      }
      setAuthError(null);
    } catch (err: any) {
      console.error('[AxyFx] Registration connection error:', err);
      setAuthError(`Registration error: ${err?.message || err || 'Network error'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !otpCode || otpCode.length !== 6) {
      setAuthError('Please enter a valid 6-digit code');
      return;
    }
    setActionLoading(true);
    setAuthError(null);
    try {
      // 1. Verify 6-digit OTP code via backend API
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-email': authEmail },
        body: JSON.stringify({ email: authEmail, otp: otpCode })
      });

      const data = await res.json();

      if (!res.ok) {
        setAuthError(data.error || 'Invalid or expired OTP code.');
        return;
      }

      if (data.user) {
        persistAuthSession(data.user.id, data.user.email || authEmail);
        setUser(data.user);
        setIsOtpMode(false);
        setOtpCode('');
        setShowOnboardingWizard(true);
        await fetchAccountData();
        return;
      }

      // 2. Also attempt Supabase verifyOtp in parallel if configured
      if (isSupabaseConfigured) {
        try {
          await supabase.auth.verifyOtp({
            email: authEmail,
            token: otpCode,
            type: 'signup'
          });
        } catch (sErr) {
          console.warn('[AxyFx] Supabase OTP verify warning:', sErr);
        }
      }
    } catch (err: any) {
      setAuthError(`OTP Verification error: ${err?.message || err}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!authEmail) return;
    setActionLoading(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-email': authEmail },
        body: JSON.stringify({ email: authEmail })
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Failed to resend verification code.');
      } else {
        if (data.devOtp) {
          setOtpCode(data.devOtp);
          alert(`Code generated: ${data.devOtp} (Email provider sender unverified or pending setup)`);
        } else {
          setOtpCode('');
          alert(`A new 6-digit verification code has been sent to ${authEmail}`);
        }
      }
    } catch (err: any) {
      setAuthError(`Resend error: ${err?.message || err}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return;
    setActionLoading(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail })
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Request failed. Please try again.');
        return;
      }
      // Move to OTP + new password step
      setIsResetOtpMode(true);
      if (data.devOtp) {
        setResetOtpCode(data.devOtp);
        alert(`Dev mode – Reset code: ${data.devOtp}`);
      } else {
        setResetOtpCode('');
      }
      setAuthError(null);
    } catch (err: any) {
      setAuthError(`Error: ${err?.message || err}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetOtpCode || resetOtpCode.length !== 6 || !newPassword) return;
    setActionLoading(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, otp: resetOtpCode, newPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Failed to reset password.');
        return;
      }
      // Success – show success message then go back to login
      setResetSuccess(true);
      setTimeout(() => {
        setIsForgotPassword(false);
        setIsResetOtpMode(false);
        setResetSuccess(false);
        setResetEmail('');
        setResetOtpCode('');
        setNewPassword('');
        setAuthError(null);
      }, 2500);
    } catch (err: any) {
      setAuthError(`Error: ${err?.message || err}`);
    } finally {
      setActionLoading(false);
    }
  };


  const handleLogout = async () => {
    setShowSignOutModal(true);
  };

  const performLogout = async () => {
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.error('[AxyFx] Error during Supabase signout:', e);
    }

    clearAuthSession();

    setUser(null);
    setAccounts([]);
    setTrades([]);
    setSelectedAccountId('');
    setTickets([]);
    setAnnouncements([]);
    setRiskSettings(null);
    setEditingAccount(null);
    setEditingTradeId(null);
    setActiveTab('dashboard');
    setOnboardingStep(0);
    setShowOnboardingWizard(false);
    setIsOtpMode(false);
    setIsForgotPassword(false);
    setAuthError(null);
    setAuthEmail('');
    setAuthPassword('');
    setAuthName('');
    navigate('/login', { replace: true });
  };

  const submitOnboarding = async () => {
    console.log('submitOnboarding called', { obExperience, obStyle, obMarkets });
    setActionLoading(true);
    try {
      console.log('Sending onboarding request...');
      const res = await authFetch('/api/auth/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          experience: obExperience,
          tradingStyle: obStyle,
          markets: obMarkets
        })
      });
      console.log('Onboarding response status:', res.status);
      const data = await res.json();
      console.log('Onboarding response data:', data);
      if (!res.ok) {
        alert(data.error || 'Failed to complete onboarding');
        return;
      }
      if (data.user) {
        setUser(data.user);
        setShowOnboardingWizard(false);
        fetchAccountData();
      }
    } catch (err) {
      console.error('Onboarding exception:', err);
      alert('Failed to complete onboarding: ' + err);
    } finally {
      setActionLoading(false);
    }
  };

  // Account Operations
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const storedId = sessionStorage.getItem('auth_user_id') || user?.id || '';
    const storedEmail = sessionStorage.getItem('auth_email') || user?.email || '';
    console.log('[handleCreateAccount] auth check — id:', storedId, 'email:', storedEmail);
    if (!newAccName || !newAccBroker) {
      alert('Please fill in Account Name and Broker/Prop Firm Name.');
      return;
    }
    if (accountCreationMethod !== 'mt5' && !newAccBalance) {
      alert('Please fill in Starting Balance.');
      return;
    }
    if (accountCreationMethod === 'mt5' && newAccBalanceMode === 'manual' && !newAccBalance) {
      alert('Please fill in Starting Balance or switch to Auto Calculate.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await authFetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAccName,
          broker: newAccBroker,
          platform: accountCreationMethod === 'mt5' ? 'MT5' : newAccPlatform,
          accountType: newAccType,
          currency: newAccCurrency,
          startingBalance: accountCreationMethod === 'mt5'
            ? (newAccBalanceMode === 'manual' ? newAccBalance : undefined)
            : newAccBalance,
          isMt5Sync: accountCreationMethod === 'mt5',
          ...(accountCreationMethod === 'mt5' ? { institutionType: newAccInstitutionType } : {})
        })
      });
      console.log('[handleCreateAccount] response status:', res.status);
      const data = await res.json();
      console.log('[handleCreateAccount] response data:', data);
      if (res.ok) {
        setShowAccountModal(false);
        setNewAccName('');
        setNewAccBroker('');
        setNewAccInstitutionType('Broker');
        if (data.account?.id) {
          setSelectedAccountId(data.account.id);
          persistSelectedAccount(data.account.id);
          await fetchAccountData(data.account.id);
          if (accountCreationMethod === 'mt5') {
            setActiveTab('mt5');
          }
        } else {
          await fetchAccountData();
        }
      } else {
        const errMsg = data.error || `Server error (${res.status})`;
        console.error('[handleCreateAccount] error:', errMsg);
        alert(errMsg);
      }
    } catch (err: any) {
      console.error('[handleCreateAccount] exception:', err);
      alert('Error creating account: ' + (err?.message || err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount || !editAccName || !editAccStartingBalance) return;
    setActionLoading(true);
    try {
      const res = await authFetch(`/api/accounts/${editingAccount.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editAccName,
          startingBalance: editAccStartingBalance,
          currency: editAccCurrency
        })
      });
      const data = await res.json();
      if (res.ok) {
        setShowEditAccountModal(false);
        setEditingAccount(null);
        fetchAccountData();
      } else if (data.error) {
        alert(data.error);
      }
    } catch (err) {
      alert('Error updating account');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!editingAccount) return;
    if (!window.confirm(`Are you sure you want to delete "${editingAccount.name}"? All associated trades and risk settings will be permanently removed.`)) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await authFetch(`/api/accounts/${editingAccount.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        setShowEditAccountModal(false);
        setEditingAccount(null);
        const remaining = accounts.filter(a => a.id !== editingAccount.id);
        if (selectedAccountId === editingAccount.id) {
          const nextId = remaining.length > 0 ? remaining[0].id : '';
          setSelectedAccountId(nextId);
          persistSelectedAccount(nextId);
          await fetchAccountData(nextId);
        } else {
          await fetchAccountData();
        }
      } else if (data.error) {
        alert(data.error);
      }
    } catch (err) {
      alert('Error deleting account');
    } finally {
      setActionLoading(false);
    }
  };

  // Trade Operations
  const handleOpenTradeModal = (trade?: Trade) => {
    if (trade) {
      setEditingTradeId(trade.id);
      if (trade.date) {
        try {
          const d = new Date(trade.date);
          const offset = d.getTimezoneOffset();
          const localDate = new Date(d.getTime() - offset * 60 * 1000);
          setTradeDate(localDate.toISOString().slice(0, 16));
        } catch (e) {
          setTradeDate('');
        }
      } else {
        setTradeDate('');
      }
      
      if (trade.exitTime) {
        try {
          const d = new Date(trade.exitTime);
          const offset = d.getTimezoneOffset();
          const localDate = new Date(d.getTime() - offset * 60 * 1000);
          setTradeExitTime(localDate.toISOString().slice(0, 16));
        } catch (e) {
          setTradeExitTime('');
        }
      } else {
        setTradeExitTime('');
      }
      setTradeSymbol(trade.symbol);
      setTradeType(trade.type as 'Buy' | 'Sell');
      setTradeLotSize(String(trade.lotSize));
      setTradeEntryPrice(String(trade.entryPrice));
      setTradeExitPrice(String(trade.exitPrice));
      setTradeSL(trade.stopLoss ? String(trade.stopLoss) : '');
      setTradeTP(trade.takeProfit ? String(trade.takeProfit) : '');
      setTradeProfit(String(trade.profit));
      setTradeProfitIsAuto(false); // When editing existing trade, keep profit as-is
      setTradeComm(String(trade.commission));
      setTradeSwap(String(trade.swap));
      setTradeRisk(String(trade.riskPercentage));
      setTradeStrategy(trade.strategy || 'Unspecified');
      setTradeEmotion(trade.emotion || 'Calm');
      setTradeNotes(trade.notes || '');
      setShowNoteField(!!(trade.notes && trade.notes.trim().length > 0));
      setShowEmotionField(!!(trade.emotion && trade.emotion !== 'Calm'));
      setShowStrategyField(!!(trade.strategy && trade.strategy.trim().length > 0 && trade.strategy !== 'Unspecified'));
      setTradeScreenshot(trade.screenshot || '');
      setTradeTags(trade.tags || []);
    } else {
      const defaultSymbol = localStorage.getItem('lastTradeSymbol') || 'XAUUSD';
      const defaultEntry = defaultSymbol === 'XAUUSD' ? '4450' : '1.08500';
      const defaultExit  = defaultSymbol === 'XAUUSD' ? '4460' : '1.09200';
      const defaultLot   = '0.1';
      setEditingTradeId(null);
      // Pre-fill current local date & time (refreshed each time the modal opens)
      const now = new Date();
      const localISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setTradeDate(localISO);
      setTradeSymbol(defaultSymbol);
      setTradeType('Buy');
      setTradeLotSize(defaultLot);
      setTradeEntryPrice(defaultEntry);
      setTradeExitPrice(defaultExit);
      setTradeSL('');
      setTradeTP('');
      // Auto-calculate profit for defaults
      const autoProfit = calculateTradeProfit(defaultSymbol, 'Buy', parseFloat(defaultEntry), parseFloat(defaultExit), parseFloat(defaultLot));
      setTradeProfit(autoProfit !== null ? String(autoProfit) : '100');
      setTradeProfitIsAuto(true);
      setTradeComm('0');
      setTradeSwap('0');
      setTradeRisk('1.0');
      setTradeStrategy('Order Block Rejection');
      setTradeEmotion('Calm');
      setTradeNotes('');
      setShowNoteField(false);
      setShowEmotionField(false);
      setShowStrategyField(false);
      setTradeScreenshot('');
      setTradeTags([]);
    }
    setSymbolSuggestions([]);
    setShowSymbolDropdown(false);
    setShowTradeModal(true);
  };

  // Auto-recalculate profit whenever trade inputs change
  useEffect(() => {
    if (!tradeProfitIsAuto) return;
    const entry = parseFloat(tradeEntryPrice);
    const exit  = parseFloat(tradeExitPrice);
    const lot   = parseFloat(tradeLotSize);
    const calc  = calculateTradeProfit(tradeSymbol, tradeType, entry, exit, lot);
    if (calc !== null) {
      setTradeProfit(String(calc));
    }
  }, [tradeSymbol, tradeType, tradeEntryPrice, tradeExitPrice, tradeLotSize, tradeProfitIsAuto]);

  // Close symbol dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        symbolDropdownRef.current && !symbolDropdownRef.current.contains(e.target as Node) &&
        symbolInputRef.current && !symbolInputRef.current.contains(e.target as Node)
      ) {
        setShowSymbolDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSaveTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId) return alert('Select a trading account first.');

    const tradeData = {
      accountId: selectedAccountId,
      date: tradeDate ? new Date(tradeDate).toISOString() : new Date().toISOString(),
      symbol: tradeSymbol,
      type: tradeType,
      lotSize: tradeLotSize,
      entryPrice: tradeEntryPrice,
      exitPrice: tradeExitPrice,
      exitTime: tradeExitTime ? new Date(tradeExitTime).toISOString() : undefined,
      stopLoss: tradeSL || null,
      takeProfit: tradeTP || null,
      profit: tradeProfit,
      commission: tradeComm || 0,
      swap: tradeSwap || 0,
      riskPercentage: tradeRisk,
      strategy: tradeStrategy,
      emotion: tradeEmotion,
      notes: tradeNotes,
      screenshot: tradeScreenshot,
      tags: tradeTags
    };

    setActionLoading(true);
    try {
      let res;
      if (editingTradeId) {
        res = await authFetch(`/api/trades/${editingTradeId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tradeData)
        });
      } else {
        res = await authFetch('/api/trades', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tradeData)
        });
      }

      if (res.ok) {
        setShowTradeModal(false);
        setEditingTradeId(null);
        await fetchTradesAndParams(selectedAccountId);
        // Refresh accounts to get new balance/equity calculations
        const accsRes = await authFetch('/api/accounts');
        const accsData = await accsRes.json();
        setAccounts(accsData.accounts || []);
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Error saving trade record');
      }
    } catch (err: any) {
      console.error('Error saving trade:', err);
      alert('Error saving trade record: ' + (err?.message || err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteTrade = (tradeId: string) => {
    // Check both user state and localStorage so the preference works instantly
    const skipConfirm = (user as any)?.preferences?.skipDeleteConfirm
      || localStorage.getItem('skipDeleteConfirm') === 'true';
    if (skipConfirm) {
      executeDeleteTrade(tradeId);
    } else {
      setDeleteConfirmDontShow(false);
      setDeleteConfirmTradeId(tradeId);
    }
  };

  const executeDeleteTrade = async (tradeId: string) => {
    setDeleteConfirmLoading(true);
    try {
      const res = await authFetch(`/api/trades/${tradeId}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchTradesAndParams(selectedAccountId);
        // Refresh accounts
        const accsRes = await authFetch('/api/accounts');
        const accsData = await accsRes.json();
        setAccounts(accsData.accounts || []);
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Error deleting trade');
      }
    } catch (e: any) {
      alert('Error deleting trade: ' + (e?.message || e));
    } finally {
      setDeleteConfirmLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmTradeId) return;
    const tradeId = deleteConfirmTradeId;
    setDeleteConfirmTradeId(null);
    // Persist "don't show again" preference
    if (deleteConfirmDontShow) {
      // Write to localStorage immediately so next deletion skips the modal
      // without waiting for the async server call or React re-render
      localStorage.setItem('skipDeleteConfirm', 'true');
      try {
        const res = await authFetch('/api/auth/preferences', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ skipDeleteConfirm: true })
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } catch (_) {
        // localStorage already set — preference will still work this session
      }
    }
    await executeDeleteTrade(tradeId);
  };

  // ── Paste-from-MT5 handlers ──
  const handleParsePaste = () => {
    const parsed = parseMt5PastedText(pasteRawText);
    setParsedTrades(parsed);
  };

  const handleImportParsedTrades = async () => {
    if (!selectedAccountId || parsedTrades.length === 0) return;
    setPasteImporting(true);
    try {
      const res = await authFetch('/api/trades/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: selectedAccountId, trades: parsedTrades })
      });
      if (res.ok) {
        await fetchTradesAndParams(selectedAccountId);
        const accsRes = await authFetch('/api/accounts');
        const accsData = await accsRes.json();
        setAccounts(accsData.accounts);
        setShowPasteModal(false);
        setPasteRawText('');
        setParsedTrades([]);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to import trades');
      }
    } catch (e: any) {
      alert('Import error: ' + (e?.message || e));
    } finally {
      setPasteImporting(false);
    }
  };

  // ── MT5 HTML/XML report parsers ──
  const parseMt5HtmlReport = (html: string): any[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const tables = doc.querySelectorAll('table');
    if (tables.length === 0) return [];

    // Score each table: pick the one with the most deal-like rows
    let bestTable: Element | null = null;
    let bestScore = -1;
    let bestHeaders: string[] = [];

    const dealKeywords = ['ticket', 'type', 'buy', 'sell', 'volume', 'symbol', 'profit', 'commission', 'swap'];
    const headerAliases: [string, string[]][] = [
      ['type', ['type', 'direction']],
      ['symbol', ['symbol', 'item', 'instrument', 'pair']],
      ['lots', ['lots', 'size', 'volume']],
      ['time', ['time', 'opentime', 'open_time', 'date']],
      ['entry', ['price', 'openprice', 'open_price']],
      ['exit', ['closeprice', 'close_price', 'exitprice', 'exit_price']],
      ['profit', ['profit', 'pnl']],
    ];

    const findHeaderIdx = (headers: string[], names: string[]): number => {
      for (const name of names) {
        const idx = headers.indexOf(name);
        if (idx !== -1) return idx;
        const pIdx = headers.findIndex(h => h.includes(name));
        if (pIdx !== -1) return pIdx;
      }
      return -1;
    };

    for (const tbl of tables) {
      const rows = tbl.querySelectorAll('tr');
      if (rows.length < 2) continue;

      // Normalize first row as headers
      const hCells = rows[0].querySelectorAll('th, td');
      const headers: string[] = [];
      hCells.forEach(c => headers.push((c.textContent || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '')));

      // Score: +1 for each detected deal column
      let score = 0;
      for (const [, aliases] of headerAliases) {
        if (findHeaderIdx(headers, aliases) !== -1) score++;
      }
      // Bonus if type+buy/sell keywords found in data rows
      let dealCount = 0;
      for (let i = 1; i < Math.min(rows.length, 20); i++) {
        const text = rows[i].textContent?.toLowerCase() || '';
        if ((text.includes('buy') || text.includes('sell')) && /[0-9.]+/.test(text)) dealCount++;
      }
      if (dealCount >= 3) score += 5;

      if (score > bestScore) {
        bestScore = score;
        bestTable = tbl;
        bestHeaders = headers;
      }
    }

    if (!bestTable || bestScore < 3) return [];

    const rows = bestTable.querySelectorAll('tr');
    if (rows.length < 2) return [];

    const findCol = (names: string[]): number => findHeaderIdx(bestHeaders, names);
    const typeCol = findCol(['type', 'direction']);
    const symbolCol = findCol(['symbol', 'item', 'instrument', 'pair']);
    const lotsCol = findCol(['lots', 'size', 'volume']);
    const timeCol = findCol(['time', 'opentime', 'open_time', 'date']);
    const entryCol = findCol(['price', 'openprice', 'open_price']);
    const exitCol = findCol(['closeprice', 'close_price', 'exitprice', 'exit_price']);
    const profitCol = findCol(['profit', 'pnl']);
    const commCol = findCol(['commission', 'comm']);
    const swapCol = findCol(['swap', 'taxes', 'swaps']);

    // Price columns: first = entry, last = exit
    let entryIdx = entryCol;
    let exitIdx = exitCol;
    if (entryCol === exitCol && entryCol !== -1) {
      const allPrice: number[] = [];
      bestHeaders.forEach((h, i) => { if (h.includes('price') || h.includes('rate')) allPrice.push(i); });
      entryIdx = allPrice.length > 0 ? allPrice[0] : entryCol;
      exitIdx = allPrice.length > 1 ? allPrice[allPrice.length - 1] : entryIdx;
    }

    const parseNum = (s: string): number => {
      const cleaned = (s || '').replace(/[^0-9.\-]/g, '');
      return cleaned ? parseFloat(cleaned) : 0;
    };

    const results: any[] = [];
    for (let i = 1; i < rows.length; i++) {
      const cells = rows[i].querySelectorAll('th, td');
      if (cells.length < 3) continue;

      const getVal = (idx: number): string => (idx !== -1 && idx < cells.length ? (cells[idx].textContent || '').trim() : '');

      const rawType = getVal(typeCol).toLowerCase();
      const tradeType = rawType === 'buy' ? 'Buy' as const : rawType === 'sell' ? 'Sell' as const : null;
      if (!tradeType) continue;

      const symbol = getVal(symbolCol).toUpperCase();
      if (!symbol) continue;

      const rawDate = getVal(timeCol);
      let parsedDate: string;
      if (rawDate) {
        const d = new Date(rawDate.replace(/\./g, '-').replace(/\s+/g, 'T'));
        parsedDate = isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
      } else {
        parsedDate = new Date().toISOString();
      }

      results.push({
        date: parsedDate,
        symbol,
        type: tradeType,
        lotSize: parseNum(getVal(lotsCol)) || 0.01,
        entryPrice: entryIdx !== -1 ? parseNum(getVal(entryIdx)) : 0,
        exitPrice: exitIdx !== -1 ? parseNum(getVal(exitIdx)) : 0,
        profit: parseNum(getVal(profitCol)),
        commission: getVal(commCol) ? parseNum(getVal(commCol)) : 0,
        swap: getVal(swapCol) ? parseNum(getVal(swapCol)) : 0,
        strategy: 'Pasted from MT5',
        emotion: 'Calm',
        tags: ['MT5 Paste'],
        isMt5Sync: true
      });
    }
    return results;
  };

  const parseMt5XmlReport = (xml: string): any[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');

    // Try common MT5 export formats
    const dealNodes = doc.querySelectorAll('Deal, deal, Trade, trade, Order, order, Position, position');
    if (dealNodes.length === 0) return [];

    const parseNum = (s: string | null): number => {
      const cleaned = (s || '').replace(/[^0-9.\-]/g, '');
      return cleaned ? parseFloat(cleaned) : 0;
    };

    const results: any[] = [];
    for (const node of dealNodes) {
      const getTag = (names: string[]): string | null => {
        for (const name of names) {
          const el = node.querySelector(name);
          if (el?.textContent) return el.textContent.trim();
        }
        return null;
      };

      // Type: 0=Buy, 1=Sell or "buy"/"sell"
      const rawType = (getTag(['Type', 'type', 'DIRECTION']) || '').toLowerCase();
      const tradeType = rawType === 'buy' || rawType === '0' ? 'Buy' as const : rawType === 'sell' || rawType === '1' ? 'Sell' as const : null;
      if (!tradeType) continue;

      const symbol = (getTag(['Symbol', 'symbol', 'SYMBOL']) || '').toUpperCase();
      if (!symbol) continue;

      const rawDate = getTag(['OpenTime', 'Open_Time', 'opentime', 'Time', 'time', 'Date', 'date']);
      let parsedDate: string;
      if (rawDate) {
        const d = new Date(rawDate.replace(/\./g, '-').replace(/\s+/g, 'T'));
        parsedDate = isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
      } else {
        parsedDate = new Date().toISOString();
      }

      const lotSize = parseNum(getTag(['Volume', 'volume', 'Lots', 'lots', 'Size', 'size']));
      const entryPrice = parseNum(getTag(['Price', 'price', 'OpenPrice', 'Open_Price', 'openprice']));
      const exitPrice = parseNum(getTag(['ClosePrice', 'Close_Price', 'closeprice', 'exitprice', 'ExitPrice', 'exit_price']));
      const profit = parseNum(getTag(['Profit', 'profit', 'PROFIT']));
      const commission = parseNum(getTag(['Commission', 'commission', 'COMMISSION']));
      const swap = parseNum(getTag(['Swap', 'swap', 'SWAP', 'Taxes', 'taxes']));

      results.push({
        date: parsedDate,
        symbol,
        type: tradeType,
        lotSize: lotSize || 0.01,
        entryPrice: entryPrice || 0,
        exitPrice: exitPrice || 0,
        profit: profit || 0,
        commission: commission || 0,
        swap: swap || 0,
        strategy: 'Pasted from MT5',
        emotion: 'Calm',
        tags: ['MT5 Paste'],
        isMt5Sync: true
      });
    }
    return results;
  };

  // ── File upload handler for MT5 reports ──
  const handleReportFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      if (!content) return;

      // Show raw content in textarea so user can see what was read
      setPasteRawText(content);

      const ext = file.name.split('.').pop()?.toLowerCase();
      let parsed: any[] = [];

      if (ext === 'html' || ext === 'htm') {
        parsed = parseMt5HtmlReport(content);
      } else if (ext === 'xml') {
        parsed = parseMt5XmlReport(content);
      }

      if (parsed.length > 0) {
        setParsedTrades(parsed);
      } else {
        setParsedTrades([]);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Pro Upgrade Trigger: redirect to Settings > Subscription for plan selection
  const handleUpgradeToPro = () => {
    setActiveTab('settings');
    setSettingsTab('subscription');
    setMobileMenuOpen(false);
    window.scrollTo(0, 0);
  };

  // Free Plan activation grants full Pro access
  const handleActivateFreePlan = async () => {
    setActionLoading(true);
    try {
      const res = await authFetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPro: true })
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        alert('Free Plan activated! You now have full FX Journal Pro access.');
        fetchAccountData();
      } else {
        alert(data.error || 'Failed to activate Free Plan.');
      }
    } catch (e) {
      alert('Error activating Free Plan.');
    } finally {
      setActionLoading(false);
    }
  };

  // Custom Settings Handlers
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsName || !settingsEmail) return;
    setActionLoading(true);
    try {
      if (settingsEmail !== user?.email) {
        const { error } = await supabase.auth.updateUser({ email: settingsEmail });
        if (error) {
          alert('Failed to update email in authentication provider: ' + error.message);
          setActionLoading(false);
          return;
        }
      }

      const res = await authFetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: settingsName, email: settingsEmail })
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        if (data.user?.id) {
          persistAuthSession(data.user.id, data.user.email || settingsEmail);
        }
        alert('General profile settings updated successfully.');
      } else {
        alert(data.error || 'Failed to update settings.');
      }
    } catch (e) {
      alert('Error updating profile.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsCurrPassword || !settingsNewPassword || !settingsConfirmPassword) {
      alert('Please fill out all password fields.');
      return;
    }
    if (settingsNewPassword !== settingsConfirmPassword) {
      alert('New passwords do not match!');
      return;
    }
    setActionLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: settingsNewPassword
      });
      if (!error) {
        alert('Password updated successfully.');
        setSettingsCurrPassword('');
        setSettingsNewPassword('');
        setSettingsConfirmPassword('');
        setShowPasswordChange(false);
      } else {
        alert(error.message || 'Failed to update password.');
      }
    } catch (e) {
      alert('Error changing password.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveNotifications = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('notif_daily', String(dailyTradingReminder));
    localStorage.setItem('notif_loss', String(maxDailyLossAlert));
    localStorage.setItem('notif_journal', String(journalCompletionReminder));
    alert('Notification preferences updated successfully!');
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm('Are you sure you want to cancel your FX Journal Pro subscription? You will lose access to premium features.')) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await authFetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPro: false })
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        alert('Your premium subscription has been successfully cancelled. You are now on the Free Sandbox Trial.');
      } else {
        alert(data.error || 'Failed to cancel subscription.');
      }
    } catch (e) {
      alert('Error cancelling subscription.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReportBug = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bugTitle || !bugSteps) {
      alert('Please fill out all fields.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await authFetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `[Bug Report - Severity: ${bugSeverity}] ${bugTitle}`,
          description: `Steps to reproduce:\n${bugSteps}`,
          category: 'Bug'
        })
      });
      if (res.ok) {
        setBugTitle('');
        setBugSteps('');
        setActiveAboutForm('none');
        // Refresh tickets list
        const tickRes = await authFetch('/api/tickets');
        const tickData = await tickRes.json();
        setTickets(tickData.tickets);
        alert('Bug report submitted successfully. Thank you for helping us improve FX Journal Pro.');
      } else {
        alert('Failed to submit bug report.');
      }
    } catch (err) {
      alert('Error submitting bug report.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFeatureRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!featureRequestTitle || !featureRequestDesc) {
      alert('Please fill out all fields.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await authFetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `[Feature Request] ${featureRequestTitle}`,
          description: featureRequestDesc,
          category: 'Feature Request'
        })
      });
      if (res.ok) {
        setFeatureRequestTitle('');
        setFeatureRequestDesc('');
        setActiveAboutForm('none');
        // Refresh tickets list
        const tickRes = await authFetch('/api/tickets');
        const tickData = await tickRes.json();
        setTickets(tickData.tickets);
        alert('Feature request submitted successfully. Our product team will review this soon!');
      } else {
        alert('Failed to submit feature request.');
      }
    } catch (err) {
      alert('Error submitting feature request.');
    } finally {
      setActionLoading(false);
    }
  };

  // Support ticket logging
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketTitle || !ticketDescription) return;
    setActionLoading(true);
    try {
      const res = await authFetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: ticketTitle,
          description: ticketDescription,
          category: ticketCategory
        })
      });
      if (res.ok) {
        setShowTicketModal(false);
        setTicketTitle('');
        setTicketDescription('');
        // Refresh tickets list
        const tickRes = await authFetch('/api/tickets');
        const tickData = await tickRes.json();
        setTickets(tickData.tickets);
        alert('Support ticket submitted successfully. Our engineers will respond shortly.');
      }
    } catch (err) {
      alert('Error creating support ticket.');
    } finally {
      setActionLoading(false);
    }
  };

  // Update Risk Rules
  const handleSaveRiskSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const accId = selectedAccountId || activeAccount?.id || (accounts.length > 0 ? accounts[0].id : '');
    if (!accId) return;
    const currentRisk = riskSettings || {
      id: `r_${Date.now()}`,
      accountId: accId,
      riskPerTradeLimit: 2.0,
      dailyLossLimit: 500,
      weeklyLossLimit: 1500,
      maxDrawdownLimit: 10.0,
      disciplineEnabled: true,
      maxTradesPerDay: 5
    };
    setActionLoading(true);
    try {
      const res = await authFetch(`/api/risk-settings/${accId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentRisk)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.riskSettings) {
          setRiskSettings(data.riskSettings);
        }
        alert('Risk parameters saved successfully. Drawdown scanners are active.');
      } else {
        alert('Error saving risk settings');
      }
    } catch (err) {
      alert('Error saving risk settings');
    } finally {
      setActionLoading(false);
    }
  };

  const isPortfolioGuardOn = riskSettings ? (riskSettings.disciplineEnabled ?? true) : true;

  const handleTogglePortfolioGuard = async (newState: boolean) => {
    const accId = selectedAccountId || activeAccount?.id || (accounts.length > 0 ? accounts[0].id : '');
    if (!accId) return;
    const currentRisk: RiskSettings = riskSettings || {
      id: `r_${Date.now()}`,
      accountId: accId,
      riskPerTradeLimit: 2.0,
      dailyLossLimit: 500,
      weeklyLossLimit: 1500,
      maxDrawdownLimit: 10.0,
      disciplineEnabled: true,
      maxTradesPerDay: 5
    };
    const updated = { ...currentRisk, accountId: accId, disciplineEnabled: newState };
    setRiskSettings(updated);
    try {
      const res = await authFetch(`/api/risk-settings/${accId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.riskSettings) {
          setRiskSettings(data.riskSettings);
        }
      }
    } catch (err) {
      console.error('Failed to toggle portfolio guard', err);
    }
  };

  const updateRiskSettingField = (field: keyof RiskSettings, value: any) => {
    const accId = selectedAccountId || activeAccount?.id || (accounts.length > 0 ? accounts[0].id : '');
    const currentRisk: RiskSettings = riskSettings || {
      id: `r_${Date.now()}`,
      accountId: accId,
      riskPerTradeLimit: 2.0,
      dailyLossLimit: 500,
      weeklyLossLimit: 1500,
      maxDrawdownLimit: 10.0,
      disciplineEnabled: true,
      maxTradesPerDay: 5
    };
    setRiskSettings({ ...currentRisk, accountId: accId, [field]: value });
  };

  // Add tag helper
  const addCustomTag = () => {
    const clean = customTagInput.trim();
    if (clean && !tradeTags.includes(clean)) {
      setTradeTags([...tradeTags, clean]);
      setCustomTagInput('');
    }
  };

  const removeTag = (t: string) => {
    setTradeTags(tradeTags.filter(tg => tg !== t));
  };

  // ==========================================
  // MATHEMATICAL STATISTICS & METRICS ENGINE
  // ==========================================

  const isTradingTrade = (t: Trade) => t.type !== 'Deposit' && t.type !== 'Withdrawal';
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
      name: `Trade ${idx + 1}`,
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
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
  });

  // Export report to CSV helper
  const getExportRange = (): { start?: Date; end?: Date } => {
    if (exportPreset === 'custom') {
      const start = exportCustomStart ? new Date(exportCustomStart + 'T00:00:00') : undefined;
      const end = exportCustomEnd ? new Date(exportCustomEnd + 'T23:59:59.999') : undefined;
      return { start, end };
    }
    if (exportPreset === 'all') return {};
    const now = new Date();
    switch (exportPreset) {
      case 'this-month': {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        return { start, end };
      }
      case 'last-month': {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        return { start, end };
      }
      case 'last-3-months': {
        const start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        return { start, end };
      }
      case 'last-6-months': {
        const start = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        return { start, end };
      }
      case 'this-year': {
        const start = new Date(now.getFullYear(), 0, 1);
        const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        return { start, end };
      }
      default:
        return {};
    }
  };

  const filterTradesByRange = (range: { start?: Date; end?: Date }) => {
    return trades.filter(t => {
      const d = new Date(t.date);
      if (isNaN(d.getTime())) return !range.start && !range.end;
      if (range.start && d < range.start) return false;
      if (range.end && d > range.end) return false;
      return true;
    });
  };

  const getPeriodLabel = (range: { start?: Date; end?: Date }): string => {
    if (!range.start && !range.end) return 'All Time';
    const fmt = (d?: Date) => d ? d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '...';
    return `${fmt(range.start)} - ${fmt(range.end)}`;
  };

  const computeExportStats = (inRange: Trade[]) => {
    const wins = inRange.filter(t => t.profit > 0);
    const losses = inRange.filter(t => t.profit <= 0);
    const totalProfit = inRange.reduce((s, t) => s + Math.max(t.profit, 0), 0);
    const totalLoss = Math.abs(inRange.reduce((s, t) => s + Math.min(t.profit, 0), 0));
    const winRate = inRange.length > 0 ? (wins.length / inRange.length) * 100 : 0;
    const netProfit = totalProfit - totalLoss;
    const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : (totalProfit > 0 ? totalProfit : 0);
    return { wins, losses, totalProfit, totalLoss, winRate, netProfit, profitFactor };
  };

  const getExportFilename = (ext: string): string => {
    const safeName = (activeAccount?.name || 'export').replace(/[^a-zA-Z0-9]+/g, '_');
    const periodPart = exportPreset === 'custom'
      ? `${exportCustomStart || 'from'}_${exportCustomEnd || 'to'}`
      : exportPreset;
    return `fx_journal_pro_${safeName}_${periodPart}.${ext}`;
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', filename);
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const BRAND_WEBSITE = 'https://fxjournalpro.com';
  const loadBrandLogoDataUrl = async (): Promise<string | null> => {
    try {
      const res = await fetch('/fxjournalpro-logo.png');
      if (!res.ok) return null;
      const blob = await res.blob();
      return await new Promise<string | null>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  const handleExportExcel = async () => {
    const mod: any = await import('exceljs');
    const ExcelJS = mod.default || mod;
    const range = getExportRange();
    const inRange = filterTradesByRange(range);
    const tradingInRange = inRange.filter(isTradingTrade);
    const stats = computeExportStats(tradingInRange);

    const NAVY = 'FF0F1E36';
    const BLUE = 'FF2F5B8E';
    const NAVY_TEXT = 'FF1E3A5F';
    const WHITE = 'FFFFFFFF';
    const META_FILL = 'FFEEF2F7';
    const SUMMARY_FILL = 'FFF1F5FA';
    const ALT_FILL = 'FFF4F7FB';
    const TOTAL_FILL = 'FFE3EAF3';
    const GREEN = 'FF1E7D32';
    const RED = 'FFC62828';
    const GRAY = 'FF6B7280';
    const TEXT_COLOR = 'FF1F2937';
    const BORDER = 'FFB7C4D6';
    const BRAND = 'FF1F4E79';

    const TABLE_COLS = 12;
    const SPACER_COL = 13;
    const SUMMARY_LABEL_COL = 14;
    const SUMMARY_VALUE_COL = 15;
    const TOTAL_COLS = 15;

    const solid = (rgb: string) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb: rgb } });
    const fnt = (size: number, color: string, bold = false) => ({ name: 'Calibri', size, bold, color: { argb: color } });
    const algn = (horizontal: 'left' | 'center' | 'right', vertical = 'middle') => ({ horizontal, vertical });
    const borderAll = (color: string) => ({
      top: { style: 'thin', color: { argb: color } },
      bottom: { style: 'thin', color: { argb: color } },
      left: { style: 'thin', color: { argb: color } },
      right: { style: 'thin', color: { argb: color } },
    });

    const TABLE_HEADER = 7;
    const DATA_START = 8;
    const SUMMARY_START = 8;
    const TOTAL = DATA_START + inRange.length;
    const FOOTER = Math.max(TOTAL + 2, SUMMARY_START + 8);
    const SPACER_AFTER = FOOTER - 1;

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Journal');

    const outlineMergedRow = (rowNum: number) => {
      for (let c = 1; c <= TOTAL_COLS; c++) {
        const cell = ws.getCell(rowNum, c);
        cell.border = {
          top: { style: 'thin', color: { argb: BORDER } },
          bottom: { style: 'thin', color: { argb: BORDER } },
          left: c === 1 ? { style: 'thin', color: { argb: BORDER } } : undefined,
          right: c === TOTAL_COLS ? { style: 'thin', color: { argb: BORDER } } : undefined,
        };
      }
    };

    const title = ws.getCell('A1');
    title.value = 'FX JOURNAL PRO - TRADING JOURNAL';
    ws.mergeCells(1, 1, 1, TOTAL_COLS);
    title.font = fnt(18, WHITE, true);
    title.fill = solid(BRAND);
    title.alignment = algn('center');
    ws.getRow(1).height = 36;

    const subtitle = ws.getCell('A2');
    subtitle.value = 'Trading Performance Report';
    ws.mergeCells(2, 1, 2, TOTAL_COLS);
    subtitle.font = fnt(10, WHITE, true);
    subtitle.fill = solid(BRAND);
    subtitle.alignment = algn('center');
    ws.getRow(2).height = 18;

    const meta = [
      `Account: ${activeAccount?.name || 'N/A'}`,
      `Period: ${getPeriodLabel(range)}`,
      `Exported: ${new Date().toLocaleString()}`,
    ];
    meta.forEach((text, i) => {
      const r = 3 + i;
      const cell = ws.getCell(r, 1);
      cell.value = text;
      ws.mergeCells(r, 1, r, TOTAL_COLS);
      cell.font = fnt(10, NAVY_TEXT);
      cell.fill = solid(META_FILL);
      cell.alignment = algn('left');
      ws.getRow(r).height = 16;
      for (let c = 1; c <= TOTAL_COLS; c++) {
        const cc = ws.getCell(r, c);
        cc.border = {
          top: { style: 'thin', color: { argb: BORDER } },
          bottom: { style: 'thin', color: { argb: BORDER } },
          left: c === 1 ? { style: 'thin', color: { argb: BORDER } } : undefined,
          right: c === TOTAL_COLS ? { style: 'thin', color: { argb: BORDER } } : undefined,
        };
      }
    });
    ws.getRow(6).height = 6;

    const sTitle = ws.getCell(TABLE_HEADER, SUMMARY_LABEL_COL);
    sTitle.value = 'PERFORMANCE SUMMARY';
    ws.mergeCells(TABLE_HEADER, SUMMARY_LABEL_COL, TABLE_HEADER, SUMMARY_VALUE_COL);
    sTitle.font = fnt(10, WHITE, true);
    sTitle.fill = solid(NAVY);
    sTitle.alignment = algn('center');
    sTitle.border = borderAll(BORDER);
    ws.getRow(TABLE_HEADER).height = 22;

    const net = stats.netProfit;
    const summaryRows: { label: string; value: number; numFmt: string; color?: string; bold?: boolean }[] = [
      { label: 'Total Trades', value: tradingInRange.length, numFmt: '0' },
      { label: 'No. of Winning Trades', value: stats.wins.length, numFmt: '0' },
      { label: 'No. of Losing Trades', value: stats.losses.length, numFmt: '0' },
      { label: 'Win Rate (%)', value: stats.winRate, numFmt: '0.0' },
      { label: 'Total Profit', value: stats.totalProfit, numFmt: '#,##0.00', color: GREEN, bold: true },
      { label: 'Total Loss', value: stats.totalLoss, numFmt: '#,##0.00', color: RED, bold: true },
      { label: 'Net Profit/Loss', value: stats.netProfit, numFmt: '#,##0.00', color: net > 0 ? GREEN : net < 0 ? RED : undefined, bold: true },
    ];
    summaryRows.forEach((s, i) => {
      const r = SUMMARY_START + i;
      const lc = ws.getCell(r, SUMMARY_LABEL_COL);
      const vc = ws.getCell(r, SUMMARY_VALUE_COL);
      lc.value = s.label;
      vc.value = s.value;
      lc.font = fnt(10, NAVY_TEXT, true);
      lc.fill = solid(SUMMARY_FILL);
      lc.alignment = algn('left');
      lc.border = borderAll(BORDER);
      vc.font = fnt(10, s.color || TEXT_COLOR, !!s.bold);
      vc.fill = solid('FFFFFFFF');
      vc.alignment = algn('right');
      vc.border = borderAll(BORDER);
      vc.numFmt = s.numFmt;
      ws.getRow(r).height = 20;
    });

    const lastSum = SUMMARY_START + summaryRows.length - 1;
    const tL = ws.getCell(TABLE_HEADER, SUMMARY_LABEL_COL);
    const tV = ws.getCell(TABLE_HEADER, SUMMARY_VALUE_COL);
    tL.border = { ...tL.border, top: { style: 'medium', color: { argb: BLUE } }, left: { style: 'medium', color: { argb: BLUE } } };
    tV.border = { ...tV.border, top: { style: 'medium', color: { argb: BLUE } }, right: { style: 'medium', color: { argb: BLUE } } };
    const bL = ws.getCell(lastSum, SUMMARY_LABEL_COL);
    const bV = ws.getCell(lastSum, SUMMARY_VALUE_COL);
    bL.border = { ...bL.border, left: { style: 'medium', color: { argb: BLUE } }, bottom: { style: 'medium', color: { argb: BLUE } } };
    bV.border = { ...bV.border, right: { style: 'medium', color: { argb: BLUE } }, bottom: { style: 'medium', color: { argb: BLUE } } };

    const headers = ['Date', 'Symbol', 'Type', 'Lots', 'Entry', 'Exit', 'Profit', 'Commission', 'Swap', 'Strategy', 'Emotion', 'Notes'];
    const hr = ws.getRow(TABLE_HEADER);
    headers.forEach((h, i) => {
      const c = hr.getCell(i + 1);
      c.value = h;
      c.font = fnt(10, WHITE, true);
      c.fill = solid(BLUE);
      c.alignment = algn('center');
      c.border = borderAll(BORDER);
    });
    hr.height = 22;

    const fmtDate = (iso: string): string => {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      const p = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    };

    inRange.forEach((t, idx) => {
      const row = ws.getRow(DATA_START + idx);
      const vals: (string | number)[] = [
        fmtDate(t.date), t.symbol, t.type, t.lotSize, t.entryPrice, t.exitPrice,
        t.profit, t.commission, t.swap, t.strategy || '', t.emotion || '', t.notes || '',
      ];
      vals.forEach((v, i) => {
        const c = row.getCell(i + 1);
        c.value = v;
        c.border = borderAll(BORDER);
        c.alignment = i === 0 || i >= 9 ? algn('left') : i === 1 || i === 2 ? algn('center') : algn('right');
        if (i === 3) c.numFmt = '0.00';
        if (i === 4 || i === 5) c.numFmt = '0.00000';
        if (i === 6 || i === 7 || i === 8) {
          c.numFmt = '#,##0.00';
          const num = Number(v);
          c.font = i === 6
            ? fnt(10, num > 0 ? GREEN : num < 0 ? RED : GRAY, num !== 0)
            : fnt(10, num > 0 ? GREEN : num < 0 ? RED : TEXT_COLOR);
        }
        if (idx % 2 === 1) c.fill = solid(ALT_FILL);
      });
      row.height = 20;
    });

    const netProfit = stats.netProfit;
    const totLots = inRange.reduce((s, t) => s + (Number(t.lotSize) || 0), 0);
    const totCommission = inRange.reduce((s, t) => s + (Number(t.commission) || 0), 0);
    const totSwap = inRange.reduce((s, t) => s + (Number(t.swap) || 0), 0);
    const tr = ws.getRow(TOTAL);
    tr.getCell(1).value = 'TOTALS';
    tr.getCell(4).value = totLots;
    tr.getCell(7).value = netProfit;
    tr.getCell(8).value = totCommission;
    tr.getCell(9).value = totSwap;
    [1, 4, 7, 8, 9].forEach(col => {
      const c = tr.getCell(col);
      c.fill = solid(TOTAL_FILL);
      c.alignment = col === 1 ? algn('left') : algn('right');
      c.border = { ...borderAll(BORDER), top: { style: 'medium', color: { argb: BLUE } } };
      if (col >= 7) {
        c.numFmt = '#,##0.00';
        const num = Number(c.value);
        c.font = fnt(10, num > 0 ? GREEN : num < 0 ? RED : NAVY_TEXT, true);
      } else {
        c.font = fnt(10, NAVY_TEXT, true);
      }
    });
    tr.height = 22;

    ws.getRow(SPACER_AFTER).height = 6;

    const foot = ws.getCell(FOOTER, 1);
    foot.value = BRAND_WEBSITE;
    ws.mergeCells(FOOTER, 1, FOOTER, TOTAL_COLS);
    foot.font = fnt(10, WHITE, true);
    foot.fill = solid(BRAND);
    foot.alignment = algn('center');
    ws.getRow(FOOTER).height = 22;

    outlineMergedRow(FOOTER);

    const fmtMoneyLen = (v: number) => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).length;
    const displayLen = (v: unknown, col: number): number => {
      if (v === null || v === undefined) return 0;
      if (typeof v === 'number') {
        if (col === 4) return fmtMoneyLen(v);
        if (col === 5 || col === 6) return v.toLocaleString('en-US', { minimumFractionDigits: 5, maximumFractionDigits: 5 }).length;
        if (col >= 7 && col <= 9) return fmtMoneyLen(v);
        return String(v).length;
      }
      return String(v).length;
    };
    const colMax: number[] = Array(TABLE_COLS).fill(0);
    for (let r = TABLE_HEADER; r <= TOTAL; r++) {
      const row = ws.getRow(r);
      for (let c = 1; c <= TABLE_COLS; c++) {
        const cell = row.getCell(c);
        if (cell.value === null || cell.value === undefined) continue;
        colMax[c - 1] = Math.max(colMax[c - 1], displayLen(cell.value, c));
      }
    }
    const minW = [11, 10, 8, 8, 10, 10, 10, 13, 10, 12, 12, 8];
    const maxW = [14, 16, 12, 12, 14, 14, 14, 16, 12, 24, 18, 45];
    const widths = colMax.map((len, i) => Math.max(minW[i], Math.min(maxW[i], Math.ceil(len * 1.15) + 2)));
    widths.push(3, 23, 13);
    ws.columns = widths.map(width => ({ width }));

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    downloadBlob(blob, getExportFilename('xlsx'));
  };

  const handleExportPdf = async () => {
    const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
    const logoDataUrl = await loadBrandLogoDataUrl();
    const range = getExportRange();
    const inRange = filterTradesByRange(range);
    const tradingInRange = inRange.filter(isTradingTrade);
    const stats = computeExportStats(tradingInRange);

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    // Brand header band
    doc.setFillColor(15, 30, 54);
    doc.rect(0, 0, pageW, 28, 'F');
    doc.setFillColor(16, 185, 129);
    doc.rect(0, 28, pageW, 1.6, 'F');

    if (logoDataUrl) {
      doc.addImage(logoDataUrl, 'PNG', 12, 5, 18, 18);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(255, 255, 255);
      doc.text('FXJournalPro', 34, 16);
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(17);
      doc.setTextColor(255, 255, 255);
      doc.text('FXJournalPro', 12, 17);
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(255, 255, 255);
    doc.textWithLink(BRAND_WEBSITE, pageW - 12, 12, { url: BRAND_WEBSITE });

    // Report title block
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    doc.setTextColor(15, 30, 54);
    doc.text('Trading Journal Export', 12, 44);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(100, 110, 125);
    doc.text(`Account: ${activeAccount?.name || 'N/A'}   |   Period: ${getPeriodLabel(range)}   |   Exported: ${new Date().toLocaleDateString()}`, 12, 50.5);

    autoTable(doc, {
      head: [['Performance Summary', '']],
      body: [
        ['Total Number of Trades', String(tradingInRange.length)],
        ['Number of Winning Trades', String(stats.wins.length)],
        ['Number of Losing Trades', String(stats.losses.length)],
        ['Win Rate (%)', `${stats.winRate.toFixed(2)}%`],
        ['Total Profit', `${stats.totalProfit >= 0 ? '+' : ''}$${stats.totalProfit.toFixed(2)}`],
        ['Total Loss', `-$${stats.totalLoss.toFixed(2)}`],
        ['Net Profit', `${stats.netProfit >= 0 ? '+' : ''}$${stats.netProfit.toFixed(2)}`],
        ['Profit Factor', stats.profitFactor.toFixed(2)],
      ],
      startY: 56,
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 95], textColor: 255, fontSize: 10, fontStyle: 'bold', halign: 'center' },
      bodyStyles: { fontSize: 8.5, cellPadding: 2 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 70 }, 1: { halign: 'right' } },
      styles: { cellPadding: 2, valign: 'middle' },
      margin: { left: 12, right: 12 },
    });

    const lastY = (doc as any).lastAutoTable?.finalY || 45;
    autoTable(doc, {
      head: [['Date', 'Symbol', 'Type', 'Lots', 'Entry', 'Exit', 'Profit', 'Commission', 'Swap', 'Strategy', 'Emotion']],
      body: inRange.map(t => [
        new Date(t.date).toLocaleDateString(),
        t.symbol,
        t.type,
        String(t.lotSize),
        String(t.entryPrice),
        String(t.exitPrice),
        `${t.profit >= 0 ? '+' : ''}${t.profit.toFixed(2)}`,
        String(t.commission),
        String(t.swap),
        t.strategy || '',
        t.emotion || '',
      ]),
      startY: lastY + 8,
      theme: 'striped',
      headStyles: { fillColor: [47, 91, 142], textColor: 255, fontSize: 7.5, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7 },
      alternateRowStyles: { fillColor: [242, 245, 249] },
      styles: { cellPadding: 1.8, valign: 'middle', overflow: 'linebreak' },
      columnStyles: { 6: { halign: 'right' }, 7: { halign: 'right' }, 8: { halign: 'right' } },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 6) {
          const val = parseFloat(String(data.cell.raw));
          if (val > 0) data.cell.styles.textColor = [16, 122, 87];
          else if (val < 0) data.cell.styles.textColor = [180, 35, 50];
        }
      },
      margin: { left: 12, right: 12 },
    });

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(120, 130, 145);
      doc.setFont('helvetica', 'normal');
      doc.text(`FXJournalPro | ${BRAND_WEBSITE}`, 12, pageH - 7);
      doc.text(`Page ${i} of ${pageCount}`, pageW - 12, pageH - 7, { align: 'right' });
    }

    const blob = doc.output('blob');
    downloadBlob(blob, getExportFilename('pdf'));
  };

  const handleExportJournal = async () => {
    if (exportFormat === 'xlsx') await handleExportExcel();
    else await handleExportPdf();
    setShowExportModal(false);
  };

  // ── MT5 paste parser ──
  const parseMt5PastedText = (text: string): any[] => {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) return [];

    // Detect delimiter (tab vs comma)
    const tabCount = (lines[0].match(/\t/g) || []).length;
    const commaCount = (lines[0].match(/,/g) || []).length;
    const delim = tabCount >= commaCount ? '\t' : ',';

    const rows = lines.map(l => l.split(delim).map(c => c.trim()));
    const rawHeaders = rows[0];
    const headerRow = rows[0].map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

    // Find column indices by matching header aliases
    const findIdx = (aliases: string[]): number => {
      for (const alias of aliases) {
        const idx = headerRow.indexOf(alias);
        if (idx !== -1) return idx;
      }
      // Try partial matches (e.g. "price" in "closeprice")
      for (const alias of aliases) {
        const idx = headerRow.findIndex(h => h.includes(alias));
        if (idx !== -1) return idx;
      }
      return -1;
    };

    // For columns that may appear twice (Price), get all matching indices
    const findAllIdx = (aliases: string[]): number[] => {
      const indices: number[] = [];
      for (const alias of aliases) {
        headerRow.forEach((h, i) => {
          if (h === alias && !indices.includes(i)) indices.push(i);
        });
      }
      // fallback: partial match for any not yet found
      for (const alias of aliases) {
        headerRow.forEach((h, i) => {
          if (h.includes(alias) && !indices.includes(i)) indices.push(i);
        });
      }
      return indices;
    };

    const timeIdx = findIdx(['time', 'opentime', 'open_time', 'openingtime', 'date']);
    const typeIdx = findIdx(['type', 'direction', 'kind']);
    const lotsIdx = findIdx(['lots', 'size', 'volume', 'lotes']);
    const symbolIdx = findIdx(['symbol', 'item', 'instrument', 'pair', 'symbols']);
    const slIdx = findIdx(['stoploss', 'stop_loss', 'sl']);
    const tpIdx = findIdx(['takeprofit', 'take_profit', 'tp']);
    const closeTimeIdx = findIdx(['closetime', 'close_time', 'closingtime']);
    const commissionIdx = findIdx(['commission', 'comm']);
    const swapIdx = findIdx(['swap', 'taxes', 'tax', 'swaps']);
    const profitIdx = findIdx(['profit', 'pnl', 'grosspnl', 'netpnl']);

    // Price columns: first match is entry, last match is exit
    const priceIndices = findAllIdx(['price', 'rate', 'openprice', 'open_price', 'closeprice', 'close_price', 'exitprice', 'exit_price']);
    const entryIdx = priceIndices.length > 0 ? priceIndices[0] : -1;
    const exitIdx = priceIndices.length > 1 ? priceIndices[priceIndices.length - 1] : (priceIndices.length === 1 ? priceIndices[0] : -1);

    const getVal = (idx: number, row: string[]): string => idx !== -1 && idx < row.length ? row[idx] : '';

    const results: any[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < 3) continue;

      const rawType = getVal(typeIdx, row).toLowerCase();
      const tradeType = rawType === 'buy' ? 'Buy' as const : rawType === 'sell' ? 'Sell' as const : null;
      if (!tradeType) continue;

      const symbol = getVal(symbolIdx, row).toUpperCase();
      if (!symbol) continue;

      const parseNum = (s: string): number => {
        const cleaned = s.replace(/[^0-9.\-]/g, '');
        return cleaned ? parseFloat(cleaned) : 0;
      };

      const rawDate = getVal(timeIdx, row) || getVal(closeTimeIdx, row);
      let parsedDate: string;
      if (rawDate) {
        const d = new Date(rawDate.replace(/\./g, '-').replace(/\s+/g, 'T'));
        parsedDate = isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
      } else {
        parsedDate = new Date().toISOString();
      }

      const lotSize = parseNum(getVal(lotsIdx, row));
      const entryPrice = parseNum(getVal(entryIdx, row));
      const exitPrice = parseNum(getVal(exitIdx, row));
      const profit = parseNum(getVal(profitIdx, row));
      const commission = parseNum(getVal(commissionIdx, row));
      const swap = parseNum(getVal(swapIdx, row));
      const sl = getVal(slIdx, row) ? parseNum(getVal(slIdx, row)) : undefined;
      const tp = getVal(tpIdx, row) ? parseNum(getVal(tpIdx, row)) : undefined;

      results.push({
        date: parsedDate,
        symbol: symbol || 'UNKNOWN',
        type: tradeType,
        lotSize: lotSize || 0.01,
        entryPrice: entryPrice || 0,
        exitPrice: exitPrice || 0,
        stopLoss: sl && sl !== 0 ? sl : undefined,
        takeProfit: tp && tp !== 0 ? tp : undefined,
        profit: profit || 0,
        commission: commission || 0,
        swap: swap || 0,
        strategy: 'Pasted from MT5',
        emotion: 'Calm',
        tags: ['MT5 Paste'],
        isMt5Sync: true
      });
    }

    return results;
  };

  // UI Currency formatting
  const formatValue = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: activeAccount?.currency || 'USD'
    }).format(val);
  };

  // Rendering check
  if (loading && !user) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center font-sans">
        <div className="text-center space-y-6">
          <div className="relative h-16 w-16 mx-auto flex items-center justify-center">
            <Logo size={44} className="animate-pulse" />
            <div className="absolute inset-0 rounded-full border-2 border-slate-200 border-t-blue-600 animate-spin"></div>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 font-display">FX Journal Pro</h1>
            <p className="text-xs text-slate-400 mt-1">Loading your personalized trading workspace...</p>
          </div>
        </div>
      </div>
    );
  }

  // No user - show login page
  if (!user) {
    return (
      <LoginPage
        isSupabaseConfigured={isSupabaseConfigured}
        onLoginSuccess={async () => {
          // Re-trigger bootstrapSession to fetch user details and accounts dynamically
          const storedUserId = sessionStorage.getItem('auth_user_id') || localStorage.getItem('auth_user_id');
          const storedEmail = sessionStorage.getItem('auth_email') || localStorage.getItem('auth_email');
          if (storedUserId || storedEmail) {
            try {
              const headers: Record<string, string> = {};
              if (storedUserId) headers['x-auth-user-id'] = storedUserId;
              if (storedEmail) headers['x-auth-email'] = storedEmail;
              const res = await fetch('/api/auth/me', { headers });
              if (res.ok) {
                const data = await res.json();
                if (data.user) {
                  setUser(data.user);
                  await fetchAccountData();
                }
              }
            } catch (e) {
              console.error('Error fetching user post-login:', e);
            }
          }
          navigate('/dashboard', { replace: true });
        }}
        authFetch={authFetch}
      />
    );
  }

  // Onboarding Wizard (if registration completes but not onboarding completed)
  if (showOnboardingWizard && !user.onboardingCompleted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans antialiased text-slate-800">
        <div className="bg-white border border-slate-100 rounded-2xl shadow-xl w-full max-w-lg p-8 space-y-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-blue-600"></div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-1 rounded">Onboarding Wizard</span>
            <span className="text-xs text-slate-400">Step {onboardingStep} of 2</span>
          </div>
          {onboardingStep === 1 ? (
            <div className="space-y-5">
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-slate-900 font-display">Personalize your trading dashboard</h2>
                <p className="text-xs text-slate-500">Configure your parameters to unlock a custom experience matching your style.</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">What is your Trading Experience?</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['Beginner', 'Intermediate', 'Professional'].map((exp) => (
                      <button key={exp} type="button" onClick={() => setObExperience(exp as any)}
                        className={`p-3 border rounded-lg text-xs font-semibold text-center transition ${obExperience === exp ? 'border-blue-600 bg-blue-50/50 text-blue-700' : 'border-slate-200 hover:border-slate-300 text-slate-600'}`}>
                        {exp}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">Primary Trading Style</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['Scalping', 'Day Trading', 'Swing Trading'].map((style) => (
                      <button key={style} type="button" onClick={() => setObStyle(style as any)}
                        className={`p-3 border rounded-lg text-xs font-semibold text-center transition ${obStyle === style ? 'border-blue-600 bg-blue-50/50 text-blue-700' : 'border-slate-200 hover:border-slate-300 text-slate-600'}`}>
                        {style}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button type="button" onClick={() => setOnboardingStep(2)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg p-3 transition flex items-center justify-center gap-1.5">
                Continue Setup <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-slate-900 font-display">Select Target Markets</h2>
                <p className="text-xs text-slate-500">Pick instruments you analyze daily to configure trackers.</p>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {['Forex', 'Gold', 'Crypto', 'Indices'].map((market) => {
                    const active = obMarkets.includes(market);
                    return (
                      <button key={market} type="button"
                        onClick={() => { if (active) setObMarkets(obMarkets.filter(m => m !== market)); else setObMarkets([...obMarkets, market]); }}
                        className={`p-4 border rounded-lg text-xs font-semibold text-left transition flex items-center justify-between ${active ? 'border-blue-600 bg-blue-50/50 text-blue-700' : 'border-slate-200 hover:border-slate-300 text-slate-600'}`}>
                        {market}
                        <CheckCircle2 className={`h-4 w-4 ${active ? 'text-blue-600' : 'text-slate-300'}`} />
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setOnboardingStep(1)}
                  className="w-1/3 border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs rounded-lg p-3 transition">Back</button>
                <button type="button" disabled={actionLoading} onClick={submitOnboarding}
                  className="w-2/3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg p-3 transition flex items-center justify-center gap-1.5 disabled:opacity-50">
                  {actionLoading ? 'Initializing Platform...' : 'Complete & Launch'} <Check className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Primary Platform Shell Layout
  return (
    <div className="min-h-screen md:h-screen md:overflow-hidden bg-[#FBFBFA]/40 font-sans antialiased text-slate-800 flex flex-col">
      {/* Unified Top Header */}
      <header className="fixed top-0 left-0 right-0 h-[60px] z-[50] bg-[#FBFBFA]/90 dark:bg-slate-950/90 backdrop-blur-xl px-5 flex items-center justify-between">
        {/* Top Left: Logo & Brand */}
        <div className="flex items-center gap-2.5">
          <Logo size={28} />
          <div className="text-[14px] font-extrabold leading-tight text-slate-800 dark:text-slate-200 tracking-wide uppercase">
            FXJournalPro
          </div>
        </div>
        
        {/* Top Right: Actions */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-1.5 border border-slate-200/80 rounded-lg hover:bg-slate-50 transition text-slate-500 dark:border-white/10 dark:hover:bg-slate-900/40 shadow-xs dark:text-slate-400 flex items-center justify-center"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          {/* Notification Bell */}
          <div className="relative">
            <button 
              onClick={() => { setShowMobileNavNotifications(!showMobileNavNotifications); setShowMobileNavProfile(false); }}
              className="p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors relative"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full border border-[#FBFBFA] dark:border-slate-900"></span>
            </button>
            
            {/* Notification Dropdown */}
            {showMobileNavNotifications && (
              <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="font-bold text-sm">Notifications</h3>
                </div>
                <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  <p>No new notifications</p>
                </div>
              </div>
            )}
          </div>
          
          {/* User Profile */}
          <div className="relative">
            <button 
              onClick={() => { setShowMobileNavProfile(!showMobileNavProfile); setShowMobileNavNotifications(false); }}
              className="p-0.5 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 text-white"
            >
              <div className="bg-[#FBFBFA] dark:bg-slate-900 rounded-full p-0.5">
                <User className="h-4 w-4 text-slate-700 dark:text-slate-300" />
              </div>
            </button>
            
            {/* Profile Dropdown */}
            {showMobileNavProfile && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                  <p className="font-bold text-sm truncate">Hello, {user?.name || 'Trader'}</p>
                </div>
                <div className="p-2 space-y-1">
                  <button onClick={() => { setActiveTab('settings'); setShowMobileNavProfile(false); }} className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2">
                    <Shield className="h-4 w-4" /> Account Settings
                  </button>

                  <div className="border-t border-slate-100 dark:border-slate-800 my-1"></div>
                  <button onClick={() => { handleLogout(); setShowMobileNavProfile(false); }} className="w-full text-left px-3 py-2 text-sm text-rose-600 dark:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors flex items-center gap-2">
                    <LogOut className="h-4 w-4" /> Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
      
      <div className="flex flex-1 md:overflow-hidden relative pt-[60px]">
      {/* Sidebar Navigation */}
      <aside className={`hidden md:flex bg-white dark:bg-slate-950 border-r border-slate-200/80 dark:border-slate-800/80 flex-shrink-0 flex-col items-center justify-between z-20 md:h-full overflow-hidden ${desktopSidebarOpen ? 'w-64' : 'w-24 items-center'} py-5`}>
        <div className={`space-y-6 w-full flex flex-col ${desktopSidebarOpen ? 'items-start px-6' : 'items-center'}`}>
          <div className={`flex w-full ${desktopSidebarOpen ? 'justify-end' : 'justify-center'} mb-2`}>
            <button
              onClick={() => setDesktopSidebarOpen(!desktopSidebarOpen)}
              className="p-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all"
              title="Toggle Sidebar"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>

          {/* Primary Sidebar Links */}
          <nav className="flex flex-col gap-2 w-full px-2">
            {isAdmin && (
              <button
                onClick={() => { setActiveTab('admin'); setMobileMenuOpen(false); }}
                title="Admin Panel"
                className={`flex ${desktopSidebarOpen ? 'flex-row items-center justify-start gap-4 px-4' : 'flex-col items-center justify-center gap-1 mx-auto'} w-full ${desktopSidebarOpen ? 'h-12' : 'h-14'} rounded-2xl transition-all duration-200 ${
                  activeTab === 'admin' 
                    ? 'bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-white shadow-sm' 
                    : 'text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10'
                }`}
              >
                <Shield className={desktopSidebarOpen ? "h-5 w-5" : "h-4 w-4"} />
                <span className={`${desktopSidebarOpen ? 'text-sm' : 'text-[9px]'} font-bold`}>Admin</span>
              </button>
            )}
            
            <button
              onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
              title="Dashboard"
              className={`flex ${desktopSidebarOpen ? 'flex-row items-center justify-start gap-4 px-4' : 'flex-col items-center justify-center gap-1 mx-auto'} w-[92%] mx-auto ${desktopSidebarOpen ? 'h-12' : 'h-14'} rounded-2xl transition-all duration-300 ease-out ${
                activeTab === 'dashboard' 
                  ? 'bg-slate-200 text-slate-900 dark:bg-slate-800/80 dark:text-white dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_20px_rgba(255,255,255,0.02)] dark:border dark:border-slate-700/50 shadow-sm transform dark:scale-105' 
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BarChart3 className={desktopSidebarOpen ? "h-5 w-5" : "h-4 w-4"} />
              <span className={`${desktopSidebarOpen ? 'text-sm' : 'text-[9px]'} font-bold`}>Dashboard</span>
            </button>

            <button
              onClick={() => { setActiveTab('journal'); setMobileMenuOpen(false); }}
              title="Trading Journal"
              className={`relative flex ${desktopSidebarOpen ? 'flex-row items-center justify-start gap-4 px-4' : 'flex-col items-center justify-center gap-1 mx-auto'} w-full ${desktopSidebarOpen ? 'h-12' : 'h-14'} rounded-2xl transition-all duration-200 ${
                activeTab === 'journal' 
                  ? 'bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-white shadow-sm' 
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BookOpen className={desktopSidebarOpen ? "h-5 w-5" : "h-4 w-4"} />
              <span className={`${desktopSidebarOpen ? 'text-sm' : 'text-[9px]'} font-bold`}>Journal</span>
              {trades.length > 0 && (
                <span className={`absolute ${desktopSidebarOpen ? 'right-4' : 'top-1 right-1'} flex h-3.5 w-3.5 items-center justify-center text-[7px] bg-blue-500 text-white rounded-full font-bold shadow-sm`}>
                  {trades.length}
                </span>
              )}
            </button>

            <button
              onClick={() => { setActiveTab('accounts'); setMobileMenuOpen(false); }}
              title="Portfolio Accounts"
              className={`relative flex ${desktopSidebarOpen ? 'flex-row items-center justify-start gap-4 px-4' : 'flex-col items-center justify-center gap-1 mx-auto'} w-full ${desktopSidebarOpen ? 'h-12' : 'h-14'} rounded-2xl transition-all duration-200 ${
                activeTab === 'accounts' 
                  ? 'bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-white shadow-sm' 
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className={desktopSidebarOpen ? "h-5 w-5" : "h-4 w-4"} />
              <span className={`${desktopSidebarOpen ? 'text-sm' : 'text-[9px]'} font-bold`}>Accounts</span>
              {accounts.length > 0 && (
                <span className={`absolute ${desktopSidebarOpen ? 'right-4' : 'top-1 right-1'} flex h-3.5 w-3.5 items-center justify-center text-[7px] bg-emerald-500 text-white rounded-full font-bold shadow-sm`}>
                  {accounts.length}
                </span>
              )}
            </button>

            <button
              onClick={() => { setActiveTab('analytics'); setMobileMenuOpen(false); }}
              title="Analytics"
              className={`flex ${desktopSidebarOpen ? 'flex-row items-center justify-start gap-4 px-4' : 'flex-col items-center justify-center gap-1 mx-auto'} w-[92%] mx-auto ${desktopSidebarOpen ? 'h-12' : 'h-14'} rounded-2xl transition-all duration-300 ease-out ${
                activeTab === 'analytics' 
                  ? 'bg-slate-200 text-slate-900 dark:bg-slate-800/80 dark:text-white dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_20px_rgba(255,255,255,0.02)] dark:border dark:border-slate-700/50 shadow-sm transform dark:scale-105' 
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <TrendingUp className={desktopSidebarOpen ? "h-5 w-5" : "h-4 w-4"} />
              <span className={`${desktopSidebarOpen ? 'text-sm' : 'text-[9px]'} font-bold`}>Analytics</span>
            </button>

            <button
              onClick={() => { setActiveTab('calendar'); setMobileMenuOpen(false); }}
              title="Calendar"
              className={`flex ${desktopSidebarOpen ? 'flex-row items-center justify-start gap-4 px-4' : 'flex-col items-center justify-center gap-1 mx-auto'} w-[92%] mx-auto ${desktopSidebarOpen ? 'h-12' : 'h-14'} rounded-2xl transition-all duration-300 ease-out ${
                activeTab === 'calendar' 
                  ? 'bg-slate-200 text-slate-900 dark:bg-slate-800/80 dark:text-white dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_20px_rgba(255,255,255,0.02)] dark:border dark:border-slate-700/50 shadow-sm transform dark:scale-105' 
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Calendar className={desktopSidebarOpen ? "h-5 w-5" : "h-4 w-4"} />
              <span className={`${desktopSidebarOpen ? 'text-sm' : 'text-[9px]'} font-bold`}>Calendar</span>
            </button>

            <button
              onClick={() => { setFxNewsInitialTab('news'); setActiveTab('fxnews'); setMobileMenuOpen(false); }}
              title="FX News"
              className={`relative flex ${desktopSidebarOpen ? 'flex-row items-center justify-start gap-4 px-4' : 'flex-col items-center justify-center gap-1 mx-auto'} w-full ${desktopSidebarOpen ? 'h-12' : 'h-14'} rounded-2xl transition-all duration-200 ${
                activeTab === 'fxnews' 
                  ? 'bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-white shadow-sm' 
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Newspaper className={`transition-colors ${desktopSidebarOpen ? "h-5 w-5" : "h-4 w-4"} ${activeTab === 'fxnews' ? 'text-blue-600 dark:text-blue-400' : ''}`} />
              <span className={`${desktopSidebarOpen ? 'text-sm' : 'text-[9px]'} font-bold`}>FX News</span>
              <span className={`absolute ${desktopSidebarOpen ? 'right-4' : 'top-1.5 right-1.5'} h-1.5 w-1.5 bg-blue-500 rounded-full`} />
            </button>

            <button
              onClick={() => { setActiveTab('mt5'); setMobileMenuOpen(false); }}
              title="MT5 Sync"
              className={`flex ${desktopSidebarOpen ? 'flex-row items-center justify-start gap-4 px-4' : 'flex-col items-center justify-center gap-1 mx-auto'} w-[92%] mx-auto ${desktopSidebarOpen ? 'h-12' : 'h-14'} rounded-2xl transition-all duration-300 ease-out ${
                activeTab === 'mt5' 
                  ? 'bg-slate-200 text-slate-900 dark:bg-slate-800/80 dark:text-white dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_20px_rgba(255,255,255,0.02)] dark:border dark:border-slate-700/50 shadow-sm transform dark:scale-105' 
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Terminal className={desktopSidebarOpen ? "h-5 w-5" : "h-4 w-4"} />
              <span className={`${desktopSidebarOpen ? 'text-sm' : 'text-[9px]'} font-bold`}>MT5 Sync</span>
            </button>

            <button
              onClick={() => { setActiveTab('tools'); setMobileMenuOpen(false); }}
              title="Tools"
              className={`relative flex ${desktopSidebarOpen ? 'flex-row items-center justify-start gap-4 px-4' : 'flex-col items-center justify-center gap-1 mx-auto'} w-full ${desktopSidebarOpen ? 'h-12' : 'h-14'} rounded-2xl transition-all duration-200 ${
                activeTab === 'tools' 
                  ? 'bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-white shadow-sm' 
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Wrench className={`transition-colors ${desktopSidebarOpen ? "h-5 w-5" : "h-4 w-4"} ${activeTab === 'tools' ? 'text-emerald-600 dark:text-emerald-400' : ''}`} />
              <span className={`${desktopSidebarOpen ? 'text-sm' : 'text-[9px]'} font-bold`}>Tools</span>
              <span className={`absolute ${desktopSidebarOpen ? 'right-4' : 'top-1.5 right-1.5'} h-1.5 w-1.5 bg-emerald-500 rounded-full`} />
            </button>

            <button
              onClick={() => { setActiveTab('insights'); setMobileMenuOpen(false); }}
              title="AI Mentor"
              className={`relative flex ${desktopSidebarOpen ? 'flex-row items-center justify-start gap-4 px-4' : 'flex-col items-center justify-center gap-1 mx-auto'} w-[92%] mx-auto ${desktopSidebarOpen ? 'h-12' : 'h-14'} rounded-2xl transition-all duration-300 ease-out ${
                activeTab === 'insights' 
                  ? 'bg-slate-200 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 dark:shadow-[inset_0_1px_1px_rgba(99,102,241,0.2),0_0_20px_rgba(99,102,241,0.1)] dark:border dark:border-indigo-500/20 shadow-sm transform dark:scale-105' 
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-indigo-600 dark:hover:text-indigo-400'
              }`}
            >
              <Brain className={`transition-colors ${desktopSidebarOpen ? "h-5 w-5" : "h-4 w-4"} ${activeTab === 'insights' ? 'text-indigo-600 dark:text-indigo-400' : 'text-indigo-500'}`} />
              <span className={`${desktopSidebarOpen ? 'text-sm' : 'text-[9px]'} font-bold`}>AI Mentor</span>
              <span className={`absolute ${desktopSidebarOpen ? 'right-4' : 'top-1 right-1'} h-1 w-1 bg-indigo-500 rounded-full animate-ping`} />
            </button>

          </nav>
        </div>
      </aside>

      {/* Main Content Area */}
      <main 
        className="flex-1 overflow-y-auto bg-[#FBFBFA] p-6 pb-24 md:pb-6 md:p-12 space-y-8"
        onScroll={handleMainScroll}
      >
        

        {/* Dynamic Plain Title bar */}
        <div className="flex items-start justify-between gap-4 w-full">
          <div className="flex-1 min-w-0">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-display truncate">
                {activeTab === 'dashboard' ? `Hello, ${user?.name || 'Trader'}` :
                 activeTab === 'journal' ? 'Trading Journal' :
                 activeTab === 'accounts' ? 'Portfolio Accounts' :
                 activeTab === 'analytics' ? 'Performance Analytics' :
                 activeTab === 'calendar' ? 'Trading Calendar' :
                 activeTab === 'fxnews' ? 'FX News' :
                 activeTab === 'settings' ? 'Settings' :
                 activeTab === 'mt5' ? 'MT5 Sync' :
                 activeTab === 'tools' ? 'Tools' :
                 activeTab === 'insights' ? 'AI Mentor' : 'Admin Panel'}
              </h1>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2 sm:line-clamp-1">
                {activeTab === 'dashboard' ? 'Welcome back! Here\'s an overview of your trading performance.' :
                 activeTab === 'journal' ? 'Inline workspace database to log, filter, and audit trading setups.' :
                 activeTab === 'accounts' ? 'Manage your MetaTrader or custom brokerage accounts on-the-fly.' :
                 activeTab === 'analytics' ? 'Explore your strategic edge, session concentrations, and profit distribution.' :
                 activeTab === 'calendar' ? 'Visualize daily profit allocations and execution frequencies.' :
                 activeTab === 'settings' ? 'Configure portfolio guard, import tools, and co-pilot preferences.' :
                 activeTab === 'mt5' ? 'Connect a unique Expert Advisor to your portfolio account for automatic, real-time trade sync.' :
                 activeTab === 'tools' ? 'Precision calculators to plan your trades with confidence.' :
                 activeTab === 'fxnews' ? 'Stay updated with the latest market-moving forex news and economic events.' :
                 activeTab === 'insights' ? 'Analyze your psychology and get actionable coaching.' : 'Administrative system configs.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0 pt-0.5">

            <div className="flex flex-col items-end gap-2">
              <div className="relative flex items-center justify-end w-full">
                {/* Original Button */}
                <button
                  onClick={() => handleOpenTradeModal()}
                  disabled={accounts.length === 0}
                  data-tour="add-trade"
                  className={`group relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-lg py-2 px-5 transition-all duration-300 flex items-center gap-1.5 disabled:opacity-50 shadow-md hover:shadow-lg shadow-indigo-500/30 border border-white/10 ${
                    isScrolled ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
                  }`}
                >
                  <div className="absolute inset-0 bg-white/20 -translate-x-[150%] skew-x-[-25deg] group-hover:animate-[shine_1.5s_ease-in-out]"></div>
                  <Plus className="h-4 w-4 relative z-10 group-hover:rotate-90 transition-transform duration-300" />
                  <span className="relative z-10">Add New Trade</span>
                </button>
  
                {/* Floating Button (Appears on Scroll) */}
                <button
                  onClick={() => handleOpenTradeModal()}
                  disabled={accounts.length === 0}
                  className={`group hidden md:flex fixed z-[100] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-full py-3.5 px-6 shadow-2xl shadow-indigo-500/40 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] items-center gap-2 border border-white/20 overflow-hidden ${
                    isScrolled 
                      ? 'bottom-8 right-8 scale-100 translate-y-0 opacity-100 hover:scale-105' 
                      : 'bottom-0 right-8 scale-50 translate-y-16 opacity-0 pointer-events-none'
                  }`}
                >
                  <div className="absolute inset-0 bg-white/20 -translate-x-[150%] skew-x-[-25deg] group-hover:animate-[shine_1.5s_ease-in-out]"></div>
                  <Plus className="h-5 w-5 relative z-10 group-hover:rotate-90 transition-transform duration-300" />
                  <span className="text-sm shadow-sm relative z-10">Add New Trade</span>
                </button>
              </div>


            </div>

          </div>
        </div>

        {/* Global Drawdown Risk alert strip if active */}
        {activeAccount && maxDrawdownPercentage > 0 && dismissedDrawdownAccount !== activeAccount.id && (
          <div className="bg-amber-50 border border-amber-200 text-amber-950 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="text-xs font-bold block">Portfolio Drawdown Active</strong>
              <p className="text-xs text-amber-800/90 leading-relaxed mt-0.5">
                Your portfolio is currently down <span className="font-extrabold">{maxDrawdownPercentage}%</span> from its starting balance. Drawdown guard is monitoring executions.
              </p>
            </div>
            <button
              onClick={() => setDismissedDrawdownAccount(activeAccount.id)}
              className="text-amber-500 hover:text-amber-700 hover:bg-amber-100 rounded-lg p-1.5 transition flex-shrink-0"
              aria-label="Dismiss drawdown warning"
              title="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Dynamic Route views */}

        {/* 1. DASHBOARD VIEW */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Dynamic Trader Rank & Drawdown Protection System */}
            <TraderRankCard 
              account={activeAccount || null} 
              formatValue={formatValue} 
              netProfit={netProfit}
              winRate={winRate}
              winsCount={wins.length}
              totalTradesCount={totalTradesCount}
            />

            {/* Next high-impact economic event → jumps to Economic Calendar */}
            <NextEventCard onOpenCalendar={openEconomicCalendar} />

            {/* Main Visualizations Grid */}
            <div className="space-y-6">



              
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  {/* Equity Curve Area Chart - Widescreen Layout */}
              <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-xs flex flex-col h-80">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between mb-4 flex-shrink-0">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Portfolio Growth Curve</h3>
                    <p className="text-[10px] text-slate-400">Equity changes tracked trade-by-trade</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setActiveTab('analytics')} className="text-xs text-blue-600 hover:text-blue-700 font-bold whitespace-nowrap">
                      Advanced Analytics →
                    </button>
                  </div>
                </div>
                <div className="flex-1 w-full min-h-0 -mt-2">
                  {totalTradesCount > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={equityCurveData}>
                        <defs>
                          <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={getChartColors().gradient} stopOpacity={0.15}/>
                            <stop offset="95%" stopColor={getChartColors().gradient} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} domain={['dataMin - 100', 'dataMax + 100']} />
                        <Tooltip formatter={(value) => [formatValue(Number(value)), 'Equity']} />
                        <Area type="monotone" dataKey="equity" stroke={getChartColors().stroke} strokeWidth={2.5} fillOpacity={1} fill="url(#colorEquity)" activeDot={{ r: 5, strokeWidth: 0, fill: getChartColors().stroke }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-xs text-slate-400 space-y-2">
                      <span>No trades logged yet. Start manually logging trades inside the Journal!</span>
                    </div>
                  )}
                </div>
              </div>
                </div>
                
                <div className="lg:col-span-1">
                  {/* Quick Risk Auditor status inside Dashboard */}
                <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-xs flex flex-col justify-between h-80">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">Portfolio Guard Rules</h3>
                        <p className="text-[10px] text-slate-400">Drawdown status and protection systems</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleTogglePortfolioGuard(!isPortfolioGuardOn)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider cursor-pointer transition hover:opacity-80 ${
                          isPortfolioGuardOn 
                            ? 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100' 
                            : 'text-slate-600 bg-slate-100 border-slate-200 hover:bg-slate-200'
                        }`}
                        title={isPortfolioGuardOn ? 'Click to turn Portfolio Guard OFF' : 'Click to turn Portfolio Guard ON'}
                      >
                        {isPortfolioGuardOn ? 'Active' : 'Disabled'}
                      </button>
                    </div>
                    
                    {isPortfolioGuardOn ? (
                      <div className="space-y-3">
                        {/* Daily Loss Guard */}
                        {(() => {
                          const limit = riskSettings?.dailyLossLimit || 500;
                          const breached = todayLoss >= limit;
                          return (
                            <div className={`p-3 rounded-lg text-xs transition-colors duration-200 ${
                              breached 
                                ? 'bg-rose-50/50 border border-rose-100' 
                                : 'bg-emerald-50/50 border border-emerald-100'
                            }`}>
                              <div className={`font-bold flex items-center justify-between ${
                                breached ? 'text-rose-950' : 'text-emerald-950'
                              }`}>
                                <span>Daily Loss Guard</span>
                                <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                                  breached 
                                    ? 'text-rose-600 bg-white border-rose-200' 
                                    : 'text-emerald-600 bg-white border-emerald-200'
                                }`}>
                                  {breached ? 'Breached' : 'Active'}
                                </span>
                              </div>
                              <p className={`mt-1 ${breached ? 'text-rose-700/80' : 'text-emerald-700/80'}`}>
                                {breached 
                                  ? `Today's cumulative loss is ${formatValue(todayLoss)}, exceeding your limit of ${formatValue(limit)}!`
                                  : `Today's loss is ${formatValue(todayLoss)} (Limit: ${formatValue(limit)}). Safe.`
                                }
                              </p>
                            </div>
                          );
                        })()}

                        {/* Overtrading Scanner */}
                        {(() => {
                          const limit = riskSettings?.maxTradesPerDay || 5;
                          const breached = todayTradesCount >= limit;
                          return (
                            <div className={`p-3 rounded-lg text-xs transition-colors duration-200 ${
                              breached 
                                ? 'bg-rose-50/50 border border-rose-100' 
                                : 'bg-emerald-50/50 border border-emerald-100'
                            }`}>
                              <div className={`font-bold flex items-center justify-between ${
                                breached ? 'text-rose-950' : 'text-emerald-950'
                              }`}>
                                <span>Overtrading Scanner</span>
                                <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                                  breached 
                                    ? 'text-rose-600 bg-white border-rose-200' 
                                    : 'text-emerald-600 bg-white border-emerald-200'
                                }`}>
                                  {breached ? 'Breached' : 'Active'}
                                </span>
                              </div>
                              <p className={`mt-1 ${breached ? 'text-rose-700/80' : 'text-emerald-700/80'}`}>
                                {breached 
                                  ? `Executed ${todayTradesCount} trades today, breaching your limit of ${limit}!`
                                  : `Executed ${todayTradesCount} of ${limit} maximum daily positions. Safe.`
                                }
                              </p>
                            </div>
                          );
                        })()}

                        {riskSettings && (
                          <div className="p-3 bg-blue-50/40 border border-blue-100 rounded-lg text-xs">
                            <div className="font-bold text-blue-950">Risk-Per-Trade Cap</div>
                            <p className="text-blue-700/80 mt-0.5">Maximum limit set to {riskSettings.riskPerTradeLimit}% per position.</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl text-center space-y-2 my-2">
                        <div className="inline-flex p-2.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 mb-1">
                          <ShieldOff className="h-5 w-5 text-slate-400" />
                        </div>
                        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Portfolio Guard Rules Disabled</h4>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 max-w-xs mx-auto">
                          Portfolio guard rules and risk limits are currently disabled. Toggle ON to enable active drawdown protection and discipline limits.
                        </p>
                      </div>
                    )}
                  </div>

                  <button onClick={() => { setActiveTab('settings'); setSettingsTab('risk'); }} className="w-full text-center py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 rounded-lg transition mt-4">
                    Configure Guard Limits
                  </button>
                </div>
                </div>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Risk-Reward Abstract Professional Balance Beam Card */}
                {(() => {
                  const rrVal = avgRR || 0;
                  // Balanced at 1:1, right side (reward) tilts down if > 1.
                  const maxTilt = 10; // Keep tilt subtle and sophisticated
                  const tiltAngle = Math.min(Math.max((rrVal - 1) * 4, -maxTilt), maxTilt);
                  
                  const angleRad = (tiltAngle * Math.PI) / 180;
                  const pivotX = 110;
                  const pivotY = 45;
                  const beamHalfLength = 85;
                  
                  const xL = pivotX - beamHalfLength * Math.cos(angleRad);
                  const yL = pivotY - beamHalfLength * Math.sin(angleRad);
                  const xR = pivotX + beamHalfLength * Math.cos(angleRad);
                  const yR = pivotY + beamHalfLength * Math.sin(angleRad);

                  return (
                    <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-xs flex flex-col justify-between h-80">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm">Risk : Reward</h3>
                          <p className="text-[10px] text-slate-400">Average risk-to-reward ratio of executions</p>
                        </div>
                        <span className={`text-[9px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full ${
                          rrVal < 1.0 ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                          rrVal < 1.5 ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                          rrVal < 2.5 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                          'bg-indigo-50 text-indigo-600 border border-indigo-100'
                        }`}>
                          {rrVal < 1.0 ? 'Low' : rrVal < 1.5 ? 'Moderate' : rrVal < 2.5 ? 'Good' : 'Excellent'}
                        </span>
                      </div>

                      {/* Prominent Center/Top Ratio */}
                      <div className="text-center mt-6">
                        <span className="text-4xl font-black text-slate-800 font-mono tracking-tight">
                          1 : {rrVal.toFixed(2)}
                        </span>
                      </div>

                      {/* SVG Professional Abstract Balance Beam Illustration */}
                      <div className="relative w-full flex justify-center my-6 flex-1 items-center">
                        <svg width="220" height="70" viewBox="0 0 220 70" className="overflow-visible">
                          
                          {/* Reference Baseline (1:1 perfect balance indication) */}
                          <line x1="25" y1={pivotY} x2="195" y2={pivotY} className="stroke-slate-200" strokeWidth="1" strokeDasharray="3 3" />
                          
                          {/* Minimalist Center Pivot Base */}
                          <path d={`M ${pivotX} ${pivotY} L ${pivotX + 6} ${pivotY + 25} L ${pivotX - 6} ${pivotY + 25} Z`} className="fill-slate-50 stroke-slate-300" strokeWidth="1" strokeLinejoin="round" />
                          <circle cx={pivotX} cy={pivotY} r="2.5" className="fill-slate-400" />
                          
                          {/* Tilted Precision Beam */}
                          <line x1={xL} y1={yL} x2={xR} y2={yR} className="stroke-slate-400" strokeWidth="1.5" strokeLinecap="round" />
                          
                          {/* Left Side: Risk 1R (Abstract Node) */}
                          <circle cx={xL} cy={yL} r="5" className="fill-white stroke-rose-500" strokeWidth="2" />
                          
                          {/* Right Side: Reward (Abstract Node) */}
                          <circle cx={xR} cy={yR} r="5" className="fill-white stroke-emerald-500" strokeWidth="2" />
                        </svg>
                      </div>

                      {/* Small Labels Risk 1R vs Reward 2.5R */}
                      <div className="border-t border-slate-50 pt-3 flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                          Risk 1R
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Reward {rrVal.toFixed(1)}R
                        </span>
                      </div>
                    </div>
                  );
                })()}
                {/* Win Rate Arc Chart Card */}
                {(() => {
                  const wrVal = winRate || 0;
                  const wrPercentage = Math.min(Math.max(wrVal / 100, 0), 1);
                  const radius = 40;
                  const circumference = Math.PI * radius; // ~125.66
                  const strokeDashoffset = circumference - (wrPercentage * circumference);

                  return (
                    <div className="bg-white rounded-[1.5rem] p-6 shadow-xs flex flex-col justify-between h-80 relative overflow-hidden border border-slate-100">
                      <div className="flex items-center gap-1.5 relative z-10">
                        <h3 className="font-bold text-slate-900 text-sm tracking-wide">Win / Loss Rate</h3>
                        <button 
                          onClick={() => alert("Win Rate is calculated as:\n(Total Winning Trades ÷ Total Executed Trades) × 100")} 
                          title="How is Win Rate calculated?"
                          className="hover:scale-110 transition-transform"
                        >
                          <HelpCircle className="w-4 h-4 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer" />
                        </button>
                      </div>

                      <div className="relative w-full flex-1 flex flex-col items-center justify-center mt-8">
                        <div className="relative w-64 h-36 flex items-end justify-center overflow-visible">
                          <svg className="w-full h-full overflow-visible" viewBox="0 0 100 55">
                            {/* Background Track */}
                            <path 
                              d="M 10 50 A 40 40 0 0 1 90 50" 
                              fill="none" 
                              stroke="#e2e8f0"
                              strokeWidth="8" 
                              strokeLinecap="round" 
                            />
                            {/* Active Progress */}
                            <path 
                              d="M 10 50 A 40 40 0 0 1 90 50" 
                              fill="none" 
                              stroke={winRate < 50 ? "#ff6b6b" : "#4a84ff"}
                              strokeWidth="8" 
                              strokeLinecap="round"
                              strokeDasharray={circumference}
                              strokeDashoffset={strokeDashoffset}
                              className="transition-all duration-1000 ease-out"
                            />
                            {/* Dots overlay */}
                            <path 
                              d="M 10 50 A 40 40 0 0 1 90 50" 
                              fill="none" 
                              stroke="#ffffff"
                              strokeWidth="2.5" 
                              strokeLinecap="round"
                              strokeDasharray={`0 ${circumference / 8}`}
                            />
                          </svg>

                          <div className="absolute flex flex-col items-center justify-end pb-3 gap-2 z-10">
                            <span className="bg-white text-slate-700 text-xs font-bold px-4 py-1.5 rounded-full shadow-sm border border-slate-200">
                              {winRate < 40 ? 'Needs Work' : winRate < 50 ? 'Average' : winRate < 65 ? 'Good!' : 'Excellent!'}
                            </span>
                            <span className="bg-white text-slate-500 text-xs font-medium px-5 py-2 rounded-full shadow-sm border border-slate-100 flex items-center gap-1.5">
                              <span className="text-slate-900 font-bold text-sm tracking-tight">{wrVal.toFixed(0)}%</span> Win Rate
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                
                {/* Winning vs Losing Trades Donut Chart */}
                <div className="bg-white dark:bg-[#09090b] rounded-[1.5rem] p-6 shadow-xs flex flex-col justify-between h-80 relative overflow-hidden border border-slate-200 dark:border-slate-900/50">
                  <div className="flex items-center justify-between relative z-10">
                    <div>
                      <h3 className="font-medium text-slate-500 dark:text-slate-400 text-sm tracking-wide">Win / Loss Ratio</h3>
                      <p className="text-[10px] text-slate-400">Total executions split by outcome</p>
                    </div>
                  </div>
                  
                  <div className="relative w-full flex-1 flex items-center justify-center mt-2">
                    {totalTradesCount > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: "Winning Trades", value: wins.length, color: "#10b981" },
                              { name: "Losing Trades", value: losses.length, color: "#ef4444" }
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={65}
                            outerRadius={85}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                          >
                            {
                              [{ color: "#10b981" }, { color: "#ef4444" }].map((entry, index) => (
                                <Cell key={"cell-"+index} fill={entry.color} />
                              ))
                            }
                          </Pie>
                          <Tooltip 
                            contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}
                            itemStyle={{ fontWeight: "bold" }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-xs text-slate-400 text-center">No trades logged</div>
                    )}
                    
                    {totalTradesCount > 0 && (
                      <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter">
                          {totalTradesCount}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                          Trades
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center mt-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{wins.length} Wins</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{losses.length} Losses</span>
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                    </div>
                  </div>
                </div>

              </section>

            </div>

            {/* Recent Executions Log Row */}
            <section className="bg-white border border-slate-100 rounded-xl p-6 shadow-xs overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Recent Trading Positions</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Your 4 most recently logged positions</p>
                </div>
                <button 
                  onClick={() => setActiveTab('journal')} 
                  className="text-xs text-blue-600 hover:text-blue-700 font-bold"
                >
                  View Full Journal →
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {trades.slice(0, 4).map((t) => (
                  <div key={t.id} className="border border-slate-100 bg-white hover:bg-slate-50/50 rounded-xl p-4 text-xs transition duration-200 flex flex-col justify-between space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <strong className="text-sm font-bold text-slate-900 block">{t.symbol}</strong>
                        <span className="text-[10px] text-slate-400 font-semibold">{t.strategy || 'No Strategy'}</span>
                      </div>
                      <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                        t.type === 'Buy' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}>
                        {t.type}
                      </span>
                    </div>

                    <div className="flex justify-between items-baseline pt-2 border-t border-slate-100/60">
                      <div>
                        <span className="text-[10px] text-slate-400 block">P/L Impact</span>
                        <span className={`font-extrabold text-sm ${t.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {t.profit >= 0 ? '+' : ''}{formatValue(t.profit)}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">{new Date(t.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}

                {trades.length === 0 && (
                  <div className="col-span-4 text-center py-10 text-xs text-slate-400">
                    No positions recorded in this portfolio yet. Switch portfolios or click 'Add New Trade' to get started.
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {/* 2. TRADING JOURNAL VIEW */}
        {activeTab === 'journal' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm space-y-4">
              
              {/* Filter controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2.5">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search comments or pairs..."
                    className="bg-slate-50 border border-slate-200 text-xs rounded-lg px-3 py-2 w-full sm:w-48 focus:ring-blue-500 focus:border-blue-500"
                  />
                  
                  <select
                    value={journalFilterSymbol}
                    onChange={(e) => setJournalFilterSymbol(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-xs rounded-lg px-2.5 py-2 text-slate-600"
                  >
                    <option value="">All Pairs</option>
                    {Array.from(new Set(trades.map(t => t.symbol))).map(sym => (
                      <option key={sym} value={sym}>{sym}</option>
                    ))}
                  </select>

                  <select
                    value={journalFilterEmotion}
                    onChange={(e) => setJournalFilterEmotion(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-xs rounded-lg px-2.5 py-2 text-slate-600"
                  >
                    <option value="">All Emotions</option>
                    <option value="Calm">Calm</option>
                    <option value="Anxious">Anxious</option>
                    <option value="Excited">Excited</option>
                    <option value="FOMO">FOMO</option>
                    <option value="Greedy">Greedy</option>
                    <option value="Revenge">Revenge</option>
                  </select>

                  {(() => {
                    const tradesWithExit = filteredTrades.filter(t => t.exitTime);
                    if (tradesWithExit.length === 0) return null;
                    const totalDuration = tradesWithExit.reduce((acc, t) => {
                      return acc + (new Date(t.exitTime!).getTime() - new Date(t.date).getTime());
                    }, 0);
                    const avgDurationMs = totalDuration / tradesWithExit.length;
                    const days = Math.floor(avgDurationMs / (1000 * 60 * 60 * 24));
                    const hours = Math.floor((avgDurationMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const minutes = Math.floor((avgDurationMs % (1000 * 60 * 60)) / (1000 * 60));
                    
                    let formatAvg = '';
                    if (days > 0) formatAvg += `${days}d `;
                    if (hours > 0) formatAvg += `${hours}h `;
                    formatAvg += `${minutes}m`;

                    return (
                      <div className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-400 rounded-lg text-xs font-semibold whitespace-nowrap">
                        <Clock className="h-3.5 w-3.5" />
                        Avg Hold: {formatAvg}
                      </div>
                    );
                  })()}

                  {(journalFilterSymbol || journalFilterEmotion || searchQuery) && (
                    <button
                      onClick={() => { setJournalFilterSymbol(''); setJournalFilterEmotion(''); setSearchQuery(''); }}
                      className="text-xs text-red-600 hover:underline font-semibold"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={refreshTrades}
                    disabled={tradesRefreshing}
                    title="Reload trades from Supabase"
                    className="border border-blue-200 hover:bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg px-3 py-2 transition flex items-center gap-1 bg-white disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${tradesRefreshing ? 'animate-spin' : ''}`} />
                    {tradesRefreshing ? 'Syncing...' : 'Sync Trades'}
                  </button>
                  <button
                    onClick={() => setShowExportModal(true)}
                    className="border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg px-3 py-2 transition flex items-center gap-1 bg-white"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export CSV
                  </button>
                </div>
              </div>

              {/* Big log Table with Scrollable Box container (Desktop) */}
              <div className="hidden md:block overflow-x-auto border border-slate-200 dark:border-[#1f2937] rounded-xl relative shadow-xl dark:shadow-2xl bg-white dark:bg-[#0a0d14]">
                <table className="w-full text-center border-collapse text-xs">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-[#0a0d14] z-10 border-b border-slate-200 dark:border-[#1f2937]">
                    <tr className="text-slate-900 dark:text-white font-bold text-[11.5px] tracking-wide">
                      <th className="py-4 px-4 font-bold text-center">Symbol</th>
                      <th className="py-4 px-4 font-bold border-l border-slate-200 dark:border-[#1f2937] text-center">Type</th>
                      <th className="py-4 px-4 font-bold border-l border-slate-200 dark:border-[#1f2937] text-center">Entry</th>
                      <th className="py-4 px-4 font-bold border-l border-slate-200 dark:border-[#1f2937] text-center">Exit</th>
                      <th className="py-4 px-4 font-bold border-l border-slate-200 dark:border-[#1f2937] text-center">Entry Time</th>
                      <th className="py-4 px-4 font-bold border-l border-slate-200 dark:border-[#1f2937] text-center">Exit Time</th>
                      <th className="py-4 px-4 font-bold border-l border-slate-200 dark:border-[#1f2937] text-center">Volume</th>
                      <th className="py-4 px-4 font-bold border-l border-slate-200 dark:border-[#1f2937] text-center">Net Profit</th>
                      <th className="py-4 px-4 font-bold border-l border-slate-200 dark:border-[#1f2937] text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTrades.map((t) => {
                      const entryDate = new Date(t.date);
                      const exitDate = t.exitTime ? new Date(t.exitTime) : null;
                      return (
                        <tr key={t.id} className="border-b border-slate-100 dark:border-[#1f2937] hover:bg-slate-50 dark:hover:bg-white/[0.02] transition">
                          <td className="py-4 px-4 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap text-center">
                            {t.symbol}
                          </td>
                          <td className="py-4 px-4 border-l border-slate-100 dark:border-[#1f2937] text-center">
                            <span className={`inline-flex items-center justify-center px-4 py-1.5 rounded-full text-[11px] font-bold ${
                              t.type === 'Buy' || t.type === 'buy' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                            }`}>
                              {t.type}
                            </span>
                          </td>
                          <td className="py-4 px-4 border-l border-slate-100 dark:border-[#1f2937] font-medium text-slate-700 dark:text-slate-300 text-center">
                            {t.entryPrice}
                          </td>
                          <td className="py-4 px-4 border-l border-slate-100 dark:border-[#1f2937] font-medium text-slate-700 dark:text-slate-300 text-center">
                            {t.exitPrice}
                          </td>
                          <td className="py-4 px-4 border-l border-slate-100 dark:border-[#1f2937] text-slate-700 dark:text-slate-300 text-center">
                            <div className="flex flex-col items-center justify-center gap-0.5">
                              <span className="font-medium text-[11.5px]">{entryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400">{entryDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 border-l border-slate-100 dark:border-[#1f2937] text-slate-700 dark:text-slate-300 text-center">
                            {exitDate ? (
                              <div className="flex flex-col items-center justify-center gap-0.5">
                                <span className="font-medium text-[11.5px]">{exitDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400">{exitDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                              </div>
                            ) : (
                              <span className="font-medium text-slate-400 dark:text-slate-500">-</span>
                            )}
                          </td>
                          <td className="py-4 px-4 border-l border-slate-100 dark:border-[#1f2937] font-medium text-slate-700 dark:text-slate-300 text-center">
                            {t.lotSize}
                          </td>
                          <td className="py-4 px-4 border-l border-slate-100 dark:border-[#1f2937] text-center">
                            <span className={`font-medium ${t.profit >= 0 ? 'text-emerald-600 dark:text-emerald-500' : 'text-rose-600 dark:text-rose-500'}`}>
                              {t.profit >= 0 ? '+' : ''}{new Intl.NumberFormat('en-US', { style: 'currency', currency: activeAccount?.currency || 'USD' }).format(t.profit)}
                            </span>
                          </td>
                          <td className="py-4 px-4 border-l border-slate-100 dark:border-[#1f2937] text-center">
                            <div className="flex items-center justify-center gap-3">
                              <button
                                onClick={() => handleOpenTradeModal(t)}
                                className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
                                title="Edit position details"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteTrade(t.id)}
                                className="text-rose-500/80 hover:text-rose-600 dark:hover:text-rose-500 transition"
                                title="Delete position"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredTrades.length === 0 && (
                      <tr>
                        <td colSpan={9} className="text-center py-10 text-slate-500">
                          No matching recorded trades. Clear filters or add your first position.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Trades List (Reference Image Style) */}
              <div className="md:hidden flex flex-col space-y-0 mt-2 border-t border-slate-100 dark:border-slate-800 -mx-6 px-6">
                {filteredTrades.map(t => (
                  <div 
                    key={t.id} 
                    onClick={() => handleOpenTradeModal(t)} 
                    className="flex flex-col py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 active:bg-slate-50 dark:active:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-extrabold text-[14px] text-slate-800 dark:text-slate-200 tracking-wide uppercase">{t.symbol}</span>
                      <span className={`font-bold text-[13px] ${t.profit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {t.profit >= 0 ? '+' : ''}{formatValue(t.profit)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mb-3">
                      <span className={`font-bold text-[11px] ${t.type === 'Buy' || t.type === 'buy' ? 'text-blue-500 dark:text-blue-400' : 'text-rose-500 dark:text-rose-400'} uppercase tracking-wide`}>{t.type}</span>
                      <span className="text-[12px] text-slate-500 dark:text-slate-400">{t.lotSize} lots</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-[12px] text-slate-600 dark:text-slate-300 font-mono">
                        <span>{t.entryPrice}</span>
                        <span className="mx-2 text-slate-400">&rarr;</span>
                        <span>{t.exitPrice}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                        {new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                      </div>
                    </div>
                  </div>
                ))}
                {filteredTrades.length === 0 && (
                  <div className="text-center py-10 text-slate-400 text-sm">
                    No matching recorded trades. Clear filters or add your first position.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 3. CALENDAR VIEW */}
        {activeTab === 'calendar' && (
          <TradingCalendar trades={trades} currency={activeAccount?.currency || 'USD'} />
        )}

        {/* 3b. FX NEWS & ECONOMIC CALENDAR VIEW */}
        {activeTab === 'fxnews' && (
          <FXNews initialTab={fxNewsInitialTab} />
        )}

        {/* 4. PORTFOLIO ACCOUNTS VIEW */}
        {activeTab === 'accounts' && (
          <div className="space-y-5 max-w-7xl">

            {/* Desktop View: Table — theme-aware */}
            <div className={`hidden md:block rounded-2xl overflow-hidden border shadow-xl ${
              theme === 'dark'
                ? 'bg-[#0f1117] border-white/5'
                : 'bg-white border-slate-200'
            }`}>
              {/* Header */}
              <div className={`grid grid-cols-[2fr_1.5fr_1.8fr_1fr_1.2fr_1.5fr_1.5fr_1.2fr] text-[11px] font-bold uppercase tracking-widest px-5 py-3.5 border-b ${
                theme === 'dark'
                  ? 'text-slate-400 border-white/10'
                  : 'text-slate-500 border-slate-200 bg-slate-50'
              }`}>
                <span>Name</span>
                <span>Number</span>
                <span>Provider</span>
                <span>Type</span>
                <span>Platform</span>
                <span>Balance</span>
                <span>Last Sync</span>
                <span>Actions</span>
              </div>

              {/* Account Rows */}
              {accounts.length === 0 && (
                <div className="py-16 text-center text-slate-500 text-sm">
                  No accounts connected yet.
                </div>
              )}
              {accounts.map((acc, idx) => {
                const isActive = acc.id === selectedAccountId;
                const lastSyncText = (() => {
                  if (!acc.lastSyncedAt) return '—';
                  const diff = Date.now() - new Date(acc.lastSyncedAt).getTime();
                  const mins = Math.floor(diff / 60000);
                  const hrs = Math.floor(mins / 60);
                  const days = Math.floor(hrs / 24);
                  if (mins < 2) return 'Just now';
                  if (mins < 60) return `${mins} minutes ago`;
                  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
                  return `${days} day${days > 1 ? 's' : ''} ago`;
                })();

                return (
                  <div
                    key={acc.id}
                    onClick={() => {
                      setSelectedAccountId(acc.id);
                      persistSelectedAccount(acc.id);
                      fetchTradesAndParams(acc.id);
                    }}
                    className={`grid grid-cols-[2fr_1.5fr_1.8fr_1fr_1.2fr_1.5fr_1.5fr_1.2fr] items-center px-5 py-4 cursor-pointer transition-colors duration-150 ${
                      idx !== accounts.length - 1
                        ? theme === 'dark' ? 'border-b border-white/[0.05]' : 'border-b border-slate-100'
                        : ''
                    } ${isActive
                        ? theme === 'dark' ? 'bg-white/[0.06]' : 'bg-slate-50'
                        : theme === 'dark' ? 'hover:bg-white/[0.03]' : 'hover:bg-slate-50/60'
                    }`}
                  >
                    {/* Name */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0 shadow-[0_0_6px_#34d399]" />}
                      <span className={`text-[13px] font-semibold truncate ${
                        theme === 'dark' ? 'text-white' : 'text-slate-800'
                      }`}>{acc.name}</span>
                    </div>

                    {/* Number */}
                    <span className={`text-[12px] font-mono truncate ${
                      theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                    }`}>{acc.broker || '—'}</span>

                    {/* Provider */}
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${
                        theme === 'dark' ? 'bg-slate-700/60' : 'bg-slate-100'
                      }`}>
                        <span className={`text-[9px] font-extrabold uppercase leading-none ${
                          theme === 'dark' ? 'text-blue-300' : 'text-blue-600'
                        }`}>
                          {(acc.broker || 'B').slice(0, 2)}
                        </span>
                      </div>
                      <div className="leading-tight min-w-0">
                        <span className={`text-[12px] font-semibold block truncate ${
                          theme === 'dark' ? 'text-slate-200' : 'text-slate-700'
                        }`}>{acc.broker || '—'}</span>
                        <span className="text-[9px] text-slate-500 uppercase tracking-wider">{acc.institutionType || 'BROKER'}</span>
                      </div>
                    </div>

                    {/* Type */}
                    <span className={`text-[11px] font-extrabold uppercase tracking-wider ${
                      acc.accountType === 'Live' ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      {acc.accountType}
                    </span>

                    {/* Platform */}
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                        <Terminal className="h-3 w-3 text-blue-400" />
                      </div>
                      <span className="text-[12px] font-semibold text-slate-300">{acc.platform || 'MT5'}</span>
                    </div>

                    {/* Balance */}
                    <span className="text-[13px] font-bold text-white font-mono">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: acc.currency || 'USD', minimumFractionDigits: 2 }).format(acc.currentBalance)}
                    </span>

                    {/* Last Sync */}
                    <span className="text-[12px] text-slate-400">{lastSyncText}</span>

                    {/* Actions */}
                    <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setActiveTab('mt5')}
                        title="Go to MT5 Sync"
                        className={`p-1.5 rounded-lg transition text-slate-400 hover:text-blue-500 ${
                          theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-slate-100'
                        }`}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingAccount(acc);
                          setEditAccName(acc.name);
                          setEditAccStartingBalance(String(acc.startingBalance));
                          setEditAccCurrency(acc.currency || 'USD');
                          setShowEditAccountModal(true);
                        }}
                        title="Edit Account"
                        className={`p-1.5 rounded-lg transition text-slate-400 hover:text-amber-500 ${
                          theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-slate-100'
                        }`}
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingAccount(acc);
                          setShowEditAccountModal(true);
                        }}
                        title="Delete Account"
                        className={`p-1.5 rounded-lg transition text-slate-400 hover:text-rose-500 ${
                          theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-slate-100'
                        }`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mobile View: Card List */}
            <div className={`md:hidden rounded-2xl px-5 pt-5 pb-2 ${ theme === 'dark' ? 'bg-[#0f1117]' : 'bg-white border border-slate-200 shadow-sm' }`}>
              {/* Title row */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Connected Accounts</p>
                  <h2 className={`text-2xl font-extrabold ${ theme === 'dark' ? 'text-white' : 'text-slate-900' }`}>
                    {accounts.length} account{accounts.length !== 1 ? 's' : ''}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  {/* Add new */}
                  <button
                    onClick={() => { setShowAccountModal(true); setAccountCreationMethod('select'); }}
                    title="Add Account"
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition ${ theme === 'dark' ? 'text-slate-300 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100' }`}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Account rows */}
              {accounts.length === 0 && (
                <div className="py-10 text-center text-slate-500 text-sm">
                  No accounts connected yet. Add one to get started.
                </div>
              )}

              {accounts.map((acc, idx) => {
                const isActive = acc.id === selectedAccountId;
                const lastSyncText = (() => {
                  if (!acc.lastSyncedAt) return '—';
                  const diff = Date.now() - new Date(acc.lastSyncedAt).getTime();
                  const mins = Math.floor(diff / 60000);
                  const hrs = Math.floor(mins / 60);
                  const days = Math.floor(hrs / 24);
                  if (mins < 2) return 'Just now';
                  if (mins < 60) return `${mins} minutes ago`;
                  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
                  return `${days} day${days > 1 ? 's' : ''} ago`;
                })();

                const brokerInitials = (acc.broker || 'B').slice(0, 2).toUpperCase();
                const balanceStr = (() => {
                  const cur = acc.currency || 'USD';
                  try {
                    return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur, minimumFractionDigits: 2 }).format(acc.currentBalance);
                  } catch {
                    return `${cur} ${acc.currentBalance.toFixed(2)}`;
                  }
                })();

                return (
                  <div
                    key={acc.id}
                    onClick={() => {
                      setSelectedAccountId(acc.id);
                      persistSelectedAccount(acc.id);
                      fetchTradesAndParams(acc.id);
                    }}
                    className={`flex flex-col py-4 cursor-pointer transition-colors duration-150 ${ idx !== accounts.length - 1 ? (theme === 'dark' ? 'border-b border-white/[0.06]' : 'border-b border-slate-100') : '' } ${ isActive ? (theme === 'dark' ? 'bg-white/[0.03] -mx-5 px-5' : 'bg-slate-50 -mx-5 px-5') : '' }`}
                  >
                    <div className="flex items-center gap-4 w-full">
                      {/* Broker avatar */}
                      <div className="relative flex-shrink-0">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-md ${ theme === 'dark' ? 'bg-slate-700/60' : 'bg-slate-100' }`}>
                          <span className={`text-[13px] font-black lowercase leading-none ${ theme === 'dark' ? 'text-slate-300' : 'text-slate-700' }`}>{brokerInitials.toLowerCase()}</span>
                        </div>
                        {/* Platform sub-icon */}
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-blue-600 border-2 border-[#0f1117] flex items-center justify-center">
                          <Terminal className="h-2.5 w-2.5 text-white" />
                        </div>
                      </div>

                      {/* Center info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-[15px] font-bold truncate ${ theme === 'dark' ? 'text-white' : 'text-slate-900' }`}>
                            {acc.name}
                          </span>
                          <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wide ${ acc.accountType === 'Live' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-500/20 text-slate-300' }`}>
                            {acc.accountType}
                          </span>
                          {isActive && (
                            <span className="text-[9px] font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded uppercase tracking-wide">Active</span>
                          )}
                        </div>
                        <p className={`text-[12px] truncate ${ theme === 'dark' ? 'text-slate-400' : 'text-slate-500' }`}>
                          {acc.broker || '—'} • {acc.platform || 'MT5'}{acc.broker ? ` • #${(acc.broker).replace(/\D/g, '') || acc.id.slice(0,8)}` : ''}
                        </p>
                      </div>

                      {/* Right side */}
                      <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                        <span className={`text-[15px] font-bold font-mono ${ theme === 'dark' ? 'text-white' : 'text-slate-900' }`}>
                          {balanceStr}
                        </span>
                        <span className="text-[11px] text-slate-500">{lastSyncText}</span>
                      </div>

                      {/* Chevron */}
                      <ChevronRight className={`h-4 w-4 flex-shrink-0 transition-transform ${ isActive ? 'rotate-90' : '' } ${ theme === 'dark' ? 'text-slate-600' : 'text-slate-300' }`} />
                    </div>

                    {/* Expandable Action Bar */}
                    {isActive && (
                      <div className={`mt-4 pt-3 flex items-center justify-between border-t ${ theme === 'dark' ? 'border-white/5' : 'border-slate-200' }`}>
                        <button
                          onClick={(e) => { e.stopPropagation(); setActiveTab('mt5'); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-500 hover:bg-blue-500/10 transition-colors"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Sync
                        </button>
                        
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingAccount(acc);
                              setEditAccName(acc.name);
                              setEditAccStartingBalance(String(acc.startingBalance));
                              setEditAccCurrency(acc.currency || 'USD');
                              setShowEditAccountModal(true);
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${ theme === 'dark' ? 'text-slate-300 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100' }`}
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingAccount(acc);
                              setShowEditAccountModal(true);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add Account Button (Visible on both desktop & mobile) */}
            <button
              onClick={() => { setShowAccountModal(true); setAccountCreationMethod('select'); }}
              data-tour="create-portfolio"
              className={`w-full border-2 border-dashed rounded-2xl py-5 flex items-center justify-center gap-2.5 transition text-sm font-semibold ${
                theme === 'dark'
                  ? 'border-white/10 hover:border-white/20 text-slate-400 hover:text-slate-200 bg-transparent'
                  : 'border-slate-300 hover:border-slate-400 text-slate-500 hover:text-slate-700 bg-transparent'
              }`}
            >
              <Plus className="h-5 w-5" />
              Connect New Portfolio Account
            </button>

          </div>
        )}

        {/* 5. PERFORMANCE ANALYTICS VIEW */}
        {activeTab === 'analytics' && (
          <div className="space-y-8">
            
            
            
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Equity Curve Area Chart */}
              <div className="lg:col-span-2 bg-white border border-slate-100 rounded-xl p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Portfolio Growth Curve</h3>
                    <p className="text-[10px] text-slate-400">Cumulative account equity changes traced trade-by-trade</p>
                  </div>
                </div>
                <div className="h-64">
                  {totalTradesCount > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={equityCurveData}>
                        <defs>
                          <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={getChartColors().gradient} stopOpacity={0.15}/>
                            <stop offset="95%" stopColor={getChartColors().gradient} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} domain={['dataMin - 100', 'dataMax + 100']} />
                        <Tooltip formatter={(value) => [formatValue(Number(value)), 'Equity']} />
                        <Area type="monotone" dataKey="equity" stroke={getChartColors().stroke} strokeWidth={2.5} fillOpacity={1} fill="url(#colorEquity)" activeDot={{ r: 5, strokeWidth: 0, fill: getChartColors().stroke }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">
                      No positions recorded. Log some trades to see your performance metrics.
                    </div>
                  )}
                </div>
              </div>

              {/* Side cards for core mathematical ratios */}
              <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-xs space-y-4 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm mb-4">Trading Mechanics</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-50 pb-2 text-xs">
                      <span className="text-slate-400 font-medium">Profit Factor</span>
                      <span className={`font-extrabold ${profitFactor >= 1.5 ? 'text-emerald-600' : 'text-slate-900'}`}>{profitFactor}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-50 pb-2 text-xs">
                      <span className="text-slate-400 font-medium">Risk-to-Reward Ratio</span>
                      <span className="font-extrabold text-slate-900">1 : {avgRR}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-50 pb-2 text-xs">
                      <span className="text-slate-400 font-medium">Wins / Losses</span>
                      <span className="font-bold text-slate-800">{wins.length} Wins / {losses.length} Losses</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-50 pb-2 text-xs">
                      <span className="text-slate-400 font-medium">Active Drawdown</span>
                      <span className={`font-extrabold ${maxDrawdownPercentage > 0 ? 'text-rose-600' : 'text-slate-900'}`}>{maxDrawdownPercentage}%</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-50 pb-2 text-xs">
                      <span className="text-slate-400 font-medium">Winning Streak</span>
                      <span className="font-extrabold text-emerald-600">{maxWinStreak}{maxWinStreak > 0 && currentWinStreak > 0 ? ` (${currentWinStreak} active)` : ''}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-50 pb-2 text-xs">
                      <span className="text-slate-400 font-medium">Losing Streak</span>
                      <span className="font-extrabold text-rose-600">{maxLossStreak}{maxLossStreak > 0 && currentLossStreak > 0 ? ` (${currentLossStreak} active)` : ''}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-lg p-3 text-[11px] text-slate-500 leading-relaxed border border-slate-100">
                  <span className="font-bold text-slate-800 block mb-0.5">Analyst Tip</span>
                  Your Profit Factor is <span className="font-semibold">{profitFactor}</span>. Ratios above 1.5 indicate institutional system viability.
                </div>
              </div>
            </section>

              <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Risk-Reward Abstract Professional Balance Beam Card */}
                {(() => {
                  const rrVal = avgRR || 0;
                  // Balanced at 1:1, right side (reward) tilts down if > 1.
                  const maxTilt = 10; // Keep tilt subtle and sophisticated
                  const tiltAngle = Math.min(Math.max((rrVal - 1) * 4, -maxTilt), maxTilt);
                  
                  const angleRad = (tiltAngle * Math.PI) / 180;
                  const pivotX = 110;
                  const pivotY = 45;
                  const beamHalfLength = 85;
                  
                  const xL = pivotX - beamHalfLength * Math.cos(angleRad);
                  const yL = pivotY - beamHalfLength * Math.sin(angleRad);
                  const xR = pivotX + beamHalfLength * Math.cos(angleRad);
                  const yR = pivotY + beamHalfLength * Math.sin(angleRad);

                  return (
                    <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-xs flex flex-col justify-between h-80">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm">Risk : Reward</h3>
                          <p className="text-[10px] text-slate-400">Average risk-to-reward ratio of executions</p>
                        </div>
                        <span className={`text-[9px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full ${
                          rrVal < 1.0 ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                          rrVal < 1.5 ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                          rrVal < 2.5 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                          'bg-indigo-50 text-indigo-600 border border-indigo-100'
                        }`}>
                          {rrVal < 1.0 ? 'Low' : rrVal < 1.5 ? 'Moderate' : rrVal < 2.5 ? 'Good' : 'Excellent'}
                        </span>
                      </div>

                      {/* Prominent Center/Top Ratio */}
                      <div className="text-center mt-6">
                        <span className="text-4xl font-black text-slate-800 font-mono tracking-tight">
                          1 : {rrVal.toFixed(2)}
                        </span>
                      </div>

                      {/* SVG Professional Abstract Balance Beam Illustration */}
                      <div className="relative w-full flex justify-center my-6 flex-1 items-center">
                        <svg width="220" height="70" viewBox="0 0 220 70" className="overflow-visible">
                          
                          {/* Reference Baseline (1:1 perfect balance indication) */}
                          <line x1="25" y1={pivotY} x2="195" y2={pivotY} className="stroke-slate-200" strokeWidth="1" strokeDasharray="3 3" />
                          
                          {/* Minimalist Center Pivot Base */}
                          <path d={`M ${pivotX} ${pivotY} L ${pivotX + 6} ${pivotY + 25} L ${pivotX - 6} ${pivotY + 25} Z`} className="fill-slate-50 stroke-slate-300" strokeWidth="1" strokeLinejoin="round" />
                          <circle cx={pivotX} cy={pivotY} r="2.5" className="fill-slate-400" />
                          
                          {/* Tilted Precision Beam */}
                          <line x1={xL} y1={yL} x2={xR} y2={yR} className="stroke-slate-400" strokeWidth="1.5" strokeLinecap="round" />
                          
                          {/* Left Side: Risk 1R (Abstract Node) */}
                          <circle cx={xL} cy={yL} r="5" className="fill-white stroke-rose-500" strokeWidth="2" />
                          
                          {/* Right Side: Reward (Abstract Node) */}
                          <circle cx={xR} cy={yR} r="5" className="fill-white stroke-emerald-500" strokeWidth="2" />
                        </svg>
                      </div>

                      {/* Small Labels Risk 1R vs Reward 2.5R */}
                      <div className="border-t border-slate-50 pt-3 flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                          Risk 1R
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Reward {rrVal.toFixed(1)}R
                        </span>
                      </div>
                    </div>
                  );
                })()}
                {/* Win Rate Arc Chart Card */}
                {(() => {
                  const wrVal = winRate || 0;
                  const wrPercentage = Math.min(Math.max(wrVal / 100, 0), 1);
                  const radius = 40;
                  const circumference = Math.PI * radius; // ~125.66
                  const strokeDashoffset = circumference - (wrPercentage * circumference);

                  return (
                    <div className="bg-white rounded-[1.5rem] p-6 shadow-xs flex flex-col justify-between h-80 relative overflow-hidden border border-slate-100">
                      <div className="flex items-center gap-1.5 relative z-10">
                        <h3 className="font-bold text-slate-900 text-sm tracking-wide">Win / Loss Rate</h3>
                        <button 
                          onClick={() => alert("Win Rate is calculated as:\n(Total Winning Trades ÷ Total Executed Trades) × 100")} 
                          title="How is Win Rate calculated?"
                          className="hover:scale-110 transition-transform"
                        >
                          <HelpCircle className="w-4 h-4 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer" />
                        </button>
                      </div>

                      <div className="relative w-full flex-1 flex flex-col items-center justify-center mt-8">
                        <div className="relative w-64 h-36 flex items-end justify-center overflow-visible">
                          <svg className="w-full h-full overflow-visible" viewBox="0 0 100 55">
                            {/* Background Track */}
                            <path 
                              d="M 10 50 A 40 40 0 0 1 90 50" 
                              fill="none" 
                              stroke="#e2e8f0"
                              strokeWidth="8" 
                              strokeLinecap="round" 
                            />
                            {/* Active Progress */}
                            <path 
                              d="M 10 50 A 40 40 0 0 1 90 50" 
                              fill="none" 
                              stroke={winRate < 50 ? "#ff6b6b" : "#4a84ff"}
                              strokeWidth="8" 
                              strokeLinecap="round"
                              strokeDasharray={circumference}
                              strokeDashoffset={strokeDashoffset}
                              className="transition-all duration-1000 ease-out"
                            />
                            {/* Dots overlay */}
                            <path 
                              d="M 10 50 A 40 40 0 0 1 90 50" 
                              fill="none" 
                              stroke="#ffffff"
                              strokeWidth="2.5" 
                              strokeLinecap="round"
                              strokeDasharray={`0 ${circumference / 8}`}
                            />
                          </svg>

                          <div className="absolute flex flex-col items-center justify-end pb-3 gap-2 z-10">
                            <span className="bg-white text-slate-700 text-xs font-bold px-4 py-1.5 rounded-full shadow-sm border border-slate-200">
                              {winRate < 40 ? 'Needs Work' : winRate < 50 ? 'Average' : winRate < 65 ? 'Good!' : 'Excellent!'}
                            </span>
                            <span className="bg-white text-slate-500 text-xs font-medium px-5 py-2 rounded-full shadow-sm border border-slate-100 flex items-center gap-1.5">
                              <span className="text-slate-900 font-bold text-sm tracking-tight">{wrVal.toFixed(0)}%</span> Win Rate
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                
                {/* Winning vs Losing Trades Donut Chart */}
                <div className="bg-white dark:bg-[#09090b] rounded-[1.5rem] p-6 shadow-xs flex flex-col justify-between h-80 relative overflow-hidden border border-slate-200 dark:border-slate-900/50">
                  <div className="flex items-center justify-between relative z-10">
                    <div>
                      <h3 className="font-medium text-slate-500 dark:text-slate-400 text-sm tracking-wide">Win / Loss Ratio</h3>
                      <p className="text-[10px] text-slate-400">Total executions split by outcome</p>
                    </div>
                  </div>
                  
                  <div className="relative w-full flex-1 flex items-center justify-center mt-2">
                    {totalTradesCount > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: "Winning Trades", value: wins.length, color: "#10b981" },
                              { name: "Losing Trades", value: losses.length, color: "#ef4444" }
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={65}
                            outerRadius={85}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                          >
                            {
                              [{ color: "#10b981" }, { color: "#ef4444" }].map((entry, index) => (
                                <Cell key={"cell-"+index} fill={entry.color} />
                              ))
                            }
                          </Pie>
                          <Tooltip 
                            contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}
                            itemStyle={{ fontWeight: "bold" }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-xs text-slate-400 text-center">No trades logged</div>
                    )}
                    
                    {totalTradesCount > 0 && (
                      <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter">
                          {totalTradesCount}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                          Trades
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center mt-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{wins.length} Wins</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{losses.length} Losses</span>
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                    </div>
                  </div>
                </div>

              </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Monthly P&L Bar Chart */}
              <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-xs">
                <h3 className="font-bold text-slate-900 text-sm mb-1">Monthly P&L Distribution</h3>
                <p className="text-[10px] text-slate-400 mb-4 font-semibold">Net profit or loss grouped chronologically by month</p>
                <div className="h-64">
                  {monthlyPnlChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyPnlChartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                        <Tooltip formatter={(value) => [formatValue(Number(value)), 'Net Profit']} />
                        <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
                          {monthlyPnlChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#10b981' : '#f43f5e'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">
                      No monthly trading history found.
                    </div>
                  )}
                </div>
              </div>

              {/* Profit by Instrument */}
              <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-xs">
                <h3 className="font-bold text-slate-900 text-sm mb-4">Cumulative Profit by Instrument</h3>
                <div className="h-64">
                  {symbolChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={symbolChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" stroke="#94a3b8" fontSize={10} tickLine={false} />
                        <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} tickLine={false} />
                        <Tooltip formatter={(value) => [formatValue(Number(value)), 'Cumulative Net']} />
                        <Bar dataKey="profit" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                          {symbolChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#10b981' : '#f43f5e'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">
                      No asset configurations calculated yet.
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Best Trade Card */}
              <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Best Trade</h4>
                      <p className="text-[10px] text-slate-400">Single highest profit execution</p>
                    </div>
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                  </div>
                  {bestTrade ? (
                    <div className="space-y-3">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xl font-black text-emerald-600">
                          +{formatValue(bestTrade.profit)}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-50 text-slate-600 rounded">
                          {bestTrade.symbol}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-3 text-xs pt-2 border-t border-slate-50">
                        <div>
                          <span className="text-slate-400 font-medium block">Type / Lots</span>
                          <span className="font-bold text-slate-800">{bestTrade.type} / {bestTrade.lotSize} Lots</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium block">Date</span>
                          <span className="font-bold text-slate-800">{new Date(bestTrade.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium block">Entry Price</span>
                          <span className="font-bold text-slate-800">{bestTrade.entryPrice}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium block">Exit Price</span>
                          <span className="font-bold text-slate-800">{bestTrade.exitPrice}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 py-6 text-center">
                      No profitable trades recorded.
                    </div>
                  )}
                </div>
              </div>

              {/* Worst Trade Card */}
              <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Worst Trade</h4>
                      <p className="text-[10px] text-slate-400">Single deepest loss execution</p>
                    </div>
                    <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                      <TrendingDown className="h-5 w-5" />
                    </div>
                  </div>
                  {worstTrade ? (
                    <div className="space-y-3">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xl font-black text-rose-600">
                          {formatValue(worstTrade.profit)}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-50 text-slate-600 rounded">
                          {worstTrade.symbol}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-3 text-xs pt-2 border-t border-slate-50">
                        <div>
                          <span className="text-slate-400 font-medium block">Type / Lots</span>
                          <span className="font-bold text-slate-800">{worstTrade.type} / {worstTrade.lotSize} Lots</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium block">Date</span>
                          <span className="font-bold text-slate-800">{new Date(worstTrade.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium block">Entry Price</span>
                          <span className="font-bold text-slate-800">{worstTrade.entryPrice}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium block">Exit Price</span>
                          <span className="font-bold text-slate-800">{worstTrade.exitPrice}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 py-6 text-center">
                      No losing trades recorded.
                    </div>
                  )}
                </div>
              </div>

              {/* Sessions Concentration */}
              <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-xs">
                <h3 className="font-bold text-slate-900 text-sm mb-1">Session Concentration</h3>
                <p className="text-[10px] text-slate-400 mb-4 font-semibold">Allocations of executions across operational timezones</p>
                <div className="h-64 flex items-center justify-center">
                  {sessionData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={sessionData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {sessionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36} iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-xs text-slate-400">No session metrics available.</div>
                  )}
                </div>
              </div>
            </section>

            {/* Best & Worst Day Statistics (based on daily net P&L) */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Best Day Card */}
              <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Best Day</h4>
                      <p className="text-[10px] text-slate-400">Most profitable day by net P&L</p>
                    </div>
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                      <Calendar className="h-5 w-5" />
                    </div>
                  </div>
                  {bestDay && bestDay.net > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xl font-black text-emerald-600">
                          +{formatValue(bestDay.net)}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-50 text-slate-600 rounded">
                          {new Date(`${bestDay.dayKey}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-3 text-xs pt-2 border-t border-slate-50">
                        <div>
                          <span className="text-slate-400 font-medium block">Weekday</span>
                          <span className="font-bold text-slate-800">{new Date(`${bestDay.dayKey}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long' })}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium block">Date</span>
                          <span className="font-bold text-slate-800">{new Date(`${bestDay.dayKey}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium block">Net P&L</span>
                          <span className="font-bold text-emerald-600">+{formatValue(bestDay.net)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium block">Trades</span>
                          <span className="font-bold text-slate-800">{bestDay.count}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 py-6 text-center">
                      No profitable trading days recorded.
                    </div>
                  )}
                </div>
              </div>

              {/* Worst Day Card */}
              <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Worst Day</h4>
                      <p className="text-[10px] text-slate-400">Day with the largest net loss</p>
                    </div>
                    <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                      <Calendar className="h-5 w-5" />
                    </div>
                  </div>
                  {worstDay && worstDay.net < 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xl font-black text-rose-600">
                          {formatValue(worstDay.net)}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-50 text-slate-600 rounded">
                          {new Date(`${worstDay.dayKey}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-3 text-xs pt-2 border-t border-slate-50">
                        <div>
                          <span className="text-slate-400 font-medium block">Weekday</span>
                          <span className="font-bold text-slate-800">{new Date(`${worstDay.dayKey}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long' })}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium block">Date</span>
                          <span className="font-bold text-slate-800">{new Date(`${worstDay.dayKey}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium block">Net P&L</span>
                          <span className="font-bold text-rose-600">{formatValue(worstDay.net)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium block">Trades</span>
                          <span className="font-bold text-slate-800">{worstDay.count}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 py-6 text-center">
                      No losing trading days recorded.
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        )}

        {/* 6. CONSOLIDATED SETTINGS VIEW */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            
            {/* Settings Inner Tabs Navigation */}
            {/* Settings Inner Tabs Navigation */}
            <aside className="lg:col-span-1">
              <span className="hidden lg:block text-[10px] text-slate-400 font-bold uppercase tracking-wider px-2.5 mb-2">Configure Journal</span>
              
              {/* Mobile Dropdown Navigation */}
              <div className="lg:hidden relative mb-4">
                <button
                  onClick={() => setIsSettingsDropdownOpen(!isSettingsDropdownOpen)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-3 text-sm font-bold text-slate-800 flex justify-between items-center shadow-sm dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
                >
                  <span className="flex items-center gap-2">
                    {settingsTab === 'achievements' && <><Trophy className="h-4 w-4" /> Achievements</>}
                    {settingsTab === 'general' && <><User className="h-4 w-4" /> General Settings</>}
                    {settingsTab === 'risk' && <><Shield className="h-4 w-4" /> Configure Guard Limits</>}
                    {settingsTab === 'notifications' && <><Bell className="h-4 w-4" /> Notifications</>}
                    {settingsTab === 'subscription' && <><CreditCard className="h-4 w-4" /> Subscription</>}
                    {settingsTab === 'about' && <><Info className="h-4 w-4" /> About</>}
                    {settingsTab === 'help' && <><HelpCircle className="h-4 w-4" /> Help</>}
                    {settingsTab === 'theme' && (theme === 'dark' ? <><Moon className="h-4 w-4 text-indigo-400" /> Theme Mode</> : <><Sun className="h-4 w-4 text-amber-500" /> Theme Mode</>)}
                  </span>
                  <span className={`transform transition-transform ${isSettingsDropdownOpen ? 'rotate-180' : ''}`}>⌄</span>
                </button>
                
                {isSettingsDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50 overflow-hidden flex flex-col animate-slide-down">
                    {[
                      { id: 'achievements', label: 'Achievements', icon: Trophy },
                      { id: 'general', label: 'General Settings', icon: User },
                      { id: 'risk', label: 'Configure Guard Limits', icon: Shield },
                      { id: 'notifications', label: 'Notifications', icon: Bell },
                      { id: 'subscription', label: 'Subscription', icon: CreditCard },
                      { id: 'about', label: 'About', icon: Info },
                      { id: 'help', label: 'Help', icon: HelpCircle },
                      { id: 'theme', label: 'Theme Mode', icon: theme === 'dark' ? Moon : Sun }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setSettingsTab(tab.id as any);
                          setIsSettingsDropdownOpen(false);
                        }}
                        className={`w-full text-left py-3 px-4 text-sm font-semibold transition flex items-center gap-3 ${
                          settingsTab === tab.id ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
                        }`}
                      >
                        <tab.icon className={`h-4 w-4 ${tab.id === 'theme' ? (theme === 'dark' ? 'text-indigo-400' : 'text-amber-500') : ''}`} />
                        {tab.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Desktop Sidebar Navigation */}
              <div className="hidden lg:flex flex-col space-y-1">
                <button
                  onClick={() => setSettingsTab('achievements')}
                  className={`w-full text-left py-2.5 px-3 rounded-lg text-xs font-semibold transition flex items-center gap-2.5 ${
                    settingsTab === 'achievements' ? 'bg-[#efefee] text-slate-900' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <Trophy className="h-4 w-4" />
                  Achievements
                </button>

                <button
                  onClick={() => setSettingsTab('general')}
                  className={`w-full text-left py-2.5 px-3 rounded-lg text-xs font-semibold transition flex items-center gap-2.5 ${
                    settingsTab === 'general' ? 'bg-[#efefee] text-slate-900' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <User className="h-4 w-4" />
                  General Settings
                </button>

                <button
                  onClick={() => setSettingsTab('risk')}
                  className={`w-full text-left py-2.5 px-3 rounded-lg text-xs font-semibold transition flex items-center gap-2.5 ${
                    settingsTab === 'risk' ? 'bg-[#efefee] text-slate-900' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <Shield className="h-4 w-4" />
                  Configure Guard Limits
                </button>

                <button
                  onClick={() => setSettingsTab('notifications')}
                  className={`w-full text-left py-2.5 px-3 rounded-lg text-xs font-semibold transition flex items-center gap-2.5 ${
                    settingsTab === 'notifications' ? 'bg-[#efefee] text-slate-900' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <Bell className="h-4 w-4" />
                  Notifications
                </button>

                <button
                  onClick={() => setSettingsTab('subscription')}
                  className={`w-full text-left py-2.5 px-3 rounded-lg text-xs font-semibold transition flex items-center gap-2.5 ${
                    settingsTab === 'subscription' ? 'bg-[#efefee] text-slate-900' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <CreditCard className="h-4 w-4" />
                  Subscription
                </button>

                <button
                  onClick={() => setSettingsTab('about')}
                  className={`w-full text-left py-2.5 px-3 rounded-lg text-xs font-semibold transition flex items-center gap-2.5 ${
                    settingsTab === 'about' ? 'bg-[#efefee] text-slate-900' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <Info className="h-4 w-4" />
                  About
                </button>

                <button
                  onClick={() => setSettingsTab('help')}
                  className={`w-full text-left py-2.5 px-3 rounded-lg text-xs font-semibold transition flex items-center gap-2.5 ${
                    settingsTab === 'help' ? 'bg-[#efefee] text-slate-900' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <HelpCircle className="h-4 w-4" />
                  Help
                </button>

                <button
                  onClick={() => setSettingsTab('theme')}
                  className={`w-full text-left py-2.5 px-3 rounded-lg text-xs font-semibold transition flex items-center gap-2.5 ${
                    settingsTab === 'theme' ? 'bg-[#efefee] text-slate-900' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {theme === 'dark' ? (
                    <Moon className="h-4 w-4 text-indigo-400" />
                  ) : (
                    <Sun className="h-4 w-4 text-amber-500" />
                  )}
                  Theme Mode
                </button>
              </div>
            </aside>

            {/* Settings Right Hand Content Panel */}
            <div className="lg:col-span-3 space-y-6">
              
              {/* Achievements sub-tab */}
              {settingsTab === 'achievements' && (
                <AchievementsTab user={user} trades={trades} />
              )}

              {/* General sub-tab */}
              {settingsTab === 'general' && user && (
                <div className="space-y-6">
                  {/* Profile Form */}
                  <form onSubmit={handleSaveProfile} className="bg-white border border-slate-100 rounded-xl p-6 shadow-xs space-y-4">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base">Profile details</h3>
                      <p className="text-xs text-slate-400">Update your account name and email address.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-50 pt-4 text-xs">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">User Name</label>
                        <input
                          type="text"
                          required
                          value={settingsName}
                          onChange={(e) => setSettingsName(e.target.value)}
                          className="bg-slate-50 border border-slate-200 text-xs rounded-lg p-2.5 w-full font-semibold focus:ring-slate-500 focus:border-slate-500"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Email Address</label>
                        <input
                          type="email"
                          required
                          value={settingsEmail}
                          onChange={(e) => setSettingsEmail(e.target.value)}
                          className="bg-slate-50 border border-slate-200 text-xs rounded-lg p-2.5 w-full font-semibold focus:ring-slate-500 focus:border-slate-500"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={actionLoading}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 px-4 rounded-lg transition"
                      >
                        {actionLoading ? 'Saving...' : 'Save Profile Changes'}
                      </button>
                    </div>
                  </form>

                  {/* Password Form */}
                  <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-base">Change Password</h3>
                        <p className="text-xs text-slate-400">Ensure your trading dashboard is secured with a strong password.</p>
                      </div>
                      {!showPasswordChange && (
                        <button
                          type="button"
                          onClick={() => setShowPasswordChange(true)}
                          className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 px-4 rounded-lg transition"
                        >
                          Change Password
                        </button>
                      )}
                    </div>

                    {showPasswordChange && (
                      <form onSubmit={handleChangePassword} className="space-y-4 pt-4 border-t border-slate-50 animate-fade-in">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                          <div>
                            <label className="font-bold text-slate-700 block mb-1">Current Password</label>
                            <input
                              type="password"
                              required
                              placeholder="••••••••"
                              value={settingsCurrPassword}
                              onChange={(e) => setSettingsCurrPassword(e.target.value)}
                              className="bg-slate-50 border border-slate-200 text-xs rounded-lg p-2.5 w-full font-mono"
                            />
                          </div>

                          <div>
                            <label className="font-bold text-slate-700 block mb-1">New Password</label>
                            <input
                              type="password"
                              required
                              placeholder="••••••••"
                              value={settingsNewPassword}
                              onChange={(e) => setSettingsNewPassword(e.target.value)}
                              className="bg-slate-50 border border-slate-200 text-xs rounded-lg p-2.5 w-full font-mono"
                            />
                          </div>

                          <div>
                            <label className="font-bold text-slate-700 block mb-1">Confirm New Password</label>
                            <input
                              type="password"
                              required
                              placeholder="••••••••"
                              value={settingsConfirmPassword}
                              onChange={(e) => setSettingsConfirmPassword(e.target.value)}
                              className="bg-slate-50 border border-slate-200 text-xs rounded-lg p-2.5 w-full font-mono"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setShowPasswordChange(false);
                              setSettingsCurrPassword('');
                              setSettingsNewPassword('');
                              setSettingsConfirmPassword('');
                            }}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2 px-4 rounded-lg transition"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={actionLoading}
                            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 px-4 rounded-lg transition disabled:opacity-50"
                          >
                            {actionLoading ? 'Updating...' : 'Update Password'}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              )}

              {/* Notifications sub-tab */}
              {settingsTab === 'notifications' && (
                <form onSubmit={handleSaveNotifications} className="bg-white border border-slate-100 rounded-xl p-6 shadow-xs space-y-4">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">Notification Preferences</h3>
                    <p className="text-xs text-slate-400">Configure automated alerts, reminders, and strict capital draw guards.</p>
                  </div>

                  <div className="border-t border-slate-50 pt-4 space-y-4">
                    {/* Toggle 1: Daily Trading Reminder */}
                    <div className="flex items-start justify-between p-3.5 bg-slate-50/70 rounded-xl border border-slate-100">
                      <div className="space-y-0.5 text-xs">
                        <strong className="text-slate-800 block">Daily Trading Reminder</strong>
                        <span className="text-[11px] text-slate-400 block">Get reminded to set targets, evaluate sentiment, and journal trades every morning.</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={dailyTradingReminder}
                        onChange={(e) => setDailyTradingReminder(e.target.checked)}
                        className="h-4.5 w-4.5 rounded border-slate-300 text-slate-900 focus:ring-slate-500 cursor-pointer"
                      />
                    </div>

                    {/* Toggle 2: Max Daily Loss Alert */}
                    <div className="flex items-start justify-between p-3.5 bg-slate-50/70 rounded-xl border border-slate-100">
                      <div className="space-y-0.5 text-xs">
                        <strong className="text-slate-800 block">Max Daily Loss Alert</strong>
                        <span className="text-[11px] text-slate-400 block">Receive instant push notifications when cumulative account losses approach limits.</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={maxDailyLossAlert}
                        onChange={(e) => setMaxDailyLossAlert(e.target.checked)}
                        className="h-4.5 w-4.5 rounded border-slate-300 text-slate-900 focus:ring-slate-500 cursor-pointer"
                      />
                    </div>

                    {/* Toggle 3: Journal Completion Reminder */}
                    <div className="flex items-start justify-between p-3.5 bg-slate-50/70 rounded-xl border border-slate-100">
                      <div className="space-y-0.5 text-xs">
                        <strong className="text-slate-800 block">Journal Completion Reminder</strong>
                        <span className="text-[11px] text-slate-400 block">Prompt to log notes, upload charts, and tag your cognitive state before session close.</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={journalCompletionReminder}
                        onChange={(e) => setJournalCompletionReminder(e.target.checked)}
                        className="h-4.5 w-4.5 rounded border-slate-300 text-slate-900 focus:ring-slate-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 px-4 rounded-lg transition"
                    >
                      Save Preferences
                    </button>
                  </div>
                </form>
              )}

              {/* Subscription sub-tab */}
              {settingsTab === 'subscription' && user && (
                <div className="space-y-6">

                  {/* Limited Period Banner */}
                  <div className="relative overflow-hidden bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-5 text-white shadow-lg">
                    <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full" />
                    <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-white/10 rounded-full" />
                    <div className="relative z-10 flex items-center justify-between gap-4 flex-wrap">
                      <div>
                        <span className="inline-block bg-white/20 text-white text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full mb-2">🎉 Limited Period Offer</span>
                        <h3 className="text-lg font-black leading-tight">Free Access — For Now!</h3>
                        <p className="text-sm text-emerald-50 mt-1 max-w-xs">You are currently enjoying <strong>full Pro access at ₹0/month</strong>. This offer won't last forever — the regular price is ₹99/month.</p>
                      </div>
                      <div className="text-center bg-white/15 rounded-xl px-5 py-3 backdrop-blur-sm border border-white/20">
                        <div className="flex items-baseline gap-1 justify-center">
                          <span className="text-2xl font-black">₹0</span>
                          <span className="text-sm text-emerald-100">/month</span>
                        </div>
                        <div className="text-[11px] text-emerald-100 mt-0.5 line-through">₹99/month</div>
                        <div className="text-[10px] font-bold text-emerald-200 mt-1">100% OFF</div>
                      </div>
                    </div>
                  </div>

                  {/* Plan Comparison */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Current Free Plan */}
                    <div className="bg-white border-2 border-emerald-400 rounded-2xl p-5 relative shadow-sm">
                      <div className="absolute -top-3 left-4">
                        <span className="bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">✅ Your Current Plan</span>
                      </div>
                      <div className="mt-2 space-y-1">
                        <h4 className="text-base font-black text-slate-900">FX Journal Pro</h4>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-black text-emerald-600">₹0</span>
                          <span className="text-sm text-slate-400">/month</span>
                          <span className="text-xs text-slate-400 ml-1 line-through">₹99</span>
                        </div>
                        <p className="text-[11px] text-emerald-600 font-semibold">Free during limited launch period</p>
                      </div>
                      <ul className="mt-4 space-y-2">
                        {[
                          'Unlimited trade journaling',
                          'MT5 paste import tools',
                          'AI Mentor coaching',
                          'Performance analytics',
                          'Risk Guard alerts',
                          'Trading calendar',
                          'Multi-account portfolios',
                        ].map(f => (
                          <li key={f} className="flex items-center gap-2 text-xs text-slate-700">
                            <span className="text-emerald-500 font-bold">✓</span> {f}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-5">
                        {user.isPro ? (
                          <span className="w-full flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 font-bold text-xs py-2.5 px-3 rounded-xl border border-emerald-200">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            Active — Free Access
                          </span>
                        ) : (
                          <button
                            onClick={handleActivateFreePlan}
                            disabled={actionLoading}
                            className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs py-2.5 px-3 rounded-xl transition disabled:opacity-50"
                          >
                            {actionLoading ? 'Activating...' : 'Select Free Plan & Activate Pro'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Regular Plan */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">After Limited Period</span>
                        <h4 className="text-base font-black text-slate-900">FX Journal Pro</h4>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-black text-slate-800">₹99</span>
                          <span className="text-sm text-slate-400">/month</span>
                        </div>
                        <p className="text-[11px] text-slate-500">Regular pricing after the launch offer ends</p>
                      </div>
                      <ul className="mt-4 space-y-2">
                        {[
                          'Everything in current plan',
                          'Priority support',
                          'New features first',
                        ].map(f => (
                          <li key={f} className="flex items-center gap-2 text-xs text-slate-500">
                            <span className="text-slate-400 font-bold">✓</span> {f}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-5">
                        <div className="w-full text-center text-slate-400 font-bold text-xs py-2.5 px-3 rounded-xl border border-slate-200 bg-white">
                          Starts after offer ends
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Current Status */}
                  <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Account Status</p>
                        <p className="text-sm font-black text-slate-900 mt-0.5">{user.name || user.email}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{user.email}</p>
                      </div>
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                        {user.isPro ? 'Pro Member — Free Access' : 'Free Sandbox Trial'}
                      </span>
                    </div>
                  </div>

                </div>
              )}


              {/* About sub-tab */}
              {settingsTab === 'about' && (
                <div className="space-y-6">
                  {/* General App Info */}
                  <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-base">About FX Journal Pro</h3>
                        <p className="text-xs text-slate-400">Application diagnostics and contact information.</p>
                      </div>
                      <span className="bg-slate-100 text-slate-800 font-mono text-xs font-bold px-3 py-1 rounded-full">
                        App Version 2.5.0
                      </span>
                    </div>
                  </div>

                  {/* Forms Grid for Contact, Report Bug, Feature Request */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* Contact */}
                    <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-xs transition-all duration-300 flex flex-col justify-between min-h-[160px] hover:border-slate-300">
                      <div className="space-y-3 w-full">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <strong className="text-sm font-black text-slate-900 block">Contact</strong>
                            <p className="text-[11px] text-slate-400">Reach our support team directly by email.</p>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-50 text-slate-500 shrink-0">
                            <HelpCircle className="h-4 w-4" />
                          </div>
                        </div>
                        <a
                          href="mailto:contact@fxjournalpro.com"
                          className="text-xs font-bold text-slate-900 hover:text-blue-600 hover:underline inline-flex items-center gap-1.5 break-all"
                        >
                          contact@fxjournalpro.com <Mail className="h-3 w-3 shrink-0" />
                        </a>
                      </div>
                    </div>

                    {/* Report a Bug */}
                    <div 
                      className={`bg-white border rounded-xl p-5 shadow-xs transition-all duration-300 flex flex-col justify-between min-h-[160px] ${
                        activeAboutForm === 'bug' 
                          ? 'border-slate-900 ring-1 ring-slate-900 md:col-span-1' 
                          : 'border-slate-100 hover:border-slate-300 cursor-pointer'
                      }`}
                      onClick={() => {
                        if (activeAboutForm !== 'bug') {
                          setActiveAboutForm('bug');
                        }
                      }}
                    >
                      <div className="space-y-3 w-full">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <strong className="text-sm font-black text-slate-900 block">Report a Bug</strong>
                            <p className="text-[11px] text-slate-400">Notice a glitch? Help us refine and stabilize your workspace.</p>
                          </div>
                          <div className={`p-2 rounded-lg shrink-0 ${activeAboutForm === 'bug' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-500'}`}>
                            <AlertTriangle className="h-4 w-4" />
                          </div>
                        </div>

                        {activeAboutForm === 'bug' ? (
                          <form onSubmit={handleReportBug} className="space-y-3 pt-2 text-xs border-t border-slate-100 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                            <div>
                              <label className="font-semibold text-slate-600 block mb-0.5">Bug Title</label>
                              <input 
                                type="text" 
                                required
                                value={bugTitle}
                                onChange={(e) => setBugTitle(e.target.value)}
                                placeholder="e.g. Chart does not load"
                                className="bg-slate-50 border border-slate-200 text-xs rounded-lg p-2 w-full font-semibold focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                              />
                            </div>
                            <div>
                              <label className="font-semibold text-slate-600 block mb-0.5">Severity</label>
                              <select
                                value={bugSeverity}
                                onChange={(e) => setBugSeverity(e.target.value)}
                                className="bg-slate-50 border border-slate-200 text-xs rounded-lg p-2 w-full font-semibold focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                              >
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                              </select>
                            </div>
                            <div>
                              <label className="font-semibold text-slate-600 block mb-0.5">Steps to Reproduce</label>
                              <textarea 
                                required
                                rows={2}
                                value={bugSteps}
                                onChange={(e) => setBugSteps(e.target.value)}
                                placeholder="1. Go to tab... 2. Click..."
                                className="bg-slate-50 border border-slate-200 text-xs rounded-lg p-2 w-full font-semibold focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                              />
                            </div>
                            <div className="flex gap-2 pt-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveAboutForm('none');
                                }}
                                className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2 rounded-lg transition text-center"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={actionLoading}
                                className="w-2/3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 rounded-lg transition text-center"
                              >
                                {actionLoading ? 'Submitting...' : 'Submit Bug'}
                              </button>
                            </div>
                          </form>
                        ) : (
                          <div className="pt-2">
                            <button
                              type="button"
                              className="text-xs font-bold text-slate-900 hover:underline flex items-center gap-1 mt-1"
                            >
                              Report Glitch <ChevronRight className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Feature Request */}
                    <div 
                      className={`bg-white border rounded-xl p-5 shadow-xs transition-all duration-300 flex flex-col justify-between min-h-[160px] ${
                        activeAboutForm === 'feature' 
                          ? 'border-slate-900 ring-1 ring-slate-900 md:col-span-1' 
                          : 'border-slate-100 hover:border-slate-300 cursor-pointer'
                      }`}
                      onClick={() => {
                        if (activeAboutForm !== 'feature') {
                          setActiveAboutForm('feature');
                        }
                      }}
                    >
                      <div className="space-y-3 w-full">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <strong className="text-sm font-black text-slate-900 block">Feature Request</strong>
                            <p className="text-[11px] text-slate-400">Suggest new analytical features, tools, or sync capabilities.</p>
                          </div>
                          <div className={`p-2 rounded-lg shrink-0 ${activeAboutForm === 'feature' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-500'}`}>
                            <Sparkles className="h-4 w-4" />
                          </div>
                        </div>

                        {activeAboutForm === 'feature' ? (
                          <form onSubmit={handleFeatureRequest} className="space-y-3 pt-2 text-xs border-t border-slate-100 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                            <div>
                              <label className="font-semibold text-slate-600 block mb-0.5">Feature Title</label>
                              <input 
                                type="text" 
                                required
                                value={featureRequestTitle}
                                onChange={(e) => setFeatureRequestTitle(e.target.value)}
                                placeholder="e.g. Discord exports"
                                className="bg-slate-50 border border-slate-200 text-xs rounded-lg p-2 w-full font-semibold focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                              />
                            </div>
                            <div>
                              <label className="font-semibold text-slate-600 block mb-0.5">Description</label>
                              <textarea 
                                required
                                rows={3}
                                value={featureRequestDesc}
                                onChange={(e) => setFeatureRequestDesc(e.target.value)}
                                placeholder="What would you like to see?"
                                className="bg-slate-50 border border-slate-200 text-xs rounded-lg p-2 w-full font-semibold focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                              />
                            </div>
                            <div className="flex gap-2 pt-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveAboutForm('none');
                                }}
                                className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2 rounded-lg transition text-center"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={actionLoading}
                                className="w-2/3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 rounded-lg transition text-center"
                              >
                                {actionLoading ? 'Submitting...' : 'Submit Idea'}
                              </button>
                            </div>
                          </form>
                        ) : (
                          <div className="pt-2">
                            <button
                              type="button"
                              className="text-xs font-bold text-slate-900 hover:underline flex items-center gap-1 mt-1"
                            >
                              Suggest Feature <ChevronRight className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* Help Sub-tab */}
              {settingsTab === 'help' && (
                <div className="space-y-6">
                  <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-base">Help &amp; Getting Started</h3>
                        <p className="text-xs text-slate-400">Guides, tips, and onboarding tools.</p>
                      </div>
                      <span className="bg-slate-100 text-slate-800 font-mono text-xs font-bold px-3 py-1 rounded-full">
                        Support Center
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-500/10 dark:to-blue-500/5 border border-indigo-100 dark:border-indigo-500/20 rounded-xl p-5 space-y-3">
                        <div className="h-10 w-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center">
                          <Compass className="h-5 w-5" />
                        </div>
                        <div>
                          <strong className="text-sm font-black text-slate-900 dark:text-white block">Restart Onboarding</strong>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                            Replay the guided tour that walks you through creating a portfolio and logging your first trade.
                          </p>
                        </div>
                        <button
                          onClick={startGuidedTour}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 px-3 rounded-lg transition flex items-center justify-center gap-1.5"
                        >
                          <RefreshCw className="h-3.5 w-3.5" /> Restart Onboarding
                        </button>
                      </div>

                      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/5 border border-emerald-100 dark:border-emerald-500/20 rounded-xl p-5 space-y-3">
                        <div className="h-10 w-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
                          <BookOpen className="h-5 w-5" />
                        </div>
                        <div>
                          <strong className="text-sm font-black text-slate-900 dark:text-white block">Getting Started Tips</strong>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                            Create a portfolio first, then log trades manually or paste them in from your MT5/MT4 terminal report.
                          </p>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-500/10 dark:to-blue-500/5 border border-sky-100 dark:border-sky-500/20 rounded-xl p-5 space-y-3 md:col-span-2">
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white flex items-center justify-center shrink-0">
                            <Terminal className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <strong className="text-sm font-black text-slate-900 dark:text-white block">MT5 Sync Tour</strong>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                              Replay the tour that walks you through the MT5 Sync window and automatic trade syncing.
                            </p>
                          </div>
                          <button
                            onClick={startMT5Tour}
                            className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 px-3 rounded-lg transition flex items-center justify-center gap-1.5"
                          >
                            <RefreshCw className="h-3.5 w-3.5" /> Show MT5 Sync Tour
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Configure Guard Limits Sub-tab */}
              {settingsTab === 'risk' && (
                <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-xs space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                        <Shield className="h-5 w-5 text-indigo-500" />
                        Configure Portfolio Guard Limits
                      </h3>
                      <p className="text-xs text-slate-400">Establish drawdown, loss, and overtrading limits to protect your capital and maintain strict discipline.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleTogglePortfolioGuard(!isPortfolioGuardOn)}
                      className="flex items-center gap-2 cursor-pointer group hover:opacity-90 transition p-1 rounded-lg"
                      title={isPortfolioGuardOn ? 'Turn Portfolio Guard OFF' : 'Turn Portfolio Guard ON'}
                    >
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${isPortfolioGuardOn ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {isPortfolioGuardOn ? 'ON' : 'OFF'}
                      </span>
                      <div
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                          isPortfolioGuardOn ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                        role="switch"
                        aria-checked={isPortfolioGuardOn}
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                            isPortfolioGuardOn ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </div>
                    </button>
                  </div>

                  {accounts.length > 0 && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800 text-xs shadow-xs">
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200 block">Configure Portfolio:</span>
                        <span className="text-[10px] text-slate-400">Select which trading account these guard limits apply to.</span>
                      </div>
                      <select
                        value={selectedAccountId || ''}
                        onChange={(e) => {
                          const accId = e.target.value;
                          setSelectedAccountId(accId);
                          fetchTradesAndParams(accId);
                        }}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 font-bold text-slate-700 dark:text-slate-200 text-xs min-w-[200px] focus:ring-slate-500 focus:border-slate-500 shadow-xs"
                      >
                        {accounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name} ({acc.broker} - {acc.accountType})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <form onSubmit={handleSaveRiskSettings} className="space-y-6 border-t border-slate-50 dark:border-slate-800/50 pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                      
                      {/* Daily Loss Guard */}
                      <div className="space-y-1.5 p-4 bg-white dark:bg-slate-800/20 rounded-xl border border-slate-200/60 dark:border-slate-800 shadow-xs">
                        <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          Daily Loss Guard Limit ($)
                        </label>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">Shut down new positions when daily cumulative losses breach this currency amount.</p>
                        <input
                          type="number"
                          required
                          value={riskSettings?.dailyLossLimit ?? 500}
                          onChange={(e) => updateRiskSettingField('dailyLossLimit', parseFloat(e.target.value) || 0)}
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs rounded-lg p-2.5 w-full font-semibold focus:ring-slate-500 focus:border-slate-500 mt-2 text-slate-800 dark:text-slate-100 shadow-xs"
                        />
                      </div>

                      {/* Overtrading Scanner */}
                      <div className="space-y-1.5 p-4 bg-white dark:bg-slate-800/20 rounded-xl border border-slate-200/60 dark:border-slate-800 shadow-xs">
                        <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          Overtrading Max Daily Trades
                        </label>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">Maximum allowed positions/trades per day before triggers lock or fire alerts.</p>
                        <input
                          type="number"
                          required
                          value={riskSettings?.maxTradesPerDay ?? 5}
                          onChange={(e) => updateRiskSettingField('maxTradesPerDay', parseInt(e.target.value) || 0)}
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs rounded-lg p-2.5 w-full font-semibold focus:ring-slate-500 focus:border-slate-500 mt-2 text-slate-800 dark:text-slate-100 shadow-xs"
                        />
                      </div>

                      {/* Weekly Loss Limit */}
                      <div className="space-y-1.5 p-4 bg-white dark:bg-slate-800/20 rounded-xl border border-slate-200/60 dark:border-slate-800 shadow-xs">
                        <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          Weekly Loss Limit ($)
                        </label>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">Aggregate drawdown cap across a 5-day cycle before system warnings.</p>
                        <input
                          type="number"
                          required
                          value={riskSettings?.weeklyLossLimit ?? 1500}
                          onChange={(e) => updateRiskSettingField('weeklyLossLimit', parseFloat(e.target.value) || 0)}
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs rounded-lg p-2.5 w-full font-semibold focus:ring-slate-500 focus:border-slate-500 mt-2 text-slate-800 dark:text-slate-100 shadow-xs"
                        />
                      </div>

                      {/* Max Drawdown Limit */}
                      <div className="space-y-1.5 p-4 bg-white dark:bg-slate-800/20 rounded-xl border border-slate-200/60 dark:border-slate-800 shadow-xs">
                        <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          Max Drawdown Limit (%)
                        </label>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">Critical percentage limit representing allowable high-to-low account equity dip.</p>
                        <input
                          type="number"
                          step="0.1"
                          required
                          value={riskSettings?.maxDrawdownLimit ?? 10.0}
                          onChange={(e) => updateRiskSettingField('maxDrawdownLimit', parseFloat(e.target.value) || 0)}
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs rounded-lg p-2.5 w-full font-semibold focus:ring-slate-500 focus:border-slate-500 mt-2 text-slate-800 dark:text-slate-100 shadow-xs"
                        />
                      </div>

                      {/* Risk Per Trade Cap */}
                      <div className="space-y-1.5 p-4 bg-white dark:bg-slate-800/20 rounded-xl border border-slate-200/60 dark:border-slate-800 shadow-xs">
                        <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          Risk-Per-Trade Cap (%)
                        </label>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">Ceiling for risk percentage per single entry based on stop-loss distance.</p>
                        <input
                          type="number"
                          step="0.1"
                          required
                          value={riskSettings?.riskPerTradeLimit ?? 2.0}
                          onChange={(e) => updateRiskSettingField('riskPerTradeLimit', parseFloat(e.target.value) || 0)}
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs rounded-lg p-2.5 w-full font-semibold focus:ring-slate-500 focus:border-slate-500 mt-2 text-slate-800 dark:text-slate-100 shadow-xs"
                        />
                      </div>

                      {/* Discipline Protection Mode */}
                      <div className="space-y-1.5 p-4 bg-white dark:bg-slate-800/20 rounded-xl border border-slate-200/60 dark:border-slate-800 flex flex-col justify-between shadow-xs">
                        <div>
                          <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                            Discipline Protection Mode
                          </label>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500">When enabled, exceeding any guard limits will block manual log inputs or sync permissions.</p>
                        </div>
                        <div className="flex items-center gap-3 mt-3">
                          <input
                            type="checkbox"
                            id="disciplineEnabled"
                            checked={isPortfolioGuardOn}
                            onChange={(e) => handleTogglePortfolioGuard(e.target.checked)}
                            className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                          <label htmlFor="disciplineEnabled" className="font-bold text-slate-800 dark:text-slate-200 cursor-pointer select-none">
                            Enable Strict Lockdown
                          </label>
                        </div>
                      </div>

                    </div>

                    <div className="flex justify-end pt-4 border-t border-slate-50 dark:border-slate-800">
                      <button
                        type="submit"
                        disabled={actionLoading}
                        className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 disabled:bg-slate-300 text-white font-bold text-xs py-2.5 px-6 rounded-lg transition shadow-xs flex items-center gap-2"
                      >
                        {actionLoading ? 'Saving Rules...' : 'Save Guard Limits'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Theme sub-tab */}
              {settingsTab === 'theme' && (
                <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-xs space-y-6">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">App Theme</h3>
                    <p className="text-xs text-slate-400">Choose between light and dark visual themes for your entire trading workspace.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-50 pt-6">
                    {/* Light Mode Card */}
                    <button
                      onClick={() => setTheme('light')}
                      className={`p-5 rounded-xl border text-left transition relative flex flex-col justify-between h-32 ${
                        theme === 'light'
                          ? 'border-slate-950 bg-slate-50 ring-1 ring-slate-950'
                          : 'border-slate-100 bg-white hover:border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                          <Sun className="h-5 w-5" />
                        </div>
                        {theme === 'light' && (
                          <span className="bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Active</span>
                        )}
                      </div>
                      <div>
                        <span className="font-extrabold text-slate-900 text-sm block">Light Mode</span>
                        <span className="text-[11px] text-slate-400 block mt-1">Clean, high-contrast crisp display ideal for daytime journaling.</span>
                      </div>
                    </button>

                    {/* Dark Mode Card */}
                    <button
                      onClick={() => setTheme('dark')}
                      className={`p-5 rounded-xl border text-left transition relative flex flex-col justify-between h-32 ${
                        theme === 'dark'
                          ? 'border-indigo-600 bg-slate-900 ring-1 ring-indigo-600'
                          : 'border-slate-100 bg-white hover:border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="p-2 bg-indigo-950 text-indigo-400 rounded-lg">
                          <Moon className="h-5 w-5" />
                        </div>
                        {theme === 'dark' && (
                          <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Active</span>
                        )}
                      </div>
                      <div>
                        <span className="font-extrabold text-slate-900 text-sm block">Dark Mode</span>
                        <span className="text-[11px] text-slate-400 block mt-1">Sleek, low-fatigue dark display designed for late-night review.</span>
                      </div>
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* 5. MT5 AUTOMATION VIEW */}
        {activeTab === 'mt5' && user && (
          <MT5Automation
            account={activeAccount || null}
            authFetch={authFetch}
            onRefresh={fetchAccountData}
          />
        )}

        {/* 6. AI CO-PILOT INSIGHTS VIEW */}
        {activeTab === 'insights' && activeAccount && user && (
          <AIInsights 
            user={user} 
            account={activeAccount} 
            onUpgradeToPro={handleUpgradeToPro} 
          />
        )}

        {/* 7. ADMIN PANEL VIEW */}
        {activeTab === 'admin' && (
          <AdminPanel onPublishAnnouncement={fetchAccountData} />
        )}

        {/* 8. TOOLS VIEW */}
        {activeTab === 'tools' && (
          <TradingTools />
        )}

        {/* Site footer with legal links */}
        <LegalFooter />

      </main>
      </div>

      {/* Mobile Bottom Navigation (Premium Instagram-Style Pill) */}
      <div className={`md:hidden fixed z-[60] transition-all duration-500 ease-in-out ${
        (showTradeModal || showAccountModal || showEditAccountModal || showTicketModal || showExportModal || showPasteModal || showSignOutModal || deleteConfirmTradeId !== null || showGuidedTour || showMT5Tour || isSettingsDropdownOpen) ? 'translate-y-24 opacity-0 pointer-events-none scale-75' : isScrolled ? 'bottom-3 left-6 right-6 scale-[0.98]' : 'bottom-6 left-4 right-4 scale-100'
      } bg-white/70 dark:bg-[#09090b]/60 backdrop-blur-2xl border border-slate-200/50 dark:border-white/10 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] ring-1 ring-black/5`}>
        <nav 
          className={`flex items-center justify-between overflow-x-auto no-scrollbar transition-all duration-500 ease-in-out px-2 ${isScrolled ? 'py-1.5 gap-1' : 'py-2.5 gap-1.5'}`}
          style={{ maskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)' }}
        >
          {[
            { id: 'dashboard', icon: BarChart3 },
            { id: 'journal', icon: BookOpen },
            { id: 'accounts', icon: Layers },
            { id: 'analytics', icon: Activity },
            { id: 'calendar', icon: Calendar },
            { id: 'fxnews', icon: Globe, notify: true },
            { id: 'mt5', icon: RefreshCw },
            { id: 'tools', icon: Wrench, notify: true },
            { id: 'insights', icon: Brain, notify: true }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id as any);
                setIsScrolled(false);
              }}
              className={`flex-shrink-0 flex items-center justify-center rounded-full transition-all duration-500 ease-out ${
                activeTab === item.id 
                  ? (isScrolled ? 'w-[68px] h-[44px] bg-slate-200 text-slate-900 dark:bg-white/20 dark:text-white' : 'w-[72px] h-[48px] bg-slate-200 text-slate-900 dark:bg-white/20 dark:text-white shadow-inner')
                  : (isScrolled ? 'w-[44px] h-[44px] text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-white/60 dark:hover:text-white dark:hover:bg-white/5' : 'w-[48px] h-[48px] text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-white/60 dark:hover:text-white dark:hover:bg-white/5')
              }`}
            >
              <div className="relative flex items-center justify-center">
                <item.icon className={`transition-all duration-500 ease-out ${
                  isScrolled ? 'h-5 w-5' : 'h-6 w-6'
                } ${activeTab === item.id ? 'scale-110 drop-shadow-sm' : 'scale-100'}`} strokeWidth={activeTab === item.id ? 2.5 : 2} />
                
                {item.notify && (
                  <span className={`absolute bg-rose-500 rounded-full transition-all duration-500 ${
                    activeTab === item.id 
                      ? 'border-slate-200 dark:border-[#2f333a]' 
                      : 'border-white dark:border-[#09090b]'
                  } ${
                    isScrolled ? '-bottom-1.5 -right-1.5 w-2 h-2 border-[1.5px]' : '-bottom-1.5 -right-1.5 w-2.5 h-2.5 border-2'
                  }`} />
                )}
              </div>
            </button>
          ))}
        </nav>
      </div>

      {/* ==========================================
          SYSTEM MODALS (CREATE ACCOUNT, ADD TRADE, ETC.)
         ========================================== */}

      {/* Edit Account Modal */}
      {showEditAccountModal && editingAccount && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-100 max-w-md w-full p-6 relative">
            <button 
              onClick={() => {
                setShowEditAccountModal(false);
                setEditingAccount(null);
              }}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 transition"
            >
              ✖
            </button>
            <form onSubmit={handleEditAccount} className="space-y-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Edit Trading Portfolio</h3>
                <p className="text-[11px] text-slate-400">Modify the alias name and starting capital for {editingAccount.broker}.</p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Account Alias / Name</label>
                <input
                  type="text"
                  required
                  value={editAccName}
                  onChange={(e) => setEditAccName(e.target.value)}
                  placeholder="Primary Live Scalper"
                  className="bg-slate-50 border border-slate-200 text-xs rounded-lg p-2.5 w-full font-semibold focus:ring-slate-500 focus:border-slate-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Starting Capital / Balance</label>
                <input
                  type="number"
                  required
                  value={editAccStartingBalance}
                  onChange={(e) => setEditAccStartingBalance(e.target.value)}
                  placeholder="10000"
                  className="bg-slate-50 border border-slate-200 text-xs rounded-lg p-2.5 w-full font-semibold focus:ring-slate-500 focus:border-slate-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Account Currency</label>
                <select
                  value={editAccCurrency}
                  onChange={(e) => setEditAccCurrency(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs rounded-lg p-2.5 w-full font-semibold focus:ring-slate-500 focus:border-slate-500"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="INR">INR (₹)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="JPY">JPY (¥)</option>
                  <option value="AUD">AUD ($)</option>
                  <option value="CAD">CAD ($)</option>
                </select>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 mt-2">
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={actionLoading}
                  className="bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/40 dark:hover:bg-red-900/50 dark:text-red-400 font-bold text-xs rounded-lg py-2.5 px-3 transition flex items-center gap-1.5 disabled:opacity-50 border border-red-200 dark:border-red-900/50"
                  title="Delete Portfolio Account"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditAccountModal(false);
                      setEditingAccount(null);
                    }}
                    className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-lg py-2.5 px-3.5 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-bold text-xs rounded-lg py-2.5 px-4 transition disabled:opacity-50"
                  >
                    {actionLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* A. Account Creation Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-xl shadow-2xl border border-slate-100 max-w-md w-full p-6 relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setShowAccountModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 z-10"
            >
              ✖
            </button>

            {accountCreationMethod === 'select' && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Connect New Portfolio Account</h3>
                  <p className="text-[11px] text-slate-400">Choose how you want to connect and log trades.</p>
                </div>
                <div className="grid gap-3">
                  <button onClick={() => setAccountCreationMethod('manual')} className="border-2 border-slate-100 hover:border-slate-300 hover:bg-slate-50 rounded-xl p-4 text-left transition flex gap-3 items-center">
                     <div className="bg-slate-100 p-2 rounded-lg text-slate-600"><Edit3 className="w-5 h-5"/></div>
                     <div>
                       <div className="font-bold text-slate-800 text-sm">Manual Account Opening</div>
                       <div className="text-[11px] text-slate-500">Create an empty portfolio to manually log your trades one-by-one.</div>
                     </div>
                  </button>
                  <button onClick={() => setAccountCreationMethod('mt5')} className="border-2 border-slate-100 hover:border-slate-300 hover:bg-slate-50 rounded-xl p-4 text-left transition flex gap-3 items-center">
                     <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Terminal className="w-5 h-5"/></div>
                     <div>
                       <div className="font-bold text-slate-800 text-sm">MT5 Sync Account</div>
                       <div className="text-[11px] text-slate-500">Connect a unique MT5 Expert Advisor to sync your trades automatically in real time.</div>
                     </div>
                  </button>
                </div>
              </div>
            )}

            {(accountCreationMethod === 'manual' || accountCreationMethod === 'mt5') && (
              <form onSubmit={handleCreateAccount} className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <button type="button" onClick={() => setAccountCreationMethod('select')} className="text-slate-400 hover:text-slate-700 text-xs font-semibold">← Back</button>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{accountCreationMethod === 'mt5' ? 'Create MT5 Sync Account' : 'Register Manual Portfolio'}</h3>
                  <p className="text-[11px] text-slate-400">
                    {accountCreationMethod === 'mt5'
                      ? "We'll generate a unique MT5 Expert Advisor for this account and walk you through connecting it after creation."
                      : 'Configure parameters for manual logs or automated Expert integrations.'}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Account Alias / Name</label>
                  <input
                    type="text"
                    required
                    value={newAccName}
                    onChange={(e) => setNewAccName(e.target.value)}
                    placeholder="Primary Live Scalper"
                    className="bg-slate-50 border border-slate-200 text-xs rounded-lg p-2.5 w-full focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

              {accountCreationMethod === 'mt5' ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Account Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setNewAccInstitutionType('Broker')}
                        className={`text-left rounded-lg border-2 p-3 transition text-xs ${newAccInstitutionType === 'Broker' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-100 hover:border-slate-300 bg-slate-50 text-slate-600'}`}
                      >
                        <div className="font-bold">Broker Account</div>
                        <div className="text-[10px] mt-0.5 opacity-80">Retail or broker-funded account</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewAccInstitutionType('Prop Firm')}
                        className={`text-left rounded-lg border-2 p-3 transition text-xs ${newAccInstitutionType === 'Prop Firm' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-100 hover:border-slate-300 bg-slate-50 text-slate-600'}`}
                      >
                        <div className="font-bold">Prop Firm Account</div>
                        <div className="text-[10px] mt-0.5 opacity-80">Proprietary trading firm account</div>
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      {newAccInstitutionType === 'Broker' ? 'Broker Name' : 'Prop Firm Name'}
                    </label>
                    <input
                      type="text"
                      required
                      value={newAccBroker}
                      onChange={(e) => setNewAccBroker(e.target.value)}
                      placeholder={newAccInstitutionType === 'Broker' ? 'IC Markets' : 'FTMO'}
                      className="bg-slate-50 border border-slate-200 text-xs rounded-lg p-2.5 w-full focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Broker Name</label>
                  <input
                    type="text"
                    required
                    value={newAccBroker}
                    onChange={(e) => setNewAccBroker(e.target.value)}
                    placeholder="IC Markets"
                    className="bg-slate-50 border border-slate-200 text-xs rounded-lg p-2.5 w-full focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {accountCreationMethod !== 'mt5' && (
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Trading Platform</label>
                  <select
                    value={newAccPlatform}
                    onChange={(e: any) => setNewAccPlatform(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-xs rounded-lg p-2.5 w-full"
                  >
                    <option value="MT5">MetaTrader 5 (MT5)</option>
                    <option value="MT4">MetaTrader 4 (MT4)</option>
                    <option value="cTrader">cTrader</option>
                    <option value="DXtrade">DXtrade</option>
                  </select>
                </div>
                )}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">{accountCreationMethod === 'mt5' ? 'Portfolio Mode' : 'Account Type'}</label>
                  <select
                    value={newAccType}
                    onChange={(e: any) => setNewAccType(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-xs rounded-lg p-2.5 w-full"
                  >
                    <option value="Live">Live Portfolio</option>
                    <option value="Demo">Demo Practice</option>
                  </select>
                </div>
              </div>

              {accountCreationMethod === 'mt5' && (
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Initial Balance</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewAccBalanceMode('auto')}
                      className={`text-left rounded-lg border-2 p-3 transition text-xs ${newAccBalanceMode === 'auto' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-100 hover:border-slate-300 bg-slate-50 text-slate-600'}`}
                    >
                      <div className="font-bold">Auto Calculate</div>
                      <div className="text-[10px] mt-0.5 opacity-80">Initial Balance = your first deposit in MT5 history</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewAccBalanceMode('manual')}
                      className={`text-left rounded-lg border-2 p-3 transition text-xs ${newAccBalanceMode === 'manual' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-100 hover:border-slate-300 bg-slate-50 text-slate-600'}`}
                    >
                      <div className="font-bold">Enter Manually</div>
                      <div className="text-[10px] mt-0.5 opacity-80">Provide your own starting balance</div>
                    </button>
                  </div>
                  {newAccBalanceMode === 'manual' && (
                    <div className="mt-3">
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Starting Balance</label>
                      <input
                        type="number"
                        required
                        value={newAccBalance}
                        onChange={(e) => setNewAccBalance(e.target.value)}
                        className="bg-slate-50 border border-slate-200 text-xs rounded-lg p-2.5 w-full"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Base Currency</label>
                  <select
                    value={newAccCurrency}
                    onChange={(e) => setNewAccCurrency(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-xs rounded-lg p-2.5 w-full"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="JPY">JPY (¥)</option>
                    <option value="AUD">AUD ($)</option>
                    <option value="CAD">CAD ($)</option>
                  </select>
                </div>
                {accountCreationMethod !== 'mt5' && (
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Starting Balance</label>
                  <input
                    type="number"
                    required
                    value={newAccBalance}
                    onChange={(e) => setNewAccBalance(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-xs rounded-lg p-2.5 w-full"
                  />
                </div>
                )}
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg py-2.5 px-4 transition disabled:opacity-50"
              >
                {actionLoading ? 'Provisioning Account...' : (accountCreationMethod === 'mt5' ? 'Create MT5 Sync Account' : 'Create Portfolio Account')}
              </button>
            </form>
            )}
          </div>
        </div>
      )}

      {/* A2. Delete Trade Confirmation Modal */}
      {deleteConfirmTradeId && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-xs p-5">
            <p className="text-sm font-semibold text-slate-800 mb-4">Delete this trade?</p>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => { setDeleteConfirmTradeId(null); setDeleteConfirmDontShow(false); }}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm rounded-lg py-2 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteConfirmLoading}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-medium text-sm rounded-lg py-2 transition-colors disabled:opacity-60"
              >
                {deleteConfirmLoading ? '...' : 'Delete'}
              </button>
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                id="delete-dont-show-again"
                type="checkbox"
                checked={deleteConfirmDontShow}
                onChange={(e) => setDeleteConfirmDontShow(e.target.checked)}
                className="w-3.5 h-3.5 accent-indigo-600 cursor-pointer"
              />
              <span className="text-xs text-slate-400">Don't show again</span>
            </label>
          </div>
        </div>
      )}

      {/* B. Add / Edit Trade Modal */}
      {showTradeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full relative overflow-hidden">
            
            {/* Modal Header */}
            <div className="bg-slate-50/50 border-b border-slate-100 p-5 pr-12">
              <h3 className="font-bold text-slate-900 text-lg">{editingTradeId ? 'Modify Trade Record' : 'Record Executed Trade'}</h3>
              <p className="text-xs text-slate-500 mt-0.5">Enter the essential details for your journal.</p>
              
              <button 
                onClick={() => setShowTradeModal(false)}
                className="absolute right-4 top-5 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition duration-150"
              >
                ✖
              </button>
            </div>

            <form onSubmit={handleSaveTrade} className="p-5 space-y-5">
              
              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Entry Time</label>
                  <div className="relative">
                    <input
                      id="tradeDateInput"
                      type="datetime-local"
                      value={tradeDate}
                      onChange={(e) => setTradeDate(e.target.value)}
                      className="bg-white border border-slate-200 text-sm rounded-xl p-3 pr-10 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm transition-all [&::-webkit-calendar-picker-indicator]:hidden"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.getElementById('tradeDateInput') as HTMLInputElement;
                        if (input) {
                          input.focus();
                          try { if ('showPicker' in input) (input as any).showPicker(); } catch (_) {}
                        }
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 transition-colors z-10"
                    >
                      <Calendar className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Exit Time (Optional)</label>
                  <div className="relative">
                    <input
                      id="tradeExitTimeInput"
                      type="datetime-local"
                      value={tradeExitTime}
                      onChange={(e) => setTradeExitTime(e.target.value)}
                      className="bg-white border border-slate-200 text-sm rounded-xl p-3 pr-10 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm transition-all [&::-webkit-calendar-picker-indicator]:hidden"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.getElementById('tradeExitTimeInput') as HTMLInputElement;
                        if (input) {
                          input.focus();
                          try { if ('showPicker' in input) (input as any).showPicker(); } catch (_) {}
                        }
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 transition-colors z-10"
                    >
                      <Calendar className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Core Details (Asset, Direction, Lots) */}
              <div className="grid grid-cols-3 gap-4">
                {/* Symbol with autocomplete */}
                <div className="relative">
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Symbol</label>
                  <input
                    ref={symbolInputRef}
                    type="text"
                    required
                    value={tradeSymbol}
                    onChange={(e) => {
                      const sym = e.target.value.toUpperCase();
                      setTradeSymbol(sym);
                      localStorage.setItem('lastTradeSymbol', sym);
                      if (sym.length > 0) {
                        const matches = ALL_SYMBOLS.filter(s => s.startsWith(sym) && s !== sym);
                        setSymbolSuggestions(matches.slice(0, 8));
                        setShowSymbolDropdown(matches.length > 0);
                      } else {
                        setSymbolSuggestions([]);
                        setShowSymbolDropdown(false);
                      }
                    }}
                    onFocus={() => {
                      if (tradeSymbol.length > 0) {
                        const matches = ALL_SYMBOLS.filter(s => s.startsWith(tradeSymbol) && s !== tradeSymbol);
                        if (matches.length > 0) { setSymbolSuggestions(matches.slice(0, 8)); setShowSymbolDropdown(true); }
                      } else {
                        setSymbolSuggestions(ALL_SYMBOLS.slice(0, 8));
                        setShowSymbolDropdown(true);
                      }
                    }}
                    placeholder="XAUUSD"
                    autoComplete="off"
                    className="bg-white border border-slate-200 text-sm rounded-xl p-3 w-full uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm transition-all"
                  />
                  {/* Autocomplete Dropdown */}
                  {showSymbolDropdown && symbolSuggestions.length > 0 && (
                    <div
                      ref={symbolDropdownRef}
                      className="absolute top-full left-0 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden"
                    >
                      {symbolSuggestions.map((sym) => {
                        const spec = SYMBOL_SPECS[sym];
                        const previewProfit = spec
                          ? calculateTradeProfit(sym, tradeType, parseFloat(tradeEntryPrice), parseFloat(tradeExitPrice), parseFloat(tradeLotSize))
                          : null;
                        return (
                          <button
                            key={sym}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setTradeSymbol(sym);
                              localStorage.setItem('lastTradeSymbol', sym);
                              setShowSymbolDropdown(false);
                              setSymbolSuggestions([]);
                            }}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 hover:text-indigo-700 transition-colors flex items-center justify-between font-medium border-b border-slate-50 last:border-0"
                          >
                            <span className="font-bold text-slate-800">{sym}</span>
                            {previewProfit !== null && (
                              <span className={`text-[10px] font-semibold ${previewProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                {previewProfit >= 0 ? '+' : ''}{previewProfit.toFixed(2)}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Direction</label>
                  <select
                    value={tradeType}
                    onChange={(e: any) => setTradeType(e.target.value)}
                    className="bg-white border border-slate-200 text-sm rounded-xl p-3 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm transition-all cursor-pointer"
                  >
                    <option value="Buy">BUY</option>
                    <option value="Sell">SELL</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Lot Size</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={tradeLotSize}
                    onChange={(e) => setTradeLotSize(e.target.value)}
                    className="bg-white border border-slate-200 text-sm rounded-xl p-3 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm transition-all"
                  />
                </div>
              </div>

              {/* Price Details */}
              <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Entry Price</label>
                    <input
                      type="number"
                      step="0.00001"
                      required
                      value={tradeEntryPrice}
                      onChange={(e) => setTradeEntryPrice(e.target.value)}
                      className="bg-white border border-slate-200 text-sm rounded-xl p-2.5 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Exit Price</label>
                    <input
                      type="number"
                      step="0.00001"
                      required
                      value={tradeExitPrice}
                      onChange={(e) => setTradeExitPrice(e.target.value)}
                      className="bg-white border border-slate-200 text-sm rounded-xl p-2.5 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Stop Loss <span className="text-slate-400 font-normal">(SL)</span></label>
                    <input
                      type="number"
                      step="0.00001"
                      value={tradeSL}
                      onChange={(e) => setTradeSL(e.target.value)}
                      placeholder="Optional"
                      className="bg-white border border-slate-200 text-sm rounded-xl p-2.5 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Take Profit <span className="text-slate-400 font-normal">(TP)</span></label>
                    <input
                      type="number"
                      step="0.00001"
                      value={tradeTP}
                      onChange={(e) => setTradeTP(e.target.value)}
                      placeholder="Optional"
                      className="bg-white border border-slate-200 text-sm rounded-xl p-2.5 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Outcome (Net P/L) — auto-calculated */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">Net P/L (Profit/Loss)</label>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    tradeProfitIsAuto
                      ? 'bg-indigo-50 text-indigo-500'
                      : 'bg-amber-50 text-amber-500'
                  }`}>
                    {tradeProfitIsAuto ? '⚡ Auto-calculated' : '✏️ Manual override'}
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-slate-400 font-semibold sm:text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={tradeProfit}
                    onChange={(e) => {
                      setTradeProfit(e.target.value);
                      setTradeProfitIsAuto(false);
                    }}
                    onFocus={() => setTradeProfitIsAuto(false)}
                    placeholder="0.00"
                    className={`bg-white border text-sm rounded-xl p-3 pl-7 w-full focus:outline-none shadow-sm transition-all font-bold ${
                      Number(tradeProfit) > 0
                        ? 'border-emerald-300 text-emerald-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500'
                        : Number(tradeProfit) < 0
                          ? 'border-rose-300 text-rose-700 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500'
                          : 'border-slate-200 text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500'
                    }`}
                  />
                  {tradeProfitIsAuto && (
                    <button
                      type="button"
                      onClick={() => {
                        setTradeProfitIsAuto(true);
                        const entry = parseFloat(tradeEntryPrice);
                        const exit  = parseFloat(tradeExitPrice);
                        const lot   = parseFloat(tradeLotSize);
                        const calc  = calculateTradeProfit(tradeSymbol, tradeType, entry, exit, lot);
                        if (calc !== null) setTradeProfit(String(calc));
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-400 hover:text-indigo-600 transition-colors"
                      title="Recalculate profit"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {!SYMBOL_SPECS[tradeSymbol.toUpperCase()] && tradeSymbol.length > 2 && (
                  <p className="text-[10px] text-amber-500 mt-1">
                    ⚠ Symbol not recognized — please enter profit manually.
                  </p>
                )}
              </div>

              {/* Optional extras — horizontal chip row */}
              <div className="space-y-3">

                {/* Toggle chips row */}
                <div className="flex items-center gap-2 flex-wrap">

                  {/* + Note */}
                  <button
                    type="button"
                    onClick={() => setShowNoteField(prev => !prev)}
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all duration-200 ${
                      showNoteField
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-400 hover:text-indigo-600'
                    }`}
                  >
                    <Plus className={`h-3 w-3 transition-transform duration-200 ${showNoteField ? 'rotate-45' : ''}`} />
                    Note
                  </button>

                  {/* + Emotion */}
                  <button
                    type="button"
                    onClick={() => setShowEmotionField(prev => !prev)}
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all duration-200 ${
                      showEmotionField
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-400 hover:text-indigo-600'
                    }`}
                  >
                    <Plus className={`h-3 w-3 transition-transform duration-200 ${showEmotionField ? 'rotate-45' : ''}`} />
                    Emotion
                    {showEmotionField && <span className="opacity-70 font-normal">· {tradeEmotion}</span>}
                  </button>

                </div>

                {/* Expanded: Note */}
                {showNoteField && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                    <textarea
                      rows={3}
                      value={tradeNotes}
                      onChange={(e) => setTradeNotes(e.target.value)}
                      placeholder="Any thoughts, observations, or lessons from this trade…"
                      className="bg-slate-50/80 border border-slate-200 text-sm text-slate-700 rounded-xl p-3 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none placeholder:text-slate-400"
                    />
                  </div>
                )}

                {/* Expanded: Emotion */}
                {showEmotionField && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex flex-wrap gap-2">
                      {(['Calm', 'Excited', 'Anxious', 'FOMO', 'Greedy', 'Revenge'] as const).map(e => (
                        <button
                          key={e}
                          type="button"
                          onClick={() => setTradeEmotion(e)}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all duration-150 ${
                            tradeEmotion === e
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                              : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-400 hover:text-indigo-600'
                          }`}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={actionLoading}

                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl py-3.5 px-4 transition-all duration-300 shadow-md shadow-indigo-500/30 hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {actionLoading ? 'Saving...' : editingTradeId ? 'Update Trade Record' : 'Save Trade'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Paste-from-MT5 Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-4 z-50 overflow-y-auto pt-16 md:pt-24 pb-16">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-100 max-w-2xl w-full p-6 relative">
            <button
              onClick={() => setShowPasteModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-50 transition duration-150"
            >
              ✖
            </button>

            <h3 className="font-bold text-slate-900 text-base mb-1">Import MT5 Trades</h3>
            <p className="text-[11px] text-slate-400 mb-4">
              Paste copied trade data, or upload an HTML/XML report exported from MT5.
            </p>

            {/* File upload row */}
            <div className="flex items-center gap-3 mb-4 p-3 bg-slate-50 border border-dashed border-slate-200 rounded-lg">
              <label className="cursor-pointer flex items-center gap-2 text-xs font-semibold text-blue-600 hover:text-blue-700">
                <Upload className="h-4 w-4" />
                Upload HTML / XML Report
                <input
                  type="file"
                  accept=".html,.htm,.xml"
                  onChange={handleReportFileUpload}
                  className="hidden"
                />
              </label>
              <span className="text-[11px] text-slate-400">
                From MT5: <strong>File → Save as Report</strong> (HTML) or export XML
              </span>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 border-t border-slate-100"></div>
              <span className="text-[11px] text-slate-400 font-medium">or paste tabular data</span>
              <div className="flex-1 border-t border-slate-100"></div>
            </div>

            <textarea
              value={pasteRawText}
              onChange={e => setPasteRawText(e.target.value)}
              rows={6}
              className="w-full border border-slate-200 rounded-lg p-3 text-xs font-mono text-slate-700 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400"
              placeholder={`Paste MT5 trade data here...\n\nExample (tab-separated):\n#\tTime\tType\tSize\tItem\tPrice\tS/L\tT/P\tClose Time\tPrice\tCommission\tSwap\tProfit\n12345\t2024.01.15 10:30\tbuy\t0.10\tEURUSD\t1.08500\t1.08000\t1.09000\t2024.01.15 12:45\t1.09200\t-3.50\t-1.20\t50.00`}
            />

            <div className="flex gap-2 mt-3">
              <button
                onClick={handleParsePaste}
                disabled={!pasteRawText.trim() || pasteRawText.startsWith('[Parsed')}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg py-2 px-4 transition flex items-center gap-1.5"
              >
                <Terminal className="h-3.5 w-3.5" />
                Parse Trades
              </button>
              {parsedTrades.length > 0 && (
                <span className="text-xs text-slate-500 self-center ml-1">
                  {parsedTrades.length} trade{parsedTrades.length > 1 ? 's' : ''} detected
                </span>
              )}
            </div>

            {parsedTrades.length > 0 && (
              <div className="mt-4 border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="bg-slate-50 text-left text-slate-500 font-semibold">
                      <th className="px-3 py-2 whitespace-nowrap">Date</th>
                      <th className="px-3 py-2 whitespace-nowrap">Symbol</th>
                      <th className="px-3 py-2 whitespace-nowrap">Type</th>
                      <th className="px-3 py-2 whitespace-nowrap">Lots</th>
                      <th className="px-3 py-2 whitespace-nowrap">Entry</th>
                      <th className="px-3 py-2 whitespace-nowrap">Exit</th>
                      <th className="px-3 py-2 whitespace-nowrap">Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedTrades.map((t, idx) => (
                      <tr key={idx} className="border-t border-slate-100 text-slate-700">
                        <td className="px-3 py-1.5 whitespace-nowrap">{new Date(t.date).toLocaleDateString()}</td>
                        <td className="px-3 py-1.5 whitespace-nowrap font-medium">{t.symbol}</td>
                        <td className="px-3 py-1.5 whitespace-nowrap">
                          <span className={`${t.type === 'Buy' ? 'text-emerald-600' : 'text-rose-600'} font-semibold`}>{t.type}</span>
                        </td>
                        <td className="px-3 py-1.5 whitespace-nowrap">{t.lotSize}</td>
                        <td className="px-3 py-1.5 whitespace-nowrap font-mono">{t.entryPrice}</td>
                        <td className="px-3 py-1.5 whitespace-nowrap font-mono">{t.exitPrice}</td>
                        <td className={`px-3 py-1.5 whitespace-nowrap font-semibold font-mono ${t.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {t.profit >= 0 ? '+' : ''}{t.profit.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {parsedTrades.length > 0 && (
              <div className="flex gap-2 justify-end mt-4 pt-4 border-t border-slate-100">
                <button
                  onClick={() => setShowPasteModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportParsedTrades}
                  disabled={pasteImporting}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg py-2 px-4 transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {pasteImporting ? 'Importing...' : `Save All ${parsedTrades.length} Trades`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* B2. Export Journal Modal (Excel / PDF) */}
      {showExportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-100 max-w-md w-full p-6 relative">
            <button
              onClick={() => setShowExportModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-50 transition duration-150"
            >
              ✖
            </button>

            <h3 className="font-bold text-slate-900 text-base mb-1">Export Journal</h3>
            <p className="text-[11px] text-slate-400 mb-4">
              Choose the trading period and format for your export.
            </p>

            {/* Format selector */}
            <div className="mb-4">
              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1.5">Format</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setExportFormat('xlsx')}
                  className={`text-xs font-semibold rounded-lg px-3 py-2.5 border transition flex items-center justify-center gap-1.5 ${
                    exportFormat === 'xlsx'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Excel (.xlsx)
                </button>
                <button
                  onClick={() => setExportFormat('pdf')}
                  className={`text-xs font-semibold rounded-lg px-3 py-2.5 border transition flex items-center justify-center gap-1.5 ${
                    exportFormat === 'pdf'
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  PDF (.pdf)
                </button>
              </div>
            </div>

            {/* Preset periods */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                { key: 'this-month', label: 'This Month' },
                { key: 'last-month', label: 'Last Month' },
                { key: 'last-3-months', label: 'Last 3 Months' },
                { key: 'last-6-months', label: 'Last 6 Months' },
                { key: 'this-year', label: 'This Year' },
                { key: 'all', label: 'All Time' },
                { key: 'custom', label: 'Custom Range' },
              ].map(p => (
                <button
                  key={p.key}
                  onClick={() => setExportPreset(p.key)}
                  className={`text-xs font-semibold rounded-lg px-3 py-2.5 border transition ${
                    exportPreset === p.key
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Custom date range */}
            {exportPreset === 'custom' && (
              <div className="flex items-end gap-2 mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex-1">
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Start Date</label>
                  <input
                    type="date"
                    value={exportCustomStart}
                    onChange={e => setExportCustomStart(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>
                <div className="text-slate-400 pb-2">to</div>
                <div className="flex-1">
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">End Date</label>
                  <input
                    type="date"
                    value={exportCustomEnd}
                    onChange={e => setExportCustomEnd(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>
              </div>
            )}

            {/* Trade count preview */}
            <div className="text-[11px] text-slate-500 mb-4 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
              {(() => {
                const count = filterTradesByRange(getExportRange()).length;
                return <>{count} trade{count === 1 ? '' : 's'} will be exported</>;
              })()}
            </div>

            <div className="flex gap-2 justify-end pt-4 border-t border-slate-100">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleExportJournal()}
                disabled={exportPreset === 'custom' && (!exportCustomStart || !exportCustomEnd)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg py-2 px-4 transition disabled:opacity-50 flex items-center gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                Download {exportFormat === 'xlsx' ? 'Excel' : 'PDF'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* C. Ticket Creation Modal */}
      {showTicketModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-100 max-w-md w-full p-6 relative">
            <button 
              onClick={() => setShowTicketModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              ✖
            </button>
            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Submit Support Request</h3>
                <p className="text-[11px] text-slate-400">Briefly detail your query and our team will get in touch.</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Category</label>
                <select
                  value={ticketCategory}
                  onChange={(e: any) => setTicketCategory(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs rounded-lg p-2.5 w-full"
                >
                  <option value="Other">General Support Query</option>
                  <option value="Billing">Billing & Subscription</option>
                  <option value="Feature Request">Feature Request</option>
                  <option value="Bug">Technical Bug Report</option>
                  <option value="Other">Other Query</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Subject Title</label>
                <input
                  type="text"
                  required
                  value={ticketTitle}
                  onChange={(e) => setTicketTitle(e.target.value)}
                  placeholder="Need assistance linking MetaQuotes terminal"
                  className="bg-slate-50 border border-slate-200 text-xs rounded-lg p-2.5 w-full"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Detailed Description</label>
                <textarea
                  required
                  rows={4}
                  value={ticketDescription}
                  onChange={(e) => setTicketDescription(e.target.value)}
                  placeholder="Explain your situation in full..."
                  className="bg-slate-50 border border-slate-200 text-xs rounded-lg p-2.5 w-full"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg py-2.5 px-4 transition disabled:opacity-50"
              >
                {actionLoading ? 'Logging ticket...' : 'Submit Support Ticket'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* First-time onboarding guided tour */}
      {showGuidedTour && user && (
        <GuidedTour
          step={guidedTourStep}
          accountCreated={accounts.length > 0}
          onNext={nextGuidedTourStep}
          onBack={backGuidedTourStep}
          onSkip={completeGuidedTour}
          onFinish={completeGuidedTour}
        />
      )}

      {/* One-time MT5 Sync tour */}
      {showMT5Tour && user && (
        <GuidedTour
          variant="mt5"
          step={mt5TourStep}
          accountCreated={accounts.length > 0}
          onNext={nextMT5TourStep}
          onBack={backMT5TourStep}
          onSkip={completeMT5Tour}
          onFinish={completeMT5Tour}
        />
      )}

      {/* Sign-out confirmation modal */}
      {showSignOutModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200"
            style={{ animation: 'modalIn 0.2s ease-out' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                <LogOut className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Sign Out</h3>
                <p className="text-xs text-slate-500 mt-0.5">Are you sure you want to sign out?</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <button
                onClick={() => setShowSignOutModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowSignOutModal(false);
                  await performLogout();
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
