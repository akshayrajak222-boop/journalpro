import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import { 
  User, 
  TradingAccount, 
  Trade, 
  RiskSettings, 
  SupportTicket, 
  Announcement, 
  MT5Connection, 
  PaymentHistory 
} from './src/types.js';
import { createClient } from '@supabase/supabase-js';

// Absolute file paths for database persistence
const DB_FILE = path.join(process.cwd(), 'db.json');

// Supabase Client Configuration
let supabase: any = null;
let useSupabase = false;

try {
  let supabaseUrl = process.env.SUPABASE_URL?.trim() || process.env.VITE_SUPABASE_URL?.trim();
  let supabaseKey = process.env.SUPABASE_KEY?.trim() || process.env.VITE_SUPABASE_KEY?.trim();

  // Strip wrapping quotes if any (common in some env setups)
  if (supabaseUrl?.startsWith('"') && supabaseUrl?.endsWith('"')) {
    supabaseUrl = supabaseUrl.slice(1, -1);
  }
  if (supabaseUrl?.startsWith("'") && supabaseUrl?.endsWith("'")) {
    supabaseUrl = supabaseUrl.slice(1, -1);
  }
  if (supabaseKey?.startsWith('"') && supabaseKey?.endsWith('"')) {
    supabaseKey = supabaseKey.slice(1, -1);
  }
  if (supabaseKey?.startsWith("'") && supabaseKey?.endsWith("'")) {
    supabaseKey = supabaseKey.slice(1, -1);
  }

  if (supabaseUrl && !supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
    if (/^[a-zA-Z0-9_-]+$/.test(supabaseUrl)) {
      console.log(`[AxyFx Journal Server] Raw Supabase project reference "${supabaseUrl}" detected. Automatically expanding to "https://${supabaseUrl}.supabase.co"`);
      supabaseUrl = `https://${supabaseUrl}.supabase.co`;
    }
  }

  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
    useSupabase = true;
    console.log('[AxyFx Journal Server] Supabase integration ENABLED!');
  } else {
    console.log('[AxyFx Journal Server] Supabase integration DISABLED. Falling back to local db.json');
  }
} catch (err) {
  console.error('[AxyFx Journal Server] Failed to initialize Supabase client:', err);
  useSupabase = false;
  supabase = null;
}

// ==========================================
// MT5 Python Bridge Configuration
// A local Python Flask server (mt5_bridge/mt5_bridge.py) that connects
// to your running MT5 terminal via the official MetaTrader5 Python package.
// Free alternative to MetaApi cloud (which now requires paid credits).
// ==========================================
const MT5_BRIDGE_URL = process.env.MT5_BRIDGE_URL || 'http://127.0.0.1:5005';

// Helper: check if the Python bridge is running
async function checkBridgeHealth(): Promise<{ ok: boolean; connected: boolean; message: string }> {
  try {
    const res = await fetch(`${MT5_BRIDGE_URL}/health`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return { ok: false, connected: false, message: 'Bridge returned non-200' };
    const data = await res.json();
    return { ok: true, connected: data.connected === true, message: 'Bridge is running' };
  } catch (e: any) {
    return { ok: false, connected: false, message: `Bridge not reachable: ${e?.message}` };
  }
}

// Helper: call the Python bridge
async function bridgeFetch(path: string, options: any = {}) {
  const url = `${MT5_BRIDGE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    signal: AbortSignal.timeout(30000)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Bridge error ${res.status}`);
  return data;
}

// Helper: map a MetaAPI deal to our journal trade format
function mapDealToTrade(deal: any, accountId: string) {
  // Only import actual trade deals (buy/sell), skip deposits/withdrawals
  if (!deal.symbol) return null;
  const type = deal.type === 'DEAL_TYPE_BUY' ? 'Buy' :
               deal.type === 'DEAL_TYPE_SELL' ? 'Sell' : null;
  if (!type) return null;
  return {
    id: `metaapi_deal_${deal.id || Date.now()}_${Math.random().toString(36).slice(2,7)}`,
    accountId,
    date: deal.time || new Date().toISOString(),
    symbol: (deal.symbol || 'UNKNOWN').toUpperCase(),
    type,
    lotSize: parseFloat(deal.volume) || 0,
    entryPrice: parseFloat(deal.price) || 0,
    exitPrice: parseFloat(deal.price) || 0,
    profit: parseFloat(deal.profit) || 0,
    commission: parseFloat(deal.commission) || 0,
    swap: parseFloat(deal.swap) || 0,
    riskPercentage: 1.0,
    strategy: 'MetaAPI Sync',
    emotion: 'Calm' as any,
    notes: deal.comment || 'Imported from MT5 via MetaAPI',
    tags: ['MT5 Sync', 'MetaAPI'],
    isMt5Sync: true
  };
}

// Helper to load database from local file (always self-healing and bulletproof)
function loadDatabaseFromFile() {
  const initialDB = {
    users: [
      {
        id: 'user_admin',
        email: 'admin@axyfx.com',
        name: 'AxyFx Admin',
        experience: 'Professional',
        tradingStyle: 'Day Trading',
        mainMarkets: ['Forex', 'Gold'],
        onboardingCompleted: true,
        isPro: true
      },
      {
        id: 'user_akshay',
        email: 'akshayrajpanamthode@gmail.com',
        name: 'Akshay Raj',
        experience: 'Intermediate',
        tradingStyle: 'Day Trading',
        mainMarkets: ['Forex', 'Gold', 'Indices'],
        onboardingCompleted: true,
        isPro: false
      }
    ] as User[],
    accounts: [
      {
        id: 'acc_1',
        userId: 'user_akshay',
        name: 'My Primary Live',
        broker: 'IC Markets',
        platform: 'MT5',
        accountType: 'Live',
        currency: 'USD',
        startingBalance: 10000,
        currentBalance: 11420,
        equity: 11420,
        status: 'Active'
      }
    ] as TradingAccount[],
    trades: [
      {
        id: 't_1',
        accountId: 'acc_1',
        date: '2026-07-01T14:30:00Z',
        symbol: 'EURUSD',
        type: 'Buy',
        lotSize: 1.0,
        entryPrice: 1.08500,
        exitPrice: 1.09200,
        stopLoss: 1.08200,
        takeProfit: 1.09500,
        profit: 700,
        commission: -7,
        swap: -1.5,
        riskPercentage: 1.5,
        strategy: 'Order Block Rejection',
        emotion: 'Calm',
        notes: 'Standard buy at support levels. Perfect execution.',
        tags: ['Scalping', 'Breakout']
      },
      {
        id: 't_2',
        accountId: 'acc_1',
        date: '2026-07-02T09:15:00Z',
        symbol: 'XAUUSD',
        type: 'Sell',
        lotSize: 0.5,
        entryPrice: 2320.00,
        exitPrice: 2312.00,
        stopLoss: 2325.00,
        takeProfit: 2300.00,
        profit: 400,
        commission: -3.5,
        swap: 0,
        riskPercentage: 1.0,
        strategy: 'Daily Pivot Reversal',
        emotion: 'Calm',
        notes: 'Gold rejected daily highs, targets reached quickly.',
        tags: ['Breakout']
      },
      {
        id: 't_3',
        accountId: 'acc_1',
        date: '2026-07-03T16:00:00Z',
        symbol: 'GBPUSD',
        type: 'Buy',
        lotSize: 1.5,
        entryPrice: 1.26400,
        exitPrice: 1.26150,
        stopLoss: 1.26200,
        takeProfit: 1.27200,
        profit: -375,
        commission: -10.5,
        swap: -4,
        riskPercentage: 2.0,
        strategy: 'EMA Cross',
        emotion: 'Anxious',
        notes: 'Violated risk parameters slightly, got stopped out early.',
        tags: ['FOMO', 'Revenge Trade']
      },
      {
        id: 't_4',
        accountId: 'acc_1',
        date: '2026-07-05T11:45:00Z',
        symbol: 'EURUSD',
        type: 'Sell',
        lotSize: 2.0,
        entryPrice: 1.09100,
        exitPrice: 1.09450,
        stopLoss: 1.09300,
        takeProfit: 1.08200,
        profit: -700,
        commission: -14,
        swap: 0,
        riskPercentage: 3.0,
        strategy: 'Order Block Rejection',
        emotion: 'Revenge',
        notes: 'Entered in anger after losing trade, completely broke rules.',
        tags: ['Revenge Trade', 'FOMO']
      },
      {
        id: 't_5',
        accountId: 'acc_1',
        date: '2026-07-07T13:00:00Z',
        symbol: 'USDJPY',
        type: 'Buy',
        lotSize: 1.2,
        entryPrice: 156.20,
        exitPrice: 157.40,
        stopLoss: 155.80,
        takeProfit: 158.00,
        profit: 910,
        commission: -8.4,
        swap: 1.2,
        riskPercentage: 1.5,
        strategy: 'Trend Continuation',
        emotion: 'Calm',
        notes: 'Strong daily trend buy, excellent profit run.',
        tags: ['Breakout']
      },
      {
        id: 't_6',
        accountId: 'acc_1',
        date: '2026-07-09T18:30:00Z',
        symbol: 'XAUUSD',
        type: 'Buy',
        lotSize: 0.8,
        entryPrice: 2345.00,
        exitPrice: 2351.50,
        stopLoss: 2340.00,
        takeProfit: 2365.00,
        profit: 520,
        commission: -5.6,
        swap: 0,
        riskPercentage: 1.2,
        strategy: 'Daily Pivot Reversal',
        emotion: 'Excited',
        notes: 'Gold bounce on London-New York overlap.',
        tags: ['News Trade']
      }
    ] as Trade[],
    riskSettings: [
      {
        id: 'r_1',
        accountId: 'acc_1',
        riskPerTradeLimit: 2.0,
        dailyLossLimit: 500,
        weeklyLossLimit: 1500,
        maxDrawdownLimit: 10.0,
        disciplineEnabled: true
      }
    ] as RiskSettings[],
    supportTickets: [
      {
        id: 'ticket_1',
        userId: 'user_akshay',
        userEmail: 'akshayrajpanamthode@gmail.com',
        title: 'MT5 Sync query',
        description: 'Does IC Markets support MT5 EA connection on free plan?',
        status: 'Open',
        category: 'MT5 Sync',
        date: '2026-07-10T12:00:00Z'
      }
    ] as SupportTicket[],
    announcements: [
      {
        id: 'ann_1',
        title: 'Introducing AxyFx Journal Pro V2.5',
        content: 'We have updated our Expert Advisor synchronizer. Trade execution speeds are now logged with sub-millisecond precision directly to your dashboard. Upgrade today to unlock advanced AI insight generation!',
        date: '2026-07-11T10:00:00Z'
      }
    ] as Announcement[],
    mt5Connections: [
      {
        id: 'conn_1',
        userId: 'user_akshay',
        accountId: 'acc_1',
        brokerName: 'IC Markets',
        status: 'Connected',
        lastSyncTime: '2026-07-11T12:00:00Z',
        syncToken: 'axy_token_88291_akshay',
        totalSyncedTrades: 4
      }
    ] as MT5Connection[],
    payments: [] as PaymentHistory[]
  };

  try {
    if (fs.existsSync(DB_FILE)) {
      const dataStr = fs.readFileSync(DB_FILE, 'utf-8');
      if (dataStr && dataStr.trim()) {
        const parsed = JSON.parse(dataStr);
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.users)) {
          return parsed;
        }
      }
    }
  } catch (err) {
    console.error('[AxyFx Journal Server] Error reading local db.json file, using seed data:', err);
  }

  // Best-effort local file write
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDB, null, 2), 'utf-8');
  } catch (err) {
    // Ignore read-only filesystem issues
  }

  return initialDB;
}

