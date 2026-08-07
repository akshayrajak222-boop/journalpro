import React, { useEffect, useState } from 'react';
import {
  ArrowUpRight, Ban, BarChart3, BookOpen, Bot, Brain, CheckCircle2,
  ChevronDown, Clock, Cpu, Database, Eye, EyeOff, FileDown,
  Flag, FileText, Globe, GraduationCap, KeyRound, Layers, LineChart, Lock,
  MessageSquare, MoonStar, MousePointerClick, Newspaper, PieChart, Quote, RefreshCw, Shield,
  ShieldCheck, Sparkles, Star, Sun, Tags, Target, TrendingDown,
  Trophy, Users, Wallet, X, Zap
} from 'lucide-react';
import Logo from '../components/Logo';
import TradingTicker from '../components/TradingTicker';
import { supabase } from '../supabaseClient';
import { Turnstile } from '@marsidev/react-turnstile';

interface LoginPageProps {
  isSupabaseConfigured: boolean;
  onLoginSuccess: () => void;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const navLinks = [
  { href: '#features', label: 'Features' },
  { href: '#analytics', label: 'Analytics' },
  { href: '#ai-mentor', label: 'AI Mentor' },
  { href: '#security', label: 'Security' },
  { href: '#faq', label: 'FAQ' },
];

const heroPoints = [
  'MT5 Trade Syncing',
  'AI Trading Mentor',
  'Advanced Performance Analytics',
  'Trading Psychology Insights',
  'Download Trading Reports (PDF & CSV)',
  'Complete Trading History Tracking',
];

const getPasswordStrength = (pw: string) => {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
};

const features = [
  { icon: Cpu, title: 'MT5 Automatic Sync', desc: 'Trades, balance, and equity sync automatically from MetaTrader 5 via the free Expert Advisor.' },
  { icon: Bot, title: 'AI Trade Mentor', desc: 'Get personalized coaching on your setups, entries, exits, and risk decisions.' },
  { icon: BarChart3, title: 'Performance Analytics', desc: 'Track 10+ metrics including win rate, profit factor, expectancy, and drawdown.' },
  { icon: Shield, title: 'Risk Management Tools', desc: 'Monitor risk per trade, daily limits, and position sizing to protect your capital.' },
  { icon: Trophy, title: 'Consistency Score', desc: 'A single score that grades how consistently you follow your edge.' },
  { icon: BookOpen, title: 'Detailed Trade Reviews', desc: 'Review every trade with notes, tags, screenshots, and full context.' },
  { icon: LineChart, title: 'Equity Curve Visualization', desc: 'See your growth clearly with an automated equity and balance curve.' },
  { icon: PieChart, title: 'Win Rate & Profit Factor', desc: 'Know exactly how effective your strategy really is.' },
  { icon: Wallet, title: 'Expectancy Analysis', desc: 'Understand your average expected return per trade.' },
  { icon: TrendingDown, title: 'Drawdown Monitoring', desc: 'Catch losing streaks early before they damage your account.' },
  { icon: Clock, title: 'Session & Day Analysis', desc: 'Find out which days and sessions perform best for you.' },
  { icon: Tags, title: 'Custom Tags & Notes', desc: 'Tag strategies, setups, and mistakes for fast, smart filtering.' },
  { icon: Flag, title: 'Goal Setting & Tracking', desc: 'Set monthly profit, consistency, and risk targets and track progress.' },
  { icon: FileText, title: 'Download Trading Reports', desc: 'Export complete trading reports in PDF and CSV format for reviews, prop firm applications, and backups.' },
  { icon: Newspaper, title: 'FX News & Economic Calendar', desc: 'Live forex headlines plus high-impact events like NFP, CPI, and FOMC — so you never trade blind.', new: true },
];

const perfectFor = [
  { icon: Globe, label: 'Forex Traders' },
  { icon: Trophy, label: 'Prop Firm Traders' },
  { icon: Sun, label: 'Day Traders' },
  { icon: MoonStar, label: 'Swing Traders' },
  { icon: GraduationCap, label: 'Beginners' },
  { icon: Target, label: 'Consistency Seekers' },
];

const mt5Sync = [
  { icon: MousePointerClick, title: 'One-Click EA Install', desc: 'Install the free FX Journal Pro EA in MetaTrader 5 in under a minute.' },
  { icon: RefreshCw, title: 'Automatic Sync', desc: 'Every trade syncs to your journal instantly — no manual entry.' },
  { icon: Zap, title: 'Real-Time Updates', desc: 'Balance, equity, and open positions stream live to your dashboard.' },
  { icon: Layers, title: 'Multiple Accounts', desc: 'Track broker and prop firm accounts all in one place.' },
  { icon: Database, title: 'Full History Import', desc: 'Your complete MT5 trade history is imported on first connect.' },
  { icon: ShieldCheck, title: 'Secure Connection', desc: 'Read-only access via token — your credentials never leave MT5.' },
];

const analyticsStats = [
  { label: 'Win Rate', value: '68%', sub: 'Last 100 trades', accent: 'text-emerald-400' },
  { label: 'Profit Factor', value: '2.1', sub: 'Gross profit / loss', accent: 'text-blue-400' },
  { label: 'Avg Risk:Reward', value: '1:2.4', sub: 'Per winning trade', accent: 'text-cyan-400' },
  { label: 'Max Drawdown', value: '4.2%', sub: 'Lowest equity point', accent: 'text-rose-400' },
  { label: 'Expectancy', value: '+$184', sub: 'Average per trade', accent: 'text-emerald-400' },
  { label: 'Net Profit', value: '+$12,840', sub: 'This quarter', accent: 'text-emerald-400' },
  { label: 'Monthly Growth', value: '+34.2%', sub: 'Average / month', accent: 'text-blue-400' },
  { label: 'Avg Trade Duration', value: '2h 15m', sub: 'Held position', accent: 'text-cyan-400' },
  { label: 'Best Trading Day', value: 'Thursday', sub: 'Most profitable', accent: 'text-amber-400' },
  { label: 'Worst Trading Day', value: 'Monday', sub: 'Needs attention', accent: 'text-slate-400' },
];

const aiMentorQuestions = [
  'Why did I lose money this week?',
  'How can I improve my win rate?',
  'Am I risking too much per trade?',
  'Which strategy should I scale?',
];

const aiPoints = [
  'Ask about any trade, strategy, or market condition.',
  'Get instant feedback on risk, entries, and exits.',
  'Receive actionable steps to improve next session.',
];

const security = [
  { icon: Lock, title: '256-Bit SSL Encryption', desc: 'All data in transit is encrypted end to end.' },
  { icon: KeyRound, title: 'Secure Authentication', desc: 'Password-based sign in with email verification and OTP codes.' },
  { icon: Bot, title: 'Cloudflare Turnstile', desc: 'Advanced bot protection keeps automated attacks out.' },
  { icon: ShieldCheck, title: 'Private by Design', desc: 'Your trades and analytics are yours — never sold or shared.' },
  { icon: Ban, title: 'Account Controls', desc: 'Reset your password and secure your session anytime.' },
];

const faqs = [
  { q: 'Is FX Journal Pro really free?', a: 'Yes, FX Journal Pro is currently free to use. There are no hidden fees or paywalls for core features, and you can start journaling your trades in minutes.' },
  { q: 'What is a trading journal?', a: 'A trading journal is a record of your trades used to review performance, identify strengths and weaknesses, and improve consistency. FX Journal Pro automates this with MT5 auto-sync and AI-driven analysis.' },
  { q: 'Does FX Journal Pro work with MetaTrader 5?', a: 'Yes. FX Journal Pro is a dedicated MT5 trading journal. Install the free Expert Advisor once and your trades, balance, and equity sync automatically in real time.' },
  { q: 'Do I need to enter trades manually?', a: 'No. With the MT5 Expert Advisor, trades are imported automatically in real time. You can still add manual trades or import a CSV when needed.' },
  { q: 'Can prop firm traders use FX Journal Pro?', a: 'Absolutely. Track multiple broker and prop firm accounts such as FTMO and FundedNext, monitor drawdown, and stay compliant with daily loss limits.' },
  { q: 'Is my trading data safe?', a: 'Yes. Your account is protected with secure authentication, email OTP verification, Cloudflare Turnstile bot protection, and 256-bit SSL encryption. Your data is never sold.' },
  { q: 'Do I need to download software?', a: 'The web dashboard runs in your browser with nothing to install. The only optional download is the free MT5 Expert Advisor for automatic trade syncing.' },
];

export default function LoginPage({ isSupabaseConfigured, onLoginSuccess, authFetch }: LoginPageProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isOtpMode, setIsOtpMode] = useState(false);
  const [isResetOtpMode, setIsResetOtpMode] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  const [resetEmail, setResetEmail] = useState('');
  const [resetOtpCode, setResetOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [turnstileToken, setTurnstileToken] = useState('');

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const openAuthModal = (mode: 'login' | 'register') => {
    setIsRegistering(mode === 'register');
    setIsForgotPassword(false);
    setIsOtpMode(false);
    setIsResetOtpMode(false);
    setResetSuccess(false);
    setAuthError(null);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
    setAuthError(null);
  };

  const persistAuthSession = (userId: string, email?: string) => {
    if (typeof window === 'undefined') return;
    if (userId) window.sessionStorage.setItem('auth_user_id', userId);
    else window.sessionStorage.removeItem('auth_user_id');
    if (email) window.sessionStorage.setItem('auth_email', email);
    else window.sessionStorage.removeItem('auth_email');
    window.localStorage.removeItem('auth_user_id');
    window.localStorage.removeItem('auth_email');
  };

  const syncSupabaseUser = async (sessionUser: any) => {
    const userId = sessionUser?.id || '';
    const email = sessionUser?.email || '';
    const name = sessionUser?.user_metadata?.full_name || sessionUser?.user_metadata?.name || (email ? email.split('@')[0] : 'Trader');
    const authProvider = sessionUser?.app_metadata?.provider || 'email';
    persistAuthSession(userId, email);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-user-id': userId, 'x-auth-email': email },
        body: JSON.stringify({ id: userId, email, name, isEmailVerified: true, provider: authProvider })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          // Keep sessionStorage in sync with the server's canonical user id
          persistAuthSession(data.user.id || userId, data.user.email || email);
          onLoginSuccess();
          return;
        }
      }
    } catch (e) {
      console.error('Error syncing user with backend:', e);
    }
    onLoginSuccess();
  };

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
      persistAuthSession(sessionStorage.getItem('auth_user_id') || '', authEmail);
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-email': authEmail },
        body: JSON.stringify({ email: authEmail, password: authPassword, turnstileToken })
      });
      if (!res.ok) {
        const errorData = await res.json();
        setAuthError(errorData.error || 'Login failed.');
        return;
      }
      const data = await res.json();
      if (data.user) {
        persistAuthSession(data.user.id, data.user.email || authEmail);
        onLoginSuccess();
      }
    } catch (err: any) {
      setAuthError(`Connection error: ${err?.message || err || 'Network error'}`);
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
      if (isSupabaseConfigured) {
        try {
          await supabase.auth.signUp({
            email: authEmail,
            password: authPassword,
            options: { data: { full_name: authName } }
          });
        } catch (sErr) {
          console.warn('[AxyFx] Supabase register warning:', sErr);
        }
      }
      persistAuthSession('');
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-email': authEmail },
        body: JSON.stringify({ email: authEmail, name: authName, password: authPassword, turnstileToken })
      });
      if (!res.ok) {
        const errorData = await res.json();
        setAuthError(errorData.error || 'Failed to create account.');
        return;
      }
      const data = await res.json();
      setIsOtpMode(true);
      if (data.devOtp) setOtpCode(data.devOtp);
      else setOtpCode('');
      setAuthError(null);
    } catch (err: any) {
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
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-email': authEmail },
        body: JSON.stringify({ email: authEmail, otp: otpCode })
      });
      const data = await res.json();
      if (!res.ok) { setAuthError(data.error || 'Invalid or expired code.'); return; }
      if (data.user) { persistAuthSession(data.user.id, data.user.email || authEmail); onLoginSuccess(); return; }
    } catch (err: any) {
      setAuthError(`Verification error: ${err?.message || err}`);
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
      if (!res.ok) { setAuthError(data.error || 'Failed to resend code.'); }
      else {
        if (data.devOtp) { setOtpCode(data.devOtp); alert(`Code: ${data.devOtp}`); }
        else { setOtpCode(''); alert(`New code sent to ${authEmail}`); }
      }
    } catch (err: any) { setAuthError(`Error: ${err?.message || err}`); }
    finally { setActionLoading(false); }
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
      if (!res.ok) { setAuthError(data.error || 'Request failed.'); return; }
      setIsResetOtpMode(true);
      if (data.devOtp) { setResetOtpCode(data.devOtp); alert(`Reset code: ${data.devOtp}`); }
      else { setResetOtpCode(''); }
      setAuthError(null);
    } catch (err: any) { setAuthError(`Error: ${err?.message || err}`); }
    finally { setActionLoading(false); }
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
      if (!res.ok) { setAuthError(data.error || 'Failed to reset password.'); return; }
      setResetSuccess(true);
      setTimeout(() => {
        setIsForgotPassword(false); setIsResetOtpMode(false); setResetSuccess(false);
        setResetEmail(''); setResetOtpCode(''); setNewPassword(''); setAuthError(null);
      }, 2500);
    } catch (err: any) { setAuthError(`Error: ${err?.message || err}`); }
    finally { setActionLoading(false); }
  };

  const inputClass = "w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40 transition";
  const buttonPrimary = "w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold text-sm rounded-xl py-3 transition shadow-lg shadow-blue-600/20 disabled:opacity-50";

  return (
    <div className="min-h-screen bg-[#060913] text-slate-200 font-sans antialiased overflow-x-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[700px] bg-blue-600/[0.08] rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute top-[40%] right-[-10%] w-[500px] h-[500px] bg-violet-600/[0.05] rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-[60%] left-[-10%] w-[500px] h-[500px] bg-cyan-500/[0.05] rounded-full blur-[140px] pointer-events-none" />

      {/* ── Navbar ── */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-white/[0.06] bg-[#060913]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <a href="#top" className="flex items-center gap-2.5">
            <Logo size={26} />
            <span className="text-sm font-bold text-white tracking-tight">FX Journal Pro</span>
          </a>
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} className="text-sm text-slate-400 hover:text-white transition-colors font-medium">{l.label}</a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <button onClick={() => openAuthModal('login')} className="hidden sm:inline-flex text-sm font-semibold text-slate-300 hover:text-white transition-colors">Sign In</button>
            <button onClick={() => openAuthModal('register')} className="text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 rounded-full px-4 py-2 transition shadow-lg shadow-blue-600/20">
              Get Started Free
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section id="top" className="relative pt-28 md:pt-36 pb-20 md:pb-28">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0" style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`,
            backgroundSize: '56px 56px',
            maskImage: 'radial-gradient(ellipse 70% 60% at 50% 0%, black 40%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 0%, black 40%, transparent 100%)'
          }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center animate-fade-up">
            <div className="inline-flex items-center gap-2 bg-white/[0.05] border border-white/[0.1] rounded-full px-3.5 py-1.5 mb-5">
              <Sparkles className="h-3.5 w-3.5 text-blue-400" />
              <span className="text-xs font-semibold text-slate-200">Free Trading Journal</span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl xl:text-6xl font-bold leading-[1.05] tracking-tight max-w-4xl mx-auto bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent animate-title-cycle">
              Don't Take a Big Break From Trading
            </h1>

            <div className="mt-10">
              <TradingTicker />
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-14 lg:gap-16 items-center mt-14 lg:mt-16">
          {/* Left: #1 Best Trading Journal */}
          <div className="animate-fade-up">
            <div className="inline-flex items-center gap-2 bg-white/[0.05] border border-white/[0.1] rounded-full px-3.5 py-1.5 mb-6">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-xs font-semibold text-slate-200">#1 Best Trading Journal</span>
            </div>

            <h2 className="text-3xl sm:text-4xl xl:text-5xl font-extrabold text-white leading-[1.05] tracking-tight">
              #1 Best Trading Journal
              <span className="block bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">for Forex &amp; Prop Firm Traders</span>
            </h2>

            <p className="mt-6 text-base sm:text-lg text-slate-400 leading-relaxed max-w-xl">
              The fastest way to journal, analyze, and improve your trading. Auto-sync MetaTrader 5 trades, get AI mentor insights, and track every metric that matters.
            </p>

            <div className="mt-6 space-y-2.5">
              {heroPoints.map((p) => (
                <div key={p} className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="text-sm text-slate-300">{p}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-8">
              <button onClick={() => openAuthModal('register')} className="group inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-semibold rounded-xl px-6 py-3.5 text-sm transition shadow-lg shadow-blue-600/25">
                Get Started Free
                <ArrowUpRight className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </button>
              <button onClick={() => openAuthModal('login')} className="inline-flex items-center justify-center gap-2 border border-white/[0.12] bg-white/[0.03] hover:bg-white/[0.07] text-white font-semibold rounded-xl px-6 py-3.5 text-sm transition">
                Sign In
              </button>
            </div>

          </div>

          {/* Right: quote */}
          <div className="animate-fade-up lg:mt-0 mt-6">
            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-3.5 py-1.5 mb-4">
              <Quote className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-xs font-semibold text-amber-200">Trader's Mindset</span>
            </div>
            <blockquote className="text-base sm:text-lg text-slate-300 leading-relaxed">
              <p>We're not saying you need to trade every day, but staying away completely can create a different problem. When you come back, the setup may be right there, but you hesitate — no confidence, FOMO kicks in, good trades get missed, and overtrading starts as you try to catch up.</p>
              <p className="mt-4">It's okay not to trade, but taking a long break can make you lose your edge. At least stay connected with your trading journey by reviewing your journal on FX Journal Pro</p>
            </blockquote>
            <p className="mt-4 text-[10px] uppercase tracking-[0.22em] text-slate-500 font-semibold">FX Journal Pro &middot; Trading Psychology</p>
          </div>
        </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="relative scroll-mt-20 py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-flex items-center gap-2 bg-white/[0.05] border border-white/[0.1] rounded-full px-3.5 py-1.5 mb-4">
              <Sparkles className="h-3.5 w-3.5 text-blue-400" />
              <span className="text-xs font-semibold text-slate-200">{features.length} Core Features</span>
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Everything You Need to Win Consistently</h2>
            <p className="mt-4 text-slate-400 text-base leading-relaxed">
              From automatic MT5 sync to AI coaching and deep analytics — FX Journal Pro combines every tool a serious trader needs into one powerful platform.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {features.map((f) => (
              <div key={f.title} className="group bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5 hover:bg-white/[0.05] hover:border-white/[0.14] transition">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600/20 to-cyan-500/20 border border-white/[0.08] flex items-center justify-center mb-4 group-hover:scale-110 transition">
                  <f.icon className="h-5 w-5 text-blue-400" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1.5 flex items-center gap-2">
                  {f.title}
                  {'new' in f && f.new && (
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-gradient-to-r from-blue-500 to-cyan-400 text-white px-1.5 py-0.5 rounded-full">
                      New
                    </span>
                  )}
                </h3>
                <p className="text-[13px] leading-relaxed text-slate-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Perfect For ── */}
      <section id="audience" className="relative scroll-mt-20 py-20 md:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-flex items-center gap-2 bg-white/[0.05] border border-white/[0.1] rounded-full px-3.5 py-1.5 mb-4">
            <Users className="h-3.5 w-3.5 text-blue-400" />            <span className="text-xs font-semibold text-slate-200">Who It's For</span>
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Perfect For Every Trader</h2>
          <p className="mt-4 text-slate-400 text-base max-w-xl mx-auto">
            Whether you trade forex, gold, or prop firm challenges — FX Journal Pro adapts to your style.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {perfectFor.map((p) => (
              <div key={p.label} className="flex items-center gap-2.5 bg-white/[0.04] border border-white/[0.08] rounded-full px-4 py-2.5 hover:border-white/[0.16] hover:bg-white/[0.06] transition">
                <p.icon className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-medium text-slate-200">{p.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MT5 Sync ── */}
      <section id="mt5-sync" className="relative scroll-mt-20 py-20 md:py-28 border-t border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <span className="inline-flex items-center gap-2 bg-white/[0.05] border border-white/[0.1] rounded-full px-3.5 py-1.5 mb-4">
              <Cpu className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-xs font-semibold text-slate-200">MetaTrader 5</span>
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">Automatic MT5 Synchronization</h2>
            <p className="mt-4 text-slate-400 text-base leading-relaxed">
              Install the free Expert Advisor once and your MT5 journal fills itself. No copy-pasting, no spreadsheets, no wasted hours.
            </p>
            <div className="mt-8 grid sm:grid-cols-2 gap-4">
              {mt5Sync.map((m) => (
                <div key={m.title} className="flex gap-3">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center shrink-0">
                    <m.icon className="h-4 w-4 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-1">{m.title}</h3>
                    <p className="text-[13px] leading-relaxed text-slate-400">{m.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-[#0a0f1e]/80 border border-white/[0.1] rounded-2xl overflow-hidden shadow-2xl shadow-black/40">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.06] bg-white/[0.02]">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400/80"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80"></span>
                <span className="ml-2 text-[11px] text-slate-400 font-medium">MT5 Terminal — FX Journal Pro EA</span>
              </div>
              <div className="p-5 font-mono text-[11px] leading-6">
                <p className="text-slate-500">FX Journal Pro EA — v1.4.0</p>
                <p className="text-emerald-400">[10:32:01] Authenticated successfully</p>
                <p className="text-slate-400">[10:32:02] Importing trade history...</p>
                <p className="text-slate-400">[10:32:03] 47 trades loaded</p>
                <p className="text-blue-400">[10:32:04] Live sync active — broker: IC Markets</p>
                <p className="text-slate-400">[10:32:05] Waiting for new trades...</p>
                <p className="text-emerald-400">[10:32:07] New trade detected — EURUSD BUY 0.50</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: RefreshCw, label: 'Auto Sync', value: 'Real-time' },
                { icon: Layers, label: 'Accounts', value: 'Unlimited' },
                { icon: ShieldCheck, label: 'Security', value: 'Read-only' },
              ].map((s) => (
                <div key={s.label} className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4 text-center">
                  <s.icon className="h-4 w-4 text-cyan-400 mx-auto mb-2" />
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">{s.label}</p>
                  <p className="text-xs font-bold text-white mt-0.5">{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Analytics ── */}
      <section id="analytics" className="relative scroll-mt-20 py-20 md:py-28 border-t border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-flex items-center gap-2 bg-white/[0.05] border border-white/[0.1] rounded-full px-3.5 py-1.5 mb-4">
              <BarChart3 className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-xs font-semibold text-slate-200">Deep Analytics</span>
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Monitor Every Important Trading Metric</h2>
            <p className="mt-4 text-slate-400 text-base leading-relaxed">
              Know your numbers. Track 10+ performance metrics automatically so you can make data-driven decisions — not emotional ones.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {analyticsStats.map((s) => (
              <div key={s.label} className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5 hover:bg-white/[0.05] transition">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">{s.label}</p>
                <p className={`text-xl font-extrabold ${s.accent}`}>{s.value}</p>
                <p className="text-[11px] text-slate-500 mt-1">{s.sub}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl bg-white/[0.03] border border-white/[0.07] p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Equity Curve</h3>
                <p className="text-xs text-slate-500">Automatic growth tracking</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-emerald-400">+$12,840</p>
                <p className="text-[10px] text-slate-500">This quarter</p>
              </div>
            </div>
            <EquityCurve className="w-full h-28" />
          </div>
        </div>
      </section>

      {/* ── AI Mentor ── */}
      <section id="ai-mentor" className="relative scroll-mt-20 py-20 md:py-28 border-t border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <span className="inline-flex items-center gap-2 bg-white/[0.05] border border-white/[0.1] rounded-full px-3.5 py-1.5 mb-4">
              <Brain className="h-3.5 w-3.5 text-violet-400" />
              <span className="text-xs font-semibold text-slate-200">AI Mentor</span>
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">Your Personal AI Trading Mentor</h2>
            <p className="mt-4 text-slate-400 text-base leading-relaxed">
              Talk to an AI coach that knows your trading history. Get honest, personalized feedback on your setups, risk, and psychology — whenever you need it.
            </p>
            <div className="mt-6 space-y-3">
              {aiPoints.map((p) => (
                <div key={p} className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-violet-400 shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-300">{p}</span>
                </div>
              ))}
            </div>
            <button onClick={() => openAuthModal('register')} className="mt-8 inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-blue-500 hover:from-violet-500 hover:to-blue-400 text-white font-semibold rounded-xl px-6 py-3.5 text-sm transition shadow-lg shadow-violet-600/25">
              Try the AI Mentor
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>

          <div className="bg-[#0a0f1e]/80 border border-white/[0.1] rounded-2xl overflow-hidden shadow-2xl shadow-black/40">
            <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-4 bg-white/[0.02]">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/30 to-blue-500/30 border border-white/[0.1] flex items-center justify-center">
                <Bot className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">AI Trading Mentor</p>
                <p className="flex items-center gap-1.5 text-[10px] text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Online
                </p>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex justify-end">
                <div className="bg-blue-600/80 text-white text-[13px] rounded-2xl rounded-br-md px-4 py-2.5 max-w-[80%] leading-relaxed">
                  Why do I keep losing money on GBP/JPY?
                </div>
              </div>
              <div className="flex justify-start">
                <div className="bg-white/[0.06] border border-white/[0.08] text-slate-200 text-[13px] rounded-2xl rounded-bl-md px-4 py-2.5 max-w-[85%] leading-relaxed">
                  Your win rate is solid, but your average risk per trade is 2.1% — above your 1% target. Tighten position size on high-volatility pairs and take profits at your 1:2 target.
                </div>
              </div>
              <div className="pt-1">
                <p className="text-[10px] text-slate-500 mb-2 uppercase tracking-wide font-semibold">Ask your AI mentor</p>
                <div className="flex flex-wrap gap-2">
                  {aiMentorQuestions.map((q) => (
                    <span key={q} className="text-[11px] text-slate-300 bg-white/[0.05] border border-white/[0.08] rounded-full px-3 py-1.5 cursor-default">{q}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Security ── */}
      <section id="security" className="relative scroll-mt-20 py-20 md:py-28 border-t border-white/[0.05]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-flex items-center gap-2 bg-white/[0.05] border border-white/[0.1] rounded-full px-3.5 py-1.5 mb-4">
              <Shield className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-xs font-semibold text-slate-200">Security</span>
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Enterprise-Grade Security, Zero Compromise</h2>
            <p className="mt-4 text-slate-400 text-base leading-relaxed">
              Your trading data is private and valuable. We protect it with the same standards used by financial platforms.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {security.map((s) => (
              <div key={s.title} className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5 hover:bg-white/[0.05] transition">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/15 to-cyan-500/15 border border-white/[0.08] flex items-center justify-center mb-4">
                  <s.icon className="h-5 w-5 text-emerald-400" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1.5">{s.title}</h3>
                <p className="text-[13px] leading-relaxed text-slate-400">{s.desc}</p>
              </div>
            ))}
            <div className="bg-gradient-to-br from-blue-600/15 to-cyan-500/15 border border-blue-500/20 rounded-2xl p-5 flex flex-col justify-center">
              <p className="text-sm font-semibold text-white mb-1.5">Protected from day one</p>
              <p className="text-[13px] leading-relaxed text-slate-400">Every account is secured with email verification, OTP codes, and bot protection.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── SEO Content ── */}
      <section id="about" className="relative scroll-mt-20 py-20 md:py-24 border-t border-white/[0.05]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-6">The #1 Best Trading Journal for Serious Forex Traders</h2>
          <div className="space-y-5 text-slate-400 text-[15px] leading-relaxed">
            <p>
              FX Journal Pro is a trading journal and trade analysis platform built for MetaTrader 5 users who are serious about consistent profits. Unlike generic spreadsheets or paid tools, it connects directly to your MT5 account through a free Expert Advisor, automatically importing every trade — including balance, equity, and position history — so your MT5 trading journal is always accurate and up to date.
            </p>
            <h3 className="text-lg font-bold text-white pt-2">Understand Your Trading Performance in Minutes</h3>
            <p>
              Stop guessing why your account goes up and down. Use FX Journal Pro as your trading performance tracker: it tracks 10+ metrics automatically — win rate, profit factor, average risk-to-reward, maximum drawdown, expectancy, monthly growth, and more. With an automated equity curve and daily analysis, you can see exactly which sessions, pairs, and strategies make you money.
            </p>
            <h3 className="text-lg font-bold text-white pt-2">Master Your Trading Psychology</h3>
            <p>
              Most traders fail because of emotion, not strategy. FX Journal Pro is also an AI trading journal — its built-in AI mentor reviews your history and helps you recognize fear, revenge trading, overtrading, and poor risk decisions, then coaches you toward the discipline professional traders rely on.
            </p>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="relative scroll-mt-20 py-20 md:py-28 border-t border-white/[0.05]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="inline-flex items-center gap-2 bg-white/[0.05] border border-white/[0.1] rounded-full px-3.5 py-1.5 mb-4">
              <MessageSquare className="h-3.5 w-3.5 text-blue-400" />
              <span className="text-xs font-semibold text-slate-200">FAQ</span>
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-3">
            {faqs.map((f) => (
              <details key={f.q} className="faq group bg-white/[0.03] border border-white/[0.08] rounded-2xl px-5 py-4 open:border-white/[0.16] transition">
                <summary className="flex items-center justify-between gap-4 cursor-pointer text-sm font-semibold text-white select-none">
                  {f.q}
                  <ChevronDown className="faq-chevron h-4 w-4 text-slate-500 shrink-0" />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">{f.a}</p>
              </details>
            ))}
          </div>

          <div className="mt-12 text-center bg-gradient-to-r from-blue-600/15 via-violet-600/10 to-cyan-600/15 border border-white/[0.08] rounded-2xl p-8">
            <h3 className="text-lg font-bold text-white mb-2">Start your trading journal today</h3>
            <p className="text-sm text-slate-400 mb-6 max-w-md mx-auto">Join 1,000+ traders improving their performance with MT5 auto-sync and AI coaching.</p>
            <button onClick={() => openAuthModal('register')} className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-semibold rounded-xl px-6 py-3.5 text-sm transition shadow-lg shadow-blue-600/25">
              Get Started Free
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.06] bg-[#04060d]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-3 gap-10">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <Logo size={24} />
                <span className="text-sm font-bold text-white tracking-tight">FX Journal Pro</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
                The #1 best trading journal with automatic MT5 sync, AI journal coaching, and trading performance analytics for forex and prop firm traders.
              </p>
              <div className="flex items-center gap-0.5 mt-3">
                {[1, 2, 3, 4, 5].map((i) => <Star key={i} className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />)}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white mb-4">Product</h3>
              <ul className="space-y-2.5">
                {navLinks.map((l) => (
                  <li key={l.href}>
                    <a href={l.href} className="text-sm text-slate-400 hover:text-white transition-colors">{l.label}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white mb-4">Legal</h3>
              <ul className="space-y-2.5">
                <li><a href="#top" className="text-sm text-slate-400 hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#top" className="text-sm text-slate-400 hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="mailto:contact@fxjournalpro.com" className="text-sm text-slate-400 hover:text-white transition-colors">contact@fxjournalpro.com</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/[0.06] mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-500">&copy; 2026 FX Journal Pro. All rights reserved.</p>
            <p className="text-xs text-slate-500">Made for traders, by traders.</p>
          </div>
        </div>
      </footer>

      <AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal}>
        <div className="mb-6 pr-8">
          <h3 className="text-xl font-bold text-white mb-1">
            {isRegistering ? 'Create your account' : isForgotPassword ? 'Reset password' : 'Welcome back'}
          </h3>
          <p className="text-sm text-slate-400">
            {isRegistering
              ? 'Start tracking your trades with AI-powered insights.'
              : isForgotPassword
              ? 'Enter your email to receive a reset code.'
              : 'Sign in to your trading dashboard.'}
          </p>
        </div>

        {isForgotPassword ? (
          resetSuccess ? (
            <div className="bg-emerald-500/10 text-emerald-300 text-sm rounded-xl p-4 border border-emerald-500/20 text-center font-medium">
              Password updated successfully!
            </div>
          ) : isResetOtpMode ? (
            <form onSubmit={handleResetPassword} className="space-y-3">
              <p className="text-sm text-slate-400 text-center">Code sent to <strong className="text-white">{resetEmail}</strong></p>
              <input type="text" required maxLength={6} value={resetOtpCode}
                onChange={(e) => setResetOtpCode(e.target.value.replace(/\D/g, ''))}
                className={inputClass} placeholder="------" />
              <input type="password" required minLength={6} value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputClass} placeholder="New password" />
              {authError && <div className="bg-red-500/10 text-red-300 text-sm rounded-xl p-3 border border-red-500/20">{authError}</div>}
              <button type="submit" disabled={actionLoading || resetOtpCode.length !== 6 || !newPassword} className={buttonPrimary}>
                {actionLoading ? 'Resetting...' : 'Reset password'}
              </button>
              <button type="button" onClick={() => { setIsForgotPassword(false); setAuthError(null); }}
                className="w-full text-center text-sm text-slate-400 hover:text-white font-medium transition-colors">Back to sign in</button>
            </form>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Email address</label>
                <input type="email" required value={resetEmail} onChange={(e) => setResetEmail(e.target.value)}
                  className={inputClass} placeholder="Email address" />
              </div>
              {authError && <div className="bg-red-500/10 text-red-300 text-sm rounded-xl p-3 border border-red-500/20">{authError}</div>}
              <button type="submit" disabled={actionLoading} className={buttonPrimary}>
                {actionLoading ? 'Sending...' : 'Send reset code'}
              </button>
              <button type="button" onClick={() => { setIsForgotPassword(false); setAuthError(null); }}
                className="w-full text-center text-sm text-slate-400 hover:text-white font-medium transition-colors">Back to sign in</button>
            </form>
          )
        ) : isOtpMode ? (
          <form onSubmit={handleVerifyOtp} className="space-y-3">
            <p className="text-sm text-slate-400 text-center">Code sent to <strong className="text-white">{authEmail}</strong></p>
            <input type="text" required maxLength={6} value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
              className={inputClass + ' text-center tracking-[0.5em] font-mono text-lg'} placeholder="------" />
            {authError && <div className="bg-red-500/10 text-red-300 text-sm rounded-xl p-3 border border-red-500/20">{authError}</div>}
            <button type="submit" disabled={actionLoading || otpCode.length !== 6} className={buttonPrimary}>
              {actionLoading ? 'Verifying...' : 'Verify & sign in'}
            </button>
            <div className="flex items-center justify-between text-sm">
              <button type="button" onClick={handleResendOtp} disabled={actionLoading} className="text-blue-400 hover:text-blue-300 font-medium transition-colors">Resend code</button>
              <button type="button" onClick={() => { setIsOtpMode(false); setOtpCode(''); setAuthError(null); }} className="text-slate-400 hover:text-white font-medium transition-colors">Change email</button>
            </div>
          </form>
        ) : isRegistering ? (
          <form onSubmit={handleRegister} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Full name</label>
              <input type="text" required value={authName} onChange={(e) => setAuthName(e.target.value)} className={inputClass} placeholder="Full name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email address</label>
              <input type="email" required value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className={inputClass} placeholder="Email address" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} required value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)} className={inputClass + ' pr-11'} placeholder="Password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-3 text-slate-400 hover:text-white transition-colors">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {authPassword && (() => {
                const strength = getPasswordStrength(authPassword);
                const color = strength >= 5 ? 'bg-emerald-500' : strength >= 3 ? 'bg-amber-400' : 'bg-rose-500';
                const textColor = strength >= 5 ? 'text-emerald-400' : strength >= 3 ? 'text-amber-300' : 'text-rose-400';
                const message = strength >= 5
                  ? 'Strong password.'
                  : strength === 4
                  ? 'Good password — almost there.'
                  : strength === 3
                  ? 'Getting stronger — add uppercase, numbers, or symbols.'
                  : 'Use a stronger password — mix uppercase, lowercase, numbers, and symbols.';
                return (
                  <div className="mt-2">
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= strength ? color : 'bg-white/10'}`}></div>
                      ))}
                    </div>
                    <p className={`text-xs mt-1.5 ${textColor}`}>{message}</p>
                  </div>
                );
              })()}
            </div>
            {authError && <div className="bg-red-500/10 text-red-300 text-sm rounded-xl p-3 border border-red-500/20">{authError}</div>}
            <div className="flex justify-center my-2">
              <Turnstile siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'} onSuccess={(token) => setTurnstileToken(token)} />
            </div>
            <button type="submit" disabled={actionLoading || (!turnstileToken && isSupabaseConfigured)} className={buttonPrimary}>
              {actionLoading ? 'Creating Account...' : 'Create Account'}
            </button>
            <p className="text-center text-sm text-slate-400">
              Already have an account?{' '}
              <button type="button" onClick={() => { setIsRegistering(false); setAuthError(null); }} className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">Sign in</button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email address</label>
              <input type="email" required value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className={inputClass} placeholder="Email address" />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-sm font-medium text-slate-300">Password</label>
                <button type="button" onClick={() => setIsForgotPassword(true)} className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors">Forgot password?</button>
              </div>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} required value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)} className={inputClass + ' pr-11'} placeholder="Password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-3 text-slate-400 hover:text-white transition-colors">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {authError && <div className="bg-red-500/10 text-red-300 text-sm rounded-xl p-3 border border-red-500/20">{authError}</div>}
            <div className="flex justify-center my-2">
              <Turnstile siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'} onSuccess={(token) => setTurnstileToken(token)} />
            </div>
            <button type="submit" disabled={actionLoading || (!turnstileToken && isSupabaseConfigured)} className={buttonPrimary}>
              {actionLoading ? 'Signing in...' : 'Sign in'}
            </button>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
              <div className="relative flex justify-center text-xs"><span className="bg-transparent px-3 text-slate-500">or</span></div>
            </div>

            <button type="button" disabled={actionLoading}
              onClick={async () => {
                setActionLoading(true); setAuthError(null);
                try {
                  const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: { redirectTo: window.location.origin },
                  });
                  if (error) { setAuthError(error.message); setActionLoading(false); }
                } catch (err: any) { setAuthError(`Google error: ${err?.message || err}`); setActionLoading(false); }
              }}
              className="w-full border border-white/10 hover:bg-white/[0.06] text-white rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2.5 transition disabled:opacity-50">
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.27-1.38 3.72-5.5 3.72-3.31 0-6-2.74-6-6.12s2.69-6.12 6-6.12c1.88 0 3.14.8 3.86 1.48l2.63-2.54C16.92 2.96 14.74 2 12 2 6.48 2 2 6.48 2 12s4.48 10 10 10c5.74 0 9.55-4.03 9.55-9.71 0-.65-.07-1.15-.16-1.65H12z" />
                <path fill="#34A853" d="M3.67 7.72 6.76 10a6.1 6.1 0 0 1 5.24-3.04c1.88 0 3.14.8 3.86 1.48l2.63-2.54C16.92 2.96 14.74 2 12 2 8.1 2 4.72 4.21 3.67 7.72z" opacity="0.15" />
                <path fill="#FBBC05" d="M12 22c2.68 0 4.94-.88 6.59-2.39l-3.05-2.5c-.84.57-1.94.97-3.54.97-4.09 0-5.24-2.43-5.5-3.72H3.45C4.24 19.12 7.65 22 12 22z" opacity="0.15" />
                <path fill="#4285F4" d="M21.55 12.29c0-.65-.07-1.15-.16-1.65H12v3.9h5.5c-.26 1.37-1.1 2.58-2.41 3.46l3.05 2.5C19.96 18.86 21.55 15.92 21.55 12.29z" opacity="0.15" />
              </svg>
              Continue with Google
            </button>

            <p className="text-center text-sm text-slate-400">
              New to FX Journal Pro?{' '}
              <button type="button" onClick={() => { setIsRegistering(true); setAuthError(null); }} className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">Get started</button>
            </p>
          </form>
        )}
      </AuthModal>
    </div>
  );
}

function AuthModal({ isOpen, onClose, children }: { isOpen: boolean; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start sm:items-center justify-center overflow-y-auto p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" aria-hidden="true"></div>
      <div role="dialog" aria-modal="true" className="relative w-full max-w-md my-8 sm:my-0 animate-fade-up" onClick={(e) => e.stopPropagation()}>
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 via-violet-600/10 to-cyan-600/20 rounded-2xl blur-xl opacity-60"></div>
          <div className="relative bg-[#0a0f1e]/95 backdrop-blur-xl border border-white/[0.12] rounded-2xl p-6 sm:p-7 shadow-2xl shadow-black/40">
            <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            <button type="button" onClick={onClose} aria-label="Close sign in dialog" className="absolute right-4 top-4 text-slate-400 hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}


function EquityCurve({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 110" className={className} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="eqFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="eqLine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>
      {[25, 50, 75].map((y) => (
        <line key={y} x1="0" x2="320" y1={y} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      ))}
      <path d="M0,95 L20,90 L40,93 L60,84 L80,87 L100,76 L120,80 L140,66 L160,72 L180,58 L200,63 L220,48 L240,52 L260,40 L280,32 L300,24 L320,18 L320,110 L0,110 Z" fill="url(#eqFill)" />
      <polyline points="0,95 20,90 40,93 60,84 80,87 100,76 120,80 140,66 160,72 180,58 200,63 220,48 240,52 260,40 280,32 300,24 320,18" fill="none" stroke="url(#eqLine)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="320" cy="18" r="4" fill="#10b981" />
    </svg>
  );
}

