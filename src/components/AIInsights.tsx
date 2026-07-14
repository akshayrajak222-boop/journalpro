import React, { useState } from 'react';
import { BrainCircuit, Sparkles, TrendingUp, AlertTriangle, Lightbulb, Lock, ShieldCheck, HelpCircle } from 'lucide-react';
import { User, TradingAccount } from '../types';

interface AIInsightsProps {
  user: User;
  account: TradingAccount;
  onUpgradeToPro: () => void;
}

export default function AIInsights({ user, account, onUpgradeToPro }: AIInsightsProps) {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<string[] | null>(null);
  const [summary, setSummary] = useState<string>('');

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: account.id })
      });
      const data = await response.json();
      if (data.insights) {
        setInsights(data.insights);
        setSummary(data.summary || 'AI Trading Performance Audit Complete.');
      } else if (data.error) {
        alert(data.error);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to connect to the FX Journal Pro neural insights processor. Try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Icon selector based on advice type
  const getAdviceIcon = (text: string) => {
    const l = text.toLowerCase();
    if (l.includes('risk') || l.includes('loss') || l.includes('overtrade') || l.includes('consecutive') || l.includes('emotional')) {
      return <AlertTriangle className="h-5 w-5 text-rose-500 mt-0.5 flex-shrink-0" />;
    }
    if (l.includes('strongest') || l.includes('win') || l.includes('excellent') || l.includes('profit')) {
      return <TrendingUp className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />;
    }
    return <Lightbulb className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />;
  };

  if (!user.isPro) {
    return (
      <div id="ai-insights-premium-teaser" className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-xl p-8 text-white relative overflow-hidden">
        {/* Subtle decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="max-w-2xl mx-auto text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full text-xs font-semibold text-blue-400">
            <Sparkles className="h-3.5 w-3.5" />
            FX Journal Pro Cognitive Intelligence
          </div>
          
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white font-sans">
            AI-Powered Performance Insights
          </h2>
          
          <p className="text-slate-400 text-sm md:text-base leading-relaxed">
            Stop guessing why your trades fail. Our advanced AI scans your trading logs, spots hidden emotional triggers, analyzes market overlap behaviors, and issues custom, daily corrective guidance.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left my-6 py-4 border-y border-slate-800">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <strong className="text-xs font-bold text-slate-200 block">Behavioral Warning System</strong>
                <span className="text-[11px] text-slate-400">Identifies escalating risk ratios following losses (revenge trades).</span>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Sparkles className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
              <div>
                <strong className="text-xs font-bold text-slate-200 block">Session Volume Auditing</strong>
                <span className="text-[11px] text-slate-400">Traces profit concentrations down to specific trading sessions (London/NY).</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onUpgradeToPro}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-lg px-6 py-3 transition flex items-center justify-center gap-2"
            >
              <Lock className="h-4 w-4" />
              Upgrade to Pro for ₹99/month
            </button>
            <div className="text-xs text-slate-400 flex items-center gap-1">
              <HelpCircle className="h-3.5 w-3.5 text-slate-500" />
              Instant activation. Cancel anytime.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="ai-insights-pro-active" className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <BrainCircuit className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              Cognitive AI Co-Pilot
              <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold">
                Pro
              </span>
            </h2>
            <p className="text-xs text-slate-500">Intelligent trading patterns auditing and emotional feedback loop</p>
          </div>
        </div>

        <button
          onClick={fetchInsights}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg py-2 px-4 transition flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <Sparkles className="h-3.5 w-3.5" />
          {loading ? 'Running Advanced Analysis...' : 'Generate AI Performance Audit'}
        </button>
      </div>

      {!insights ? (
        <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
          <Sparkles className="h-10 w-10 text-slate-300 mx-auto mb-3 animate-pulse" />
          <h3 className="font-semibold text-slate-800 text-sm">FX Journal Pro Neural Auditor Ready</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
            Our AI engine will scan all trades recorded inside "{account.name}" to diagnose your performance, identify emotional blockades, and offer constructive improvements.
          </p>
          <button
            onClick={fetchInsights}
            disabled={loading}
            className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg px-4 py-2 transition"
          >
            {loading ? 'Analyzing Logged History...' : 'Generate Audit Report'}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-1">Executive Summary</h4>
              <p className="text-xs text-slate-600 leading-relaxed">{summary}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.map((insight, idx) => (
              <div 
                key={idx} 
                className="p-4 border border-slate-100 bg-slate-50/50 rounded-xl flex gap-3 hover:border-slate-200 transition"
              >
                {getAdviceIcon(insight)}
                <div>
                  <h5 className="text-xs font-bold text-slate-700 mb-1">Observation #{idx + 1}</h5>
                  <p className="text-xs text-slate-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: insight }}></p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center text-[11px] text-slate-400 pt-2 border-t border-slate-100">
            Analyzed at {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()} • Generated using LLM diagnostic patterns for trading.
          </div>
        </div>
      )}
    </div>
  );
}
