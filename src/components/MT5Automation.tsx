import React, { useState } from 'react';
import {
  Download,
  RefreshCw,
  Wifi,
  WifiOff,
  Terminal,
  Clock,
  KeyRound,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Plus,
  Copy,
  FileCode2
} from 'lucide-react';
import { TradingAccount } from '../types';

interface MT5AutomationProps {
  account: TradingAccount | null;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
  onRefresh: () => void;
}

function timeAgo(iso?: string): string {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return 'Just now';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function MT5Automation({ account, authFetch, onRefresh }: MT5AutomationProps) {
  const [downloading, setDownloading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState('');
  const [downloadedName, setDownloadedName] = useState('');
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);
  const [eaCopied, setEaCopied] = useState(false);

  const host = typeof window !== 'undefined' ? window.location.host : 'www.fxjournalpro.com';
  const apiUrl = `${window.location.protocol}//${host}/api/mt5`;

  async function handleDownload() {
    if (!account) return;
    setDownloading(true);
    setError('');
    try {
      const res = await authFetch(`/api/mt5/ea/${account.id}/download`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || 'Download failed. Please try again.');
        return;
      }
      const source = await res.text();
      const blob = new Blob([source], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FXJournalPro_Sync_${account.name.replace(/[^A-Za-z0-9]+/g, '_').slice(0, 30)}.mq5`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setDownloadedName(a.download);
      onRefresh();
    } catch (e) {
      setError('Download failed. Please try again.');
    } finally {
      setDownloading(false);
    }
  }

  async function handleCopyCode() {
    if (!account) return;
    setCopying(true);
    setError('');
    try {
      const res = await authFetch(`/api/mt5/ea/${account.id}/download`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || 'Failed to fetch EA code. Please try again.');
        return;
      }
      const source = await res.text();
      await navigator.clipboard.writeText(source);
      setEaCopied(true);
      setTimeout(() => setEaCopied(false), 2500);
      onRefresh();
    } catch (e) {
      setError('Failed to copy EA code. Please try again.');
    } finally {
      setCopying(false);
    }
  }

  async function handleReset() {
    if (!account) return;
    setResetting(true);
    setError('');
    try {
      const res = await authFetch(`/api/mt5/ea/${account.id}/reset-token`, {
        method: 'POST',
        body: JSON.stringify({})
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || 'Reset failed. Please try again.');
        return;
      }
      setDownloadedName('');
      onRefresh();
    } catch (e) {
      setError('Reset failed. Please try again.');
    } finally {
      setResetting(false);
    }
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(apiUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      setCopied(false);
    }
  }

  if (!account) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-10 text-center">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-4">
          <Terminal className="h-7 w-7" />
        </div>
        <h3 className="text-base font-black text-slate-900 dark:text-white">No Portfolio Account Selected</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
          Create a portfolio account first — every account receives its own unique MT5 Expert Advisor.
        </p>
        <button
          onClick={onRefresh}
          className="mt-5 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition"
        >
          <Plus className="h-4 w-4" /> Refresh Accounts
        </button>
      </div>
    );
  }

  const connected = account.eaStatus === 'Connected';

  return (
    <div className="space-y-5">
      {/* Status row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-2">
            {connected ? <Wifi className="h-3.5 w-3.5 text-emerald-500" /> : <WifiOff className="h-3.5 w-3.5 text-slate-400" />}
            Connection
          </div>
          <div className={`text-lg font-black ${connected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
            {connected ? 'Connected' : account.eaStatus || 'Not Connected'}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-2">
            <Clock className="h-3.5 w-3.5" /> Last Sync
          </div>
          <div className="text-lg font-black text-slate-800 dark:text-white">{timeAgo(account.eaLastSyncTime)}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-2">Synced Trades</div>
          <div className="text-lg font-black text-slate-800 dark:text-white">{account.eaSyncTradeCount ?? '—'}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-2">MT5 Account</div>
          <div className="text-lg font-black text-slate-800 dark:text-white truncate">
            {account.eaTerminalLogin ? `#${account.eaTerminalLogin}` : 'Not reported'}
          </div>
          {account.eaTerminalServer && (
            <div className="text-[10px] text-slate-400 truncate">{account.eaTerminalServer}</div>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-semibold rounded-xl px-4 py-3">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: EA setup */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-500" />
            <h3 className="font-black text-slate-900 dark:text-white text-sm">Unique Expert Advisor for “{account.name}”</h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Download this account's dedicated MT5 Expert Advisor. The EA file is pre-configured with a unique
            authentication token that ties it to <strong>{account.name}</strong> only. Install it in your MetaTrader 5
            terminal and it will import your complete trade history, then keep syncing every new trade and account
            update in real time.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-3 rounded-xl transition disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {downloading ? 'Generating…' : 'Download EA (.mq5)'}
            </button>
            <button
              onClick={handleCopyCode}
              disabled={copying}
              className="flex items-center justify-center gap-2 border border-indigo-200 dark:border-indigo-500/40 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 text-xs font-bold py-3 rounded-xl transition disabled:opacity-50"
            >
              <FileCode2 className="h-4 w-4" />
              {copying ? 'Copying…' : 'Copy EA Code'}
            </button>
            <button
              onClick={handleReset}
              disabled={resetting}
              className="flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold py-3 rounded-xl transition disabled:opacity-50 sm:col-span-2"
            >
              <KeyRound className="h-4 w-4" />
              {resetting ? 'Resetting…' : 'Reset Token'}
            </button>
          </div>

          {eaCopied && (
            <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold rounded-xl px-4 py-3">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              EA source code copied to clipboard. Save it as a <code className="text-[10px] bg-emerald-100 dark:bg-emerald-500/20 px-1.5 py-0.5 rounded">.mq5</code> file inside <code className="text-[10px] bg-emerald-100 dark:bg-emerald-500/20 px-1.5 py-0.5 rounded">MQL5/Experts</code>.
            </div>
          )}

          {downloadedName && (
            <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold rounded-xl px-4 py-3">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Saved as {downloadedName}. Open it in MetaEditor, compile (F7), then attach to a chart.
            </div>
          )}

          {!downloadedName && account.eaStatus === 'Connected' && (
            <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold rounded-xl px-4 py-3">
              <Wifi className="h-4 w-4 shrink-0" />
              This account is connected via its EA. New trades sync automatically.
            </div>
          )}
        </div>

        {/* Right: install steps */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <h3 className="font-black text-slate-900 dark:text-white text-sm mb-4">Install in 3 Steps</h3>
          <ol className="space-y-4">
            <li className="flex gap-3">
              <span className="h-6 w-6 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 text-xs font-black flex items-center justify-center shrink-0">1</span>
              <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                <strong>Allow the connection</strong> in MT5: <code className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">Tools → Options → Expert Advisors</code>,
                tick “Allow WebRequest for listed URL” and add:
                <button
                  onClick={copyUrl}
                  className="ml-1 inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                >
                  {host} <Copy className="h-3 w-3" />
                </button>
                {copied && <span className="ml-1 text-emerald-600 font-bold">Copied!</span>}
              </div>
            </li>
            <li className="flex gap-3">
              <span className="h-6 w-6 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 text-xs font-black flex items-center justify-center shrink-0">2</span>
              <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                <strong>Install the EA:</strong> save the downloaded <code className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">.mq5</code> file into{' '}
                <code className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">MQL5/Experts</code> (open via{' '}
                <code className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">File → Open Data Folder</code>),
                open it in MetaEditor and press <strong>F7</strong> to compile.
              </div>
            </li>
            <li className="flex gap-3">
              <span className="h-6 w-6 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 text-xs font-black flex items-center justify-center shrink-0">3</span>
              <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                <strong>Attach it to any chart</strong> and allow automated trading. The EA authenticates instantly,
                imports your full history, then stays connected for real-time sync. Refresh this page to see the live status.
              </div>
            </li>
          </ol>
          <div className="mt-5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
            Keep this EA attached to a chart (any symbol/timeframe) to keep the sync running. It never places trades —
            it only reads your history and reports it to your journal.
          </div>
        </div>
      </div>
    </div>
  );
}
