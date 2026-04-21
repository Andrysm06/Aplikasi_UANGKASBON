const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, 'database', 'kasbon_production.db');

try {
  const db = new Database(dbPath);
  console.log('--- SCHEMA TABEL PINJAMAN ---');
  const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='pinjaman'").get();
  console.log(schema.sql);
  
  console.log('--- SCHEMA TABEL LAINNYA ---');
  const indexes = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='pinjaman'").all();
  console.log(JSON.stringify(indexes, null, 2));

  db.close();
} catch (e) {
  console.error('ERROR DATABASE:', e.message);
}
