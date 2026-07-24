import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
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

const userDatabases = new Map();
let isLoaded = false;
let currentUser: any = null;
let isGlobalLoaded = false;
let db: any = null;

// Loader and saver specifically for user-scoped databases on Supabase

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOtpEmail(email, otp, subject = 'Your FX Journal Pro Verification Code') {
  const sendgridKey = process.env.SENDGRID_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || process.env.SENDER_EMAIL || 'noreply@fxjournalpro.com';
  const isReset = subject.toLowerCase().includes('reset');
  const heading = isReset ? 'Reset your password' : 'Verify your email address';
  const bodyText = isReset
    ? 'You requested a password reset for your FX Journal Pro account. Use the code below to set a new password. This code expires in 10 minutes.'
    : 'Thank you for registering with FX Journal Pro. Please use the following one-time password (OTP) to activate your account. This code is valid for 10 minutes.';
  const emailHtml = `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;"><h2 style="color: #0f172a; text-align: center;">${heading}</h2><p>${bodyText}</p><div style="text-align: center; margin: 30px 0;"><span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2563eb; background-color: #f1f5f9; padding: 10px 20px; border-radius: 8px;">${otp}</span></div><p>If you did not request this code, please ignore this email.</p></div>`;

  // 1. Try SendGrid if API Key is configured
  if (sendgridKey && sendgridKey !== 'YOUR_SENDGRID_API_KEY' && !sendgridKey.startsWith('SG.xxxx')) {
    try {
      console.log(`[SendGrid] Attempting to send OTP email to ${email} from ${fromEmail}...`);
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + sendgridKey
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: [{ email: email }]
            }
          ],
          from: {
            email: fromEmail,
            name: 'FX Journal Pro'
          },
          subject: subject,
          content: [
            {
              type: 'text/html',
              value: emailHtml
            }
          ]
        })
      });

      if (response.status >= 200 && response.status < 300) {
        console.log('[SendGrid] Email OTP sent successfully to ' + email);
        return { success: true, provider: 'SendGrid' };
      } else {
        const errorText = await response.text();
        console.error('[SendGrid Email Error] Status ' + response.status + ':', errorText);
        if (response.status === 403 || errorText.includes('Sender Identity') || errorText.includes('from address')) {
          console.error('[SendGrid Troubleshooting] Make sure SENDGRID_FROM_EMAIL matches the email address verified in SendGrid Single Sender Verification, and that you clicked the verification link sent by SendGrid!');
        }
      }
    } catch (err: any) {
      console.error('[SendGrid Email Exception]', err);
    }
  }

  // 2. Try Resend if API Key is configured
  if (resendKey && resendKey !== 'YOUR_RESEND_API_KEY' && !resendKey.startsWith('re_xxxx')) {
    try {
      console.log(`[Resend] Attempting to send OTP email to ${email}...`);
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + resendKey
        },
        body: JSON.stringify({
          from: 'FX Journal Pro <onboarding@resend.dev>',
          to: email,
          subject: subject,
          html: emailHtml
        })
      });
      const data = await response.json();
      if (!response.ok) {
        console.error('[Resend Email Error]', data);
      } else {
        console.log('[Resend] Email OTP sent successfully to ' + email);
        return { success: true, provider: 'Resend' };
      }
    } catch (error) {
      console.error('[Resend Email Exception]', error);
    }
  }

  // 3. Development / Fallback Mode
  console.log('\n============================================================');
  console.log('[DEVELOPMENT / FALLBACK MODE] Email not sent via SMTP/API.');
  console.log('Target Email: ' + email + ' | OTP Code: ' + otp);
  console.log('============================================================\n');
  return { success: false, provider: 'None', otp: otp };
}

function createEmptyUserDb(userId?: string, email?: string) {
  const cleanUserId = userId?.trim() || `user_${Date.now()}`;
  const cleanEmail = email ? email.toLowerCase().trim() : '';
  const isDemo = cleanEmail === 'admin@axyfx.com' || cleanEmail === 'demo@axyfx.com';

  return {
    users: [
      {
        id: cleanUserId,
        email: cleanEmail,
        name: cleanEmail ? cleanEmail.split('@')[0] : 'Trader',
        experience: 'Intermediate',
        tradingStyle: 'Day Trading',
        mainMarkets: ['Forex', 'Gold'],
        onboardingCompleted: isDemo ? true : false,
        isPro: isDemo ? true : false,
        isEmailVerified: true
      }
    ],
    accounts: isDemo ? [
      {
        id: 'acc_demo_1',
        userId: cleanUserId,
        name: 'Main Trading Account',
        broker: 'MetaTrader 5',
        platform: 'MT5',
        accountType: 'Demo',
        currency: 'USD',
        startingBalance: 10000,
        currentBalance: 10000,
        equity: 10000,
        status: 'Active'
      }
    ] : [],
    trades: [],
    riskSettings: [],
    supportTickets: [],
    mt5Connections: [],
    payments: []
  };
}

