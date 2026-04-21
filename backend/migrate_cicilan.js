const db3 = require('better-sqlite3');
const dbs = ['kasbon.db', 'kasbon_v3.db', 'kasbon_v5.db', 'kasbon_v6.db', 'kasbon_production.db'];

dbs.forEach(name => {
  try {
    const d = db3('./database/' + name);
    const tables = d.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='cicilan_masuk'").get();
    if (!tables) {
      console.log(name + ': no cicilan_masuk table, skipping');
      d.close();
      return;
    }
    const cols = d.prepare('PRAGMA table_info(cicilan_masuk)').all().map(c => c.name);
    if (!cols.includes('porsi_pokok')) {
      d.exec('ALTER TABLE cicilan_masuk ADD COLUMN porsi_pokok INTEGER DEFAULT 0');
      console.log(name + ': ✅ Added porsi_pokok');
    }
    if (!cols.includes('porsi_bunga')) {
      d.exec('ALTER TABLE cicilan_masuk ADD COLUMN porsi_bunga INTEGER DEFAULT 0');
      console.log(name + ': ✅ Added porsi_bunga');
    }
    if (cols.includes('porsi_pokok') && cols.includes('porsi_bunga')) {
      console.log(name + ': Already OK ✓');
    }
    d.close();
  } catch (e) {
    console.log(name + ': ERROR -', e.message);
  }
});

console.log('Migration selesai!');
