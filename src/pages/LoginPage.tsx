import React, { useState } from 'react';
import {
  AlertTriangle, Eye, EyeOff, CheckCircle2,
  Cpu, Brain, Shield, BarChart3, TrendingUp,
  ArrowUpRight, Zap
} from 'lucide-react';
import Logo from '../components/Logo';
import { supabase } from '../supabaseClient';
import { Turnstile } from '@marsidev/react-turnstile';

interface LoginPageProps {
  isSupabaseConfigured: boolean;
  onLoginSuccess: () => void;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

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
      // We delay Supabase signUp until AFTER OTP is verified to prevent auto-login
      persistAuthSession(sessionStorage.getItem('auth_user_id') || '', authEmail);
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
      if (data.user) {
        if (isRegistering && isSupabaseConfigured && authPassword) {
          try {
            await supabase.auth.signUp({
              email: authEmail,
              password: authPassword,
              options: { data: { full_name: authName || authEmail.split('@')[0] } }
            });
          } catch (sErr) {
            console.warn('[AxyFx] Supabase post-verify register warning:', sErr);
          }
        }
        persistAuthSession(data.user.id, data.user.email || authEmail); 
        onLoginSuccess(); 
        return; 
      }
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
    <div className="min-h-screen bg-[#0a0e1a] relative overflow-hidden flex items-center justify-center p-4 md:p-8">

