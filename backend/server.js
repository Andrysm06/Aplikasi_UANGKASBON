const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { initDB } = require('./database/db');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Inisialisasi Database (Tanpa await agar tidak menghalangi startup)
initDB().catch(err => console.error('DB_INIT_ERROR:', err));

// Rute Tes (Fleksibel)
app.get(['/api/test', '/test'], (req, res) => res.json({ status: 'OK', time: new Date() }));

// Diagnosa Database (Fleksibel)
app.get(['/api/diag', '/diag'], async (req, res) => {
  try {
    const { getDB } = require('./database/db');
    const db = await getDB();
    await db.execute('SELECT 1');
    res.json({ status: 'Koneksi Database SUKSES!', provider: 'Cloudhebat MySQL' });
  } catch (e) {
    res.status(500).json({ status: 'Koneksi Database GAGAL', error: e.message });
  }
});

// Import Rute Asli
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

app.get('/', (req, res) => res.send('Backend Uang Kasbon is Active'));

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log('Server running on port ' + PORT));
}

module.exports = app;
