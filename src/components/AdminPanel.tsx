import React, { useState, useEffect } from 'react';
import { 
  Users, CreditCard, Radio, AlertCircle, FileText, Plus, CheckCircle, Ban, RefreshCw, Star, BarChart3, Shield, Bug, Lightbulb
} from 'lucide-react';
import { User, SupportTicket, Announcement } from '../types';

interface AdminPanelProps {
  onPublishAnnouncement: () => void;
}

export default function AdminPanel({ onPublishAnnouncement }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'billing' | 'mt5' | 'tickets' | 'bugs' | 'features' | 'announcements'>('dashboard');
  
  const [dashboardStats, setDashboardStats] = useState<any>({});
  const [users, setUsers] = useState<any[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [bugs, setBugs] = useState<any[]>([]);
  const [features, setFeatures] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Announcement fields
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');

  const supportedBrokers = ['IC Markets', 'Pepperstone', 'Exness', 'FP Markets', 'XM', 'FBS'];

  // Auth headers — must be sent to all admin API calls
  const getAuthHeaders = (): Record<string, string> => {
    const userId = sessionStorage.getItem('auth_user_id') || '';
    const email = sessionStorage.getItem('auth_email') || '';
    const headers: Record<string, string> = {};
    if (userId) headers['x-auth-user-id'] = userId;
    if (email) headers['x-auth-email'] = email;
    return headers;
  };

  const fetchData = async () => {
    setLoading(true);
    const authHeaders = getAuthHeaders();
    try {
      if (activeTab === 'dashboard') {
        const res = await fetch('/api/admin/dashboard', { headers: authHeaders });
        if (res.ok) setDashboardStats(await res.json());
      } else if (activeTab === 'users') {
        const res = await fetch('/api/admin/users', { headers: authHeaders });
        if (res.ok) {
          const data = await res.json();
          if (data.users) setUsers(data.users);
        }
      } else if (activeTab === 'tickets') {
        const res = await fetch('/api/tickets', { headers: authHeaders });
        if (res.ok) {
          const data = await res.json();
          if (data.tickets) setTickets(data.tickets);
        }
      } else if (activeTab === 'announcements') {
        const res = await fetch('/api/announcements', { headers: authHeaders });
        if (res.ok) {
          const data = await res.json();
          if (data.announcements) setAnnouncements(data.announcements);
        }
      } else if (activeTab === 'bugs') {
        const res = await fetch('/api/admin/bugs', { headers: authHeaders });
        if (res.ok) {
          const data = await res.json();
          if (data.bugs) setBugs(data.bugs);
        }
      } else if (activeTab === 'features') {
        const res = await fetch('/api/admin/features', { headers: authHeaders });
        if (res.ok) {
          const data = await res.json();
          if (data.features) setFeatures(data.features);
        }
      }
    } catch (e) {
      console.error('Error loading admin tables:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleUpdateUserStatus = async (userId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        alert(`User status updated to ${newStatus}.`);
        fetchData();
      }
    } catch (e) {
      alert('Failed to modify user status.');
    }
  };

  const handleCloseTicket = async (ticketId: string) => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
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
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
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
    <div id="admin-management-panel" className="bg-slate-900 text-slate-200 border border-slate-800 rounded-xl p-6 shadow-xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            FX Journal Pro Operations Console
            <span className="text-xs bg-red-500/10 text-red-500 font-bold px-2 py-0.5 rounded border border-red-500/20">
              Admin Access
            </span>
          </h2>
          <p className="text-xs text-slate-400">Global SaaS telemetry, subscribers billing, and support queues</p>
        </div>
        
        <button
          onClick={fetchData}
          disabled={loading}
          className="mt-3 md:mt-0 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-white font-semibold text-xs rounded-lg py-2 px-4 transition flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 overflow-x-auto mb-6 gap-1 pb-1 scrollbar-hide">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
          { id: 'users', label: 'User Registry', icon: Users },
          { id: 'billing', label: 'Billing History', icon: CreditCard },
          { id: 'mt5', label: 'MT5 Sync', icon: Radio },
          { id: 'tickets', label: 'Tickets', icon: AlertCircle },
          { id: 'bugs', label: 'Bugs', icon: Bug },
          { id: 'features', label: 'Features', icon: Lightbulb },
          { id: 'announcements', label: 'Alerts', icon: FileText }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`py-2 px-4 text-xs font-semibold rounded-t-lg transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === tab.id ? 'bg-slate-800 text-blue-400 border-b-2 border-blue-500' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Users</span>
              <span className="text-2xl font-extrabold text-white">{dashboardStats?.totalUsers || 0}</span>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Active Users</span>
              <span className="text-2xl font-extrabold text-blue-400">{dashboardStats?.activeUsers || 0}</span>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total MT5</span>
              <span className="text-2xl font-extrabold text-purple-400">{dashboardStats?.totalMt5 || 0}</span>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Trades</span>
              <span className="text-2xl font-extrabold text-emerald-400">{dashboardStats?.totalTrades || 0}</span>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Revenue</span>
              <span className="text-2xl font-extrabold text-yellow-400">₹{dashboardStats?.totalRevenue || 0}</span>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Pending Tickets</span>
              <span className="text-2xl font-extrabold text-red-400">{dashboardStats?.pendingTickets || 0}</span>
            </div>
          </div>
          <div className="p-6 bg-slate-800/30 border border-slate-800 rounded-xl flex items-center justify-center min-h-[300px]">
            <span className="text-slate-500">More charts coming soon...</span>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="overflow-x-auto bg-slate-800/50 rounded-xl border border-slate-800">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-700/50 text-slate-400 uppercase tracking-wider font-bold bg-slate-800/80">
                <th className="py-3 px-4">User details</th>
                <th className="py-3 px-4">Joined Date</th>
                <th className="py-3 px-4">Plan tier</th>
                <th className="py-3 px-4">Experience / Style</th>
                <th className="py-3 px-4 text-center">Accounts</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-500">No users found.</td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-800 hover:bg-slate-800/70 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-200">{u.name || 'Unknown'}</div>
                      <div className="text-[10px] text-slate-400">{u.email}</div>
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-400 font-medium">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold ${
                        u.isPro ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-700 text-slate-400'
                      }`}>
                        {u.isPro ? <Star className="h-3 w-3 fill-blue-400" /> : null}
                        {u.isPro ? 'Pro Member' : 'Free Basic'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-300">{u.experience || 'N/A'}</div>
                      <div className="text-[10px] text-slate-500">{u.tradingStyle || 'Not set'}</div>
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-slate-300">{u.accountsCount || 0}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        !u.status || u.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' :
                        u.status === 'SUSPENDED' ? 'bg-orange-500/10 text-orange-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {u.status || 'ACTIVE'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {(!u.status || u.status === 'ACTIVE') ? (
                        <button
                          onClick={() => handleUpdateUserStatus(u.id, 'SUSPENDED')}
                          className="text-[10px] font-semibold px-2 py-1 rounded bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 transition"
                        >
                          Suspend
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpdateUserStatus(u.id, 'ACTIVE')}
                          className="text-[10px] font-semibold px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition"
                        >
                          Reactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'billing' && (
        <div className="p-6 text-center text-slate-400 bg-slate-800/50 rounded-xl border border-slate-800">
          Billing history is mock-only currently.
        </div>
      )}
      {activeTab === 'mt5' && (
        <div className="p-6 text-center text-slate-400 bg-slate-800/50 rounded-xl border border-slate-800">
          MT5 accounts list goes here.
        </div>
      )}
      
      {activeTab === 'tickets' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tickets.map((t) => (
              <div key={t.id} className="p-4 border border-slate-700 bg-slate-800/50 rounded-xl flex flex-col hover:border-slate-600 transition">
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                    t.category === 'Billing' ? 'bg-amber-500/10 text-amber-400' :
                    t.category === 'MT5 Sync' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-700 text-slate-300'
                  }`}>
                    {t.category}
                  </span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                    t.status === 'Open' ? 'bg-red-500/10 text-red-400' : 'bg-slate-700 text-slate-400'
                  }`}>
                    {t.status}
                  </span>
                </div>
                <h4 className="font-bold text-slate-200 text-sm mb-1">{t.title}</h4>
                <p className="text-xs text-slate-400 leading-relaxed flex-1">{t.description}</p>
                <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-700/50">
                  <span className="text-[10px] text-slate-500">{t.userEmail} &bull; {new Date(t.date).toLocaleDateString()}</span>
                  {t.status !== 'Closed' && (
                    <button
                      onClick={() => handleCloseTicket(t.id)}
                      className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold"
                    >
                      Mark Closed
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {tickets.length === 0 && <div className="text-center py-8 text-slate-500 text-xs">No active support tickets reported.</div>}
        </div>
      )}

      {activeTab === 'bugs' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {bugs.length === 0 ? <div className="text-center py-8 text-slate-500 text-xs">No bugs reported.</div> : bugs.map((b) => (
              <div key={b.id} className="p-4 border border-slate-700 bg-slate-800/50 rounded-xl flex flex-col">
                <h4 className="font-bold text-slate-200 text-sm mb-1">{b.title}</h4>
                <p className="text-xs text-slate-400 leading-relaxed mb-2">{b.description}</p>
                <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/10 text-red-400 w-max">Priority: {b.priority}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'features' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {features.length === 0 ? <div className="text-center py-8 text-slate-500 text-xs">No feature requests.</div> : features.map((f) => (
              <div key={f.id} className="p-4 border border-slate-700 bg-slate-800/50 rounded-xl flex flex-col">
                <h4 className="font-bold text-slate-200 text-sm mb-1">{f.title}</h4>
                <p className="text-xs text-slate-400 leading-relaxed mb-2">{f.description}</p>
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 w-max">Status: {f.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'announcements' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form onSubmit={handleCreateAnnouncement} className="lg:col-span-1 p-5 border border-slate-700 rounded-xl bg-slate-800/50 space-y-4">
            <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider mb-2">Publish announcement</h4>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Title</label>
              <input
                type="text"
                required
                value={annTitle}
                onChange={(e) => setAnnTitle(e.target.value)}
                placeholder="Announcing v2.5 Update"
                className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg p-2.5 w-full focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Content Body</label>
              <textarea
                required
                rows={4}
                value={annContent}
                onChange={(e) => setAnnContent(e.target.value)}
                placeholder="Type details of your global notification here..."
                className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg p-2.5 w-full focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg py-2.5 px-4 transition flex items-center justify-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Publish Broadcast
            </button>
          </form>

          <div className="lg:col-span-2 space-y-3">
            <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider mb-2">Announcement Registry</h4>
            {announcements.map((ann) => (
              <div key={ann.id} className="p-4 border border-slate-700 rounded-xl bg-slate-800/50 hover:border-slate-600 transition">
                <span className="text-[10px] text-slate-400 block">{new Date(ann.date).toLocaleDateString()} {new Date(ann.date).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</span>
                <h5 className="font-bold text-slate-200 text-sm mt-1">{ann.title}</h5>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">{ann.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
