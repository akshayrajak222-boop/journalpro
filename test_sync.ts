import request from 'supertest'; 
import app from './server.ts'; 

(async () => { 
  const payload = { 
    syncToken: 'axy_token_ea_23302', 
    balance: 562.74, 
    trades: [{ 
      id: 99999999, 
      symbol: 'XAUUSDm', 
      type: 'Buy', 
      lotSize: 0.1, 
      profit: 5.5, 
      commission: 0, 
      swap: 0, 
      entryPrice: 2000.0, 
      exitPrice: 2005.0, 
      date: '2026-07-29T19:07:27' 
    }] 
  }; 
  const res = await request(app).post('/api/mt5/sync').send(payload).set('Content-Type', 'application/json'); 
  console.log('STATUS:', res.status); 
  console.log('BODY:', JSON.stringify(res.body)); 
  process.exit(0); 
})();
