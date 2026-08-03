import React, { useState } from 'react';
import { X } from 'lucide-react';

const LEGAL_DOCS: Record<string, { title: string; body: string }> = {
  terms: {
    title: 'Terms & Conditions',
    body: 'Welcome to FX Journal Pro. By accessing or using our simulated trading journaling workspace, you agree to comply with our Terms of Use. We provide diagnostic evaluation tools and integration utilities. Simulated trading performance is not indicative of real-world returns. Users maintain full responsibility for actual broker deposits and trade executions.'
  },
  privacy: {
    title: 'Privacy Policy',
    body: 'Your trading logs, notes, cognitive mood profiles, and portfolio balances are strictly confidential. We only utilize local state, authenticated database schemas, and secured server protocols to persist records. Third-party integrations (e.g. Gemini AI prompts) proxy parameters securely and anonymously. We never sell user metrics or transaction history data.'
  }
};

export default function LegalFooter() {
  const [open, setOpen] = useState<string | null>(null);
  const doc = open ? LEGAL_DOCS[open] : null;

  return (
    <>
      <footer className="border-t border-slate-200/60 pt-6 pb-1 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-[10px] text-slate-400">&copy; {new Date().getFullYear()} FX Journal Pro. All rights reserved.</p>
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={() => setOpen('terms')}
            className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 transition"
          >
            Terms &amp; Conditions
          </button>
          <button
            type="button"
            onClick={() => setOpen('privacy')}
            className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 transition"
          >
            Privacy Policy
          </button>
        </div>
      </footer>

      {doc && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in duration-200"
            style={{ animation: 'modalIn 0.2s ease-out' }}
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-base font-extrabold text-slate-900">{doc.title}</h3>
              <button type="button" onClick={() => setOpen(null)} className="text-slate-400 hover:text-slate-600 transition">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="h-64 overflow-y-auto p-4 bg-slate-50 rounded-lg text-xs text-slate-500 leading-relaxed border border-slate-100">
              {doc.body}
            </div>
            <div className="flex justify-end mt-4">
              <button
                type="button"
                onClick={() => setOpen(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
