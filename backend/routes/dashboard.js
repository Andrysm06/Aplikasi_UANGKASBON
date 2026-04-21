const express = require('express');
const router = express.Router();
const { getDB } = require('../database/db');
const { authMiddleware } = require('../middleware/auth');

router.get('/', authMiddleware, async (req, res) => {
  const db = await getDB();
  const selectedMonth = req.query.month || new Date().toISOString().slice(0, 7); 

  try {
    const [rowSaldo] = await db.execute('SELECT saldo FROM kas_utama LIMIT 1');
    const saldo = rowSaldo[0]?.saldo || 0;

    const [rowPinjaman] = await db.execute("SELECT SUM(sisa_tagihan) as s FROM pinjaman WHERE status = 'aktif'");
    const pinjamanAktif = rowPinjaman[0]?.s || 0;

    const [rowCicilan] = await db.execute("SELECT SUM(jumlah_bayar) as s FROM cicilan_masuk WHERE DATE_FORMAT(tanggal_bayar, '%Y-%m') = ?", [selectedMonth]);
    const cicilanMasuk = rowCicilan[0]?.s || 0;

    const [rowProfit] = await db.execute("SELECT SUM(jumlah) as s FROM transaksi_kas WHERE tipe = 'PROFIT_REALIZED' AND DATE_FORMAT(tanggal, '%Y-%m') = ?", [selectedMonth]);
    const profitBulan = rowProfit[0]?.s || 0;

    const [rowStok] = await db.execute("SELECT SUM(stok) as s FROM stok_unit WHERE status LIKE '%TERSEDIA%'");
    const totalStok = Number(rowStok[0]?.s || 0);

    const [rowKredit] = await db.execute("SELECT COUNT(*) as s FROM stok_unit WHERE status LIKE '%KREDIT%'");
    const sedangKredit = Number(rowKredit[0]?.s || 0);

    const [rowTerjual] = await db.execute("SELECT COUNT(*) as s FROM stok_unit WHERE status LIKE '%TERJUAL%'");
    const terjualCash = Number(rowTerjual[0]?.s || 0);

    // 1. Mutasi Terakhir
    const [recentHistoryRaw] = await db.execute("SELECT id, tipe, jumlah, keterangan, tanggal FROM transaksi_kas WHERE DATE_FORMAT(tanggal, '%Y-%m') = ? ORDER BY tanggal DESC LIMIT 20", [selectedMonth]);
    const recentHistory = recentHistoryRaw.map(h => ({
       ...h,
       uiTipe: (h.tipe === 'masuk' || h.tipe === 'PROFIT_REALIZED') ? 'masuk' : 'keluar',
       uiLabel: h.tipe === 'PROFIT_REALIZED' ? 'PROFIT' : (h.tipe === 'masuk' ? 'Income' : 'Outcome')
    }));

    // 2. Data Grafik
    const [rawChart] = await db.execute(`
      SELECT DATE_FORMAT(tanggal, '%Y-%m') as bulan, SUM(jumlah) as profit
      FROM transaksi_kas 
      WHERE tipe = 'PROFIT_REALIZED'
      GROUP BY bulan 
      ORDER BY bulan DESC 
      LIMIT 6
    `);
    
    const chartData = rawChart.reverse().map(item => ({
      name: item.bulan, 
      profit: item.profit || 0
    }));

    // 3. Overdue Pins
    const [allActivePins] = await db.execute(`
        SELECT p.id, p.no_pinjaman, p.kategori, p.sisa_tagihan, p.terbayar, p.nominal_cicilan, p.tanggal_pinjam, kar.nama as nama_karyawan
        FROM pinjaman p JOIN karyawan kar ON p.karyawan_id = kar.id
        WHERE p.status = 'aktif' AND p.tipe_cicilan = 'PER_BULAN' AND p.nominal_cicilan > 0
    `);

    const overduePins = allActivePins.filter(p => {
        const start = new Date(p.tanggal_pinjam);
        const now = new Date();
        const diffTime = Math.abs(now - start);
        const monthsElapsed = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30.42)); 
        
        if (monthsElapsed >= 1 && p.terbayar < (p.nominal_cicilan * monthsElapsed)) {
          const dueDate = new Date(start);
          dueDate.setMonth(dueDate.getMonth() + Math.ceil(p.terbayar / p.nominal_cicilan) + 1);
          p.daysLate = Math.max(0, Math.ceil((now - dueDate) / (1000 * 60 * 60 * 24)));
          return true;
        }
        return false;
    });

    res.json({
      saldo,
      pinjamanAktif,
      cicilanMasuk,
      profitBulan,
      totalStok,
      sedangKredit,
      terjualCash,
      recentHistory, 
      chartData,
      overduePins
    });

  } catch (err) {
    console.error("[V26.34] ERROR DASHBOARD FINAL:", err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
