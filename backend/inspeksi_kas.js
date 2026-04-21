const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, 'database', 'kasbon_production.db');

try {
  const db = new Database(dbPath);
  console.log('--- INSPEKSI TABEL TRANSAKSI_KAS ---');
  const cols = db.prepare("PRAGMA table_info(transaksi_kas)").all();
  console.log('Kolom di transaksi_kas:', cols.map(c => c.name));
  
  const sample = db.prepare("SELECT * FROM transaksi_kas LIMIT 1").get();
  console.log('Contoh data:', sample);

  db.close();
} catch (e) {
  console.error('ERROR INSPEKSI:', e.message);
}
