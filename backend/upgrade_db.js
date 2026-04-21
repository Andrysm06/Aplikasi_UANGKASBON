const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, 'database', 'kasbon_production.db');

try {
  const db = new Database(dbPath);
  console.log('--- UPGRADE DATABASE V26.9 ---');
  
  // Tambah kolom stok_unit_id jika belum ada
  try {
    db.prepare("ALTER TABLE pinjaman ADD COLUMN stok_unit_id INTEGER").run();
    console.log('Kolom stok_unit_id BERHASIL ditambahkan!');
  } catch (e) {
    if (e.message.includes('duplicate column')) {
      console.log('Kolom stok_unit_id sudah ada.');
    } else {
      throw e;
    }
  }

  db.close();
} catch (e) {
  console.error('ERROR DATABASE:', e.message);
}