let db: any = null;
let isLoaded = false;

// Loader and saver specifically for user-scoped databases on Supabase
async function ensureUserDbLoaded(email: string) {
  const normalizedEmail = email.toLowerCase().trim();
  const dbKey = `db_json_${normalizedEmail}`;

  if (db && db.users && db.users.some((u: any) => u.email.toLowerCase() === normalizedEmail)) {
    return db;
  }

  if (useSupabase) {
    try {
      console.log(`[AxyFx Journal Server] Loading database from Supabase for user: ${normalizedEmail}...`);
      const { data, error } = await supabase!
        .from('journal_settings')
        .select('value')
        .eq('key', dbKey)
        .maybeSingle();

      if (error) {
        console.error(`[AxyFx Journal Server] Supabase query error for ${normalizedEmail}:`, error);
        return loadDatabaseFromFile();
      } else if (!data) {
        console.log(`[AxyFx Journal Server] No database found in Supabase for user: ${normalizedEmail}. Initializing new user DB...`);
        const initial = loadDatabaseFromFile();
        
        // Setup fresh data for this specific user
        initial.users = [{
          id: `user_${Date.now()}`,
          email: normalizedEmail,
          name: normalizedEmail.split('@')[0],
          experience: 'Intermediate',
          tradingStyle: 'Day Trading',
          mainMarkets: ['Forex', 'Gold'],
          onboardingCompleted: false,
          isPro: false
        }];
        initial.accounts = [];
        initial.trades = [];
        initial.riskSettings = [];
        initial.supportTickets = [];
        initial.mt5Connections = [];
        initial.payments = [];

        await supabase!
          .from('journal_settings')
          .upsert({ key: dbKey, value: initial });
        
        return initial;
      } else {
        console.log(`[AxyFx Journal Server] Loaded database for user: ${normalizedEmail} from Supabase successfully!`);
        return data.value;
      }
    } catch (err: any) {
      console.error(`[AxyFx Journal Server] Failed to load user database from Supabase for ${normalizedEmail}:`, err);
      return loadDatabaseFromFile();
    }
  } else {
    return loadDatabaseFromFile();
  }
}

async function ensureDbLoaded() {
  if (isLoaded && db && db.users && Array.isArray(db.users)) return db;

  if (useSupabase) {
    try {
      console.log('[AxyFx Journal Server] Loading database from Supabase...');
      const { data, error } = await supabase!
        .from('journal_settings')
        .select('value')
        .eq('key', 'db_json')
        .maybeSingle();

      if (error) {
        console.error('[AxyFx Journal Server] Supabase query error, falling back to local file:', error);
        if (error.message && (error.message.includes('relation "journal_settings" does not exist') || error.code === '42P01')) {
          console.warn('\n============================================================\n' +
                       '   ACTION REQUIRED: SUPABASE TABLE "journal_settings" MISSING\n' +
                       '============================================================\n' +
                       'Please run the following SQL query in your Supabase SQL Editor\n' +
                       'to create the required table for data persistence:\n\n' +
                       'CREATE TABLE IF NOT EXISTS journal_settings (\n' +
                       '  key text PRIMARY KEY,\n' +
                       '  value jsonb DEFAULT \'{}\'::jsonb,\n' +
                       '  created_at timestamp with time zone DEFAULT timezone(\'utc\'::text, now()) NOT NULL\n' +
                       ');\n\n' +
                       'This will enable seamless database persistence on Vercel!\n' +
                       '============================================================\n');
        }
        db = loadDatabaseFromFile();
      } else if (!data) {
        console.log('[AxyFx Journal Server] No data found in Supabase. Seeding initial database...');
        const initial = loadDatabaseFromFile();
        await supabase!.from('journal_settings').insert({ key: 'db_json', value: initial });
        db = initial;
      } else {
        db = data.value;
        console.log('[AxyFx Journal Server] Loaded database from Supabase successfully!');
      }
    } catch (err: any) {
      console.error('[AxyFx Journal Server] Failed to load database from Supabase, falling back:', err);
      db = loadDatabaseFromFile();
    }
  } else {
    db = loadDatabaseFromFile();
  }

  // Validate loaded db structure and self-heal if corrupted or incomplete
  if (!db || typeof db !== 'object' || !Array.isArray(db.users)) {
    console.warn('[AxyFx Journal Server] Loaded database is invalid or lacks users array. Self-healing with default seed data...');
    db = loadDatabaseFromFile();
    if (useSupabase) {
      // Background async update to heal the record in Supabase
      supabase!
        .from('journal_settings')
        .upsert({ key: 'db_json', value: db })
        .then(({ error }: { error: any }) => {
          if (error) console.error('[AxyFx Journal Server] Supabase database healing upsert error:', error);
          else console.log('[AxyFx Journal Server] Supabase database healed successfully!');
        })
        .catch((err: any) => console.error('[AxyFx Journal Server] Exception healing database:', err));
    }
  }

  isLoaded = true;
  return db;
}

async function saveDatabase(data: any, overrideEmail?: string) {
  db = data;
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    // Ignore read-only filesystem issues
  }

  if (useSupabase) {
    const activeEmail = overrideEmail || currentUser?.email || data.users?.[0]?.email;
    if (activeEmail) {
      const normalizedEmail = activeEmail.toLowerCase().trim();
      try {
        const { error } = await supabase!
          .from('journal_settings')
          .upsert({ key: `db_json_${normalizedEmail}`, value: data });
        if (error) {
          console.error(`[AxyFx Journal Server] Supabase save error for ${normalizedEmail}:`, error);
        } else {
          console.log(`[AxyFx Journal Server] Saved user database for ${normalizedEmail} to Supabase successfully!`);
        }
      } catch (err) {
        console.error(`[AxyFx Journal Server] Exception saving to Supabase for ${normalizedEmail}:`, err);
      }
    } else {
      try {
        const { error } = await supabase!
          .from('journal_settings')
          .upsert({ key: 'db_json', value: data });
      } catch (err) {}
    }
  }
}

