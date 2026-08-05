import React, { useState, useEffect } from 'react';
import { 
  Users, CreditCard, AlertCircle, FileText, Plus, CheckCircle, Ban, RefreshCw, Star, BarChart3, Shield, Bug, Lightbulb
} from 'lucide-react';
import { User, SupportTicket, Announcement } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface AdminPanelProps {
  onPublishAnnouncement: () => void;
}

export default function AdminPanel({ onPublishAnnouncement }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'billing' | 'tickets' | 'bugs' | 'features' | 'announcements'>('dashboard');
  
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
          <div className="p-6 bg-slate-800/30 border border-slate-800 rounded-xl">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">User Growth (Cumulative)</h3>
            {dashboardStats?.userGrowth?.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dashboardStats.userGrowth} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} stroke="#475569" />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} stroke="#475569" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#e2e8f0' }}
                  />
                  <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center min-h-[300px] text-slate-500">No user data available yet.</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="overflow-x-auto bg-slate-800/50 rounded-xl border border-slate-800">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-700/50 text-slate-400 uppercase tracking-wider font-bold bg-slate-800/80">
                <th className="py-3 px-4">User details</th>
                <th className="py-3 px-4">Last Login</th>
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
                  <td colSpan={8} className="py-6 text-center text-slate-500">No users found.</td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-800 hover:bg-slate-800/70 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                        {u.name || 'Unknown'}
                        {u.authProvider === 'google' && (
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24">
                            <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.27-1.38 3.72-5.5 3.72-3.31 0-6-2.74-6-6.12s2.69-6.12 6-6.12c1.88 0 3.14.8 3.86 1.48l2.63-2.54C16.92 2.96 14.74 2 12 2 6.48 2 2 6.48 2 12s4.48 10 10 10c5.74 0 9.55-4.03 9.55-9.71 0-.65-.07-1.15-.16-1.65H12z"/>
                            <path fill="#34A853" d="M3.67 7.72 6.76 10a6.1 6.1 0 0 1 5.24-3.04c1.88 0 3.14.8 3.86 1.48l2.63-2.54C16.92 2.96 14.74 2 12 2 8.1 2 4.72 4.21 3.67 7.72z" opacity="0.15"/>
                            <path fill="#FBBC05" d="M12 22c2.68 0 4.94-.88 6.59-2.39l-3.05-2.5c-.84.57-1.94.97-3.54.97-4.09 0-5.24-2.43-5.5-3.72H3.45C4.24 19.12 7.65 22 12 22z" opacity="0.15"/>
                            <path fill="#4285F4" d="M21.55 12.29c0-.65-.07-1.15-.16-1.65H12v3.9h5.5c-.26 1.37-1.1 2.58-2.41 3.46l3.05 2.5C19.96 18.86 21.55 15.92 21.55 12.29z" opacity="0.15"/>
                          </svg>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400">{u.email}</div>
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-400 font-medium">
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never'}
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
      
      {activeTab === 'tickets' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tickets.map((t) => (
              <div key={t.id} className="p-4 border border-slate-700 bg-slate-800/50 rounded-xl flex flex-col hover:border-slate-600 transition">
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                    t.category === 'Support' ? 'bg-blue-500/10 text-blue-400' :
                    t.category === 'Bug' ? 'bg-red-500/10 text-red-400' :
                    t.category === 'Feature Request' ? 'bg-emerald-500/10 text-emerald-400' :
                    t.category === 'Billing' ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-700 text-slate-300'
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
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-slate-300 truncate">{t.userName || 'Unknown user'}</div>
                    <div className="text-[10px] text-slate-500 truncate">{t.userEmail}</div>
                    <div className="text-[10px] text-slate-500">{t.date ? new Date(t.date).toLocaleString() : 'N/A'}</div>
                  </div>
                  {t.status !== 'Closed' && (
                    <button
                      onClick={() => handleCloseTicket(t.id)}
                      className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold shrink-0"
                    >
                      Mark Closed
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {tickets.length === 0 && <div className="text-center py-8 text-slate-500 text-xs">No support submissions reported.</div>}
        </div>
      )}

      {activeTab === 'bugs' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {bugs.length === 0 ? <div className="text-center py-8 text-slate-500 text-xs">No bugs reported.</div> : bugs.map((b) => (
              <div key={b.id} className="p-4 border border-slate-700 bg-slate-800/50 rounded-xl flex flex-col">
                <div className="flex justify-between items-start mb-1.5">
                  <h4 className="font-bold text-slate-200 text-sm">{b.title}</h4>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/10 text-red-400 shrink-0">Priority: {b.priority || 'Low'}</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mb-2 flex-1">{b.description}</p>
                <div className="flex justify-between items-center pt-2 border-t border-slate-700/50">
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-slate-300 truncate">{b.userName || 'Unknown user'}</div>
                    <div className="text-[10px] text-slate-500 truncate">{b.userEmail}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                      b.status === 'Open' ? 'bg-red-500/10 text-red-400' : 'bg-slate-700 text-slate-400'
                    }`}>
                      {b.status}
                    </span>
                    <div className="text-[10px] text-slate-500 mt-1">{b.date ? new Date(b.date).toLocaleString() : 'N/A'}</div>
                  </div>
                </div>
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
                <div className="flex justify-between items-start mb-1.5">
                  <h4 className="font-bold text-slate-200 text-sm">{f.title}</h4>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-700 text-slate-400 shrink-0">{f.status || 'Open'}</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mb-2 flex-1">{f.description}</p>
                <div className="flex justify-between items-center pt-2 border-t border-slate-700/50">
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-slate-300 truncate">{f.userName || 'Unknown user'}</div>
                    <div className="text-[10px] text-slate-500 truncate">{f.userEmail}</div>
                  </div>
                  <div className="text-[10px] text-slate-500 shrink-0">{f.date ? new Date(f.date).toLocaleString() : 'N/A'}</div>
                </div>
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
