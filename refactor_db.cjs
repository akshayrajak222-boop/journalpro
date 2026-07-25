const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf-8');

// The replacement ensureUserDbLoaded
const newEnsureUserDbLoaded = `
// Helper to convert snake_case object to camelCase
function toCamel(obj) {
  if (Array.isArray(obj)) return obj.map(toCamel);
  if (obj !== null && typeof obj === 'object') {
    const n = {};
    Object.keys(obj).forEach(k => {
      const camelKey = k.replace(/_([a-z])/g, g => g[1].toUpperCase());
      n[camelKey] = toCamel(obj[k]);
    });
    return n;
  }
  return obj;
}

// Helper to convert camelCase object to snake_case
function toSnake(obj) {
  if (Array.isArray(obj)) return obj.map(toSnake);
  if (obj !== null && typeof obj === 'object') {
    const n = {};
    Object.keys(obj).forEach(k => {
      const snakeKey = k.replace(/[A-Z]/g, letter => \`_\${letter.toLowerCase()}\`);
      n[snakeKey] = toSnake(obj[k]);
    });
    return n;
  }
  return obj;
}

async function ensureUserDbLoaded(userId, email) {
  let cleanUserId = userId?.trim() || '';
  let cleanEmail = email?.toLowerCase().trim() || '';

  if (cleanUserId.includes('@') && !cleanEmail) {
    cleanEmail = cleanUserId.toLowerCase();
    cleanUserId = '';
  }
  if (!cleanUserId && !cleanEmail) {
    return createEmptyUserDb('guest_user', 'guest@example.com');
  }

  // Load from SQL tables if Supabase is enabled
  if (useSupabase && cleanUserId) {
    try {
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

      if (loadedDb.users.length === 0) {
        loadedDb.users.push({
          id: cleanUserId,
          email: cleanEmail,
          name: cleanEmail ? cleanEmail.split('@')[0] : 'Trader',
          experience: 'Intermediate',
          tradingStyle: 'Day Trading',
          mainMarkets: ['Forex', 'Gold'],
          onboardingCompleted: false,
          isPro: false,
          isEmailVerified: true
        });
      }
      return loadedDb;
    } catch (err) {
      console.error('[AxyFx SQL Query Error]', err);
    }
  }
  return createEmptyUserDb(cleanUserId, cleanEmail);
}
`;

// The replacement saveDatabase
const newSaveDatabase = `
async function saveDatabase(data, overrideUserId, overrideEmail) {
  if (!data || !useSupabase) return;
  const usersToSync = Array.isArray(data.users) ? data.users : [];
  if(usersToSync.length === 0) return;

  const targetUser = usersToSync[0];
  const uid = targetUser.id;
  if(!uid) return;

  try {
    // Upsert users
    if (data.users && data.users.length > 0) {
      await supabase.from('users').upsert(toSnake(data.users), { onConflict: 'id' });
    }
    // Upsert accounts
    if (data.accounts && data.accounts.length > 0) {
      const accs = toSnake(data.accounts).map(a => ({ ...a, user_id: uid }));
      await supabase.from('trading_accounts').upsert(accs, { onConflict: 'id' });
    }
    // Upsert trades
    if (data.trades && data.trades.length > 0) {
      const trds = toSnake(data.trades).map(t => ({ ...t, user_id: uid }));
      await supabase.from('trades').upsert(trds, { onConflict: 'id' });
    }
    // Upsert risk settings
    if (data.riskSettings && data.riskSettings.length > 0) {
      const rs = toSnake(data.riskSettings).map(r => ({ ...r, user_id: uid }));
      await supabase.from('risk_settings').upsert(rs, { onConflict: 'id' });
    }
    // Upsert support tickets
    if (data.supportTickets && data.supportTickets.length > 0) {
      const tix = toSnake(data.supportTickets).map(t => ({ ...t, user_id: uid }));
      await supabase.from('support_tickets').upsert(tix, { onConflict: 'id' });
    }
    // Upsert mt5 connections
    if (data.mt5Connections && data.mt5Connections.length > 0) {
      const mt5 = toSnake(data.mt5Connections).map(m => ({ ...m, user_id: uid }));
      await supabase.from('mt5_connections').upsert(mt5, { onConflict: 'id' });
    }
  } catch(err) {
    console.error('[AxyFx SQL Save Error]', err);
  }
}
`;

// Extract functions using regex
const ensureRegex = /async function ensureUserDbLoaded\(userId\?: string, email\?: string\) \{[\s\S]*?\n\}\n(?=\nasync function ensureDbLoaded)/;
const saveRegex = /async function saveDatabase\([\s\S]*?\n\}\n(?=\nasync function removeUserDatabaseAliases)/;

content = content.replace(ensureRegex, newEnsureUserDbLoaded.trim() + '\\n');
content = content.replace(saveRegex, newSaveDatabase.trim() + '\\n');

fs.writeFileSync('server.ts', content, 'utf-8');
console.log('Successfully refactored server.ts');
