export interface User {
  id: string;
  email: string;
  name: string;
  password?: string;
  experience?: 'Beginner' | 'Intermediate' | 'Professional';
  tradingStyle?: 'Scalping' | 'Day Trading' | 'Swing Trading';
  mainMarkets?: ('Forex' | 'Gold' | 'Crypto' | 'Indices')[];
  onboardingCompleted: boolean;
  isPro: boolean;
  onboardingData?: {
    experience: string;
    tradingStyle: string;
    markets: string[];
  };
}

export interface TradingAccount {
  id: string;
  userId: string;
  name: string;
  broker: string;
  platform: 'MT4' | 'MT5' | 'cTrader' | 'DXtrade';
  accountType: 'Live' | 'Demo';
  currency: string;
  startingBalance: number;
  currentBalance: number;
  equity: number;
  status: 'Active' | 'Inactive' | 'Archived';
}

export interface Trade {
  id: string;
  accountId: string;
  date: string; // ISO format or date string
  symbol: string;
  type: 'Buy' | 'Sell' | 'Deposit' | 'Withdrawal';
  lotSize: number;
  entryPrice: number;
  exitPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  profit: number; // positive or negative
  commission: number;
  swap: number;
  riskPercentage: number;
  strategy?: string;
  emotion?: 'Calm' | 'Excited' | 'Anxious' | 'FOMO' | 'Greedy' | 'Revenge';
  notes?: string;
  screenshot?: string; // base64 or URL
  tags: string[];
  isMt5Sync?: boolean;
}

export interface RiskSettings {
  id: string;
  accountId: string;
  riskPerTradeLimit: number; // e.g. 2 for 2%
  dailyLossLimit: number; // in currency amount or %
  weeklyLossLimit: number;
  maxDrawdownLimit: number;
  disciplineEnabled: boolean;
  maxTradesPerDay: number;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userEmail: string;
  title: string;
  description: string;
  status: 'Open' | 'In Progress' | 'Closed';
  category: 'Billing' | 'MT5 Sync' | 'Feature Request' | 'Bug' | 'Other';
  date: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
}

export interface MT5Connection {
  id: string;
  userId: string;
  accountId: string;
  brokerName: string;
  status: 'Connected' | 'Disconnected' | 'Syncing' | 'Error';
  lastSyncTime?: string;
  syncToken: string;
  totalSyncedTrades: number;
  loginNumber?: string;
  brokerServer?: string;
  isInvestorSync?: boolean;
  autoSync?: boolean;
}

export interface PaymentHistory {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  plan: 'Pro';
  status: 'Success' | 'Failed' | 'Pending';
  date: string;
  razorpayId: string;
}
