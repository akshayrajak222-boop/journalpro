import React, { useState, useEffect, useRef } from 'react';
import { Mail, CheckCircle2, ShieldAlert, ArrowRight, RotateCw, LogOut } from 'lucide-react';

interface EmailVerificationScreenProps {
  email: string;
  onVerified: (user: any) => void;
  onLogout: () => void;
}

export const EmailVerificationScreen: React.FC<EmailVerificationScreenProps> = ({ email, onVerified, onLogout }) => {
  const [otp, setOtp] = useState<string[]>(new Array(6).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [resendLoading, setResendLoading] = useState<boolean>(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Focus first input on mount
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // Cooldown timer logic
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleChange = (element: HTMLInputElement, index: number) => {
    if (isNaN(Number(element.value))) return;

    const value = element.value;
    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // Focus next input
    if (value && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      const newOtp = [...otp];
      if (!otp[index] && index > 0) {
        // Focus previous and clear
        newOtp[index - 1] = '';
        setOtp(newOtp);
        inputRefs.current[index - 1]?.focus();
      } else {
        newOtp[index] = '';
        setOtp(newOtp);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim();
    if (pasteData.length === 6 && !isNaN(Number(pasteData))) {
      const pasteOtp = pasteData.split('');
      setOtp(pasteOtp);
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const code = otp.join('');
    if (code.length !== 6) {
      setError('Please enter all 6 digits.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-email': email
        },
        body: JSON.stringify({ email, otp: code })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('Email verified successfully.');
        setTimeout(() => {
          onVerified(data.user);
        }, 1500);
      } else {
        setError(data.error || 'Verification failed. Please try again.');
      }
    } catch (err) {
      setError('Network error. Failed to verify OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resendLoading) return;
    setError(null);
    setSuccess(null);
    setResendLoading(true);

    try {
      const res = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-email': email
        },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('OTP sent successfully.');
        setResendCooldown(60);
      } else {
        setError(data.error || 'Failed to resend OTP.');
      }
    } catch (err) {
      setError('Network error. Failed to resend OTP.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] flex items-center justify-center p-4 font-sans antialiased text-slate-200">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-6 relative overflow-hidden">
        {/* Banner highlight */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-500"></div>

        <div className="flex justify-between items-center">
          <button 
            onClick={onLogout}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition bg-white/5 px-3 py-1.5 rounded-xl border border-white/5"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
          <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">Security</span>
        </div>

        <div className="space-y-2 text-center">
          <div className="mx-auto w-12 h-12 bg-blue-500/10 rounded-2xl border border-blue-500/20 flex items-center justify-center text-blue-400 mb-2">
            <Mail className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-100 font-display">Verify your email</h2>
          <p className="text-xs text-slate-400 px-4">
            We've sent a 6-digit confirmation code to <span className="text-blue-400 font-semibold">{email}</span>. Please enter it below.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-center gap-2" onPaste={handlePaste}>
            {otp.map((digit, idx) => (
              <input
                key={idx}
                type="text"
                maxLength={1}
                value={digit}
                ref={(el) => { inputRefs.current[idx] = el; }}
                onChange={(e) => handleChange(e.target, idx)}
                onKeyDown={(e) => handleKeyDown(e, idx)}
                className="w-12 h-14 text-center text-xl font-bold bg-[#070b13] border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white transition focus:outline-none"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || otp.some(d => !d)}
            className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold text-xs rounded-xl py-3.5 transition flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-md shadow-blue-500/10"
          >
            {loading ? 'Activating account...' : 'Verify Email'}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </form>

        <div className="flex flex-col items-center gap-2 pt-2">
          <button
            type="button"
            disabled={resendCooldown > 0 || resendLoading}
            onClick={handleResend}
            className="text-xs font-semibold text-slate-400 hover:text-slate-200 transition flex items-center gap-1.5 disabled:opacity-50 disabled:hover:text-slate-400"
          >
            {resendLoading ? (
              <RotateCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCw className="h-3.5 w-3.5" />
            )}
            {resendCooldown > 0 ? `Resend Code in ${resendCooldown}s` : 'Resend Code'}
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 text-red-300 text-xs rounded-2xl p-4 border border-red-500/20 flex items-start gap-2 animate-shake">
            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-emerald-500/10 text-emerald-300 text-xs rounded-2xl p-4 border border-emerald-500/20 flex items-start gap-2 animate-fade-in">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}
      </div>
    </div>
  );
};
