const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, 'database', 'kasbon_production.db');

try {
  const db = new Database(dbPath);
  console.log('--- REKONSTRUKSI TOTAL (BIUS FK) V26.10 ---');
  
  // 1. Matikan pengecekan FK di level koneksi (diluar transaksi)
  db.pragma('foreign_keys = OFF');
  
  db.transaction(() => {
    // Check if pinjaman_old exists (from previous fail)
    const exists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='pinjaman_old'").get();
    if (!exists) {
      db.prepare("ALTER TABLE pinjaman RENAME TO pinjaman_old").run();
    }
    
    // Create new table
    db.prepare(`CREATE TABLE IF NOT EXISTS pinjaman (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      no_pinjaman TEXT NOT NULL,
      karyawan_id INTEGER NOT NULL,
      pokok INTEGER NOT NULL,
      bunga_persen INTEGER NOT NULL,
      total_bunga INTEGER NOT NULL,
      total_tagihan INTEGER NOT NULL,
      terbayar INTEGER DEFAULT 0,
      sisa_tagihan INTEGER NOT NULL,
      keperluan TEXT,
      tanggal_pinjam DATE NOT NULL,
      status TEXT DEFAULT 'aktif',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      kategori TEXT DEFAULT 'UANG',
      harga_beli INTEGER DEFAULT 0,
      harga_jual_tunai INTEGER DEFAULT 0,
      metode_pembayaran TEXT DEFAULT 'CASH',
      ambil_uang_kas INTEGER DEFAULT 0,
      jumlah_potong_kas INTEGER DEFAULT 0,
      dp INTEGER DEFAULT 0,
      nama_produk TEXT,
      tipe_cicilan TEXT DEFAULT 'PER_BULAN',
      nominal_cicilan INTEGER DEFAULT 0,
      tenor_bulan INTEGER DEFAULT 0,
      tukar_tambah INTEGER DEFAULT 0,
      tanggal_jatuh_tempo DATE,
      keterangan_tt TEXT,
      stok_unit_id INTEGER,
      FOREIGN KEY (karyawan_id) REFERENCES karyawan(id)
    )`).run();
    
    // Copy data
    db.prepare(`INSERT INTO pinjaman (
      id, no_pinjaman, karyawan_id, pokok, bunga_persen, total_bunga, 
      total_tagihan, terbayar, sisa_tagihan, keperluan, tanggal_pinjam,
      status, created_at, kategori, harga_beli, harga_jual_tunai,
      metode_pembayaran, ambil_uang_kas, jumlah_potong_kas, dp,
      nama_produk, tipe_cicilan, nominal_cicilan, tenor_bulan,
      tukar_tambah, tanggal_jatuh_tempo, keterangan_tt, stok_unit_id
    ) SELECT 
      id, no_pinjaman, karyawan_id, pokok, bunga_persen, total_bunga, 
      total_tagihan, terbayar, sisa_tagihan, keperluan, tanggal_pinjam,
      status, created_at, kategori, harga_beli, harga_jual_tunai,
      metode_pembayaran, ambil_uang_kas, jumlah_potong_kas, dp,
      nama_produk, tipe_cicilan, nominal_cicilan, tenor_bulan,
      tukar_tambah, tanggal_jatuh_tempo, keterangan_tt, stok_unit_id
    FROM pinjaman_old`).run();
    
    // We keep pinjaman_old for safety or drop it if confident
    db.prepare("DROP TABLE pinjaman_old").run();
  })();

  db.pragma('foreign_keys = ON');
  console.log('REKONSTRUKSI V26.10 BERHASIL!');
  db.close();
} catch (e) {
  console.error('ERROR DATABASE:', e.message);
}
