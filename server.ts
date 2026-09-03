import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { GoogleGenAI } from '@google/genai';
import { 
  User, 
  TradingAccount, 
  Trade, 
  RiskSettings, 
  SupportTicket, 
  Announcement, 
  PaymentHistory 
} from './src/types.js';
import { EA_TEMPLATE } from './src/eaTemplate.js';
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
        title: 'Welcome query',
        description: 'How do I log my first trade?',
        status: 'Open',
        category: 'Support',
        date: '2026-07-10T12:00:00Z'
      }
    ] as SupportTicket[],
    announcements: [
      {
        id: 'ann_1',
        title: 'Welcome to FX Journal Pro V2.5',
        content: 'Start by creating a portfolio account and logging your first trade. Track your equity curve, win rate, and risk habits to improve your trading performance.',
        date: '2026-07-11T10:00:00Z'
      }
    ] as Announcement[],
    mt5Deals: [],
    payments: [] as PaymentHistory[],
    backtestSessions: [] as any[]
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
        status: 'Active',
        eaToken: `ea_demo_${cleanUserId.slice(-8)}`,
        eaStatus: 'Not Connected'
      }
    ] : [],
    trades: [],
    riskSettings: [],
    supportTickets: [],
    mt5Deals: [],
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

// ==========================================
// MT5 EXPERT ADVISOR (EA) SYNCHRONIZATION
// Fresh implementation: each portfolio account gets a unique EA whose
// embedded token authenticates it against the matching account.
// ==========================================

function generateEaToken(): string {
  return `ea_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 6)}`;
}

// Derive the public base URL for the EA (works behind the Vercel proxy too)
function apiBaseUrl(req: any): string {
  const proto = (req.headers['x-forwarded-proto']?.toString().split(',')[0] || req.protocol || 'https').trim();
  const host = (req.headers['x-forwarded-host']?.toString().split(',')[0] || req.get('host') || 'www.fxjournalpro.com').trim();
  return `${proto}://${host}/api/mt5`;
}

// Fill the .mq5 template with this account's unique token + id
function generateEaSource(account: any, apiUrl: string): string {
  const host = apiUrl.replace(/^https?:\/\//, '').split('/')[0];
  return EA_TEMPLATE
    .split('__FXJP_ACCOUNT_ID__').join(account.id)
    .split('__FXJP_TOKEN__').join(account.eaToken || '')
    .split('__FXJP_API_URL__').join(apiUrl)
    .split('__FXJP_WEBREQUEST_HOST__').join(host);
}

// Locate a user's DB by trading account id (used by token-authenticated EA calls)
async function findDbByAccountId(accountId: string): Promise<any | null> {
  if (useSupabase) {
    try {
      const { data } = await supabase.from('trading_accounts').select('user_id').eq('id', accountId).maybeSingle();
      if (data?.user_id) return ensureUserDbLoaded(data.user_id, '');
    } catch (e) {
      console.error('[EA] findDbByAccountId supabase error:', e);
    }
    return null;
  }
  for (const d of userDatabases.values()) {
    if (d && Array.isArray(d.accounts) && d.accounts.some((a: any) => a.id === accountId)) return d;
  }
  return null;
}

const DEAL_TYPE_BUY = 0;
const DEAL_TYPE_SELL = 1;
const DEAL_TYPE_BALANCE = 2;
const DEAL_TYPE_CREDIT = 3;
const ENTRY_IN = 0;
const ENTRY_OUT = 1;
const ENTRY_INOUT = 2;

function normalizeDeal(raw: any): any {
  return {
    ticket: Number(raw.ticket),
    positionId: Number(raw.positionId) || 0,
    time: Number(raw.time),
    type: Number(raw.type),
    entry: Number(raw.entry),
    magic: Number(raw.magic) || 0,
    symbol: String(raw.symbol || '').toUpperCase(),
    volume: parseFloat(raw.volume) || 0,
    price: parseFloat(raw.price) || 0,
    profit: parseFloat(raw.profit) || 0,
    commission: parseFloat(raw.commission) || 0,
    swap: parseFloat(raw.swap) || 0,
    comment: String(raw.comment || '')
  };
}

// Rebuild the journal trade list for an account from its stored MT5 deals.
// Positions are only imported once fully closed; deposits/withdrawals are
// mapped from balance/credit deals. Stable ids enable upsert/dedupe.
// skipBalanceTicket omits the initial deposit deal (it is represented by the
// account's starting balance).
function recomputeMt5TradesForAccount(account: any, deals: any[], skipBalanceTicket?: number): Trade[] {
  const result: Trade[] = [];
  const posGroups = new Map<number, any[]>();

  for (const d of deals) {
    if (d.symbol && (d.entry === ENTRY_IN || d.entry === ENTRY_OUT || d.entry === ENTRY_INOUT)) {
      if (!posGroups.has(d.positionId)) posGroups.set(d.positionId, []);
      posGroups.get(d.positionId)!.push(d);
    }
  }

  for (const [posId, list] of posGroups) {
    const inDeals = list.filter((d: any) => d.entry === ENTRY_IN);
    const outDeals = list.filter((d: any) => d.entry === ENTRY_OUT || d.entry === ENTRY_INOUT);
    if (outDeals.length === 0) continue; // position still open — import when closed

    const inDeal = inDeals[0] || outDeals[0];
    const lastOut = outDeals[outDeals.length - 1];
    const totalProfit = list.reduce((s: number, d: any) => s + d.profit, 0);
    const totalComm = list.reduce((s: number, d: any) => s + d.commission, 0);
    const totalSwap = list.reduce((s: number, d: any) => s + d.swap, 0);

    result.push({
      id: `mt5ea_${account.id}_${posId}`,
      accountId: account.id,
      date: new Date(lastOut.time * 1000).toISOString(),
      symbol: lastOut.symbol || inDeal.symbol || 'UNKNOWN',
      type: (lastOut.type === DEAL_TYPE_SELL ? 'Sell' : 'Buy') as any,
      lotSize: lastOut.volume || inDeal.volume || 0.01,
      entryPrice: inDeal.price,
      exitPrice: lastOut.price,
      profit: totalProfit,
      commission: totalComm,
      swap: totalSwap,
      riskPercentage: 1.0,
      strategy: 'MT5 EA Sync',
      emotion: 'Calm' as any,
      notes: lastOut.comment ? `MT5 comment: ${lastOut.comment}` : 'Imported via MT5 Expert Advisor',
      screenshot: '',
      tags: ['MT5 Sync'],
      isMt5Sync: true,
      eaDealId: lastOut.ticket,
      eaPositionId: posId
    });
  }

  // Balance / credit deals → deposit / withdrawal rows
  for (const d of deals) {
    if (d.symbol) continue;
    if (d.type !== DEAL_TYPE_BALANCE && d.type !== DEAL_TYPE_CREDIT) continue;
    if (skipBalanceTicket !== undefined && d.ticket === skipBalanceTicket) continue;
    const type = d.profit >= 0 ? 'Deposit' : 'Withdrawal';
    result.push({
      id: `mt5ea_${account.id}_dep_${d.ticket}`,
      accountId: account.id,
      date: new Date(d.time * 1000).toISOString(),
      symbol: 'BALANCE',
      type: type as any,
      lotSize: 0,
      entryPrice: 0,
      exitPrice: 0,
      profit: d.profit,
      commission: d.commission,
      swap: d.swap,
      riskPercentage: 1.0,
      strategy: 'MT5 EA Sync',
      emotion: 'Calm' as any,
      notes: d.comment ? `MT5: ${d.comment}` : (type === 'Deposit' ? 'Deposit' : 'Withdrawal'),
      screenshot: '',
      tags: ['MT5 Sync'],
      isMt5Sync: true,
      eaDealId: d.ticket,
      eaPositionId: 0
    });
  }

  return result;
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
      const loadUserData = async (uid: string) => {
        const [
          { data: users },
          { data: accounts },
          { data: trades },
          { data: riskSettings },
          { data: supportTickets },
          { data: mt5Deals }
        ] = await Promise.all([
          supabase.from('users').select('*').eq('id', uid),
          supabase.from('trading_accounts').select('*').eq('user_id', uid),
          supabase.from('trades').select('*').eq('user_id', uid),
          supabase.from('risk_settings').select('*').eq('user_id', uid),
          supabase.from('support_tickets').select('*').eq('user_id', uid),
          supabase.from('mt5_deals').select('*').eq('user_id', uid)
        ]);
        return {
          users: toCamel(users || []),
          accounts: toCamel(accounts || []),
          trades: toCamel(trades || []),
          riskSettings: toCamel(riskSettings || []),
          supportTickets: toCamel(supportTickets || []),
          mt5Deals: toCamel(mt5Deals || []),
          payments: []
        };
      };

      // If we only have an email, look up the user first
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

      let loadedDb = await loadUserData(cleanUserId);

      // Fallback: the provided id may not match the stored row (e.g. OAuth UUID vs
      // server-generated id). Re-resolve the canonical id by email and reload.
      if (loadedDb.users.length === 0 && cleanEmail) {
        const { data: userByEmail } = await supabase.from('users').select('id').eq('email', cleanEmail).maybeSingle();
        if (userByEmail?.id && userByEmail.id !== cleanUserId) {
          cleanUserId = userByEmail.id;
          loadedDb = await loadUserData(cleanUserId);
        }
      }

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
        if (!loadedDb.mt5Deals && cached.mt5Deals?.length > 0) {
          loadedDb.mt5Deals = cached.mt5Deals;
        }
        if (loadedDb.accounts.length > 0) {
          // Carry EA sync status/cursor from the live cache when Supabase copy is stale
          for (const la of loadedDb.accounts) {
            const ca = (cached.accounts || []).find((x: any) => x.id === la.id);
            if (ca && ca.eaStatus) {
              if (ca.eaStatus) la.eaStatus = ca.eaStatus;
              if (ca.eaLastDealId !== undefined) la.eaLastDealId = ca.eaLastDealId;
              if (ca.eaLastSyncTime) la.eaLastSyncTime = ca.eaLastSyncTime;
              if (ca.eaSyncTradeCount !== undefined) la.eaSyncTradeCount = ca.eaSyncTradeCount;
              if (ca.eaConnectedAt) la.eaConnectedAt = ca.eaConnectedAt;
              if (ca.eaTerminalLogin) la.eaTerminalLogin = ca.eaTerminalLogin;
              if (ca.eaTerminalServer) la.eaTerminalServer = ca.eaTerminalServer;
              if (ca.eaToken) la.eaToken = ca.eaToken;
            }
          }
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

      if (cleanUserId) userDatabases.set(cleanUserId, loadedDb);

      return loadedDb;
    } catch (err) {
      console.error('[AxyFx SQL Query Error]', err);
    }
  }

  const cached = userDatabases.get(cleanUserId) || (cleanEmail ? userDatabases.get(cleanEmail) : null);
  if (cached) return cached;

  const fresh = createEmptyUserDb(cleanUserId, cleanEmail, false);
  if (cleanUserId) userDatabases.set(cleanUserId, fresh);
  if (cleanEmail) userDatabases.set(cleanEmail.toLowerCase(), fresh);
  return fresh;
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
): Promise<{ accountsError?: any }> {
  if (!data) return {};
  const usersToSync = Array.isArray(data.users) ? data.users : [];
  if (usersToSync.length === 0) return {};

  const targetUser = usersToSync[0];
  const uid = targetUser.id;
  const email = targetUser.email;
  if (!uid) return {};

  if (uid) userDatabases.set(uid, data);
  if (email) userDatabases.set(email.toLowerCase(), data);
  if (overrideUserId) userDatabases.set(overrideUserId, data);
  if (overrideEmail) userDatabases.set(overrideEmail.toLowerCase(), data);

  if (!useSupabase) return {};

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
        'institution_type',
        'currency', 'starting_balance', 'current_balance', 'equity', 'status',
        'is_mt5_sync',
        'ea_token', 'ea_status', 'ea_last_deal_id', 'ea_last_sync_time',
        'ea_sync_trade_count', 'ea_connected_at', 'ea_terminal_login',
        'ea_terminal_server', 'created_at', 'updated_at'
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
      if (err2) {
        console.error('[saveDatabase] trading_accounts upsert error:', err2);
        return { accountsError: err2 };
      }
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
    // Upsert MT5 deals (raw deal stream used to recompute synced trades)
    if (data.mt5Deals && data.mt5Deals.length > 0) {
      const deals = toSnake(data.mt5Deals).map((d: any) => ({
        id: String(d.ticket),
        account_id: d.account_id || d.accountId,
        position_id: d.position_id ?? d.positionId ?? 0,
        deal: d,
        user_id: d.user_id || uid
      }));
      await supabase.from('mt5_deals').upsert(deals, { onConflict: 'id' });
    }
  } catch(err) {
    console.error('[AxyFx SQL Save Error]', err);
  }
}

