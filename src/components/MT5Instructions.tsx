import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Check, 
  Copy, 
  RefreshCw, 
  Terminal, 
  Cpu, 
  Play, 
  Shield, 
  Lock, 
  Server, 
  Info, 
  Trash2, 
  AlertCircle, 
  CheckCircle, 
  TrendingUp, 
  Coins, 
  Activity, 
  FileText,
  Clock
} from 'lucide-react';
import { MT5Connection, TradingAccount } from '../types';

interface MT5InstructionsProps {
  account: TradingAccount;
  connection?: MT5Connection;
  onTriggerSimulatedSync: (symbol: string) => void;
  isSyncing: boolean;
  onSyncSuccess?: (newAccountId?: string) => void;
}

export default function MT5Instructions({
  account,
  onTriggerSimulatedSync,
  isSyncing,
  onSyncSuccess
}: MT5InstructionsProps) {
  const [copied, setCopied] = useState(false);
  const [simulatedSymbol, setSimulatedSymbol] = useState('EURUSD');

  // Integration method tab
  const [activeTab, setActiveTab] = useState<'ea' | 'investor'>('ea');

  // Local connection state
  const [localConnection, setLocalConnection] = useState<MT5Connection | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Bridge health state
  const [bridgeStatus, setBridgeStatus] = useState<'checking' | 'running' | 'offline'>('checking');
  const [bridgeConnected, setBridgeConnected] = useState(false);

  // Investor Form inputs
  const [loginNumber, setLoginNumber] = useState('');
  const [brokerServer, setBrokerServer] = useState('');
  const [investorPassword, setInvestorPassword] = useState('');
  const [autoSync, setAutoSync] = useState(true);

  // EA Form inputs
  const [eaLogin, setEaLogin] = useState('');
  const [eaBroker, setEaBroker] = useState('');
  const [eaBalance, setEaBalance] = useState('10000.00');

  // Operational states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncingNow, setIsSyncingNow] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState('');

  // Fetch current account's connection status
  const fetchConnection = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/mt5/connections');
      if (res.ok) {
        const data = await res.json();
        const conn = data.connections.find((c: any) => c.accountId === account.id);
        setLocalConnection(conn || null);
        if (conn && conn.isInvestorSync) {
          setActiveTab('investor');
          setLoginNumber(conn.loginNumber || '');
          setBrokerServer(conn.brokerServer || '');
          setAutoSync(conn.autoSync !== false);
        } else {
          setActiveTab('ea');
        }
      }
    } catch (e) {
      console.error('Error fetching MT5 connection:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Check Python bridge health
  const fetchBridgeStatus = async () => {
    setBridgeStatus('checking');
    try {
      const res = await fetch('/api/mt5/bridge-status');
      if (res.ok) {
        const data = await res.json();
        setBridgeStatus(data.ok ? 'running' : 'offline');
        setBridgeConnected(data.connected === true);
      } else {
        setBridgeStatus('offline');
      }
    } catch {
      setBridgeStatus('offline');
    }
  };

  useEffect(() => {
    fetchConnection();
    fetchBridgeStatus();
  }, [account.id]);

  const syncToken = localConnection?.syncToken || `axy_token_${account.id}_sandbox`;

  // Handle Connect Investor password
  const handleConnectInvestor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginNumber || !brokerServer || !investorPassword) {
      alert('Please fill in all connection parameters.');
      return;
    }

    setIsSubmitting(true);
    setSyncStatusMsg('Establishing read-only MT5 gateway session...');
    
    try {
      const res = await fetch('/api/mt5/connect-investor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: account.id,
          loginNumber,
          brokerServer,
          investorPassword,
          autoSync
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSyncStatusMsg('Creating a new dedicated portfolio account and importing historical trades...');
        
        setTimeout(() => {
          setLocalConnection(data.connection);
          setIsSubmitting(false);
          setSyncStatusMsg('');
          if (onSyncSuccess) onSyncSuccess(data.account?.id);
        }, 1200);
      } else {
        const err = await res.json();
        const errMsg = err.error || 'Failed to establish investor sync connection.';
        const hint = err.hint ? `\n\nHint: ${err.hint}` : '';
        alert(errMsg + hint);
        setIsSubmitting(false);
        setSyncStatusMsg('');
      }
    } catch (e) {
      alert('Connection error occurred.');
      setIsSubmitting(false);
      setSyncStatusMsg('');
    }
  };

  // Handle Connect MT5 Expert Advisor (automatically creates a dedicated account)
  const handleConnectEa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eaLogin || !eaBroker) {
      alert('Please fill in both MT5 Login and Broker Server fields.');
      return;
    }

    setIsSubmitting(true);
    setSyncStatusMsg('Creating a brand new dedicated portfolio account and registering MT5 token...');

    try {
      const res = await fetch('/api/mt5/connect-ea', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loginNumber: eaLogin,
          brokerName: eaBroker,
          startingBalance: parseFloat(eaBalance) || 10000.00
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSyncStatusMsg('Configuring terminal link parameters and loading MQ5 template...');
        
        setTimeout(() => {
          setLocalConnection(data.connection);
          setIsSubmitting(false);
          setSyncStatusMsg('');
          setEaLogin('');
          setEaBroker('');
          if (onSyncSuccess) onSyncSuccess(data.account?.id);
        }, 1200);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create dedicated MT5 EA connection.');
        setIsSubmitting(false);
        setSyncStatusMsg('');
      }
    } catch (e) {
      alert('Connection error occurred.');
      setIsSubmitting(false);
      setSyncStatusMsg('');
    }
  };

  // Handle manual sync now
  const handleSyncNow = async () => {
    setIsSyncingNow(true);
    setSyncStatusMsg('Connecting to MT5 bridge... fetching latest ticks...');
    
    try {
      const res = await fetch('/api/mt5/sync-investor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: account.id, investorPassword })
      });

      if (res.ok) {
        const data = await res.json();
        setSyncStatusMsg(`${data.newTradesCount ?? 0} new trades imported successfully.`);
        
        setTimeout(() => {
          setIsSyncingNow(false);
          setSyncStatusMsg('');
          if (onSyncSuccess) onSyncSuccess();
        }, 1500);
      } else {
        const err = await res.json();
        const hint = err.hint ? `\n\nHint: ${err.hint}` : '';
        alert((err.error || 'Sync failed.') + hint);
        setIsSyncingNow(false);
        setSyncStatusMsg('');
      }
    } catch (e) {
      alert('Sync failed — make sure the MT5 bridge is running.');
      setIsSyncingNow(false);
      setSyncStatusMsg('');
    }
  };

  // Handle Toggle Auto Sync
  const handleToggleAutoSync = async (checked: boolean) => {
    setAutoSync(checked);
    try {
      const res = await fetch('/api/mt5/toggle-auto-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: account.id, autoSync: checked })
      });
      if (res.ok) {
        const data = await res.json();
        setLocalConnection(data.connection);
      }
    } catch (e) {
      console.error('Error toggling auto sync:', e);
    }
  };

  // Handle Disconnect
  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect this read-only investor session? FX Journal Pro will stop updating parameters from this account.')) {
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/mt5/disconnect-investor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: account.id })
      });

      if (res.ok) {
        setLocalConnection(null);
        setLoginNumber('');
        setBrokerServer('');
        setInvestorPassword('');
        setAutoSync(true);
        if (onSyncSuccess) onSyncSuccess();
      }
    } catch (e) {
      alert('Disconnect error.');
    } finally {
      setIsLoading(false);
    }
  };

