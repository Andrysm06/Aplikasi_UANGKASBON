const express = require('express');
const router = express.Router();
const { getDB } = require('../database/db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

router.get('/', authMiddleware, async (req, res) => {
  const db = await getDB();
  try {
    const [rows] = await db.execute('SELECT * FROM setting');
    const settings = {};
    rows.forEach(r => settings[r.key] = r.value);
    res.json(settings);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.put('/', authMiddleware, adminOnly, async (req, res) => {
  const db = await getDB();
  const entries = Object.entries(req.body);
  try {
    for (const [key, value] of entries) {
      await db.execute('INSERT INTO setting (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)', [key, String(value)]);
    }
    res.json({ message: 'Pengaturan disimpan' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