// Auto-create a default portfolio account for new signups if the user has no accounts
async function ensureDefaultPortfolioAccount(
  db: any,
  userId: string,
  email?: string
): Promise<TradingAccount | null> {
  try {
    if (!db || !userId) return null;
    if (!Array.isArray(db.accounts)) db.accounts = [];
    if (!Array.isArray(db.riskSettings)) db.riskSettings = [];

    const existing = db.accounts.filter((acc: any) => acc.userId === userId || !acc.userId);
    if (existing.length > 0) return null;

    const newAcc: TradingAccount = {
      id: `acc_${Date.now()}`,
      userId,
      name: 'Portfolio Account',
      broker: 'MT5 Demo Broker',
      platform: 'MT5',
      accountType: 'Demo',
      currency: 'USD',
      startingBalance: 10000,
      currentBalance: 10000,
      equity: 10000,
      status: 'Active',
      eaToken: generateEaToken(),
      eaStatus: 'Not Connected'
    };
    db.accounts.push(newAcc);

    // Add a starter risk setting for the default account
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

    await saveDatabase(db, userId, email);
    console.log(`[Auth] Auto-created default portfolio account ${newAcc.id} for user ${userId}`);
    return newAcc;
  } catch (err: any) {
    console.error('[Auth] Failed to auto-create default portfolio account:', err?.message || err);
    return null;
  }
}

async function removeUserDatabaseAliases(userId?: string, email?: string) {
  void userId;
  void email;
}

// Attach the submitting user's name to ticket rows (joins the users table by user_id)
async function attachTicketUserNames(tickets: any[]): Promise<any[]> {
  if (!useSupabase || !Array.isArray(tickets) || tickets.length === 0) return tickets;
  try {
    const ids = Array.from(new Set(tickets.map((t: any) => t.userId || t.user_id).filter(Boolean)));
    if (ids.length === 0) return tickets;
    const { data: users } = await supabase.from('users').select('id, name, email').in('id', ids);
    const nameMap = Object.fromEntries((users || []).map((u: any) => [u.id, u]));
    return tickets.map((t: any) => {
      const u = nameMap[t.userId || t.user_id];
      return {
        ...toCamel(t),
        userName: u?.name || '',
        userEmail: t.userEmail || t.user_email || u?.email || ''
      };
    });
  } catch (e) {
    console.error('[Tickets] Failed to attach user names:', e);
    return tickets.map((t: any) => toCamel(t));
  }
}

