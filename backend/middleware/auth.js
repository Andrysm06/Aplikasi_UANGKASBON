const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token tidak ditemukan' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Token tidak valid' });
  }
}

// 1. Admin ONLY (Very strict)
function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Akses ditolak' });
  next();
}

// 2. Admin OR Manager (V6.11.6 - UNTUK MENU PENGATURAN)
function adminOrManager(req, res, next) {
  if (!['admin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Khusus Admin/Manager: Akses ditolak' });
  }
  next();
}

module.exports = { authMiddleware, adminOnly, adminOrManager };
