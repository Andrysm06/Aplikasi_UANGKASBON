const express = require('express');
const router = express.Router();
const { getDB } = require('../database/db');
const { authMiddleware } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

// GET semua stok
router.get('/', authMiddleware, async (req, res) => {
  const db = await getDB();
  const { kategori, kondisi, search, status } = req.query;
  
  let query = `
    SELECT s.*, 
           p.sisa_tagihan, p.tenor_bulan, p.terbayar, p.total_tagihan, p.nominal_cicilan, p.no_pinjaman, p.tanggal_pinjam, p.tipe_cicilan,
           kar.nama as nama_peminjam,
           (SELECT COUNT(*) FROM cicilan_masuk cm WHERE cm.pinjaman_id = p.id) as cicilan_count
    FROM stok_unit s 
    LEFT JOIN pinjaman p ON s.current_loan_id = p.id
    LEFT JOIN karyawan kar ON p.karyawan_id = kar.id
    WHERE 1=1
  `;
  const params = [];

  if (kategori && kategori !== 'SEMUA') {
    query += ` AND s.kategori = ?`;
    params.push(kategori);
  }
  if (kondisi && kondisi !== 'SEMUA') {
    query += ` AND s.kondisi = ?`;
    params.push(kondisi);
  }
  if (status && status !== 'SEMUA') {
    query += ` AND s.status = ?`;
    params.push(status);
  }
  if (search) {
    query += ` AND (s.nama_produk LIKE ? OR s.merek LIKE ? OR s.tipe LIKE ?)`;
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  query += ` ORDER BY s.created_at DESC`;
  try {
    const [rows] = await db.execute(query, params);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// GET satu item stok
router.get('/:id', authMiddleware, async (req, res) => {
  const db = await getDB();
  try {
    const [rows] = await db.execute(`
      SELECT s.*, p.sisa_tagihan, p.tenor_bulan, p.terbayar, p.total_tagihan, p.nominal_cicilan, p.tipe_cicilan, kar.nama as nama_peminjam
      FROM stok_unit s 
      LEFT JOIN pinjaman p ON s.current_loan_id = p.id
      LEFT JOIN karyawan kar ON p.karyawan_id = kar.id
      WHERE s.id = ?
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Data tidak ditemukan' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// POST tambah stok baru
router.post('/', authMiddleware, async (req, res) => {
  const db = await getDB();
  const {
    kategori, nama_produk, merek, tipe,
    kondisi, stok, harga_beli, harga_jual, status, keterangan,
    is_tt, tt_barang, tt_merek, tt_tipe, tt_harga, tt_harga_jual, tt_profit
  } = req.body;

  if (!kategori || !nama_produk || !kondisi) {
    return res.status(400).json({ message: 'Kategori, nama produk, dan kondisi wajib diisi' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const cleanStatus = (status || 'TERSEDIA').trim().toUpperCase();
    const finalStok = (cleanStatus === 'TERJUAL' || cleanStatus === 'TERJUAL (TT)' || cleanStatus === 'LUNAS' || cleanStatus === 'SEDANG DIKREDIT') ? 0 : (Number(stok) || 0);
    const realIsTT = (is_tt === true || is_tt === 1 || is_tt === 'true' || is_tt === '1');

    const [dbResult] = await conn.execute(`
      INSERT INTO stok_unit 
        (kategori, nama_produk, merek, tipe, kondisi, stok, harga_beli, harga_jual, status, keterangan, 
         is_tt, tt_barang, tt_merek, tt_tipe, tt_harga, tt_harga_jual, tt_profit)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        kategori, nama_produk, merek || '', tipe || '',
        kondisi, finalStok, 
        Number(harga_beli) || 0, Number(harga_jual) || 0, cleanStatus, keterangan || '',
        realIsTT ? 1 : 0, tt_barang || '', tt_merek || '', tt_tipe || '', 
        Number(tt_harga) || 0, Number(tt_harga_jual) || 0, Number(tt_profit) || 0
      ]);

    const newId = dbResult.insertId;

    if (cleanStatus === 'TERJUAL' || cleanStatus === 'TERJUAL (TT)') {
      const nJual = Number(harga_jual) || 0;
      const nBeli = Number(harga_beli) || 0;
      const ttProfitNum = Number(tt_profit) || 0;
      const profitTotal = Math.max(0, nJual - nBeli) + ttProfitNum;

      if (nJual > 0) {
        await conn.execute('UPDATE kas_utama SET saldo = saldo + ?', [nJual]);
        await conn.execute('INSERT INTO transaksi_kas (tipe, jumlah, keterangan) VALUES (?, ?, ?)', ['masuk', nJual, `Penjualan Cash + TT: ${nama_produk}`]);

        if (profitTotal > 0) {
          await conn.execute('INSERT INTO transaksi_kas (tipe, jumlah, keterangan) VALUES (?, ?, ?)', ['PROFIT_REALIZED', profitTotal, `Profit Penjualan Cash + TT: ${nama_produk}`]);
        }
      }

      if (realIsTT && tt_barang && Number(tt_harga) > 0) {
        await conn.execute(`
          INSERT INTO stok_unit (kategori, nama_produk, merek, tipe, kondisi, stok, harga_beli, harga_jual, status, keterangan)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [kategori || 'HP', tt_barang.toUpperCase(), tt_merek || '', tt_tipe || '', 'BEKAS', 1, Number(tt_harga), Number(tt_harga_jual) || 0, 'TERSEDIA', `Barang masuk dari Tukar Tambah unit: ${nama_produk}`]);
      }
    }

    await conn.commit();
    res.status(201).json({ message: 'Stok berhasil ditambahkan', id: newId });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ message: 'Gagal Simpan Stok: ' + e.message });
  } finally {
    conn.release();
  }
});

// PUT update stok
router.put('/:id', authMiddleware, async (req, res) => {
  const db = await getDB();
  const {
    kategori, nama_produk, merek, tipe,
    kondisi, stok, harga_beli, harga_jual, status, keterangan,
    is_tt, tt_barang, tt_merek, tt_tipe, tt_harga, tt_harga_jual, tt_profit
  } = req.body;

  const conn = await db.getConnection();
  try {
    const [rows] = await conn.execute('SELECT * FROM stok_unit WHERE id = ?', [req.params.id]);
    const existing = rows[0];
    if (!existing) {
      conn.release();
      return res.status(404).json({ message: 'Data tidak ditemukan' });
    }

    const cleanStatus = (status || existing.status).trim().toUpperCase();
    const isTransitionToTerjual = ((cleanStatus === 'TERJUAL' || cleanStatus === 'TERJUAL (TT)') && 
                                   (existing.status || '').toUpperCase() !== 'TERJUAL' && 
                                   (existing.status || '').toUpperCase() !== 'TERJUAL (TT)');

    await conn.beginTransaction();
    const finalStok = (cleanStatus === 'TERJUAL' || cleanStatus === 'TERJUAL (TT)' || cleanStatus === 'LUNAS' || cleanStatus === 'SEDANG DIKREDIT') ? 0 : (Number(stok) || 0);
    const realIsTT = (is_tt === true || is_tt === 1 || is_tt === 'true' || is_tt === '1');

    await conn.execute(`
      UPDATE stok_unit SET
        kategori = ?, nama_produk = ?, merek = ?, tipe = ?,
        kondisi = ?, stok = ?, harga_beli = ?, harga_jual = ?, status = ?, keterangan = ?,
        is_tt = ?, tt_barang = ?, tt_merek = ?, tt_tipe = ?, tt_harga = ?, tt_harga_jual = ?, tt_profit = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
        kategori || existing.kategori, nama_produk || existing.nama_produk, merek || existing.merek || '', tipe || existing.tipe || '',
        kondisi || existing.kondisi, finalStok, Number(harga_beli) || 0, Number(harga_jual) || 0, cleanStatus, keterangan || '',
        realIsTT ? 1 : 0, tt_barang || '', tt_merek || '', tt_tipe || '', Number(tt_harga) || 0, Number(tt_harga_jual) || 0, Number(tt_profit) || 0,
        req.params.id
      ]);

    if (cleanStatus === 'TERJUAL' || cleanStatus === 'TERJUAL (TT)') {
      const nJual = Number(harga_jual || existing.harga_jual) || 0;
      const nBeli = Number(harga_beli || existing.harga_beli) || 0;
      const ttProfitNum = Number(tt_profit) || 0;
      const profitTotal = Math.max(0, nJual - nBeli) + ttProfitNum;

      if (isTransitionToTerjual && nJual > 0) {
        await conn.execute('UPDATE kas_utama SET saldo = saldo + ?', [nJual]);
        await conn.execute('INSERT INTO transaksi_kas (tipe, jumlah, keterangan) VALUES (?, ?, ?)', ['masuk', nJual, `Penjualan Cash + TT: ${nama_produk || existing.nama_produk}`]);

        if (profitTotal > 0) {
          await conn.execute('INSERT INTO transaksi_kas (tipe, jumlah, keterangan) VALUES (?, ?, ?)', ['PROFIT_REALIZED', profitTotal, `Profit Penjualan Cash + TT: ${nama_produk || existing.nama_produk}`]);
        }
      }

      if (realIsTT && tt_barang && Number(tt_harga) > 0) {
        const checkKeterangan = `Barang masuk dari Tukar Tambah unit: ${nama_produk || existing.nama_produk}`;
        const [dupRows] = await conn.execute('SELECT id FROM stok_unit WHERE nama_produk = ? AND harga_beli = ? AND keterangan = ?', [tt_barang.toUpperCase(), Number(tt_harga), checkKeterangan]);

        if (dupRows.length === 0) {
          await conn.execute(`
            INSERT INTO stok_unit (kategori, nama_produk, merek, tipe, kondisi, stok, harga_beli, harga_jual, status, keterangan)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [kategori || 'HP', tt_barang.toUpperCase(), tt_merek || '', tt_tipe || '', 'BEKAS', 1, Number(tt_harga), Number(tt_harga_jual) || 0, 'TERSEDIA', checkKeterangan]);
        }
      }
    }

    await conn.commit();
    res.json({ message: 'Data berhasil diperbarui' });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ message: 'Gagal Update: ' + e.message });
  } finally {
    conn.release();
  }
});

// DELETE hapus stok
router.delete('/:id', authMiddleware, async (req, res) => {
  const db = await getDB();
  const conn = await db.getConnection();
  try {
    const [rows] = await conn.execute('SELECT * FROM stok_unit WHERE id = ?', [req.params.id]);
    const existing = rows[0];
    if (!existing) {
      conn.release();
      return res.status(404).json({ message: 'Data tidak ditemukan' });
    }

    await conn.beginTransaction();
    if (existing.status && (existing.status.trim().toUpperCase() === 'TERJUAL')) {
      const hBeli = Number(existing.harga_beli) || 0;
      const hJual = Number(existing.harga_jual) || 0;
      const profit = hJual - hBeli;

      await conn.execute("UPDATE kas_utama SET saldo = saldo - ?, updated_at = CURRENT_TIMESTAMP", [hJual]);
      await conn.execute("INSERT INTO transaksi_kas (tipe, jumlah, keterangan) VALUES ('keluar', ?, ?)", [hJual, `BATAL TERJUAL (UNIT DIHAPUS): ${existing.nama_produk}`]);

      if (profit > 0) {
        await conn.execute("INSERT INTO transaksi_kas (tipe, jumlah, keterangan) VALUES ('PROFIT_REALIZED', ?, ?)", [-profit, `PEMBATALAN PROFIT (UNIT DIHAPUS): ${existing.nama_produk}`]);
      }
    }

    await conn.execute('DELETE FROM stok_unit WHERE id = ?', [req.params.id]);
    await conn.commit();
    res.json({ message: 'Data berhasil dihapus' });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ message: 'Gagal Hapus: ' + e.message });
  } finally {
    conn.release();
  }
});

module.exports = router;
