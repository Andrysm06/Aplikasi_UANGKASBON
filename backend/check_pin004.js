const db = require('better-sqlite3')('./database/kasbon_production.db');
const r = db.prepare("SELECT id, no_pinjaman, kategori, pokok, bunga_persen, total_bunga, total_tagihan, sisa_tagihan, terbayar, harga_jual_tunai, harga_beli, dp, tukar_tambah, tipe_cicilan, nominal_cicilan, tenor_bulan, status FROM pinjaman WHERE no_pinjaman='PIN-2026-004'").get();
console.log(JSON.stringify(r, null, 2));
db.close();
