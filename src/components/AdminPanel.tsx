import React, { useState, useEffect } from 'react';
import { 
  Users, CreditCard, Radio, AlertCircle, FileText, Plus, CheckCircle, Ban, RefreshCw, Star
} from 'lucide-react';
import { User, SupportTicket, Announcement } from '../types';

interface AdminPanelProps {
  onPublishAnnouncement: () => void;
}

export default function AdminPanel({ onPublishAnnouncement }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'billing' | 'mt5' | 'tickets' | 'announcements'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);

  // Announcement fields
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');

  // Supported brokers
  const supportedBrokers = ['IC Markets', 'Pepperstone', 'Exness', 'FP Markets', 'XM', 'FBS'];

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch users
      const usersRes = await fetch('/api/admin/users');
      const usersData = await usersRes.json();
      if (usersData.users) setUsers(usersData.users);

      // Fetch tickets
      const ticketsRes = await fetch('/api/tickets');
      const ticketsData = await ticketsRes.json();
      if (ticketsData.tickets) setTickets(ticketsData.tickets);

      // Fetch announcements
      const annRes = await fetch('/api/announcements');
      const annData = await annRes.json();
      if (annData.announcements) setAnnouncements(annData.announcements);

    } catch (e) {
      console.error('Error loading admin tables:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleToggleBlock = async (userId: string, isBlocked: boolean) => {
    try {
      const res = await fetch('/api/admin/block-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, block: !isBlocked })
      });
      if (res.ok) {
        alert(!isBlocked ? 'User blocked successfully.' : 'User unblocked successfully.');
        fetchData();
      }
    } catch (e) {
      alert('Failed to modify user block status.');
    }
  };

  const handleCloseTicket = async (ticketId: string) => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Closed' })
      });
      if (res.ok) {
        alert('Ticket closed successfully.');
        fetchData();
      }
    } catch (e) {
      alert('Failed to update support ticket.');
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle || !annContent) return alert('Fill in all fields');
    
    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: annTitle, content: annContent })
      });
      if (res.ok) {
        alert('Global announcement broadcasted successfully!');
        setAnnTitle('');
        setAnnContent('');
        onPublishAnnouncement();
        fetchData();
      }
    } catch (e) {
      alert('Failed to submit announcement.');
    }
  };

  return (
    <div id="admin-management-panel" className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            FX Journal Pro Operations Console
            <span className="text-xs bg-red-50 text-red-600 font-bold px-2 py-0.5 rounded border border-red-200">
              Admin Access
            </span>
          </h2>
          <p className="text-xs text-slate-500">Global SaaS telemetry, subscribers billing, and support queues</p>
        </div>
        
        <button
          onClick={fetchData}
          disabled={loading}
          className="mt-3 md:mt-0 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg py-2 px-3 transition flex items-center gap-1.5"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </button>
      </div>

      {/* Stats Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100/60">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Subscribers</span>
          <span className="text-xl font-extrabold text-slate-800">
            {users.filter(u => u.isPro).length} <span className="text-xs font-normal text-slate-400">Pro</span>
          </span>
        </div>
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100/60">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Free Users</span>
          <span className="text-xl font-extrabold text-slate-800">
            {users.filter(u => !u.isPro).length} <span className="text-xs font-normal text-slate-400">Basic</span>
          </span>
        </div>
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100/60">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">MT5 Sync Signals</span>
          <span className="text-xl font-extrabold text-emerald-600">Active</span>
        </div>
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100/60">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Open Tickets</span>
          <span className="text-xl font-extrabold text-orange-600">
            {tickets.filter(t => t.status !== 'Closed').length}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 overflow-x-auto mb-6 gap-2">
        <button
          onClick={() => setActiveTab('users')}
          className={`py-2 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'users' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="h-4 w-4" />
          User Registry
        </button>
        <button
          onClick={() => setActiveTab('billing')}
          className={`py-2 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'billing' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard className="h-4 w-4" />
          Billing History
        </button>
        <button
          onClick={() => setActiveTab('mt5')}
          className={`py-2 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'mt5' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Radio className="h-4 w-4" />
          MT5 Brokers & Sync
        </button>
        <button
          onClick={() => setActiveTab('tickets')}
          className={`py-2 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'tickets' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertCircle className="h-4 w-4" />
          Support Tickets ({tickets.filter(t => t.status !== 'Closed').length})
        </button>
        <button
          onClick={() => setActiveTab('announcements')}
          className={`py-2 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'announcements' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="h-4 w-4" />
          Broadcast Alerts
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'users' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider font-bold">
                <th className="pb-3 pl-2">User details</th>
                <th className="pb-3">Plan tier</th>
                <th className="pb-3">Experience / Style</th>
                <th className="pb-3">Accounts</th>
                <th className="pb-3">Trades logged</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition">
                  <td className="py-3 pl-2">
                    <div className="font-semibold text-slate-800">{u.name}</div>
                    <div className="text-[10px] text-slate-400">{u.email}</div>
                  </td>
                  <td className="py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold ${
                      u.isPro ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-500'
                    }`}>
                      {u.isPro ? <Star className="h-3 w-3 fill-blue-600" /> : null}
                      {u.isPro ? 'Pro Member' : 'Free Basic'}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="text-slate-700">{u.experience || 'Onboarding Pending'}</div>
                    <div className="text-[10px] text-slate-400">{u.tradingStyle || 'Not set'}</div>
                  </td>
                  <td className="py-3 font-semibold text-slate-600">{u.accountsCount || 0} Accounts</td>
                  <td className="py-3 font-semibold text-slate-600">{u.tradesCount || 0} Trades</td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => handleToggleBlock(u.id, u.status === 'Blocked')}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition ${
                        u.status === 'Blocked' 
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                      }`}
                    >
                      {u.status === 'Blocked' ? 'Unblock User' : 'Block User'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'billing' && (
        <div>
          <h3 className="font-semibold text-sm text-slate-800 mb-4">Pro Plan Payments Ledger</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase font-bold">
                  <th className="pb-3 pl-2">Razorpay Reference</th>
                  <th className="pb-3">User</th>
                  <th className="pb-3">Amount Charged</th>
                  <th className="pb-3">Charge date</th>
                  <th className="pb-3 text-right">Receipt status</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="py-3 pl-2 font-mono text-blue-600">pay_rzp_82910_akshay</td>
                  <td className="py-3">akshayrajak222@gmail.com</td>
                  <td className="py-3 font-semibold text-slate-800">₹99.00 INR</td>
                  <td className="py-3 text-slate-500">2026-07-11 12:00:00</td>
                  <td className="py-3 text-right">
                    <span className="bg-emerald-50 text-emerald-600 font-semibold px-2 py-0.5 rounded-full">
                      Success
                    </span>
                  </td>
                </tr>
                <tr className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="py-3 pl-2 font-mono text-slate-500">pay_rzp_mock_demo</td>
                  <td className="py-3">demo_scalper@yahoo.com</td>
                  <td className="py-3 font-semibold text-slate-800">₹99.00 INR</td>
                  <td className="py-3 text-slate-500">2026-07-09 18:24:11</td>
                  <td className="py-3 text-right">
                    <span className="bg-emerald-50 text-emerald-600 font-semibold px-2 py-0.5 rounded-full">
                      Success
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'mt5' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 border border-slate-100 rounded-xl bg-slate-50/50">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-3">Supported Forex Brokers</h4>
              <ul className="space-y-2 text-xs">
                {supportedBrokers.map((b, idx) => (
                  <li key={idx} className="flex justify-between items-center bg-white p-2 border border-slate-100 rounded-lg">
                    <span className="font-semibold text-slate-700">{b}</span>
                    <span className="text-[10px] bg-emerald-50 text-emerald-600 font-bold px-2 py-0.5 rounded-full">
                      Compatible
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-5 border border-slate-100 rounded-xl bg-slate-50/50">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-3">MQL EA Sync Channels</h4>
              <div className="space-y-3">
                <div className="bg-white p-3 border border-slate-100 rounded-lg">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-xs text-slate-800">Akshay Raj (IC Markets)</span>
                    <span className="text-[10px] bg-emerald-50 text-emerald-600 font-bold px-1.5 py-0.5 rounded">ONLINE</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block">Token: axy_token_88291_akshay</span>
                  <span className="text-[10px] text-slate-500 mt-2 block">Last trade matched: Today, 12:00:00</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tickets' && (
        <div className="space-y-4">
          <h3 className="font-semibold text-sm text-slate-800">Support Ticket Queue</h3>
          <div className="space-y-3">
            {tickets.map((t) => (
              <div key={t.id} className="p-4 border border-slate-100 bg-slate-50/50 rounded-xl flex justify-between items-start hover:border-slate-200 transition">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      t.category === 'Billing' ? 'bg-amber-50 text-amber-600' :
                      t.category === 'MT5 Sync' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {t.category}
                    </span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                      t.status === 'Open' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {t.status}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm">{t.title}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">{t.description}</p>
                  <span className="text-[10px] text-slate-400 block">Submitted by {t.userEmail} on {new Date(t.date).toLocaleDateString()}</span>
                </div>

                {t.status !== 'Closed' && (
                  <button
                    onClick={() => handleCloseTicket(t.id)}
                    className="border border-slate-200 hover:bg-white text-slate-700 hover:text-emerald-600 font-semibold text-xs py-1.5 px-3 rounded-lg transition flex items-center gap-1 bg-white shadow-sm"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    Close Ticket
                  </button>
                )}
              </div>
            ))}
            {tickets.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-xs">No active support tickets reported.</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'announcements' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form onSubmit={handleCreateAnnouncement} className="lg:col-span-1 p-5 border border-slate-100 rounded-xl bg-slate-50/50 space-y-4">
            <h4 className="font-bold text-xs text-slate-500 uppercase tracking-wider mb-2">Publish announcement</h4>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Title</label>
              <input
                type="text"
                required
                value={annTitle}
                onChange={(e) => setAnnTitle(e.target.value)}
                placeholder="Announcing v2.5 Update"
                className="bg-white border border-slate-200 text-xs rounded-lg p-2.5 w-full focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Content Body</label>
              <textarea
                required
                rows={4}
                value={annContent}
                onChange={(e) => setAnnContent(e.target.value)}
                placeholder="Type details of your global notification here..."
                className="bg-white border border-slate-200 text-xs rounded-lg p-2.5 w-full focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg py-2.5 px-4 transition flex items-center justify-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Publish Broadcast Alert
            </button>
          </form>

          <div className="lg:col-span-2 space-y-3">
            <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider mb-2">Announcement Registry</h4>
            {announcements.map((ann) => (
              <div key={ann.id} className="p-4 border border-slate-100 rounded-xl bg-white shadow-sm hover:border-slate-200 transition">
                <span className="text-[10px] text-slate-400 block">{new Date(ann.date).toLocaleDateString()} {new Date(ann.date).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</span>
                <h5 className="font-bold text-slate-800 text-sm mt-1">{ann.title}</h5>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">{ann.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
