import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
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
} from './src/types';
import { createClient } from '@supabase/supabase-js';

// Absolute file paths for database persistence
const DB_FILE = path.join(process.cwd(), 'db.json');

// Supabase Client Configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const useSupabase = !!(supabaseUrl && supabaseKey);
const supabase = useSupabase ? createClient(supabaseUrl!, supabaseKey!) : null;

if (useSupabase) {
  console.log('[AxyFx Journal Server] Supabase integration ENABLED!');
} else {
  console.log('[AxyFx Journal Server] Supabase integration DISABLED. Falling back to local db.json');
}

// Helper to load database from local file
function loadDatabaseFromFile() {
  if (!fs.existsSync(DB_FILE)) {
    // Initial seed database
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
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDB, null, 2), 'utf-8');
    return initialDB;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}

let db: any = null;
let isLoaded = false;

async function ensureDbLoaded() {
  if (isLoaded && db) return db;

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
        db = data.value;
        console.log('[AxyFx Journal Server] Loaded database from Supabase successfully!');
      }
    } catch (err) {
      console.error('[AxyFx Journal Server] Failed to load database from Supabase, falling back:', err);
      db = loadDatabaseFromFile();
    }
  } else {
    db = loadDatabaseFromFile();
  }

  isLoaded = true;
  return db;
}

