const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Versi V26.15 - Update perhitungan bunga murni 25% dari harga jual

const { initDB } = require('./database/db');
initDB().catch(err => {
  console.error('❌ DATABASE_INIT_FAILED:', err);
});

const app = express();

// 1. CORS: Hanya aktif saat development (production pakai satu server)
app.use(cors());

// 2. PEMBACA DATA: Mendukung JSON dan Form biasa dengan limit besar
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 3. MONITORING: Log di Terminal agar kita tahu koneksi masuk
app.use((req, res, next) => {
  console.log(`📡 [${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  if (req.method === 'POST') console.log('📦 Data Masuk:', req.body);
  next();
});

// Import rute setelah middleware parser
const authRoutes = require('./routes/auth');
const kasbonRoutes = require('./routes/kasbon');
const karyawanRoutes = require('./routes/karyawan');
const dashboardRoutes = require('./routes/dashboard');
const kasRoutes = require('./routes/kas');
const notifRoutes = require('./routes/notif');
const stokRoutes = require('./routes/stok');

app.use('/api/auth', authRoutes);
app.use('/api/kasbon', kasbonRoutes);
app.use('/api/karyawan', karyawanRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/kas', kasRoutes);
app.use('/api/notif', notifRoutes);
app.use('/api/stok', stokRoutes);

// ============================================================
// PRODUCTION: Layani file React build sebagai static files
// ============================================================
const FRONTEND_BUILD = path.join(__dirname, 'public');
if (require('fs').existsSync(FRONTEND_BUILD)) {
  app.use(express.static(FRONTEND_BUILD));
  // SPA Fallback: semua route non-API diarahkan ke index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(FRONTEND_BUILD, 'index.html'));
  });
  console.log('✅ [PRODUCTION MODE] Melayani frontend dari:', FRONTEND_BUILD);
}

// PORT dari env (cPanel hosting) atau fallback ke 5000 untuk development
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server Siap di http://127.0.0.1:${PORT}`);
  });
}

module.exports = app;
