const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, 'database', 'kasbon_production.db');

try {
  const db = new Database(dbPath);
  console.log('--- DAFTAR KOLOM PINJAMAN ---');
  const cols = db.prepare("PRAGMA table_info(pinjaman)").all();
  console.log(JSON.stringify(cols, null, 2));

  db.close();
} catch (e) {
  console.error('ERROR DATABASE:', e.message);
}
