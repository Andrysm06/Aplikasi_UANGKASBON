const express = require('express');
const router = express.Router();
const { getDB } = require('../database/db');
const { authMiddleware } = require('../middleware/auth');

// 1. Ambil Semua Notifikasi (V7.1)
router.get('/', authMiddleware, async (req, res) => {
  const db = await getDB();
  
  try {
    // LOGIKA: Cek Otomatis Saldo Saat Dibuka (Check-on-Fetch)
    const [kasRows] = await db.execute('SELECT saldo FROM kas_utama LIMIT 1');
    const kas = kasRows[0];
    if (kas && kas.saldo < 1000000) {
       const [existsRows] = await db.execute("SELECT * FROM notifikasi WHERE pesan LIKE '%Menipis%' AND created_at > DATE_SUB(NOW(), INTERVAL 1 DAY) LIMIT 1");
       if (existsRows.length === 0) {
          await db.execute("INSERT INTO notifikasi (tipe, pesan) VALUES (?, ?)", ['warning', `⚠️ Warning: Saldo Kas Sisa Rp ${kas.saldo.toLocaleString()}. Segera Setor Modal.`]);
       }
    }

    const [list] = await db.execute('SELECT * FROM notifikasi ORDER BY created_at DESC LIMIT 20');
    const [unreadRows] = await db.execute('SELECT COUNT(*) as c FROM notifikasi WHERE dibaca = 0');
    const unread = unreadRows[0].c;
    
    res.json({ list, unread });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// 2. Tandai Semuanya Sudah Dibaca
router.put('/read-all', authMiddleware, async (req, res) => {
  const db = await getDB();
  await db.execute('UPDATE notifikasi SET dibaca = 1');
  res.json({ message: 'Success' });
});

// 3. Tambah Notifikasi Manual (Internal Use)
router.post('/', async (req, res) => {
  const db = await getDB();
  const { tipe, pesan } = req.body;
  await db.execute('INSERT INTO notifikasi (tipe, pesan) VALUES (?, ?)', [tipe, pesan]);
  res.json({ message: 'Notif Sent' });
});

module.exports = router;
