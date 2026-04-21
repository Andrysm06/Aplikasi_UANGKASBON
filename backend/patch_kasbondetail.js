const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/src/pages/KasbonDetail.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Add Tukar Tambah row in breakdown (after the DP row, before Total Tagihan Final)
// Also fix the bunga label - it says "Gross" but for records with TT, bunga basis is net
const oldDPBlock = `                           {data.dp > 0 && (
                              <div className="flex justify-between text-[9px] text-emerald-400 font-black italic">
                                 <span className="uppercase font-bold underline">Setoran Tunai / DP (-) :</span>
                                 <span>-{formatCurrency(data.dp)}</span>
                              </div>
                           )}`;

const newDPBlock = `                           {data.dp > 0 && (
                              <div className="flex justify-between text-[9px] text-emerald-400 font-black italic">
                                 <span className="uppercase font-bold underline">Setoran Tunai / DP (-) :</span>
                                 <span>-{formatCurrency(data.dp)}</span>
                              </div>
                           )}

                           {data.tukar_tambah > 0 && (
                              <div className="flex justify-between text-[9px] text-amber-400 font-black italic">
                                 <span className="uppercase font-bold underline">Tukar Tambah / TT (-) :</span>
                                 <span>-{formatCurrency(data.tukar_tambah)}</span>
                              </div>
                           )}`;

if (content.includes(oldDPBlock)) {
  content = content.replace(oldDPBlock, newDPBlock);
  console.log('✅ TT row added to breakdown');
} else {
  console.log('❌ DP block not found. Checking for partial match...');
  if (content.includes('Setoran Tunai / DP')) {
    console.log('  Found "Setoran Tunai" reference');
  }
}

// Fix bunga label - remove "(Gross)" since it's actually net-of-TT based
const oldBungaLabel = 'Biaya Bunga (Bunga {data.bunga_persen}% Gross) :';
const newBungaLabel = 'Biaya Bunga ({data.bunga_persen}%) :';
if (content.includes(oldBungaLabel)) {
  content = content.replace(oldBungaLabel, newBungaLabel);
  console.log('✅ Bunga label simplified');
} else {
  console.log('⚠️  Bunga label not found or already fixed');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done!');