async function ensureUserDbLoaded(userId?: string, email?: string) {
  let cleanUserId = userId?.trim() || '';
  let cleanEmail = email?.toLowerCase().trim() || '';

  if (cleanUserId.includes('@') && !cleanEmail) {
    cleanEmail = cleanUserId.toLowerCase();
    cleanUserId = '';
  }

  if (!cleanUserId && !cleanEmail) {
    return createEmptyUserDb('guest_user', 'guest@example.com');
  }

  // Check in-memory cache first
  if (cleanUserId && userDatabases.has(cleanUserId)) {
    return userDatabases.get(cleanUserId);
  }
  if (cleanEmail && userDatabases.has(cleanEmail)) {
    return userDatabases.get(cleanEmail);
  }

  let loadedDb = null;

  if (useSupabase) {
    try {
      if (cleanUserId) {
        const { data, error } = await supabase!
          .from('journal_settings')
          .select('value')
          .eq('key', 'db_json_uid_' + cleanUserId)
          .maybeSingle();

        if (!error && data?.value) {
          loadedDb = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        } else if (error) {
          console.error(`[ensureUserDbLoaded] Supabase error for UID '${cleanUserId}':`, error);
        }
      }

      if (!loadedDb && cleanEmail) {
        const { data, error } = await supabase!
          .from('journal_settings')
          .select('value')
          .eq('key', 'db_json_' + cleanEmail)
          .maybeSingle();

        if (!error && data?.value) {
          loadedDb = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        } else if (error) {
          console.error(`[ensureUserDbLoaded] Supabase error for Email '${cleanEmail}':`, error);
        }
      }
    } catch (err) {
      console.error('[AxyFx Journal Server] Supabase user DB query error:', err);
    }
  } else {
    // Local file persistence per user
    if (cleanUserId) {
      const userFilePath = path.join(process.cwd(), `db_user_${cleanUserId}.json`);
      if (fs.existsSync(userFilePath)) {
        try {
          const fileContent = fs.readFileSync(userFilePath, 'utf-8');
          loadedDb = JSON.parse(fileContent);
        } catch (e) {}
      }
    }
    if (!loadedDb && cleanEmail) {
      const safeEmail = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
      const emailFilePath = path.join(process.cwd(), `db_user_${safeEmail}.json`);
      if (fs.existsSync(emailFilePath)) {
        try {
          const fileContent = fs.readFileSync(emailFilePath, 'utf-8');
          loadedDb = JSON.parse(fileContent);
        } catch (e) {}
      }
    }
  }

  if (!loadedDb) {
    loadedDb = createEmptyUserDb(cleanUserId, cleanEmail);
  }

  // Guarantee required arrays exist
  loadedDb.users = Array.isArray(loadedDb.users) ? loadedDb.users : [];
  loadedDb.accounts = Array.isArray(loadedDb.accounts) ? loadedDb.accounts : [];
  loadedDb.trades = Array.isArray(loadedDb.trades) ? loadedDb.trades : [];
  loadedDb.riskSettings = Array.isArray(loadedDb.riskSettings) ? loadedDb.riskSettings : [];
  loadedDb.supportTickets = Array.isArray(loadedDb.supportTickets) ? loadedDb.supportTickets : [];
  loadedDb.mt5Connections = Array.isArray(loadedDb.mt5Connections) ? loadedDb.mt5Connections : [];
  loadedDb.payments = Array.isArray(loadedDb.payments) ? loadedDb.payments : [];

  let dbUser = loadedDb.users.find((u: any) => 
    (cleanUserId && u.id === cleanUserId) || 
    (cleanEmail && u.email?.toLowerCase() === cleanEmail)
  );

  if (!dbUser) {
    dbUser = {
      id: cleanUserId || `user_${Date.now()}`,
      email: cleanEmail,
      name: cleanEmail ? cleanEmail.split('@')[0] : 'Trader',
      experience: 'Intermediate',
      tradingStyle: 'Day Trading',
      mainMarkets: ['Forex', 'Gold'],
      onboardingCompleted: false,
      isPro: false,
      isEmailVerified: true
    };
    loadedDb.users.push(dbUser);
  } else if (cleanUserId && cleanEmail && dbUser.email?.toLowerCase() === cleanEmail && dbUser.id !== cleanUserId) {
    dbUser.id = cleanUserId;
  }

  // Set user ID on existing accounts if missing
  if (dbUser && loadedDb.accounts) {
    loadedDb.accounts.forEach((acc: any) => {
      if (!acc.userId) acc.userId = dbUser.id;
    });
  }

  // Cache in memory
  if (cleanUserId) userDatabases.set(cleanUserId, loadedDb);
  if (cleanEmail) userDatabases.set(cleanEmail, loadedDb);

  return loadedDb;
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
        db = loadDatabaseFromFile();
      } else if (!data) {
        console.log('[AxyFx Journal Server] No data found in Supabase. Seeding initial database...');
        const initial = loadDatabaseFromFile();
        await supabase!.from('journal_settings').insert({ key: 'db_json', value: initial });
        db = initial;
      } else {
        let loaded = data.value;
        if (typeof loaded === 'string') {
          try { loaded = JSON.parse(loaded); } catch (e) {}
        }
        db = loaded;
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
      supabase!
        .from('journal_settings')
        .upsert({ key: 'db_json', value: db }, { onConflict: 'key' })
        .catch((err: any) => console.error('[AxyFx Journal Server] Exception healing database:', err));
    }
  }

  isLoaded = true;
  return db;
}

async function saveDatabase(
  data: any,
  overrideUserId?: string,
  overrideEmail?: string,
  previousAliases?: { userId?: string; email?: string }
) {
  if (!data) return;

  const usersToSync = Array.isArray(data.users) ? data.users : [];
  
  let cleanOverrideUid = overrideUserId?.includes('@') ? undefined : overrideUserId?.trim();
  let cleanOverrideEmail = overrideUserId?.includes('@') ? overrideUserId.trim().toLowerCase() : overrideEmail?.trim().toLowerCase();

  const keysToSync: { uid?: string; email?: string }[] = [];

  for (const u of usersToSync) {
    if (u.id || u.email) {
      keysToSync.push({ uid: u.id, email: u.email?.toLowerCase().trim() });
    }
  }

  if (cleanOverrideUid || cleanOverrideEmail) {
    keysToSync.push({ uid: cleanOverrideUid, email: cleanOverrideEmail });
  }

  for (const target of keysToSync) {
    const uid = target.uid?.trim();
    const email = target.email?.toLowerCase().trim();

    if (uid) {
      userDatabases.set(uid, data);
      try {
        fs.writeFileSync(path.join(process.cwd(), `db_user_${uid}.json`), JSON.stringify(data, null, 2), 'utf-8');
      } catch (e) {}
      if (useSupabase) {
        try {
          await supabase!.from('journal_settings').upsert({ key: 'db_json_uid_' + uid, value: data }, { onConflict: 'key' });
        } catch (err) {}
      }
    }

    if (email) {
      userDatabases.set(email, data);
      const safeEmail = email.replace(/[^a-zA-Z0-9]/g, '_');
      try {
        fs.writeFileSync(path.join(process.cwd(), `db_user_${safeEmail}.json`), JSON.stringify(data, null, 2), 'utf-8');
      } catch (e) {}
      if (useSupabase) {
        try {
          await supabase!.from('journal_settings').upsert({ key: 'db_json_' + email, value: data }, { onConflict: 'key' });
        } catch (err) {}
      }
    }
  }

  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    // Ignore
  }

  if (useSupabase) {
    try {
      await supabase!.from('journal_settings').upsert({ key: 'db_json', value: data }, { onConflict: 'key' });
    } catch (err) {}
  }
}

