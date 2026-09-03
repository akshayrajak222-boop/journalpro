// ─── Symbol Contract Specifications ─────────────────────────────────────────
// contractSize = number of units per 1 standard lot
// pipValue     = USD value of 1 pip per 1 standard lot (for USD-quoted pairs)
// For pairs where profit currency != USD, we use a simplified conversion.

export interface SymbolSpec {
  contractSize: number; // units per lot
  pipSize: number;      // 1 pip in price units (e.g. 0.0001 for EURUSD, 0.01 for USDJPY)
  pipValuePerLot: number; // USD value of 1 pip movement for 1 standard lot
}

export const SYMBOL_SPECS: Record<string, SymbolSpec> = {
  // Forex Majors
  EURUSD: { contractSize: 100000, pipSize: 0.0001, pipValuePerLot: 10 },
  GBPUSD: { contractSize: 100000, pipSize: 0.0001, pipValuePerLot: 10 },
  AUDUSD: { contractSize: 100000, pipSize: 0.0001, pipValuePerLot: 10 },
  NZDUSD: { contractSize: 100000, pipSize: 0.0001, pipValuePerLot: 10 },
  USDCAD: { contractSize: 100000, pipSize: 0.0001, pipValuePerLot: 10 },
  USDCHF: { contractSize: 100000, pipSize: 0.0001, pipValuePerLot: 10 },
  USDJPY: { contractSize: 100000, pipSize: 0.01,   pipValuePerLot: 9.09 }, // ~$9.09 per pip (varies with JPY rate)
  // Forex Crosses EUR
  EURGBP: { contractSize: 100000, pipSize: 0.0001, pipValuePerLot: 12.5 },
  EURJPY: { contractSize: 100000, pipSize: 0.01,   pipValuePerLot: 9.09 },
  EURAUD: { contractSize: 100000, pipSize: 0.0001, pipValuePerLot: 6.5 },
  EURCAD: { contractSize: 100000, pipSize: 0.0001, pipValuePerLot: 7.4 },
  EURCHF: { contractSize: 100000, pipSize: 0.0001, pipValuePerLot: 11.2 },
  EURNZD: { contractSize: 100000, pipSize: 0.0001, pipValuePerLot: 6.1 },
  // Forex Crosses GBP
  GBPJPY: { contractSize: 100000, pipSize: 0.01,   pipValuePerLot: 9.09 },
  GBPAUD: { contractSize: 100000, pipSize: 0.0001, pipValuePerLot: 6.5 },
  GBPCAD: { contractSize: 100000, pipSize: 0.0001, pipValuePerLot: 7.4 },
  GBPCHF: { contractSize: 100000, pipSize: 0.0001, pipValuePerLot: 11.2 },
  GBPNZD: { contractSize: 100000, pipSize: 0.0001, pipValuePerLot: 6.1 },
  // Forex Crosses AUD
  AUDJPY: { contractSize: 100000, pipSize: 0.01,   pipValuePerLot: 9.09 },
  AUDCAD: { contractSize: 100000, pipSize: 0.0001, pipValuePerLot: 7.4 },
  AUDCHF: { contractSize: 100000, pipSize: 0.0001, pipValuePerLot: 11.2 },
  AUDNZD: { contractSize: 100000, pipSize: 0.0001, pipValuePerLot: 6.1 },
  // Forex Crosses NZD
  NZDJPY: { contractSize: 100000, pipSize: 0.01,   pipValuePerLot: 9.09 },
  NZDCAD: { contractSize: 100000, pipSize: 0.0001, pipValuePerLot: 7.4 },
  NZDCHF: { contractSize: 100000, pipSize: 0.0001, pipValuePerLot: 11.2 },
  // Forex Crosses CAD/CHF
  CADJPY: { contractSize: 100000, pipSize: 0.01,   pipValuePerLot: 9.09 },
  CADCHF: { contractSize: 100000, pipSize: 0.0001, pipValuePerLot: 11.2 },
  CHFJPY: { contractSize: 100000, pipSize: 0.01,   pipValuePerLot: 9.09 },
  // Metals
  XAUUSD: { contractSize: 100, pipSize: 0.01, pipValuePerLot: 1 },   // Gold: 100 troy oz, $1 per $0.01 move per lot → $1 per pip
  XAGUSD: { contractSize: 5000, pipSize: 0.001, pipValuePerLot: 5 }, // Silver: 5000 oz
  XPTUSD: { contractSize: 100, pipSize: 0.01,  pipValuePerLot: 1 },  // Platinum
  XPDUSD: { contractSize: 100, pipSize: 0.01,  pipValuePerLot: 1 },  // Palladium
  // Crypto
  BTCUSD: { contractSize: 1,    pipSize: 0.01, pipValuePerLot: 0.01 },
  ETHUSD: { contractSize: 1,    pipSize: 0.01, pipValuePerLot: 0.01 },
  LTCUSD: { contractSize: 1,    pipSize: 0.01, pipValuePerLot: 0.01 },
  XRPUSD: { contractSize: 1,    pipSize: 0.0001, pipValuePerLot: 0.0001 },
  // Indices (CFDs)
  US30:   { contractSize: 1, pipSize: 1,    pipValuePerLot: 1 },
  US500:  { contractSize: 1, pipSize: 0.1,  pipValuePerLot: 0.1 },
  NAS100: { contractSize: 1, pipSize: 0.1,  pipValuePerLot: 0.1 },
  UK100:  { contractSize: 1, pipSize: 1,    pipValuePerLot: 0.88 },
  GER40:  { contractSize: 1, pipSize: 1,    pipValuePerLot: 1.1 },
  JPN225: { contractSize: 1, pipSize: 1,    pipValuePerLot: 0.0067 },
  // Oil
  USOIL:  { contractSize: 1000, pipSize: 0.01, pipValuePerLot: 10 },
  UKOIL:  { contractSize: 1000, pipSize: 0.01, pipValuePerLot: 10 },
};

