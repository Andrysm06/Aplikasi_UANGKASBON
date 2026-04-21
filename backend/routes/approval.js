const express = require('express');
const router = express.Router();
const { getDB } = require('../database/db');
const { authMiddleware, approverOnly } = require('../middleware/auth');

router.get('/', authMiddleware, approverOnly, async (req, res) => {
  const db = await getDB();
  try {
    const [rows] = await db.execute(`SELECT k.*, kar.nama as nama_karyawan, kar.nik, kar.departemen
      FROM kasbon k LEFT JOIN karyawan kar ON k.karyawan_id = kar.id
      WHERE k.status = 'pending' ORDER BY k.tanggal_pengajuan ASC`);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.put('/:id/approve', authMiddleware, approverOnly, async (req, res) => {
  const db = await getDB();
  const { catatan_approval } = req.body;
  try {
    const [rows] = await db.execute('SELECT * FROM kasbon WHERE id = ?', [req.params.id]);
    const existing = rows[0];
    if (!existing) return res.status(404).json({ message: 'Kasbon tidak ditemukan' });
    if (existing.status !== 'pending') return res.status(400).json({ message: 'Kasbon sudah diproses' });
    
    await db.execute(`UPDATE kasbon SET status='approved', approved_by=?, approved_at=CURRENT_TIMESTAMP, catatan_approval=? WHERE id=?`,
      [req.user.id, catatan_approval || '', req.params.id]);
    res.json({ message: 'Kasbon disetujui' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.put('/:id/reject', authMiddleware, approverOnly, async (req, res) => {
  const db = await getDB();
  const { catatan_approval } = req.body;
  try {
    const [rows] = await db.execute('SELECT * FROM kasbon WHERE id = ?', [req.params.id]);
    const existing = rows[0];
    if (!existing) return res.status(404).json({ message: 'Kasbon tidak ditemukan' });
    if (existing.status !== 'pending') return res.status(400).json({ message: 'Kasbon sudah diproses' });
    
    await db.execute(`UPDATE kasbon SET status='rejected', approved_by=?, approved_at=CURRENT_TIMESTAMP, catatan_approval=? WHERE id=?`,
      [req.user.id, catatan_approval || '', req.params.id]);
    res.json({ message: 'Kasbon ditolak' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
