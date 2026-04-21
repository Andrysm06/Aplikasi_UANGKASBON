const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, 'database', 'kasbon_production.db');

try {
  const db = new Database(dbPath);
  console.log('--- OPERASI STERILISASI DATABASE MENYELURUH ---');
  
  // Ambil SEMUA trigger yang ada di database
  const triggers = db.prepare("SELECT name FROM sqlite_master WHERE type='trigger'").all();
  console.log('Seluruh Trigger di Database:', triggers);

  for (const t of triggers) {
    db.prepare(`DROP TRIGGER IF EXISTS ${t.name}`).run();
    console.log(`Trigger [${t.name}] BERHASIL DIHAPUS.`);
  }

  // Cek apakah ada VIEW yang rusak
  const views = db.prepare("SELECT name FROM sqlite_master WHERE type='view'").all();
  for (const v of views) {
    db.prepare(`DROP VIEW IF EXISTS ${v.name}`).run();
    console.log(`View [${v.name}] BERHASIL DIHAPUS.`);
  }

  db.close();
} catch (e) {
  console.error('ERROR DATABASE:', e.message);
}
