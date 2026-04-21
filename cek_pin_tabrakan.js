const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, 'backend', 'database', 'kasbon_production.db');

try {
  const db = new Database(dbPath);
  console.log('--- CEK PIN TERAKHIR ---');
  const allPins = db.prepare("SELECT no_pinjaman FROM pinjaman").all();
  console.log('Daftar PIN yang ada:', allPins.map(p => p.no_pinjaman));
  
  const lastPin = db.prepare("SELECT no_pinjaman FROM pinjaman ORDER BY id DESC LIMIT 1").get();
  console.log('PIN Terakhir menurut ID:', lastPin);

  db.close();
} catch (e) {
  console.error('ERROR DATABASE:', e.message);
}
