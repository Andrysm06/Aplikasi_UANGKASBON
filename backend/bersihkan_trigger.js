const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, 'database', 'kasbon_production.db');

try {
  const db = new Database(dbPath);
  console.log('--- OPERASI PENGUSIR TRIGGER ---');
  
  // Cari semua trigger
  const triggers = db.prepare("SELECT name FROM sqlite_master WHERE type='trigger' AND tbl_name='pinjaman'").all();
  console.log('Trigger ditemukan:', triggers);

  for (const t of triggers) {
    db.prepare(`DROP TRIGGER IF EXISTS ${t.name}`).run();
    console.log(`Trigger ${t.name} BERHASIL DIHAPUS.`);
  }

  // Cek apakah ada index unik manual
  const indices = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='pinjaman' AND sql IS NOT NULL AND sql LIKE '%UNIQUE%'").all();
  for (const idx of indices) {
    db.prepare(`DROP INDEX IF EXISTS ${idx.name}`).run();
    console.log(`Index Unik ${idx.name} BERHASIL DIHAPUS.`);
  }

  db.close();
} catch (e) {
  console.error('ERROR DATABASE:', e.message);
}
