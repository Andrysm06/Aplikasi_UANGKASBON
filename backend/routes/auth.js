const express = require('express');
const router = express.Router();
const { authMiddleware, adminOrManager } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const MASTER_PIN = '2002106'; // KUNCI UTAMA ANDA
const { getDB, ensureInit } = require('../database/db');

// LOGIN CERDAS (V6.13.2) - MENDUKUNG PIN DAN USER/PASS
router.post('/login', async (req, res) => {
  try {
    await ensureInit();
    const db = await getDB();
    const { p, username, password } = req.body;

    let user = null;

    // A. SISTEM LOGIN PIN (Paling Utama)
    if (p) {
       if (p === MASTER_PIN) {
          const [rows] = await db.execute('SELECT * FROM users WHERE role = ? OR id = 1 LIMIT 1', ['admin']);
          user = rows[0];
       } else {
          const [all] = await db.execute('SELECT * FROM users');
          user = all.find(u => u.username !== 'admin' && bcrypt.compareSync(p, u.password));
       }
    } 
    // B. SISTEM LOGIN USERNAME/PASSWORD (Alternatif)
    else if (username && password) {
       const [rows] = await db.execute('SELECT * FROM users WHERE username = ? LIMIT 1', [username]);
       if (rows[0] && bcrypt.compareSync(password, rows[0].password)) user = rows[0];
    }

    if (!user) {
       return res.status(401).json({ message: 'Akses Ditolak: PIN/Login Salah!' });
    }

    if (!process.env.JWT_SECRET) {
       throw new Error('JWT_SECRET is missing in environment variables');
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role, nama: user.nama }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, user: { id: user.id, username: user.username, role: user.role, nama: user.nama } });

  } catch (e) {
    console.error('LOGIN_ERROR:', e);
    const { migrationStatus } = require('../database/db');
    res.status(500).json({ 
      message: 'DASHBOARD_ERROR: ' + e.message,
      migration: migrationStatus,
      hint: 'Periksa environment variables (MYSQL_HOST, JWT_SECRET, dll) di Vercel Dashboard.'
    });
  }
});

// GET Daftar User (V6.11)
router.get('/users', authMiddleware, adminOrManager, async (req, res) => {
  const db = await getDB();
  const [rows] = await db.execute('SELECT id, nama, username, role FROM users');
  res.json(rows);
});

// REGISTER User
router.post('/register', authMiddleware, adminOrManager, async (req, res) => {
  const db = await getDB();
  const { nama, username, password, role } = req.body;
  try {
    const hash = bcrypt.hashSync(password, 10);
    await db.execute('INSERT INTO users (nama, username, password, role) VALUES (?, ?, ?, ?)', [nama, username, hash, role || 'staff']);
    res.json({ message: 'Akses Berhasil Dibuat!' });
  } catch (e) { res.status(400).json({ message: 'Gagal: Username sudah ada!' }); }
});

// DELETE User
router.delete('/users/:id', authMiddleware, adminOrManager, async (req, res) => {
  const db = await getDB();
  if (req.params.id == 1) return res.status(400).json({ message: 'Admin tidak bisa dihapus' });
  try {
    await db.execute('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'Dihapus' });
  } catch (e) { res.status(500).json({ message: 'Gagal' }); }
});

module.exports = router;
