const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, 'database', 'kasbon_production.db');

try {
  const db = new Database(dbPath);
  console.log('--- REKONSTRUKSI PROFIT (V26.41) ---');
  
  db.transaction(() => {
    // 1. Ambil semua transaksi cicilan (masuk)
    // Kita akan hapus semua PROFIT_REALIZED dan buat ulang berdasarkan cicilan yang ada.
    // Karena cicilan_masuk adalah record yang valid pembayarannya.
    
    db.prepare("DELETE FROM transaksi_kas WHERE tipe = 'PROFIT_REALIZED'").run();
    console.log('  -> Menghapus log profit lama untuk dikalkulasi ulang...');

    const cicilans = db.prepare(`
         SELECT c.*, p.harga_beli, p.harga_jual_tunai, p.total_bunga, p.total_tagihan, p.no_pinjaman, kar.nama as nama_karyawan
         FROM cicilan_masuk c
         JOIN pinjaman p ON c.pinjaman_id = p.id
         JOIN karyawan kar ON p.karyawan_id = kar.id
    `).all();

    let count = 0;
    cicilans.forEach(c => {
        const nJual = Number(c.harga_jual_tunai) || 0;
        const nBeli = Number(c.harga_beli) || 0;
        const nBunga = Number(c.total_bunga) || 0;
        const nTagihan = Number(c.total_tagihan) || 0;
        const jmlBayar = Number(c.jumlah_bayar) || 0;

        // V26.40 Logic: If harga_beli = 0, markup = 0.
        const markup = (nBeli > 0) ? Math.max(0, nJual - nBeli) : 0;
        const totPotential = markup + nBunga;
        const ratio = nTagihan > 0 ? totPotential / nTagihan : 0;
        const realized = Math.round(jmlBayar * ratio);

        db.prepare(`INSERT INTO transaksi_kas (tipe, jumlah, keterangan, tanggal) VALUES (?, ?, ?, ?)`)
          .run('PROFIT_REALIZED', realized, `Profit Proporsional PIN ${c.no_pinjaman} (${c.nama_karyawan})`, c.tanggal_bayar);
        count++;
    });

    console.log(`  -> Berhasil merekonstruksi ${count} log profit.`);
  })();

  const newTotal = db.prepare("SELECT SUM(jumlah) as s FROM transaksi_kas WHERE tipe = 'PROFIT_REALIZED' AND strftime('%Y-%m', tanggal) = strftime('%Y-%m', 'now')").get()?.s || 0;
  console.log('PROFIT BARU BULAN INI:', newTotal);
  
  db.close();
} catch (e) {
  console.error('ERROR DATABASE:', e.message);
}
