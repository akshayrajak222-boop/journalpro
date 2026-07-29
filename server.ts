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

  if (supabaseUrl && supabaseUrl.endsWith('/rest/v1/')) supabaseUrl = supabaseUrl.replace('/rest/v1/', '');
  if (supabaseUrl && supabaseUrl.endsWith('/rest/v1')) supabaseUrl = supabaseUrl.replace('/rest/v1', '');

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
const lastSyncResults = new Map(); // syncToken -> {syncedCount, supabaseError, supabaseTradeCount, timestamp}
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

function createEmptyUserDb(userId?: string, email?: string, injectDummyUser = false) {
  const cleanUserId = userId?.trim() || `user_${Date.now()}`;
  const cleanEmail = email ? email.toLowerCase().trim() : '';
  const isDemo = cleanEmail === 'admin@axyfx.com' || cleanEmail === 'demo@axyfx.com';

  const users = [];
  if (injectDummyUser || isDemo) {
    users.push({
      id: cleanUserId,
      email: cleanEmail,
      name: cleanEmail ? cleanEmail.split('@')[0] : 'Trader',
      experience: 'Intermediate',
      tradingStyle: 'Day Trading',
      mainMarkets: ['Forex', 'Gold'],
      onboardingCompleted: isDemo ? true : false,
      isPro: isDemo ? true : false,
      isEmailVerified: true
    });
  }

  return {
    users: users,
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

// Helper to convert snake_case object to camelCase
function toCamel(obj: any): any {
  if (Array.isArray(obj)) return obj.map(toCamel);
  if (obj !== null && typeof obj === 'object') {
    const n: any = {};
    Object.keys(obj).forEach(k => {
      const camelKey = k.replace(/_([a-z])/g, g => g[1].toUpperCase());
      n[camelKey] = toCamel(obj[k]);
    });
    return n;
  }
  return obj;
}

// Helper to convert camelCase object to snake_case
function toSnake(obj: any): any {
  if (Array.isArray(obj)) return obj.map(toSnake);
  if (obj !== null && typeof obj === 'object') {
    const n: any = {};
    Object.keys(obj).forEach(k => {
      const snakeKey = k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      n[snakeKey] = toSnake(obj[k]);
    });
    return n;
  }
  return obj;
}



async function ensureUserDbLoaded(userId?: string, email?: string) {
  let cleanUserId = userId?.trim() || '';
  let cleanEmail = email?.toLowerCase().trim() || '';

  if (cleanUserId.includes('@') && !cleanEmail) {
    cleanEmail = cleanUserId.toLowerCase();
    cleanUserId = '';
  }
  if (!cleanUserId && !cleanEmail) {
    return createEmptyUserDb('guest_user', 'guest@example.com', false);
  }

  // Load from SQL tables if Supabase is enabled
  if (useSupabase && (cleanUserId || cleanEmail)) {
    try {
      // If we only have email (e.g. from MT5 EA sync), look up the user first
      if (!cleanUserId && cleanEmail) {
        const { data: userByEmail } = await supabase.from('users').select('id').eq('email', cleanEmail).maybeSingle();
        if (userByEmail?.id) {
          cleanUserId = userByEmail.id;
        }
      }

      if (!cleanUserId) {
        // Could not resolve a userId from email — return empty DB
        return createEmptyUserDb('', cleanEmail, false);
      }

      const [
        { data: users },
        { data: accounts },
        { data: trades },
        { data: riskSettings },
        { data: supportTickets },
        { data: mt5Connections }
      ] = await Promise.all([
        supabase.from('users').select('*').eq('id', cleanUserId),
        supabase.from('trading_accounts').select('*').eq('user_id', cleanUserId),
        supabase.from('trades').select('*').eq('user_id', cleanUserId),
        supabase.from('risk_settings').select('*').eq('user_id', cleanUserId),
        supabase.from('support_tickets').select('*').eq('user_id', cleanUserId),
        supabase.from('mt5_connections').select('*').eq('user_id', cleanUserId)
      ]);

      const loadedDb = {
        users: toCamel(users || []),
        accounts: toCamel(accounts || []),
        trades: toCamel(trades || []),
        riskSettings: toCamel(riskSettings || []),
        supportTickets: toCamel(supportTickets || []),
        mt5Connections: toCamel(mt5Connections || []),
        payments: []
      };

      // Check in-memory userDatabases cache if Supabase returned 0 accounts/trades
      const cached = userDatabases.get(cleanUserId) || (cleanEmail ? userDatabases.get(cleanEmail) : null);
      if (cached) {
        if (loadedDb.accounts.length === 0 && cached.accounts?.length > 0) {
          loadedDb.accounts = cached.accounts.filter((a: any) => a.userId === cleanUserId || !a.userId);
        }
        if (loadedDb.trades.length === 0 && cached.trades?.length > 0) {
          loadedDb.trades = cached.trades.filter((t: any) => t.userId === cleanUserId || !t.userId);
        }
        if (loadedDb.riskSettings.length === 0 && cached.riskSettings?.length > 0) {
          loadedDb.riskSettings = cached.riskSettings;
        }

        // Merge transient fields (OTPs) from cache into loaded users
        if (cached.users && cached.users.length > 0 && loadedDb.users.length > 0) {
          const cachedUser = cached.users[0];
          const loadedUser = loadedDb.users[0];
          if (cachedUser.resetOtp) loadedUser.resetOtp = cachedUser.resetOtp;
          if (cachedUser.resetOtpExpiresAt) loadedUser.resetOtpExpiresAt = cachedUser.resetOtpExpiresAt;
          if (cachedUser.emailOtp) loadedUser.emailOtp = cachedUser.emailOtp;
          if (cachedUser.otpExpiresAt) loadedUser.otpExpiresAt = cachedUser.otpExpiresAt;
          if (cachedUser.otpAttempts !== undefined) loadedUser.otpAttempts = cachedUser.otpAttempts;
          if (cachedUser.otpSentAt) loadedUser.otpSentAt = cachedUser.otpSentAt;
        }
      }

      return loadedDb;
    } catch (err) {
      console.error('[AxyFx SQL Query Error]', err);
    }
  }

  const cached = userDatabases.get(cleanUserId) || (cleanEmail ? userDatabases.get(cleanEmail) : null);
  if (cached) return cached;

  return createEmptyUserDb(cleanUserId, cleanEmail, false);
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
  if (usersToSync.length === 0) return;

  const targetUser = usersToSync[0];
  const uid = targetUser.id;
  const email = targetUser.email;
  if (!uid) return;

  if (uid) userDatabases.set(uid, data);
  if (email) userDatabases.set(email.toLowerCase(), data);
  if (overrideUserId) userDatabases.set(overrideUserId, data);
  if (overrideEmail) userDatabases.set(overrideEmail.toLowerCase(), data);

  if (!useSupabase) return;

  try {
    // Upsert users
    if (data.users && data.users.length > 0) {
      const validUserCols = new Set([
        'id', 'email', 'name', 'password', 'experience', 'trading_style',
        'main_markets', 'is_pro', 'is_email_verified', 'created_at', 'updated_at',
        'email_otp', 'otp_expires_at', 'otp_attempts', 'otp_sent_at',
        'reset_otp', 'reset_otp_expires_at'
      ]);
      const sanitizedUsers = toSnake(data.users).map((u: any) => {
        const clean: any = {};
        for (const key of Object.keys(u)) {
          if (validUserCols.has(key)) {
            clean[key] = u[key];
          }
        }
        return clean;
      });
      const { error: err1 } = await supabase.from('users').upsert(sanitizedUsers, { onConflict: 'id' });
      if (err1) console.error('[saveDatabase] users upsert error:', err1);
    }
    // Upsert accounts
    if (data.accounts && data.accounts.length > 0) {
      const validAccCols = new Set([
        'id', 'user_id', 'name', 'broker', 'platform', 'account_type',
        'currency', 'starting_balance', 'current_balance', 'equity', 'status',
        'created_at', 'updated_at'
      ]);
      const accs = toSnake(data.accounts).map((a: any) => {
        const clean: any = {};
        for (const key of Object.keys(a)) {
          if (validAccCols.has(key)) {
            clean[key] = a[key];
          }
        }
        clean.user_id = clean.user_id || uid;
        return clean;
      });
      const { error: err2 } = await supabase.from('trading_accounts').upsert(accs, { onConflict: 'id' });
      if (err2) console.error('[saveDatabase] trading_accounts upsert error:', err2);
    }
    // Upsert trades
    if (data.trades && data.trades.length > 0) {
      const trds = toSnake(data.trades).map((t: any) => ({ ...t, user_id: t.user_id || uid }));
      const { error: err3 } = await supabase.from('trades').upsert(trds, { onConflict: 'id' });
      if (err3) console.error('[saveDatabase] trades upsert error:', err3);
    }
    // Upsert risk settings
    if (data.riskSettings && data.riskSettings.length > 0) {
      const rs = toSnake(data.riskSettings).map((r: any) => ({ ...r, user_id: r.user_id || uid }));
      const { error: err4 } = await supabase.from('risk_settings').upsert(rs, { onConflict: 'id' });
      if (err4) console.error('[saveDatabase] risk_settings upsert error:', err4);
    }
    // Upsert support tickets
    if (data.supportTickets && data.supportTickets.length > 0) {
      const tix = toSnake(data.supportTickets).map((t: any) => ({ ...t, user_id: t.user_id || uid }));
      await supabase.from('support_tickets').upsert(tix, { onConflict: 'id' });
    }
    // Upsert mt5 connections
    if (data.mt5Connections && data.mt5Connections.length > 0) {
      const mt5 = toSnake(data.mt5Connections).map((m: any) => ({ ...m, user_id: m.user_id || uid }));
      await supabase.from('mt5_connections').upsert(mt5, { onConflict: 'id' });
    }
  } catch(err) {
    console.error('[AxyFx SQL Save Error]', err);
  }
}

async function removeUserDatabaseAliases(userId?: string, email?: string) {
  void userId;
  void email;
}

const app = express();
const PORT = 3000;

async function verifyTurnstile(token: string): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY || '1x0000000000000000000000000000000AA';
  if (!token) return false;
  try {
    const params = new URLSearchParams();
    params.append('secret', secretKey);
    params.append('response', token);
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: params
    });
    const data = await res.json();
    return data.success;
  } catch (err) {
    console.error('Turnstile verification failed:', err);
    return false;
  }
}

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

  // CORS middleware — allow MT5 EA and browser requests from both domains
  app.use((req, res, next) => {
    const allowedOrigins = [
      'https://fxjournalpro.com',
      'https://www.fxjournalpro.com',
      'http://localhost:3000',
      'http://localhost:5173'
    ];
    const origin = req.headers['origin'] as string;
    if (!origin || allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
    } else {
      res.setHeader('Access-Control-Allow-Origin', 'https://fxjournalpro.com');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Auth-User-Id, X-Auth-Email');
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    next();
  });

  // Disable browser caching on all API routes so fresh data is always returned
  app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.removeHeader('ETag');
    next();
  });

  // Global middleware to load database and set local user context
  app.use(async (req, res, next) => {
    try {
      const authUserId = (req.headers['x-auth-user-id'] as string | undefined)?.trim();
      const authEmail = (req.headers['x-auth-email'] as string | undefined)?.trim();

      if (authUserId || authEmail) {
        const email = authEmail ? authEmail.toLowerCase() : '';
        const userId = authUserId || (email ? `user_${email}` : '');

        let db = await ensureUserDbLoaded(userId, email);

        // Use the user already resolved by ensureUserDbLoaded (by email lookup)
        // Never mutate the canonical user ID with a temporary session ID
        let dbUser = db.users[0] || null;

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

  app.get('/api/debug/env', async (req, res) => {
    let sbError = null;
    let sbData = null;
    if (useSupabase) {
      const { data, error } = await supabase.from('users').select('id').limit(1);
      sbError = error;
      sbData = data;
    }
    res.json({
      useSupabase,
      hasSupabaseUrl: !!process.env.SUPABASE_URL || !!process.env.VITE_SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_KEY || !!process.env.VITE_SUPABASE_KEY,
      url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
      sbError,
      sbData
    });
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
      const { email, name, password, isEmailVerified, id, userId, turnstileToken } = req.body;
      
      const isHuman = await verifyTurnstile(turnstileToken);
      if (!isHuman) {
        return res.status(403).json({ error: 'Captcha verification failed. Please try again.' });
      }

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const normalizedEmail = email.toLowerCase().trim();
      const authUserId = (req.headers['x-auth-user-id'] as string) || id || userId || '';

      // Check Supabase first for existing user
      let existingUserRow: any = null;
      if (useSupabase) {
        const { data } = await supabase.from('users').select('*').eq('email', normalizedEmail).maybeSingle();
        existingUserRow = data;
      }

      if (existingUserRow && existingUserRow.is_email_verified && !isEmailVerified) {
        return res.status(400).json({ error: 'An account with this email already exists. Please log in.' });
      }

      const otp = generateOtp();
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      if (isEmailVerified === true) {
        // Supabase SSO path — user already verified externally
        const uid = existingUserRow?.id || authUserId || `user_${Date.now()}`;
        const userRecord = {
          id: uid,
          email: normalizedEmail,
          name: name || normalizedEmail.split('@')[0],
          password: password ? await bcrypt.hash(password, 10) : (existingUserRow?.password || ''),
          experience: 'Intermediate',
          trading_style: 'Day Trading',
          main_markets: ['Forex', 'Gold'],
          onboarding_completed: existingUserRow?.onboarding_completed || false,
          is_pro: existingUserRow?.is_pro || false,
          is_email_verified: true
        };
        if (useSupabase) {
          await supabase.from('users').upsert(userRecord, { onConflict: 'id' });
        }
        const camelUser = toCamel(userRecord);
        return res.json({ message: 'Registration successful.', user: camelUser, requiresOtp: false });
      }

      // Standard registration path — generate OTP and save to Supabase
      const uid = existingUserRow?.id || authUserId || `user_${Date.now()}`;
      const hashedPassword = password ? await bcrypt.hash(password, 10) : (existingUserRow?.password || '');

      const userRecord = {
        id: uid,
        email: normalizedEmail,
        name: name || existingUserRow?.name || normalizedEmail.split('@')[0],
        password: hashedPassword,
        experience: existingUserRow?.experience || 'Intermediate',
        trading_style: existingUserRow?.trading_style || 'Day Trading',
        main_markets: existingUserRow?.main_markets || ['Forex', 'Gold'],
        onboarding_completed: existingUserRow?.onboarding_completed || false,
        is_pro: existingUserRow?.is_pro || false,
        is_email_verified: false,
        email_otp: otp,
        otp_expires_at: otpExpiresAt,
        otp_attempts: 0,
        otp_sent_at: new Date().toISOString()
      };

      if (useSupabase) {
        const { error: upsertErr } = await supabase.from('users').upsert(userRecord, { onConflict: 'id' });
        if (upsertErr) {
          console.error('[Register] Supabase upsert error:', upsertErr);
          return res.status(500).json({ error: 'Failed to create account. Please try again.' });
        }
      } else {
        // Fallback: in-memory
        let db = await ensureUserDbLoaded(uid, normalizedEmail);
        let user = db.users.find((u: any) => u.email.toLowerCase() === normalizedEmail);
        if (!user) {
          user = { ...toCamel(userRecord) };
          db.users.push(user);
        } else {
          Object.assign(user, toCamel(userRecord));
        }
        userDatabases.set(normalizedEmail, db);
        userDatabases.set(uid, db);
      }

      const emailResult = await sendOtpEmail(normalizedEmail, otp);
      const camelUser = toCamel(userRecord);

      res.json({
        message: emailResult.success ? 'Registration successful. OTP sent to your email.' : 'Registration successful. Please enter your 6-digit verification code.',
        user: camelUser,
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
      const { email, password, id, userId, turnstileToken } = req.body;
      
      const isHuman = await verifyTurnstile(turnstileToken);
      if (!isHuman) {
        return res.status(403).json({ error: 'Captcha verification failed. Please try again.' });
      }

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

      if (!user.password) {
        return res.status(401).json({ error: 'Incorrect password. Please try again.' });
      }

      if (!password) {
        return res.status(400).json({ error: 'Password is required to login.' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Incorrect password. Please try again.' });
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

      // Always load OTP directly from Supabase so it works on serverless (Vercel)
      if (useSupabase) {
        const { data: row, error: fetchErr } = await supabase
          .from('users')
          .select('*')
          .eq('email', normalizedEmail)
          .maybeSingle();

        if (fetchErr) {
          console.error('[verify-otp] Supabase fetch error:', fetchErr);
          return res.status(500).json({ error: 'Server error verifying OTP.' });
        }

        if (!row) {
          return res.status(404).json({ error: 'Account not found. Please register first.' });
        }

        const storedOtp = row.email_otp;
        const expiresAt = row.otp_expires_at ? new Date(row.otp_expires_at).getTime() : 0;

        if (!storedOtp || storedOtp !== otp.toString().trim()) {
          return res.status(400).json({ error: 'Invalid 6-digit verification code.' });
        }

        if (Date.now() > expiresAt) {
          return res.status(400).json({ error: 'Verification code has expired. Please click resend to get a new code.' });
        }

        // Mark email as verified and clear OTP
        const { error: updateErr } = await supabase
          .from('users')
          .update({ is_email_verified: true, email_otp: null, otp_expires_at: null })
          .eq('email', normalizedEmail);

        if (updateErr) {
          console.error('[verify-otp] Supabase update error:', updateErr);
          return res.status(500).json({ error: 'Server error confirming email.' });
        }

        const verifiedUser = toCamel({ ...row, is_email_verified: true, email_otp: null, otp_expires_at: null });
        return res.json({ message: 'Email verified successfully.', user: verifiedUser });
      }

      // Fallback: in-memory path (local dev without Supabase)
      let db = userDatabases.get(normalizedEmail) || await ensureUserDbLoaded(normalizedEmail);
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
        await saveDatabase(db, user.id, normalizedEmail);
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

      if (useSupabase) {
        const { data: row } = await supabase.from('users').select('*').eq('email', normalizedEmail).maybeSingle();
        if (!row) {
          return res.status(404).json({ error: 'User account not found.' });
        }

        const newOtp = generateOtp();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

        await supabase.from('users').update({
          email_otp: newOtp,
          otp_expires_at: otpExpiresAt,
          otp_sent_at: new Date().toISOString()
        }).eq('email', normalizedEmail);

        const emailResult = await sendOtpEmail(normalizedEmail, newOtp);
        return res.json({
          message: emailResult.success ? 'New verification code sent to ' + normalizedEmail : 'New verification code generated.',
          emailSent: emailResult.success,
          devOtp: emailResult.otp
        });
      }

      // Fallback in-memory
      let db = userDatabases.get(normalizedEmail) || await ensureUserDbLoaded(normalizedEmail);
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

      if (useSupabase) {
        const { data: row } = await supabase.from('users').select('id, is_email_verified').eq('email', normalizedEmail).maybeSingle();
        // Neutral response to prevent account enumeration
        if (!row || !row.is_email_verified) {
          return res.json({ message: 'If this email is registered, a password reset code has been sent.' });
        }

        const otp = generateOtp();
        const resetOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

        await supabase.from('users').update({
          reset_otp: otp,
          reset_otp_expires_at: resetOtpExpiresAt
        }).eq('email', normalizedEmail);

        const emailResult = await sendOtpEmail(normalizedEmail, otp, 'Password Reset Code');
        console.log(`[Auth] Password reset OTP sent to ${normalizedEmail}, emailSent: ${emailResult.success}`);

        return res.json({
          message: 'If this email is registered, a password reset code has been sent.',
          devOtp: emailResult.otp
        });
      }

      // Fallback in-memory
      const db = await ensureUserDbLoaded(normalizedEmail);
      const user = db.users.find((u: any) => u.email.toLowerCase() === normalizedEmail);
      if (!user || !user.isEmailVerified) {
        return res.json({ message: 'If this email is registered, a password reset code has been sent.' });
      }
      const otp = generateOtp();
      user.resetOtp = otp;
      user.resetOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      await saveDatabase(db, normalizedEmail);
      const emailResult = await sendOtpEmail(normalizedEmail, otp, 'Password Reset Code');
      return res.json({ message: 'If this email is registered, a password reset code has been sent.', devOtp: emailResult.otp });
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

      if (useSupabase) {
        const { data: row } = await supabase.from('users').select('*').eq('email', normalizedEmail).maybeSingle();
        if (!row) {
          return res.status(400).json({ error: 'Invalid or expired reset code.' });
        }

        if (!row.reset_otp || row.reset_otp !== otp.toString().trim()) {
          return res.status(400).json({ error: 'Invalid reset code. Please check the code sent to your email.' });
        }

        const expiry = row.reset_otp_expires_at ? new Date(row.reset_otp_expires_at).getTime() : 0;
        if (Date.now() > expiry) {
          return res.status(400).json({ error: 'Reset link expired. Please request a new password reset.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await supabase.from('users').update({
          password: hashedPassword,
          reset_otp: null,
          reset_otp_expires_at: null
        }).eq('email', normalizedEmail);

        console.log(`[Auth] Password successfully reset for ${normalizedEmail}`);
        return res.json({ message: 'Password updated successfully. You can now log in with your new password.' });
      }

      // Fallback in-memory
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
      user.password = await bcrypt.hash(newPassword, 10);
      delete user.resetOtp;
      delete user.resetOtpExpiresAt;
      await saveDatabase(db, normalizedEmail);
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

        if (useSupabase) {
          try {
            await supabase.from('trading_accounts').upsert({
              id: newAcc.id,
              user_id: currentUser.id,
              name: newAcc.name,
              broker: newAcc.broker,
              platform: newAcc.platform,
              account_type: newAcc.accountType,
              currency: newAcc.currency,
              starting_balance: newAcc.startingBalance,
              current_balance: newAcc.currentBalance,
              equity: newAcc.equity,
              status: newAcc.status
            }, { onConflict: 'id' });
          } catch (e) {
            console.error('[Onboarding] Supabase account insert error:', e);
          }
        }

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
    let currentUser = (req as any).currentUser;
    if (!currentUser) return res.json({ accounts: [] });

    // Always fetch fresh from Supabase when available
    if (useSupabase) {
      try {
        const { data: rows, error } = await supabase
          .from('trading_accounts')
          .select('*')
          .eq('user_id', currentUser.id);
        if (error) {
          console.error('[GET /api/accounts] Supabase error:', JSON.stringify(error));
        } else {
          const accounts = toCamel(rows || []);
          console.log(`[GET /api/accounts] User: ${currentUser.id}, accounts from Supabase: ${accounts.length}`);
          if (accounts.length > 0) {
            return res.json({ accounts });
          }
        }
      } catch (err: any) {
        console.error('[GET /api/accounts] Exception:', err?.message);
      }
    }

    // Fallback: use middleware db
    const db = (req as any).userDb;
    if (!db) return res.json({ accounts: [] });
    const userAccounts = (db.accounts || []).filter((acc: any) => acc.userId === currentUser.id || acc.user_id === currentUser.id);
    console.log(`[GET /api/accounts] User: ${currentUser.id} (${currentUser.email}), db.accounts count: ${(db.accounts || []).length}, filtered: ${userAccounts.length}`);
    res.json({ accounts: userAccounts });
  });

  app.post('/api/accounts', async (req, res) => {
    let db = (req as any).userDb;
    let currentUser = (req as any).currentUser;
    const authEmail = currentUser?.email;
    console.log(`[POST /api/accounts] x-auth-user-id: "${req.headers['x-auth-user-id']}", x-auth-email: "${req.headers['x-auth-email']}", resolved currentUser: ${currentUser?.id || 'NONE'}`);
    if (!currentUser || !db) return res.status(401).json({ error: 'Not authenticated. Please refresh the page and log in again.' });
    
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
      
      if (useSupabase) {
        await supabase.from('trading_accounts').delete().eq('id', id);
        await supabase.from('trades').delete().eq('account_id', id);
        await supabase.from('risk_settings').delete().eq('account_id', id);
      }
      
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
    let currentUser = (req as any).currentUser;
    if (!currentUser) return res.json({ trades: [] });

    const { accountId } = req.query;
    let accountTrades: any[] = [];

    // Always fetch fresh from Supabase when available (bypasses stale middleware cache)
    if (useSupabase) {
      try {
        let query = supabase
          .from('trades')
          .select('*')
          .eq('user_id', currentUser.id)
          .order('date', { ascending: false });

        if (accountId) {
          // Security: verify account belongs to this user
          const { data: accCheck } = await supabase
            .from('trading_accounts')
            .select('user_id')
            .eq('id', accountId)
            .maybeSingle();
          if (accCheck && accCheck.user_id !== currentUser.id) {
            return res.status(403).json({ error: 'You can only view trades for your own accounts.' });
          }
          query = query.eq('account_id', accountId as string);
        }

        const { data: rows, error } = await query;
        if (error) {
          console.error('[GET /api/trades] Supabase error:', JSON.stringify(error));
        } else {
          accountTrades = toCamel(rows || []);
          console.log(`[GET /api/trades] Fetched ${accountTrades.length} trades for user ${currentUser.id} from Supabase`);
        }
      } catch (err: any) {
        console.error('[GET /api/trades] Exception:', err?.message);
      }
    }

    if (accountTrades.length === 0) {
      // Fallback: use middleware-loaded db
      const db = (req as any).userDb;
      if (db) {
        accountTrades = accountId
          ? (db.trades || []).filter((t: any) => t.accountId === accountId && (t.userId === currentUser.id || !t.userId))
          : (db.trades || []).filter((t: any) => t.userId === currentUser.id);
        accountTrades.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      }
    }

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
    
    if (useSupabase) {
      await supabase.from('trades').delete().eq('id', id);
    }
    
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
      const existing = db.riskSettings[idx];
      existing.riskPerTradeLimit = !isNaN(parseFloat(riskPerTradeLimit)) ? parseFloat(riskPerTradeLimit) : (existing.riskPerTradeLimit ?? 2.0);
      existing.dailyLossLimit = !isNaN(parseFloat(dailyLossLimit)) ? parseFloat(dailyLossLimit) : (existing.dailyLossLimit ?? 500);
      existing.weeklyLossLimit = !isNaN(parseFloat(weeklyLossLimit)) ? parseFloat(weeklyLossLimit) : (existing.weeklyLossLimit ?? 1500);
      existing.maxDrawdownLimit = !isNaN(parseFloat(maxDrawdownLimit)) ? parseFloat(maxDrawdownLimit) : (existing.maxDrawdownLimit ?? 10.0);
      if (disciplineEnabled !== undefined) {
        existing.disciplineEnabled = !!disciplineEnabled;
      }
      existing.maxTradesPerDay = !isNaN(parseInt(maxTradesPerDay)) ? parseInt(maxTradesPerDay) : (existing.maxTradesPerDay ?? 5);
      await saveDatabase(db, authEmail);
      res.json({ message: 'Risk parameters saved', riskSettings: existing });
    } else {
      const newRisk: RiskSettings = {
        id: `r_${Date.now()}`,
        accountId,
        riskPerTradeLimit: !isNaN(parseFloat(riskPerTradeLimit)) ? parseFloat(riskPerTradeLimit) : 2.0,
        dailyLossLimit: !isNaN(parseFloat(dailyLossLimit)) ? parseFloat(dailyLossLimit) : 500,
        weeklyLossLimit: !isNaN(parseFloat(weeklyLossLimit)) ? parseFloat(weeklyLossLimit) : 1500,
        maxDrawdownLimit: !isNaN(parseFloat(maxDrawdownLimit)) ? parseFloat(maxDrawdownLimit) : 10.0,
        disciplineEnabled: disciplineEnabled !== undefined ? !!disciplineEnabled : true,
        maxTradesPerDay: !isNaN(parseInt(maxTradesPerDay)) ? parseInt(maxTradesPerDay) : 5
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

      await saveDatabase(db);
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
  app.post('/api/mt5/connect-ea', async (req, res) => {
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

    await saveDatabase(db);
    res.json({
      message: 'MT5 EA account connected successfully.',
      connection,
      account: newAccount
    });
  });

  // Update MT5 Connection historical import settings
  app.post('/api/mt5/connections/:id/update-history', async (req, res) => {
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

    await saveDatabase(db);
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

      await saveDatabase(db);
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
  app.post('/api/mt5/disconnect-investor', async (req, res) => {
    let db = (req as any).userDb;
    let currentUser = (req as any).currentUser;
    const authEmail = currentUser?.email;
    if (!currentUser || !db) return res.status(401).json({ error: 'Not authenticated' });
    const { accountId } = req.body;

    const idx = db.mt5Connections.findIndex((conn: any) => conn.accountId === accountId && conn.userId === currentUser?.id);
    if (idx !== -1) {
      db.mt5Connections.splice(idx, 1);
      await saveDatabase(db);
    }
    res.json({ message: 'MT5 Investor account disconnected successfully.' });
  });

  // Toggle Auto Sync
  app.post('/api/mt5/toggle-auto-sync', async (req, res) => {
    let db = (req as any).userDb;
    let currentUser = (req as any).currentUser;
    const authEmail = currentUser?.email;
    if (!currentUser || !db) return res.status(401).json({ error: 'Not authenticated' });
    const { accountId, autoSync } = req.body;

    const connection = db.mt5Connections.find((conn: any) => conn.accountId === accountId && conn.userId === currentUser?.id);
    if (!connection) return res.status(404).json({ error: 'Connection not found' });

    connection.autoSync = !!autoSync;
    await saveDatabase(db);
    res.json({ message: 'Auto sync settings updated.', connection });
  });

  // Developer mock action to trigger a trade sync from the Expert Advisor simulation
  app.post('/api/mt5/connections/test-sync', async (req, res) => {
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

    await saveDatabase(db);
    res.json({ message: 'MT5 trade synchronized successfully!', trade: simulatedTrade });
  });

  // ==========================================
  // MT5 EA SYNC API — GET health check
  // ==========================================
  app.get('/api/mt5/sync', (req, res) => {
    console.log('[MT5 Sync] GET /api/mt5/sync — health check ping');
    return res.status(200).json({ status: 'MT5 Sync API Running' });
  });

  // Secure EA synchronization API hit by MT5 Experts Terminal
  app.post('/api/mt5/sync', async (req, res) => {
    // ---- Server-side logging ----

    // ═══════════════════════════════════════════════════
    // STEP 1: LOG FULL INCOMING PAYLOAD
    // ═══════════════════════════════════════════════════
    const rawBody = req.body || {};
    console.log('═══════════════════════════════════════');
    console.log('[MT5 Sync] ▶ POST /api/mt5/sync received');
    console.log('[MT5 Sync] Content-Type:', req.headers['content-type']);
    console.log('[MT5 Sync] syncToken:', rawBody.syncToken ? `"${rawBody.syncToken}"` : 'MISSING');
    console.log('[MT5 Sync] email:', rawBody.email || 'NOT PROVIDED');
    console.log('[MT5 Sync] balance:', rawBody.balance);
    console.log('[MT5 Sync] trades array length:', Array.isArray(rawBody.trades) ? rawBody.trades.length : `NOT AN ARRAY (type: ${typeof rawBody.trades})`);
    if (Array.isArray(rawBody.trades) && rawBody.trades.length > 0) {
      console.log('[MT5 Sync] First trade sample:', JSON.stringify(rawBody.trades[0]));
      console.log('[MT5 Sync] Last trade sample:', JSON.stringify(rawBody.trades[rawBody.trades.length - 1]));
    } else {
      console.log('[MT5 Sync] ⚠ EA sent EMPTY trades array — no closed trades in history period');
    }
    console.log('═══════════════════════════════════════');

    let { syncToken, email, trades, balance } = rawBody;
    syncToken = (syncToken || '').trim();
    if (!syncToken) {
      console.warn('[MT5 Sync] ✗ Missing syncToken — returning 401');
      return res.status(401).json({ error: 'Invalid or missing authorization token' });
    }

    // ═══════════════════════════════════════════════════
    // STEP 2: LOOK UP CONNECTION BY SYNC TOKEN
    // ═══════════════════════════════════════════════════
    let connection: any = null;
    let db: any = null;
    let connRow: any = null;

    if (useSupabase) {
      try {
        const result = await supabase
          .from('mt5_connections')
          .select('*')
          .eq('sync_token', syncToken)
          .maybeSingle();

        console.log('[MT5 Sync] Supabase token lookup error:', result.error ? JSON.stringify(result.error) : 'none');
        console.log('[MT5 Sync] Supabase connRow found:', result.data ? `YES — user_id=${result.data.user_id}, account_id=${result.data.account_id}` : 'NO');

        if (result.data) {
          connRow = result.data;
          db = await ensureUserDbLoaded(connRow.user_id);
          console.log('[MT5 Sync] User DB loaded — users:', db.users?.length, '| accounts:', db.accounts?.length, '| trades:', db.trades?.length, '| connections:', db.mt5Connections?.length);
          // Find connection in camelCase db
          connection = db.mt5Connections.find((c: any) =>
            c.syncToken === syncToken || c.sync_token === syncToken
          );
          console.log('[MT5 Sync] Connection found in db:', connection ? `YES (accountId=${connection.accountId || connection.account_id})` : 'NO — falling back to connRow');

          // If toCamel didn't work, use the raw connRow
          if (!connection) {
            connection = {
              id: connRow.id,
              userId: connRow.user_id,
              accountId: connRow.account_id,
              syncToken: connRow.sync_token,
              initialSyncDone: connRow.initial_sync_done,
              totalSyncedTrades: connRow.total_synced_trades || 0,
              status: connRow.status
            };
            console.log('[MT5 Sync] Using raw connRow as connection fallback');
          }
        }
      } catch (err) {
        console.error('[MT5 Sync] ✗ Supabase token lookup exception:', err);
      }
    }

    // Email-based fallback
    if (!connection) {
      const emailFallback = (email || (req.query.email as string) || '').trim().toLowerCase();
      if (emailFallback) {
        console.log('[MT5 Sync] Trying email fallback:', emailFallback);
        const emailDb = await ensureUserDbLoaded(emailFallback);
        const found = emailDb?.mt5Connections?.find((c: any) =>
          c.syncToken === syncToken || c.sync_token === syncToken
        );
        if (found) { connection = found; db = emailDb; }
        console.log('[MT5 Sync] Email fallback result:', found ? 'FOUND' : 'NOT FOUND');
      }
    }

    if (!connection) {
      console.warn('[MT5 Sync] ✗ Token not found — returning 403');
      return res.status(403).json({ error: 'EA synchronization token not found. Check your syncToken in EA settings.' });
    }

    // ═══════════════════════════════════════════════════
    // STEP 3: RESOLVE ACCOUNT ID (handle camel + snake)
    // ═══════════════════════════════════════════════════
    const resolvedAccountId = connection.accountId || connection.account_id || connRow?.account_id;
    const resolvedUserId = db.users[0]?.id || connection.userId || connection.user_id || connRow?.user_id;

    console.log('[MT5 Sync] Resolved accountId:', resolvedAccountId);
    console.log('[MT5 Sync] Resolved userId:', resolvedUserId);
    console.log('[MT5 Sync] All db account IDs:', db.accounts?.map((a: any) => a.id).join(', ') || 'none');

    const accountIdx = db.accounts.findIndex((acc: any) =>
      acc.id === resolvedAccountId
    );

    if (accountIdx === -1) {
      // Account not in db — try fetching directly from Supabase
      console.warn('[MT5 Sync] Account not in user DB. Fetching from Supabase...');
      if (useSupabase && resolvedAccountId) {
        const { data: accData } = await supabase
          .from('trading_accounts')
          .select('*')
          .eq('id', resolvedAccountId)
          .maybeSingle();
        if (accData) {
          db.accounts.push(toCamel(accData));
          console.log('[MT5 Sync] Account fetched from Supabase and added to db:', accData.id);
        } else {
          console.error('[MT5 Sync] ✗ Account not found in Supabase either:', resolvedAccountId);
          return res.status(404).json({ error: 'Trading account linked to this token does not exist' });
        }
      } else {
        return res.status(404).json({ error: 'Trading account not found' });
      }
    }

    // Re-find index after potential push
    const finalAccountIdx = db.accounts.findIndex((acc: any) => acc.id === resolvedAccountId);
    console.log('[MT5 Sync] Account found:', db.accounts[finalAccountIdx]?.name, '| Current balance:', db.accounts[finalAccountIdx]?.currentBalance);

    // ═══════════════════════════════════════════════════
    // STEP 4: PROCESS INCOMING TRADES
    // ═══════════════════════════════════════════════════
    const isInitialSync = !connection.initialSyncDone && !connection.initial_sync_done;
    let syncedCount = 0;
    let skippedDuplicates = 0;
    let updatedCount = 0;
    const newTradeRows: any[] = [];

    if (trades && Array.isArray(trades) && trades.length > 0) {
      console.log(`[MT5 Sync] Processing ${trades.length} incoming trades...`);

      trades.forEach((incomingTrade: any, idx: number) => {
        const eaTicket = String(incomingTrade.id || incomingTrade.ticket || '');

        // Dedup check: ID-based first, then composite
        const existingIdx = db.trades.findIndex((t: any) => {
          const tAccountId = t.accountId || t.account_id;
          if (tAccountId !== resolvedAccountId) return false;
          if (eaTicket && (t.id === eaTicket || String(t.id) === eaTicket || t.id === `${resolvedAccountId}_${eaTicket}`)) return true;
          // Composite match
          const isSameSymbol = (t.symbol || '').toUpperCase() === (incomingTrade.symbol || '').toUpperCase();
          const isSameType = t.type === (incomingTrade.type || 'Buy');
          const isSameEntry = Math.abs((t.entryPrice || t.entry_price || 0) - parseFloat(incomingTrade.entryPrice || 0)) < 0.0001;
          const isSameLot = Math.abs((t.lotSize || t.lot_size || 0) - parseFloat(incomingTrade.lotSize || 0)) < 0.001;
          return isSameSymbol && isSameType && isSameEntry && isSameLot;
        });

        if (existingIdx !== -1) {
          skippedDuplicates++;
          if (idx < 3) console.log(`[MT5 Sync] Trade[${idx}] ticket=${eaTicket} → DUPLICATE (existing id=${db.trades[existingIdx].id}), updating profit`);
          // Update profit fields
          const t = db.trades[existingIdx];
          t.profit = parseFloat(incomingTrade.profit || 0);
          t.commission = parseFloat(incomingTrade.commission || 0);
          t.swap = parseFloat(incomingTrade.swap || 0);
          updatedCount++;
        } else {
          const newId = eaTicket ? `${resolvedAccountId}_${eaTicket}` : `mt5_ea_${Date.now()}_${idx}`;
          console.log(`[MT5 Sync] Trade[${idx}] ticket=${eaTicket} symbol=${incomingTrade.symbol} → NEW (id=${newId})`);
          const newTrade = {
            id: newId,
            accountId: resolvedAccountId,
            account_id: resolvedAccountId,
            user_id: resolvedUserId,
            date: incomingTrade.date || new Date().toISOString(),
            symbol: (incomingTrade.symbol || 'UNKNOWN').toUpperCase(),
            type: incomingTrade.type || 'Buy',
            lotSize: parseFloat(incomingTrade.lotSize || 0.1),
            lot_size: parseFloat(incomingTrade.lotSize || 0.1),
            entryPrice: parseFloat(incomingTrade.entryPrice || 1.0),
            entry_price: parseFloat(incomingTrade.entryPrice || 1.0),
            exitPrice: parseFloat(incomingTrade.exitPrice || 1.0),
            exit_price: parseFloat(incomingTrade.exitPrice || 1.0),
            stopLoss: incomingTrade.stopLoss ? parseFloat(incomingTrade.stopLoss) : null,
            stop_loss: incomingTrade.stopLoss ? parseFloat(incomingTrade.stopLoss) : null,
            takeProfit: incomingTrade.takeProfit ? parseFloat(incomingTrade.takeProfit) : null,
            take_profit: incomingTrade.takeProfit ? parseFloat(incomingTrade.takeProfit) : null,
            profit: parseFloat(incomingTrade.profit || 0),
            commission: parseFloat(incomingTrade.commission || 0),
            swap: parseFloat(incomingTrade.swap || 0),
            riskPercentage: parseFloat(incomingTrade.riskPercentage || 1.0),
            risk_percentage: parseFloat(incomingTrade.riskPercentage || 1.0),
            strategy: 'MT5 Expert EA Sync',
            emotion: 'Calm',
            notes: incomingTrade.notes || 'Synchronized from MT5 terminal.',
            tags: ['MT5 AutoSync'],
            isMt5Sync: true,
            is_mt5_sync: true
          };
          db.trades.push(newTrade);
          newTradeRows.push(newTrade);
          syncedCount++;
        }
      });

      console.log(`[MT5 Sync] ✓ Processing complete — New: ${syncedCount} | Duplicates: ${skippedDuplicates} | Updated: ${updatedCount}`);
    } else {
      console.log('[MT5 Sync] ⚠ trades array is empty or missing — nothing to import');
      console.log('[MT5 Sync] ⚠ If you have closed trades in MT5 history, check:');
      console.log('[MT5 Sync]   1. EA HistoryMonths setting covers the date range');
      console.log('[MT5 Sync]   2. MT5 history is loaded (Ctrl+Shift+H → show all)');
    }

    // ═══════════════════════════════════════════════════
    // STEP 5: UPDATE BALANCE
    // ═══════════════════════════════════════════════════
    const liveBalance = (balance !== undefined && balance !== null && !isNaN(Number(balance)) && Number(balance) > 0)
      ? parseFloat(Number(balance).toFixed(2))
      : db.accounts[finalAccountIdx].currentBalance;
    db.accounts[finalAccountIdx].currentBalance = liveBalance;
    db.accounts[finalAccountIdx].equity = liveBalance;
    console.log(`[MT5 Sync] Balance set to: ${liveBalance} (received: ${balance})`);

    if (isInitialSync && syncedCount > 0) {
      const accountTrades = db.trades.filter((t: any) => (t.accountId || t.account_id) === resolvedAccountId);
      const totalPL = accountTrades.reduce((sum: number, t: any) =>
        sum + parseFloat(t.profit || 0) + parseFloat(t.commission || 0) + parseFloat(t.swap || 0), 0);
      db.accounts[finalAccountIdx].startingBalance = parseFloat((liveBalance - totalPL).toFixed(2));
      console.log('[MT5 Sync] Initial sync — starting balance calculated:', db.accounts[finalAccountIdx].startingBalance);
    }

    // ═══════════════════════════════════════════════════
    // STEP 6: PERSIST TO SUPABASE
    // ═══════════════════════════════════════════════════
    const syncResponse: any = {
      success: true,
      message: 'MT5 Sync completed successfully',
      syncedTradesCount: syncedCount,
      accountBalance: db.accounts[accountIdx].currentBalance,
      startingBalance: db.accounts[accountIdx].startingBalance
    };

    if (useSupabase && resolvedUserId) {
      // 6a. Update account balance
      const { error: accErr } = await supabase
        .from('trading_accounts')
        .update({
          current_balance: liveBalance,
          equity: liveBalance,
          starting_balance: db.accounts[finalAccountIdx].startingBalance || liveBalance
        })
        .eq('id', resolvedAccountId);
      if (accErr) console.error('[MT5 Sync] ✗ Account balance update error:', JSON.stringify(accErr));
      else console.log('[MT5 Sync] ✓ Account balance updated in Supabase');

      // 6b. Insert only NEW trades (avoid upsert conflict on existing trades)
      if (newTradeRows.length > 0) {
        const supabaseTradeRows = newTradeRows.map((t: any) => ({
          id: t.id,
          account_id: resolvedAccountId,
          user_id: resolvedUserId,
          date: t.date,
          symbol: t.symbol,
          type: t.type,
          lot_size: t.lotSize,
          entry_price: t.entryPrice,
          exit_price: t.exitPrice,
          stop_loss: t.stopLoss || null,
          take_profit: t.takeProfit || null,
          profit: t.profit,
          commission: t.commission,
          swap: t.swap,
          risk_percentage: t.riskPercentage || 1.0,
          strategy: t.strategy,
          emotion: t.emotion,
          notes: t.notes,
          tags: t.tags,
          is_mt5_sync: true
        }));

        console.log(`[MT5 Sync] Inserting ${supabaseTradeRows.length} new trades into Supabase...`);
        console.log('[MT5 Sync] Sample Supabase row:', JSON.stringify(supabaseTradeRows[0]));

        // Use upsert (ignore duplicates gracefully)
        const { data: insertedData, error: tradeErr } = await supabase
          .from('trades')
          .upsert(supabaseTradeRows, { onConflict: 'id', ignoreDuplicates: true });

        if (tradeErr) {
          console.error('[MT5 Sync] ✗ Trade insert error:', JSON.stringify(tradeErr));
          console.error('[MT5 Sync] ✗ Failed row sample:', JSON.stringify(supabaseTradeRows[0]));
          syncResponse.supabaseError = tradeErr.message;
          syncResponse.supabaseDetails = tradeErr;
        } else {
          console.log(`[MT5 Sync] ✓ ${supabaseTradeRows.length} trades upserted to Supabase successfully`);
        }
      } else {
        console.log('[MT5 Sync] No new trades to insert into Supabase.');
      }

      // 6c. Update connection record
      const { error: connUpdErr } = await supabase
        .from('mt5_connections')
        .update({
          last_sync_time: new Date().toISOString(),
          status: 'Connected',
          total_synced_trades: (connection.totalSyncedTrades || connection.total_synced_trades || 0) + syncedCount,
          initial_sync_done: true
        })
        .eq('id', connection.id);
      if (connUpdErr) console.error('[MT5 Sync] ✗ Connection update error:', JSON.stringify(connUpdErr));
      else console.log('[MT5 Sync] ✓ MT5 connection record updated');

      // 6d. Verify: count trades now in Supabase for this account
      const { count } = await supabase
        .from('trades')
        .select('*', { count: 'exact', head: true })
        .eq('account_id', resolvedAccountId);
      syncResponse.supabaseTradeCount = count;
      console.log(`[MT5 Sync] ✓ Supabase trade count for account ${resolvedAccountId}: ${count}`);

    } else {
      await saveDatabase(db);
    }

    lastSyncResults.set(syncToken, {
      syncedCount, supabaseError: syncResponse.supabaseError,
      supabaseTradeCount: syncResponse.supabaseTradeCount,
      newTradeRowsLength: newTradeRows.length,
      timestamp: new Date().toISOString()
    });
    // Keep only last 5 per token
    if (lastSyncResults.size > 100) {
      const keys = [...lastSyncResults.keys()];
      for (let i = 0; i < keys.length - 50; i++) lastSyncResults.delete(keys[i]);
    }

    console.log('[MT5 Sync] Sync complete. Response:', JSON.stringify(syncResponse));
    res.status(200).json(syncResponse);
  });

  // ==========================================
  // MT5 DEBUG ENDPOINT — inspect stored data for a sync token
  // GET /api/mt5/debug?token=YOUR_SYNC_TOKEN
  // ==========================================
  app.get('/api/mt5/debug', async (req, res) => {
    const token = (req.query.token as string || '').trim();
    if (!token) return res.status(400).json({ error: 'Provide ?token=YOUR_SYNC_TOKEN' });
    if (!useSupabase) return res.status(503).json({ error: 'Supabase not configured' });

    try {
      const { data: conn, error: connErr } = await supabase
        .from('mt5_connections')
        .select('*')
        .eq('sync_token', token)
        .maybeSingle();

      if (connErr) return res.status(500).json({ error: 'Supabase error', details: connErr });
      if (!conn) return res.status(404).json({ error: 'No connection found for this sync token' });

      const { data: trades } = await supabase
        .from('trades')
        .select('id, symbol, type, profit, date, account_id, user_id, is_mt5_sync')
        .eq('account_id', conn.account_id)
        .order('date', { ascending: false })
        .limit(20);

      const { data: account } = await supabase
        .from('trading_accounts')
        .select('id, name, current_balance, user_id')
        .eq('id', conn.account_id)
        .maybeSingle();

      // Test insert to diagnose why trades aren't persisting
      const testId = `_diag_test_${Date.now()}`;
      const { error: testErr } = await supabase
        .from('trades')
        .upsert({
          id: testId,
          account_id: conn.account_id,
          user_id: conn.user_id,
          symbol: 'DIAG',
          type: 'Buy',
          profit: 0,
          date: new Date().toISOString(),
          is_mt5_sync: true
        }, { onConflict: 'id', ignoreDuplicates: false });
      if (!testErr) {
        await supabase.from('trades').delete().eq('id', testId);
      }

      const lastSync = lastSyncResults.get(token);

      return res.json({
        connection: conn,
        account,
        recentTrades: trades || [],
        tradeCount: trades?.length || 0,
        diagnostic: {
          testInsertSuccess: !testErr,
          testInsertError: testErr?.message || null,
          testInsertDetails: testErr || null,
          accountFound: !!account,
          accountId: conn.account_id,
        },
        lastSync: lastSync || null
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Unknown error' });
    }
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
    const traderName = currentUser?.name ? currentUser.name.split(' ')[0] : 'Trader';

    const generateSmartMentorFallback = (msgText: string, trades: any[], accName: string) => {
      const msg = msgText.toLowerCase().trim();
      const totalTrades = trades.length;

      if (totalTrades === 0) {
        return `Hey ${traderName}! 👋 Welcome to your AI Mentor session.\n\nI noticed you haven't logged any trades yet in **"${accName}"**. That's totally fine — everyone starts somewhere!\n\nTo get personalized coaching from me, start by logging your trades in the **Trading Journal** or connect your MT5 account via the **MT5 Automation** tab. Once you do, I can analyze your win rate, risk habits, emotions, and give you specific guidance to improve.\n\nI'm here whenever you're ready. 🙏`;
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
      const avgRisk = (trades.reduce((acc: number, t: any) => acc + (t.riskPercentage || 1), 0) / totalTrades).toFixed(1);

      const symbolsCount: Record<string, number> = {};
      trades.forEach((t: any) => { if (t.symbol) symbolsCount[t.symbol] = (symbolsCount[t.symbol] || 0) + 1; });
      const topSymbol = Object.entries(symbolsCount).sort((a,b) => b[1] - a[1])[0]?.[0] || 'N/A';

      const emotionCount: Record<string, number> = {};
      trades.forEach((t: any) => { if (t.emotion) emotionCount[t.emotion] = (emotionCount[t.emotion] || 0) + 1; });
      const topEmotion = Object.entries(emotionCount).sort((a,b) => b[1] - a[1])[0]?.[0] || 'Neutral';

      const revengeCount = trades.filter((t: any) => (t.emotion || '').toLowerCase().includes('revenge') || (t.tags || []).some((tag: string) => tag.toLowerCase().includes('revenge'))).length;
      const fomoCount = trades.filter((t: any) => (t.emotion || '').toLowerCase().includes('fomo') || (t.tags || []).some((tag: string) => tag.toLowerCase().includes('fomo'))).length;

      // ── Greeting ──
      if (/^(hy|hi|hello|hey|greetings|hola|sup|good morning|good afternoon|good evening)/.test(msg)) {
        return `Hey ${traderName}! 👋 Great to see you.\n\n` +
          `Here's a quick snapshot of your **"${accName}"** account:\n` +
          `• **Total P/L**: ${totalProfit >= 0 ? '+' : ''}$${totalProfit.toFixed(2)} ${totalProfit >= 0 ? '🟢' : '🔴'}\n` +
          `• **Win Rate**: ${winRate}% (${wins.length} Wins / ${losses.length} Losses)\n` +
          `• **Most Traded Pair**: ${topSymbol}\n` +
          `• **Dominant Emotion**: ${topEmotion}\n\n` +
          `What's on your mind today? Whether it's your performance, mindset, risk, or just needing a little support — I'm here for you! 🙏`;
      }

      // ── Can I become profitable / success mindset ──
      if (/can i (be|become)|profitable trader|will i succeed|am i good|am i ready|is trading for me/.test(msg)) {
        const isCurrentlyProfitable = totalProfit > 0;
        return `### 🌟 Can You Become a Profitable Trader?\n\n` +
          `**Absolutely — yes, you can.** But it takes the right mindset and approach.\n\n` +
          (isCurrentlyProfitable
            ? `Looking at your data, you are **currently profitable** with a **+$${totalProfit.toFixed(2)} net P/L** across ${totalTrades} trades — that already puts you ahead of most retail traders!\n\n`
            : `Right now your account shows a **-$${Math.abs(totalProfit).toFixed(2)} net P/L** across ${totalTrades} trades. That's normal in the learning phase — most traders are unprofitable before they become consistently profitable.\n\n`) +
          `**What makes a profitable trader:**\n` +
          `1. **Consistency over perfection** — Aim to execute the same process every trade, not just win every trade.\n` +
          `2. **Risk management first** — Traders who blow accounts focus on profits. Profitable traders focus on survival.\n` +
          `3. **Journal everything** — You are already doing this! Reviewing your journal is your biggest edge.\n` +
          `4. **Patience** — Most traders become profitable after 12–24 months of intentional practice.\n\n` +
          `You have the tools. Keep building the habits. I believe in you. 💪`;
      }

      // ── Mental support / Losing streak ──
      if (/loss|losing streak|consecutive loss|bad day|bad week|not profitable|struggling|giving up|quit trading|sad|depressed|frustrated|angry|fail|failing/.test(msg)) {
        const recentLosses = trades.slice(-5).filter((t: any) => (t.profit || 0) < 0).length;
        return `### 💙 I'm Here For You — Mental Support\n\n` +
          `I hear you, and I want you to know that **every great trader has been exactly where you are right now.** Drawdowns and losing streaks are not a sign of failure — they are a part of the journey.\n\n` +
          (recentLosses >= 3 ? `Looking at your recent trades, you have had **${recentLosses} losses in your last 5 trades**. That's a real losing streak, and it's important to respond to it with discipline, not emotion.\n\n` : '') +
          `**What to do right now:**\n` +
          `1. **Stop trading today.** Seriously. Close the charts and step away. Continuing while emotional almost always makes it worse.\n` +
          `2. **Reduce your lot size by 50%** when you return. Rebuilding confidence with smaller risk is far more effective than trying to "win it back".\n` +
          `3. **Review your last 5 trades in your journal.** Were you following your rules? If not, the market is giving you feedback — listen to it.\n` +
          `4. **Remember why you started.** The goal is long-term consistency, not perfection this week.\n\n` +
          `You have not failed. You are in the training phase that every profitable trader goes through. Take a breath, rest today, and come back stronger tomorrow. 🙏`;
      }

      // ── Motivation / Inspiration ──
      if (/motivat|inspire|confidence|believe|encourage|keep going|don.t give up|not sure|doubt/.test(msg)) {
        return `### 🔥 You've Got This!\n\n` +
          `Trading is one of the hardest mental skills in the world, but you are taking it seriously by journaling and reviewing your trades — that alone puts you in the **top 5% of traders**.\n\n` +
          `Here are your personal stats to remind you of your progress:\n` +
          `• You have logged **${totalTrades} trades** — each one is a lesson.\n` +
          `• Your win rate is **${winRate}%** — ${parseFloat(winRate) >= 50 ? 'above average! Keep it up.' : 'there is room to grow, and that is exciting.'}\n` +
          `• Your most traded pair is **${topSymbol}** — you are specializing, which is smart.\n\n` +
          `**Daily Affirmations for Traders:**\n` +
          `• "I follow my rules, every single trade."\n` +
          `• "My job is to execute well, not to predict the market."\n` +
          `• "I am building a skill that will last a lifetime."\n\n` +
          `The traders who succeed are not the smartest — they are the most consistent. Keep showing up. 💪`;
      }

      // ── Strategy advice ──
      if (/strategy|setup|entry|confluence|timeframe|ema|sma|indicator|signal|trend|support|resistance|order block|supply|demand|breakout|scalp|swing|position/.test(msg)) {
        return `### 📈 Strategy & Trade Execution\n\n` +
          `Based on your journal, your most traded pair is **${topSymbol}** and your win rate is **${winRate}%**.\n\n` +
          `**General Strategy Principles:**\n` +
          `1. **Trade with the higher timeframe trend.** Identify the trend on H4/Daily, then drop to H1/M15 for entry.\n` +
          `2. **Wait for confluence.** The best setups have 2–3 reasons to enter: structure, key level, and a trigger candle.\n` +
          `3. **Only trade your A+ setups.** If you are unsure, do not enter. The market will give you another opportunity.\n` +
          `4. **Pre-plan your trades.** Before the session, mark your levels and write down what you are looking for.\n\n` +
          `**For your ${topSymbol} trades specifically:**\n` +
          `Focus on the London (07:00–10:00 GMT) and New York (13:00–16:00 GMT) sessions for the highest probability moves on currency and gold pairs.\n\n` +
          `Would you like me to analyze a specific strategy or review your recent trades in more detail?`;
      }

      // ── FOMO / Revenge trading ──
      if (/fomo|revenge|overtrad|impulsiv|chasing|miss|missed|regret/.test(msg)) {
        return `### 🧠 FOMO & Revenge Trading Control\n\n` +
          (fomoCount > 0 || revengeCount > 0
            ? `I can see from your journal that you have had **${fomoCount} FOMO trade${fomoCount !== 1 ? 's' : ''}** and **${revengeCount} revenge trade${revengeCount !== 1 ? 's' : ''}** logged. This is incredibly honest of you — recognizing these patterns is the first step.\n\n`
            : '') +
          `**The truth about FOMO and Revenge:**\n` +
          `These are the #1 account killers in retail trading. They feel urgent and justified in the moment but are almost always losers.\n\n` +
          `**How to break the cycle:**\n` +
          `1. **Set a "loss limit" rule.** If you lose 2 trades in a session, close the platform. Period.\n` +
          `2. **Use a pre-trade checklist.** Before every entry, ask: "Is this in my plan? Is this my setup?" If not, close the chart.\n` +
          `3. **Accept missed trades.** Remind yourself: "There will always be another setup tomorrow."\n` +
          `4. **Journal your emotions in real-time.** Even a one-word note — "FOMO" or "Calm" — creates awareness that rewires your behavior over time.\n\n` +
          `The market rewards patience. The impulse to chase is a signal to wait, not act.`;
      }

      // ── Risk management ──
      if (/risk|lot size|position size|drawdown|money management|capital|leverage|margin/.test(msg)) {
        return `### 🛡️ Risk Management Analysis for "${accName}"\n\n` +
          `• **Your Average Risk Per Trade**: ${avgRisk}%\n` +
          `• **Average Win vs Average Loss**: $${avgWin} vs $${avgLoss}\n` +
          `• **Profit Factor**: ${profitFactor}\n\n` +
          `**Risk Rules Every Profitable Trader Follows:**\n` +
          `1. **Risk 1% or less per trade.** At 1%, you can lose 20 trades in a row and still have 80% of your capital.\n` +
          `2. **Never move your stop loss against yourself.** If it gets hit, accept it and move on.\n` +
          `3. **Target a minimum 1:2 Risk-to-Reward.** Even with a 40% win rate, a 1:2 RR is profitable over time.\n` +
          `4. **Stop trading at your daily max loss** (e.g., 3%). Protect your capital above all else.\n\n` +
          (parseFloat(avgRisk) > 2 ? `⚠️ **Your average risk of ${avgRisk}% per trade is above the recommended 1–2%.** Consider reducing your lot sizes to protect your account during losing streaks.` : `✅ Your risk per trade looks controlled. Keep maintaining this discipline!`);
      }

      // ── Psychology / mindset / emotions / discipline ──
      if (/psychology|emotion|discipline|mindset|mental|patience|control|calm|anxiety|fear|greed/.test(msg)) {
        return `### 🧠 Trading Psychology & Emotional Control\n\n` +
          `Across your ${totalTrades} trades, your most recorded emotional state is **${topEmotion}**.\n\n` +
          `**The 5 Pillars of Trading Psychology:**\n` +
          `1. **Acceptance** — Accept that losses are inevitable and part of the process. Your goal is to control risk, not eliminate losses.\n` +
          `2. **Patience** — Wait for your setups. Most profitable traders only take 1–3 trades per day.\n` +
          `3. **Discipline** — Follow your rules even when you don't want to. That is where the edge lives.\n` +
          `4. **Detachment** — Detach your identity from individual trade outcomes. A loss does not make you a bad trader.\n` +
          `5. **Process Focus** — Judge yourself on execution quality, not just P&L.\n\n` +
          `**Daily Practices:**\n` +
          `• Before trading: Write your plan and set your max loss for the day.\n` +
          `• After trading: Journal every trade, including your emotion.\n` +
          `• Weekly: Review your journal. What patterns do you see?`;
      }

      // ── Performance / stats / analysis ──
      if (/win rate|stat|performance|analyz|summary|how am i doing|result|profit|my trades|my account|my journal/.test(msg)) {
        return `### 📊 Performance Analysis for "${accName}"\n\n` +
          `• **Total Trades Analyzed**: ${totalTrades}\n` +
          `• **Win Rate**: ${winRate}% (${wins.length} Wins, ${losses.length} Losses)\n` +
          `• **Net P/L**: ${totalProfit >= 0 ? '+' : ''}$${totalProfit.toFixed(2)}\n` +
          `• **Average Win**: $${avgWin} | **Average Loss**: $${avgLoss}\n` +
          `• **Profit Factor**: ${profitFactor}\n` +
          `• **Top Traded Pair**: ${topSymbol}\n` +
          `• **Dominant Emotion**: ${topEmotion}\n\n` +
          `**Mentor Insight**: ${parseFloat(winRate) >= 55 ? '🟢 Strong win rate! Your edge is working. Focus on maximizing your winners by not closing trades early.' : parseFloat(winRate) >= 45 ? '🟡 Your win rate is near breakeven. Focus on improving your entry quality and targeting higher reward-to-risk setups.' : '🔴 Your win rate needs attention. Review your entry rules — are you entering at high-probability zones, or chasing price?'}`;
      }

      // ── How to use the journal ──
      if (/how to use|how do i|journal|log|track|tag|note/.test(msg)) {
        return `### 📓 How to Get the Most Out of Your Journal\n\n` +
          `Your journal is your most powerful tool. Here is how to use it effectively:\n\n` +
          `1. **Log every trade** — Use the "Add New Trade" button after every position you take.\n` +
          `2. **Tag your emotion** — Choose how you felt (Calm, FOMO, Revenge, Excited). This data builds over time and reveals patterns.\n` +
          `3. **Add your strategy** — Note which setup triggered the entry (e.g., Order Block, EMA Cross, Breakout).\n` +
          `4. **Write a note** — Even one sentence like "entered too early" or "good execution" is valuable for review.\n` +
          `5. **Review weekly** — Ask me "analyze my stats" every week to track your progress.\n\n` +
          `The more data you log, the smarter and more personalized my coaching becomes for you!`;
      }

      // ── General catch-all fallback with variety ──
      const motivations = [
        "Trading is not about being right — it's about managing risk when you're wrong. Keep your losses small and let your winners breathe.",
        "Every expert was once a beginner. Every profitable trader has a journal full of mistakes. Your losses are not failures — they are lessons you paid for.",
        "The market does not owe you a profit. But if you respect your risk, follow your plan, and stay consistent, the edge will show up over time.",
        "Discipline is the bridge between where you are and where you want to be. Execute your plan one trade at a time.",
        "Patience is not waiting — it's knowing when the right opportunity appears. The best trades almost take themselves.",
        "Your emotional state is part of your trading edge. A calm mind sees setups clearly; an emotional mind sees what it wants to see.",
        "Focus on what you can control: your entries, your risk, your exits, and your attitude. The rest is up to the market."
      ];
      const randomMotivation = motivations[Math.floor(Math.random() * motivations.length)];

      return `**💡 Mentor Insight**: ${randomMotivation}\n\n` +
        `I'm here to support your full trading journey! You can ask me things like:\n` +
        `• *"Can I become a profitable trader?"*\n` +
        `• *"I'm in a losing streak, help me"*\n` +
        `• *"How is my risk management?"*\n` +
        `• *"Analyze my performance"*\n` +
        `• *"Give me psychology tips"*\n` +
        `• *"How do I control FOMO?"*\n\n` +
        `What's on your mind today?`;
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

      const systemInstruction = `You are ${traderName}'s personal trading mentor and coach on FX Journal Pro. Your name is "AI Mentor".

You are warm, empathetic, supportive, and direct — like a trusted coach who genuinely cares about the trader's success and wellbeing. You know ${traderName} personally. You remember their journey, their struggles, and their wins.

Your role is to:
- Be a supportive mentor first, and an analyst second. Always acknowledge emotions before giving advice.
- Speak in first-person like a real mentor: "I can see that...", "I'm proud of you for...", "Let's look at this together..."
- Use ${traderName}'s name occasionally to make responses feel personal.
- Celebrate small wins and improvements, not just big milestones.
- When a trader is struggling, validate their feelings before giving guidance.
- Be honest but kind — don't sugarcoat problems, but always leave the trader feeling supported and capable.

Trader Profile:
- Name: ${traderName}
- Account: ${accountName}
- Total Trades Logged: ${accountTrades.length}

Trading History Digest (Last 50 trades):
${JSON.stringify(digest)}

Personality & Tone:
- Conversational and human, never robotic or overly formal.
- Use short paragraphs. Use emojis sparingly but naturally (💪, 🙏, 🎯, 📈).
- Give specific, actionable advice based on ${traderName}'s actual data whenever possible.
- When responding to emotional or personal struggles, lead with empathy FIRST, then advice.

RESTRICTIONS:
- ONLY discuss trading, trading psychology, risk management, discipline, emotional control, performance improvement, and journal insights.
- If asked about unrelated topics, kindly redirect: "That's outside my expertise as your trading mentor — but let's focus on what I can help you with!"
- NEVER promise profits or guarantee outcomes.
- NEVER be dismissive or harsh. Always be encouraging.`;

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

  app.post('/api/tickets', async (req, res) => {
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
    await saveDatabase(db);
    res.json({ message: 'Support ticket submitted successfully', ticket: newTicket });
  });

  app.put('/api/tickets/:id', async (req, res) => {
    let db = (req as any).userDb;
    let currentUser = (req as any).currentUser;
    const authEmail = currentUser?.email;
    if (!currentUser || !db) return res.status(401).json({ error: 'Not authenticated' });
    const { id } = req.params;
    const { status } = req.body;
    
    if (useSupabase) {
      const { error } = await supabase.from('support_tickets').update({ status: status || 'Closed' }).eq('id', id);
      if (error) console.error("Error updating ticket in Supabase:", error);
      return res.json({ message: 'Ticket status updated' });
    }

    const idx = db.supportTickets.findIndex((t: any) => t.id === id);
    if (idx !== -1) {
      db.supportTickets[idx].status = status || 'Closed';
      await saveDatabase(db);
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

  app.post('/api/payments/verify', async (req, res) => {
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
      await saveDatabase(db);

      res.json({ success: true, message: 'Upgraded to Pro plan successfully!', user: currentUser });
    } else {
      res.status(404).json({ error: 'User session not found' });
    }
  });

  // ==========================================
  // ADMIN DASHBOARD ROUTES
  // ==========================================

  // Helper: check if the current user is an admin (checks Supabase role column directly)
  const checkIsAdmin = async (currentUser: any): Promise<boolean> => {
    if (!currentUser) return false;
    // Hardcoded fallback email
    if (currentUser.email === 'admin@axyfx.com') return true;
    // Check role already loaded in the user object
    if (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADMIN') return true;
    // Re-fetch from Supabase to be sure (in case role was updated after login)
    if (useSupabase && (currentUser.id || currentUser.email)) {
      const query = currentUser.id
        ? supabase.from('users').select('role').eq('id', currentUser.id).maybeSingle()
        : supabase.from('users').select('role').eq('email', currentUser.email).maybeSingle();
      const { data } = await query;
      if (data?.role === 'SUPER_ADMIN' || data?.role === 'ADMIN') return true;
    }
    return false;
  };

  // Endpoint for frontend to check if current user has admin access
  app.get('/api/admin/check', async (req, res) => {
    let currentUser = (req as any).currentUser;
    const isAdminUser = await checkIsAdmin(currentUser);
    res.json({ isAdmin: isAdminUser });
  });

  app.get('/api/admin/users', async (req, res) => {
    let db = (req as any).userDb;
    let currentUser = (req as any).currentUser;
    if (!(await checkIsAdmin(currentUser))) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    if (useSupabase) {
      const { data: allUsers } = await supabase.from('users').select('*');
      const { data: allAccounts } = await supabase.from('trading_accounts').select('*');
      const usersWithStats = (allUsers || []).map((u: any) => {
        const uAccounts = (allAccounts || []).filter((acc: any) => acc.user_id === u.id);
        return { ...toCamel(u), accountsCount: uAccounts.length };
      });
      return res.json({ users: usersWithStats });
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

  app.post('/api/admin/announcements', async (req, res) => {
    let db = (req as any).userDb;
    let currentUser = (req as any).currentUser;
    if (!(await checkIsAdmin(currentUser))) {
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
    await saveDatabase(db);
    res.json({ message: 'Announcement published successfully', announcement: newAnn });
  });

  app.post('/api/admin/block-user', async (req, res) => {
    let db = (req as any).userDb;
    let currentUser = (req as any).currentUser;
    if (!(await checkIsAdmin(currentUser))) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { userId, block } = req.body;
    // Simple state flag
    const idx = db.users.findIndex((u: any) => u.id === userId);
    if (idx !== -1) {
      db.users[idx].status = block ? 'Blocked' : 'Active';
      await saveDatabase(db);
      res.json({ message: block ? 'User blocked' : 'User unblocked' });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  });

  app.get('/api/admin/dashboard', async (req, res) => {
    let currentUser = (req as any).currentUser;
    if (!(await checkIsAdmin(currentUser))) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    if (useSupabase) {
      const [{ data: allUsers }, { data: allAccounts }, { data: allTrades }, { data: allTickets }] = await Promise.all([
        supabase.from('users').select('id, status'),
        supabase.from('trading_accounts').select('id'),
        supabase.from('trades').select('id'),
        supabase.from('support_tickets').select('id, status')
      ]);
      const totalUsers = allUsers?.length || 0;
      const activeUsers = (allUsers || []).filter((u: any) => u.status === 'ACTIVE' || !u.status).length;
      const totalMt5 = allAccounts?.length || 0;
      const totalTrades = allTrades?.length || 0;
      const pendingTickets = (allTickets || []).filter((t: any) => t.status === 'Open' || t.status === 'In Progress').length;
      return res.json({ totalUsers, activeUsers, totalMt5, totalTrades, totalRevenue: 0, pendingTickets });
    }
    // fallback to per-user db
    const db = (req as any).userDb;
    res.json({
      totalUsers: db?.users?.length || 0,
      activeUsers: db?.users?.filter((u: any) => u.status === 'ACTIVE' || !u.status).length || 0,
      totalMt5: db?.accounts?.length || 0,
      totalTrades: db?.trades?.length || 0,
      totalRevenue: 0,
      pendingTickets: db?.supportTickets?.filter((t: any) => t.status === 'Open').length || 0
    });
  });

  app.post('/api/admin/users/:id/status', async (req, res) => {
    let currentUser = (req as any).currentUser;
    if (!(await checkIsAdmin(currentUser))) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { id } = req.params;
    const { status } = req.body;
    
    if (useSupabase) {
      const { error } = await supabase.from('users').update({ status }).eq('id', id);
      if (error) {
        console.error('Error updating supabase user:', error);
        return res.status(500).json({ error: 'Failed to update user status' });
      }
      return res.json({ message: `User status updated to ${status}` });
    }

    const db = (req as any).userDb;
    const idx = db?.users?.findIndex((u: any) => u.id === id);
    if (idx !== undefined && idx !== -1) {
      db.users[idx].status = status;
      res.json({ message: `User status updated to ${status}` });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  });

  app.get('/api/admin/bugs', async (req, res) => {
    let currentUser = (req as any).currentUser;
    if (!currentUser || (currentUser.email !== 'admin@axyfx.com' && currentUser.role !== 'SUPER_ADMIN' && currentUser.role !== 'ADMIN')) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    if (useSupabase) {
      const { data, error } = await supabase.from('bug_reports').select('*').order('created_at', { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ bugs: data });
    }
    res.json({ bugs: [] });
  });

  app.get('/api/admin/features', async (req, res) => {
    let currentUser = (req as any).currentUser;
    if (!currentUser || (currentUser.email !== 'admin@axyfx.com' && currentUser.role !== 'SUPER_ADMIN' && currentUser.role !== 'ADMIN')) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    if (useSupabase) {
      const { data, error } = await supabase.from('feature_requests').select('*').order('created_at', { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ features: data });
    }
    res.json({ features: [] });
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
