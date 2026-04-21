const express = require('express');
const router = express.Router();
const { getDB } = require('../database/db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// GET Approval (PlaceHolder to stop 404)
router.get('/approval', authMiddleware, (req, res) => {
  res.json({ data: [] });
});

// GET Semua Pinjaman (V6.9.2 - Pagination)
router.get('/', authMiddleware, async (req, res) => {
  const db = await getDB();
  const { status, search, page = 1 } = req.query;
  const limit = 10;
  const offset = (Number(page) - 1) * limit;

  try {
    let whereSQL = ' WHERE 1=1';
    const params = [];
    if (status && status !== 'semua') { whereSQL += ' AND p.status = ?'; params.push(status); }
    if (search) { whereSQL += ' AND (kar.nama LIKE ? OR p.no_pinjaman LIKE ? OR p.kategori LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }

    const [countRows] = await db.execute(`SELECT COUNT(*) as count FROM pinjaman p JOIN karyawan kar ON p.karyawan_id = kar.id ${whereSQL}`, params);
    const totalCount = countRows[0].count;

    let q = `SELECT p.*, kar.nama as nama_karyawan, kar.nik FROM pinjaman p 
             JOIN karyawan kar ON p.karyawan_id = kar.id ${whereSQL}
             ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
    const [data] = await db.execute(q, [...params, limit, offset]);

    res.json({ data, currentPage: Number(page), totalPages: Math.ceil(totalCount / limit), totalData: totalCount });
  } catch (e) {
    res.status(400).json({ message: 'DATABASE_ERROR: ' + e.message });
  }
});

// GET Detail
router.get('/:id', authMiddleware, async (req, res) => {
  const db = await getDB();
  try {
    const [rows] = await db.execute(`SELECT p.*, kar.nama as nama_karyawan, kar.nik, kar.departemen
      FROM pinjaman p LEFT JOIN karyawan kar ON p.karyawan_id = kar.id WHERE p.id = ?`, [req.params.id]);
    const pinjam = rows[0];
    if (!pinjam) return res.status(404).json({ message: 'Tidak ditemukan' });

    const [history] = await db.execute('SELECT * FROM cicilan_masuk WHERE pinjaman_id = ? ORDER BY tanggal_bayar DESC', [req.params.id]);
    res.json({ ...pinjam, history });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// POST Pengajuan (V25 - Clean & Bug-Free)
router.post('/', authMiddleware, adminOnly, async (req, res) => {
  const db = await getDB();
  const { 
    karyawan_id, kategori, pokok, bunga_persen, tanggal_pinjam, keperluan,
    harga_beli, harga_jual_tunai, metode_pembayaran = 'CASH', ambil_uang_kas,
    jumlah_potong_kas, dp, tukar_tambah, nama_produk = '', jatuh_tempo_manual, 
    keterangan_tt = '', tipe_cicilan = 'PER_RIT', nominal_cicilan = 0, tenor_bulan = 0,
    stok_unit_id
  } = req.body;

  const conn = await db.getConnection();
  try {
    const isCash = kategori === 'UANG';
    const nJual = Math.round(Number(harga_jual_tunai) || 0);
    const nBeli = Math.round(Number(harga_beli) || 0);
    const nDP = Math.round(Number(dp) || 0);
    const nTT = Math.round(Number(tukar_tambah) || 0);
    const nPokok = Math.round(Number(pokok) || 0);
    const nBungaPersen = Math.round(Number(bunga_persen) || 0);

    const dasarBunga = isCash ? nPokok : nJual - nTT;
    const nTotalBunga = Math.round((Math.max(0, dasarBunga) * nBungaPersen) / 100);
    const nTotalTagihan = Math.round((isCash ? nPokok : (nJual - nDP - nTT)) + nTotalBunga);

    const isAmbilKas = Number(ambil_uang_kas) === 1 || ambil_uang_kas === true;
    const nPotongKas = Number(jumlah_potong_kas || nBeli);
    const cashOut = isCash ? nPokok : (isAmbilKas ? nPotongKas : 0);
    const cashIn = isCash ? 0 : nDP;
    const netDeduct = cashOut - cashIn;

    // PIN Generator
    const [lastRows] = await conn.execute("SELECT no_pinjaman FROM pinjaman ORDER BY id DESC LIMIT 1");
    let tryNum = 1;
    if (lastRows[0]) {
       const parts = lastRows[0].no_pinjaman.split('-');
       tryNum = parseInt(parts[2]) + 1;
    }

    await conn.beginTransaction();
    const ts = Date.now().toString().slice(-4);
    const no_pinjaman = `PIN-${new Date().getFullYear()}-${String(tryNum).padStart(3, '0')}-${ts}`;

    if (netDeduct !== 0) {
       await conn.execute('UPDATE kas_utama SET saldo = saldo - ?', [netDeduct]);
       if (cashOut > 0) {
         await conn.execute('INSERT INTO transaksi_kas (tipe, jumlah, keterangan) VALUES (?, ?, ?)',
           ['keluar', cashOut, isCash ? `Pencairan Tunai ${no_pinjaman}` : `Beli Modal ${nama_produk || kategori} (${no_pinjaman})`]);
       }
       if (cashIn > 0) {
         await conn.execute('INSERT INTO transaksi_kas (tipe, jumlah, keterangan) VALUES (?, ?, ?)',
           ['masuk', cashIn, `DP ${nama_produk || kategori} (${no_pinjaman})`]);
       }
    }

    const [resInsert] = await conn.execute(`INSERT INTO pinjaman (
              no_pinjaman, karyawan_id, kategori, pokok, bunga_persen, 
              total_bunga, total_tagihan, sisa_tagihan, keperluan, tanggal_pinjam,
              harga_beli, harga_jual_tunai, metode_pembayaran, ambil_uang_kas,
              jumlah_potong_kas, dp, tukar_tambah, nama_produk,
              terbayar, tipe_cicilan, nominal_cicilan, tenor_bulan,
              tanggal_jatuh_tempo, keterangan_tt, stok_unit_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)`,
      [
        no_pinjaman, karyawan_id, kategori, isCash ? nPokok : (nJual - nDP - nTT), nBungaPersen, 
        nTotalBunga, nTotalTagihan, nTotalTagihan, keperluan || '-', tanggal_pinjam,
        nBeli, nJual, metode_pembayaran, isAmbilKas ? 1 : 0,
        nPotongKas, nDP, nTT, nama_produk,
        tipe_cicilan, Number(nominal_cicilan), Number(tenor_bulan),
        jatuh_tempo_manual || null, keterangan_tt, stok_unit_id || null
      ]);

    if (stok_unit_id) {
      await conn.execute("UPDATE stok_unit SET status = 'SEDANG DIKREDIT', current_loan_id = ?, stok = GREATEST(0, CAST(stok AS SIGNED) - 1) WHERE id = ?", [resInsert.insertId, stok_unit_id]);
    }
    
    await conn.commit();
    res.json({ message: 'Success', no_pinjaman });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ message: 'DATABASE_ERROR: ' + e.message });
  } finally {
    conn.release();
  }
});

// PUT Update Pinjaman (V9.2 - Correct Bunga Calculation)
router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
  const db = await getDB();
  const { id } = req.params;
  const b = req.body;

  const conn = await db.getConnection();
  try {
    const [rows] = await conn.execute('SELECT * FROM pinjaman WHERE id = ?', [id]);
    const pinjam = rows[0];
    if (!pinjam) {
      conn.release();
      return res.status(404).json({ message: 'Tidak ditemukan' });
    }

    const isCash = b.kategori === 'UANG';
    const nPokokRaw = Math.round(Number(b.pokok) || 0);
    const nJual = Math.round(Number(b.harga_jual_tunai) || 0);
    const nBeli = Math.round(Number(b.harga_beli) || 0);
    const nDP = Math.round(Number(b.dp) || 0);
    const nTT = Math.round(Number(b.tukar_tambah) || 0);
    const nBungaPersen = Number(b.bunga_persen) || 0;

    const dasarBunga = isCash ? nPokokRaw : (nJual - nTT);
    const hitungBunga = Math.round((Math.max(0, dasarBunga) * nBungaPersen) / 100);
    const hitungHutangHBP = isCash ? nPokokRaw : (nJual - nDP - nTT);
    const totalTagihanFinal = hitungHutangHBP + hitungBunga;
    const sisaTagihanFinal = Math.max(0, totalTagihanFinal - (pinjam.terbayar || 0));

    const oldNet = (pinjam.kategori === 'UANG' ? pinjam.pokok : (pinjam.ambil_uang_kas ? pinjam.jumlah_potong_kas : 0)) - (pinjam.kategori === 'UANG' ? 0 : (pinjam.dp || 0));
    const newNet = (isCash ? nPokokRaw : (Number(b.ambil_uang_kas) ? Number(b.jumlah_potong_kas || nBeli) : 0)) - (isCash ? 0 : nDP);
    const diffKas = newNet - oldNet;

    await conn.beginTransaction();
    await conn.execute(`UPDATE pinjaman SET 
        kategori = ?, pokok = ?, bunga_persen = ?, total_bunga = ?, 
        total_tagihan = ?, sisa_tagihan = ?, keperluan = ?, tanggal_pinjam = ?,
        harga_beli = ?, harga_jual_tunai = ?, metode_pembayaran = ?, ambil_uang_kas = ?,
        jumlah_potong_kas = ?, dp = ?, tukar_tambah = ?, nama_produk = ?,
        tipe_cicilan = ?, nominal_cicilan = ?, tenor_bulan = ?,
        tanggal_jatuh_tempo = ?, keterangan_tt = ?, stok_unit_id = ?
        WHERE id = ?`,
      [
        b.kategori, hitungHutangHBP, nBungaPersen, hitungBunga,
        totalTagihanFinal, sisaTagihanFinal, b.keperluan, b.tanggal_pinjam,
        nBeli, nJual, b.metode_pembayaran || 'CREDIT', b.ambil_uang_kas ? 1 : 0,
        Number(b.jumlah_potong_kas || nBeli), nDP, nTT, b.nama_produk,
        b.tipe_cicilan, Number(b.nominal_cicilan) || 0, Number(b.tenor_bulan) || 0,
        b.tanggal_jatuh_tempo || b.jatuh_tempo_manual, b.keterangan_tt, b.stok_unit_id || null,
        id
      ]);

    if (diffKas !== 0) {
      await conn.execute('UPDATE kas_utama SET saldo = saldo - ?', [diffKas]);
    }

    if (b.stok_unit_id && b.stok_unit_id != pinjam.stok_unit_id) {
        if (pinjam.stok_unit_id) {
          await conn.execute("UPDATE stok_unit SET status = 'TERSEDIA', current_loan_id = NULL, stok = stok + 1 WHERE id = ?", [pinjam.stok_unit_id]);
        }
        await conn.execute("UPDATE stok_unit SET status = 'SEDANG DIKREDIT', current_loan_id = ?, stok = GREATEST(0, CAST(stok AS SIGNED) - 1) WHERE id = ?", [id, b.stok_unit_id]);
    }

    await conn.commit();
    res.json({ message: 'Success Update' });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ message: 'Gagal Update: ' + e.message });
  } finally {
    conn.release();
  }
});

// DELETE Membatalkan Pinjaman
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  const db = await getDB();
  const { id } = req.params;
  const conn = await db.getConnection();
  try {
    const [rows] = await conn.execute('SELECT * FROM pinjaman WHERE id = ?', [id]);
    const pinjam = rows[0];
    if (!pinjam) {
      conn.release();
      return res.status(404).json({ message: 'Tidak ditemukan' });
    }

    const isCash = (pinjam.kategori === 'UANG');
    const isAmbilKas = Number(pinjam.ambil_uang_kas) === 1;

    await conn.beginTransaction();
    const cashOut = isCash ? pinjam.pokok : (isAmbilKas ? pinjam.jumlah_potong_kas : 0);
    const cashIn = !isCash ? (pinjam.dp || 0) : 0;
    const netToRefund = cashOut - cashIn;
    
    if (netToRefund !== 0) {
      await conn.execute('UPDATE kas_utama SET saldo = saldo + ?', [netToRefund]);
    }

    if (pinjam.stok_unit_id) {
      await conn.execute("UPDATE stok_unit SET status = 'TERSEDIA', current_loan_id = NULL, stok = stok + 1 WHERE id = ?", [pinjam.stok_unit_id]);
    }

    await conn.execute('DELETE FROM cicilan_masuk WHERE pinjaman_id = ?', [id]);
    await conn.execute('DELETE FROM pinjaman WHERE id = ?', [id]);
    
    await conn.commit();
    res.json({ message: 'Berhasil Dibatalkan' });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ message: e.message });
  } finally {
    conn.release();
  }
});

// POST Bayar Cicilan (V14.5 - Final Structural Fix)
router.post('/:id/bayar', authMiddleware, async (req, res) => {
  const db = await getDB();
  const { jumlah_bayar, keterangan } = req.body;
  const tanggal_bayar = req.body.tanggal_bayar || new Date().toISOString().split('T')[0];

  const conn = await db.getConnection();
  try {
    const [rows] = await conn.execute(`
      SELECT p.*, kar.nama as nama_karyawan 
      FROM pinjaman p 
      JOIN karyawan kar ON p.karyawan_id = kar.id 
      WHERE p.id = ?`, [req.params.id]);

    const pinjam = rows[0];
    if (!pinjam) {
      conn.release();
      return res.status(404).json({ message: 'Data tidak ditemukan' });
    }

    await conn.beginTransaction();
    const _tagihan = Number(pinjam.total_tagihan) || 0;
    const _bunga = Number(pinjam.total_bunga) || 0;
    const pBunga = _tagihan > 0 ? Math.round((Number(jumlah_bayar) / _tagihan) * _bunga) : 0;
    const pPokok = Number(jumlah_bayar) - pBunga;

    await conn.execute(`INSERT INTO cicilan_masuk (pinjaman_id, jumlah_bayar, porsi_pokok, porsi_bunga, tanggal_bayar, keterangan) 
                VALUES (?, ?, ?, ?, ?, ?)`, 
                [req.params.id, Number(jumlah_bayar), pPokok, pBunga, tanggal_bayar, keterangan || 'Cicilan']);
    
    const [sumRows] = await conn.execute('SELECT SUM(jumlah_bayar) as s FROM cicilan_masuk WHERE pinjaman_id = ?', [req.params.id]);
    const tot = sumRows[0].s;
    const isLunas = (pinjam.total_tagihan - tot) <= 100;

    await conn.execute('UPDATE pinjaman SET terbayar = ?, sisa_tagihan = ?, status = ? WHERE id = ?',
      [tot, Math.max(0, pinjam.total_tagihan - tot), isLunas ? 'lunas' : 'aktif', req.params.id]);

    if (isLunas && pinjam.stok_unit_id) {
      await conn.execute("UPDATE stok_unit SET status = 'LUNAS' WHERE id = ?", [pinjam.stok_unit_id]);
    }

    const nJual = Number(pinjam.harga_jual_tunai) || 0;
    const nBeli = Number(pinjam.harga_beli) || 0;
    const nBunga = Number(pinjam.total_bunga) || 0;
    const nTagihan = Number(pinjam.total_tagihan) || 0;
    
    const markupProfit = (nBeli > 0) ? Math.max(0, nJual - nBeli) : 0;
    const totalPotentialProfit = markupProfit + nBunga;
    const profitRatio = nTagihan > 0 ? totalPotentialProfit / nTagihan : 0;
    const realizedProfit = Math.round(Number(jumlah_bayar) * profitRatio);

    await conn.execute(`INSERT INTO transaksi_kas (tipe, jumlah, keterangan, tanggal) VALUES (?, ?, ?, ?)`,
      ['PROFIT_REALIZED', realizedProfit, `Profit Proporsional PIN ${pinjam.no_pinjaman} (${pinjam.nama_karyawan})`, tanggal_bayar]);

    await conn.execute('UPDATE kas_utama SET saldo = saldo + ?', [Number(jumlah_bayar)]);
    await conn.execute('INSERT INTO transaksi_kas (tipe, jumlah, keterangan, tanggal) VALUES (?, ?, ?, ?)',
      ['masuk', Number(jumlah_bayar), `Cicilan ${pinjam.no_pinjaman} (${pinjam.nama_karyawan})`, tanggal_bayar]);

    await conn.commit();
    res.json({ message: 'Pembayaran Berhasil' });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ message: 'Sistem Error: ' + e.message });
  } finally {
    conn.release();
  }
});

module.exports = router;
