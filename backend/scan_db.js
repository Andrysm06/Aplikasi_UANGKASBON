const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, 'database', 'kasbon_production.db');

try {
  const db = new Database(dbPath);
  console.log('--- SCANNING DATABASE TABLES ---');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('Tabel yang ditemukan:', tables.map(t => t.name));

  // Coba cari data di cicilan_old jika ada
  const cicilanOld = tables.find(t => t.name === 'cicilan_old');
  if (cicilanOld) {
     const cols = db.prepare("PRAGMA table_info(cicilan_old)").all();
     console.log('Kolom di cicilan_old:', cols.map(c => c.name));
  } else {
     console.log('Tabel cicilan_old TIDAK DITEMUKAN. Membuat cicilan_masuk baru.');
  }

  db.close();
} catch (e) {
  console.error('ERROR SCAN:', e.message);
}
