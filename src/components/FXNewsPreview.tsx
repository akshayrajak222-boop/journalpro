import React, { useEffect, useState } from 'react';
import {
  Newspaper, CalendarRange, AlertTriangle, Radio, Clock, RefreshCw, ExternalLink
} from 'lucide-react';

interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: string;
  category: string;
  currencies: string[];
  sentiment: { score: number | null; label: string };
}

interface EconEvent {
  id: string;
  date: string;
  currency: string;
  country: string;
  event: string;
  impact: 'high' | 'medium' | 'low' | 'none';
  actual: string | null;
  forecast: string | null;
  previous: string | null;
}

const IMPACT_CHIP: Record<string, string> = {
  high: 'bg-red-500/10 text-red-400 border border-red-500/20',
  medium: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  low: 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/20',
  none: 'bg-slate-500/10 text-slate-400 border border-slate-500/20',
};

function timeAgo(iso: string): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (isNaN(t)) return '';
  const diff = Math.max(0, Date.now() - t);
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function skeleton(count: number) {
  return Array.from({ length: count }).map((_, i) => (
    <div key={i} className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 space-y-3 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-3 w-20 bg-white/[0.08] rounded-full" />
        <div className="h-3 w-14 bg-white/[0.08] rounded-full" />
      </div>
      <div className="h-4 w-3/4 bg-white/[0.08] rounded-full" />
      <div className="h-3 w-full bg-white/[0.08] rounded-full" />
      <div className="h-3 w-5/6 bg-white/[0.08] rounded-full" />
    </div>
  ));
}

export default function FXNewsPreview() {
  const [tab, setTab] = useState<'news' | 'calendar'>('news');
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [events, setEvents] = useState<EconEvent[]>([]);
  const [loadingNews, setLoadingNews] = useState(true);
  const [loadingCal, setLoadingCal] = useState(true);
  const [newsError, setNewsError] = useState('');
  const [calError, setCalError] = useState('');

  useEffect(() => {
    let cancelled = false;

    fetch('/api/fx-news?limit=6')
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d?.error || 'Could not load FX news');
        return d;
      })
      .then((d) => { if (!cancelled) setNews(d?.articles || []); })
      .catch((e) => { if (!cancelled) setNewsError(e.message || 'Could not load FX news'); })
      .finally(() => { if (!cancelled) setLoadingNews(false); });

    fetch('/api/economic-calendar?limit=8')
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d?.error || 'Could not load the economic calendar');
        return d;
      })
      .then((d) => { if (!cancelled) setEvents(d?.events || []); })
      .catch((e) => { if (!cancelled) setCalError(e.message || 'Could not load the economic calendar'); })
      .finally(() => { if (!cancelled) setLoadingCal(false); });

    return () => { cancelled = true; };
  }, []);

  return (
    <div className="bg-[#0a0f1e]/80 border border-white/[0.1] rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.06] bg-white/[0.02]">
        <span className="w-2.5 h-2.5 rounded-full bg-rose-400/80" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
        <div className="ml-3 flex-1 bg-white/[0.04] border border-white/[0.06] rounded-full px-3 py-1 text-[11px] text-slate-400 truncate">
          fxjournalpro.com/app/fx-news
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          LIVE
        </span>
      </div>

      {/* App window */}
      <div className="p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 bg-gradient-to-br from-blue-600/30 to-indigo-600/30 text-blue-400 rounded-xl border border-blue-500/20">
            <Newspaper className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-white tracking-tight font-display">FX NEWS</h3>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              Live headlines + high-impact economic events
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-white/[0.08] mb-5">
          {([
            { id: 'news', label: 'Latest FX News', icon: Newspaper },
            { id: 'calendar', label: 'Economic Calendar', icon: CalendarRange },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 -mb-px transition ${
                tab === t.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>

        {tab === 'news' ? (
          <div className="grid sm:grid-cols-2 gap-3">
            {loadingNews ? (
              skeleton(4)
            ) : newsError || news.length === 0 ? (
              <div className="sm:col-span-2 bg-white/[0.03] border border-white/[0.08] rounded-xl p-8 text-center">
                <AlertTriangle className="h-7 w-7 text-amber-500 mx-auto mb-3" />
                <p className="text-xs font-semibold text-slate-300">{newsError || 'No headlines right now.'}</p>
                <p className="text-[11px] text-slate-500 mt-1 mb-4">Headlines update every few minutes.</p>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-3 py-1.5 transition">
                  <RefreshCw className="h-3 w-3" /> Retry
                </span>
              </div>
            ) : (
              news.slice(0, 4).map((a) => (
                <div key={a.id} className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 flex flex-col hover:bg-white/[0.05] transition">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full truncate">
                      {a.category}
                    </span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      /bullish/i.test(a.sentiment?.label || '')
                        ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                        : /bearish/i.test(a.sentiment?.label || '')
                          ? 'text-rose-400 bg-rose-500/10 border border-rose-500/20'
                          : 'text-slate-400 bg-slate-500/10 border border-slate-500/20'
                    }`}>
                      {a.sentiment?.label || 'Neutral'}
                    </span>
                  </div>
                  <h4 className="text-[13px] font-bold text-white leading-snug line-clamp-2">{a.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed line-clamp-2">{a.summary}</p>
                  <div className="mt-auto pt-3 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1 text-[10px] text-slate-500 truncate">
                      <Clock className="h-3 w-3 shrink-0" /> {a.source} · {timeAgo(a.publishedAt)}
                    </span>
                    <div className="flex gap-1 shrink-0">
                      {a.currencies?.slice(0, 2).map((c) => (
                        <span key={c} className="text-[9px] font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded-full">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            {loadingCal ? (
              skeleton(4)
            ) : calError || events.length === 0 ? (
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-8 text-center">
                <AlertTriangle className="h-7 w-7 text-amber-500 mx-auto mb-3" />
                <p className="text-xs font-semibold text-slate-300">{calError || 'No events right now.'}</p>
                <p className="text-[11px] text-slate-500 mt-1">The calendar refreshes every 10 minutes.</p>
              </div>
            ) : (
              events.slice(0, 6).map((e) => (
                <div key={e.id} className="bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 flex items-center gap-4">
                  <div className="w-14 shrink-0 text-center">
                    <p className="text-xs font-extrabold text-slate-200 tabular-nums">{fmtTime(e.date)}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-200 truncate">
                      {e.currency} {e.event}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">
                      Forecast {e.forecast ?? '—'} · Previous {e.previous ?? '—'}
                    </p>
                  </div>
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full shrink-0 ${IMPACT_CHIP[e.impact] || IMPACT_CHIP.none}`}>
                    {e.impact}
                  </span>
                </div>
              ))
            )}
            <div className="flex items-center justify-center gap-1.5 pt-2 text-[10px] text-slate-500">
              <Radio className="h-3 w-3 text-red-400" /> Next high-impact event shown live on your dashboard
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