async function removeUserDatabaseAliases(userId?: string, email?: string) {
  void userId;
  void email;
}

const app = express();
const PORT = 3000;

  // Rate limiter for auth endpoints (prevents brute force / OTP spam)
  const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    message: { error: 'Too many requests. Please wait a few minutes and try again.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Middleware
  app.use(express.json({ limit: '15mb' }));

  // Global middleware to load database and set local user context
  app.use(async (req, res, next) => {
    try {
      const authUserId = (req.headers['x-auth-user-id'] as string | undefined)?.trim();
      const authEmail = (req.headers['x-auth-email'] as string | undefined)?.trim();

      if (authUserId || authEmail) {
        const email = authEmail ? authEmail.toLowerCase() : '';
        const userId = authUserId || (email ? `user_${email}` : '');

        let db = await ensureUserDbLoaded(userId, email);

        let dbUser = db.users.find((u: any) => 
          (userId && u.id === userId) || 
          (email && u.email?.toLowerCase() === email)
        );

        if (!dbUser) {
          dbUser = {
            id: userId || `user_${Date.now()}`,
            email: email,
            name: email ? email.split('@')[0] : 'Trader',
            experience: 'Intermediate',
            tradingStyle: 'Day Trading',
            mainMarkets: ['Forex', 'Gold'],
            onboardingCompleted: false,
            isPro: false,
            isEmailVerified: true
          };
          db.users.push(dbUser);
          await saveDatabase(db, userId, email);
        } else if (userId && dbUser.id !== userId) {
          const previousUserId = dbUser.id;
          const previousEmail = dbUser.email;
          dbUser.id = userId;
          await saveDatabase(db, userId, email, { userId: previousUserId, email: previousEmail });
        }

        (req as any).userDb = db;
        (req as any).currentUser = dbUser;
      } else {
        (req as any).currentUser = null;
        (req as any).userDb = null;
      }

      next();
    } catch (err) {
      console.error('[AxyFx Journal Server] Middleware execution error:', err);
      next(err);
    }
  });

  app.get('/api/auth/me', async (req, res) => {
    let currentUser = (req as any).currentUser;
    if (!currentUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    return res.json({ user: currentUser });
  });

  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, name, password, isEmailVerified, id, userId } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const normalizedEmail = email.toLowerCase().trim();
      const authUserId = (req.headers['x-auth-user-id'] as string) || id || userId || '';
      let db = await ensureUserDbLoaded(authUserId, normalizedEmail);

      let user = db.users.find((u: any) => 
        (authUserId && u.id === authUserId) || 
        u.email.toLowerCase() === normalizedEmail
      );
      const previousUserId = user?.id;
      const previousEmail = user?.email;
      
      if (user && user.isEmailVerified && !isEmailVerified) {
        return res.status(400).json({ error: 'An account with this email already exists. Please log in.' });
      }
      
      const otp = generateOtp();
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

      if (!user) {
        user = {
          id: authUserId || `user_${Date.now()}`,
          email: normalizedEmail,
          name: name || normalizedEmail.split('@')[0],
          password: password ? await bcrypt.hash(password, 10) : '',
          experience: 'Intermediate',
          tradingStyle: 'Day Trading',
          mainMarkets: ['Forex', 'Gold'],
          onboardingCompleted: false,
          isPro: false,
          isEmailVerified: isEmailVerified === true ? true : false,
          emailOtp: otp,
          otpExpiresAt: otpExpiresAt,
          otpAttempts: 0,
          otpSentAt: new Date().toISOString()
        };
        db.users.push(user);
      } else {
        if (authUserId) user.id = authUserId;
        if (name) user.name = name;
        if (password) user.password = await bcrypt.hash(password, 10);
        user.isEmailVerified = isEmailVerified === true ? true : (user.isEmailVerified || false);
        user.emailOtp = otp;
        user.otpExpiresAt = otpExpiresAt;
        user.otpAttempts = 0;
        user.otpSentAt = new Date().toISOString();
      }

      await saveDatabase(db, user.id, normalizedEmail, { userId: previousUserId, email: previousEmail });
      
      if (isEmailVerified === true) {
        return res.json({
          message: 'Registration successful.',
          user,
          requiresOtp: false
        });
      }

      const emailResult = await sendOtpEmail(normalizedEmail, otp);

      res.json({ 
        message: emailResult.success ? 'Registration successful. OTP sent to your email.' : 'Registration successful. Please enter your 6-digit verification code.', 
        user, 
        requiresOtp: true,
        emailSent: emailResult.success,
        devOtp: emailResult.otp
      });
    } catch (err: any) {
      console.error('[AxyFx Journal Server] Register endpoint error:', err);
      res.status(500).json({ error: `Server register error: ${err?.message || err}` });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password, id, userId } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const normalizedEmail = email.toLowerCase().trim();
      const authUserId = (req.headers['x-auth-user-id'] as string) || id || userId || '';
      let db = await ensureUserDbLoaded(authUserId, normalizedEmail);
      let user = db.users.find((u: any) => 
        (authUserId && u.id === authUserId) || 
        u.email.toLowerCase() === normalizedEmail
      );
      const previousUserId = user?.id;
      const previousEmail = user?.email;

      if (!user) {
        return res.status(404).json({ error: 'No account found with this email. Please register first.' });
      }

      if (user.password && password) {
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return res.status(401).json({ error: 'Invalid password. Please check your credentials and try again.' });
        }
      } else if (password && !user.password) {
        user.password = await bcrypt.hash(password, 10);
        await saveDatabase(db, user.id, normalizedEmail);
      }

      if (authUserId && user.id !== authUserId) {
        user.id = authUserId;
        await saveDatabase(db, user.id, normalizedEmail, { userId: previousUserId, email: previousEmail });
      }

      res.json({ message: 'Login successful', user });
    } catch (err: any) {
      console.error('[AxyFx Journal Server] Login endpoint error:', err);
      res.status(500).json({ error: `Server login error: ${err?.message || err}` });
    }
  });

  app.post('/api/auth/verify-otp', async (req, res) => {
    try {
      const { email, otp } = req.body;
      if (!email || !otp) {
        return res.status(400).json({ error: 'Email and 6-digit OTP code are required.' });
      }

      const normalizedEmail = email.toLowerCase().trim();
      let db = await ensureUserDbLoaded(normalizedEmail);
      let user = db.users.find((u: any) => u.email.toLowerCase() === normalizedEmail);

      if (!user) {
        return res.status(404).json({ error: 'Account not found. Please register first.' });
      }

      if (user.emailOtp && user.emailOtp === otp.toString().trim()) {
        const expiresAt = user.otpExpiresAt ? new Date(user.otpExpiresAt).getTime() : 0;
        if (Date.now() > expiresAt) {
          return res.status(400).json({ error: 'Verification code has expired. Please click resend to get a new code.' });
        }

        user.isEmailVerified = true;
        delete user.emailOtp;
        delete user.otpExpiresAt;

        await saveDatabase(db, normalizedEmail);
        return res.json({ message: 'Email verified successfully.', user });
      } else {
        return res.status(400).json({ error: 'Invalid 6-digit verification code.' });
      }
    } catch (err: any) {
      console.error('[AxyFx Journal Server] Verify OTP error:', err);
      return res.status(500).json({ error: `Server verify OTP error: ${err?.message || err}` });
    }
  });

  app.post('/api/auth/resend-otp', async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'Email is required.' });
      }

      const normalizedEmail = email.toLowerCase().trim();
      let db = await ensureUserDbLoaded(normalizedEmail);
      let user = db.users.find((u: any) => u.email.toLowerCase() === normalizedEmail);

      if (!user) {
        return res.status(404).json({ error: 'User account not found.' });
      }

      const newOtp = generateOtp();
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      user.emailOtp = newOtp;
      user.otpExpiresAt = otpExpiresAt;
      user.otpSentAt = new Date().toISOString();

      await saveDatabase(db, normalizedEmail);
      const emailResult = await sendOtpEmail(normalizedEmail, newOtp);

      return res.json({ 
        message: emailResult.success ? 'New verification code sent to ' + normalizedEmail : 'New verification code generated.',
        emailSent: emailResult.success,
        devOtp: emailResult.otp
      });
    } catch (err: any) {
      console.error('[AxyFx Journal Server] Resend OTP error:', err);
      return res.status(500).json({ error: `Server resend OTP error: ${err?.message || err}` });
    }
  });

  // ==========================================
  // FORGOT PASSWORD / RESET PASSWORD ROUTES
  // ==========================================

  app.post('/api/auth/forgot-password', authRateLimiter, async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: 'Email is required.' });

      const normalizedEmail = email.toLowerCase().trim();
      const db = await ensureUserDbLoaded(normalizedEmail);
      const user = db.users.find((u: any) => u.email.toLowerCase() === normalizedEmail);

      // If user not found or not verified, respond with neutral message (prevent account enumeration)
      if (!user || !user.isEmailVerified) {
        return res.json({ message: 'If this email is registered, a password reset code has been sent.' });
      }

      const otp = generateOtp();
      user.resetOtp = otp;
      user.resetOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      await saveDatabase(db, normalizedEmail);

      const emailResult = await sendOtpEmail(normalizedEmail, otp, 'Password Reset Code');
      console.log(`[Auth] Password reset OTP sent to ${normalizedEmail}, emailSent: ${emailResult.success}`);

      return res.json({ 
        message: 'If this email is registered, a password reset code has been sent.',
        // In dev/fallback mode only, expose the OTP so it can be shown in UI
        devOtp: emailResult.otp
      });
    } catch (err: any) {
      console.error('[Auth] Forgot password error:', err);
      return res.status(500).json({ error: 'Server error during password reset request.' });
    }
  });

  app.post('/api/auth/reset-password', authRateLimiter, async (req, res) => {
    try {
      const { email, otp, newPassword } = req.body;
      if (!email || !otp || !newPassword) {
        return res.status(400).json({ error: 'Email, reset code, and new password are all required.' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters.' });
      }

      const normalizedEmail = email.toLowerCase().trim();
      const db = await ensureUserDbLoaded(normalizedEmail);
      const user = db.users.find((u: any) => u.email.toLowerCase() === normalizedEmail);

      if (!user) {
        return res.status(400).json({ error: 'Invalid or expired reset code.' });
      }

      if (!user.resetOtp || user.resetOtp !== otp.toString().trim()) {
        return res.status(400).json({ error: 'Invalid reset code. Please check the code sent to your email.' });
      }

      const expiry = user.resetOtpExpiresAt ? new Date(user.resetOtpExpiresAt).getTime() : 0;
      if (Date.now() > expiry) {
        return res.status(400).json({ error: 'Reset link expired. Please request a new password reset.' });
      }

      // Hash and update password
      user.password = await bcrypt.hash(newPassword, 10);
      delete user.resetOtp;
      delete user.resetOtpExpiresAt;

      await saveDatabase(db, normalizedEmail);
      console.log(`[Auth] Password successfully reset for ${normalizedEmail}`);

      return res.json({ message: 'Password updated successfully. You can now log in with your new password.' });
    } catch (err: any) {
      console.error('[Auth] Reset password error:', err);
      return res.status(500).json({ error: 'Server error during password reset.' });
    }
  });

  app.post('/api/auth/onboarding', async (req, res) => {
    
    let db = (req as any).userDb;
    let currentUser = (req as any).currentUser;
    const authEmail = currentUser?.email;
    if (!currentUser || !db) return res.status(401).json({ error: 'Not authenticated' });
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

      await saveDatabase(db, authEmail);
      currentUser = db.users[userIdx];
      res.json({ message: 'Onboarding completed successfully', user: currentUser });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  });

  app.post('/api/auth/update-profile', async (req, res) => {
    
    let db = (req as any).userDb;
    let currentUser = (req as any).currentUser;
    const authEmail = currentUser?.email;
    if (!currentUser || !db) return res.status(401).json({ error: 'Not authenticated' });
    const { name, email, isPro } = req.body;

    const userIdx = db.users.findIndex((u: any) => u.id === currentUser?.id);
    if (userIdx !== -1) {
      const previousUserId = db.users[userIdx].id;
      const previousEmail = db.users[userIdx].email;
      if (name) db.users[userIdx].name = name;
      if (email) db.users[userIdx].email = email;
      if (typeof isPro === 'boolean') db.users[userIdx].isPro = isPro;
      
      await saveDatabase(db, db.users[userIdx].id, db.users[userIdx].email, { userId: previousUserId, email: previousEmail });
      currentUser = db.users[userIdx];
      res.json({ message: 'Profile updated successfully', user: currentUser });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  });

  // ==========================================
  // TRADING ACCOUNTS ROUTES
  // ==========================================

  app.get('/api/accounts', async (req, res) => {
    let db = (req as any).userDb;
    let currentUser = (req as any).currentUser;
    if (!currentUser || !db) return res.json({ accounts: [] });
    const userAccounts = (db.accounts || []).filter((acc: any) => acc.userId === currentUser.id);
    console.log(`[GET /api/accounts] User: ${currentUser.id} (${currentUser.email}), total DB accounts: ${db.accounts?.length}, filtered user accounts: ${userAccounts.length}`);
    res.json({ accounts: userAccounts });
  });

  app.post('/api/accounts', async (req, res) => {
    let db = (req as any).userDb;
    let currentUser = (req as any).currentUser;
    const authEmail = currentUser?.email;
    if (!currentUser || !db) return res.status(401).json({ error: 'Not authenticated' });
    
    if (!db.accounts) db.accounts = [];
    if (!db.riskSettings) db.riskSettings = [];

    const { name, broker, platform, accountType, currency, startingBalance } = req.body;
    if (!name || !broker || startingBalance === undefined || startingBalance === null) {
      return res.status(400).json({ error: 'Account name, broker, and starting balance are required.' });
    }

    const startBal = parseFloat(startingBalance) || 10000;

    const newAcc: TradingAccount = {
      id: `acc_${Date.now()}`,
      userId: currentUser.id,
      name,
      broker,
      platform: platform || 'MT5',
      accountType: accountType || 'Live',
      currency: currency || 'USD',
      startingBalance: startBal,
      currentBalance: startBal,
      equity: startBal,
      status: 'Active'
    };

    db.accounts.push(newAcc);

    // Create default risk settings
    const newRisk: RiskSettings = {
      id: `r_${Date.now()}`,
      accountId: newAcc.id,
      riskPerTradeLimit: 2.0,
      dailyLossLimit: startBal * 0.05,
      weeklyLossLimit: startBal * 0.10,
      maxDrawdownLimit: 10.0,
      disciplineEnabled: true,
      maxTradesPerDay: 5
    };
    db.riskSettings.push(newRisk);

    await saveDatabase(db, authEmail);
    res.json({ message: 'Trading account created', account: newAcc });
  });

  app.put('/api/accounts/:id', async (req, res) => {
    
    let db = (req as any).userDb;
    let currentUser = (req as any).currentUser;
    const authEmail = currentUser?.email;
    if (!currentUser || !db) return res.status(401).json({ error: 'Not authenticated' });
    const { id } = req.params;
    const { name, broker, status, currentBalance, equity, currency, startingBalance } = req.body;

    const accIdx = db.accounts.findIndex((acc: any) => acc.id === id);
    if (accIdx !== -1 && db.accounts[accIdx].userId === currentUser.id) {
      if (name) db.accounts[accIdx].name = name;
      if (broker) db.accounts[accIdx].broker = broker;
      if (status) db.accounts[accIdx].status = status;
      if (currency) db.accounts[accIdx].currency = currency;
      if (startingBalance !== undefined) db.accounts[accIdx].startingBalance = parseFloat(startingBalance);
      if (currentBalance !== undefined) db.accounts[accIdx].currentBalance = parseFloat(currentBalance);
      if (equity !== undefined) db.accounts[accIdx].equity = parseFloat(equity);

      await saveDatabase(db, authEmail);
      res.json({ message: 'Account updated successfully', account: db.accounts[accIdx] });
    } else if (accIdx !== -1) {
      res.status(403).json({ error: 'You can only edit your own trading accounts.' });
    } else {
      res.status(404).json({ error: 'Account not found' });
    }
  });

  app.delete('/api/accounts/:id', async (req, res) => {
    
    let db = (req as any).userDb;
    let currentUser = (req as any).currentUser;
    const authEmail = currentUser?.email;
    if (!currentUser || !db) return res.status(401).json({ error: 'Not authenticated' });
    const { id } = req.params;

    const targetAccount = db.accounts.find((acc: any) => acc.id === id);
    if (!targetAccount) {
      return res.status(404).json({ error: 'Account not found' });
    }
    if (targetAccount.userId !== currentUser.id) {
      return res.status(403).json({ error: 'You can only delete your own trading accounts.' });
    }

    const initialLength = db.accounts.length;
    db.accounts = db.accounts.filter((acc: any) => acc.id !== id);
    
    if (db.accounts.length < initialLength) {
      // Clean up trades associated with this account
      db.trades = db.trades.filter((t: any) => t.accountId !== id);
      db.riskSettings = db.riskSettings.filter((r: any) => r.accountId !== id);
      await saveDatabase(db, authEmail);
      res.json({ message: 'Account and associated trades deleted successfully' });
    } else {
      res.status(404).json({ error: 'Account not found' });
    }
  });

  // ==========================================
  // TRADING JOURNAL / TRADES ROUTES
  // ==========================================

  app.get('/api/trades', async (req, res) => {
    let db = (req as any).userDb;
    let currentUser = (req as any).currentUser;
    if (!currentUser || !db) return res.json({ trades: [] });

    const { accountId } = req.query;
    let accountTrades = [];
    if (accountId) {
      const targetAccount = db.accounts.find((acc: any) => acc.id === accountId);
      if (targetAccount && targetAccount.userId !== currentUser.id) {
        return res.status(403).json({ error: 'You can only view trades for your own accounts.' });
      }
      accountTrades = (db.trades || []).filter((t: any) => t.accountId === accountId);
    } else {
      accountTrades = db.trades || [];
    }

    // Sort descending by date
    accountTrades.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json({ trades: accountTrades });
  });

  app.post('/api/trades', async (req, res) => {
    

    let db = (req as any).userDb;
    let currentUser = (req as any).currentUser;
    const authEmail = currentUser?.email;
    if (!currentUser || !db) return res.status(401).json({ error: 'Not authenticated' });
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

    if (!symbol || !type || !lotSize || !entryPrice || !exitPrice || profit === undefined) {
      return res.status(400).json({ error: 'Missing required trade parameters' });
    }

    const ownAccounts = (db.accounts || []).filter((acc: any) => acc.userId === currentUser.id);
    if (accountId) {
      const requestedAccount = db.accounts.find((acc: any) => acc.id === accountId);
      if (!requestedAccount) {
        return res.status(404).json({ error: 'Account not found' });
      }
      if (requestedAccount.userId !== currentUser.id) {
        return res.status(403).json({ error: 'You can only add trades to your own accounts.' });
      }
    }

    // Verify account existence in user's scoped database
    let accountIdx = ownAccounts.findIndex((acc: any) => acc.id === accountId);
    if (accountIdx === -1) {
      if (ownAccounts.length > 0) {
        accountIdx = 0; // Fallback to primary own account only
      } else {
        const defaultAccId = `acc_${Date.now()}`;
        db.accounts.push({
          id: defaultAccId,
          userId: currentUser.id,
          name: 'Main Trading Account',
          broker: 'MetaTrader 5',
          startingBalance: 10000,
          currentBalance: 10000,
          equity: 10000,
          currency: 'USD',
          status: 'Active',
          createdAt: new Date().toISOString()
        });
        accountIdx = db.accounts.length - 1;
      }
    } else {
      accountIdx = db.accounts.findIndex((acc: any) => acc.id === ownAccounts[accountIdx].id);
    }

    const targetAccountId = db.accounts[accountIdx].id;

    // Prevent immediate accidental double clicks (2 seconds window)
    const nowMs = Date.now();
    const duplicateExists = db.trades.some((t: any) => 
      t.accountId === targetAccountId &&
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
      accountId: targetAccountId,
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

    await saveDatabase(db, authEmail);
    res.json({ message: 'Trade logged successfully', trade: newTrade, updatedAccount: db.accounts[accountIdx] });
  });

  app.put('/api/trades/:id', async (req, res) => {
    

    let db = (req as any).userDb;
    let currentUser = (req as any).currentUser;
    const authEmail = currentUser?.email;
    if (!currentUser || !db) return res.status(401).json({ error: 'Not authenticated' });
    const { id } = req.params;
    const updateData = req.body;

    const tradeIdx = db.trades.findIndex((t: any) => t.id === id);
    if (tradeIdx === -1) return res.status(404).json({ error: 'Trade not found' });

    const trade = db.trades[tradeIdx];
    // Verify account exists
    const account = db.accounts.find((acc: any) => acc.id === trade.accountId);
    if (!account) return res.status(404).json({ error: 'Associated account not found' });
    if (account.userId !== currentUser.id) return res.status(403).json({ error: 'You can only edit your own trades.' });

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

    await saveDatabase(db, authEmail);
    res.json({ message: 'Trade updated successfully', trade: db.trades[tradeIdx] });
  });

  app.delete('/api/trades/:id', async (req, res) => {
    

    let db = (req as any).userDb;
    let currentUser = (req as any).currentUser;
    const authEmail = currentUser?.email;
    if (!currentUser || !db) return res.status(401).json({ error: 'Not authenticated' });
    const { id } = req.params;

    const tradeIdx = db.trades.findIndex((t: any) => t.id === id);
    if (tradeIdx === -1) return res.status(404).json({ error: 'Trade not found' });

    const trade = db.trades[tradeIdx];
    let accIdx = db.accounts.findIndex((acc: any) => acc.id === trade.accountId);
    if (accIdx === -1) return res.status(404).json({ error: 'Associated account not found' });
    if (db.accounts[accIdx].userId !== currentUser.id) return res.status(403).json({ error: 'You can only delete your own trades.' });

    // Reverse trade impact from balance
    const netProfit = trade.profit + (trade.commission || 0) + (trade.swap || 0);
    db.accounts[accIdx].currentBalance = parseFloat((db.accounts[accIdx].currentBalance - netProfit).toFixed(2));
    db.accounts[accIdx].equity = db.accounts[accIdx].currentBalance;

    db.trades.splice(tradeIdx, 1);
    await saveDatabase(db, authEmail);

    res.json({ message: 'Trade deleted successfully', updatedAccount: db.accounts[accIdx] });
  });

  // ==========================================
  // RISK SETTINGS ROUTES
  // ==========================================

  app.get('/api/risk-settings/:accountId', async (req, res) => {
    let db = (req as any).userDb;
    let currentUser = (req as any).currentUser;
    if (!currentUser || !db) return res.status(401).json({ error: 'Not authenticated' });

    const { accountId } = req.params;
    const account = db.accounts.find((acc: any) => acc.id === accountId);
    if (account && account.userId !== currentUser.id) {
      return res.status(403).json({ error: 'You can only view risk settings for your own accounts.' });
    }
    const settings = (db.riskSettings || []).find((r: any) => r.accountId === accountId);
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

  app.put('/api/risk-settings/:accountId', async (req, res) => {
    
    let db = (req as any).userDb;
    let currentUser = (req as any).currentUser;
    const authEmail = currentUser?.email;
    if (!currentUser || !db) return res.status(401).json({ error: 'Not authenticated' });
    const { accountId } = req.params;
    const { riskPerTradeLimit, dailyLossLimit, weeklyLossLimit, maxDrawdownLimit, disciplineEnabled, maxTradesPerDay } = req.body;
    const account = db.accounts.find((acc: any) => acc.id === accountId);
    if (account && account.userId !== currentUser.id) {
      return res.status(403).json({ error: 'You can only update risk settings for your own accounts.' });
    }

    const idx = db.riskSettings.findIndex((r: any) => r.accountId === accountId);
    if (idx !== -1) {
      db.riskSettings[idx].riskPerTradeLimit = parseFloat(riskPerTradeLimit);
      db.riskSettings[idx].dailyLossLimit = parseFloat(dailyLossLimit);
      db.riskSettings[idx].weeklyLossLimit = parseFloat(weeklyLossLimit);
      db.riskSettings[idx].maxDrawdownLimit = parseFloat(maxDrawdownLimit);
      db.riskSettings[idx].disciplineEnabled = !!disciplineEnabled;
      db.riskSettings[idx].maxTradesPerDay = parseInt(maxTradesPerDay) || 5;
      await saveDatabase(db, authEmail);
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
      await saveDatabase(db, authEmail);
      res.json({ message: 'Risk parameters created', riskSettings: newRisk });
    }
  });

  // ==========================================
  // MT5 CONNECTIONS & EA ENDPOINT
  // ==========================================

  app.get('/api/mt5/connections', (req, res) => {
    let db = (req as any).userDb;
    let currentUser = (req as any).currentUser;
    if (!currentUser || !db) return res.json({ connections: [] });
    const userConns = (db.mt5Connections || []).filter((conn: any) => conn.userId === currentUser?.id);
    res.json({ connections: userConns });
  });

  // Check Python bridge health status
  app.get('/api/mt5/bridge-status', async (req, res) => {
    const health = await checkBridgeHealth();
    res.json(health);
  });

  // Connect MT5 via local Python Bridge (investor password — free, no MetaApi)
  app.post('/api/mt5/connect-investor', async (req, res) => {
    let db = (req as any).userDb;
    let currentUser = (req as any).currentUser;
    const authEmail = currentUser?.email;
    if (!currentUser || !db) return res.status(401).json({ error: 'Not authenticated' });
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
    let db = (req as any).userDb;
    let currentUser = (req as any).currentUser;
    const authEmail = currentUser?.email;
    if (!currentUser || !db) return res.status(401).json({ error: 'Not authenticated' });
    const { loginNumber, brokerName, startingBalance, historyMonths } = req.body;

    if (!db.accounts) db.accounts = [];
    if (!db.riskSettings) db.riskSettings = [];
    if (!db.mt5Connections) db.mt5Connections = [];

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
    let db = (req as any).userDb;
    let currentUser = (req as any).currentUser;
    const authEmail = currentUser?.email;
    if (!currentUser || !db) return res.status(401).json({ error: 'Not authenticated' });
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
    let db = (req as any).userDb;
    let currentUser = (req as any).currentUser;
    const authEmail = currentUser?.email;
    if (!currentUser || !db) return res.status(401).json({ error: 'Not authenticated' });
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
    let db = (req as any).userDb;
    let currentUser = (req as any).currentUser;
    const authEmail = currentUser?.email;
    if (!currentUser || !db) return res.status(401).json({ error: 'Not authenticated' });
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
    let db = (req as any).userDb;
    let currentUser = (req as any).currentUser;
    const authEmail = currentUser?.email;
    if (!currentUser || !db) return res.status(401).json({ error: 'Not authenticated' });
    const { accountId, autoSync } = req.body;

    const connection = db.mt5Connections.find((conn: any) => conn.accountId === accountId && conn.userId === currentUser?.id);
    if (!connection) return res.status(404).json({ error: 'Connection not found' });

    connection.autoSync = !!autoSync;
    saveDatabase(db);
    res.json({ message: 'Auto sync settings updated.', connection });
  });

  // Developer mock action to trigger a trade sync from the Expert Advisor simulation
  app.post('/api/mt5/connections/test-sync', (req, res) => {
    let db = (req as any).userDb;
    let currentUser = (req as any).currentUser;
    const authEmail = currentUser?.email;
    if (!currentUser || !db) return res.status(401).json({ error: 'Not authenticated' });
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
      let db = await ensureUserDbLoaded(email);
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
    let db = (req as any).userDb;
    let currentUser = (req as any).currentUser;
    const authEmail = currentUser?.email;
    if (!currentUser || !db) return res.status(401).json({ error: 'Not authenticated' });
    
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

    const targetAcc = db.accounts?.find((a: any) => a.id === accountId);
    const accountName = targetAcc ? targetAcc.name : 'Primary Portfolio';

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
    const userMessage = messages.length > 0 ? (messages[messages.length - 1]?.content || '') : '';

    const generateSmartMentorFallback = (msgText: string, trades: any[], accName: string) => {
      const msg = msgText.toLowerCase().trim();
      const totalTrades = trades.length;

      if (totalTrades === 0) {
        return `Hello! I noticed you don't have any logged trades yet in "${accName}". To get personalized AI feedback on your discipline, win rate, and risk management, start logging your trades in the Trading Journal or connect your MT5 account!`;
      }

      const wins = trades.filter((t: any) => (t.profit || 0) > 0);
      const losses = trades.filter((t: any) => (t.profit || 0) < 0);
      const totalProfit = trades.reduce((acc: number, t: any) => acc + (t.profit || 0), 0);
      const winRate = totalTrades > 0 ? ((wins.length / totalTrades) * 100).toFixed(1) : '0';
      
      const totalWinAmount = wins.reduce((acc: number, t: any) => acc + (t.profit || 0), 0);
      const totalLossAmount = Math.abs(losses.reduce((acc: number, t: any) => acc + (t.profit || 0), 0));
      const avgWin = wins.length > 0 ? (totalWinAmount / wins.length).toFixed(2) : '0.00';
      const avgLoss = losses.length > 0 ? (totalLossAmount / losses.length).toFixed(2) : '0.00';
      const profitFactor = totalLossAmount > 0 ? (totalWinAmount / totalLossAmount).toFixed(2) : (totalWinAmount > 0 ? 'Inf' : '1.0');

      const symbolsCount: Record<string, number> = {};
      trades.forEach((t: any) => {
        if (t.symbol) symbolsCount[t.symbol] = (symbolsCount[t.symbol] || 0) + 1;
      });
      const topSymbol = Object.entries(symbolsCount).sort((a,b) => b[1] - a[1])[0]?.[0] || 'N/A';

      const emotionCount: Record<string, number> = {};
      trades.forEach((t: any) => {
        if (t.emotion) emotionCount[t.emotion] = (emotionCount[t.emotion] || 0) + 1;
      });
      const topEmotion = Object.entries(emotionCount).sort((a,b) => b[1] - a[1])[0]?.[0] || 'Neutral';

      if (/^(hy|hi|hello|hey|greetings|hola|sup|good morning|good afternoon)/.test(msg)) {
        return `Hello! I am your AI Trading Mentor analyzing your **"${accName}"** portfolio.\n\n` +
          `Here is a snapshot of your account performance across **${totalTrades} logged trade${totalTrades > 1 ? 's' : ''}**:\n` +
          `• **Total P/L**: ${totalProfit >= 0 ? '+' : ''}$${totalProfit.toFixed(2)}\n` +
          `• **Win Rate**: ${winRate}% (${wins.length} Wins / ${losses.length} Losses)\n` +
          `• **Most Traded Symbol**: ${topSymbol}\n` +
          `• **Dominant Emotion**: ${topEmotion}\n\n` +
          `How can I help you improve today? Feel free to ask me about your win rate, risk management, trade execution, or psychology strategies!`;
      }

      if (msg.includes('risk') || msg.includes('lot') || msg.includes('money management') || msg.includes('drawdown')) {
        const avgRisk = (trades.reduce((acc: number, t: any) => acc + (t.riskPercentage || 1), 0) / totalTrades).toFixed(1);
        return `### 🛡️ Risk Management Analysis for "${accName}"\n\n` +
          `• **Average Risk Per Trade**: ${avgRisk}%\n` +
          `• **Average Win vs Average Loss**: $${avgWin} vs $${avgLoss}\n` +
          `• **Profit Factor**: ${profitFactor}\n\n` +
          `**Mentor Recommendations**:\n` +
          `1. Maintain strict risk per trade under **1.0% - 2.0%** of your total capital.\n` +
          `2. Target a Minimum Reward-to-Risk ratio of **1:1.5** or higher.\n` +
          `3. Avoid increasing lot sizes after a losing trade (revenge trading).`;
      }

      if (msg.includes('psychology') || msg.includes('fomo') || msg.includes('emotion') || msg.includes('discipline') || msg.includes('mindset')) {
        return `### 🧠 Trading Psychology & Emotional Control\n\n` +
          `Across your ${totalTrades} trades, your most recorded emotional state is **${topEmotion}**.\n\n` +
          `**Key Guidelines**:\n` +
          `• **FOMO Control**: Never enter a trade after momentum has already extended; wait for price to retest structural support or resistance.\n` +
          `• **Session Cutoff**: Stop trading after 2 consecutive losses in a session to prevent emotional spiraling.\n` +
          `• **Process Focus**: Evaluate trade quality on plan execution rather than immediate financial outcome.`;
      }

      if (msg.includes('win') || msg.includes('loss') || msg.includes('stat') || msg.includes('performance') || msg.includes('analyze') || msg.includes('summary')) {
        return `### 📊 Performance Analysis for "${accName}"\n\n` +
          `• **Total Trades Analyzed**: ${totalTrades}\n` +
          `• **Win Rate**: ${winRate}%\n` +
          `• **Net P/L**: ${totalProfit >= 0 ? '+' : ''}$${totalProfit.toFixed(2)}\n` +
          `• **Average Win**: $${avgWin}\n` +
          `• **Average Loss**: $${avgLoss}\n` +
          `• **Top Pair**: ${topSymbol}\n\n` +
          `**Insight**: ${parseFloat(winRate) >= 50 ? 'Your win rate is strong! Focus on letting winners run to your predefined Take-Profit zones.' : 'Work on filtering trade entries at higher-timeframe confluence zones to boost your win percentage.'}`;
      }

      return `I have analyzed your **${totalTrades} trade${totalTrades > 1 ? 's' : ''}** logged in **"${accName}"**:\n\n` +
        `• **Net P/L**: ${totalProfit >= 0 ? '+' : ''}$${totalProfit.toFixed(2)}\n` +
        `• **Win Rate**: ${winRate}% (${wins.length} Wins, ${losses.length} Losses)\n` +
        `• **Average Win / Loss**: $${avgWin} / $${avgLoss}\n` +
        `• **Top Traded Pair**: ${topSymbol}\n\n` +
        `Based on your trading history, focus on executing trades with consistent risk, sticking to your core strategy, and tagging your trading emotions for every trade. What specific area would you like to discuss next?`;
    };

    if (!geminiKey || geminiKey === "MY_GEMINI_API_KEY") {
      const fallbackReply = generateSmartMentorFallback(userMessage, accountTrades, accountName);
      return res.json({ reply: fallbackReply });
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

      const firstUserIdx = messages.findIndex((m: any) => m.role === 'user');
      const validMessages = firstUserIdx !== -1 ? messages.slice(firstUserIdx) : messages;

      const conversation = validMessages.map((msg: any) => ({
        role: msg.role === 'mentor' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: conversation,
        config: {
          systemInstruction
        }
      });

      const replyText = response.text || generateSmartMentorFallback(userMessage, accountTrades, accountName);

      res.json({ reply: replyText });

    } catch (err: any) {
      console.error('Gemini API Error, using smart mentor fallback:', err);
      const fallbackReply = generateSmartMentorFallback(userMessage, accountTrades, accountName);
      res.json({ reply: fallbackReply });
    }
  });

  // ==========================================
  // SUPPORT TICKETS & ANNOUNCEMENTS ROUTES
  // ==========================================

  app.get('/api/tickets', (req, res) => {
    let db = (req as any).userDb;
    let currentUser = (req as any).currentUser;
    if (!currentUser || !db) return res.json({ tickets: [] });
    // Admins see all tickets, regular users see their own
    if (currentUser.email === 'admin@axyfx.com') {
      return res.json({ tickets: db.supportTickets || [] });
    }
    const userTickets = (db.supportTickets || []).filter((t: any) => t.userId === currentUser?.id);
    res.json({ tickets: userTickets });
  });

  app.post('/api/tickets', (req, res) => {
    let db = (req as any).userDb;
    let currentUser = (req as any).currentUser;
    const authEmail = currentUser?.email;
    if (!currentUser || !db) return res.status(401).json({ error: 'Not authenticated' });
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
    let db = (req as any).userDb;
    let currentUser = (req as any).currentUser;
    const authEmail = currentUser?.email;
    if (!currentUser || !db) return res.status(401).json({ error: 'Not authenticated' });
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
    let db = (req as any).userDb;
    res.json({ announcements: db?.announcements || [] });
  });

  // ==========================================
  // PAYMENT / SUBSCRIPTION SYSTEM ROUTES
  // ==========================================

  app.post('/api/payments/checkout', (req, res) => {
    let db = (req as any).userDb;
    let currentUser = (req as any).currentUser;
    const authEmail = currentUser?.email;
    if (!currentUser || !db) return res.status(401).json({ error: 'Not authenticated' });
    
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
    let db = (req as any).userDb;
    let currentUser = (req as any).currentUser;
    const authEmail = currentUser?.email;
    if (!currentUser || !db) return res.status(401).json({ error: 'Not authenticated' });
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
