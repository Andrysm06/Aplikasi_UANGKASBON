const mysql = require('mysql2/promise');
require('dotenv').config();

// CONFIG DATABASE MYSQL (Aiven / Remote)
const dbConfig = {
  host: process.env.MYSQL_HOST,
  port: process.env.MYSQL_PORT || 24904,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: {
    rejectUnauthorized: false // Wajib untuk Aiven
  }
};

let pool;

async function getDB() {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
  }
  return pool;
}

async function initDB() {
  try {
    const db = await getDB();
    console.log('--- DATABASE MYSQL CONNECTED & INIT ---');

    await db.execute(`
      CREATE TABLE IF NOT EXISTS users ( 
        id INT PRIMARY KEY AUTO_INCREMENT, 
        nama VARCHAR(255) NOT NULL, 
        username VARCHAR(255) UNIQUE NOT NULL, 
        password VARCHAR(255) NOT NULL, 
        role VARCHAR(50) DEFAULT 'admin' 
      )`);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS kas_utama ( 
        id INT PRIMARY KEY AUTO_INCREMENT, 
        saldo BIGINT DEFAULT 0, 
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP 
      )`);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS transaksi_kas ( 
        id INT PRIMARY KEY AUTO_INCREMENT, 
        tipe VARCHAR(50) NOT NULL, 
        jumlah BIGINT NOT NULL, 
        keterangan TEXT, 
        tanggal DATETIME DEFAULT CURRENT_TIMESTAMP 
      )`);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS karyawan ( 
        id INT PRIMARY KEY AUTO_INCREMENT, 
        nik VARCHAR(50) UNIQUE NOT NULL, 
        nama VARCHAR(255) NOT NULL, 
        departemen VARCHAR(255) DEFAULT '-', 
        jabatan VARCHAR(255) DEFAULT '-',
        no_hp VARCHAR(50) DEFAULT '-',
        email VARCHAR(255) DEFAULT '-',
        tgl_masuk DATE,
        status VARCHAR(50) DEFAULT 'aktif' 
      )`);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS pinjaman ( 
        id INT PRIMARY KEY AUTO_INCREMENT, 
        no_pinjaman VARCHAR(100) UNIQUE NOT NULL, 
        karyawan_id INT NOT NULL, 
        kategori VARCHAR(50) NOT NULL DEFAULT 'UANG', 
        pokok BIGINT NOT NULL, 
        bunga_persen INT NOT NULL, 
        total_bunga BIGINT NOT NULL, 
        total_tagihan BIGINT NOT NULL, 
        terbayar BIGINT DEFAULT 0, 
        sisa_tagihan BIGINT NOT NULL, 
        keperluan TEXT, 
        tanggal_pinjam DATE NOT NULL, 
        status VARCHAR(50) DEFAULT 'aktif', 
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        harga_beli BIGINT DEFAULT 0,
        harga_jual_tunai BIGINT DEFAULT 0,
        metode_pembayaran VARCHAR(50) DEFAULT 'CASH',
        ambil_uang_kas INT DEFAULT 0,
        nama_produk TEXT,
        tipe_cicilan VARCHAR(50) DEFAULT 'PER_BULAN',
        nominal_cicilan BIGINT DEFAULT 0,
        tenor_bulan INT DEFAULT 0,
        dp BIGINT DEFAULT 0,
        tukar_tambah BIGINT DEFAULT 0,
        jumlah_potong_kas BIGINT DEFAULT 0,
        tanggal_jatuh_tempo DATE,
        keterangan_tt TEXT,
        stok_unit_id INT
      )`);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS cicilan_masuk ( 
        id INT PRIMARY KEY AUTO_INCREMENT, 
        pinjaman_id INT NOT NULL, 
        jumlah_bayar BIGINT NOT NULL, 
        porsi_pokok BIGINT DEFAULT 0, 
        porsi_bunga BIGINT DEFAULT 0, 
        tanggal_bayar DATE NOT NULL, 
        metode_bayar VARCHAR(50) DEFAULT 'CASH',
        diterima_oleh VARCHAR(255),
        keterangan TEXT 
      )`);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS notifikasi ( 
        id INT PRIMARY KEY AUTO_INCREMENT, 
        tipe VARCHAR(50) NOT NULL, 
        pesan TEXT NOT NULL, 
        dibaca INT DEFAULT 0, 
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP 
      )`);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS stok_unit (
        id INT PRIMARY KEY AUTO_INCREMENT,
        kategori VARCHAR(50) NOT NULL DEFAULT 'HP',
        nama_produk VARCHAR(255) NOT NULL,
        merek VARCHAR(100) DEFAULT '',
        tipe VARCHAR(100) DEFAULT '',
        kondisi VARCHAR(50) NOT NULL DEFAULT 'BARU',
        stok INT DEFAULT 0,
        harga_beli BIGINT DEFAULT 0,
        harga_jual BIGINT DEFAULT 0,
        status VARCHAR(50) DEFAULT 'TERSEDIA',
        current_loan_id INT,
        keterangan TEXT,
        is_tt INT DEFAULT 0,
        tt_barang TEXT,
        tt_merek VARCHAR(100) DEFAULT '',
        tt_tipe VARCHAR(100) DEFAULT '',
        tt_harga BIGINT DEFAULT 0,
        tt_harga_jual BIGINT DEFAULT 0,
        tt_profit BIGINT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS setting (
        id INT PRIMARY KEY AUTO_INCREMENT, 
        \`key\` VARCHAR(255) UNIQUE, 
        value TEXT 
      )`);

    // SEED SETTING DEFAULT
    const [sets] = await db.execute("SELECT * FROM setting WHERE `key` = 'nama_toko' LIMIT 1");
    if (sets.length === 0) {
      await db.execute("INSERT INTO setting (`key`, value) VALUES (?, ?)", ['nama_toko', 'UANG KASBON']);
    }

    // SEED ADMIN
    const [admins] = await db.execute('SELECT * FROM users WHERE role = "admin" LIMIT 1');
    if (admins.length === 0) {
       const bcrypt = require('bcryptjs');
       const hash = bcrypt.hashSync('MASTER', 10);
       await db.execute('INSERT INTO users (nama, username, password, role) VALUES (?, ?, ?, ?)', ['Admin Utama', 'admin', hash, 'admin']);
    }

    // SEED KAS UTAMA
    const [kas] = await db.execute('SELECT COUNT(*) as count FROM kas_utama');
    if (kas[0].count === 0) {
      await db.execute('INSERT INTO kas_utama (saldo) VALUES (?)', [0]);
    }

    // PATCH: Tambah kolom karyawan jika belum ada (V5.5.8 fix)
    console.log('--- RUNNING DB PATCH (KARYAWAN) ---');
    try {
      const [cols] = await db.execute("DESCRIBE karyawan");
      const colNames = cols.map(c => (c.Field || c.column_name || '').toLowerCase());
      
      const addCol = async (tbl, col, type) => {
        if (!colNames.includes(col.toLowerCase())) {
          console.log(`Adding column ${col} to ${tbl}...`);
          await db.execute(`ALTER TABLE ${tbl} ADD COLUMN ${col} ${type}`);
        }
      };

      await addCol('karyawan', 'jabatan', "VARCHAR(255) DEFAULT '-'");
      await addCol('karyawan', 'no_hp', "VARCHAR(50) DEFAULT '-'");
      await addCol('karyawan', 'email', "VARCHAR(255) DEFAULT '-'");
      await addCol('karyawan', 'tgl_masuk', "DATE");
    } catch (e) {
      console.error('❌ PATCH_KARYAWAN_FAILED:', e.message);
    }

    // PATCH: Tambah kolom stok_unit jika belum ada
    console.log('--- RUNNING DB PATCH (STOK_UNIT) ---');
    try {
      const [colsStok] = await db.execute("DESCRIBE stok_unit");
      const colNamesStok = colsStok.map(c => (c.Field || c.column_name || '').toLowerCase());

      const addColStok = async (tbl, col, type) => {
        if (!colNamesStok.includes(col.toLowerCase())) {
          console.log(`Adding column ${col} to ${tbl}...`);
          await db.execute(`ALTER TABLE ${tbl} ADD COLUMN ${col} ${type}`);
        }
      };

      await addColStok('stok_unit', 'tt_merek', "VARCHAR(100) DEFAULT ''");
      await addColStok('stok_unit', 'tt_tipe', "VARCHAR(100) DEFAULT ''");
      await addColStok('stok_unit', 'tt_harga_jual', "BIGINT DEFAULT 0");
    } catch (e) {
      console.error('❌ PATCH_STOK_FAILED:', e.message);
    }
  } catch (err) {
    console.error('❌ DATABASE_INIT_FAILED:', err);
  }
}

module.exports = { getDB, initDB };
