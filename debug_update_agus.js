const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, 'backend', 'database', 'kasbon_production.db');

try {
  const db = new Database(dbPath);
  console.log('--- DATA AGUS SEBELUM DIPAKSA ---');
  const old = db.prepare("SELECT * FROM pinjaman WHERE no_pinjaman = 'PIN-2026-006'").get();
  console.log(JSON.stringify(old, null, 2));

  if (old) {
      // PAKSA HITUNG ULANG DISINI
      const nJual = 2100000;
      const nDP = 200000;
      const nBungaPersen = 25;
      
      const nBunga = Math.round(nJual * nBungaPersen / 100); // 525.000
      const nHutangPokok = nJual - nDP; // 1.900.000
      const nTotal = nHutangPokok + nBunga; // 2.425.000
      const nSisa = nTotal - (old.terbayar || 0);

      console.log(`--- MEMAKSA UPDATE AGUS KE Rp ${nTotal} ---`);
      
      db.prepare(`UPDATE pinjaman SET 
          pokok = ?, 
          total_bunga = ?, 
          total_tagihan = ?, 
          sisa_tagihan = ?,
          harga_jual_tunai = 2100000,
          dp = 200000,
          bunga_persen = 25
          WHERE id = ?`).run(nHutangPokok, nBunga, nTotal, nSisa, old.id);
          
      console.log('--- UPDATE BERHASIL ---');
      const updated = db.prepare("SELECT * FROM pinjaman WHERE id = ?").get(old.id);
      console.log(JSON.stringify(updated, null, 2));
  } else {
      console.log('DATA TIDAK DITEMUKAN');
  }
  db.close();
} catch (e) {
  console.error('ERROR DATABASE:', e.message);
}