const app = express();
const PORT = 3000;

  // Middleware
  app.use(express.json({ limit: '15mb' }));

  // Helper auth session simulation (simplest session cookies or custom token validation via headers)
  let currentUser: User | null = null;

  // Global middleware to load database and set local user context
  app.use(async (req, res, next) => {
    try {
      // Always try to resolve user from x-auth-email header first
      const authEmail = req.headers['x-auth-email'] as string | undefined;
      
      if (authEmail) {
        const email = authEmail.toLowerCase().trim();
        db = await ensureUserDbLoaded(email);
        
        let dbUser = db.users.find((u: any) => u.email.toLowerCase() === email);
        if (!dbUser) {
          dbUser = {
            id: `user_${Date.now()}`,
            email: email,
            name: email.split('@')[0],
            experience: 'Intermediate',
            tradingStyle: 'Day Trading',
            mainMarkets: ['Forex', 'Gold'],
            onboardingCompleted: false,
            isPro: false
          };
          db.users.push(dbUser);
          await saveDatabase(db);
        }
        currentUser = dbUser;
      } else {
        await ensureDbLoaded();
        currentUser = null;
      }

      next();
    } catch (err) {
      console.error('[AxyFx Journal Server] Middleware execution error:', err);
      next(err);
    }
  });

  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, name, password } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const normalizedEmail = email.toLowerCase().trim();
      db = await ensureUserDbLoaded(normalizedEmail);

      let user = db.users.find((u: any) => u.email.toLowerCase() === normalizedEmail);
      if (!user) {
        user = {
          id: `user_${Date.now()}`,
          email: normalizedEmail,
          name: name || normalizedEmail.split('@')[0],
          password: password || '',
          experience: 'Intermediate',
          tradingStyle: 'Day Trading',
          mainMarkets: ['Forex', 'Gold'],
          onboardingCompleted: false,
          isPro: false
        };
        db.users.push(user);
      } else if (name) {
        user.name = name;
        if (password) user.password = password;
      }

      currentUser = user;
      await saveDatabase(db, normalizedEmail);

      res.json({ message: 'Registration successful', user });
    } catch (err: any) {
      console.error('[AxyFx Journal Server] Register endpoint error:', err);
      res.status(500).json({ error: `Server register error: ${err?.message || err}` });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const normalizedEmail = email.toLowerCase().trim();
      db = await ensureUserDbLoaded(normalizedEmail);

      let user = db.users.find((u: any) => u.email.toLowerCase() === normalizedEmail);
      if (!user) {
        user = {
          id: `user_${Date.now()}`,
          email: normalizedEmail,
          name: normalizedEmail.split('@')[0],
          password: password || '',
          experience: 'Intermediate',
          tradingStyle: 'Day Trading',
          mainMarkets: ['Forex', 'Gold'],
          onboardingCompleted: false,
          isPro: false
        };
        db.users.push(user);
      }

      currentUser = user;
      await saveDatabase(db, normalizedEmail);

      res.json({ message: 'Login successful', user });
    } catch (err: any) {
      console.error('[AxyFx Journal Server] Login endpoint error:', err);
      res.status(500).json({ error: `Server login error: ${err?.message || err}` });
    }
  });

  app.get('/api/auth/me', async (req, res) => {
    const authEmail = req.headers['x-auth-email'] as string | undefined;
    if (authEmail) {
      const email = authEmail.toLowerCase().trim();
      db = await ensureUserDbLoaded(email);
      const dbUser = db.users.find((u: any) => u.email.toLowerCase() === email);
      if (dbUser) {
        currentUser = dbUser;
        return res.json({ user: currentUser });
      }
    }

    if (currentUser) {
      return res.json({ user: currentUser });
    }

    return res.status(401).json({ error: 'Not authenticated' });
  });

  app.post('/api/auth/onboarding', (req, res) => {
    if (!currentUser) return res.status(401).json({ error: 'Not authenticated' });
    const { experience, tradingStyle, markets } = req.body;

    const userIdx = db.users.findIndex((u: any) => u.id === currentUser?.id);
    if (userIdx !== -1) {
      db.users[userIdx].experience = experience;
      db.users[userIdx].tradingStyle = tradingStyle;
      db.users[userIdx].mainMarkets = markets;
      db.users[userIdx].onboardingCompleted = true;
      db.users[userIdx].onboardingData = { experience, tradingStyle, markets };
      
      // Auto-create a default trading account for new users during onboarding
      const userAccounts = db.accounts.filter((acc: any) => acc.userId === currentUser?.id);
      if (userAccounts.length === 0) {
        const newAcc: TradingAccount = {
          id: `acc_${Date.now()}`,
          userId: currentUser.id,
          name: 'Primary Trading Account',
          broker: 'MT5 Demo Broker',
          platform: 'MT5',
          accountType: 'Demo',
          currency: 'USD',
          startingBalance: 10000,
          currentBalance: 10000,
          equity: 10000,
          status: 'Active'
        };
        db.accounts.push(newAcc);

        // Add a starter Risk Setting
        const newRisk: RiskSettings = {
          id: `r_${Date.now()}`,
          accountId: newAcc.id,
          riskPerTradeLimit: 2.0,
          dailyLossLimit: 500,
          weeklyLossLimit: 1500,
          maxDrawdownLimit: 10.0,
          disciplineEnabled: true,
          maxTradesPerDay: 5
        };
        db.riskSettings.push(newRisk);
      }

      saveDatabase(db);
      currentUser = db.users[userIdx];
      res.json({ message: 'Onboarding completed successfully', user: currentUser });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  });

  app.post('/api/auth/update-profile', (req, res) => {
    if (!currentUser) return res.status(401).json({ error: 'Not authenticated' });
    const { name, email, isPro } = req.body;

    const userIdx = db.users.findIndex((u: any) => u.id === currentUser?.id);
    if (userIdx !== -1) {
      if (name) db.users[userIdx].name = name;
      if (email) db.users[userIdx].email = email;
      if (typeof isPro === 'boolean') db.users[userIdx].isPro = isPro;
      
      saveDatabase(db);
      currentUser = db.users[userIdx];
      res.json({ message: 'Profile updated successfully', user: currentUser });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  });

  // ==========================================
  // TRADING ACCOUNTS ROUTES
  // ==========================================

  app.get('/api/accounts', (req, res) => {
    if (!currentUser) return res.json({ accounts: [] });
    const userAccounts = db.accounts.filter((acc: any) => acc.userId === currentUser?.id);
    res.json({ accounts: userAccounts });
  });

  app.post('/api/accounts', (req, res) => {
    if (!currentUser) return res.status(401).json({ error: 'Not authenticated' });
    
    // Plan enforcement
    const userAccounts = db.accounts.filter((acc: any) => acc.userId === currentUser?.id);
    if (!currentUser.isPro && userAccounts.length >= 1) {
      return res.status(403).json({ 
        error: 'Free Plan limits you to 1 trading account. Upgrade to Pro for unlimited accounts!',
        limitReached: true
      });
    }

    const { name, broker, platform, accountType, currency, startingBalance } = req.body;
    if (!name || !broker || !startingBalance) {
      return res.status(400).json({ error: 'Missing account fields' });
    }

    const newAcc: TradingAccount = {
      id: `acc_${Date.now()}`,
      userId: currentUser.id,
      name,
      broker,
      platform: platform || 'MT5',
      accountType: accountType || 'Live',
      currency: currency || 'USD',
      startingBalance: parseFloat(startingBalance),
      currentBalance: parseFloat(startingBalance),
      equity: parseFloat(startingBalance),
      status: 'Active'
    };

    db.accounts.push(newAcc);

    // Create defaults risk settings
    const newRisk: RiskSettings = {
      id: `r_${Date.now()}`,
      accountId: newAcc.id,
      riskPerTradeLimit: 2.0,
      dailyLossLimit: parseFloat(startingBalance) * 0.05, // 5% default
      weeklyLossLimit: parseFloat(startingBalance) * 0.10, // 10% default
      maxDrawdownLimit: 10.0,
      disciplineEnabled: true,
      maxTradesPerDay: 5
    };
    db.riskSettings.push(newRisk);

    saveDatabase(db);
    res.json({ message: 'Trading account created', account: newAcc });
  });

  app.put('/api/accounts/:id', (req, res) => {
    if (!currentUser) return res.status(401).json({ error: 'Not authenticated' });
    const { id } = req.params;
    const { name, broker, status, currentBalance, equity, currency, startingBalance } = req.body;

    const accIdx = db.accounts.findIndex((acc: any) => acc.id === id && acc.userId === currentUser?.id);
    if (accIdx !== -1) {
      if (name) db.accounts[accIdx].name = name;
      if (broker) db.accounts[accIdx].broker = broker;
      if (status) db.accounts[accIdx].status = status;
      if (currency) db.accounts[accIdx].currency = currency;
      if (startingBalance !== undefined) db.accounts[accIdx].startingBalance = parseFloat(startingBalance);
      if (currentBalance !== undefined) db.accounts[accIdx].currentBalance = parseFloat(currentBalance);
      if (equity !== undefined) db.accounts[accIdx].equity = parseFloat(equity);

      saveDatabase(db);
      res.json({ message: 'Account updated successfully', account: db.accounts[accIdx] });
    } else {
      res.status(404).json({ error: 'Account not found' });
    }
  });

  app.delete('/api/accounts/:id', (req, res) => {
    if (!currentUser) return res.status(401).json({ error: 'Not authenticated' });
    const { id } = req.params;

    const initialLength = db.accounts.length;
    db.accounts = db.accounts.filter((acc: any) => !(acc.id === id && acc.userId === currentUser?.id));
    
    if (db.accounts.length < initialLength) {
      // Clean up trades associated with this account
      db.trades = db.trades.filter((t: any) => t.accountId !== id);
      db.riskSettings = db.riskSettings.filter((r: any) => r.accountId !== id);
      saveDatabase(db);
      res.json({ message: 'Account and associated trades deleted successfully' });
    } else {
      res.status(404).json({ error: 'Account not found' });
    }
  });

  // ==========================================
  // TRADING JOURNAL / TRADES ROUTES
  // ==========================================

  app.get('/api/trades', async (req, res) => {
    const { accountId } = req.query;
    if (!accountId) {
      return res.status(400).json({ error: 'accountId query param is required' });
    }

    const authEmail = req.headers['x-auth-email'] as string | undefined;
    if (authEmail) {
      db = await ensureUserDbLoaded(authEmail);
    }

    // Verify account ownership
    const account = db.accounts.find((acc: any) => acc.id === accountId);
    if (!account) {
      return res.status(404).json({ error: 'Trading account not found' });
    }

    const accountTrades = db.trades.filter((t: any) => t.accountId === accountId);
    // Sort descending by date
    accountTrades.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json({ trades: accountTrades });
  });

  app.post('/api/trades', async (req, res) => {
    const authEmail = req.headers['x-auth-email'] as string | undefined;
    if (authEmail) {
      db = await ensureUserDbLoaded(authEmail);
    }

    if (!currentUser) return res.status(401).json({ error: 'Not authenticated' });
    const { 
      accountId, 
      date, 
      symbol, 
      type, 
      lotSize, 
      entryPrice, 
      exitPrice, 
      stopLoss, 
      takeProfit, 
      profit, 
      commission, 
      swap, 
      riskPercentage, 
      strategy, 
      emotion, 
      notes, 
      screenshot, 
      tags 
    } = req.body;

    if (!accountId || !symbol || !type || !lotSize || !entryPrice || !exitPrice || profit === undefined) {
      return res.status(400).json({ error: 'Missing required trade parameters' });
    }

    // Verify ownership
    const accountIdx = db.accounts.findIndex((acc: any) => acc.id === accountId && acc.userId === currentUser?.id);
    if (accountIdx === -1) {
      return res.status(404).json({ error: 'Trading account not found or access denied' });
    }

    // Prevent immediate accidental double clicks (2 seconds window)
    const nowMs = Date.now();
    const duplicateExists = db.trades.some((t: any) => 
      t.accountId === accountId &&
      t.symbol === symbol.toUpperCase() &&
      t.type === type &&
      t.entryPrice === parseFloat(entryPrice) &&
      t.profit === parseFloat(profit) &&
      nowMs - new Date(t.date).getTime() < 2000 // within 2 seconds
    );

    if (duplicateExists) {
      return res.status(400).json({ error: 'Duplicate trade submission detected. Please wait a moment.' });
    }

    const newTrade: Trade = {
      id: `trade_${Date.now()}`,
      accountId,
      date: date || new Date().toISOString(),
      symbol: symbol.toUpperCase(),
      type,
      lotSize: parseFloat(lotSize),
      entryPrice: parseFloat(entryPrice),
      exitPrice: parseFloat(exitPrice),
      stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
      takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
      profit: parseFloat(profit),
      commission: commission ? parseFloat(commission) : 0,
      swap: swap ? parseFloat(swap) : 0,
      riskPercentage: riskPercentage ? parseFloat(riskPercentage) : 1.0,
      strategy: strategy || 'Unspecified',
      emotion: emotion || 'Calm',
      notes: notes || '',
      screenshot: screenshot || '',
      tags: tags || []
    };

    db.trades.push(newTrade);

    // Update account current balance
    const netProfit = newTrade.profit + newTrade.commission + newTrade.swap;
    db.accounts[accountIdx].currentBalance = parseFloat((db.accounts[accountIdx].currentBalance + netProfit).toFixed(2));
    db.accounts[accountIdx].equity = db.accounts[accountIdx].currentBalance;

    await saveDatabase(db);
    res.json({ message: 'Trade logged successfully', trade: newTrade, updatedAccount: db.accounts[accountIdx] });
  });

  app.put('/api/trades/:id', async (req, res) => {
    const authEmail = req.headers['x-auth-email'] as string | undefined;
    if (authEmail) {
      db = await ensureUserDbLoaded(authEmail);
    }

    if (!currentUser) return res.status(401).json({ error: 'Not authenticated' });
    const { id } = req.params;
    const updateData = req.body;

    const tradeIdx = db.trades.findIndex((t: any) => t.id === id);
    if (tradeIdx === -1) return res.status(404).json({ error: 'Trade not found' });

    const trade = db.trades[tradeIdx];
    // Verify ownership
    const account = db.accounts.find((acc: any) => acc.id === trade.accountId && acc.userId === currentUser?.id);
    if (!account) return res.status(403).json({ error: 'Access denied' });

    // If profit updated, adjust account balance
    const oldNet = trade.profit + (trade.commission || 0) + (trade.swap || 0);
    
    // Update trade fields
    if (updateData.symbol) db.trades[tradeIdx].symbol = updateData.symbol.toUpperCase();
    if (updateData.type) db.trades[tradeIdx].type = updateData.type;
    if (updateData.lotSize !== undefined) db.trades[tradeIdx].lotSize = parseFloat(updateData.lotSize);
    if (updateData.entryPrice !== undefined) db.trades[tradeIdx].entryPrice = parseFloat(updateData.entryPrice);
    if (updateData.exitPrice !== undefined) db.trades[tradeIdx].exitPrice = parseFloat(updateData.exitPrice);
    if (updateData.stopLoss !== undefined) db.trades[tradeIdx].stopLoss = updateData.stopLoss ? parseFloat(updateData.stopLoss) : undefined;
    if (updateData.takeProfit !== undefined) db.trades[tradeIdx].takeProfit = updateData.takeProfit ? parseFloat(updateData.takeProfit) : undefined;
    if (updateData.profit !== undefined) db.trades[tradeIdx].profit = parseFloat(updateData.profit);
    if (updateData.commission !== undefined) db.trades[tradeIdx].commission = parseFloat(updateData.commission);
    if (updateData.swap !== undefined) db.trades[tradeIdx].swap = parseFloat(updateData.swap);
    if (updateData.riskPercentage !== undefined) db.trades[tradeIdx].riskPercentage = parseFloat(updateData.riskPercentage);
    if (updateData.strategy !== undefined) db.trades[tradeIdx].strategy = updateData.strategy;
    if (updateData.emotion !== undefined) db.trades[tradeIdx].emotion = updateData.emotion;
    if (updateData.notes !== undefined) db.trades[tradeIdx].notes = updateData.notes;
    if (updateData.screenshot !== undefined) db.trades[tradeIdx].screenshot = updateData.screenshot;
    if (updateData.tags !== undefined) db.trades[tradeIdx].tags = updateData.tags;
    if (updateData.date !== undefined) db.trades[tradeIdx].date = updateData.date;

    const newNet = db.trades[tradeIdx].profit + db.trades[tradeIdx].commission + db.trades[tradeIdx].swap;
    const diff = newNet - oldNet;

    const accIdx = db.accounts.findIndex((acc: any) => acc.id === trade.accountId);
    if (accIdx !== -1 && diff !== 0) {
      db.accounts[accIdx].currentBalance = parseFloat((db.accounts[accIdx].currentBalance + diff).toFixed(2));
      db.accounts[accIdx].equity = db.accounts[accIdx].currentBalance;
    }

    await saveDatabase(db);
    res.json({ message: 'Trade updated successfully', trade: db.trades[tradeIdx] });
  });

  app.delete('/api/trades/:id', async (req, res) => {
    const authEmail = req.headers['x-auth-email'] as string | undefined;
    if (authEmail) {
      db = await ensureUserDbLoaded(authEmail);
    }

    if (!currentUser) return res.status(401).json({ error: 'Not authenticated' });
    const { id } = req.params;

    const tradeIdx = db.trades.findIndex((t: any) => t.id === id);
    if (tradeIdx === -1) return res.status(404).json({ error: 'Trade not found' });

    const trade = db.trades[tradeIdx];
    const accIdx = db.accounts.findIndex((acc: any) => acc.id === trade.accountId && acc.userId === currentUser?.id);
    if (accIdx === -1) return res.status(403).json({ error: 'Access denied' });

    // Reverse trade impact from balance
    const netProfit = trade.profit + (trade.commission || 0) + (trade.swap || 0);
    db.accounts[accIdx].currentBalance = parseFloat((db.accounts[accIdx].currentBalance - netProfit).toFixed(2));
    db.accounts[accIdx].equity = db.accounts[accIdx].currentBalance;

    db.trades.splice(tradeIdx, 1);
    await saveDatabase(db);

    res.json({ message: 'Trade deleted successfully', updatedAccount: db.accounts[accIdx] });
  });

  // ==========================================
  // RISK SETTINGS ROUTES
  // ==========================================

  app.get('/api/risk-settings/:accountId', (req, res) => {
    const { accountId } = req.params;
    const settings = db.riskSettings.find((r: any) => r.accountId === accountId);
    if (!settings) {
      // Return default
      const defaultSettings: RiskSettings = {
        id: `r_${Date.now()}`,
        accountId,
        riskPerTradeLimit: 2.0,
        dailyLossLimit: 500,
        weeklyLossLimit: 1500,
        maxDrawdownLimit: 10.0,
        disciplineEnabled: true,
        maxTradesPerDay: 5
      };
      return res.json({ riskSettings: defaultSettings });
    }
    // Make sure old settings objects also have maxTradesPerDay
    if (settings.maxTradesPerDay === undefined) {
      settings.maxTradesPerDay = 5;
    }
    res.json({ riskSettings: settings });
  });

  app.put('/api/risk-settings/:accountId', (req, res) => {
    if (!currentUser) return res.status(401).json({ error: 'Not authenticated' });
    const { accountId } = req.params;
    const { riskPerTradeLimit, dailyLossLimit, weeklyLossLimit, maxDrawdownLimit, disciplineEnabled, maxTradesPerDay } = req.body;

    const idx = db.riskSettings.findIndex((r: any) => r.accountId === accountId);
    if (idx !== -1) {
      db.riskSettings[idx].riskPerTradeLimit = parseFloat(riskPerTradeLimit);
      db.riskSettings[idx].dailyLossLimit = parseFloat(dailyLossLimit);
      db.riskSettings[idx].weeklyLossLimit = parseFloat(weeklyLossLimit);
      db.riskSettings[idx].maxDrawdownLimit = parseFloat(maxDrawdownLimit);
      db.riskSettings[idx].disciplineEnabled = !!disciplineEnabled;
      db.riskSettings[idx].maxTradesPerDay = parseInt(maxTradesPerDay) || 5;
      saveDatabase(db);
      res.json({ message: 'Risk parameters saved', riskSettings: db.riskSettings[idx] });
    } else {
      const newRisk: RiskSettings = {
        id: `r_${Date.now()}`,
        accountId,
        riskPerTradeLimit: parseFloat(riskPerTradeLimit || 2.0),
        dailyLossLimit: parseFloat(dailyLossLimit || 500),
        weeklyLossLimit: parseFloat(weeklyLossLimit || 1500),
        maxDrawdownLimit: parseFloat(maxDrawdownLimit || 10.0),
        disciplineEnabled: disciplineEnabled !== undefined ? !!disciplineEnabled : true,
        maxTradesPerDay: parseInt(maxTradesPerDay || 5)
      };
      db.riskSettings.push(newRisk);
      saveDatabase(db);
      res.json({ message: 'Risk parameters created', riskSettings: newRisk });
    }
  });

  // ==========================================
  // MT5 CONNECTIONS & EA ENDPOINT
  // ==========================================

  app.get('/api/mt5/connections', (req, res) => {
    if (!currentUser) return res.json({ connections: [] });
    const userConns = db.mt5Connections.filter((conn: any) => conn.userId === currentUser?.id);
    res.json({ connections: userConns });
  });

  // Check Python bridge health status
  app.get('/api/mt5/bridge-status', async (req, res) => {
    const health = await checkBridgeHealth();
    res.json(health);
  });

  // Connect MT5 via local Python Bridge (investor password — free, no MetaApi)
  app.post('/api/mt5/connect-investor', async (req, res) => {
    if (!currentUser) return res.status(401).json({ error: 'Not authenticated' });
    const { loginNumber, brokerServer, investorPassword, autoSync } = req.body;

    if (!loginNumber || !brokerServer || !investorPassword) {
      return res.status(400).json({ error: 'loginNumber, brokerServer, and investorPassword are required.' });
    }

    try {
      // ── Step 1: Verify Python bridge is running ──────────────────────────
      const health = await checkBridgeHealth();
      if (!health.ok) {
        return res.status(503).json({
          error: 'MT5 Bridge is not running. Please start mt5_bridge/mt5_bridge.py on your Windows PC first.',
          bridgeUrl: MT5_BRIDGE_URL,
          hint: 'Run: cd mt5_bridge && python mt5_bridge.py  (or double-click start_bridge.bat)'
        });
      }

      // ── Step 2: Connect to MT5 with investor password ────────────────────
      console.log(`[MT5 Bridge] Connecting login=${loginNumber} server=${brokerServer}`);
      let connectData: any;
      try {
        connectData = await bridgeFetch('/connect', {
          method: 'POST',
          body: JSON.stringify({ login: parseInt(loginNumber), server: brokerServer, password: investorPassword })
        });
      } catch (e: any) {
        return res.status(400).json({
          error: `MT5 connection failed: ${e.message}`,
          hint: 'Check that your MT5 terminal is open, and the login/server/investor password are correct.'
        });
      }

      const accountInfo = connectData.account || {};

      // ── Step 3: Create journal account entry ─────────────────────────────
      const newAccId = `acc_mt5py_${Date.now()}`;
      const startingBalance = parseFloat(accountInfo.balance) || 10000;
      const currentBalance  = parseFloat(accountInfo.equity)  || startingBalance;
      const tradeMode       = accountInfo.trade_mode;  // 0=real, 1=demo

      const newAccount = {
        id: newAccId,
        userId: currentUser.id,
        name: `${brokerServer} (${loginNumber})`,
        broker: brokerServer,
        platform: 'MT5',
        accountType: tradeMode === 0 ? 'Live' : 'Demo',
        currency: accountInfo.currency || 'USD',
        startingBalance,
        currentBalance,
        equity: currentBalance,
        status: 'Active'
      };
      db.accounts.push(newAccount);

      // Default risk settings
      db.riskSettings.push({
        id: `r_mt5py_${Date.now()}`,
        accountId: newAccId,
        riskPerTradeLimit: 2.0,
        dailyLossLimit: startingBalance * 0.05,
        weeklyLossLimit: startingBalance * 0.10,
        maxDrawdownLimit: 10.0,
        disciplineEnabled: true
      });

      // ── Step 4: Fetch deal history (last 1 year) ──────────────────────────
      const fromDate = new Date();
      fromDate.setFullYear(fromDate.getFullYear() - 1);
      const toDate = new Date();

      let mappedTrades: any[] = [];
      try {
        const historyData = await bridgeFetch(
          `/history?from_date=${fromDate.toISOString()}&to_date=${toDate.toISOString()}&account_id=${newAccId}`
        );
        mappedTrades = historyData.trades || [];
        console.log(`[MT5 Bridge] Imported ${mappedTrades.length} trades for account ${newAccId}`);
      } catch (e: any) {
        console.warn('[MT5 Bridge] Could not fetch history (account created but no trades):', e.message);
      }

      db.trades.push(...mappedTrades);

      // ── Step 5: Create connection record ─────────────────────────────────
      const connection = {
        id: `conn_mt5py_${Date.now()}`,
        userId: currentUser.id,
        accountId: newAccId,
        brokerName: brokerServer,
        loginNumber: String(loginNumber),
        brokerServer,
        status: 'Connected',
        lastSyncTime: new Date().toISOString(),
        syncToken: `axy_bridge_${loginNumber}`,
        totalSyncedTrades: mappedTrades.length,
        isInvestorSync: true,
        autoSync: autoSync !== false,
        bridgeConnected: true
      };
      db.mt5Connections.push(connection);

      saveDatabase(db);
      res.json({
        message: `MT5 connected via Python Bridge! Imported ${mappedTrades.length} trades from your broker.`,
        connection,
        account: newAccount,
        tradesImported: mappedTrades.length
      });
    } catch (err: any) {
      console.error('[MT5 Bridge] Connect-investor error:', err);
      res.status(500).json({ error: `MT5 bridge connection failed: ${err?.message || err}` });
    }
  });

  // Connect MT5 Expert Advisor (Method A) - automatically creates a new dedicated account
  app.post('/api/mt5/connect-ea', (req, res) => {
    if (!currentUser) return res.status(401).json({ error: 'Not authenticated' });
    const { loginNumber, brokerName, startingBalance, historyMonths } = req.body;

    const num = loginNumber || `${Math.floor(1000000 + Math.random() * 9000000)}`;
    const broker = brokerName || 'MetaQuotes-Demo';
    const balance = parseFloat(startingBalance) || 10000.00;

    // Automatically create a new dedicated Trading Account for this MT5 connection
    const newAccId = `acc_mt5_ea_${Date.now()}`;
    const newAccount = {
      id: newAccId,
      userId: currentUser.id,
      name: `MT5 EA (${num})`,
      broker: broker,
      platform: 'MT5',
      accountType: 'Live',
      currency: 'USD',
      startingBalance: balance,
      currentBalance: balance,
      equity: balance,
      status: 'Active'
    };

    db.accounts.push(newAccount);

    // Create default Risk Settings for this new MT5 account
    const newRisk = {
      id: `r_mt5_ea_${Date.now()}`,
      accountId: newAccId,
      riskPerTradeLimit: 2.0,
      dailyLossLimit: 500,
      weeklyLossLimit: 1500,
      maxDrawdownLimit: 10.0,
      disciplineEnabled: true
    };
    db.riskSettings.push(newRisk);

    // Create the MT5 connection linked to the brand new account
    const connection = {
      id: `conn_ea_${Date.now()}`,
      userId: currentUser.id,
      accountId: newAccId,
      brokerName: broker,
      status: 'Connected',
      lastSyncTime: new Date().toISOString(),
      syncToken: `axy_token_ea_${Math.floor(Math.random()*100000)}`,
      totalSyncedTrades: 0,
      loginNumber: num,
      brokerServer: broker,
      isInvestorSync: false,
      autoSync: true,
      historyMonths: historyMonths ? parseInt(historyMonths) : 3,
      initialSyncDone: false
    };
    db.mt5Connections.push(connection);

    saveDatabase(db);
    res.json({
      message: 'MT5 EA account connected successfully.',
      connection,
      account: newAccount
    });
  });

  // Update MT5 Connection historical import settings
  app.post('/api/mt5/connections/:id/update-history', (req, res) => {
    if (!currentUser) return res.status(401).json({ error: 'Not authenticated' });
    const { id } = req.params;
    const { historyMonths } = req.body;

    const connection = db.mt5Connections.find((conn: any) => conn.id === id && conn.userId === currentUser?.id);
    if (!connection) return res.status(404).json({ error: 'Connection not found' });

    connection.historyMonths = historyMonths ? parseInt(historyMonths) : 3;
    connection.initialSyncDone = false; // reset initial sync so starting balance recalculates on next sync

    saveDatabase(db);
    res.json({
      message: 'MT5 historical trade import settings updated.',
      connection
    });
  });

  // Sync now — fetches new deals from Python Bridge since last sync
  app.post('/api/mt5/sync-investor', async (req, res) => {
    if (!currentUser) return res.status(401).json({ error: 'Not authenticated' });
    const { accountId, investorPassword } = req.body;

    const account = db.accounts.find((acc: any) => acc.id === accountId && acc.userId === currentUser?.id);
    if (!account) return res.status(404).json({ error: 'Account not found' });

    const connection = db.mt5Connections.find((conn: any) => conn.accountId === account.id);
    if (!connection) return res.status(404).json({ error: 'MT5 Connection not found for this account' });

    if (!connection.bridgeConnected && !connection.isInvestorSync) {
      return res.status(400).json({ error: 'This account was not connected via Python Bridge. Please reconnect using the Investor Password method.' });
    }

    try {
      // ── Step 1: Check bridge health ──────────────────────────────────────
      const health = await checkBridgeHealth();
      if (!health.ok) {
        return res.status(503).json({
          error: 'MT5 Bridge is not running. Please start mt5_bridge/mt5_bridge.py on your Windows PC.',
          hint: 'Double-click mt5_bridge/start_bridge.bat to start it.'
        });
      }

      // ── Step 2: Re-connect if bridge lost session ─────────────────────────
      if (!health.connected && investorPassword && connection.loginNumber && connection.brokerServer) {
        try {
          await bridgeFetch('/connect', {
            method: 'POST',
            body: JSON.stringify({
              login: parseInt(connection.loginNumber),
              server: connection.brokerServer,
              password: investorPassword
            })
          });
        } catch (e: any) {
          return res.status(400).json({
            error: `Re-connect failed: ${e.message}`,
            hint: 'Provide your investor password in the request body to re-authenticate.'
          });
        }
      }

      // ── Step 3: Fetch deals since last sync ───────────────────────────────
      const fromDate = new Date(connection.lastSyncTime || new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString());
      const toDate = new Date();

      const historyData = await bridgeFetch(
        `/history?from_date=${fromDate.toISOString()}&to_date=${toDate.toISOString()}&account_id=${account.id}`
      );
      const incomingTrades: any[] = historyData.trades || [];

      // Deduplicate by trade ID
      const existingIds = new Set(db.trades.map((t: any) => t.id));
      const newTrades = incomingTrades.filter((t: any) => !existingIds.has(t.id));

      if (newTrades.length > 0) {
        db.trades.push(...newTrades);
        const net = newTrades.reduce((sum: number, t: any) => sum + t.profit + t.commission + t.swap, 0);
        const accIdx = db.accounts.findIndex((acc: any) => acc.id === account.id);
        if (accIdx !== -1) {
          db.accounts[accIdx].currentBalance = parseFloat((db.accounts[accIdx].currentBalance + net).toFixed(2));
          db.accounts[accIdx].equity = db.accounts[accIdx].currentBalance;
        }
      }

      // Update connection sync time
      const connIdx = db.mt5Connections.findIndex((c: any) => c.id === connection.id);
      if (connIdx !== -1) {
        db.mt5Connections[connIdx].lastSyncTime = toDate.toISOString();
        db.mt5Connections[connIdx].totalSyncedTrades += newTrades.length;
        db.mt5Connections[connIdx].status = 'Connected';
      }

      saveDatabase(db);
      res.json({
        message: `Sync complete! ${newTrades.length} new trade(s) imported.`,
        newTradesCount: newTrades.length,
        account: db.accounts.find((acc: any) => acc.id === account.id)
      });
    } catch (err: any) {
      console.error('[MT5 Bridge] Sync error:', err);
      res.status(500).json({ error: `MT5 bridge sync failed: ${err?.message || err}` });
    }
  });

  // Disconnect
  app.post('/api/mt5/disconnect-investor', (req, res) => {
    if (!currentUser) return res.status(401).json({ error: 'Not authenticated' });
    const { accountId } = req.body;

    const idx = db.mt5Connections.findIndex((conn: any) => conn.accountId === accountId && conn.userId === currentUser?.id);
    if (idx !== -1) {
      db.mt5Connections.splice(idx, 1);
      saveDatabase(db);
    }
    res.json({ message: 'MT5 Investor account disconnected successfully.' });
  });

  // Toggle Auto Sync
  app.post('/api/mt5/toggle-auto-sync', (req, res) => {
    if (!currentUser) return res.status(401).json({ error: 'Not authenticated' });
    const { accountId, autoSync } = req.body;

    const connection = db.mt5Connections.find((conn: any) => conn.accountId === accountId && conn.userId === currentUser?.id);
    if (!connection) return res.status(404).json({ error: 'Connection not found' });

    connection.autoSync = !!autoSync;
    saveDatabase(db);
    res.json({ message: 'Auto sync settings updated.', connection });
  });

  // Developer mock action to trigger a trade sync from the Expert Advisor simulation
  app.post('/api/mt5/connections/test-sync', (req, res) => {
    if (!currentUser) return res.status(401).json({ error: 'Not authenticated' });
    const { accountId, symbol } = req.body;

    const account = db.accounts.find((acc: any) => acc.id === accountId && acc.userId === currentUser?.id);
    if (!account) return res.status(404).json({ error: 'Account not found' });

    // Generate random MT5 trade
    const symbols = ['EURUSD', 'GBPUSD', 'XAUUSD', 'USDJPY', 'AUDUSD'];
    const selectedSymbol = symbol || symbols[Math.floor(Math.random() * symbols.length)];
    const profit = Math.random() > 0.35 ? parseFloat((Math.random() * 500 + 50).toFixed(2)) : -parseFloat((Math.random() * 300 + 20).toFixed(2));
    const isBuy = Math.random() > 0.5;

    const simulatedTrade: Trade = {
      id: `mt5_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      accountId: account.id,
      date: new Date().toISOString(),
      symbol: selectedSymbol,
      type: isBuy ? 'Buy' : 'Sell',
      lotSize: parseFloat((Math.random() * 1.5 + 0.1).toFixed(2)),
      entryPrice: isBuy ? 1.08500 : 1.09200,
      exitPrice: isBuy ? 1.08950 : 1.08800,
      stopLoss: isBuy ? 1.08000 : 1.09900,
      takeProfit: isBuy ? 1.09500 : 1.07500,
      profit,
      commission: -parseFloat((Math.random() * 8 + 2).toFixed(2)),
      swap: Math.random() > 0.5 ? -1.5 : 0.5,
      riskPercentage: parseFloat((Math.random() * 2 + 0.5).toFixed(2)),
      strategy: 'MT5 EA AutoSync',
      emotion: 'Calm',
      notes: 'Automatically synchronized from MT5 Terminal using AxyFx Sync EA.',
      tags: ['Breakout', 'MT5 AutoSync'],
      isMt5Sync: true
    };

    db.trades.push(simulatedTrade);

    // Update account balance
    const net = simulatedTrade.profit + simulatedTrade.commission + simulatedTrade.swap;
    const accIdx = db.accounts.findIndex((acc: any) => acc.id === account.id);
    if (accIdx !== -1) {
      db.accounts[accIdx].currentBalance = parseFloat((db.accounts[accIdx].currentBalance + net).toFixed(2));
      db.accounts[accIdx].equity = db.accounts[accIdx].currentBalance;
    }

    // Update connection count
    const connIdx = db.mt5Connections.findIndex((conn: any) => conn.accountId === account.id);
    if (connIdx !== -1) {
      db.mt5Connections[connIdx].lastSyncTime = new Date().toISOString();
      db.mt5Connections[connIdx].totalSyncedTrades += 1;
      db.mt5Connections[connIdx].status = 'Connected';
    } else {
      db.mt5Connections.push({
        id: `conn_${Date.now()}`,
        userId: currentUser.id,
        accountId: account.id,
        brokerName: account.broker,
        status: 'Connected',
        lastSyncTime: new Date().toISOString(),
        syncToken: `axy_token_${Math.floor(Math.random()*100000)}`,
        totalSyncedTrades: 1
      });
    }

    saveDatabase(db);
    res.json({ message: 'MT5 trade synchronized successfully!', trade: simulatedTrade });
  });

  // Secure EA synchronization API hit by MT5 Experts Terminal
  app.post('/api/mt5/sync', async (req, res) => {
    const { syncToken, trades, balance } = req.body;
    if (!syncToken) return res.status(401).json({ error: 'Invalid or missing authorization token' });

    const email = req.query.email as string;
    if (email) {
      db = await ensureUserDbLoaded(email);
    }

    // Locate connection
    const connection = db.mt5Connections.find((conn: any) => conn.syncToken === syncToken);
    if (!connection) return res.status(403).json({ error: 'EA synchronization token not found' });

    const accountIdx = db.accounts.findIndex((acc: any) => acc.id === connection.accountId);
    if (accountIdx === -1) return res.status(404).json({ error: 'Trading account linked to this token does not exist' });

    const isInitialSync = !connection.initialSyncDone;
    let syncedCount = 0;
    let totalImportedNet = 0;

    if (trades && Array.isArray(trades)) {
      trades.forEach((incomingTrade: any) => {
        const eaTicket = incomingTrade.id || incomingTrade.ticket;

        // Better deduplication logic to prevent the same trade showing multiple times when profit fluctuates
        const existingIdx = db.trades.findIndex((t: any) => {
          if (t.accountId !== connection.accountId) return false;
          
          if (eaTicket && t.id === String(eaTicket)) return true;
          
          // Composite match ignoring profit (which floats) and time (which might differ slightly)
          const isSameSymbol = t.symbol === (incomingTrade.symbol || '').toUpperCase();
          const isSameType = t.type === (incomingTrade.type || 'Buy');
          const isSameEntry = Math.abs(t.entryPrice - parseFloat(incomingTrade.entryPrice || 1.0)) < 0.0001;
          const isSameLot = Math.abs(t.lotSize - parseFloat(incomingTrade.lotSize || 0.1)) < 0.001;
          
          return isSameSymbol && isSameType && isSameEntry && isSameLot;
        });

        if (existingIdx !== -1) {
          // Update the existing trade since profit or exit price might have changed
          const t = db.trades[existingIdx];
          const oldNet = t.profit + t.commission + t.swap;
          
          t.exitPrice = parseFloat(incomingTrade.exitPrice || t.exitPrice);
          if (incomingTrade.stopLoss) t.stopLoss = parseFloat(incomingTrade.stopLoss);
          if (incomingTrade.takeProfit) t.takeProfit = parseFloat(incomingTrade.takeProfit);
          t.profit = parseFloat(incomingTrade.profit || 0);
          t.commission = parseFloat(incomingTrade.commission || 0);
          t.swap = parseFloat(incomingTrade.swap || 0);
          
          const newNet = t.profit + t.commission + t.swap;
          const netDiff = newNet - oldNet;
          db.accounts[accountIdx].currentBalance = parseFloat((db.accounts[accountIdx].currentBalance + netDiff).toFixed(2));
        } else {
          const newTrade: Trade = {
            id: eaTicket ? String(eaTicket) : `mt5_ea_${Date.now()}_${Math.floor(Math.random()*100000)}`,
            accountId: connection.accountId,
            date: incomingTrade.date || new Date().toISOString(),
            symbol: incomingTrade.symbol.toUpperCase(),
            type: incomingTrade.type || 'Buy',
            lotSize: parseFloat(incomingTrade.lotSize || 0.1),
            entryPrice: parseFloat(incomingTrade.entryPrice || 1.0),
            exitPrice: parseFloat(incomingTrade.exitPrice || 1.0),
            stopLoss: incomingTrade.stopLoss ? parseFloat(incomingTrade.stopLoss) : undefined,
            takeProfit: incomingTrade.takeProfit ? parseFloat(incomingTrade.takeProfit) : undefined,
            profit: parseFloat(incomingTrade.profit || 0),
            commission: parseFloat(incomingTrade.commission || 0),
            swap: parseFloat(incomingTrade.swap || 0),
            riskPercentage: parseFloat(incomingTrade.riskPercentage || 1.0),
            strategy: incomingTrade.type === 'Deposit' || incomingTrade.type === 'Withdrawal' ? 'Balance Operation' : 'MT5 Expert EA Sync',
            emotion: 'Calm',
            notes: incomingTrade.notes || 'Automated execution sync.',
            tags: ['MT5 AutoSync'],
            isMt5Sync: true
          };

          db.trades.push(newTrade);
          syncedCount++;

          // Adjust account balance
          const net = newTrade.profit + newTrade.commission + newTrade.swap;
          totalImportedNet += net;
          db.accounts[accountIdx].currentBalance = parseFloat((db.accounts[accountIdx].currentBalance + net).toFixed(2));
        }
      });
    }

    // Set Live Balance & Recalculate Starting Balance on Initial Sync
    const liveBalance = (balance !== undefined && balance !== null && !isNaN(Number(balance))) ? parseFloat(Number(balance).toFixed(2)) : db.accounts[accountIdx].currentBalance;
    db.accounts[accountIdx].currentBalance = liveBalance;
    db.accounts[accountIdx].equity = liveBalance;

    if (isInitialSync) {
      // Fetch all trades for this account
      const accountTrades = db.trades.filter((t: any) => t.accountId === connection.accountId);
      let totalPL = 0;
      accountTrades.forEach((t: any) => {
        totalPL += (parseFloat(t.profit || 0) + parseFloat(t.commission || 0) + parseFloat(t.swap || 0));
      });

      // Initial Balance = Current Live MT5 Balance - Total P&L of imported trades
      const initialBalance = parseFloat((liveBalance - totalPL).toFixed(2));
      db.accounts[accountIdx].startingBalance = initialBalance;

      // Mark connection's initial sync as completed
      const connIdx = db.mt5Connections.findIndex((c: any) => c.id === connection.id);
      if (connIdx !== -1) {
        db.mt5Connections[connIdx].initialSyncDone = true;
      }
    }

    const finalConnIdx = db.mt5Connections.findIndex((c: any) => c.id === connection.id);
    if (finalConnIdx !== -1) {
      db.mt5Connections[finalConnIdx].lastSyncTime = new Date().toISOString();
      db.mt5Connections[finalConnIdx].totalSyncedTrades += syncedCount;
      db.mt5Connections[finalConnIdx].status = 'Connected';
    }
    saveDatabase(db);
    res.json({ status: 'Success', syncedTradesCount: syncedCount, accountBalance: db.accounts[accountIdx].currentBalance, startingBalance: db.accounts[accountIdx].startingBalance });
  });

  // ==========================================
  // REAL-TIME AI TRADING INSIGHTS ROUTE (GEMINI)
  // ==========================================

  app.post('/api/ai/mentor', async (req, res) => {
    if (!currentUser) return res.status(401).json({ error: 'Not authenticated' });
    
    // Pro Plan requirement
    if (!currentUser.isPro) {
      return res.status(403).json({ 
        error: 'AI Mentor is a premium Pro Feature. Please upgrade your plan to unlock!',
        proRequired: true
      });
    }

    const { accountId, messages } = req.body;
    if (!accountId) return res.status(400).json({ error: 'accountId is required' });
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    // Fetch trades
    const accountTrades = db.trades.filter((t: any) => t.accountId === accountId);
    
    // Prepare a concise trading digest for Gemini API (latest 50 trades)
    const recentTrades = accountTrades.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 50);
    const digest = recentTrades.map((t: any) => ({
      date: t.date.split('T')[0],
      symbol: t.symbol,
      type: t.type,
      lots: t.lotSize,
      profit: t.profit,
      risk: t.riskPercentage,
      emotion: t.emotion,
      strategy: t.strategy
    }));

    const geminiKey = process.env.GEMINI_API_KEY;

    if (!geminiKey || geminiKey === "MY_GEMINI_API_KEY") {
      return res.json({ 
        reply: `I am running in offline mode. I can see you have logged ${accountTrades.length} trades. Please configure a valid Gemini API key in the environment to enable full mentoring capabilities.`
      });
    }

    try {
      const ai = new GoogleGenAI({
        apiKey: geminiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      const systemInstruction = `You are a professional forex trading mentor and coach.
Analyze the user's trading journal, performance history, statistics, and previous trades before answering.

Trading History Digest (Last 50 trades):
${JSON.stringify(digest)}

Total Trades Logged: ${accountTrades.length}

RESTRICTIONS:
- You must ONLY answer questions related to trading, trading psychology, risk management, discipline, emotional control, trade execution mistakes, performance improvement, strategy consistency, and journal insights.
- If a user asks about non-trading topics (general knowledge, coding, politics, entertainment, personal advice unrelated to trading, etc.), you MUST politely refuse and redirect the user to trading-related questions.
- You must NOT act as a general-purpose chatbot.
- You must NOT provide financial guarantees or promise profits.
- Base your responses heavily on the user's trading data provided in the digest whenever possible. Be specific.`;

      const conversation = messages.map(msg => ({
        role: msg.role === 'mentor' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      // Prepend system instructions to the conversation
      conversation.unshift(
        { role: 'user', parts: [{ text: `SYSTEM INSTRUCTIONS:\n${systemInstruction}\n\nUNDERSTAND AND ACKNOWLEDGE.` }] },
        { role: 'model', parts: [{ text: 'Understood. I will act strictly as a trading mentor and follow all restrictions.' }] }
      );

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: conversation
      });

      const replyText = response.text || "I'm sorry, I couldn't generate a response.";

      res.json({ reply: replyText });

    } catch (err: any) {
      console.error('Gemini API Error:', err);
      res.json({
        reply: "I am currently experiencing connection issues. Please try again in a few moments."
      });
    }
  });

  // ==========================================
  // SUPPORT TICKETS & ANNOUNCEMENTS ROUTES
  // ==========================================

  app.get('/api/tickets', (req, res) => {
    if (!currentUser) return res.json({ tickets: [] });
    // Admins see all tickets, regular users see their own
    if (currentUser.email === 'admin@axyfx.com') {
      return res.json({ tickets: db.supportTickets });
    }
    const userTickets = db.supportTickets.filter((t: any) => t.userId === currentUser?.id);
    res.json({ tickets: userTickets });
  });

  app.post('/api/tickets', (req, res) => {
    if (!currentUser) return res.status(401).json({ error: 'Not authenticated' });
    const { title, description, category } = req.body;

    if (!title || !description) return res.status(400).json({ error: 'Title and description are required' });

    const newTicket: SupportTicket = {
      id: `ticket_${Date.now()}`,
      userId: currentUser.id,
      userEmail: currentUser.email,
      title,
      description,
      status: 'Open',
      category: category || 'Other',
      date: new Date().toISOString()
    };

    db.supportTickets.push(newTicket);
    saveDatabase(db);
    res.json({ message: 'Support ticket submitted successfully', ticket: newTicket });
  });

  app.put('/api/tickets/:id', (req, res) => {
    if (!currentUser) return res.status(401).json({ error: 'Not authenticated' });
    const { id } = req.params;
    const { status } = req.body;

    const idx = db.supportTickets.findIndex((t: any) => t.id === id);
    if (idx !== -1) {
      db.supportTickets[idx].status = status || 'Closed';
      saveDatabase(db);
      res.json({ message: 'Ticket status updated', ticket: db.supportTickets[idx] });
    } else {
      res.status(404).json({ error: 'Ticket not found' });
    }
  });

  app.get('/api/announcements', (req, res) => {
    res.json({ announcements: db.announcements });
  });

  // ==========================================
  // PAYMENT / SUBSCRIPTION SYSTEM ROUTES
  // ==========================================

  app.post('/api/payments/checkout', (req, res) => {
    if (!currentUser) return res.status(401).json({ error: 'Not authenticated' });
    
    // Simulate Razorpay checkout creation
    const orderId = `order_${Date.now()}_razorpay`;
    res.json({ 
      orderId, 
      amount: 9900, // ₹99
      currency: 'INR',
      key: 'rzp_test_axyfx_journal_placeholder'
    });
  });

  app.post('/api/payments/verify', (req, res) => {
    if (!currentUser) return res.status(401).json({ error: 'Not authenticated' });
    const { razorpay_payment_id, status } = req.body;

    const userIdx = db.users.findIndex((u: any) => u.id === currentUser?.id);
    if (userIdx !== -1) {
      // Turn user into a PRO member!
      db.users[userIdx].isPro = true;
      currentUser = db.users[userIdx];

      // Add payment history
      const newPayment: PaymentHistory = {
        id: `pay_${Date.now()}`,
        userId: currentUser.id,
        amount: 99,
        currency: 'INR',
        plan: 'Pro',
        status: status === 'Failed' ? 'Failed' : 'Success',
        date: new Date().toISOString(),
        razorpayId: razorpay_payment_id || `pay_rzp_mock_${Date.now()}`
      };

      db.payments.push(newPayment);
      saveDatabase(db);

      res.json({ success: true, message: 'Upgraded to Pro plan successfully!', user: currentUser });
    } else {
      res.status(404).json({ error: 'User session not found' });
    }
  });

  // ==========================================
  // ADMIN DASHBOARD ROUTES
  // ==========================================

  app.get('/api/admin/users', (req, res) => {
    if (!currentUser || currentUser.email !== 'admin@axyfx.com') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    // Return all users with their accounts count and total trades count
    const usersWithStats = db.users.map((u: any) => {
      const uAccounts = db.accounts.filter((acc: any) => acc.userId === u.id);
      const accIds = uAccounts.map((a: any) => a.id);
      const uTrades = db.trades.filter((t: any) => accIds.includes(t.accountId));
      return {
        ...u,
        accountsCount: uAccounts.length,
        tradesCount: uTrades.length
      };
    });
    res.json({ users: usersWithStats });
  });

  app.post('/api/admin/announcements', (req, res) => {
    if (!currentUser || currentUser.email !== 'admin@axyfx.com') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { title, content } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });

    const newAnn: Announcement = {
      id: `ann_${Date.now()}`,
      title,
      content,
      date: new Date().toISOString()
    };

    db.announcements.unshift(newAnn);
    saveDatabase(db);
    res.json({ message: 'Announcement published successfully', announcement: newAnn });
  });

  app.post('/api/admin/block-user', (req, res) => {
    if (!currentUser || currentUser.email !== 'admin@axyfx.com') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { userId, block } = req.body;
    // Simple state flag
    const idx = db.users.findIndex((u: any) => u.id === userId);
    if (idx !== -1) {
      db.users[idx].status = block ? 'Blocked' : 'Active';
      saveDatabase(db);
      res.json({ message: block ? 'User blocked' : 'User unblocked' });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  });

  // ==========================================
  // VITE DEV SERVER OR STATIC ASSET PRODUCTION
  // ==========================================

  // In development environment outside of Vercel, load Vite dev server
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    import('vite').then(({ createServer }) => {
      createServer({
        server: { middlewareMode: true },
        appType: 'spa'
      }).then((vite) => {
        app.use(vite.middlewares);
        app.listen(PORT, '0.0.0.0', () => {
          console.log(`[AxyFx Journal Server] Dev listening on http://0.0.0.0:${PORT}`);
        });
      });
    }).catch(err => {
      console.error('Vite Dev Server creation failed:', err);
    });
  } else if (!process.env.VERCEL) {
    // Static hosting inside Express is only needed for standard non-Vercel production deployments
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[AxyFx Journal Server] Prod listening on http://0.0.0.0:${PORT}`);
    });
  }

  export default app;