// Common symbol aliases
export const SYMBOL_ALIASES: Record<string, string> = {
  GOLD: 'XAUUSD', SILVER: 'XAGUSD', XAUUSD_m: 'XAUUSD',
  DJIA: 'US30', SPX500: 'US500', NASDAQ: 'NAS100',
  WTI: 'USOIL', BRENT: 'UKOIL',
};

// All available symbols for autocomplete
export const ALL_SYMBOLS = [
  'XAUUSD','XAGUSD','XPTUSD','XPDUSD',
  'EURUSD','EURGBP','EURJPY','EURAUD','EURCAD','EURCHF','EURNZD',
  'GBPUSD','GBPJPY','GBPAUD','GBPCAD','GBPCHF','GBPNZD',
  'USDJPY','USDCAD','USDCHF',
  'AUDUSD','AUDJPY','AUDCAD','AUDCHF','AUDNZD',
  'NZDUSD','NZDJPY','NZDCAD','NZDCHF',
  'CADJPY','CADCHF','CHFJPY',
  'BTCUSD','ETHUSD','LTCUSD','XRPUSD',
  'US30','US500','NAS100','UK100','GER40','JPN225',
  'USOIL','UKOIL',
];

/**
 * Calculate profit/loss for a trade based on symbol contract specs.
 * Returns USD profit (positive = profit, negative = loss).
 */
export function calculateTradeProfit(
  symbol: string,
  tradeType: 'Buy' | 'Sell',
  entryPrice: number,
  exitPrice: number,
  lotSize: number
): number | null {
  const sym = symbol.toUpperCase().trim();
  const resolved = SYMBOL_ALIASES[sym] || sym;
  const spec = SYMBOL_SPECS[resolved];

  if (!spec || isNaN(entryPrice) || isNaN(exitPrice) || isNaN(lotSize) || lotSize <= 0) {
    return null;
  }

  const priceDiff = tradeType === 'Buy'
    ? exitPrice - entryPrice
    : entryPrice - exitPrice;

  // Number of pips moved
  const pips = priceDiff / spec.pipSize;

  // Profit = pips × pipValuePerLot × lots
  const profit = pips * spec.pipValuePerLot * lotSize;

  return parseFloat(profit.toFixed(2));
}
