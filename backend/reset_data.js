const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'database', 'kasbon_production.db');
const db = new Database(DB_PATH);

console.log('--- STARTING DATA RESET (SYSTEM V7.5) ---');

try {
  // 1. Clear transactional tables
  db.prepare('DELETE FROM cicilan_masuk').run();
  db.prepare('DELETE FROM pinjaman').run();
  db.prepare('DELETE FROM transaksi_kas').run();
  db.prepare('DELETE FROM karyawan').run();
  db.prepare('DELETE FROM notifikasi').run();
  
  // 2. Clear kas Utama and reset to 0
  db.prepare('DELETE FROM kas_utama').run();
  db.prepare('INSERT INTO kas_utama (saldo) VALUES (0)').run();
  
  // 3. Keep users Table (Admin stays)
  console.log('Transactional data cleared. Admin user preserved.');
  
  // 4. Vacuum to shrink file size
  db.exec('VACUUM');
  
  console.log('--- RESET COMPLETE. SYSTEM READY FOR NEW DATA ---');
} catch (err) {
  console.error('RESET FAILED:', err);
} finally {
  db.close();
}
