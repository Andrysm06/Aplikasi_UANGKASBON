const express = require('express');
const router = express.Router();
const { getDB } = require('../database/db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// GET Semua Karyawan (V5.5.8)
router.get('/', authMiddleware, async (req, res) => {
  const db = await getDB();
  const search = req.query.search || '';
  try {
    const [rows] = await db.execute('SELECT * FROM karyawan WHERE nama LIKE ? OR nik LIKE ?', [`%${search}%`, `%${search}%`]);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// POST Tambah Karyawan Baru (V5.5.8)
router.post('/', authMiddleware, adminOnly, async (req, res) => {
  const db = await getDB();
  let { nik, nama, departemen, jabatan, no_hp, email, tgl_masuk } = req.body;
  if (!nama) return res.status(400).json({ message: 'Nama Lengkap wajib diisi!' });
  if (!nik) nik = 'EMP-' + Date.now().toString().slice(-6);
  
  try {
    await db.execute(`INSERT INTO karyawan (nik, nama, departemen, jabatan, no_hp, email, tgl_masuk) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`, 
                [nik, nama, departemen || '-', jabatan || '-', no_hp || '-', email || '-', tgl_masuk || null]);
    res.json({ message: 'Profil Karyawan Berhasil Disimpan' });
  } catch (e) {
    res.status(400).json({ message: 'Gagal Simpan: ' + e.message });
  }
});

// PUT Update Profil Karyawan (V5.5.8)
router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
  const db = await getDB();
  const { nama, jabatan, no_hp, tgl_masuk } = req.body;
  if (!nama) return res.status(400).json({ message: 'Nama Lengkap wajib diisi!' });
  
  try {
    await db.execute(`UPDATE karyawan SET nama = ?, jabatan = ?, no_hp = ?, tgl_masuk = ? WHERE id = ?`,
                [nama, jabatan || '-', no_hp || '-', tgl_masuk || null, req.params.id]);
    res.json({ message: 'Profil Karyawan Berhasil Diperbarui' });
  } catch (e) {
    res.status(400).json({ message: 'Gagal Perbarui: ' + e.message });
  }
});

// DELETE Hapus Karyawan (V5.5.8)
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  const db = await getDB();
  const { id } = req.params;
  
  try {
    // CEK apakah karyawan punya pinjaman aktif?
    const [rows] = await db.execute("SELECT id FROM pinjaman WHERE karyawan_id = ? AND status = 'aktif' LIMIT 1", [id]);
    if (rows.length > 0) return res.status(400).json({ message: 'Gagal! Karyawan masih memiliki pinjaman aktif.' });

    // Hapus data karyawan
    await db.execute('DELETE FROM karyawan WHERE id = ?', [id]);
    res.json({ message: 'Profil Karyawan Berhasil Dihapus' });
  } catch (e) {
    res.status(500).json({ message: 'Error Server: ' + e.message });
  }
});

module.exports = router;