// Aggregate all support tickets from the in-memory per-user databases (local dev fallback)
function collectAllInMemoryTickets(): any[] {
  const seen = new Set<string>();
  const out: any[] = [];
  userDatabases.forEach((d: any) => {
    (d.supportTickets || []).forEach((t: any) => {
      if (!seen.has(t.id)) {
        seen.add(t.id);
        out.push(t);
      }
    });
  });
  return out;
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
  app.use(cookieParser());
  app.use(express.json({ limit: '15mb' }));

  // CORS middleware — allow browser requests from both domains
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
    res.setHeader('Access-Control-Allow-Credentials', 'true');
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
      let authUserId = (req.headers['x-auth-user-id'] as string | undefined)?.trim();
      let authEmail = (req.headers['x-auth-email'] as string | undefined)?.trim();

      if ((!authUserId || !authEmail) && req.cookies && req.cookies.fx_auth_session) {
        try {
          const session = JSON.parse(req.cookies.fx_auth_session);
          if (session.userId) authUserId = session.userId;
          if (session.email) authEmail = session.email;
        } catch (e) {}
      }

      if (authUserId || authEmail) {
        const email = authEmail ? authEmail.toLowerCase() : '';
        const userId = authUserId || (email ? `user_${email}` : '');

        let db = await ensureUserDbLoaded(userId, email);

        // Use the user already resolved by ensureUserDbLoaded (by email lookup)
        // Never mutate the canonical user ID with a temporary session ID
        let dbUser = db.users[0] || null;

        // Security: accounts that explicitly have NOT completed email/OTP verification
        // are treated as unauthenticated. This blocks session-restore (and every
        // protected API route) until OTP verification is successfully completed,
        // even if the page is refreshed while the OTP window is open.
        const unverified = dbUser
          ? dbUser.isEmailVerified === false || dbUser.is_email_verified === false
          : false;
        if (dbUser && unverified) {
          (req as any).userDb = null;
          (req as any).currentUser = null;
        } else {
          (req as any).userDb = db;
          (req as any).currentUser = dbUser;
        }
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
    // Record this visit as the user's last login/activity, throttled so the
    // timestamp refreshes on each page load without writing on every request.
    try {
      const nowIso = new Date().toISOString();
      const prev = currentUser.lastLogin || currentUser.last_login;
      const shouldUpdate = !prev || (Date.now() - new Date(prev).getTime()) >= 15 * 60 * 1000;
      if (shouldUpdate) {
        currentUser.lastLogin = nowIso;
        currentUser.last_login = nowIso;
        if (useSupabase) {
          try {
            await supabase.from('users').update({ last_login: nowIso }).eq('id', currentUser.id);
          } catch (e) {
            console.warn('[auth/me] last_login update skipped:', (e as any)?.message || e);
          }
        } else {
          const db = (req as any).userDb;
          if (db) await saveDatabase(db);
        }
      }
    } catch (err) {
      console.warn('[auth/me] last_login update failed:', err);
    }
    return res.json({ user: currentUser });
  });

  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('fx_auth_session', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    res.json({ message: 'Logged out successfully' });
  });

  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, name, password, isEmailVerified, id, userId, turnstileToken, provider } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const normalizedEmail = email.toLowerCase().trim();
      const authUserId = (req.headers['x-auth-user-id'] as string) || id || userId || '';

      // Skip Turnstile for SSO/Google OAuth path — user already verified externally
      if (isEmailVerified !== true) {
        const isHuman = await verifyTurnstile(turnstileToken);
        if (!isHuman) {
          return res.status(403).json({ error: 'Captcha verification failed. Please try again.' });
        }
      }

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
          experience: existingUserRow?.experience || 'Intermediate',
          trading_style: existingUserRow?.trading_style || 'Day Trading',
          main_markets: existingUserRow?.main_markets || ['Forex', 'Gold'],
          onboarding_completed: existingUserRow?.onboarding_completed || false,
          is_pro: existingUserRow?.is_pro || false,
          is_email_verified: true,
          auth_provider: provider || 'google',
          last_login: new Date().toISOString()
        };
        if (useSupabase) {
          const { error: upsertErr } = await supabase.from('users').upsert(userRecord, { onConflict: 'id' });
          if (upsertErr) {
            // Column may not exist (e.g. auth_provider/last_login migration not applied).
            // Retry with only the base columns guaranteed by supabase_schema.sql.
            console.warn('[Register SSO] Full upsert failed, retrying with base columns:', upsertErr.message);
            const baseRecord = {
              id: uid,
              email: normalizedEmail,
              name: name || normalizedEmail.split('@')[0],
              password: password ? await bcrypt.hash(password, 10) : (existingUserRow?.password || ''),
              experience: existingUserRow?.experience || 'Intermediate',
              trading_style: existingUserRow?.trading_style || 'Day Trading',
              main_markets: existingUserRow?.main_markets || ['Forex', 'Gold'],
              onboarding_completed: existingUserRow?.onboarding_completed || false,
              is_pro: existingUserRow?.is_pro || false,
              is_email_verified: true
            };
            const { error: baseErr } = await supabase.from('users').upsert(baseRecord, { onConflict: 'id' });
            if (baseErr) {
              console.error('[Register SSO] Base upsert failed:', baseErr);
              return res.status(500).json({ error: 'Failed to sync account. Please try again.' });
            }
          }
        } else {
          // Fallback: persist the SSO user in-memory so later requests resolve it
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
        // Auto-create a default portfolio account for new signups
        try {
          const ssoDb = await ensureUserDbLoaded(uid, normalizedEmail);
          await ensureDefaultPortfolioAccount(ssoDb, uid, normalizedEmail);
        } catch (e) {
          console.error('[Register SSO] Failed to auto-create default portfolio account:', e);
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
          // Column may not exist (e.g. auth_provider/last_login migration not applied).
          // Retry with only the base columns guaranteed by the users table.
          console.warn('[Register] Full upsert failed, retrying with base columns:', upsertErr.message);
          const baseRecord = {
            id: uid,
            email: normalizedEmail,
            name: name || existingUserRow?.name || normalizedEmail.split('@')[0],
            password: hashedPassword,
            experience: existingUserRow?.experience || 'Intermediate',
            trading_style: existingUserRow?.trading_style || 'Day Trading',
            main_markets: existingUserRow?.main_markets || ['Forex', 'Gold'],
            onboarding_completed: existingUserRow?.onboarding_completed || false,
            is_pro: existingUserRow?.is_pro || false,
            is_email_verified: false
          };
          const { error: baseErr } = await supabase.from('users').upsert(baseRecord, { onConflict: 'id' });
          if (baseErr) {
            console.error('[Register] Base upsert failed:', baseErr);
            return res.status(500).json({ error: 'Failed to create account. Please try again.' });
          }
          // Persist OTP fields via a targeted update (only columns that exist)
          try {
            await supabase.from('users').update({
              email_otp: otp,
              otp_expires_at: otpExpiresAt,
              otp_attempts: 0,
              otp_sent_at: new Date().toISOString()
            }).eq('id', uid);
          } catch (otpErr) {
            console.warn('[Register] OTP field update failed (non-fatal):', otpErr);
          }
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
      
      // Skip Turnstile in development mode (NODE_ENV not set or 'development')
      const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
      if (!isDev) {
        const isHuman = await verifyTurnstile(turnstileToken);
        if (!isHuman) {
          return res.status(403).json({ error: 'Captcha verification failed. Please try again.' });
        }
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

      // In development, auto-create user if missing
      if (!user && isDev) {
        const uid = authUserId || `user_dev_${Date.now()}`;
        const hashedPassword = password ? await bcrypt.hash(password, 10) : '';
        const devUser = {
          id: uid,
          email: normalizedEmail,
          name: normalizedEmail.split('@')[0],
          password: hashedPassword,
          experience: 'Intermediate',
          trading_style: 'Day Trading',
          main_markets: ['Forex', 'Gold'],
          onboarding_completed: false,
          is_pro: false,
          is_email_verified: true,
          auth_provider: 'email',
          created_at: new Date().toISOString(),
          last_login: new Date().toISOString()
        };
        db.users.push(devUser);
        await saveDatabase(db);
        console.log(`[Dev] Auto-created user: ${normalizedEmail}`);
        // Auto-create a default portfolio account for the dev user
        await ensureDefaultPortfolioAccount(db, uid, normalizedEmail);

        res.cookie('fx_auth_session', JSON.stringify({ userId: devUser.id, email: devUser.email }), {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });

        return res.json({ message: 'Login successful', user: devUser });
      }

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

      // Security: require email/OTP verification before signing in.
      if (user.isEmailVerified === false || user.is_email_verified === false) {
        return res.status(403).json({ error: 'Please verify your email before signing in. Enter the 6-digit code we sent to your inbox, or click resend.' });
      }

      // Update last_login timestamp
      user.last_login = new Date().toISOString();
      if (useSupabase) {
        await supabase.from('users').update({ last_login: new Date().toISOString() }).eq('id', user.id);
      }
      await saveDatabase(db);

      res.cookie('fx_auth_session', JSON.stringify({ userId: user.id, email: user.email }), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });

      res.json({ message: 'Login successful', user });
    } catch (err: any) {
      console.error('[AxyFx Journal Server] Login endpoint error:', err);
      res.status(500).json({ error: `Server login error: ${err?.message || err}` });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('fx_auth_session', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
    res.json({ message: 'Logged out successfully' });
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

        // Auto-create a default portfolio account for the newly verified user
        try {
          const otpDb = await ensureUserDbLoaded(verifiedUser.id, normalizedEmail);
          await ensureDefaultPortfolioAccount(otpDb, verifiedUser.id, normalizedEmail);
        } catch (e) {
          console.error('[verify-otp] Failed to auto-create default portfolio account:', e);
        }

        res.cookie('fx_auth_session', JSON.stringify({ userId: verifiedUser.id, email: verifiedUser.email }), {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });

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
        // Auto-create a default portfolio account for the newly verified user
        await ensureDefaultPortfolioAccount(db, user.id, normalizedEmail);
        await saveDatabase(db, user.id, normalizedEmail);
        
        res.cookie('fx_auth_session', JSON.stringify({ userId: user.id, email: user.email }), {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });
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
      res.status(500).json({ error: `Server resend OTP error: ${err?.message || err}` });
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
      res.status(500).json({ error: 'Server error during password reset request.' });
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
      res.status(500).json({ error: 'Server error during password reset.' });
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
      
      // Auto-create a default portfolio account for new users if none exists yet
      await ensureDefaultPortfolioAccount(db, currentUser.id, authEmail);

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
  // USER PREFERENCES ROUTE
  // ==========================================

  app.patch('/api/auth/preferences', async (req, res) => {
    let db = (req as any).userDb;
    let currentUser = (req as any).currentUser;
    const authEmail = currentUser?.email;
    if (!currentUser || !db) return res.status(401).json({ error: 'Not authenticated' });

    const userIdx = db.users.findIndex((u: any) => u.id === currentUser?.id);
    if (userIdx === -1) return res.status(404).json({ error: 'User not found' });

    // Merge incoming preferences with existing ones
    const existing = db.users[userIdx].preferences || {};
    db.users[userIdx].preferences = { ...existing, ...req.body };

    await saveDatabase(db, authEmail);
    currentUser = db.users[userIdx];
    res.json({ message: 'Preferences saved', user: currentUser });
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

    const { name, broker, platform, accountType, currency, startingBalance, isMt5Sync, institutionType } = req.body;
    if (!name || !broker) {
      return res.status(400).json({ error: 'Account name and broker are required.' });
    }
    if (!isMt5Sync && (startingBalance === undefined || startingBalance === null)) {
      return res.status(400).json({ error: 'Starting balance is required for manual accounts.' });
    }

    let startBal: number;
    if (isMt5Sync) {
      startBal = (startingBalance !== undefined && startingBalance !== null && startingBalance !== '')
        ? (parseFloat(startingBalance) || 0)
        : 0;
    } else {
      startBal = parseFloat(startingBalance) || 10000;
    }

    const newAcc: TradingAccount = {
      id: `acc_${Date.now()}`,
      userId: currentUser.id,
      name,
      broker,
      platform: isMt5Sync ? 'MT5' : (platform || 'MT5'),
      accountType: accountType || 'Live',
      ...(institutionType ? { institutionType } : {}),
      currency: currency || 'USD',
      startingBalance: startBal,
      currentBalance: startBal,
      equity: startBal,
      status: 'Active',
      isMt5Sync: !!isMt5Sync,
      eaToken: generateEaToken(),
      eaStatus: 'Not Connected'
    };

    db.accounts.push(newAcc);

    // Create default risk settings
    const riskBase = startBal || 10000;
    const newRisk: RiskSettings = {
      id: `r_${Date.now()}`,
      accountId: newAcc.id,
      riskPerTradeLimit: 2.0,
      dailyLossLimit: riskBase * 0.05,
      weeklyLossLimit: riskBase * 0.10,
      maxDrawdownLimit: 10.0,
      disciplineEnabled: true,
      maxTradesPerDay: 5
    };
    db.riskSettings.push(newRisk);

    const saveResult = await saveDatabase(db, authEmail);
    if (saveResult?.accountsError) {
      const code = saveResult.accountsError.code;
      if (code === '42703') {
        return res.status(500).json({
          error: 'Database is missing required columns. Please run the MT5 EA schema migration in Supabase (mt5_ea_schema_migration.sql) and try again.'
        });
      }
      return res.status(500).json({ error: 'Account could not be saved to the database. Please try again.' });
    }
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

  app.post('/api/trades/batch', async (req, res) => {
    let db = (req as any).userDb;
    let currentUser = (req as any).currentUser;
    const authEmail = currentUser?.email;
    if (!currentUser || !db) return res.status(401).json({ error: 'Not authenticated' });

    const { accountId, trades: incomingTrades } = req.body;
    if (!accountId || !Array.isArray(incomingTrades) || incomingTrades.length === 0) {
      return res.status(400).json({ error: 'accountId and trades[] are required' });
    }

    const account = db.accounts.find((a: any) => a.id === accountId);
    if (!account) return res.status(404).json({ error: 'Account not found' });
    if (account.userId !== currentUser.id) return res.status(403).json({ error: 'Access denied' });

    const saved: Trade[] = [];
    let balanceAdjustment = 0;

    for (const t of incomingTrades) {
      if (!t.symbol || !t.type || t.profit === undefined) continue;
      const newTrade: Trade = {
        id: `trade_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        accountId,
        date: t.date || new Date().toISOString(),
        symbol: t.symbol.toUpperCase(),
        type: t.type,
        lotSize: parseFloat(t.lotSize) || 0.01,
        entryPrice: parseFloat(t.entryPrice) || 0,
        exitPrice: parseFloat(t.exitPrice) || 0,
        stopLoss: t.stopLoss ? parseFloat(t.stopLoss) : undefined,
        takeProfit: t.takeProfit ? parseFloat(t.takeProfit) : undefined,
        profit: parseFloat(t.profit) || 0,
        commission: t.commission ? parseFloat(t.commission) : 0,
        swap: t.swap ? parseFloat(t.swap) : 0,
        riskPercentage: t.riskPercentage ? parseFloat(t.riskPercentage) : 1.0,
        strategy: t.strategy || 'Pasted from MT5',
        emotion: t.emotion || 'Calm',
        notes: t.notes || '',
        screenshot: '',
        tags: t.tags || ['MT5 Paste'],
        isMt5Sync: true
      };
      db.trades.push(newTrade);
      saved.push(newTrade);
      balanceAdjustment += newTrade.profit + newTrade.commission + newTrade.swap;
    }

    if (saved.length > 0) {
      account.currentBalance = parseFloat((account.currentBalance + balanceAdjustment).toFixed(2));
      account.equity = account.currentBalance;
      await saveDatabase(db, authEmail);
    }

    res.json({ message: `${saved.length} trades imported successfully`, trades: saved, totalSaved: saved.length });
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
  // MT5 EXPERT ADVISOR (EA) ROUTES
  // Each portfolio account gets a unique EA; the EA authenticates with its
  // embedded token and streams deals + account info to these endpoints.
  // ==========================================

  // Download the unique .mq5 EA for an account (session-authenticated)
  app.get('/api/mt5/ea/:accountId/download', async (req, res) => {
    let db = (req as any).userDb;
    let currentUser = (req as any).currentUser;
    if (!currentUser || !db) return res.status(401).json({ error: 'Not authenticated' });

    const account = db.accounts.find((a: any) => a.id === req.params.accountId);
    if (!account) return res.status(404).json({ error: 'Account not found' });
    if (account.userId !== currentUser.id) return res.status(403).json({ error: 'Access denied' });

    if (!account.eaToken) {
      account.eaToken = generateEaToken();
      account.eaStatus = account.eaStatus || 'Not Connected';
      await saveDatabase(db, currentUser.email);
    }

    const apiUrl = apiBaseUrl(req);
    const source = generateEaSource(account, apiUrl);
    const safeName = String(account.name || 'account').replace(/[^A-Za-z0-9]+/g, '_').slice(0, 30);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="FXJournalPro_Sync_${safeName}.mq5"`);
    res.send(source);
  });

  // Reset an account's EA token (invalidates the previous EA file)
  app.post('/api/mt5/ea/:accountId/reset-token', async (req, res) => {
    let db = (req as any).userDb;
    let currentUser = (req as any).currentUser;
    if (!currentUser || !db) return res.status(401).json({ error: 'Not authenticated' });

    const account = db.accounts.find((a: any) => a.id === req.params.accountId);
    if (!account) return res.status(404).json({ error: 'Account not found' });
    if (account.userId !== currentUser.id) return res.status(403).json({ error: 'Access denied' });

    account.eaToken = generateEaToken();
    account.eaStatus = 'Not Connected';
    account.eaConnectedAt = undefined;
    account.eaLastDealId = 0;
    account.eaLastSyncTime = undefined;
    account.eaSyncTradeCount = account.eaSyncTradeCount || 0;

    await saveDatabase(db, currentUser.email);
    res.json({ message: 'EA token reset. Download a fresh EA file for this account.', account });
  });

  // EA handshake: validates the embedded token and records terminal info
  app.post('/api/mt5/ea/authenticate', async (req, res) => {
    const { accountId, token, terminal } = req.body;
    if (!accountId || !token) return res.status(400).json({ error: 'accountId and token are required' });

    const db = await findDbByAccountId(accountId);
    if (!db) return res.status(404).json({ error: 'Account not found' });
    const account = db.accounts.find((a: any) => a.id === accountId);
    if (!account) return res.status(404).json({ error: 'Account not found' });
    if (!account.eaToken || account.eaToken !== token) {
      return res.status(401).json({ error: 'Invalid EA token. Reset the token from your dashboard and download a new EA file.' });
    }

    if (terminal && typeof terminal === 'object') {
      if (terminal.login !== undefined) account.eaTerminalLogin = String(terminal.login);
      if (terminal.server !== undefined) account.eaTerminalServer = String(terminal.server);
    }
    account.eaStatus = 'Connected';
    account.eaConnectedAt = account.eaConnectedAt || new Date().toISOString();

    await saveDatabase(db, db.users?.[0]?.email);
    res.json({ ok: true, status: 'Connected', lastDealId: account.eaLastDealId || 0 });
  });

  // EA sync: receives a batch of deals + account info, recomputes trades, upserts
  app.post('/api/mt5/ea/sync', async (req, res) => {
    const { accountId, token, account, deals } = req.body;
    if (!accountId || !token) return res.status(400).json({ error: 'accountId and token are required' });
    if (!Array.isArray(deals)) return res.status(400).json({ error: 'deals[] is required' });

    const db = await findDbByAccountId(accountId);
    if (!db) return res.status(404).json({ error: 'Account not found' });
    const acc = db.accounts.find((a: any) => a.id === accountId);
    if (!acc) return res.status(404).json({ error: 'Account not found' });
    if (!acc.eaToken || acc.eaToken !== token) {
      return res.status(401).json({ error: 'Invalid EA token' });
    }

    // 1. Merge new deals (dedupe by ticket within this account)
    if (!Array.isArray(db.mt5Deals)) db.mt5Deals = [];
    const seen = new Set<number>(
      db.mt5Deals.filter((d: any) => d.accountId === accountId).map((d: any) => d.ticket)
    );
    let added = 0;
    let maxTicket = acc.eaLastDealId || 0;
    for (const raw of deals) {
      const d = normalizeDeal(raw);
      if (!d.ticket) continue;
      if (!seen.has(d.ticket)) {
        db.mt5Deals.push({ ...d, accountId });
        seen.add(d.ticket);
        added++;
      }
      if (d.ticket > maxTicket) maxTicket = d.ticket;
    }

    // 2. Recompute journal trades from the full deal stream and upsert
    const accountDeals = db.mt5Deals.filter((d: any) => d.accountId === accountId);

    // 2a. MT5 sync accounts: the FIRST deposit recorded in the account history is
    //     the Initial Balance. It is set once (while starting balance is still 0) so
    //     manually entered balances are preserved, and it is excluded from the journal
    //     trades because it is already represented by the starting balance.
    let skipBalanceTicket: number | undefined;
    if (acc.isMt5Sync) {
      const deposits = accountDeals
        .filter((d: any) => d.type === DEAL_TYPE_BALANCE && (d.profit || 0) > 0)
        .sort((a: any, b: any) => a.time - b.time);
      if (deposits.length > 0) {
        skipBalanceTicket = deposits[0].ticket;
        if (!acc.startingBalance || acc.startingBalance === 0) {
          acc.startingBalance = parseFloat(deposits[0].profit.toFixed(2));
        }
      }
    }

    const recomputed = recomputeMt5TradesForAccount(acc, accountDeals, skipBalanceTicket);
    const existingById = new Map(
      db.trades
        .filter((t: any) => t.accountId === accountId && t.eaDealId !== undefined)
        .map((t: any) => [t.id, t])
    );
    let inserted = 0;
    let updated = 0;
    for (const tr of recomputed) {
      const prev = existingById.get(tr.id);
      if (prev) {
        Object.assign(prev, tr);
        updated++;
      } else {
        db.trades.push(tr);
        inserted++;
      }
    }
    // 2b. Drop stale MT5-synced trades no longer produced by the recomputation
    //     (e.g. the initial deposit once it is folded into the starting balance).
    const recomputedIds = new Set(recomputed.map((t: any) => t.id));
    db.trades = db.trades.filter((t: any) => {
      if (t.accountId === accountId && t.eaDealId !== undefined && !recomputedIds.has(t.id)) return false;
      return true;
    });

    // 3. Update account balance/equity from the authoritative MT5 payload
    if (account && typeof account === 'object') {
      if (account.balance !== undefined) acc.currentBalance = parseFloat(account.balance) || acc.currentBalance;
      if (account.equity !== undefined) acc.equity = parseFloat(account.equity) || acc.equity;
      if (account.currency !== undefined && account.currency) acc.currency = String(account.currency);
    }

    acc.eaStatus = 'Connected';
    acc.eaConnectedAt = acc.eaConnectedAt || new Date().toISOString();
    acc.eaLastSyncTime = new Date().toISOString();
    acc.eaLastDealId = maxTicket;
    acc.eaSyncTradeCount = db.trades.filter(
      (t: any) => t.accountId === accountId && t.type !== 'Deposit' && t.type !== 'Withdrawal'
    ).length;

    await saveDatabase(db, db.users?.[0]?.email);
    res.json({ ok: true, inserted, updated, totalTrades: acc.eaSyncTradeCount, cursor: maxTicket, status: acc.eaStatus });
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
    const accountTrades = db.trades.filter((t: any) =>
      t.accountId === accountId &&
      t.type !== 'Deposit' &&
      t.type !== 'Withdrawal'
    );
    
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
        return `Hey ${traderName}! 👋 Welcome to your AI Mentor session.\n\nI noticed you haven't logged any trades yet in **"${accName}"**. That's totally fine — everyone starts somewhere!\n\nTo get personalized coaching from me, start by logging your trades in the **Trading Journal**. Once you do, I can analyze your win rate, risk habits, emotions, and give you specific guidance to improve.\n\nI'm here whenever you're ready. 🙏`;
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

  app.get('/api/tickets', async (req, res) => {
    let db = (req as any).userDb;
    let currentUser = (req as any).currentUser;
    if (!currentUser || !db) return res.json({ tickets: [] });

    const isAdmin = await checkIsAdmin(currentUser);
    // Admins see all tickets, regular users see their own
    if (isAdmin) {
      if (useSupabase) {
        try {
          const { data, error } = await supabase
            .from('support_tickets')
            .select('*')
            .order('date', { ascending: false });
          if (error) {
            console.error('[GET /api/tickets] Supabase error:', error);
            return res.status(500).json({ error: error.message });
          }
          const tickets = await attachTicketUserNames(data || []);
          return res.json({ tickets });
        } catch (e: any) {
          console.error('[GET /api/tickets] Admin query exception:', e);
          return res.status(500).json({ error: e?.message || 'Failed to load tickets' });
        }
      }
      const tickets = await attachTicketUserNames(collectAllInMemoryTickets());
      return res.json({ tickets });
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
      userName: currentUser.name || '',
      title,
      description,
      status: 'Open',
      category: category || 'Support',
      date: new Date().toISOString()
    };

    db.supportTickets.push(newTicket);
    try {
      await saveDatabase(db);
    } catch (e: any) {
      console.error('[POST /api/tickets] Local persistence failed:', e?.message || e);
    }
    if (useSupabase) {
      const { error } = await supabase.from('support_tickets').insert({
        id: newTicket.id,
        user_id: currentUser.id,
        user_email: currentUser.email,
        title,
        description,
        status: 'Open',
        category: newTicket.category,
        date: newTicket.date
      });
      if (error) {
        console.error('[POST /api/tickets] Supabase insert failed:', error.message);
        return res.status(500).json({ error: 'Failed to save your submission. Please try again.' });
      }
    }
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
      let allUsers: any[] | null = null;
      // Try ordering by last_login first (requires the column to exist)
      const ordered = await supabase
        .from('users')
        .select('*')
        .order('last_login', { ascending: false, nullsFirst: false });
      if (ordered.error) {
        // Column may not exist yet — fall back to created_at
        const fallback = await supabase.from('users').select('*').order('created_at', { ascending: false });
        allUsers = fallback.data;
      } else {
        allUsers = ordered.data;
      }
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
      const [{ data: allUsers }, { data: allTrades }, { data: allTickets }] = await Promise.all([
        supabase.from('users').select('id, status, created_at'),
        supabase.from('trades').select('id'),
        supabase.from('support_tickets').select('id, status')
      ]);
      const totalUsers = allUsers?.length || 0;
      const activeUsers = (allUsers || []).filter((u: any) => u.status === 'ACTIVE' || !u.status).length;
      const totalTrades = allTrades?.length || 0;
      const pendingTickets = (allTickets || []).filter((t: any) => t.status === 'Open' || t.status === 'In Progress').length;

      // Build user growth by day
      const dayBuckets: Record<string, number> = {};
      const sorted = (allUsers || []).filter((u: any) => u.created_at).sort((a: any, b: any) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      let running = 0;
      for (const u of sorted) {
        const day = new Date(u.created_at).toISOString().slice(0, 10);
        dayBuckets[day] = (dayBuckets[day] || 0) + 1;
      }
      const userGrowth = Object.entries(dayBuckets)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, count }));

      // Compute running cumulative total
      let cum = 0;
      for (const entry of userGrowth) {
        cum += entry.count;
        entry.count = cum;
      }

      return res.json({ totalUsers, activeUsers, totalTrades, totalRevenue: 0, pendingTickets, userGrowth });
    }
    // fallback to per-user db
    const db = (req as any).userDb;
    res.json({
      totalUsers: db?.users?.length || 0,
      activeUsers: db?.users?.filter((u: any) => u.status === 'ACTIVE' || !u.status).length || 0,
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
    if (!currentUser || !(await checkIsAdmin(currentUser))) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    if (useSupabase) {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('category', 'Bug')
        .order('date', { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      const tickets = await attachTicketUserNames(data || []);
      // Derive a priority badge from the severity embedded in the title
      const bugs = tickets.map((t: any) => {
        const m = /Severity:\s*(\w+)/i.exec(t.title || '');
        return { ...t, priority: (m?.[1] || 'Low').toUpperCase() };
      });
      return res.json({ bugs });
    }
    const tickets = await attachTicketUserNames(
      collectAllInMemoryTickets().filter((t: any) => t.category === 'Bug')
    );
    const bugs = tickets.map((t: any) => {
      const m = /Severity:\s*(\w+)/i.exec(t.title || '');
      return { ...t, priority: (m?.[1] || 'Low').toUpperCase() };
    });
    res.json({ bugs });
  });

  app.get('/api/admin/features', async (req, res) => {
    let currentUser = (req as any).currentUser;
    if (!currentUser || !(await checkIsAdmin(currentUser))) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    if (useSupabase) {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('category', 'Feature Request')
        .order('date', { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      const features = await attachTicketUserNames(data || []);
      return res.json({ features });
    }
    const features = await attachTicketUserNames(
      collectAllInMemoryTickets().filter((t: any) => t.category === 'Feature Request')
    );
    res.json({ features });
  });

  // ==========================================
  // FX NEWS & ECONOMIC CALENDAR
  // ==========================================

  // Optional upstream base-URL overrides (useful for testing or proxying).
  const ALPHA_VANTAGE_BASE = (process.env.ALPHA_VANTAGE_BASE_URL || 'https://www.alphavantage.co').trim().replace(/\/+$/, '');
  const FMP_BASE = (process.env.FMP_BASE_URL || 'https://financialmodelingprep.com').trim().replace(/\/+$/, '');
  const FINNHUB_BASE = (process.env.FINNHUB_BASE_URL || 'https://finnhub.io').trim().replace(/\/+$/, '');
  const XOOMAR_BASE = (process.env.XOOMAR_BASE_URL || 'https://xoomar.com').trim().replace(/\/+$/, '');

  // Simple in-memory TTL cache so upstream APIs are only hit once per window.
  const apiCache = new Map<string, { data: unknown; expiresAt: number }>();

  function getCached<T>(key: string): T | undefined {
    const entry = apiCache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      apiCache.delete(key);
      return undefined;
    }
    return entry.data as T;
  }

  function setCached(key: string, data: unknown, ttlMs: number) {
    apiCache.set(key, { data, expiresAt: Date.now() + ttlMs });
  }

  async function fetchJson(url: string, timeoutMs = 15000): Promise<any> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'FXJournalPro/1.0', Accept: 'application/json' },
      });
      if (!res.ok) {
        const err = new Error(`Upstream API responded with ${res.status}`) as Error & { status?: number };
        err.status = res.status;
        throw err;
      }
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  // ---- FX News (Alpha Vantage News & Sentiment) ----

  const NEWS_CATEGORY_ORDER = [
    'Market Analysis',
    'Central Banks',
    'Interest Rates',
    'Inflation',
    'Employment',
    'GDP',
    'Commodities',
    'Geopolitics',
    'Government',
  ];

  // Alpha Vantage topic -> our display category (best-effort mapping).
  const AV_TOPIC_CATEGORY: Record<string, string> = {
    financial_markets: 'Market Analysis',
    economy_monetary: 'Central Banks',
    economy_fiscal: 'Government',
    economy_macro: 'GDP',
    energy_transportation: 'Commodities',
    technology: 'Market Analysis',
    mergers_and_acquisitions: 'Market Analysis',
    retail_wholesale: 'Market Analysis',
  };

  const FX_NEWS_TOPICS = 'financial_markets,economy_monetary,economy_macro,economy_fiscal';

  const CURRENCY_NAMES: Record<string, string> = {
    USD: 'U.S. Dollar',
    EUR: 'Euro',
    GBP: 'British Pound',
    JPY: 'Japanese Yen',
    AUD: 'Australian Dollar',
    CAD: 'Canadian Dollar',
    CHF: 'Swiss Franc',
    NZD: 'New Zealand Dollar',
    CNY: 'Chinese Yuan',
  };

  const MAJOR_PAIRS = [
    'EUR/USD', 'USD/JPY', 'GBP/USD', 'USD/CHF', 'AUD/USD', 'USD/CAD', 'NZD/USD',
    'EUR/GBP', 'EUR/JPY', 'GBP/JPY', 'EUR/CHF', 'EUR/AUD', 'AUD/JPY', 'USD/CNY', 'USD/CNH',
  ];

  function mapTopicToCategory(topics: string[]): string {
    for (const t of topics) {
      const mapped = AV_TOPIC_CATEGORY[t.toLowerCase()];
      if (mapped) return mapped;
    }
    return 'Market Analysis';
  }

  function deriveSentimentLabel(score: number | null): string {
    if (score === null) return 'Neutral';
    if (score >= 0.35) return 'Bullish';
    if (score <= -0.35) return 'Bearish';
    if (score > 0.1) return 'Somewhat Bullish';
    if (score < -0.1) return 'Somewhat Bearish';
    return 'Neutral';
  }

  function detectCurrenciesAndPairs(text: string, tickers: string[]): { currencies: string[]; pairs: string[] } {
    const currencies = new Set<string>();
    const pairs = new Set<string>();
    const upper = ` ${text.toUpperCase()} `;

    for (const pair of MAJOR_PAIRS) {
      if (upper.includes(pair)) {
        pairs.add(pair);
        const [a, b] = pair.split('/');
        if (CURRENCY_NAMES[a]) currencies.add(a);
        if (CURRENCY_NAMES[b]) currencies.add(b);
      }
    }

    for (const code of Object.keys(CURRENCY_NAMES)) {
      if (new RegExp(`\\b${code}\\b`).test(upper)) currencies.add(code);
    }

    // Forex-style tickers from the API (e.g. FOREX:EURUSD or EURUSD)
    for (const tk of tickers || []) {
      const clean = tk.replace(/^FOREX:+/i, '').replace(/[^A-Za-z/]/g, '');
      const m = /^([A-Z]{3})\/?([A-Z]{3})$/.exec(clean);
      if (m) {
        if (CURRENCY_NAMES[m[1]] && CURRENCY_NAMES[m[2]]) {
          pairs.add(`${m[1]}/${m[2]}`);
          currencies.add(m[1]);
          currencies.add(m[2]);
        } else if (CURRENCY_NAMES[m[1]]) {
          currencies.add(m[1]);
        }
      }
    }

    return {
      currencies: Array.from(currencies),
      pairs: Array.from(pairs),
    };
  }

  function normalizeNewsArticle(item: any) {
    const title = (item?.title || '').trim();
    if (!title) return null;

    const timePublished = (item?.time_published || '').trim();
    let publishedAt = '';
    if (/^\d{8}T\d{6}$/.test(timePublished)) {
      publishedAt = `${timePublished.slice(0, 4)}-${timePublished.slice(4, 6)}-${timePublished.slice(6, 8)}T${timePublished.slice(9, 11)}:${timePublished.slice(11, 13)}:${timePublished.slice(13, 15)}Z`;
    } else {
      const d = new Date(timePublished);
      if (!isNaN(d.getTime())) publishedAt = d.toISOString();
    }

    const topics = Array.isArray(item?.topics) ? item.topics.map((t: any) => (t?.topic || '')).filter(Boolean) : [];
    const category = mapTopicToCategory(topics);

    const sentimentScore = typeof item?.overall_sentiment_score === 'number' ? item.overall_sentiment_score : null;
    const sentimentLabel = item?.overall_sentiment_label || deriveSentimentLabel(sentimentScore);

    const tickers = Array.isArray(item?.ticker_sentiment)
      ? item.ticker_sentiment.map((t: any) => (t?.ticker || '')).filter(Boolean)
      : [];

    const { currencies, pairs } = detectCurrenciesAndPairs(`${title} ${item?.summary || ''}`, tickers);

    return {
      id: item?.url || title,
      title,
      summary: (item?.summary || '').trim(),
      url: item?.url || '#',
      source: item?.source || 'Unknown',
      publishedAt,
      category,
      currencies,
      pairs,
      sentiment: { score: sentimentScore, label: sentimentLabel },
    };
  }

  app.get('/api/fx-news', async (req, res) => {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY?.trim();
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || '25'), 10) || 25, 1), 50);

    if (!apiKey) {
      return res.status(503).json({
        error: 'FX news is not configured. Add ALPHA_VANTAGE_API_KEY to your environment.',
        code: 'NOT_CONFIGURED',
      });
    }

    const cacheKey = `fx-news:${limit}`;
    try {
      let articles = getCached<any[]>(cacheKey);
      if (!articles) {
        const url = `${ALPHA_VANTAGE_BASE}/query?function=NEWS_SENTIMENT&topics=${FX_NEWS_TOPICS}&limit=${limit}&sort=LATEST&apikey=${encodeURIComponent(apiKey)}`;
        const data = await fetchJson(url);
        // Alpha Vantage returns HTTP 200 with a "Note"/"Information" key when rate-limited.
        if (data?.Note || data?.Information || data?.Error) {
          console.warn('[GET /api/fx-news] Provider rate limit or info message:', data?.Note || data?.Information || data?.Error);
          return res.status(429).json({
            error: 'The news provider rate limit has been reached. Please try again later.',
            code: 'RATE_LIMITED',
          });
        }
        const feed = Array.isArray(data?.feed) ? data.feed : [];
        articles = feed.map(normalizeNewsArticle).filter(Boolean);
        setCached(cacheKey, articles, 15 * 60 * 1000);
      }

      let filtered = articles;
      const topic = typeof req.query.topic === 'string' ? req.query.topic : '';
      const currency = typeof req.query.currency === 'string' ? req.query.currency.toUpperCase() : '';
      if (topic) filtered = filtered.filter(a => a.category === topic);
      if (currency) filtered = filtered.filter(a => a.currencies.includes(currency));

      res.setHeader('Cache-Control', 'public, max-age=300');
      res.json({
        articles: filtered,
        categories: NEWS_CATEGORY_ORDER,
        source: 'Alpha Vantage News & Sentiment',
        generatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[GET /api/fx-news] error:', err?.message || err);
      res.status(502).json({
        error: 'Unable to fetch FX news right now. Please try again shortly.',
        code: 'UPSTREAM_ERROR',
      });
    }
  });

  // ---- Economic Calendar (modular provider architecture) ----

  interface EconomicEvent {
    id: string;
    date: string; // ISO 8601 UTC
    currency: string;
    country: string;
    event: string;
    impact: 'high' | 'medium' | 'low' | 'none';
    actual: string | null;
    forecast: string | null;
    previous: string | null;
  }

  interface EconomicCalendarProvider {
    name: string;
    /** Message shown when the provider's API key is missing from the environment. */
    notConfiguredMessage: string;
    configured(): boolean;
    fetchEvents(from: string, to: string): Promise<EconomicEvent[]>;
  }

  const COUNTRY_TO_CURRENCY: Record<string, string> = {
    US: 'USD', EU: 'EUR', EMU: 'EUR', DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR',
    GB: 'GBP', UK: 'GBP', JP: 'JPY', AU: 'AUD', CA: 'CAD', CH: 'CHF', NZ: 'NZD',
    CN: 'CNY', HK: 'HKD', KR: 'KRW', SG: 'SGD', IN: 'INR', BR: 'BRL', MX: 'MXN',
    ZA: 'ZAR', TR: 'TRY', RU: 'RUB', ID: 'IDR', TH: 'THB', MY: 'MYR', PH: 'PHP',
    SE: 'SEK', NO: 'NOK', DK: 'DKK', PL: 'PLN', CZ: 'CZK', HU: 'HUF', RO: 'RON',
    GR: 'EUR', PT: 'EUR', NL: 'EUR', BE: 'EUR', AT: 'EUR', FI: 'EUR', IE: 'EUR',
  };

  function normalizeImpact(value: unknown): EconomicEvent['impact'] {
    const s = String(value || '').toLowerCase();
    if (s.startsWith('high')) return 'high';
    if (s.startsWith('med')) return 'medium';
    if (s.startsWith('low')) return 'low';
    return 'none';
  }

  function toIsoUtc(dateStr: string): string {
    if (!dateStr) return '';
    const trimmed = dateStr.trim();
    const asIso = trimmed.replace(' ', 'T');
    const d = new Date(asIso.endsWith('Z') ? asIso : `${asIso}Z`);
    if (!isNaN(d.getTime())) return d.toISOString();
    const d2 = new Date(trimmed);
    if (!isNaN(d2.getTime())) return d2.toISOString();
    return '';
  }

  // Financial Modeling Prep provider.
  // The legacy /api/v3/economic_calendar endpoint was retired by FMP (2025-08-31);
  // the current route is /stable/economic-calendar and requires a paid FMP plan.
  class ProviderAccessError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
    }
  }

  const economicCalendarProviders: Record<string, EconomicCalendarProvider> = {
    // Xoomar Economic Calendar — genuinely free, no API key required (30 req/min/IP).
    // US macro releases synced weekly from BLS, the Fed, and BEA (CPI, NFP, FOMC, GDP).
    // Docs: https://xoomar.com/markets/api/calendar
    xoomar: {
      name: 'Xoomar Economic Calendar (BLS/Fed/BEA)',
      notConfiguredMessage: 'Economic calendar is not configured.',
      configured: () => true,
      async fetchEvents(from, to) {
        const url = `${XOOMAR_BASE}/api/markets/calendar?from=${from}&to=${to}`;
        const data = await fetchJson(url);
        const rows = Array.isArray(data?.data) ? data.data : [];
        const fromMs = new Date(`${from}T00:00:00.000Z`).getTime();
        const toMs = new Date(`${to}T23:59:59.999Z`).getTime();
        const events: EconomicEvent[] = [];
        for (const row of rows) {
          const eventName = (row?.eventName || '').toString().trim();
          if (!eventName) continue;
          const date = toIsoUtc((row?.scheduledAt || '').toString());
          if (!date) continue;
          const eventMs = new Date(date).getTime();
          if (eventMs < fromMs || eventMs > toMs) continue;
          const numOrDash = (v: unknown) => (v === null || v === undefined || v === '' ? null : String(v).trim());
          events.push({
            id: `${date}:USD:${eventName}`,
            date,
            currency: 'USD',
            country: 'US',
            event: eventName,
            impact: normalizeImpact(row?.importance),
            actual: numOrDash(row?.actual),
            forecast: numOrDash(row?.forecast),
            previous: numOrDash(row?.previous),
          });
        }
        return events;
      },
    },
    // Finnhub Economic Calendar — free tier (60 calls/min) includes this endpoint.
    // Docs: https://finnhub.io/docs/api/economic-calendar
    finnhub: {
      name: 'Finnhub Economic Calendar',
      notConfiguredMessage: 'Economic calendar is not configured. Add FINNHUB_API_KEY to your environment.',
      configured: () => Boolean(process.env.FINNHUB_API_KEY?.trim()),
      async fetchEvents(from, to) {
        const apiKey = process.env.FINNHUB_API_KEY?.trim();
        if (!apiKey) throw new Error('FINNHUB_API_KEY is not configured');
        const url = `${FINNHUB_BASE}/api/v1/calendar/economic?from=${from}&to=${to}&token=${encodeURIComponent(apiKey)}`;
        let data: any;
        try {
          data = await fetchJson(url);
        } catch (err: any) {
          if (err?.status === 401 || err?.status === 403) {
            throw new ProviderAccessError('Your Finnhub API key is invalid or has no access to the Economic Calendar.', 'RESTRICTED');
          }
          if (err?.status === 429) {
            throw new ProviderAccessError('Finnhub rate limit reached. Please try again shortly.', 'RATE_LIMITED');
          }
          throw err;
        }
        const rows = Array.isArray(data?.economicCalendar) ? data.economicCalendar : [];
        const fromMs = new Date(`${from}T00:00:00.000Z`).getTime();
        const toMs = new Date(`${to}T23:59:59.999Z`).getTime();
        const events: EconomicEvent[] = [];
        for (const row of rows) {
          const eventName = (row?.event || '').toString().trim();
          if (!eventName) continue;
          const country = (row?.country || '').toString().toUpperCase().trim();
          const date = toIsoUtc((row?.time || '').toString());
          if (!date) continue;
          const eventMs = new Date(date).getTime();
          if (eventMs < fromMs || eventMs > toMs) continue;
          const currency = COUNTRY_TO_CURRENCY[country] || country || '--';
          const numOrDash = (v: unknown) => (v === null || v === undefined || v === '' ? null : String(v).trim());
          events.push({
            id: `${date}:${currency}:${eventName}`,
            date,
            currency,
            country,
            event: eventName,
            impact: normalizeImpact(row?.impact),
            actual: numOrDash(row?.actual),
            forecast: numOrDash(row?.estimate),
            previous: numOrDash(row?.prev),
          });
        }
        return events;
      },
    },
    fmp: {
      name: 'Financial Modeling Prep Economic Calendar',
      notConfiguredMessage: 'Economic calendar is not configured. Add FMP_API_KEY to your environment.',
      configured: () => Boolean(process.env.FMP_API_KEY?.trim()),
      async fetchEvents(from, to) {
        const apiKey = process.env.FMP_API_KEY?.trim();
        if (!apiKey) throw new Error('FMP_API_KEY is not configured');
        const url = `${FMP_BASE}/stable/economic-calendar?from=${from}&to=${to}&apikey=${encodeURIComponent(apiKey)}`;
        let data: any;
        try {
          data = await fetchJson(url);
        } catch (err: any) {
          if (err?.status === 402) {
            throw new ProviderAccessError(
              'Your Financial Modeling Prep plan does not include the Economic Calendar. Upgrade your FMP plan or switch providers.',
              'RESTRICTED'
            );
          }
          if (err?.status === 403) {
            throw new ProviderAccessError(
              'Your Financial Modeling Prep API key does not have access to the Economic Calendar.',
              'RESTRICTED'
            );
          }
          throw err;
        }
        const rows = Array.isArray(data) ? data : [];
        const fromMs = new Date(`${from}T00:00:00.000Z`).getTime();
        const toMs = new Date(`${to}T23:59:59.999Z`).getTime();
        const events: EconomicEvent[] = [];
        for (const row of rows) {
          const eventName = (row?.event || '').toString().trim();
          if (!eventName) continue;
          const country = (row?.country || '').toString().toUpperCase().trim();
          const date = toIsoUtc((row?.date || '').toString());
          if (!date) continue;
          const eventMs = new Date(date).getTime();
          if (eventMs < fromMs || eventMs > toMs) continue;
          const currencyRaw = (row?.currency || '').toString().toUpperCase().trim();
          const numOrDash = (v: unknown) => (v === null || v === undefined || v === '' ? null : String(v).trim());
          events.push({
            id: `${date}:${currencyRaw || country}:${eventName}`,
            date,
            currency: currencyRaw || COUNTRY_TO_CURRENCY[country] || country || '--',
            country,
            event: eventName,
            impact: normalizeImpact(row?.impact),
            actual: numOrDash(row?.actual),
            forecast: numOrDash(row?.estimate),
            previous: numOrDash(row?.previous),
          });
        }
        return events;
      },
    },
  };

  app.get('/api/economic-calendar', async (req, res) => {
    const providerName = (process.env.ECONOMIC_CALENDAR_PROVIDER || 'xoomar').toLowerCase();
    const provider = economicCalendarProviders[providerName];
    if (!provider) {
      return res.status(500).json({ error: `Unknown economic calendar provider: ${providerName}` });
    }
    if (!provider.configured()) {
      return res.status(503).json({
        error: provider.notConfiguredMessage,
        code: 'NOT_CONFIGURED',
      });
    }

    const fmtDate = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const today = new Date();
    const fromRaw = req.query.from;
    const toRaw = req.query.to;
    const from = typeof fromRaw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fromRaw) ? fromRaw : fmtDate(today);
    const to = typeof toRaw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(toRaw) ? toRaw : fmtDate(new Date(today.getTime() + 21 * 86400000));

    const cacheKey = `economic-calendar:${providerName}:${from}:${to}`;
    try {
      let events = getCached<EconomicEvent[]>(cacheKey);
      if (!events) {
        events = await provider.fetchEvents(from, to);
        setCached(cacheKey, events, 10 * 60 * 1000);
      }

      const impact = typeof req.query.impact === 'string' ? req.query.impact.toLowerCase() : '';
      const currency = typeof req.query.currency === 'string' ? req.query.currency.toUpperCase() : '';
      let filtered = events;
      if (['high', 'medium', 'low'].includes(impact)) {
        filtered = filtered.filter(e => e.impact === impact);
      }
      if (currency) filtered = filtered.filter(e => e.currency === currency);

      res.setHeader('Cache-Control', 'public, max-age=300');
      res.json({
        events: filtered,
        provider: provider.name,
        from,
        to,
        timezone: 'UTC',
        generatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      if (err?.code === 'RESTRICTED') {
        console.error('[GET /api/economic-calendar] restricted:', err?.message || err);
        return res.status(403).json({
          error: err?.message || 'Your economic calendar provider is not accessible with the current plan.',
          code: 'RESTRICTED',
        });
      }
      if (err?.code === 'RATE_LIMITED') {
        console.error('[GET /api/economic-calendar] rate limited:', err?.message || err);
        return res.status(429).json({
          error: err?.message || 'Economic calendar provider rate limit reached. Please try again later.',
          code: 'RATE_LIMITED',
        });
      }
      console.error('[GET /api/economic-calendar] error:', err?.message || err);
      res.status(502).json({
        error: 'Economic calendar data is temporarily unavailable.',
        code: 'UPSTREAM_ERROR',
      });
    }
  });

  // ==========================================
  // CHART OHLC DATA PROXY (Yahoo Finance)
  // No API key required. Server-side to avoid CORS.
  // ==========================================

  // Symbol translation table: internal symbol → Yahoo Finance ticker
  const YAHOO_SYMBOL_MAP: Record<string, string> = {
    // Metals
    XAUUSD: 'GC=F', GOLD: 'GC=F',
    XAGUSD: 'SI=F', SILVER: 'SI=F',
    XPTUSD: 'PL=F', XPDUSD: 'PA=F',
    // Forex pairs
    EURUSD: 'EURUSD=X', GBPUSD: 'GBPUSD=X', USDJPY: 'USDJPY=X',
    USDCHF: 'USDCHF=X', USDCAD: 'USDCAD=X', AUDUSD: 'AUDUSD=X',
    NZDUSD: 'NZDUSD=X', EURGBP: 'EURGBP=X', EURJPY: 'EURJPY=X',
    EURAUD: 'EURAUD=X', EURCAD: 'EURCAD=X', EURCHF: 'EURCHF=X',
    EURNZD: 'EURNZD=X', GBPJPY: 'GBPJPY=X', GBPAUD: 'GBPAUD=X',
    GBPCAD: 'GBPCAD=X', GBPCHF: 'GBPCHF=X', GBPNZD: 'GBPNZD=X',
    AUDJPY: 'AUDJPY=X', AUDCAD: 'AUDCAD=X', AUDCHF: 'AUDCHF=X',
    AUDNZD: 'AUDNZD=X', NZDJPY: 'NZDJPY=X', NZDCAD: 'NZDCAD=X',
    NZDCHF: 'NZDCHF=X', CADJPY: 'CADJPY=X', CADCHF: 'CADCHF=X',
    CHFJPY: 'CHFJPY=X',
    // Crypto
    BTCUSD: 'BTC-USD', ETHUSD: 'ETH-USD', LTCUSD: 'LTC-USD', XRPUSD: 'XRP-USD',
    // Indices
    US30: '^DJI', US500: '^GSPC', NAS100: '^NDX',
    UK100: '^FTSE', GER40: '^GDAXI', JPN225: '^N225',
    // Oil
    USOIL: 'CL=F', UKOIL: 'BZ=F',
  };

  // Interval/range mapping: timeframe param → { interval, range } for Yahoo Finance v8 API
  const YAHOO_INTERVAL_MAP: Record<string, { interval: string; range: string }> = {
    '1m':  { interval: '1m',  range: '5d'  },
    '5m':  { interval: '5m',  range: '10d' },
    '15m': { interval: '15m', range: '20d' },
    '30m': { interval: '30m', range: '30d' },
    '1h':  { interval: '60m', range: '60d' },
    '4h':  { interval: '60m', range: '180d' }, // Yahoo doesn't have 4h, we use 1h for 6mo and resample client-side
    '1d':  { interval: '1d',  range: '2y'  },
  };

  app.get('/api/chart/ohlc', async (req, res) => {
    try {
      const rawSymbol = ((req.query.symbol as string) || 'XAUUSD').toUpperCase().trim();
      const timeframe = ((req.query.timeframe as string) || '1d').toLowerCase().trim();

      // Translate to Yahoo Finance ticker
      const yahooSymbol = YAHOO_SYMBOL_MAP[rawSymbol] || (rawSymbol.endsWith('=X') ? rawSymbol : `${rawSymbol}=X`);
      const mapping = YAHOO_INTERVAL_MAP[timeframe] || YAHOO_INTERVAL_MAP['1d'];

      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=${mapping.interval}&range=${mapping.range}&includePrePost=false`;

      const yahooRes = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; FXJournalPro/1.0)',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!yahooRes.ok) {
        console.warn(`[chart/ohlc] Yahoo Finance returned ${yahooRes.status} for ${yahooSymbol}`);
        return res.json({ candles: [], symbol: rawSymbol, timeframe, error: 'No data available for this symbol.' });
      }

      const data: any = await yahooRes.json();
      const result = data?.chart?.result?.[0];

      if (!result) {
        return res.json({ candles: [], symbol: rawSymbol, timeframe, error: 'No chart data from provider.' });
      }

      const timestamps: number[] = result.timestamp || [];
      const quotes = result.indicators?.quote?.[0] || {};
      const opens: (number | null)[] = quotes.open || [];
      const highs: (number | null)[] = quotes.high || [];
      const lows: (number | null)[] = quotes.low || [];
      const closes: (number | null)[] = quotes.close || [];

      // For 4h timeframe, we receive 1h candles from Yahoo — aggregate every 4 into one
      let candles: { time: number; open: number; high: number; low: number; close: number }[] = [];

      if (timeframe === '4h') {
        // Aggregate 1h bars → 4h bars
        let i = 0;
        while (i < timestamps.length) {
          const group = [];
          for (let j = 0; j < 4 && i + j < timestamps.length; j++) {
            const idx = i + j;
            if (opens[idx] != null && highs[idx] != null && lows[idx] != null && closes[idx] != null) {
              group.push({ t: timestamps[idx], o: opens[idx]!, h: highs[idx]!, l: lows[idx]!, c: closes[idx]! });
            }
          }
          if (group.length > 0) {
            candles.push({
              time: group[0].t,
              open: group[0].o,
              high: Math.max(...group.map(g => g.h)),
              low: Math.min(...group.map(g => g.l)),
              close: group[group.length - 1].c,
            });
          }
          i += 4;
        }
      } else {
        candles = timestamps
          .map((t, i) => ({
            time: t,
            open: opens[i] ?? 0,
            high: highs[i] ?? 0,
            low: lows[i] ?? 0,
            close: closes[i] ?? 0,
          }))
          .filter(c => c.open > 0 && c.high > 0 && c.low > 0 && c.close > 0);
      }

      // Deduplicate by timestamp and sort ascending
      const seen = new Set<number>();
      candles = candles
        .filter(c => { if (seen.has(c.time)) return false; seen.add(c.time); return true; })
        .sort((a, b) => a.time - b.time);

      res.json({ candles, symbol: rawSymbol, timeframe });
    } catch (err: any) {
      console.error('[chart/ohlc] Error:', err?.message || err);
      res.json({ candles: [], symbol: req.query.symbol || '', timeframe: req.query.timeframe || '1d', error: 'Chart data temporarily unavailable.' });
    }
  });

// ==========================================
// BACKTEST SESSIONS API
// ==========================================

app.get('/api/backtest/sessions', async (req, res) => {
  const userId = req.headers['x-auth-user-id'] as string;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    if (useSupabase) {
      const { data, error } = await supabase
        .from('backtest_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });
      if (error) {
        // If table doesn't exist yet, just return empty array
        if (error.code === '42P01') return res.json([]);
        throw error;
      }
      return res.json(data || []);
    } else {
      const db = loadDatabaseFromFile();
      const userSessions = (db.backtestSessions || []).filter((s: any) => s.user_id === userId);
      return res.json(userSessions);
    }
  } catch (err: any) {
    console.error('[Backtest] GET /sessions Error:', err);
    res.status(500).json({ error: 'Failed to load sessions' });
  }
});

app.post('/api/backtest/sessions', async (req, res) => {
  const userId = req.headers['x-auth-user-id'] as string;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const session = req.body;
  session.user_id = userId;
  if (!session.id) session.id = 'bt_' + Date.now();
  session.created_at = new Date().toISOString();
  session.updated_at = new Date().toISOString();

  try {
    if (useSupabase) {
      const { data, error } = await supabase
        .from('backtest_sessions')
        .insert([session])
        .select()
        .single();
      if (error) throw error;
      return res.json(data);
    } else {
      const db = loadDatabaseFromFile();
      if (!db.backtestSessions) db.backtestSessions = [];
      db.backtestSessions.push(session);
      saveDatabase(db);
      return res.json(session);
    }
  } catch (err: any) {
    console.error('[Backtest] POST /sessions Error:', err);
    res.status(500).json({ error: 'Failed to save session' });
  }
});

app.get('/api/backtest/sessions/:id', async (req, res) => {
  const userId = req.headers['x-auth-user-id'] as string;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const { id } = req.params;

  try {
    if (useSupabase) {
      const { data, error } = await supabase
        .from('backtest_sessions')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();
      if (error) throw error;
      return res.json(data);
    } else {
      const db = loadDatabaseFromFile();
      const session = (db.backtestSessions || []).find((s: any) => s.id === id && s.user_id === userId);
      if (!session) return res.status(404).json({ error: 'Session not found' });
      return res.json(session);
    }
  } catch (err: any) {
    console.error('[Backtest] GET /sessions/:id Error:', err);
    res.status(500).json({ error: 'Failed to load session' });
  }
});

app.put('/api/backtest/sessions/:id', async (req, res) => {
  const userId = req.headers['x-auth-user-id'] as string;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const { id } = req.params;
  const updates = req.body;
  updates.updated_at = new Date().toISOString();
  // Ensure user cannot change user_id
  delete updates.user_id;

  try {
    if (useSupabase) {
      const { data, error } = await supabase
        .from('backtest_sessions')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) throw error;
      return res.json(data);
    } else {
      const db = loadDatabaseFromFile();
      const index = (db.backtestSessions || []).findIndex((s: any) => s.id === id && s.user_id === userId);
      if (index === -1) return res.status(404).json({ error: 'Session not found' });
      db.backtestSessions[index] = { ...db.backtestSessions[index], ...updates };
      saveDatabase(db);
      return res.json(db.backtestSessions[index]);
    }
  } catch (err: any) {
    console.error('[Backtest] PUT /sessions/:id Error:', err);
    res.status(500).json({ error: 'Failed to update session' });
  }
});

app.delete('/api/backtest/sessions/:id', async (req, res) => {
  const userId = req.headers['x-auth-user-id'] as string;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const { id } = req.params;

  try {
    if (useSupabase) {
      const { error } = await supabase
        .from('backtest_sessions')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
      return res.json({ success: true });
    } else {
      const db = loadDatabaseFromFile();
      if (!db.backtestSessions) db.backtestSessions = [];
      const lenBefore = db.backtestSessions.length;
      db.backtestSessions = db.backtestSessions.filter((s: any) => !(s.id === id && s.user_id === userId));
      if (db.backtestSessions.length === lenBefore) return res.status(404).json({ error: 'Session not found' });
      saveDatabase(db);
      return res.json({ success: true });
    }
  } catch (err: any) {
    console.error('[Backtest] DELETE /sessions/:id Error:', err);
    res.status(500).json({ error: 'Failed to delete session' });
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
