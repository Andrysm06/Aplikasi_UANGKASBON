const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, 'database', 'kasbon_production.db');

try {
  const db = new Database(dbPath);
  console.log('--- OPERASI PENYEMBUHAN TOTAL V26.29 ---');
  
  db.pragma('foreign_keys = OFF');
  
  db.transaction(() => {
    // 1. Ambil data cicilan yang ada sekarang sebelum dihapus
    const oldData = db.prepare("SELECT * FROM cicilan_masuk").all();
    console.log(`Menyelamatkan ${oldData.length} data cicilan...`);

    // 2. Hapus tabel yang link-nya rusak
    db.prepare("DROP TABLE IF EXISTS cicilan_masuk").run();
    
    // 3. Buat tabel cicilan baru dengan hubungan (FK) yang SEHAT
    db.prepare(`CREATE TABLE cicilan_masuk (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pinjaman_id INTEGER NOT NULL,
      jumlah_bayar INTEGER NOT NULL,
      tanggal_bayar DATE NOT NULL,
      keterangan TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pinjaman_id) REFERENCES pinjaman(id)
    )`).run();
    
    // 4. Masukkan kembali data yang diselamatkan
    const insert = db.prepare(`INSERT INTO cicilan_masuk (id, pinjaman_id, jumlah_bayar, tanggal_bayar, keterangan) 
                               VALUES (?, ?, ?, ?, ?)`);
    
    for (const d of oldData) {
      insert.run(d.id, d.pinjaman_id, d.jumlah_bayar, d.tanggal_bayar, d.keterangan);
    }
  })();

  db.pragma('foreign_keys = ON');
  console.log('DATABASE SUDAH SEHAT WAL AFIAT!');
  db.close();
} catch (e) {
  console.error('ERROR PENYEMBUHAN:', e.message);
}
