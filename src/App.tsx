import React, { useState, useEffect } from 'react';
import { 
  BarChart3, BookOpen, Calendar, Shield, HelpCircle, User, 
  ChevronRight, Sparkles, TrendingUp, TrendingDown, Layers, 
  DollarSign, Plus, CheckCircle2, Lock, Key, ArrowRight,
  LogOut, Star, Compass, Trash2, Check, Download, AlertTriangle,
  Clock, Heart, Tag, Edit3, Image as ImageIcon, Eye, EyeOff, RefreshCw, Radio,
  Cpu, Terminal, Globe, Bell, CreditCard, Info, Activity, Menu, Sun, Moon, Brain
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

import MT5Instructions from './components/MT5Instructions';
import TradingCalendar from './components/TradingCalendar';
import AIInsights from './components/AIInsights';
import AdminPanel from './components/AdminPanel';
import Logo from './components/Logo';

export default function App() {
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Core business states
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [trades, setTrades] = useState<Trade[]>([]);
  const [riskSettings, setRiskSettings] = useState<RiskSettings | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);

  // Loading indicator states
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Onboarding Wizard states
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [obExperience, setObExperience] = useState<'Beginner' | 'Intermediate' | 'Professional'>('Intermediate');
  const [obStyle, setObStyle] = useState<'Scalping' | 'Day Trading' | 'Swing Trading'>('Day Trading');
  const [obMarkets, setObMarkets] = useState<string[]>(['Forex', 'Gold']);

  // Modals & New Form fields
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [newAccName, setNewAccName] = useState('');
  const [newAccBroker, setNewAccBroker] = useState('');
  const [newAccPlatform, setNewAccPlatform] = useState<'MT4' | 'MT5' | 'cTrader' | 'DXtrade'>('MT5');
  const [newAccType, setNewAccType] = useState<'Live' | 'Demo'>('Live');
  const [newAccCurrency, setNewAccCurrency] = useState('USD');
  const [newAccBalance, setNewAccBalance] = useState('10000');
  
  const [accountCreationMethod, setAccountCreationMethod] = useState<'select' | 'manual' | 'mt5'>('select');
  const [eaLogin, setEaLogin] = useState('');
  const [eaBroker, setEaBroker] = useState('');

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
  const [tradeSymbol, setTradeSymbol] = useState('EURUSD');
  const [tradeType, setTradeType] = useState<'Buy' | 'Sell'>('Buy');
  const [tradeLotSize, setTradeLotSize] = useState('1.0');
  const [tradeEntryPrice, setTradeEntryPrice] = useState('1.08500');
  const [tradeExitPrice, setTradeExitPrice] = useState('1.09200');
  const [tradeSL, setTradeSL] = useState('');
  const [tradeTP, setTradeTP] = useState('');
  const [tradeProfit, setTradeProfit] = useState('700');
  const [tradeComm, setTradeComm] = useState('-7');
  const [tradeSwap, setTradeSwap] = useState('0');
  const [tradeRisk, setTradeRisk] = useState('1.0');
  const [tradeStrategy, setTradeStrategy] = useState('Order Block Rejection');
  const [tradeEmotion, setTradeEmotion] = useState<'Calm' | 'Excited' | 'Anxious' | 'FOMO' | 'Greedy' | 'Revenge'>('Calm');
  const [tradeNotes, setTradeNotes] = useState('');
  const [tradeScreenshot, setTradeScreenshot] = useState('');
  const [tradeTags, setTradeTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');

  // Support ticket form
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketCategory, setTicketCategory] = useState<'Billing' | 'MT5 Sync' | 'Feature Request' | 'Bug' | 'Other'>('MT5 Sync');
  const [ticketDescription, setTicketDescription] = useState('');

  // Filtering / Search state for Journal
  const [searchQuery, setSearchQuery] = useState('');
  const [journalFilterSymbol, setJournalFilterSymbol] = useState('');
  const [journalFilterStrategy, setJournalFilterStrategy] = useState('');
  const [journalFilterEmotion, setJournalFilterEmotion] = useState('');

  // Unified settings tab state
  const [settingsTab, setSettingsTab] = useState<'general' | 'notifications' | 'subscription' | 'about' | 'theme' | 'risk'>('general');
  const [activeAboutForm, setActiveAboutForm] = useState<'none' | 'support' | 'bug' | 'feature'>('none');

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
    const email = sessionUser?.email || '';
    if (!email) {
      setLoading(false);
      return;
    }

    const name =
      sessionUser?.user_metadata?.full_name ||
      sessionUser?.user_metadata?.name ||
      email.split('@')[0] ||
      '';

    localStorage.setItem('auth_email', email);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-email': email },
        body: JSON.stringify({ email, name, isEmailVerified: true })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
          if (data.user.onboardingCompleted) {
            await fetchAccountData();
          } else {
            setOnboardingStep(1);
          }
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      console.error('Error syncing user with backend:', e);
    }

    setUser({
      id: sessionUser?.id || `supabase_${email}`,
      email,
      name,
      onboardingCompleted: false,
      isPro: false,
    });

    await fetchAccountData();
    setLoading(false);
  };

  // Notifications
  const [dailyTradingReminder, setDailyTradingReminder] = useState(true);
  const [maxDailyLossAlert, setMaxDailyLossAlert] = useState(true);
  const [journalCompletionReminder, setJournalCompletionReminder] = useState(false);

  // About Forms
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
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
    }
  }, [user]);

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

  // authFetch — wraps native fetch and injects x-auth-email header so that
  // Vercel serverless cold starts can always identify the current user.
  const authFetch = (url: string, options: RequestInit = {}): Promise<Response> => {
    const storedEmail = localStorage.getItem('auth_email') || user?.email || '';
    const method = (options.method || 'GET').toUpperCase();
    const needsContentType = ['POST', 'PUT', 'PATCH'].includes(method) && options.body;
    return fetch(url, {
      ...options,
      headers: {
        ...(needsContentType ? { 'Content-Type': 'application/json' } : {}),
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
            await syncSupabaseUser(session.user);
            return;
          }
        }
      } catch (err) {
        console.error('Error loading Supabase session:', err);
      }

      const storedEmail = localStorage.getItem('auth_email');
      if (storedEmail) {
        try {
          const res = await fetch('/api/auth/me', {
            headers: { 'x-auth-email': storedEmail }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.user) {
              setUser(data.user);
              if (data.user.onboardingCompleted) {
                await fetchAccountData();
              } else {
                setOnboardingStep(1);
              }
              setLoading(false);
              return;
            }
          }
        } catch (e) {
          console.error('Error loading stored session:', e);
        }
      }

      setLoading(false);
    };

    bootstrapSession();

    let subscription: any = null;
    if (isSupabaseConfigured) {
      const subObj = supabase.auth.onAuthStateChange(async (event, session) => {
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') && session?.user) {
          await syncSupabaseUser(session.user);
        }

        if (event === 'SIGNED_OUT') {
          localStorage.removeItem('auth_email');
          localStorage.removeItem('selected_account_id');
          setUser(null);
          setAccounts([]);
          setTrades([]);
          setSelectedAccountId('');
          setTickets([]);
          setAnnouncements([]);
          setRiskSettings(null);
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
    setLoading(true);
    try {
      // Accounts
      const accsRes = await authFetch('/api/accounts');
      const accsData = await accsRes.json();
      setAccounts(accsData.accounts);

      if (accsData.accounts.length > 0) {
        // Automatically select the first active account if none is chosen
        const storedSelectedId = localStorage.getItem('selected_account_id');
        const defaultId = overrideAccountId 
          ? overrideAccountId 
          : (storedSelectedId && accsData.accounts.some((a: any) => a.id === storedSelectedId)
            ? storedSelectedId 
            : accsData.accounts[0].id);
        
        setSelectedAccountId(defaultId);
        localStorage.setItem('selected_account_id', defaultId);
        await fetchTradesAndParams(defaultId);
      }

      // Support tickets
      const tickRes = await authFetch('/api/tickets');
      const tickData = await tickRes.json();
      setTickets(tickData.tickets);

      // Announcements
      const annRes = await authFetch('/api/announcements');
      const annData = await annRes.json();
      setAnnouncements(annData.announcements);

    } catch (e) {
      console.error('Error fetching dashboard tables:', e);
    } finally {
      setLoading(false);
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
    localStorage.setItem('selected_account_id', accId);
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
      localStorage.setItem('auth_email', authEmail);
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-email': authEmail },
        body: JSON.stringify({ email: authEmail, password: authPassword })
      });

      if (!res.ok) {
        const errorData = await res.json();
        setAuthError(errorData.error || 'Login failed.');
        return;
      }

      const data = await res.json();
      if (data.user) {
        setUser(data.user);
        if (data.user.onboardingCompleted) {
          await fetchAccountData();
        } else {
          setOnboardingStep(1);
        }
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
      localStorage.setItem('auth_email', authEmail);
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
        setUser(data.user);
        setIsOtpMode(false);
        setOtpCode('');
        if (data.user.onboardingCompleted) {
          await fetchAccountData();
        } else {
          setOnboardingStep(1);
        }
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
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('[AxyFx] Error during Supabase signout:', e);
    }
    localStorage.removeItem('auth_email');
    localStorage.removeItem('selected_account_id');
    setUser(null);
    setAccounts([]);
    setTrades([]);
    setSelectedAccountId('');
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
        fetchAccountData();
      }
    } catch (err) {
      console.error('Onboarding exception:', err);
      alert('Failed to complete onboarding: ' + err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateEaAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eaLogin || !eaBroker) return;
    setActionLoading(true);
    try {
      const res = await authFetch('/api/mt5/connect-ea', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loginNumber: eaLogin,
          brokerName: eaBroker,
          startingBalance: 0
        })
      });
      if (res.ok) {
        const data = await res.json();
        
        // Refresh accounts list
        const accsRes = await authFetch('/api/accounts');
        const accsData = await accsRes.json();
        setAccounts(accsData.accounts);
        
        setShowAccountModal(false);
        setSelectedAccountId(data.account.id);
        setActiveTab('mt5');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create EA account');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Account Operations
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName || !newAccBroker || !newAccBalance) return;
    setActionLoading(true);
    try {
      const res = await authFetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAccName,
          broker: newAccBroker,
          platform: newAccPlatform,
          accountType: newAccType,
          currency: newAccCurrency,
          startingBalance: newAccBalance
        })
      });
      const data = await res.json();
      if (res.ok) {
        setShowAccountModal(false);
        setNewAccName('');
        setNewAccBroker('');
        fetchAccountData();
      } else if (data.error) {
        alert(data.error);
      }
    } catch (err) {
      alert('Error creating account');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount || !editAccName || !editAccStartingBalance) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/accounts/${editingAccount.id}`, {
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
      setTradeSymbol(trade.symbol);
      setTradeType(trade.type);
      setTradeLotSize(String(trade.lotSize));
      setTradeEntryPrice(String(trade.entryPrice));
      setTradeExitPrice(String(trade.exitPrice));
      setTradeSL(trade.stopLoss ? String(trade.stopLoss) : '');
      setTradeTP(trade.takeProfit ? String(trade.takeProfit) : '');
      setTradeProfit(String(trade.profit));
      setTradeComm(String(trade.commission));
      setTradeSwap(String(trade.swap));
      setTradeRisk(String(trade.riskPercentage));
      setTradeStrategy(trade.strategy || 'Unspecified');
      setTradeEmotion(trade.emotion || 'Calm');
      setTradeNotes(trade.notes || '');
      setTradeScreenshot(trade.screenshot || '');
      setTradeTags(trade.tags || []);
    } else {
      setEditingTradeId(null);
      setTradeDate('');
      setTradeSymbol('EURUSD');
      setTradeType('Buy');
      setTradeLotSize('1.0');
      setTradeEntryPrice('1.08500');
      setTradeExitPrice('1.09200');
      setTradeSL('');
      setTradeTP('');
      setTradeProfit('700');
      setTradeComm('-7');
      setTradeSwap('0');
      setTradeRisk('1.0');
      setTradeStrategy('Order Block Rejection');
      setTradeEmotion('Calm');
      setTradeNotes('');
      setTradeScreenshot('');
      setTradeTags([]);
    }
    setShowTradeModal(true);
  };

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

  const handleDeleteTrade = async (tradeId: string) => {
    if (!confirm('Are you sure you want to delete this trade? This will reverse its financial impact from your account balance.')) return;
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
    }
  };

  // Simulated MT5 integration call
  const handleTriggerSimulatedSync = async (symbol: string) => {
    if (!selectedAccountId) return;
    setActionLoading(true);
    try {
      const res = await authFetch('/api/mt5/connections/test-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: selectedAccountId, symbol })
      });
      if (res.ok) {
        const data = await res.json();
        alert(`MT5 Synchronization Success! Trade parsed:\n${data.trade.symbol} ${data.trade.type} at ${data.trade.entryPrice} with net P/L of $${data.trade.profit}`);
        fetchTradesAndParams(selectedAccountId);
        // Refresh accounts
        const accsRes = await authFetch('/api/accounts');
        const accsData = await accsRes.json();
        setAccounts(accsData.accounts);
      }
    } catch (e) {
      alert('Sync simulation failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // Pro Upgrade Trigger via mock Razorpay checkout
  const handleUpgradeToPro = async () => {
    try {
      const response = await authFetch('/api/payments/checkout', { method: 'POST' });
      const checkoutData = await response.json();
      
      // Simulate Razorpay popup and direct verification call
      const verifyRes = await authFetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_payment_id: `pay_rzp_${Date.now()}_akshay`,
          status: 'Success'
        })
      });
      const verifyData = await verifyRes.json();
      if (verifyData.success) {
        alert('Payment Verified! Congratulations, you have unlocked FX Journal Pro features.');
        setUser(verifyData.user);
        fetchAccountData();
      }
    } catch (e) {
      alert('Subscription processing error. Please try again.');
    }
  };

  // Custom Settings Handlers
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsName || !settingsEmail) return;
    setActionLoading(true);
    try {
      const res = await authFetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: settingsName, email: settingsEmail })
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
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

  const handleContactSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportSubject || !supportMessage) {
      alert('Please fill out all fields.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await authFetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `[Support Request] ${supportSubject}`,
          description: supportMessage,
          category: 'Other'
        })
      });
      if (res.ok) {
        setSupportSubject('');
        setSupportMessage('');
        setActiveAboutForm('none');
        // Refresh tickets list
        const tickRes = await authFetch('/api/tickets');
        const tickData = await tickRes.json();
        setTickets(tickData.tickets);
        alert('Support request submitted successfully. You can track this under Support Tickets.');
      } else {
        alert('Failed to submit support request.');
      }
    } catch (err) {
      alert('Error submitting support request.');
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
    if (!riskSettings || !selectedAccountId) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/risk-settings/${selectedAccountId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(riskSettings)
      });
      if (res.ok) {
        alert('Risk parameters saved successfully. Drawdown scanners are active.');
      }
    } catch (err) {
      alert('Error saving risk settings');
    } finally {
      setActionLoading(false);
    }
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

  const totalTradesCount = trades.length;
  const wins = trades.filter(t => t.profit > 0);
  const losses = trades.filter(t => t.profit <= 0);
  const winRate = totalTradesCount > 0 ? (wins.length / totalTradesCount) * 100 : 0;
  
  const sumWins = wins.reduce((sum, t) => sum + t.profit, 0);
  const sumLosses = Math.abs(losses.reduce((sum, t) => sum + t.profit, 0));
  const profitFactor = sumLosses > 0 ? parseFloat((sumWins / sumLosses).toFixed(2)) : parseFloat(sumWins.toFixed(2));

  // Risk Reward Ratio calculation
  const averageWin = wins.length > 0 ? sumWins / wins.length : 0;
  const averageLoss = losses.length > 0 ? sumLosses / losses.length : 0;
  const avgRR = averageLoss > 0 ? parseFloat((averageWin / averageLoss).toFixed(2)) : 0;

  // Drawdown math
  const startingBal = activeAccount?.startingBalance || 10000;
  const currentBal = activeAccount?.currentBalance || 10000;
  const netProfit = parseFloat((currentBal - startingBal).toFixed(2));
  
  // High-end stats computation
  const maxDrawdownPercentage = currentBal < startingBal 
    ? parseFloat((((startingBal - currentBal) / startingBal) * 100).toFixed(2)) 
    : 0;

  // Today's cumulative metrics for Guard scanner
  const todayTrades = trades.filter(t => {
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
  trades.forEach(t => {
    symbolMap[t.symbol] = (symbolMap[t.symbol] || 0) + t.profit;
  });
  const symbolChartData = Object.keys(symbolMap).map(sym => ({
    name: sym,
    profit: parseFloat(symbolMap[sym].toFixed(2))
  })).sort((a,b) => b.profit - a.profit);

  // 3. Pie Chart: Sessions
  // Map trades to trading sessions (simulated based on timestamp hour, or mock)
  const sessionData = [
    { name: 'London Session', value: trades.filter((_, idx) => idx % 3 === 0).length, color: '#2563eb' },
    { name: 'New York Session', value: trades.filter((_, idx) => idx % 3 === 1).length, color: '#10b981' },
    { name: 'Asian Session', value: trades.filter((_, idx) => idx % 3 === 2).length, color: '#f59e0b' }
  ].filter(d => d.value > 0);

  // 4. Best & Worst Trades
  const sortedTradesByProfit = [...trades].sort((a, b) => b.profit - a.profit);
  const bestTrade = sortedTradesByProfit.length > 0 ? sortedTradesByProfit[0] : null;
  const worstTrade = sortedTradesByProfit.length > 0 ? sortedTradesByProfit[sortedTradesByProfit.length - 1] : null;

  // 5. Monthly P&L Chart Data
  const monthlyMap: { [key: string]: number } = {};
  trades.forEach(t => {
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
  const handleExportCSV = () => {
    let headers = 'ID,Date,Symbol,Type,Lots,Entry,Exit,Profit,Commission,Swap,Strategy,Emotion,Notes\n';
    const rows = trades.map(t => 
      `"${t.id}","${t.date}","${t.symbol}","${t.type}",${t.lotSize},${t.entryPrice},${t.exitPrice},${t.profit},${t.commission},${t.swap},"${t.strategy || ''}","${t.emotion || ''}","${(t.notes || '').replace(/"/g, '""')}"`
    ).join('\n');
    
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `fx_journal_pro_${activeAccount?.name || 'export'}.csv`);
    a.click();
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

  // Auth Layout (if no user)
  if (!user) {
    return (
      <div className="min-h-screen bg-[#05070d] relative overflow-hidden flex items-center justify-center p-4 font-sans antialiased text-slate-100">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-blue-500/15 blur-3xl"></div>
          <div className="absolute -bottom-16 right-0 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl"></div>
        </div>
        <div className="relative w-full max-w-[560px]">
          <div className="relative bg-[#090d16] backdrop-blur border border-white/10 rounded-[2.3rem] shadow-[0_28px_80px_-32px_rgba(0,0,0,0.75)] p-8 md:p-10 space-y-6 overflow-hidden">
            <div className="absolute left-0 top-0 h-1 w-full rounded-t-[2.3rem] bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500"></div>
            <div className="absolute inset-y-8 left-6 w-px bg-white/5"></div>
            <div className="absolute inset-y-8 right-6 w-px bg-white/5"></div>
            <div className="text-center space-y-3">
              <Logo size={46} className="mx-auto" />
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white font-display">FX Journal Pro</h1>
                <p className="mt-2 text-sm text-slate-400">
                  {isRegistering
                    ? 'Create your account'
                    : isForgotPassword
                    ? 'Reset your password'
                    : 'Sign in to continue'}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <span className="text-[10px] font-bold uppercase tracking-[0.32em] text-cyan-300">Professional trading journal</span>
              <p className="mt-2 text-[11px] leading-5 text-slate-400">
                Simple login, clean layout, and quick access to your dashboard.
              </p>
            </div>

            {isForgotPassword ? (
              resetSuccess ? (
                <div className="space-y-4 text-center">
                  <div className="bg-green-500/10 text-green-300 text-sm rounded-xl p-4 border border-green-500/20">
                    ✅ Password updated successfully! Redirecting to login...
                  </div>
                </div>
              ) : isResetOtpMode ? (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center mb-2 text-xs text-slate-300">
                    A 6-digit password reset code has been sent to <br/><strong className="font-bold">{resetEmail}</strong>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Enter Reset Code</label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={resetOtpCode}
                      onChange={(e) => setResetOtpCode(e.target.value.replace(/\D/g, ''))}
                      className="bg-[#0f1420] border border-white/10 text-lg text-center tracking-[0.5em] rounded-xl p-3 w-full font-mono text-slate-100 focus:ring-cyan-500 focus:border-cyan-500"
                      placeholder="------"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">New Password</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="bg-[#0f1420] border border-white/10 text-xs text-slate-100 rounded-xl p-3 w-full focus:ring-cyan-500 focus:border-cyan-500 placeholder:text-slate-500"
                      placeholder="Minimum 6 characters"
                    />
                  </div>
                  {authError && (
                    <div className="bg-red-500/10 text-red-300 text-xs rounded-xl p-3 border border-red-500/20">{authError}</div>
                  )}
                  <button
                    type="submit"
                    disabled={actionLoading || resetOtpCode.length !== 6 || !newPassword}
                    className="w-full bg-white text-slate-950 hover:bg-slate-100 font-semibold text-xs rounded-xl p-3 transition shadow-sm disabled:opacity-50"
                  >
                    {actionLoading ? 'Resetting...' : 'Reset Password'}
                  </button>
                  <button type="button" onClick={() => { setIsResetOtpMode(false); setAuthError(null); }} className="w-full text-slate-400 hover:text-slate-200 text-xs font-medium block text-center">
                    ← Back
                  </button>
                </form>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <p className="text-xs text-slate-400 text-center">Enter your registered email and we'll send you a password reset code.</p>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="bg-[#0f1420] border border-white/10 text-xs text-slate-100 rounded-xl p-3 w-full focus:ring-cyan-500 focus:border-cyan-500 placeholder:text-slate-500"
                      placeholder="name@email.com"
                    />
                  </div>
                  {authError && (
                    <div className="bg-red-500/10 text-red-300 text-xs rounded-xl p-3 border border-red-500/20">{authError}</div>
                  )}
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="w-full bg-white text-slate-950 hover:bg-slate-100 font-semibold text-xs rounded-xl p-3 transition shadow-sm disabled:opacity-50"
                  >
                    {actionLoading ? 'Sending...' : 'Send Reset Code'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsForgotPassword(false); setAuthError(null); }}
                    className="w-full text-slate-400 hover:text-slate-200 text-xs font-medium block text-center"
                  >
                    Back to Sign In
                  </button>
                </form>
              )
          ) : isOtpMode ? (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center mb-4 text-xs text-slate-300">
                A 6-digit confirmation code has been sent to <br/><strong className="font-bold">{authEmail}</strong>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Enter 6-Digit Code</label>
                <input 
                  type="text" 
                  required 
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="bg-[#0f1420] border border-white/10 text-lg text-center tracking-[0.5em] rounded-xl p-3 w-full font-mono text-slate-100 focus:ring-cyan-500 focus:border-cyan-500"
                  placeholder="------"
                />
              </div>
              <button 
                type="submit" 
                disabled={actionLoading || otpCode.length !== 6}
                className="w-full bg-white text-slate-950 hover:bg-slate-100 font-semibold text-xs rounded-xl p-3 transition flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-sm"
              >
                {actionLoading ? 'Verifying...' : 'Verify Code & Login'}
                <CheckCircle2 className="h-3.5 w-3.5" />
              </button>

              {authError && (
                <div className="bg-red-500/10 text-red-300 text-xs rounded-xl p-3 border border-red-500/20 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-xs pt-2">
                <button 
                  type="button" 
                  onClick={handleResendOtp}
                  disabled={actionLoading}
                  className="text-cyan-400 hover:text-cyan-300 font-medium"
                >
                  Resend 6-Digit Code
                </button>
                <button 
                  type="button" 
                  onClick={() => { setIsOtpMode(false); setOtpCode(''); setAuthError(null); }}
                  className="text-slate-400 hover:text-slate-200 font-medium"
                >
                  Change Email
                </button>
              </div>
            </form>
          ) : isRegistering ? (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Full Name</label>
                <input 
                  type="text" 
                  required 
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  className="bg-[#0f1420] border border-white/10 text-xs text-slate-100 rounded-xl p-3 w-full focus:ring-cyan-500 focus:border-cyan-500 placeholder:text-slate-500"
                  placeholder="Your Name"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Secure Email</label>
                <input 
                  type="email" 
                  required 
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="bg-[#0f1420] border border-white/10 text-xs text-slate-100 rounded-xl p-3 w-full focus:ring-cyan-500 focus:border-cyan-500 placeholder:text-slate-500"
                  placeholder="name@email.com"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Secure Password</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="bg-[#0f1420] border border-white/10 text-xs text-slate-100 rounded-xl p-3 pr-10 w-full focus:ring-cyan-500 focus:border-cyan-500 placeholder:text-slate-500"
                    placeholder="Enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <button 
                type="submit" 
                disabled={actionLoading}
                className="w-full bg-white text-slate-950 hover:bg-slate-100 font-semibold text-xs rounded-xl p-3 transition flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-sm"
              >
                {actionLoading ? 'Creating Workspace...' : 'Register Secure Account'}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>

              {authError && (
                <div className="bg-red-500/10 text-red-300 text-xs rounded-xl p-3 border border-red-500/20 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-[11px] text-slate-500 mt-2">
                <span>Already have an account?</span>
                <button type="button" onClick={() => { setIsRegistering(false); setAuthError(null); }} className="text-cyan-300 hover:underline font-semibold">Sign In</button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Secure Email Address</label>
                <input 
                  type="email" 
                  required 
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="bg-[#0f1420] border border-white/10 text-xs text-slate-100 rounded-xl p-3 w-full focus:ring-cyan-500 focus:border-cyan-500 placeholder:text-slate-500"
                  placeholder="name@email.com"
                />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">Password</label>
                  <button type="button" onClick={() => setIsForgotPassword(true)} className="text-cyan-300 hover:underline text-[11px] font-medium">Forgot Password?</button>
                </div>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="bg-[#0f1420] border border-white/10 text-xs text-slate-100 rounded-xl p-3 pr-10 w-full focus:ring-cyan-500 focus:border-cyan-500 placeholder:text-slate-500"
                    placeholder="Enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              
              <button 
                type="submit" 
                disabled={actionLoading}
                className="w-full bg-white text-slate-950 hover:bg-slate-100 font-semibold text-xs rounded-xl p-3 transition flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-sm"
              >
                {actionLoading ? 'Verifying Authorization...' : 'Authenticate & Sign In'}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>

              {authError && (
                <div className="bg-red-500/10 text-red-300 text-xs rounded-xl p-3 border border-red-500/20 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}

              {/* Google Sign In */}
              <div className="border-t border-white/10 pt-4 flex flex-col gap-2">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={async () => {
                    setActionLoading(true);
                    setAuthError(null);
                    try {
                      const { error } = await supabase.auth.signInWithOAuth({
                        provider: 'google',
                        options: {
                          redirectTo: window.location.origin,
                        },
                      });
                      if (error) {
                        setAuthError(error.message);
                        setActionLoading(false);
                      }
                    } catch (err: any) {
                      console.error('[AxyFx] Google Sign-In error:', err);
                      setAuthError(`Google Sign-In error: ${err?.message || err}`);
                      setActionLoading(false);
                    }
                  }}
                  className="w-full border border-white/10 bg-[#0f1420] hover:bg-[#111827] text-slate-100 rounded-xl p-3 text-xs font-semibold flex items-center justify-center gap-2 transition shadow-sm disabled:opacity-50"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.27-1.38 3.72-5.5 3.72-3.31 0-6-2.74-6-6.12s2.69-6.12 6-6.12c1.88 0 3.14.8 3.86 1.48l2.63-2.54C16.92 2.96 14.74 2 12 2 6.48 2 2 6.48 2 12s4.48 10 10 10c5.74 0 9.55-4.03 9.55-9.71 0-.65-.07-1.15-.16-1.65H12z" />
                    <path fill="#34A853" d="M3.67 7.72 6.76 10a6.1 6.1 0 0 1 5.24-3.04c1.88 0 3.14.8 3.86 1.48l2.63-2.54C16.92 2.96 14.74 2 12 2 8.1 2 4.72 4.21 3.67 7.72z" opacity="0.15" />
                    <path fill="#FBBC05" d="M12 22c2.68 0 4.94-.88 6.59-2.39l-3.05-2.5c-.84.57-1.94.97-3.54.97-4.09 0-5.24-2.43-5.5-3.72H3.45C4.24 19.12 7.65 22 12 22z" opacity="0.15" />
                    <path fill="#4285F4" d="M21.55 12.29c0-.65-.07-1.15-.16-1.65H12v3.9h5.5c-.26 1.37-1.1 2.58-2.41 3.46l3.05 2.5C19.96 18.86 21.55 15.92 21.55 12.29z" opacity="0.15" />
                  </svg>
                  Sign In with Google Account
                </button>
              </div>

              <div className="flex justify-between items-center text-[11px] text-slate-400 mt-2">
                <span>New to FX Journal Pro?</span>
                <button type="button" onClick={() => { setIsRegistering(true); setAuthError(null); }} className="text-cyan-300 hover:underline font-semibold">Create free account</button>
              </div>
            </form>
          )}
          </div>
        </div>
      </div>
    );
  }

  // Onboarding Wizard (if registration completes but not onboarding completed)
  if (!user.onboardingCompleted) {
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
                      <button
                        key={exp}
                        type="button"
                        onClick={() => setObExperience(exp as any)}
                        className={`p-3 border rounded-lg text-xs font-semibold text-center transition ${
                          obExperience === exp 
                            ? 'border-blue-600 bg-blue-50/50 text-blue-700' 
                            : 'border-slate-200 hover:border-slate-300 text-slate-600'
                        }`}
                      >
                        {exp}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">Primary Trading Style</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['Scalping', 'Day Trading', 'Swing Trading'].map((style) => (
                      <button
                        key={style}
                        type="button"
                        onClick={() => setObStyle(style as any)}
                        className={`p-3 border rounded-lg text-xs font-semibold text-center transition ${
                          obStyle === style 
                            ? 'border-blue-600 bg-blue-50/50 text-blue-700' 
                            : 'border-slate-200 hover:border-slate-300 text-slate-600'
                        }`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOnboardingStep(2)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg p-3 transition flex items-center justify-center gap-1.5"
              >
                Continue Setup
                <ChevronRight className="h-4 w-4" />
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
                      <button
                        key={market}
                        type="button"
                        onClick={() => {
                          if (active) {
                            setObMarkets(obMarkets.filter(m => m !== market));
                          } else {
                            setObMarkets([...obMarkets, market]);
                          }
                        }}
                        className={`p-4 border rounded-lg text-xs font-semibold text-left transition flex items-center justify-between ${
                          active 
                            ? 'border-blue-600 bg-blue-50/50 text-blue-700' 
                            : 'border-slate-200 hover:border-slate-300 text-slate-600'
                        }`}
                      >
                        {market}
                        <CheckCircle2 className={`h-4 w-4 ${active ? 'text-blue-600' : 'text-slate-300'}`} />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setOnboardingStep(1)}
                  className="w-1/3 border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs rounded-lg p-3 transition"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={submitOnboarding}
                  className="w-2/3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg p-3 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {actionLoading ? 'Initializing Platform...' : 'Complete & Launch'}
                  <Check className="h-4 w-4" />
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
    <div className="min-h-screen md:h-screen md:overflow-hidden bg-[#FBFBFA]/40 font-sans antialiased text-slate-800 flex flex-col md:flex-row">
      
      {/* Sidebar Navigation */}
      <aside className={`bg-[#FBFBFA] border-r border-slate-200/80 flex-shrink-0 flex flex-col justify-between z-20 transition-all duration-300 md:h-full md:overflow-y-auto ${
        mobileMenuOpen 
          ? 'fixed inset-y-0 left-0 translate-x-0 shadow-2xl bg-white w-64 p-5' 
          : (sidebarCollapsed ? 'hidden md:flex md:w-[72px] p-3' : 'hidden md:flex md:w-64 p-5')
      }`}>
        <div className="space-y-6">
          {/* Brand Logo */}
          <div className={`flex ${sidebarCollapsed ? 'flex-col items-center gap-3' : 'items-center justify-between'} pb-2 border-b border-slate-100`}>
            <div className={`flex items-center gap-2.5 ${sidebarCollapsed ? 'justify-center' : ''}`}>
              <Logo size={24} />
              {!sidebarCollapsed && (
                <div>
                  <h1 className="text-sm font-bold tracking-tight text-slate-900 font-display">FX Journal Pro</h1>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              {/* Mobile close toggle */}
              <button onClick={() => setMobileMenuOpen(false)} className="md:hidden text-slate-400 hover:text-slate-700 text-xs p-1">
                ✕
              </button>
              {/* Desktop collapse toggle (3 lines / expand menu) */}
              <button 
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)} 
                className="hidden md:flex text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 p-1.5 rounded transition"
                title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              >
                <Menu className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Active Workspace Switcher */}
          <div className={`bg-[#f4f4f3] border border-slate-200/40 rounded-lg ${sidebarCollapsed ? 'p-1.5 text-center flex flex-col items-center gap-1' : 'p-2.5'}`} title="Active Portfolio">
            {sidebarCollapsed ? (
              <button
                onClick={() => { setShowAccountModal(true); setAccountCreationMethod('select'); }}
                className="text-slate-600 hover:text-slate-900 bg-white/80 hover:bg-white p-2 rounded-md transition duration-150 shadow-2xs"
                title="Manage Portfolio Accounts"
              >
                💼
              </button>
            ) : (
              <>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Active Portfolio</span>
                  <button
                    onClick={() => { setShowAccountModal(true); setAccountCreationMethod('select'); }}
                    title="Connect New Portfolio Account"
                    className="text-slate-400 hover:text-slate-900 hover:bg-slate-200/50 p-1 rounded transition duration-150"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                <select
                  value={selectedAccountId}
                  onChange={handleAccountChange}
                  className="w-full bg-transparent border-none text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer pr-2 select-none"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      💼 {acc.name} ({acc.platform})
                    </option>
                  ))}
                  {accounts.length === 0 && <option value="">No Accounts Registered</option>}
                </select>
              </>
            )}
          </div>

          {/* Primary Sidebar Links */}
          <nav className={`space-y-1.5 ${sidebarCollapsed ? 'flex flex-col items-center' : ''}`}>
            <button
              onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
              title="Dashboard"
              className={`text-xs font-semibold transition flex items-center rounded-lg ${
                sidebarCollapsed ? 'p-2.5 justify-center' : 'w-full text-left py-1.5 px-2.5 gap-2.5'
              } ${
                activeTab === 'dashboard' ? 'bg-[#efefee] text-slate-900' : 'text-slate-600 hover:bg-[#efefee]/60 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="h-4 w-4 text-slate-500" />
              {!sidebarCollapsed && 'Dashboard'}
            </button>

            <button
              onClick={() => { setActiveTab('journal'); setMobileMenuOpen(false); }}
              title="Trading Journal"
              className={`text-xs font-semibold transition flex items-center rounded-lg ${
                sidebarCollapsed ? 'p-2.5 justify-center relative' : 'w-full text-left py-1.5 px-2.5 justify-between'
              } ${
                activeTab === 'journal' ? 'bg-[#efefee] text-slate-900' : 'text-slate-600 hover:bg-[#efefee]/60 hover:text-slate-900'
              }`}
            >
              <span className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-2.5'}`}>
                <BookOpen className="h-4 w-4 text-slate-500" />
                {!sidebarCollapsed && 'Trading Journal'}
              </span>
              {trades.length > 0 && (
                sidebarCollapsed ? (
                  <span className="absolute -top-1 -right-1 text-[8px] bg-slate-200 text-slate-700 px-1 rounded-full font-mono font-bold">
                    {trades.length}
                  </span>
                ) : (
                  <span className="text-[10px] bg-slate-200/80 text-slate-600 px-1.5 py-0.5 rounded font-mono font-medium">
                    {trades.length}
                  </span>
                )
              )}
            </button>

            <button
              onClick={() => { setActiveTab('accounts'); setMobileMenuOpen(false); }}
              title="Portfolio Accounts"
              className={`text-xs font-semibold transition flex items-center rounded-lg ${
                sidebarCollapsed ? 'p-2.5 justify-center relative' : 'w-full text-left py-1.5 px-2.5 justify-between'
              } ${
                activeTab === 'accounts' ? 'bg-[#efefee] text-slate-900' : 'text-slate-600 hover:bg-[#efefee]/60 hover:text-slate-900'
              }`}
            >
              <span className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-2.5'}`}>
                <Layers className="h-4 w-4 text-slate-500" />
                {!sidebarCollapsed && 'Accounts'}
              </span>
              {accounts.length > 0 && (
                sidebarCollapsed ? (
                  <span className="absolute -top-1 -right-1 text-[8px] bg-slate-200 text-slate-700 px-1 rounded-full font-mono font-bold">
                    {accounts.length}
                  </span>
                ) : (
                  <span className="text-[10px] bg-slate-200/80 text-slate-600 px-1.5 py-0.5 rounded font-mono font-medium">
                    {accounts.length}
                  </span>
                )
              )}
            </button>

            <button
              onClick={() => { setActiveTab('analytics'); setMobileMenuOpen(false); }}
              title="Analytics"
              className={`text-xs font-semibold transition flex items-center rounded-lg ${
                sidebarCollapsed ? 'p-2.5 justify-center' : 'w-full text-left py-1.5 px-2.5 gap-2.5'
              } ${
                activeTab === 'analytics' ? 'bg-[#efefee] text-slate-900' : 'text-slate-600 hover:bg-[#efefee]/60 hover:text-slate-900'
              }`}
            >
              <TrendingUp className="h-4 w-4 text-slate-500" />
              {!sidebarCollapsed && 'Analytics'}
            </button>

            <button
              onClick={() => { setActiveTab('calendar'); setMobileMenuOpen(false); }}
              title="Calendar"
              className={`text-xs font-semibold transition flex items-center rounded-lg ${
                sidebarCollapsed ? 'p-2.5 justify-center' : 'w-full text-left py-1.5 px-2.5 gap-2.5'
              } ${
                activeTab === 'calendar' ? 'bg-[#efefee] text-slate-900' : 'text-slate-600 hover:bg-[#efefee]/60 hover:text-slate-900'
              }`}
            >
              <Calendar className="h-4 w-4 text-slate-500" />
              {!sidebarCollapsed && 'Calendar'}
            </button>

            <button
              onClick={() => { setActiveTab('mt5'); setMobileMenuOpen(false); }}
              title="MT5 Automation"
              className={`text-xs font-semibold transition flex items-center rounded-lg ${
                sidebarCollapsed ? 'p-2.5 justify-center' : 'w-full text-left py-1.5 px-2.5 gap-2.5'
              } ${
                activeTab === 'mt5' ? 'bg-[#efefee] text-slate-900' : 'text-slate-600 hover:bg-[#efefee]/60 hover:text-slate-900'
              }`}
            >
              <Terminal className="h-4 w-4 text-slate-500" />
              {!sidebarCollapsed && 'MT5 Automation'}
            </button>

            <button
              onClick={() => { setActiveTab('insights'); setMobileMenuOpen(false); }}
              title="AI Mentor"
              className={`text-xs font-semibold transition flex items-center rounded-lg ${
                sidebarCollapsed ? 'p-2.5 justify-center relative' : 'w-full text-left py-1.5 px-2.5 justify-between'
              } ${
                activeTab === 'insights' ? 'bg-[#efefee] text-[#4f46e5]' : 'text-slate-600 hover:bg-[#efefee]/60 hover:text-[#4f46e5]'
              }`}
            >
              <span className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-2.5'}`}>
                <Brain className="h-4 w-4 text-indigo-500" />
                {!sidebarCollapsed && 'AI Mentor'}
              </span>
              {!sidebarCollapsed && (
                <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider text-[8px]">
                  AI
                </span>
              )}
              {sidebarCollapsed && (
                <span className="absolute top-0 right-0 h-1.5 w-1.5 bg-indigo-600 rounded-full animate-ping" />
              )}
            </button>

            <button
              onClick={() => { setActiveTab('settings'); setMobileMenuOpen(false); }}
              title="Settings"
              className={`text-xs font-semibold transition flex items-center rounded-lg ${
                sidebarCollapsed ? 'p-2.5 justify-center' : 'w-full text-left py-1.5 px-2.5 gap-2.5'
              } ${
                activeTab === 'settings' ? 'bg-[#efefee] text-slate-900' : 'text-slate-600 hover:bg-[#efefee]/60 hover:text-slate-900'
              }`}
            >
              <Shield className="h-4 w-4 text-slate-500" />
              {!sidebarCollapsed && 'Settings'}
            </button>
          </nav>
        </div>

        {/* User profile strip and signout */}
        <div className="border-t border-slate-200/60 pt-4 mt-auto">
          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center p-0' : 'gap-2.5 p-1'}`}>
            <div className="h-8 w-8 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-xs uppercase" title={`${user.name} (${user.email})`}>
              {user.name.substring(0,2)}
            </div>
            {!sidebarCollapsed && (
              <div className="overflow-hidden flex-1">
                <span className="font-bold text-xs text-slate-800 block truncate">{user.name}</span>
                <span className="text-[10px] text-slate-400 block truncate">{user.email}</span>
              </div>
            )}
          </div>
          {!sidebarCollapsed && (
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
              <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded ${
                user.isPro ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'
              }`}>
                {user.isPro ? <Star className="h-2 w-2 fill-blue-700" /> : null}
                {user.isPro ? 'Pro Member' : 'Free Account'}
              </span>
              {!user.isPro && (
                <button 
                  onClick={handleUpgradeToPro} 
                  className="text-[9px] text-blue-600 hover:text-blue-700 font-bold underline"
                >
                  Upgrade
                </button>
              )}
            </div>
          )}
          <button
            onClick={handleLogout}
            title="Sign Out"
            className={`transition flex items-center text-slate-500 hover:text-rose-600 ${
              sidebarCollapsed ? 'justify-center p-2.5 mt-2 bg-slate-50 hover:bg-rose-50 rounded-lg mx-auto' : 'w-full text-left mt-3 py-1.5 px-2 hover:bg-rose-50 rounded-lg text-xs font-semibold gap-2'
            }`}
          >
            <LogOut className="h-4 w-4" />
            {!sidebarCollapsed && 'Sign Out'}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto md:h-full bg-[#FBFBFA] p-6 md:p-12 space-y-8">
        
        {/* Dynamic Plain Title bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileMenuOpen(true)} className="md:hidden text-slate-600 p-1 hover:bg-slate-50 rounded">
              ☰
            </button>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-display">
                {activeTab === 'dashboard' ? 'Dashboard' :
                 activeTab === 'journal' ? 'Trading Journal' :
                 activeTab === 'accounts' ? 'Portfolio Accounts' :
                 activeTab === 'analytics' ? 'Performance Analytics' :
                 activeTab === 'calendar' ? 'Trading Calendar' :
                 activeTab === 'settings' ? 'Settings' : 'Admin Panel'}
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                {activeTab === 'dashboard' ? 'Welcome back! Here\'s an overview of your trading performance.' :
                 activeTab === 'journal' ? 'Inline workspace database to log, filter, and audit trading setups.' :
                 activeTab === 'accounts' ? 'Manage your MetaTrader or custom brokerage accounts on-the-fly.' :
                 activeTab === 'analytics' ? 'Explore your strategic edge, session concentrations, and profit distribution.' :
                 activeTab === 'calendar' ? 'Visualize daily profit allocations and execution frequencies.' :
                 activeTab === 'settings' ? 'Configure portfolio guard, MT5 automation link, and co-pilot preferences.' : 'Administrative system configs.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 border border-slate-200/80 rounded-lg hover:bg-slate-50 transition text-slate-500 dark:border-white/10 dark:hover:bg-slate-900/40 flex items-center justify-center shadow-xs"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-indigo-600" />
              )}
            </button>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded inline-flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Risk Guard Active
            </span>
            <button
              onClick={() => handleOpenTradeModal()}
              disabled={accounts.length === 0}
              className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg py-2 px-4 transition flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Add New Trade
            </button>
          </div>
        </div>

        {/* Global Drawdown Risk alert strip if active */}
        {activeAccount && maxDrawdownPercentage > 0 && (
          <div className="bg-amber-50 border border-amber-200 text-amber-950 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-xs font-bold block">Portfolio Drawdown Active</strong>
              <p className="text-xs text-amber-800/90 leading-relaxed mt-0.5">
                Your portfolio is currently down <span className="font-extrabold">{maxDrawdownPercentage}%</span> from its starting balance. Drawdown guard is monitoring executions.
              </p>
            </div>
          </div>
        )}

        {/* Dynamic Route views */}

        {/* 1. DASHBOARD VIEW */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Quick Metrics Cards */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-xs hover:shadow-sm transition duration-200 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Balance</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl md:text-2xl font-extrabold text-slate-900 font-display">
                    {activeAccount ? formatValue(activeAccount.currentBalance) : '$0.00'}
                  </span>
                  <span className={`text-[11px] font-bold ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {netProfit >= 0 ? '▲' : '▼'} {startingBal > 0 ? ((netProfit / startingBal) * 100).toFixed(1) : '0.0'}%
                  </span>
                </div>
              </div>

              <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-xs hover:shadow-sm transition duration-200 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Net Profit</span>
                <div className="flex items-baseline justify-between">
                  <span className={`text-xl md:text-2xl font-extrabold font-display ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {netProfit >= 0 ? '+' : ''}{formatValue(netProfit)}
                  </span>
                  <span className="text-[10px] text-slate-400 block font-semibold">cumulative</span>
                </div>
              </div>

              <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-xs hover:shadow-sm transition duration-200 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Win Rate</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl md:text-2xl font-extrabold text-slate-900 font-display">
                    {winRate.toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold block">
                    {wins.length} wins / {totalTradesCount}
                  </span>
                </div>
              </div>

              <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-xs hover:shadow-sm transition duration-200 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Trades</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl md:text-2xl font-extrabold text-slate-900 font-display">
                    {totalTradesCount}
                  </span>
                  <span className="text-[10px] text-slate-400 block font-semibold">positions</span>
                </div>
              </div>
            </section>

            {/* Main Visualizations Grid */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Equity Curve Area Chart */}
              <div className="lg:col-span-2 bg-white border border-slate-100 rounded-xl p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between mb-4">
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
                    <div className="h-full flex flex-col items-center justify-center text-xs text-slate-400 space-y-2">
                      <span>No trades logged yet. Start manually logging trades inside the Journal!</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Risk Auditor status inside Dashboard */}
              <div className="lg:col-span-1 bg-white border border-slate-100 rounded-xl p-6 shadow-xs flex flex-col justify-between">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Portfolio Guard Rules</h3>
                    <p className="text-[10px] text-slate-400">Drawdown status and protection systems</p>
                  </div>
                  
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
                </div>

                <button onClick={() => { setActiveTab('settings'); setSettingsTab('risk'); }} className="w-full text-center py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 rounded-lg transition mt-4">
                  Configure Guard Limits
                </button>
              </div>
            </section>

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
                    onClick={handleExportCSV}
                    className="border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg px-3 py-2 transition flex items-center gap-1 bg-white"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export CSV
                  </button>
                </div>
              </div>

              {/* Big log Table with Scrollable Box container */}
              <div className="max-h-[500px] overflow-y-auto overflow-x-auto border border-slate-100 rounded-xl relative shadow-inner">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-xs z-10 border-b border-slate-100">
                    <tr className="text-slate-500 uppercase font-bold text-[10px]">
                      <th className="py-3 pl-4">Execution Date</th>
                      <th className="py-3">Symbol</th>
                      <th className="py-3">Type</th>
                      <th className="py-3">Lot Size</th>
                      <th className="py-3">Entry & Exit Price</th>
                      <th className="py-3">Emotion State</th>
                      <th className="py-3">Strategy Framework</th>
                      <th className="py-3">Net Profit</th>
                      <th className="py-3 text-right pr-4">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTrades.map((t) => (
                      <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition">
                        <td className="py-3 pl-4 text-slate-500 whitespace-nowrap">
                          {new Date(t.date).toLocaleDateString()} {new Date(t.date).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                          {t.isMt5Sync && (
                            <span className="ml-1.5 inline-flex items-center gap-0.5 bg-blue-50 text-blue-600 text-[9px] font-extrabold px-1 rounded uppercase tracking-wider">
                              <Radio className="h-2 w-2 animate-pulse" /> Sync
                            </span>
                          )}
                        </td>
                        <td className="py-3 font-bold text-slate-900">{t.symbol}</td>
                        <td className="py-3">
                          <span className={`font-semibold px-2 py-0.5 rounded ${
                            t.type === 'Buy' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                            {t.type}
                          </span>
                        </td>
                        <td className="py-3 font-mono font-medium text-slate-600">{t.lotSize}</td>
                        <td className="py-3 font-mono text-slate-500 whitespace-nowrap">
                          {t.entryPrice} → {t.exitPrice}
                        </td>
                        <td className="py-3">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            t.emotion === 'Calm' ? 'bg-slate-100 text-slate-700' :
                            t.emotion === 'Anxious' || t.emotion === 'Revenge' ? 'bg-rose-50 text-rose-700' :
                            t.emotion === 'Excited' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {t.emotion || 'Calm'}
                          </span>
                        </td>
                        <td className="py-3 text-slate-600">{t.strategy || 'Unspecified'}</td>
                        <td className="py-3">
                          <span className={`font-extrabold ${t.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {t.profit >= 0 ? '+' : ''}{formatValue(t.profit)}
                          </span>
                        </td>
                        <td className="py-3 text-right pr-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenTradeModal(t)}
                              className="p-1 hover:bg-slate-100 rounded text-slate-500"
                              title="Edit position details"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteTrade(t.id)}
                              className="p-1 hover:bg-rose-50 rounded text-rose-600"
                              title="Delete position"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {filteredTrades.length === 0 && (
                      <tr>
                        <td colSpan={9} className="text-center py-10 text-slate-400">
                          No matching recorded trades. Clear filters or add your first position.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 3. CALENDAR VIEW */}
        {activeTab === 'calendar' && (
          <TradingCalendar trades={trades} currency={activeAccount?.currency || 'USD'} />
        )}

        {/* 4. PORTFOLIO ACCOUNTS VIEW */}
        {activeTab === 'accounts' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Account cards */}
              {accounts.map((acc) => {
                const isActive = acc.id === selectedAccountId;
                const accountProfit = acc.currentBalance - acc.startingBalance;
                return (
                  <div 
                    key={acc.id} 
                    className={`bg-white border rounded-xl p-6 relative transition duration-200 flex flex-col justify-between space-y-4 ${
                      isActive ? 'border-slate-900 ring-1 ring-slate-900 shadow-xs' : 'border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-extrabold text-slate-900 text-sm">{acc.name}</h4>
                          <span className="text-[10px] text-slate-400 block font-semibold">{acc.broker} • {acc.platform}</span>
                        </div>
                        <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                          acc.accountType === 'Live' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {acc.accountType}
                        </span>
                      </div>

                      <div className="pt-3 border-t border-slate-50 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Starting Capital</span>
                          <span className="font-mono text-slate-700 font-bold">{new Intl.NumberFormat('en-US', { style: 'currency', currency: acc.currency }).format(acc.startingBalance)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Current Balance</span>
                          <span className="font-mono text-slate-900 font-extrabold">{new Intl.NumberFormat('en-US', { style: 'currency', currency: acc.currency }).format(acc.currentBalance)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">P/L Return</span>
                          <span className={`font-mono font-bold ${accountProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {accountProfit >= 0 ? '+' : ''}{new Intl.NumberFormat('en-US', { style: 'currency', currency: acc.currency }).format(accountProfit)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4 pt-3 border-t border-slate-50">
                      {isActive ? (
                        <span className="flex-grow text-center py-1.5 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg select-none inline-flex items-center justify-center gap-1">
                          <Check className="h-3.5 w-3.5 text-emerald-500" /> Active Portfolio
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedAccountId(acc.id);
                            localStorage.setItem('selected_account_id', acc.id);
                            fetchTradesAndParams(acc.id);
                          }}
                          className="flex-grow text-center py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition"
                        >
                          Activate Portfolio
                        </button>
                      )}
                       <button
                        onClick={() => {
                          setEditingAccount(acc);
                          setEditAccName(acc.name);
                          setEditAccStartingBalance(String(acc.startingBalance));
                          setEditAccCurrency(acc.currency || 'USD');
                          setShowEditAccountModal(true);
                        }}
                        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 rounded-lg transition flex items-center justify-center"
                        title="Edit Account Name, Currency and Starting Capital"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Dotted Create Card */}
              <button
                onClick={() => { setShowAccountModal(true); setAccountCreationMethod('select'); }}
                className="border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-slate-600 transition h-56 text-xs font-bold bg-white"
              >
                <Plus className="h-6 w-6 text-slate-400" />
                Connect New Portfolio Account
              </button>
            </div>
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
                  </div>
                </div>

                <div className="bg-slate-50 rounded-lg p-3 text-[11px] text-slate-500 leading-relaxed border border-slate-100">
                  <span className="font-bold text-slate-800 block mb-0.5">Analyst Tip</span>
                  Your Profit Factor is <span className="font-semibold">{profitFactor}</span>. Ratios above 1.5 indicate institutional system viability.
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
          </div>
        )}

        {/* 6. CONSOLIDATED SETTINGS VIEW */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            
            {/* Settings Inner Tabs Navigation */}
            <aside className="lg:col-span-1 space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block px-2.5 mb-2">Configure Journal</span>
              
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
            </aside>

            {/* Settings Right Hand Content Panel */}
            <div className="lg:col-span-3 space-y-6">
              
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
                <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-xs space-y-6">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">Subscription Plan</h3>
                    <p className="text-xs text-slate-400">Control active tiers, review purchase certificates, or modify memberships.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-50 pt-6">
                    {/* Active Plan Widget */}
                    <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-5 flex flex-col justify-between">
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest block">Current Plan</span>
                        <h4 className="text-lg font-black text-slate-900">
                          {user.isPro ? 'FX Journal Pro' : 'Free Sandbox Trial'}
                        </h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {user.isPro 
                            ? 'Lifetime access is active. Thank you for using FX Journal Pro!' 
                            : 'Currently enjoying free basic journaling features. Unlock unlimited portfolios and AI tools.'}
                        </p>
                      </div>

                      <div className="pt-6 flex flex-col gap-2">
                        {!user.isPro ? (
                          <button
                            onClick={handleUpgradeToPro}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 px-3 rounded-lg transition text-center shadow-xs"
                          >
                            Upgrade Plan (Lifetime)
                          </button>
                        ) : (
                          <div className="space-y-3">
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg w-full justify-center">
                              <Check className="h-4 w-4" /> Professional Membership Active
                            </span>
                            <button
                              onClick={handleCancelSubscription}
                              className="w-full text-slate-400 hover:text-red-500 font-bold text-[11px] py-1 transition text-center underline"
                            >
                              Cancel Subscription
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Billing History */}
                    <div className="space-y-3">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Billing History</span>
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {user.isPro ? (
                          <div className="p-3 border border-slate-100 rounded-lg flex justify-between items-center bg-slate-50/50">
                            <div className="text-xs">
                              <strong className="text-slate-800 block">FX Journal Pro Lifetime</strong>
                              <span className="text-[10px] text-slate-400 block mt-0.5">Payment ID: #FX-8102</span>
                            </div>
                            <div className="text-right text-xs">
                              <span className="font-bold text-slate-800 block">$499.00</span>
                              <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">Paid</span>
                            </div>
                          </div>
                        ) : null}

                        <div className="p-3 border border-slate-100 rounded-lg flex justify-between items-center bg-slate-50/50">
                          <div className="text-xs">
                            <strong className="text-slate-800 block">Free Trial Onboarding</strong>
                            <span className="text-[10px] text-slate-400 block mt-0.5">Registration</span>
                          </div>
                          <div className="text-right text-xs">
                            <span className="font-bold text-slate-800 block">$0.00</span>
                            <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">Activated</span>
                          </div>
                        </div>
                      </div>
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
                        <p className="text-xs text-slate-400">Application diagnostics and legal information.</p>
                      </div>
                      <span className="bg-slate-100 text-slate-800 font-mono text-xs font-bold px-3 py-1 rounded-full">
                        App Version 2.5.0
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      {/* Terms scroll widget */}
                      <div className="space-y-1.5">
                        <strong className="text-slate-700 block">Terms & Conditions</strong>
                        <div className="h-28 overflow-y-auto p-3 bg-slate-50 rounded-lg text-[10px] text-slate-400 leading-relaxed border border-slate-100">
                          Welcome to FX Journal Pro. By accessing or using our simulated trading journaling workspace, you agree to comply with our Terms of Use. We provide diagnostic evaluation tools and integration utilities. Simulated trading performance is not indicative of real-world returns. Users maintain full responsibility for actual broker deposits and trade executions.
                        </div>
                      </div>

                      {/* Privacy scroll widget */}
                      <div className="space-y-1.5">
                        <strong className="text-slate-700 block">Privacy Policy</strong>
                        <div className="h-28 overflow-y-auto p-3 bg-slate-50 rounded-lg text-[10px] text-slate-400 leading-relaxed border border-slate-100">
                          Your trading logs, notes, cognitive mood profiles, and portfolio balances are strictly confidential. We only utilize local state, authenticated database schemas, and secured server protocols to persist records. Third-party integrations (e.g. Gemini AI prompts) proxy parameters securely and anonymously. We never sell user metrics or transaction history data.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Forms Grid for Contact Support, Report Bug, Feature Request */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* Contact Support */}
                    <div 
                      className={`bg-white border rounded-xl p-5 shadow-xs transition-all duration-300 flex flex-col justify-between min-h-[160px] ${
                        activeAboutForm === 'support' 
                          ? 'border-slate-900 ring-1 ring-slate-900 md:col-span-1' 
                          : 'border-slate-100 hover:border-slate-300 cursor-pointer'
                      }`}
                      onClick={() => {
                        if (activeAboutForm !== 'support') {
                          setActiveAboutForm('support');
                        }
                      }}
                    >
                      <div className="space-y-3 w-full">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <strong className="text-sm font-black text-slate-900 block">Contact Support</strong>
                            <p className="text-[11px] text-slate-400">Send an inquiry directly to our engineering support queue.</p>
                          </div>
                          <div className={`p-2 rounded-lg shrink-0 ${activeAboutForm === 'support' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-500'}`}>
                            <HelpCircle className="h-4 w-4" />
                          </div>
                        </div>

                        {activeAboutForm === 'support' ? (
                          <form onSubmit={handleContactSupport} className="space-y-3 pt-2 text-xs border-t border-slate-100 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                            <div>
                              <label className="font-semibold text-slate-600 block mb-0.5">Subject</label>
                              <input 
                                type="text" 
                                required
                                value={supportSubject}
                                onChange={(e) => setSupportSubject(e.target.value)}
                                placeholder="e.g. Billing Sync"
                                className="bg-slate-50 border border-slate-200 text-xs rounded-lg p-2 w-full font-semibold focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                              />
                            </div>
                            <div>
                              <label className="font-semibold text-slate-600 block mb-0.5">Message</label>
                              <textarea 
                                required
                                rows={3}
                                value={supportMessage}
                                onChange={(e) => setSupportMessage(e.target.value)}
                                placeholder="Detail your request..."
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
                                {actionLoading ? 'Sending...' : 'Send Inquiry'}
                              </button>
                            </div>
                          </form>
                        ) : (
                          <div className="pt-2">
                            <button
                              type="button"
                              className="text-xs font-bold text-slate-900 hover:underline flex items-center gap-1 mt-1"
                            >
                              Write Message <ChevronRight className="h-3 w-3" />
                            </button>
                          </div>
                        )}
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
                                placeholder="e.g. Broken MT5 feed"
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

              {/* Configure Guard Limits Sub-tab */}
              {settingsTab === 'risk' && (
                <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-xs space-y-6">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                      <Shield className="h-5 w-5 text-indigo-500" />
                      Configure Portfolio Guard Limits
                    </h3>
                    <p className="text-xs text-slate-400">Establish drawdown, loss, and overtrading limits to protect your capital and maintain strict discipline.</p>
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
                          onChange={(e) => riskSettings && setRiskSettings({ ...riskSettings, dailyLossLimit: parseFloat(e.target.value) || 0 })}
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
                          onChange={(e) => riskSettings && setRiskSettings({ ...riskSettings, maxTradesPerDay: parseInt(e.target.value) || 0 })}
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
                          onChange={(e) => riskSettings && setRiskSettings({ ...riskSettings, weeklyLossLimit: parseFloat(e.target.value) || 0 })}
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
                          onChange={(e) => riskSettings && setRiskSettings({ ...riskSettings, maxDrawdownLimit: parseFloat(e.target.value) || 0 })}
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
                          onChange={(e) => riskSettings && setRiskSettings({ ...riskSettings, riskPerTradeLimit: parseFloat(e.target.value) || 0 })}
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
                            checked={riskSettings?.disciplineEnabled ?? true}
                            onChange={(e) => riskSettings && setRiskSettings({ ...riskSettings, disciplineEnabled: e.target.checked })}
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
        {activeTab === 'mt5' && activeAccount && (
          <MT5Instructions 
            account={activeAccount} 
            onTriggerSimulatedSync={handleTriggerSimulatedSync}
            isSyncing={actionLoading}
            onSyncSuccess={async (newAccountId) => {
              await fetchAccountData();
              if (newAccountId && typeof newAccountId === 'string') {
                setSelectedAccountId(newAccountId);
              }
            }}
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

      </main>

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

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditAccountModal(false);
                    setEditingAccount(null);
                  }}
                  className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg py-2.5 px-4 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-1/2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg py-2.5 px-4 transition disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* A. Account Creation Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
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
                  <button onClick={() => setAccountCreationMethod('mt5')} className="border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 rounded-xl p-4 text-left transition flex gap-3 items-center">
                     <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Activity className="w-5 h-5"/></div>
                     <div>
                       <div className="font-bold text-slate-800 text-sm">MT5 Auto-Sync (Recommended)</div>
                       <div className="text-[11px] text-slate-500">Automatically synchronize live trades from MetaTrader 5 using our Expert Advisor.</div>
                     </div>
                  </button>
                  <button onClick={() => setAccountCreationMethod('manual')} className="border-2 border-slate-100 hover:border-slate-300 hover:bg-slate-50 rounded-xl p-4 text-left transition flex gap-3 items-center">
                     <div className="bg-slate-100 p-2 rounded-lg text-slate-600"><Edit3 className="w-5 h-5"/></div>
                     <div>
                       <div className="font-bold text-slate-800 text-sm">Manual Account Opening</div>
                       <div className="text-[11px] text-slate-500">Create an empty portfolio to manually log your trades one-by-one.</div>
                     </div>
                  </button>
                </div>
              </div>
            )}

            {accountCreationMethod === 'mt5' && (
              <form onSubmit={handleCreateEaAccount} className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <button type="button" onClick={() => setAccountCreationMethod('select')} className="text-slate-400 hover:text-slate-700 text-xs font-semibold">← Back</button>
                </div>
                <div>
                  <h3 className="font-bold text-indigo-900 text-base flex items-center gap-2"><Lock className="h-4 w-4" /> Connect MT5 EA Sync</h3>
                  <p className="text-[11px] text-indigo-800/80">We will provision a new trading account and unique API token specifically for your MT5 Expert Advisor.</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider block mb-1">MT5 Login Number</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. 5591240"
                    value={eaLogin}
                    onChange={(e) => setEaLogin(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-xs rounded-lg p-2.5 w-full font-mono font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider block mb-1">Broker Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. ICMarketsSC-MT5-2"
                    value={eaBroker}
                    onChange={(e) => setEaBroker(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-xs rounded-lg p-2.5 w-full font-mono font-semibold"
                  />
                </div>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-lg transition flex items-center justify-center gap-1.5 mt-2"
                >
                  {actionLoading ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "Generate MT5 Token & Account"
                  )}
                </button>
              </form>
            )}

            {accountCreationMethod === 'manual' && (
              <form onSubmit={handleCreateAccount} className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <button type="button" onClick={() => setAccountCreationMethod('select')} className="text-slate-400 hover:text-slate-700 text-xs font-semibold">← Back</button>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Register Manual Portfolio</h3>
                  <p className="text-[11px] text-slate-400">Configure parameters for manual logs or automated Expert integrations.</p>
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

              <div className="grid grid-cols-2 gap-3">
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
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Account Type</label>
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
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg py-2.5 px-4 transition disabled:opacity-50"
              >
                {actionLoading ? 'Provisioning Account...' : 'Create Portfolio Account'}
              </button>
            </form>
            )}
          </div>
        </div>
      )}

      {/* B. Add / Edit Trade Modal */}
      {showTradeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-4 z-50 overflow-y-auto pt-16 md:pt-24 pb-16">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-100 max-w-lg w-full p-6 relative">
            <button 
              onClick={() => setShowTradeModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-50 transition duration-150"
            >
              ✖
            </button>
            <form onSubmit={handleSaveTrade} className="space-y-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">{editingTradeId ? 'Modify Trade Record' : 'Record Executed Trade Position'}</h3>
                <p className="text-[11px] text-slate-400">Add detailed metrics to compute performance and cognitive AI guidelines.</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Trade Date &amp; Time <span className="text-[10px] text-slate-400 font-normal">(Optional - defaults to current time)</span>
                </label>
                <input
                  type="datetime-local"
                  value={tradeDate}
                  onChange={(e) => setTradeDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs rounded-lg p-2.5 w-full font-semibold focus:ring-slate-500 focus:border-slate-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Asset Pair</label>
                  <input
                    type="text"
                    required
                    value={tradeSymbol}
                    onChange={(e) => setTradeSymbol(e.target.value)}
                    placeholder="EURUSD"
                    className="bg-slate-50 border border-slate-200 text-xs rounded-lg p-2 w-full uppercase"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Direction</label>
                  <select
                    value={tradeType}
                    onChange={(e: any) => setTradeType(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-xs rounded-lg p-2 w-full"
                  >
                    <option value="Buy">BUY (Long)</option>
                    <option value="Sell">SELL (Short)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Lots (Volume)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={tradeLotSize}
                    onChange={(e) => setTradeLotSize(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-xs rounded-lg p-2 w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Entry Price</label>
                  <input
                    type="number"
                    step="0.00001"
                    required
                    value={tradeEntryPrice}
                    onChange={(e) => setTradeEntryPrice(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-xs rounded-lg p-2 w-full"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Exit Price</label>
                  <input
                    type="number"
                    step="0.00001"
                    required
                    value={tradeExitPrice}
                    onChange={(e) => setTradeExitPrice(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-xs rounded-lg p-2 w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Stop Loss (SL)</label>
                  <input
                    type="number"
                    step="0.00001"
                    value={tradeSL}
                    onChange={(e) => setTradeSL(e.target.value)}
                    placeholder="Optional"
                    className="bg-slate-50 border border-slate-200 text-xs rounded-lg p-2 w-full"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Take Profit (TP)</label>
                  <input
                    type="number"
                    step="0.00001"
                    value={tradeTP}
                    onChange={(e) => setTradeTP(e.target.value)}
                    placeholder="Optional"
                    className="bg-slate-50 border border-slate-200 text-xs rounded-lg p-2 w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 border-t border-slate-100 pt-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Net P/L (Profit)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={tradeProfit}
                    onChange={(e) => setTradeProfit(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-xs rounded-lg p-2 w-full"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Commission</label>
                  <input
                    type="number"
                    step="0.01"
                    value={tradeComm}
                    onChange={(e) => setTradeComm(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-xs rounded-lg p-2 w-full"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Swap Charge</label>
                  <input
                    type="number"
                    step="0.01"
                    value={tradeSwap}
                    onChange={(e) => setTradeSwap(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-xs rounded-lg p-2 w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Account Risk %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={tradeRisk}
                    onChange={(e) => setTradeRisk(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-xs rounded-lg p-2 w-full"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Strategy Used</label>
                  <input
                    type="text"
                    value={tradeStrategy}
                    onChange={(e) => setTradeStrategy(e.target.value)}
                    placeholder="e.g. Order Block"
                    className="bg-slate-50 border border-slate-200 text-xs rounded-lg p-2 w-full"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Mindset / Emotion</label>
                  <select
                    value={tradeEmotion}
                    onChange={(e: any) => setTradeEmotion(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-xs rounded-lg p-2 w-full"
                  >
                    <option value="Calm">Calm & Rule-abiding</option>
                    <option value="Anxious">Anxious / Nervous</option>
                    <option value="Excited">Excited / Overconfident</option>
                    <option value="FOMO">FOMO (Fear of Missing Out)</option>
                    <option value="Greedy">Greedy (Lot Sizing error)</option>
                    <option value="Revenge">Revenge Execution</option>
                  </select>
                </div>
              </div>

              {/* Tagging */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Execution Tags</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customTagInput}
                    onChange={(e) => setCustomTagInput(e.target.value)}
                    placeholder="Breakout, News, etc."
                    className="bg-slate-50 border border-slate-200 text-xs rounded-lg p-2 flex-1"
                  />
                  <button
                    type="button"
                    onClick={addCustomTag}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg px-3"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {tradeTags.map(t => (
                    <span key={t} className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 font-bold text-[10px] py-1 px-2.5 rounded-full">
                      {t}
                      <button type="button" onClick={() => removeTag(t)} className="text-blue-400 hover:text-blue-700 font-bold">✖</button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Execution Notes & Comments</label>
                <textarea
                  rows={2}
                  value={tradeNotes}
                  onChange={(e) => setTradeNotes(e.target.value)}
                  placeholder="Describe your logical execution triggers..."
                  className="bg-slate-50 border border-slate-200 text-xs rounded-lg p-2.5 w-full"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg py-2.5 px-4 transition disabled:opacity-50"
              >
                {actionLoading ? 'Logging trade record...' : editingTradeId ? 'Update Trade Record' : 'Log Trade to Journal'}
              </button>
            </form>
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
                  <option value="MT5 Sync">MT5 Synchronization EA</option>
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

    </div>
  );
}