      {/* ── Background layers ── */}
      <div className="absolute inset-0">
        {/* Grid */}
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)`,
          backgroundSize: '56px 56px'
        }} />
        {/* Radial glows */}
        <div className="absolute top-[-20%] left-[10%] w-[600px] h-[600px] bg-blue-600/[0.07] rounded-full blur-[120px]" />
        <div className="absolute bottom-[-15%] right-[5%] w-[500px] h-[500px] bg-violet-600/[0.06] rounded-full blur-[100px]" />
        <div className="absolute top-[40%] right-[30%] w-[300px] h-[300px] bg-cyan-500/[0.04] rounded-full blur-[80px]" />
      </div>

      {/* ── Floating marketing cards (background decoration) ── */}
      <div className="absolute inset-0 pointer-events-none hidden xl:block">

        {/* Top-left: MT5 Sync card */}
        <div className="absolute top-[8%] left-[5%] bg-white/[0.04] backdrop-blur-md border border-white/[0.08] rounded-2xl p-4 w-64 rotate-[-2deg]">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="bg-cyan-500/15 p-1.5 rounded-lg"><Cpu className="h-4 w-4 text-cyan-400" /></div>
            <span className="text-xs font-semibold text-white">MT5 Auto-Sync</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <div className="w-1 h-1 rounded-full bg-emerald-400"></div>
              <span>IC Markets — Connected</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <div className="w-1 h-1 rounded-full bg-emerald-400"></div>
              <span>47 trades synced today</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <div className="w-1 h-1 rounded-full bg-blue-400 animate-pulse"></div>
              <span>Live streaming active</span>
            </div>
          </div>
        </div>

        {/* Top-right: Win streak card */}
        <div className="absolute top-[6%] right-[6%] bg-white/[0.04] backdrop-blur-md border border-white/[0.08] rounded-2xl p-4 w-56 rotate-[3deg]">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-amber-400" />
            <span className="text-[11px] font-semibold text-amber-400">Win Streak</span>
          </div>
          <p className="text-2xl font-extrabold text-white mb-1">12 <span className="text-sm font-medium text-slate-400">wins</span></p>
          <p className="text-[10px] text-slate-500">Best streak this month</p>
        </div>

        {/* Bottom-left: AI Insight card */}
        <div className="absolute bottom-[10%] left-[4%] bg-white/[0.04] backdrop-blur-md border border-white/[0.08] rounded-2xl p-4 w-72 rotate-[1.5deg]">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="bg-violet-500/15 p-1.5 rounded-lg"><Brain className="h-4 w-4 text-violet-400" /></div>
            <span className="text-xs font-semibold text-white">AI Mentor Insight</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed italic">
            "Your EUR/USD entries show strong confluence with session high-probability zones. Consider increasing position size on London open setups."
          </p>
        </div>

        {/* Bottom-right: P&L card */}
        <div className="absolute bottom-[14%] right-[8%] bg-white/[0.04] backdrop-blur-md border border-white/[0.08] rounded-2xl p-4 w-52 rotate-[-2deg]">
          <p className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider font-medium">This Month</p>
          <p className="text-xl font-extrabold text-emerald-400 mb-0.5">+$12,840</p>
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
            <ArrowUpRight className="h-3 w-3" />
            <span className="font-medium">+34.2% return</span>
          </div>
        </div>

        {/* Center-left: floating feature badge */}
        <div className="absolute top-[48%] left-[2%] bg-white/[0.04] backdrop-blur-md border border-white/[0.08] rounded-full px-4 py-2 flex items-center gap-2 rotate-[-4deg]">
          <Shield className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-[11px] font-medium text-slate-300">Risk Guard Active</span>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
        </div>
      </div>

      {/* ── Login Card (center) ── */}
      <div className="relative z-10 w-full max-w-[420px] mx-auto">

        {/* Mobile hero (visible below lg) */}
        <div className="lg:hidden text-center mb-6">
          <div className="flex items-center justify-center gap-2.5 mb-4">
            <Logo size={26} />
            <span className="text-base font-bold text-white">FX Journal Pro</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white leading-tight mb-2">
            Your Trading Edge,<br />
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Powered by AI</span>
          </h1>
          <p className="text-sm text-slate-400 max-w-xs mx-auto">Journal, analyze, and improve with automated MT5 sync and AI coaching.</p>
          <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
            {[
              { icon: Cpu, label: 'MT5 Auto-Sync', color: 'text-cyan-400' },
              { icon: Brain, label: 'AI Mentor', color: 'text-violet-400' },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-1.5 bg-white/[0.06] border border-white/[0.08] rounded-full px-3 py-1.5">
                <f.icon className={`h-3 w-3 ${f.color}`} />
                <span className="text-[11px] font-medium text-slate-400">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop top bar */}
        <div className="hidden lg:flex items-center justify-between mb-8">
          <div className="flex items-center gap-2.5">
            <Logo size={24} />
            <span className="text-sm font-bold text-white tracking-tight">FX Journal Pro</span>
          </div>
          <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full text-[10px] font-semibold">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
            Live Platform
          </div>
        </div>

        {/* Card */}
        <div className="relative">
          {/* Subtle glow behind card */}
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 via-violet-600/10 to-cyan-600/20 rounded-2xl blur-xl opacity-60"></div>

          <div className="relative bg-white/[0.07] backdrop-blur-xl border border-white/[0.12] rounded-2xl p-6 sm:p-7">
            {/* Card inner glow line */}
            <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

            <div className="mb-6">
              <h2 className="text-xl font-bold text-white mb-1">
                {isRegistering ? 'Create your account' : isForgotPassword ? 'Reset password' : 'Welcome back'}
              </h2>
              <p className="text-sm text-slate-400">
                {isRegistering
                  ? 'Start tracking your trades with AI-powered insights.'
                  : isForgotPassword
                  ? 'Enter your email to receive a reset code.'
                  : 'Sign in to your trading dashboard.'}
              </p>
            </div>

            {/* Forgot Password */}
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
          </div>
        </div>

        {/* Feature pills below card (desktop) */}
        <div className="hidden lg:flex items-center justify-center gap-2 mt-6 flex-wrap">
          {[
            { icon: Cpu, label: 'MT5 Auto-Sync', color: 'text-cyan-400' },
            { icon: Brain, label: 'AI Mentor', color: 'text-violet-400' },
            { icon: Shield, label: 'Risk Guard', color: 'text-emerald-400' },
            { icon: BarChart3, label: 'Analytics', color: 'text-amber-400' },
          ].map((f) => (
            <div key={f.label} className="flex items-center gap-1.5 bg-white/[0.06] border border-white/[0.08] rounded-full px-3 py-1.5">
              <f.icon className={`h-3 w-3 ${f.color}`} />
              <span className="text-[10px] font-medium text-slate-400">{f.label}</span>
            </div>
          ))}
        </div>

        {/* Mobile footer */}
        <div className="lg:hidden text-center mt-6">
          <p className="text-[10px] text-slate-600">&copy; 2026 FX Journal Pro</p>
        </div>
      </div>
    </div>
  );
}
