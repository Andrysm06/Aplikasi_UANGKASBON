const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, 'database', 'kasbon_production.db');

try {
  const db = new Database(dbPath);
  console.log('--- REKONSTRUKSI TABEL CICILAN V26.26 ---');
  
  db.pragma('foreign_keys = OFF');
  
  db.transaction(() => {
    // 1. Rename aslinya
    db.prepare("ALTER TABLE cicilan_masuk RENAME TO cicilan_old").run();
    
    // 2. Buat tabel baru dengan FK ke 'pinjaman' yang benar
    db.prepare(`CREATE TABLE IF NOT EXISTS cicilan_masuk (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pinjaman_id INTEGER NOT NULL,
      jumlah_bayar INTEGER NOT NULL,
      tanggal_bayar DATE NOT NULL,
      keterangan TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pinjaman_id) REFERENCES pinjaman(id)
    )`).run();
    
    // 3. Salin data balik
    db.prepare(`INSERT INTO cicilan_masuk (
      id, pinjaman_id, jumlah_bayar, tanggal_bayar, keterangan, created_at
    ) SELECT 
      id, pinjaman_id, jumlah_bayar, tanggal_bayar, keterangan, created_at
    FROM cicilan_old`).run();
    
    // 4. Hapus sampah
    db.prepare("DROP TABLE cicilan_old").run();
  })();

  db.pragma('foreign_keys = ON');
  console.log('REKONSTRUKSI CICILAN V26.26 BERHASIL!');
  db.close();
} catch (e) {
  console.error('ERROR DATABASE:', e.message);
}