const mqlCode = `//+------------------------------------------------------------------+
//|                                            FXJournalPro_Sync_EA.mq5|
//|                               Copyright 2026, FX Journal Pro Platform|
//|                                         https://fxjournalpro.com   |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, FX Journal Pro Platform"
#property link      "https://fxjournalpro.com"
#property version   "3.00"
#property description "Synchronizes 30-day MT5 history and balance to FX Journal Pro"

input string   InpSyncToken = "${syncToken}"; // FX Journal Pro Sync Token
input string   InpApiUrl    = "${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/api/mt5/sync"; // FX Journal Pro API endpoint
input int      InpInterval  = 30; // Sync interval in seconds

// Timer initialization
int OnInit() {
   Print("[FX Journal Pro] Initializing Sync EA (History Mode)...");
   EventSetTimer(InpInterval);
   return(INIT_SUCCEEDED);
}

// Timer event trigger
void OnTimer() {
   SendTradesToFXJournalPro();
}

// Web request logic to transmit trades securely
void SendTradesToFXJournalPro() {
   datetime to_date = TimeCurrent();
   datetime from_date = to_date - (30 * 24 * 60 * 60); // 30 days history
   
   if(!HistorySelect(from_date, to_date)) {
      Print("[FX Journal Pro] Failed to load history.");
      return;
   }
   
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   
   string payload = "{\\"syncToken\\":\\"" + InpSyncToken + "\\",\\"balance\\":" + DoubleToString(balance, 2) + ",\\"trades\\":[";
   
   int total = HistoryDealsTotal();
   bool first = true;
   
   for(int i = 0; i < total; i++) {
      ulong ticket = HistoryDealGetTicket(i);
      if(ticket > 0) {
         long entry = HistoryDealGetInteger(ticket, DEAL_ENTRY);
         // Only look at OUT or INOUT deals (closed trades)
         if(entry == DEAL_ENTRY_OUT || entry == DEAL_ENTRY_INOUT) {
            string symbol = HistoryDealGetString(ticket, DEAL_SYMBOL);
            if(symbol == "") continue; // Skip non-trading operations like deposits
            
            double profit = HistoryDealGetDouble(ticket, DEAL_PROFIT);
            double volume = HistoryDealGetDouble(ticket, DEAL_VOLUME);
            double price = HistoryDealGetDouble(ticket, DEAL_PRICE);
            long typeInt = HistoryDealGetInteger(ticket, DEAL_TYPE);
            long dealTime = HistoryDealGetInteger(ticket, DEAL_TIME);
            
            // Format time for javascript: YYYY-MM-DD HH:MI
            string dateStr = TimeToString((datetime)dealTime, TIME_DATE|TIME_MINUTES);
            StringReplace(dateStr, ".", "-");
            
            // If DEAL_TYPE is BUY (0) closing, original position was SELL.
            string type = (typeInt == DEAL_TYPE_BUY) ? "Sell" : "Buy"; 
            
            if(!first) payload += ",";
            payload += "{";
            payload += "\\"symbol\\":\\"" + symbol + "\\",";
            payload += "\\"type\\":\\"" + type + "\\",";
            payload += "\\"lotSize\\":" + DoubleToString(volume, 2) + ",";
            payload += "\\"profit\\":" + DoubleToString(profit, 2) + ",";
            payload += "\\"entryPrice\\":" + DoubleToString(price, 5) + ",";
            payload += "\\"date\\":\\"" + dateStr + "\\"";
            payload += "}";
            
            first = false;
         }
      }
   }
   
   payload += "]}";
   
   char postData[];
   char resultData[];
   string headers = "Content-Type: application/json\\r\\n";
   
   StringToCharArray(payload, postData, 0, StringLen(payload));
   int timeout = 5000;
   
   string outHeaders;
   int res = WebRequest("POST", InpApiUrl, headers, timeout, postData, resultData, outHeaders);
   
   if(res == 200) {
      Print("[FX Journal Pro] Sync completed successfully. Balance: ", DoubleToString(balance, 2));
   } else {
      Print("[FX Journal Pro] Sync failed. Error Code: ", res);
   }
}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(mqlCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyToken = () => {
    navigator.clipboard.writeText(syncToken);
    alert('Synchronization Token copied to clipboard!');
  };

  return (
    <div id="mt5-instructions-section" className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm">
      
      {/* Header section with active portfolio alias status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 mb-6">
        <div>
          <span className="text-xs font-semibold bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full uppercase tracking-wider">
            MT5 Automation Center
          </span>
          <h2 className="text-xl font-bold text-slate-900 mt-2">Synchronization for "{account.name}"</h2>
          <p className="text-sm text-slate-500">Configure real-time automated data streaming and journal metrics updates.</p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs text-slate-400 block">Active Mode Status</span>
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
              localConnection?.status === 'Connected' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-600'
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${localConnection?.status === 'Connected' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
              {localConnection?.status === 'Connected' 
                ? (localConnection.isInvestorSync ? 'Investor Password Linked' : 'Expert Advisor Active') 
                : 'Not Configured'}
            </span>
          </div>
        </div>
      </div>

      {/* Modern tabbed design to select between Expert Advisor and Investor Password Cloud Sync */}
      <div className="flex border-b border-slate-100 mb-6 gap-2">
        <button
          onClick={() => { if (!isSubmitting) setActiveTab('ea'); }}
          className={`pb-3 text-xs font-bold transition-all px-4 border-b-2 ${
            activeTab === 'ea' 
              ? 'border-slate-900 text-slate-900 font-extrabold' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          📁 Method A: Expert Advisor (EA) Code
        </button>
        <button
          onClick={() => { if (!isSubmitting) setActiveTab('investor'); }}
          className={`pb-3 text-xs font-bold transition-all px-4 border-b-2 flex items-center gap-1.5 ${
            activeTab === 'investor' 
              ? 'border-slate-900 text-slate-900 font-extrabold' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          ☁️ Method B: Investor Password Sync <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase px-1.5 py-0.5 rounded">NEW (Read-Only)</span>
        </button>
      </div>

      {isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
          <RefreshCw className="h-6 w-6 animate-spin text-slate-500" />
          <p className="text-xs">Accessing trading port settings...</p>
        </div>
      ) : activeTab === 'ea' ? (
        /* METHOD A: EXPERT ADVISOR VIEW */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          {/* Step-by-Step Instructions */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Cpu className="h-4 w-4 text-blue-600" />
                Installation Steps
              </h3>
              <ol className="space-y-4 text-xs text-slate-600">
                <li className="flex gap-2">
                  <span className="flex-shrink-0 flex items-center justify-center h-5 w-5 rounded-full bg-blue-100 text-blue-600 font-bold">1</span>
                  <div>
                    <strong className="text-slate-800 block">Open MT5 Terminal</strong>
                    Navigate to <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-700">Tools &gt; MetaQuotes Language Editor</code> or press F4.
                  </div>
                </li>
                <li className="flex gap-2">
                  <span className="flex-shrink-0 flex items-center justify-center h-5 w-5 rounded-full bg-blue-100 text-blue-600 font-bold">2</span>
                  <div>
                    <strong className="text-slate-800 block">Create Expert Advisor</strong>
                    Click <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-700">New &gt; Expert Advisor (template)</code>. Name it <code className="text-blue-600 font-semibold">FXJournalPro_Sync_EA</code>.
                  </div>
                </li>
                <li className="flex gap-2">
                  <span className="flex-shrink-0 flex items-center justify-center h-5 w-5 rounded-full bg-blue-100 text-blue-600 font-bold">3</span>
                  <div>
                    <strong className="text-slate-800 block">Paste Code & Compile</strong>
                    Copy our pre-compiled integration code on the right and replace all template content in the editor. Hit <strong>Compile</strong>.
                  </div>
                </li>
                <li className="flex gap-2">
                  <span className="flex-shrink-0 flex items-center justify-center h-5 w-5 rounded-full bg-blue-100 text-blue-600 font-bold">4</span>
                  <div>
                    <strong className="text-slate-800 block">Enable WebRequests</strong>
                    In MT5 settings, check <code className="text-slate-800 font-semibold">Allow WebRequest</code> and add: <code className="bg-blue-50 px-1 text-blue-700 font-mono rounded">{typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}</code>. Drag the EA onto any active chart!
                  </div>
                </li>
              </ol>
            </div>

            {!localConnection || localConnection.isInvestorSync ? (
              <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-5">
                <h4 className="text-sm font-bold text-indigo-900 mb-1 flex items-center gap-1.5">
                  <Lock className="h-4 w-4" />
                  Connect MT5 EA Sync
                </h4>
                <p className="text-xs text-indigo-800/85 mb-4 font-medium leading-relaxed">
                  We will automatically provision a new trading account and unique API token specifically for your MT5 Expert Advisor connection.
                </p>
                <form onSubmit={handleConnectEa} className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider block mb-1">MT5 Login Number</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. 5591240"
                      value={eaLogin}
                      onChange={(e) => setEaLogin(e.target.value)}
                      className="bg-white border border-indigo-200 text-xs rounded-lg p-2.5 w-full font-mono font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider block mb-1">Broker Name</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. ICMarketsSC-MT5-2"
                      value={eaBroker}
                      onChange={(e) => setEaBroker(e.target.value)}
                      className="bg-white border border-indigo-200 text-xs rounded-lg p-2.5 w-full font-mono font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider block mb-1">Starting Balance ($)</label>
                    <input 
                      type="number" 
                      required
                      placeholder="10000.00"
                      value={eaBalance}
                      onChange={(e) => setEaBalance(e.target.value)}
                      className="bg-white border border-indigo-200 text-xs rounded-lg p-2.5 w-full font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-lg transition flex items-center justify-center gap-1.5"
                  >
                    {isSubmitting ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      "Generate MT5 Token & Account"
                    )}
                  </button>
                </form>
              </div>
            ) : (
              <>
                <div className="bg-blue-50/60 rounded-xl p-5 border border-blue-100">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2">Your Security Token</h4>
                  <p className="text-xs text-blue-700/80 mb-4">
                    Use this private token inside the EA configuration variables to authenticate your terminal.
                  </p>
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      readOnly 
                      value={syncToken}
                      className="bg-white/80 border border-blue-200 text-xs text-blue-900 font-mono rounded-lg p-2.5 flex-1 select-all"
                    />
                    <button 
                      onClick={handleCopyToken}
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-2.5 transition"
                      title="Copy Token"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Real-time Sandbox Sync Stimulator */}
                <div className="bg-emerald-50/50 rounded-xl p-5 border border-emerald-100">
                  <h4 className="text-sm font-semibold text-emerald-900 mb-2 flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-emerald-600 animate-pulse" />
                    Interactive EA Simulator
                  </h4>
                  <p className="text-xs text-emerald-700/80 mb-4">
                    Test your REST endpoint in real-time by generating simulated MetaTrader trade sync signals.
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-emerald-800 block mb-1">Target Currency Pair</label>
                      <select 
                        value={simulatedSymbol}
                        onChange={(e) => setSimulatedSymbol(e.target.value)}
                        className="bg-white border border-emerald-200 text-xs text-slate-700 rounded-lg p-2 w-full focus:ring-emerald-500 focus:border-emerald-500"
                      >
                        <option value="EURUSD">EURUSD (Euro / US Dollar)</option>
                        <option value="XAUUSD">XAUUSD (Gold Spot)</option>
                        <option value="GBPUSD">GBPUSD (Pound / US Dollar)</option>
                        <option value="USDJPY">USDJPY (US Dollar / Yen)</option>
                        <option value="BTCUSD">BTCUSD (Bitcoin)</option>
                      </select>
                    </div>
                    <button
                      disabled={isSyncing}
                      onClick={() => onTriggerSimulatedSync(simulatedSymbol)}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg py-2.5 px-4 transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSyncing ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Play className="h-3.5 w-3.5" />
                      )}
                      Simulate Trade Execution Signal
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Source Code Window */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between bg-slate-900 text-slate-300 px-4 py-2.5 rounded-t-xl border-b border-slate-800">
              <span className="text-xs font-mono text-slate-400 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                FXJournalPro_Sync_EA.mq5
              </span>
              <button
                onClick={handleCopy}
                className="hover:text-white flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 py-1 px-3 rounded transition"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy Code
                  </>
                )}
              </button>
            </div>
            <pre className="bg-slate-950 text-slate-100 font-mono text-[11px] leading-relaxed p-5 rounded-b-xl overflow-x-auto shadow-inner max-h-[480px]">
              {mqlCode}
            </pre>
          </div>
        </div>
      ) : (
        /* METHOD B: INVESTOR PASSWORD CLOUD SYNC VIEW */
        <div className="space-y-6 animate-fade-in">
          
          {/* Bridge Status Banner */}
          <div className={`border rounded-xl p-4 flex gap-3 text-xs ${
            bridgeStatus === 'running'
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
              : bridgeStatus === 'offline'
              ? 'bg-red-50/70 border-red-200 text-red-800'
              : 'bg-slate-50/70 border-slate-200 text-slate-600'
          }`}>
            <div className={`h-5 w-5 flex-shrink-0 mt-0.5 rounded-full flex items-center justify-center font-bold text-white text-[10px] ${
              bridgeStatus === 'running' ? 'bg-emerald-500' : bridgeStatus === 'offline' ? 'bg-red-500' : 'bg-slate-400'
            }`}>
              {bridgeStatus === 'running' ? '✓' : bridgeStatus === 'offline' ? '!' : '…'}
            </div>
            <div className="flex-1">
              <strong className={`block text-sm font-extrabold mb-1 ${
                bridgeStatus === 'running' ? 'text-emerald-900' : bridgeStatus === 'offline' ? 'text-red-900' : 'text-slate-700'
              }`}>
                {bridgeStatus === 'running'
                  ? `MT5 Python Bridge: Running ${bridgeConnected ? '(MT5 Connected)' : '(Ready)'}`
                  : bridgeStatus === 'offline'
                  ? 'MT5 Python Bridge: Not Running'
                  : 'Checking MT5 Python Bridge status...'}
              </strong>

              {bridgeStatus === 'offline' && (
                <div className="space-y-2 mt-2">
                  <p className="font-semibold leading-relaxed">
                    The local Python bridge is required to connect your MT5 terminal. It's free and runs on your Windows PC.
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-[11px]">
                    <li>Open a terminal in your project folder</li>
                    <li>Run: <code className="bg-red-100 px-1.5 py-0.5 rounded font-mono font-bold">cd mt5_bridge</code></li>
                    <li>Run: <code className="bg-red-100 px-1.5 py-0.5 rounded font-mono font-bold">pip install MetaTrader5 flask flask-cors</code></li>
                    <li>Run: <code className="bg-red-100 px-1.5 py-0.5 rounded font-mono font-bold">python mt5_bridge.py</code></li>
                    <li><strong>OR</strong> simply double-click <code className="bg-red-100 px-1.5 py-0.5 rounded font-mono font-bold">start_bridge.bat</code></li>
                  </ol>
                  <button
                    onClick={fetchBridgeStatus}
                    className="mt-2 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"
                  >
                    <RefreshCw className="h-3 w-3" /> Recheck Status
                  </button>
                </div>
              )}

              {bridgeStatus === 'running' && (
                <p className="leading-relaxed font-medium">
                  ✅ Your local MT5 bridge is online. Fill in your credentials below to import trades. Your investor password is <span className="underline">never</span> sent to any cloud service.
                  <button onClick={fetchBridgeStatus} className="ml-2 underline text-emerald-700 hover:text-emerald-900">Refresh</button>
                </p>
              )}
            </div>
          </div>

          {/* Security note */}
          <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-4 flex gap-3 text-xs text-blue-800">
            <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="block text-blue-900 text-sm font-extrabold mb-1">MT5 Read-Only Credentials Policy</strong>
              <p className="leading-relaxed mb-1.5 font-medium">
                JournalPro uses a <strong className="text-blue-900">local Python bridge</strong> (no cloud service) to connect your MT5 terminal with your <strong className="text-blue-900">Investor Password</strong>.
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] font-semibold text-blue-700">
                <li>Credentials go directly to your MT5 terminal — never to a 3rd party server.</li>
                <li>Investor password = read-only: no trades can be placed or modified.</li>
              </ul>
            </div>
          </div>

          {syncStatusMsg && (
            <div className="bg-slate-50 border border-slate-200 text-slate-700 p-3.5 rounded-lg text-xs font-mono flex items-center gap-2 animate-pulse">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-slate-500" />
              <span>{syncStatusMsg}</span>
            </div>
          )}

          {!localConnection || !localConnection.isInvestorSync ? (
            /* CONNECTION FORM */
            <div className="max-w-2xl mx-auto bg-slate-50/50 border border-slate-100 rounded-xl p-6">
              <h3 className="font-bold text-slate-900 text-base mb-1 flex items-center gap-2">
                <Lock className="h-5 w-5 text-indigo-600" />
                Connect to MT5 via Python Bridge
              </h3>
              <p className="text-xs text-indigo-800 mb-4 bg-indigo-50 border border-indigo-100 p-2.5 rounded-lg font-semibold flex items-center gap-1.5">
                💡 This will create a new trading account in your journal and import your last 12 months of MT5 history.
              </p>
              
              <form onSubmit={handleConnectInvestor} className="space-y-4">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">MT5 Login Number</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. 8847103"
                      value={loginNumber}
                      onChange={(e) => setLoginNumber(e.target.value)}
                      className="bg-white border border-slate-200 text-xs rounded-lg p-2.5 w-full font-mono font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Broker Server Name</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. ICMarketsSC-MT5-2"
                      value={brokerServer}
                      onChange={(e) => setBrokerServer(e.target.value)}
                      className="bg-white border border-slate-200 text-xs rounded-lg p-2.5 w-full font-mono font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Investor Password (Read-Only)</label>
                  <input 
                    type="password"
                    required
                    placeholder="Enter your broker-provided read-only password"
                    value={investorPassword}
                    onChange={(e) => setInvestorPassword(e.target.value)}
                    className="bg-white border border-slate-200 text-xs rounded-lg p-2.5 w-full font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Ensure this is the Investor Password. Keep your main master password completely secure.</p>
                </div>

                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-100">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800">Auto synchronization (Every 30m)</span>
                    <span className="text-[10px] text-slate-400">Silently stream closed execution records automatically in background.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAutoSync(!autoSync)}
                    className="text-slate-600 hover:text-slate-900 transition"
                  >
                    <div className={`w-11 h-6 rounded-full p-0.5 transition-colors ${autoSync ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                      <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${autoSync ? 'translate-x-5' : 'translate-x-0'}`}></div>
                    </div>
                  </button>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 px-6 rounded-lg transition flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        Establishing Bridge...
                      </>
                    ) : 'Connect Account Now'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* SUCCESSFUL CONNECTION STATUS & OPERATIONS DASHBOARD */
            <div className="space-y-6">
              
              {/* Main sync card */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl">
                    <CheckCircle className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                      MT5 Investor Feed Connected
                      <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Live &amp; Synced</span>
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Broker Server: <span className="font-mono bg-white px-1 py-0.5 border border-slate-200 rounded text-slate-700">{localConnection.brokerServer}</span> • Login ID: <span className="font-mono bg-white px-1 py-0.5 border border-slate-200 rounded text-slate-700">{localConnection.loginNumber}</span>
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Last sync verified: {localConnection.lastSyncTime ? new Date(localConnection.lastSyncTime).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Operations buttons */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 mr-2 border-r border-slate-200 pr-4">
                    <span className="text-xs font-bold text-slate-600">Auto-Sync</span>
                    <button
                      type="button"
                      onClick={() => handleToggleAutoSync(!autoSync)}
                      className="text-slate-600 hover:text-slate-900 transition"
                    >
                      <div className={`w-9 h-5 rounded-full p-0.5 transition-colors ${autoSync ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${autoSync ? 'translate-x-4' : 'translate-x-0'}`}></div>
                      </div>
                    </button>
                  </div>

                  <button
                    onClick={handleSyncNow}
                    disabled={isSyncingNow}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-4 rounded-lg transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isSyncingNow ? 'animate-spin' : ''}`} />
                    Sync Now
                  </button>

                  <button
                    onClick={handleDisconnect}
                    className="border border-rose-200 hover:bg-rose-50 text-rose-600 font-bold text-xs py-2 px-4 rounded-lg transition flex items-center gap-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Disconnect Account
                  </button>
                </div>
              </div>

              {/* Grid showing live mock telemetry indicators */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-semibold">Active Balance &amp; Equity</span>
                    <Coins className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-lg font-black text-slate-800">
                      ${account.currentBalance.toLocaleString()}
                    </div>
                    <div className="text-xs font-bold text-slate-500">
                      Equity: <span className="text-emerald-600">${account.equity.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-semibold">Open Positions</span>
                    <Activity className="h-4 w-4 text-indigo-500" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-lg font-black text-slate-800">
                      1 Active Position
                    </div>
                    <div className="text-xs text-emerald-600 font-extrabold">
                      EURUSD Buy 1.00 Lot (+${(120.50).toFixed(2)})
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-semibold">Pending Orders</span>
                    <FileText className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-lg font-black text-slate-800">
                      1 Pending Limit
                    </div>
                    <div className="text-xs text-slate-500 font-bold">
                      XAUUSD Buy Limit @ 2305.00
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-semibold">Max Drawdown Stat</span>
                    <TrendingUp className="h-4 w-4 text-rose-500" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-lg font-black text-rose-600">
                      -2.45%
                    </div>
                    <div className="text-xs text-slate-500 font-bold">
                      Within risk parameters limit
                    </div>
                  </div>
                </div>

              </div>

              {/* Logs simulation console */}
              <div className="bg-slate-900 rounded-xl p-4 text-slate-300 font-mono text-[10px] space-y-1.5 border border-slate-800 shadow-inner">
                <div className="text-slate-500 flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                  <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[9px] text-slate-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Gateway Server Connection Log
                  </span>
                  <span>SSL v3 Encryption Active</span>
                </div>
                <div className="text-emerald-400">[SYSTEM] Connection established with {localConnection.brokerServer}</div>
                <div>[AUTH] Logged in successfully with investor account ID: {localConnection.loginNumber}</div>
                <div>[SYNC] Syncing closed trade history, fetched {localConnection.totalSyncedTrades} records successfully.</div>
                <div>[STREAM] Subscribed to real-time client state changes for Portfolio "{account.name}".</div>
                <div className="text-slate-500">[HEARTBEAT] ping response 42ms - connection healthy.</div>
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  );
}
