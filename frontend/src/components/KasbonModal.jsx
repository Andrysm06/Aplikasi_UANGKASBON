import React, { useState, useEffect } from 'react';
import { FiX, FiDollarSign, FiCalendar, FiChevronDown, FiRefreshCw, FiUser, FiPackage, FiActivity, FiTag, FiFileText } from 'react-icons/fi';
import api from '../api/axios';
import { formatIDR, parseIDR, formatCurrency, formatDateShort } from '../utils/helpers';
import toast from 'react-hot-toast';

export default function KasbonModal({ onClose, onSuccess, initialData }) {
  const [karyawan, setKaryawan] = useState([]);
  const [form, setForm] = useState({
    karyawan_id: initialData?.karyawan_id || '',
    kategori: initialData?.kategori || 'UANG',
    kategori_lain: (!['UANG', 'HP', 'TV'].includes(initialData?.kategori) && initialData?.kategori) ? initialData.kategori : '',
    pokok_display: initialData ? (['HP', 'TV', 'Lainnya'].includes(initialData.kategori) ? formatIDR(initialData.harga_jual_tunai) : formatIDR(initialData.pokok)) : '', 
    bunga_persen: initialData?.bunga_persen !== undefined ? initialData.bunga_persen : ((initialData?.kategori || 'UANG') === 'UANG' ? 30 : 25),
    tanggal_pinjam: initialData?.tanggal_pinjam || new Date().toISOString().split('T')[0],
    keperluan: initialData?.keperluan || '',
    ambil_uang_kas: initialData?.ambil_uang_kas === 1 || initialData?.ambil_uang_kas === true,
    harga_beli_display: initialData?.harga_beli ? formatIDR(initialData.harga_beli) : '',
    harga_jual_cash_display: initialData?.harga_jual_tunai ? formatIDR(initialData.harga_jual_tunai) : '',
    dp_display: initialData?.dp ? formatIDR(initialData.dp) : '0',
    tukar_tambah_display: initialData?.tukar_tambah ? formatIDR(initialData.tukar_tambah) : '0',
    nama_produk: initialData?.nama_produk || '',
    metode_pembayaran: initialData?.metode_pembayaran || 'CREDIT',
    tipe_cicilan: initialData?.tipe_cicilan || ((initialData?.kategori || 'UANG') === 'UANG' ? 'PER_RIT' : 'PER_BULAN'),
    nominal_cicilan_display: initialData?.nominal_cicilan ? formatIDR(initialData.nominal_cicilan) : '',
    tenor_bulan: initialData?.tenor_bulan || '8',
    jatuh_tempo_manual: initialData?.tanggal_jatuh_tempo || initialData?.jatuh_tempo_manual || '',
    keterangan_tt: initialData?.keterangan_tt || '',
    stok_unit_id: initialData?.stok_unit_id || ''
  });
  const [availableStok, setAvailableStok] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showNota, setShowNota] = useState(false);
  const [notaData, setNotaData] = useState(null);
  const [isTTActive, setIsTTActive] = useState(Number(initialData?.tukar_tambah) > 0);

  useEffect(() => {
    // Selalu muat data karyawan dan stok agar bisa dipilih saat Edit maupun Baru
    api.get('/karyawan').then(r => setKaryawan(r.data));
    api.get('/stok?status=TERSEDIA').then(r => setAvailableStok(r.data));
  }, []); // Cukup sekali saat modal mounting

  useEffect(() => {
    if (!initialData && form.tanggal_pinjam && !form.jatuh_tempo_manual) {
      const nextMonth = new Date(form.tanggal_pinjam);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      setForm(prev => ({ ...prev, jatuh_tempo_manual: nextMonth.toISOString().split('T')[0] }));
    }
  }, [form.tanggal_pinjam, initialData]);

  // CALCULATION LOGIC (V13 SUPIR FRIENDLY)
  const isProduct = ['HP', 'TV', 'Lainnya'].includes(form.kategori);
  const rawPokokValue = parseIDR(form.pokok_display) || 0;
  const rawHargaBeli = parseIDR(form.harga_beli_display) || 0;
  const rawHargaJual = parseIDR(form.harga_jual_cash_display) || 0;
  const rawDP = parseIDR(form.dp_display) || 0;
  const rawTukarTambah = parseIDR(form.tukar_tambah_display) || 0;
  
  // --- LOGIKA HUTANG MURNI V25 FINAL (POKOK BERDASARKAN MODAL) ---
  const sisaModal = isProduct 
    ? (rawHargaBeli - rawDP - rawTukarTambah) 
    : rawPokokValue;
    
  const markupProfit = isProduct ? Math.max(0, rawHargaJual - rawHargaBeli) : 0;
  
  // Sisa Pokok Tampilan (Ini yang diminta user 1.4jt-an)
  const sisaPokokTampilan = Math.max(0, sisaModal);

  // --- LOGIKA V26.17 FINAL: Bunga Gross (DARI HARGA JUAL ASLI) ---
  const nBungaPersen = Number(form.bunga_persen) || 0;
  const basisBunga = isProduct ? (rawHargaJual - (rawTukarTambah || 0)) : rawPokokValue;
  const totalBunga = Math.round((basisBunga * nBungaPersen) / 100);
  
  // RUMUS SUPIR: (Harga_Jual - DP - TT) + Bunga_Penuh
  const sisaPokokHBP = isProduct ? (rawHargaJual - rawDP - rawTukarTambah) : rawPokokValue;
  const totalTagihan = Math.max(0, sisaPokokHBP + totalBunga);

  // Cicilan Logic
  let rawNominalCicilan = 0;
  if (form.tipe_cicilan === 'PER_BULAN') {
     const tenor = Number(form.tenor_bulan) || 1;
     rawNominalCicilan = Math.ceil((totalTagihan / tenor) / 1000) * 1000;
  } else {
     rawNominalCicilan = parseIDR(form.nominal_cicilan_display) || 0;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = {
        ...form,
        pokok: sisaPokokTampilan + markupProfit, // Pokok di DB adalah (Jual - DP)
        total_bunga: totalBunga,
        total_tagihan: totalTagihan,
        nominal_cicilan: rawNominalCicilan,
        dp: rawDP,
        tukar_tambah: rawTukarTambah,
        harga_jual_tunai: rawHargaJual,
        tenor_bulan: Number(form.tenor_bulan) || 0,
        stok_unit_id: form.stok_unit_id
      };
      if (initialData) {
        const res = await api.put(`/kasbon/${initialData.id}`, payload);
        toast.success(`TERSIMPAN KE DB: ${payload.total_bunga} [V25.2]`);
      } else {
        const res = await api.post('/kasbon', payload);
        setNotaData({ 
           ...payload, 
           no_pinjaman: res.data.no_pinjaman, 
           nama_karyawan: karyawan.find(k => k.id == form.karyawan_id)?.nama 
        });
        toast.success(`DATA BARU: ${payload.total_bunga} [V25.2]`);
        setShowNota(true);
      }
      onSuccess();
      if (!showNota) onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan data');
    } finally { setLoading(false); }
  };

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
        <div className="glass-card w-full max-w-lg p-0 overflow-hidden shadow-2xl relative my-auto border border-white/10">
          <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/3 font-black text-[11px] tracking-widest text-white uppercase italic">
            <h2>{initialData ? 'Edit Data PIN' : 'V22 - Pinjaman Produk Baru'}</h2>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all"><FiX /></button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
            {/* Supir */}
            <div>
              <label className="label text-[10px] text-dark-500 font-bold uppercase tracking-widest block mb-2">Supir / Karyawan *</label>
              {initialData ? (
                <div className="input-field bg-white/5 opacity-50 flex items-center text-white">{initialData.nama_karyawan}</div>
              ) : (
                <select className="input-field font-bold" value={form.karyawan_id} onChange={e => setForm({ ...form, karyawan_id: e.target.value })}>
                  <option value="">-- Pilih Supir --</option>
                  {karyawan.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                </select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label text-[10px] text-dark-500 font-bold uppercase block mb-2 tracking-widest">Kategori *</label>
                <select className="input-field font-bold text-white italic" value={form.kategori} onChange={e => setForm({ ...form, kategori: e.target.value, bunga_persen: e.target.value === 'UANG' ? 30 : 25 })}>
                  <option value="UANG">UANG TUNAI</option>
                  <option value="HP">HANDPHONE</option>
                  <option value="TV">ELEKTRONIK (TV)</option>
                  <option value="Lainnya">Lainnya (Barang)</option>
                </select>
              </div>
              {isProduct && (
                <div className="md:col-span-2">
                  <label className="label text-[10px] text-indigo-400 font-bold uppercase block mb-2 tracking-widest flex items-center justify-between">
                    <span className="flex items-center gap-2"><FiPackage /> Pilih dari Unit Stok (Opsional)</span>
                    <span className="bg-indigo-500/20 px-2 py-0.5 rounded text-[9px]">
                        {availableStok.filter(s => {
                            const katStok = (s.kategori || '').toUpperCase();
                            const katForm = (form.kategori || '').toUpperCase();
                            const matchesKat = katStok === katForm || (katForm === 'LAINNYA' && katStok === 'LAINNYA');
                            return matchesKat && s.stok > 0;
                        }).reduce((acc, s) => acc + (s.stok || 0), 0)} UNIT FISIK TERSEDIA
                    </span>
                  </label>
                  <select 
                    className="input-field font-bold mb-4 bg-indigo-500/5 border-indigo-500/20"
                    value={form.stok_unit_id}
                    onChange={e => {
                        const id = e.target.value;
                        const item = availableStok.find(s => s.id == id);
                        if (item) {
                            setForm({
                                ...form,
                                stok_unit_id: id,
                                nama_produk: item.nama_produk,
                                harga_beli_display: formatIDR(item.harga_beli),
                                harga_jual_cash_display: formatIDR(item.harga_jual)
                            });
                        } else {
                            setForm({ ...form, stok_unit_id: '' });
                        }
                    }}
                  >
                    <option value="" className="bg-dark-900 text-white">-- MANUAL / PILIH UNIT STOK --</option>
                    {availableStok
                        .filter(s => {
                            const katStok = (s.kategori || '').toUpperCase();
                            const katForm = (form.kategori || '').toUpperCase();
                            const matchesKat = katStok === katForm || (katForm === 'LAINNYA' && katStok === 'LAINNYA');
                            return matchesKat && s.stok > 0;
                        })
                        .map(s => (
                            <option key={s.id} value={s.id} className="bg-dark-900 text-white">
                                [{s.kondisi}] {s.nama_produk} (Sisa: {s.stok}) - {formatCurrency(s.harga_jual)}
                            </option>
                        ))
                    }
                  </select>

                  <label className="label text-[10px] text-dark-500 font-bold uppercase block mb-2 tracking-widest">Model / Nama Produk *</label>
                  <input type="text" className="input-field font-black uppercase text-white" placeholder="E.G: IPHONE 13" value={form.nama_produk} onChange={e => setForm({ ...form, nama_produk: e.target.value.toUpperCase() })} />
                </div>
              )}
            </div>

            {isProduct ? (
              <div className="space-y-4 border-y border-white/5 py-4">
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="label text-dark-500 italic">Harga Beli Modal (Rp)</label>
                        <input type="text" className="input-field border-white/10 text-white/70 font-bold italic" placeholder="0" value={form.harga_beli_display} onChange={e => setForm({ ...form, harga_beli_display: formatIDR(e.target.value) })} />
                    </div>
                    <div>
                       <label className="label text-primary-400">Harga Jual (Rp) *</label>
                       <input type="text" className="input-field border-primary-500/30 text-lg font-black text-white" value={form.harga_jual_cash_display} onChange={e => setForm({ ...form, harga_jual_cash_display: formatIDR(e.target.value) })} />
                    </div>
                 </div>

                 <div className="grid grid-cols-1 gap-4">
                     <div>
                        <label className="label text-emerald-400 font-bold">Setoran DP (Uang Tunai) *</label>
                        <input 
                           type="text" 
                           className="input-field border-emerald-500/30 font-black text-white bg-emerald-500/5" 
                           placeholder="0"
                           value={form.dp_display} 
                           onChange={e => setForm({ ...form, dp_display: formatIDR(e.target.value) })} 
                        />
                     </div>

                    <div className="space-y-3 pt-2">
                       <div className="flex justify-between items-center mb-1">
                          <label className="text-[10px] text-amber-500 font-black uppercase tracking-widest flex items-center gap-2">
                             <FiRefreshCw className={isTTActive ? 'animate-spin' : ''} /> Tukar Tambah (Trade-in)
                          </label>
                          <button 
                             type="button"
                             onClick={() => {
                                const newState = !isTTActive;
                                setIsTTActive(newState);
                                if(!newState) setForm({...form, tukar_tambah_display: '0', keterangan_tt: ''});
                             }}
                             className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black tracking-widest transition-all border ${isTTActive ? 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/20' : 'bg-dark-900/50 text-dark-500 border-white/5'}`}
                          >
                             {isTTActive ? 'AKTIF (ON)' : 'MATI (OFF)'}
                          </button>
                       </div>

                       {isTTActive && (
                           <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-3xl space-y-3 animate-in zoom-in-95 fade-in duration-200">
                              <input type="text" className="input-field bg-white/5 border-amber-500/20 font-black text-amber-500" placeholder="Nominal Rp" value={form.tukar_tambah_display} onChange={e => setForm({ ...form, tukar_tambah_display: formatIDR(e.target.value) })} />
                              <textarea className="input-field h-16 text-[10px] uppercase font-bold" placeholder="Detail Barang (E.G: VIVO Y12 LECET)" value={form.keterangan_tt} onChange={e => setForm({ ...form, keterangan_tt: e.target.value.toUpperCase() })} />
                           </div>
                       )}
                    </div>
                 </div>
              </div>
            ) : (
              <div>
                 <label className="label text-emerald-400">Nominal Pinjaman TUNAI *</label>
                 <input type="text" className="input-field text-xl font-black text-white" value={form.pokok_display} onChange={e => setForm({ ...form, pokok_display: formatIDR(e.target.value) })} />
              </div>
            )}

            <div className="bg-indigo-500/5 p-4 rounded-3xl border border-indigo-500/10 space-y-4">
               <label className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.2em] block mb-1 italic">Skema Pembayaran *</label>
               <div className="flex gap-2">
                  {isProduct && (
                     <button 
                        type="button"
                        onClick={() => setForm({...form, tipe_cicilan: 'PER_BULAN'})}
                        className={`flex-1 py-3 rounded-2xl text-[10px] font-black transition-all border ${form.tipe_cicilan === 'PER_BULAN' ? 'bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/20' : 'bg-white/5 text-dark-400 border-white/5'}`}
                     >
                        CICIL PER BULAN
                     </button>
                  )}
                  <button 
                     type="button"
                     onClick={() => {
                        const standardNominal = Math.ceil((totalTagihan / (Number(form.tenor_bulan) || 1)) / 1000) * 1000;
                        setForm({...form, tipe_cicilan: 'PER_RIT', nominal_cicilan_display: formatIDR(standardNominal.toString())});
                     }}
                     className={`flex-1 py-3 rounded-2xl text-[10px] font-black transition-all border ${form.tipe_cicilan === 'PER_RIT' ? 'bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/20' : 'bg-white/5 text-dark-400 border-white/5'}`}
                  >
                     POTONG PER RIT
                  </button>
               </div>

               <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                  <div>
                     <label className="label italic">Bunga (%)</label>
                     <input type="number" className="input-field font-bold" value={form.bunga_persen} onChange={e => setForm({ ...form, bunga_persen: e.target.value })} />
                  </div>
                  
                  {isProduct && form.tipe_cicilan === 'PER_BULAN' ? (
                     <div>
                        <label className="label italic">Tenor (Bulan)</label>
                        <select className="input-field font-bold" value={form.tenor_bulan} onChange={e => setForm({ ...form, tenor_bulan: e.target.value })}>
                           {[1,4,6,8,10,12].map(m => <option key={m} value={m}>{m} Bulan</option>)}
                        </select>
                     </div>
                  ) : form.tipe_cicilan === 'PER_RIT' ? (
                     <div>
                        <label className="label text-emerald-400 italic">Nominal Per Rit (Rp)</label>
                        <input type="text" className="input-field border-emerald-500/30 text-white font-black" placeholder="Contoh: 100.000" value={form.nominal_cicilan_display} onChange={e => setForm({ ...form, nominal_cicilan_display: formatIDR(e.target.value) })} />
                     </div>
                  ) : null}
               </div>
            </div>

            {isProduct && form.tipe_cicilan === 'PER_BULAN' && (
               <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="label italic">Jatuh Tempo Perdana (Angsuran ke-1)</label>
                  <input type="date" className="input-field font-bold border-primary-500/30 text-white" value={form.jatuh_tempo_manual} onChange={e => setForm({ ...form, jatuh_tempo_manual: e.target.value })} />
               </div>
            )}

            {/* RINGKASAN HITUNGAN V22 - SUPIR FRIENDLY */}
            <div className="p-5 bg-dark-950 rounded-3xl border border-white/5 space-y-4 shadow-inner relative overflow-hidden">
               <div className="absolute top-0 right-0 w-24 h-24 bg-primary-600/5 blur-3xl rounded-full" />
                <h4 className="text-[10px] text-dark-500 font-black uppercase tracking-widest border-b border-white/5 pb-2 italic">Ringkasan Hitungan Aktif</h4>
                <div className="space-y-3 pt-2">
                     <div className="flex justify-between items-center text-xs text-white/50">
                        <span>Harga Jual:</span>
                        <span className="font-mono">{formatCurrency(rawHargaJual)}</span>
                     </div>
                     
                     {(rawDP > 0 || rawTukarTambah > 0) && (
                        <div className="space-y-2">
                           {rawDP > 0 && (
                              <div className="flex justify-between items-center text-xs text-emerald-400 font-bold">
                                 <span>DP (Uang Muka) (-):</span>
                                 <span className="font-mono">-{formatCurrency(rawDP)}</span>
                              </div>
                           )}
                           {rawTukarTambah > 0 && (
                              <div className="flex justify-between items-center text-xs text-amber-400 font-bold">
                                 <span>Tukar Tambah (-):</span>
                                 <span className="font-mono">-{formatCurrency(rawTukarTambah)}</span>
                              </div>
                           )}
                           <div className="flex justify-between items-center text-[10px] text-white/30 uppercase tracking-widest pt-1 border-t border-white/5 italic">
                              <span>Sisa Harga Barang:</span>
                              <span className="font-mono">{formatCurrency(rawHargaJual - rawDP - rawTukarTambah)}</span>
                           </div>
                        </div>
                     )}

                     {!isProduct && (
                        <div className="flex justify-between items-center text-xs text-indigo-400 font-bold">
                           <span>Pinjaman Pokok Tunai:</span>
                           <span className="font-mono">{formatCurrency(rawPokokValue)}</span>
                        </div>
                     )}

                     <div className="flex justify-between items-center text-xs text-red-500 font-black italic">
                        <span>Biaya Pelayanan (Bunga {form.bunga_persen}% dari {formatCurrency(Math.max(0, basisBunga))}):</span>
                        <span className="font-mono">+{formatCurrency(totalBunga)}</span>
                     </div>

                     <div className="flex justify-between items-center text-base text-white font-black border-t-2 border-white/10 pt-3 shadow-sm">
                        <span className="uppercase tracking-tighter">Total Tagihan Final:</span>
                        <span className="text-2xl text-primary-400 font-mono italic drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]">{formatCurrency(totalTagihan)}</span>
                     </div>

                     {form.metode_pembayaran === 'CREDIT' && (
                        <div className="bg-primary-500/10 p-4 rounded-2xl border border-primary-500/20 mt-4 animate-pulse-subtle">
                           <div className="flex justify-between items-center">
                              <span className="text-[10px] text-primary-400 font-black uppercase tracking-widest italic">{form.tipe_cicilan === 'PER_BULAN' ? 'Cicilan Per Bulan:' : 'Potongan Per Rit:'}</span>
                              <div className="text-right">
                                 <span className="text-xl font-black text-white italic font-mono">{formatCurrency(rawNominalCicilan)}</span>
                                 <span className="text-[10px] lowercase text-white/40 block leading-none">{form.tipe_cicilan === 'PER_BULAN' ? 'per bulan' : 'per rit'}</span>
                              </div>
                           </div>
                        </div>
                     )}
                </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full h-14 text-sm font-black uppercase tracking-[0.2em] shadow-xl shadow-primary-600/30 active:scale-95 transition-all">
              {loading ? 'MENYIMPAN...' : 'SIMPAN DATA PINJAMAN'}
            </button>
          </form>
        </div>
      </div>

      {/* MODAL NOTA (EXECUTIVE V22) */}
      {showNota && notaData && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-dark-950/95 backdrop-blur-xl animate-fade-in">
           <div className="w-full max-w-[400px] bg-white rounded-[40px] overflow-hidden shadow-2xl relative animate-scale-up">
              <div className="bg-dark-900 p-8 text-center text-white relative">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full" />
                 <h2 className="text-emerald-500 text-2xl font-black uppercase italic tracking-tighter leading-none mb-1">KASBON<span className="text-white">PRO</span></h2>
                 <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Transaction Receipt</p>
                 <div className="mt-6 pt-4 border-t border-white/10 flex justify-between text-left">
                    <div>
                       <p className="text-[8px] opacity-40 uppercase font-black">PIN: {notaData.no_pinjaman}</p>
                       <p className="text-base font-black uppercase">{notaData.nama_karyawan}</p>
                    </div>
                 </div>
              </div>

              <div className="p-8 space-y-6">
                 <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs pb-2 border-b border-gray-100 italic">
                       <span className="text-gray-400 font-bold uppercase">Produk</span>
                       <span className="text-gray-900 font-black uppercase">{notaData.nama_produk || notaData.kategori}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs pb-2 border-b border-gray-100 italic">
                       <span className="text-gray-400 font-bold uppercase">Harga Jual</span>
                       <span className="text-gray-900 font-bold">{formatCurrency(notaData.harga_jual_tunai)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs pb-2 border-b border-gray-100 text-red-500 font-bold italic">
                       <span>Bunga ({notaData.bunga_persen}%)</span>
                       <span className="font-black">+{formatCurrency(notaData.total_bunga)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-3">
                       <span className="text-sm font-black uppercase tracking-widest">Total Tagihan</span>
                       <span className="text-2xl font-black text-gray-900 italic tracking-tighter">{formatCurrency(notaData.total_tagihan)}</span>
                    </div>
                 </div>

                 <div className="p-4 bg-emerald-500/10 rounded-3xl border border-emerald-500/20 text-center">
                    <p className="text-[9px] text-emerald-600 font-black uppercase mb-1 tracking-widest">Aturan Pembayaran</p>
                    <p className="text-lg font-black text-emerald-600">{formatCurrency(notaData.nominal_cicilan)} x {notaData.tenor_bulan} Bln</p>
                 </div>

                 <div className="flex gap-4">
                    <button onClick={() => window.print()} className="flex-1 py-4 bg-dark-900 text-white rounded-2xl text-[10px] font-black uppercase active:scale-95 transition-all">CETAK</button>
                    <button onClick={() => { setShowNota(false); setNotaData(null); onClose(); }} className="flex-1 py-4 border-2 border-dark-900 text-dark-900 rounded-2xl text-[10px] font-black uppercase active:scale-95 transition-all">SELESAI</button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </>
  );
}