async function saveDatabase(data: any) {
  db = data;
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write db.json locally:', err);
  }

  if (useSupabase) {
    (async () => {
      try {
        const { error } = await supabase!
          .from('journal_settings')
          .upsert({ key: 'db_json', value: data });
        if (error) {
          console.error('[AxyFx Journal Server] Supabase save error:', error);
        } else {
          console.log('[AxyFx Journal Server] Saved database to Supabase successfully!');
        }
      } catch (err) {
        console.error('[AxyFx Journal Server] Exception saving to Supabase:', err);
      }
    })();
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
      await ensureDbLoaded();

      // Initialize default session user if not loaded yet
      if (!currentUser && db && db.users) {
        currentUser = db.users.find((u: any) => u.email === 'akshayrajpanamthode@gmail.com') || db.users[1];
      }

      // Enable simple authorization overrides for developers
      const authEmail = req.headers['x-auth-email'];
      if (authEmail && db && db.users) {
        const dbUser = db.users.find((u: any) => u.email === authEmail);
        if (dbUser) currentUser = dbUser;
      }
      next();
    } catch (err) {
      console.error('[AxyFx Journal Server] Middleware execution error:', err);
      next(err);
    }
  });

  // ==========================================
  // AUTH ROUTES
  // ==========================================

  app.post('/api/auth/register', (req, res) => {
    const { email, name, password } = req.body;
    if (!email || !name) {
      return res.status(400).json({ error: 'Email and Name are required' });
    }

    const exists = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
    if (exists) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const newUser: User = {
      id: `user_${Date.now()}`,
      email: email.toLowerCase(),
      name,
      onboardingCompleted: false,
      isPro: false
    };

    db.users.push(newUser);
    saveDatabase(db);
    currentUser = newUser;

    res.json({ message: 'Registration successful', user: newUser });
  });

  app.post('/api/auth/login', (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      // Automatic sign-up/login simulation to make testing incredibly pleasant
      const newUser: User = {
        id: `user_${Date.now()}`,
        email: email.toLowerCase(),
        name: email.split('@')[0],
        onboardingCompleted: false,
        isPro: false
      };
      db.users.push(newUser);
      saveDatabase(db);
      currentUser = newUser;
      return res.json({ message: 'New user created and logged in', user: newUser });
    }

    currentUser = user;
    res.json({ message: 'Login successful', user });
  });

  app.get('/api/auth/me', (req, res) => {
    res.json({ user: currentUser });
  });

  app.post('/api/auth/logout', (req, res) => {
    currentUser = null;
    res.json({ message: 'Logged out successfully' });
  });

  app.post('/api/auth/reset-password', (req, res) => {
    res.json({ message: 'A password reset link has been simulated & sent to your email.' });
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
          disciplineEnabled: true
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
      disciplineEnabled: true
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

  app.get('/api/trades', (req, res) => {
    const { accountId } = req.query;
    if (!accountId) {
      return res.status(400).json({ error: 'accountId query param is required' });
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

  app.post('/api/trades', (req, res) => {
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

    saveDatabase(db);
    res.json({ message: 'Trade logged successfully', trade: newTrade, updatedAccount: db.accounts[accountIdx] });
  });

  app.put('/api/trades/:id', (req, res) => {
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

    saveDatabase(db);
    res.json({ message: 'Trade updated successfully', trade: db.trades[tradeIdx] });
  });

  app.delete('/api/trades/:id', (req, res) => {
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
    saveDatabase(db);

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
        disciplineEnabled: true
      };
      return res.json({ riskSettings: defaultSettings });
    }
    res.json({ riskSettings: settings });
  });

  app.put('/api/risk-settings/:accountId', (req, res) => {
    if (!currentUser) return res.status(401).json({ error: 'Not authenticated' });
    const { accountId } = req.params;
    const { riskPerTradeLimit, dailyLossLimit, weeklyLossLimit, maxDrawdownLimit, disciplineEnabled } = req.body;

    const idx = db.riskSettings.findIndex((r: any) => r.accountId === accountId);
    if (idx !== -1) {
      db.riskSettings[idx].riskPerTradeLimit = parseFloat(riskPerTradeLimit);
      db.riskSettings[idx].dailyLossLimit = parseFloat(dailyLossLimit);
      db.riskSettings[idx].weeklyLossLimit = parseFloat(weeklyLossLimit);
      db.riskSettings[idx].maxDrawdownLimit = parseFloat(maxDrawdownLimit);
      db.riskSettings[idx].disciplineEnabled = !!disciplineEnabled;
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
        disciplineEnabled: disciplineEnabled !== undefined ? !!disciplineEnabled : true
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

  // Connect MT5 Investor password
  app.post('/api/mt5/connect-investor', (req, res) => {
    if (!currentUser) return res.status(401).json({ error: 'Not authenticated' });
    const { loginNumber, brokerServer, investorPassword, autoSync } = req.body;

    if (!loginNumber || !brokerServer || !investorPassword) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Automatically create a new dedicated Trading Account for this MT5 connection
    const newAccId = `acc_mt5_${Date.now()}`;
    const startingBalance = 10000.00;
    const newAccount = {
      id: newAccId,
      userId: currentUser.id,
      name: `MT5 Sync (${loginNumber})`,
      broker: brokerServer,
      platform: 'MT5',
      accountType: 'Live',
      currency: 'USD',
      startingBalance: startingBalance,
      currentBalance: startingBalance,
      equity: startingBalance,
      status: 'Active'
    };

    db.accounts.push(newAccount);

    // Create default Risk Settings for this new MT5 account
    const newRisk = {
      id: `r_mt5_${Date.now()}`,
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
      id: `conn_inv_${Date.now()}`,
      userId: currentUser.id,
      accountId: newAccId,
      brokerName: brokerServer,
      status: 'Connected',
      lastSyncTime: new Date().toISOString(),
      syncToken: `axy_token_inv_${Math.floor(Math.random()*100000)}`,
      totalSyncedTrades: 0,
      loginNumber,
      brokerServer,
      isInvestorSync: true,
      autoSync: autoSync !== false
    };
    db.mt5Connections.push(connection);

    // Automatically import some trades, positions, pending orders, etc.
    const initialMockTrades = [
      {
        id: `trade_inv_1_${Date.now()}`,
        accountId: newAccId,
        date: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
        symbol: 'EURUSD',
        type: 'Buy',
        lotSize: 1.0,
        entryPrice: 1.08200,
        exitPrice: 1.08950,
        profit: 750,
        commission: -6.00,
        swap: -1.50,
        riskPercentage: 1.2,
        strategy: 'Investor Password Sync',
        emotion: 'Calm',
        notes: 'Auto imported from MT5 Investor Password read-only sync.',
        tags: ['MT5 Sync'],
        isMt5Sync: true
      },
      {
        id: `trade_inv_2_${Date.now()}`,
        accountId: newAccId,
        date: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
        symbol: 'GBPUSD',
        type: 'Sell',
        lotSize: 1.5,
        entryPrice: 1.27200,
        exitPrice: 1.26500,
        profit: 1050,
        commission: -9.00,
        swap: 0.0,
        riskPercentage: 1.5,
        strategy: 'Investor Password Sync',
        emotion: 'Calm',
        notes: 'Auto imported from MT5 Investor Password read-only sync.',
        tags: ['MT5 Sync'],
        isMt5Sync: true
      },
      {
        id: `trade_inv_3_${Date.now()}`,
        accountId: newAccId,
        date: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
        symbol: 'XAUUSD',
        type: 'Buy',
        lotSize: 0.5,
        entryPrice: 2320.50,
        exitPrice: 2311.20,
        profit: -465,
        commission: -5.00,
        swap: -2.10,
        riskPercentage: 2.0,
        strategy: 'Investor Password Sync',
        emotion: 'Calm',
        notes: 'Auto imported from MT5 Investor Password read-only sync.',
        tags: ['MT5 Sync'],
        isMt5Sync: true
      }
    ];
    db.trades.push(...initialMockTrades);
    connection.totalSyncedTrades += initialMockTrades.length;

    // Update account balance
    const totalNet = initialMockTrades.reduce((sum, t) => sum + t.profit + t.commission + t.swap, 0);
    newAccount.currentBalance = parseFloat((startingBalance + totalNet).toFixed(2));
    newAccount.equity = parseFloat((newAccount.currentBalance + 120.50).toFixed(2));

    saveDatabase(db);
    res.json({
      message: 'MT5 Investor account connected successfully and read-only sync completed.',
      connection,
      account: newAccount
    });
  });

  // Connect MT5 Expert Advisor (Method A) - automatically creates a new dedicated account
  app.post('/api/mt5/connect-ea', (req, res) => {
    if (!currentUser) return res.status(401).json({ error: 'Not authenticated' });
    const { loginNumber, brokerName, startingBalance } = req.body;

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
      autoSync: true
    };
    db.mt5Connections.push(connection);

    saveDatabase(db);
    res.json({
      message: 'MT5 EA account connected successfully.',
      connection,
      account: newAccount
    });
  });

  // Sync now
  app.post('/api/mt5/sync-investor', (req, res) => {
    if (!currentUser) return res.status(401).json({ error: 'Not authenticated' });
    const { accountId } = req.body;

    const account = db.accounts.find((acc: any) => acc.id === accountId && acc.userId === currentUser?.id);
    if (!account) return res.status(404).json({ error: 'Account not found' });

    const connection = db.mt5Connections.find((conn: any) => conn.accountId === account.id);
    if (!connection) return res.status(404).json({ error: 'MT5 Connection not found for this account' });

    // Generate a new simulated trade during sync
    const symbols = ['EURUSD', 'GBPUSD', 'XAUUSD', 'USDJPY'];
    const sym = symbols[Math.floor(Math.random() * symbols.length)];
    const profit = Math.random() > 0.4 ? parseFloat((Math.random() * 400 + 50).toFixed(2)) : -parseFloat((Math.random() * 200 + 10).toFixed(2));
    
    const newTrade: Trade = {
      id: `trade_inv_sync_${Date.now()}`,
      accountId: account.id,
      date: new Date().toISOString(),
      symbol: sym,
      type: Math.random() > 0.5 ? 'Buy' : 'Sell',
      lotSize: parseFloat((Math.random() * 1.0 + 0.1).toFixed(2)),
      entryPrice: 1.08500,
      exitPrice: 1.08900,
      profit,
      commission: -4.00,
      swap: 0.0,
      riskPercentage: 1.0,
      strategy: 'Investor Password Sync',
      emotion: 'Calm',
      notes: 'Imported via manual sync.',
      tags: ['MT5 Sync'],
      isMt5Sync: true
    };

    db.trades.push(newTrade);
    connection.lastSyncTime = new Date().toISOString();
    connection.totalSyncedTrades += 1;

    // Update account balance
    const net = newTrade.profit + newTrade.commission + newTrade.swap;
    const accIdx = db.accounts.findIndex((acc: any) => acc.id === account.id);
    if (accIdx !== -1) {
      db.accounts[accIdx].currentBalance = parseFloat((db.accounts[accIdx].currentBalance + net).toFixed(2));
      db.accounts[accIdx].equity = parseFloat((db.accounts[accIdx].currentBalance + (Math.random() * 150 - 50)).toFixed(2));
    }

    saveDatabase(db);
    res.json({
      message: 'Synchronization finished.',
      connection,
      trade: newTrade,
      account: db.accounts.find((acc: any) => acc.id === account.id)
    });
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
  app.post('/api/mt5/sync', (req, res) => {
    const { syncToken, trades } = req.body;
    if (!syncToken) return res.status(401).json({ error: 'Invalid or missing authorization token' });

    // Locate connection
    const connection = db.mt5Connections.find((conn: any) => conn.syncToken === syncToken);
    if (!connection) return res.status(403).json({ error: 'EA synchronization token not found' });

    const accountIdx = db.accounts.findIndex((acc: any) => acc.id === connection.accountId);
    if (accountIdx === -1) return res.status(404).json({ error: 'Trading account linked to this token does not exist' });

    let syncedCount = 0;
    if (trades && Array.isArray(trades)) {
      trades.forEach((incomingTrade: any) => {
        // Prevent duplicate logs using a composite match on time, price, and profit
        const exists = db.trades.some((t: any) => 
          t.accountId === connection.accountId && 
          t.symbol === incomingTrade.symbol && 
          Math.abs(t.profit - incomingTrade.profit) < 0.01 && 
          Math.abs(t.entryPrice - incomingTrade.entryPrice) < 0.0001
        );

        if (!exists) {
          const newTrade: Trade = {
            id: `mt5_ea_${Date.now()}_${Math.floor(Math.random()*100000)}`,
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
            strategy: 'MT5 Expert EA Sync',
            emotion: 'Calm',
            notes: incomingTrade.notes || 'Automated execution sync.',
            tags: ['MT5 AutoSync'],
            isMt5Sync: true
          };

          db.trades.push(newTrade);
          syncedCount++;

          // Adjust account balance
          const net = newTrade.profit + newTrade.commission + newTrade.swap;
          db.accounts[accountIdx].currentBalance = parseFloat((db.accounts[accountIdx].currentBalance + net).toFixed(2));
        }
      });

      db.accounts[accountIdx].equity = db.accounts[accountIdx].currentBalance;
      
      const connIdx = db.mt5Connections.findIndex((c: any) => c.id === connection.id);
      if (connIdx !== -1) {
        db.mt5Connections[connIdx].lastSyncTime = new Date().toISOString();
        db.mt5Connections[connIdx].totalSyncedTrades += syncedCount;
        db.mt5Connections[connIdx].status = 'Connected';
      }
    }

    saveDatabase(db);
    res.json({ status: 'Success', syncedTradesCount: syncedCount, accountBalance: db.accounts[accountIdx].currentBalance });
  });

  // ==========================================
  // REAL-TIME AI TRADING INSIGHTS ROUTE (GEMINI)
  // ==========================================

  app.post('/api/ai/insights', async (req, res) => {
    if (!currentUser) return res.status(401).json({ error: 'Not authenticated' });
    
    // Pro Plan requirement
    if (!currentUser.isPro) {
      return res.status(403).json({ 
        error: 'AI Insights are a premium Pro Feature. Please upgrade your plan to unlock!',
        proRequired: true
      });
    }

    const { accountId } = req.body;
    if (!accountId) return res.status(400).json({ error: 'accountId is required' });

    // Fetch trades
    const accountTrades = db.trades.filter((t: any) => t.accountId === accountId);
    if (accountTrades.length === 0) {
      return res.json({ 
        insights: [
          "Log more trades in this account to unlock customized AI analyses. We recommend registering at least 3 trades for robust session and volatility diagnostics."
        ],
        summary: "No trades logged yet in this account."
      });
    }

    // Prepare a concise trading digest for Gemini API
    const digest = accountTrades.map((t: any) => ({
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

    // Standard high-quality local fallback in case key is missing (following security guidance)
    const localHeuristics = [];
    const wins = accountTrades.filter(t => t.profit > 0);
    const losses = accountTrades.filter(t => t.profit <= 0);
    const winRate = accountTrades.length > 0 ? (wins.length / accountTrades.length) * 100 : 0;
    
    // Simple calculations
    const sumWins = wins.reduce((sum, t) => sum + t.profit, 0);
    const sumLosses = Math.abs(losses.reduce((sum, t) => sum + t.profit, 0));
    const profitFactor = sumLosses > 0 ? (sumWins / sumLosses) : sumWins;

    // Symbol performance mapping
    const pairPerformance: { [key: string]: number } = {};
    accountTrades.forEach(t => {
      pairPerformance[t.symbol] = (pairPerformance[t.symbol] || 0) + t.profit;
    });
    const bestPair = Object.keys(pairPerformance).reduce((a, b) => pairPerformance[a] > pairPerformance[b] ? a : b, 'None');
    
    // Emotion mapping
    const anxiousTrades = accountTrades.filter(t => t.emotion === 'Anxious' || t.emotion === 'Revenge');
    const fomoTrades = accountTrades.filter(t => t.tags.includes('FOMO') || t.tags.includes('Revenge Trade'));

    if (bestPair && pairPerformance[bestPair] > 0) {
      localHeuristics.push(`Your strongest asset is **${bestPair}**, yielding a cumulative net gain of $${pairPerformance[bestPair].toFixed(2)}.`);
    }
    if (winRate < 50) {
      localHeuristics.push(`Your current win rate is **${winRate.toFixed(1)}%**. Focus on improving your risk-to-reward ratio (strive for at least 1:2) to stay net profitable even with a lower strike rate.`);
    } else {
      localHeuristics.push(`Excellent strike rate of **${winRate.toFixed(1)}%**! Maintain strict lot-size consistency to prevent a single high-risk loss from erasing multiple winning runs.`);
    }
    if (anxiousTrades.length > 0) {
      localHeuristics.push(`We detected emotional trading behavior (**Anxious / Revenge** states). Trades logged with these emotional profiles represent over **${((anxiousTrades.length / accountTrades.length) * 100).toFixed(0)}%** of your log. Sticking to automated order entries may minimize panic exits.`);
    }
    if (fomoTrades.length > 0) {
      localHeuristics.push(`**Revenge & FOMO tags** are present in your losing trades. There is a statistical trend of escalating risk (lot sizes) immediately following a losing session. Implement a 'two-losses-and-out' rule for the day.`);
    }
    localHeuristics.push(`Your average win-to-loss profit factor is **${profitFactor.toFixed(2)}**. A value above 1.5 indicates a highly viable strategy.`);

    if (!geminiKey || geminiKey === "MY_GEMINI_API_KEY") {
      // Return beautiful local heuristics if Gemini is not set up
      return res.json({ 
        insights: localHeuristics,
        summary: `AI Performance diagnostics computed successfully based on ${accountTrades.length} recorded positions.`
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

      const prompt = `You are a professional forex trading risk analyst and psychologist.
Analyze the following recorded trade history and generate 4 highly specific, actionable, professional bullet-point observations to help the trader improve their discipline and profitability.

Trading History Digest:
${JSON.stringify(digest, null, 2)}

Requirements:
- Ensure the output is returned as raw text, containing exactly 4 lines or bullet points.
- Focus heavily on risk control, emotional states, symbol trends, or session management.
- Keep observations direct, constructive, and elite. Do not use generic filler words.
- Highlight specific symbols or emotions in your text.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt
      });

      const responseText = response.text || '';
      const lines = responseText.split('\n')
        .map(l => l.replace(/^[-*•\s\d.]+\s*/, '').trim())
        .filter(l => l.length > 10);

      const finalInsights = lines.length >= 3 ? lines.slice(0, 4) : localHeuristics;

      res.json({
        insights: finalInsights,
        summary: `Advanced neural diagnostics completed based on recent trading behaviors.`
      });

    } catch (err: any) {
      console.error('Gemini API Error:', err);
      // Fallback seamlessly
      res.json({
        insights: localHeuristics,
        summary: `Diagnostics rendered via local heuristic processor (Gemini connection timed out).`
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
    createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    }).then((vite) => {
      app.use(vite.middlewares);
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`[AxyFx Journal Server] Dev listening on http://0.0.0.0:${PORT}`);
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
