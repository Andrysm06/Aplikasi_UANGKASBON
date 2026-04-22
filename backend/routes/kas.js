const express = require('express');
const router = express.Router();
const { getDB } = require('../database/db');
const { authMiddleware, adminOnly } = require('../middleware/auth');
 
// EMERGENCY RESET: Paksa buat baris kas_utama id=1
router.get('/reset-saldo', authMiddleware, adminOnly, async (req, res) => {
  const db = await getDB();
  try {
    const [rows] = await db.execute('SELECT * FROM kas_utama LIMIT 1');
    if (rows.length === 0) {
      await db.execute('INSERT INTO kas_utama (id, saldo) VALUES (1, 0)');
      return res.json({ message: 'Baris saldo berhasil dibuat dari nol (0)' });
    }
    res.json({ message: 'Baris saldo sudah ada', data: rows[0] });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// GET Saldo & History Kas
router.get('/', authMiddleware, async (req, res) => {
  const db = await getDB();
  const [rowSaldo] = await db.execute('SELECT saldo, updated_at FROM kas_utama LIMIT 1');
  const [recentHistory] = await db.execute('SELECT * FROM transaksi_kas ORDER BY tanggal DESC LIMIT 50');
  res.json({ saldo: rowSaldo[0]?.saldo || 0, recentHistory });
});

// POST Tambah Saldo (Uang Masuk)
router.post('/modal', authMiddleware, adminOnly, async (req, res) => {
  const db = await getDB();
  const { jumlah, keterangan } = req.body;
  if (!jumlah || jumlah <= 0) return res.status(400).json({ message: 'Jumlah tidak valid' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [checkKas] = await conn.execute('SELECT id FROM kas_utama LIMIT 1');
    if (checkKas.length === 0) {
      await conn.execute('INSERT INTO kas_utama (id, saldo) VALUES (1, ?)', [jumlah]);
    } else {
      await conn.execute('UPDATE kas_utama SET saldo = saldo + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [jumlah, checkKas[0].id]);
    }
    await conn.execute('INSERT INTO transaksi_kas (tipe, jumlah, keterangan) VALUES (?, ?, ?)', ['masuk', jumlah, keterangan || 'Uang Masuk/Modal']);
    await conn.commit();
    res.json({ message: 'Saldo berhasil ditambahkan' });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ message: 'Gagal: ' + e.message });
  } finally {
    conn.release();
  }
});

// POST Kurangi Saldo (Uang Keluar)
router.post('/tarik', authMiddleware, adminOnly, async (req, res) => {
  const db = await getDB();
  const { jumlah, keterangan } = req.body;
  if (!jumlah || jumlah <= 0) return res.status(400).json({ message: 'Jumlah tidak valid' });

  const conn = await db.getConnection();
  try {
    const [rows] = await conn.execute('SELECT saldo FROM kas_utama LIMIT 1');
    const kas = rows[0];
    if (Number(jumlah) > (kas?.saldo || 0)) {
      conn.release();
      return res.status(400).json({ message: 'Saldo tidak mencukupi untuk ditarik' });
    }

    await conn.beginTransaction();
    const [checkKas] = await conn.execute('SELECT id FROM kas_utama LIMIT 1');
    if (checkKas.length === 0) {
       // Jika tidak ada data kas, anggap saldo 0, maka tarik akan gagal di atas
       await conn.rollback();
       conn.release();
       return res.status(400).json({ message: 'Saldo tidak tersedia' });
    }
    await conn.execute('UPDATE kas_utama SET saldo = saldo - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [jumlah, checkKas[0].id]);
    await conn.execute('INSERT INTO transaksi_kas (tipe, jumlah, keterangan) VALUES (?, ?, ?)', ['keluar', jumlah, keterangan || 'Penarikan Kas']);
    await conn.commit();
    res.json({ message: 'Saldo berhasil dikurangi' });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ message: 'Gagal: ' + e.message });
  } finally {
    conn.release();
  }
});

module.exports = router;
