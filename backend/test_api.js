const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, 'database', 'kasbon_production.db');

try {
  const db = new Database(dbPath);
  const selectedMonth = '2026-04';
  
  const profitBulan = db.prepare("SELECT SUM(jumlah) as s FROM transaksi_kas WHERE tipe = 'PROFIT_REALIZED' AND strftime('%Y-%m', tanggal) = ?").get(selectedMonth)?.s || 0;
  
  const rawChart = db.prepare(`
      SELECT strftime('%Y-%m', tanggal) as bulan, SUM(jumlah) as profit
      FROM transaksi_kas 
      WHERE tipe = 'PROFIT_REALIZED'
      GROUP BY bulan 
      ORDER BY bulan DESC 
      LIMIT 6
  `).all();
  
  console.log('--- API RESPONSE MOCKUP ---');
  console.log('profitBulan:', profitBulan);
  console.log('chartData:', JSON.stringify(rawChart, null, 2));
  
  db.close();
} catch (e) {
  console.error('ERROR:', e.message);
}
