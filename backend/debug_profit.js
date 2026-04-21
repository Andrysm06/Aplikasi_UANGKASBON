const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, 'database', 'kasbon_production.db');

try {
  const db = new Database(dbPath);
  console.log('--- DB INVESTIGATION ---');
  
  // 1. Triggers
  const triggers = db.prepare("SELECT name, sql FROM sqlite_master WHERE type = 'trigger'").all();
  console.log('TRIGGERS:', JSON.stringify(triggers, null, 2));

  // 2. Profit entries in April
  const profitApril = db.prepare("SELECT * FROM transaksi_kas WHERE tipe = 'PROFIT_REALIZED' AND strftime('%Y-%m', tanggal) = '2026-04'").all();
  console.log(`APRIL PROFIT LOGS (${profitApril.length}):`, JSON.stringify(profitApril, null, 2));

  const totalSum = profitApril.reduce((acc, curr) => acc + curr.jumlah, 0);
  console.log('TOTAL PROFIT CALCULATED FROM THESE LOGS:', totalSum);

  db.close();
} catch (e) {
  console.error('ERROR:', e.message);
}
