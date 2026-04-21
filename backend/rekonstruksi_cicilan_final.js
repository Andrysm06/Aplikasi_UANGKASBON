const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, 'database', 'kasbon_production.db');

try {
  const db = new Database(dbPath);
  console.log('--- REKONSTRUKSI CICILAN V26.27 ---');
  
  db.pragma('foreign_keys = OFF');
  
  // Ambil kolom asli dari cicilan_old
  const cols = db.prepare("PRAGMA table_info(cicilan_old)").all();
  const colNames = cols.map(c => c.name);
  console.log('Kolom yang ada:', colNames);

  db.transaction(() => {
    // 1. Buat tabel baru yang 'Sesuai' keinginan database
    db.prepare(`CREATE TABLE IF NOT EXISTS cicilan_masuk (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pinjaman_id INTEGER NOT NULL,
      jumlah_bayar INTEGER NOT NULL,
      tanggal_bayar DATE NOT NULL,
      keterangan TEXT,
      FOREIGN KEY (pinjaman_id) REFERENCES pinjaman(id)
    )`).run();
    
    // 2. Salin data HANYA yang ada kolomnya
    const targetCols = ['id', 'pinjaman_id', 'jumlah_bayar', 'tanggal_bayar', 'keterangan'];
    const validCols = targetCols.filter(c => colNames.includes(c));
    
    db.prepare(`INSERT INTO cicilan_masuk (${validCols.join(',')}) SELECT ${validCols.join(',')} FROM cicilan_old`).run();
    
    // 3. Hapus sampah
    db.prepare("DROP TABLE cicilan_old").run();
  })();

  db.pragma('foreign_keys = ON');
  console.log('REKONSTRUKSI CICILAN V26.27 BERHASIL!');
  db.close();
} catch (e) {
  console.error('ERROR DATABASE:', e.message);
}
