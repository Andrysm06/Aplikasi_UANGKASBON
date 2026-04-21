import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiUser, FiPlus, FiX, FiDollarSign, FiCreditCard, FiTrash2, FiEdit3, FiPrinter, FiMail, FiMessageCircle, FiImage, FiType } from 'react-icons/fi';
import api from '../api/axios';
import { formatCurrency, formatDateShort, formatIDR, parseIDR } from '../utils/helpers';
import toast from 'react-hot-toast';
import KasbonModal from '../components/KasbonModal';

export default function KasbonDetail() {
   const { id } = useParams();
   const navigate = useNavigate();
   const [data, setData] = useState(null);
   const [loading, setLoading] = useState(true);
   const [modalBayar, setModalBayar] = useState(false);
   const [modalEdit, setModalEdit] = useState(false);
   const [modalStruk, setModalStruk] = useState(false);
   const [form, setForm] = useState({ jumlah_display: '' });

   const load = async () => {
      setLoading(true);
      try {
         const res = await api.get(`/kasbon/${id}?t=${Date.now()}`);
         setData(res.data);
      } catch {
         toast.error('Gagal memuat detail pinjaman');
         navigate('/kasbon');
      } finally { setLoading(false); }
   };

   useEffect(() => { load(); }, [id]);

   const handleBayar = async (e) => {
      e.preventDefault();
      const nominal = parseIDR(form.jumlah_display);
      if (!nominal || nominal <= 0) return toast.error('Input nominal tidak valid');

      try {
         await api.post(`/kasbon/${id}/bayar`, {
            jumlah_bayar: nominal,
            tanggal_bayar: new Date().toISOString().split('T')[0]
         });
         toast.success('Pembayaran berhasil dicatat');
         setModalBayar(false);
         setForm({ jumlah_display: '' });
         load();
      } catch (err) {
         toast.error(err.response?.data?.message || 'Gagal mencatat pembayaran');
      }
   };

   const handleDelete = async () => {
      if (!window.confirm('Hapus data pinjaman ini secara permanen?')) return;
      try {
         await api.delete(`/kasbon/${id}`);
         toast.success('Data dihapus');
         navigate('/kasbon');
      } catch { toast.error('Gagal menghapus data'); }
   };

   if (loading) return <div className="py-20 text-center text-dark-500 italic uppercase text-[10px] tracking-widest animate-pulse">Memuat data...</div>;
   if (!data) return null;

  // LOGIKA TARGET CERDAS V19: Tracking Lapis per Bulan (Multi-Installment)
  const calculateSmartTarget = () => {
    if (data.tipe_cicilan !== 'PER_BULAN' || !data.nominal_cicilan) return { value: data.nominal_cicilan || 0, label: 'Target Cicilan' };

    const nominal = data.nominal_cicilan;
    const sudahBayar = data.terbayar || 0;
    const start = new Date(data.tanggal_pinjam);
    const now = new Date();

    const totalMonthsElapsed = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    const stopPoint = Math.max(0, totalMonthsElapsed) + 1; // Target s/d bulan ini

    const targetKumulatif = stopPoint * nominal;
    const shortfall = targetKumulatif - sudahBayar;

    // Hitung sedang di cicilan ke berapa
    const blnSekarang = Math.floor(sudahBayar / nominal) + 1;
    const blnTarget = Math.max(blnSekarang, stopPoint);

    if (shortfall > 0) {
       return {
          value: shortfall,
          label: `LUNASI KE-1 s/d ${blnTarget} (${formatCurrency(shortfall)})`,
          desc: `Menambal kekurangan s/d bulan ${blnTarget}`
       };
    } else {
       return {
          value: nominal,
          label: `BAYAR CICILAN KE-${blnSekarang} (${formatCurrency(nominal)})`,
          desc: `Cicilan normal bulan berjalan`
       };
    }
  };

   const smartTargetObj = calculateSmartTarget();
   const smartTarget = smartTargetObj.value;

   // V-FIX UNIVERSAL: Always use DB-stored totals (authoritative).
   // harga_jual_tunai may be 0 for old records — use pokok as fallback for gross display.
   const isCashLoan = String(data.kategori).toUpperCase() === 'UANG';
   const detailGross = Number(data.harga_jual_tunai) > 0 ? Number(data.harga_jual_tunai) : Number(data.pokok);
   const detailBunga = Number(data.total_bunga) || 0;
   const detailSubtotal = detailGross + detailBunga;
   const detailFinal = Number(data.total_tagihan) || 0;

   return (
      <div className="space-y-8 animate-fade-in pb-20">
         {/* HEADER ACTION */}
         <div className="flex flex-wrap items-center justify-between gap-4">
            <button onClick={() => navigate('/kasbon')} className="flex items-center gap-2 text-dark-400 hover:text-white transition-colors group">
               <div className="p-2 bg-white/5 rounded-xl group-hover:bg-primary-600/20"><FiArrowLeft /></div>
               <span className="text-[10px] font-black uppercase tracking-widest">Kembali</span>
            </button>

            <div className="flex flex-wrap items-center gap-2">
               <button onClick={() => setModalStruk(true)} className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/5 transition-all flex items-center gap-2">
                  <FiPrinter className="text-cyan-400" /> Struk
               </button>
               <button onClick={() => setModalEdit(true)} className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/5 transition-all flex items-center gap-2">
                  <FiEdit3 className="text-amber-500" /> Edit
               </button>
               <button onClick={handleDelete} className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-red-500/20 transition-all flex items-center gap-2">
                  <FiTrash2 /> Hapus
               </button>
               <button onClick={() => setModalBayar(true)} className="px-6 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary-600/30 transition-all active:scale-95 flex items-center gap-2">
                  <FiPlus /> Catat Cicilan
               </button>
            </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* LEFT COLUMN: Profil Pinjaman */}
            <div className="lg:col-span-1 space-y-6">
               <div className="glass-card p-0 overflow-hidden self-start border-white/5">
                  <div className="p-8 text-center bg-gradient-to-b from-white/5 to-transparent border-b border-white/5">
                     <div className="w-20 h-20 bg-primary-600/20 rounded-[28px] flex items-center justify-center mx-auto mb-4 border border-primary-500/30 shadow-lg shadow-primary-600/10 relative">
                        <FiUser size={32} className="text-primary-500" />
                        <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full border-2 border-dark-900 ${data.sisa_tagihan <= 0 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                     </div>
                     <h2 className="text-xl font-black text-white uppercase tracking-tight leading-none">{data.nama_karyawan}</h2>
                     <p className="text-[10px] text-dark-500 font-bold uppercase tracking-widest mt-2">{data.no_pinjaman}</p>
                  </div>

                  <div className="p-6 space-y-3 bg-dark-950/20">
                     <div className="flex justify-between items-center bg-dark-900/50 p-4 rounded-2xl border border-white/5">
                        <span className="text-[9px] text-dark-500 uppercase font-black tracking-widest italic">Kategori</span>
                        <span className="text-xs text-emerald-400 font-black uppercase">{data.kategori}</span>
                     </div>
                     {['HP', 'TV', 'Lainnya'].includes(data.kategori) && (
                        <>
                           <div className="flex justify-between items-center bg-dark-900/50 p-4 rounded-2xl border border-white/5">
                              <span className="text-[9px] text-dark-500 uppercase font-black tracking-widest italic">Status Barang</span>
                              <span className="text-xs text-white font-bold uppercase">{data.nama_produk || '-'}</span>
                           </div>
                           {data.tukar_tambah > 0 && (
                              <div className="bg-dark-900/50 p-4 rounded-2xl border border-white/5 space-y-1">
                                 <div className="flex justify-between items-center">
                                    <span className="text-[9px] text-amber-500 uppercase font-black tracking-widest italic">Tukar Tambah</span>
                                    <span className="text-xs text-amber-500 font-bold">{formatCurrency(data.tukar_tambah)}</span>
                                 </div>
                                 <p className="text-[8px] text-dark-500 font-bold italic tracking-tighter uppercase opacity-60">{data.keterangan_tt}</p>
                              </div>
                           )}
                        </>
                     )}
                     <div className="flex justify-between items-center bg-dark-900/50 p-4 rounded-2xl border border-white/5">
                        <span className="text-[9px] text-dark-500 uppercase font-black tracking-widest italic">Terdaftar</span>
                        <span className="text-xs text-white font-bold">{formatDateShort(data.tanggal_pinjam)}</span>
                     </div>
                  </div>
               </div>
            </div>

            {/* RIGHT COLUMN: Hutang & Riwayat */}
            <div className="lg:col-span-2 space-y-8">
               {/* RINGKASAN HUTANG UTAMA */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {/* Card 1: Total Tagihan Awal (Calculated View) */}
                   <div className="glass-card bg-emerald-500/10 border-emerald-500/20 p-8 shadow-xl shadow-emerald-500/5">
                      <p className="text-[10px] text-emerald-400 font-black uppercase tracking-[0.2em] mb-2 leading-none italic">Total Tagihan (Awal)</p>
                      <h2 className="text-3xl font-black text-white tracking-tighter italic leading-none">{formatCurrency(detailFinal)}</h2>
                      
                      <div className="mt-5 space-y-2 border-t border-white/10 pt-4">
                          <div className="flex justify-between text-[9px] text-[#2c3e50] font-black italic">
                             <span className="uppercase">{isCashLoan ? 'Pinjaman Tunai (Pokok) :' : 'Harga Barang (Gross) :'}</span>
                             <span>{formatCurrency(detailGross)}</span>
                          </div>

                          <div className="flex justify-between text-[9px] text-red-500 font-black italic">
                             <span className="uppercase font-bold">Biaya Bunga (Bunga {data.bunga_persen}% Gross) :</span>
                             <span>+{formatCurrency(detailBunga)}</span>
                          </div>

                          <div className="flex justify-between text-[9px] text-blue-300 font-black border-t border-white/5 pt-2 mt-1 italic">
                             <span className="uppercase font-extrabold underline">SUB-TOTAL (HASIL) :</span>
                             <span>{formatCurrency(detailSubtotal)}</span>
                          </div>

                          {data.dp > 0 && (
                             <div className="flex justify-between text-[9px] text-emerald-400 font-black italic">
                                <span className="uppercase font-bold underline">Setoran Tunai / DP (-) :</span>
                                <span>-{formatCurrency(data.dp)}</span>
                             </div>
                          )}

                          <div className="flex justify-between text-[13px] text-blue-800 font-black border-t-2 border-blue-400 pt-1 mt-1">
                             <span className="uppercase font-extrabold underline">Total Tagihan Final :</span>
                             <span className="underline italic font-extrabold tracking-tighter">{formatCurrency(detailFinal)}</span>
                          </div>
                      </div>
                   </div>

                  {/* Card 2: Sisa Hutang Saat Ini */}
                  <div className="glass-card bg-primary-600/20 border-primary-600/30 p-8 shadow-xl shadow-primary-600/5 flex flex-col justify-between">
                     <div>
                        <p className="text-[10px] text-primary-400 font-black uppercase tracking-[0.2em] mb-2 text-right">Sisa Hutang Saat Ini</p>
                        <h2 className="text-3xl font-black text-white tracking-tighter italic leading-none text-right">{formatCurrency(Math.max(0, data.sisa_tagihan))}</h2>
                     </div>
                     <div className="mt-8">
                        <div className="flex justify-between text-[9px] mb-2 font-black uppercase tracking-widest leading-none">
                           <span className="text-dark-500">Pelunasan</span>
                           <span className="text-primary-500">{detailFinal > 0 ? Math.round((data.terbayar / detailFinal) * 100) : 0}%</span>
                        </div>
                        <div className="bg-white/5 h-2.5 rounded-full overflow-hidden border border-white/5 shadow-inner">
                           <div className="bg-primary-500 h-full transition-all duration-1000 shadow-[0_0_15px_rgba(59,130,246,0.6)]" style={{ width: `${detailFinal > 0 ? Math.min(100, (data.terbayar / detailFinal) * 100) : 0}%` }} />
                        </div>
                     </div>
                  </div>
               </div>

               {/* Info Skema & Progress */}
               <div className="glass-card p-6 border-white/5 bg-dark-900/20 flex flex-wrap items-center justify-between gap-6">
                  <div className="space-y-1">
                     <p className="text-[10px] text-dark-500 font-black uppercase tracking-widest">Metode Cicilan</p>
                     <h4 className="text-sm font-black text-white uppercase italic tracking-tight">
                        {data.tipe_cicilan === 'PER_BULAN' ? `Bulanan (${data.tenor_bulan} Bln)` : 'Potongan Per Rit'}
                     </h4>
                     <p className="text-xs font-black text-primary-400">{formatCurrency(data.nominal_cicilan)} / {data.tipe_cicilan === 'PER_BULAN' ? 'Bulan' : 'Rit'}</p>
                  </div>
                  {data.tipe_cicilan === 'PER_BULAN' ? (
                     <div className="px-6 py-3 bg-white/5 rounded-2xl border border-white/10 text-center">
                        <p className="text-[9px] text-dark-500 font-black uppercase tracking-widest leading-none mb-1">Sudah Berjalan</p>
                        <p className="text-lg font-black text-white italic">{data.nominal_cicilan > 0 ? Math.floor(data.terbayar / data.nominal_cicilan) : 0} <span className="text-[10px] text-dark-400 font-normal">/ {data.tenor_bulan} bln</span></p>
                     </div>
                  ) : (
                     <div className="px-6 py-3 bg-white/5 rounded-2xl border border-white/10 text-center">
                        <p className="text-[9px] text-dark-500 font-black uppercase tracking-widest leading-none mb-1">Sudah Berjalan</p>
                        <p className="text-lg font-black text-white italic">{data.nominal_cicilan > 0 ? Math.floor(data.terbayar / data.nominal_cicilan) : 0} <span className="text-[10px] text-dark-400 font-normal">/ {data.tenor_bulan} Rit</span></p>
                     </div>
                  )}
                  <div className="text-right">
                     <p className="text-[10px] text-dark-500 font-black uppercase tracking-widest mb-1">Status Pinjaman</p>
                     <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${data.sisa_tagihan <= 0 ? 'bg-emerald-500/20 text-emerald-500' : 'bg-primary-600/20 text-primary-400'}`}>
                        {data.sisa_tagihan <= 0 ? 'LUNAS' : 'AKTIF'}
                     </span>
                  </div>
               </div>

               {/* Riwayat Table */}
               <div className="glass-card p-0 overflow-hidden shadow-2xl border-white/5">
                  <div className="p-6 border-b border-white/5 bg-white/3 font-black text-[10px] uppercase text-white tracking-widest flex items-center gap-2">
                     <FiCreditCard className="text-primary-500" /> Catatan Transaksi Cicilan
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                     <table className="w-full text-left">
                        <thead className="bg-dark-900 border-b border-white/5 sticky top-0 z-10">
                           <tr>
                              <th className="p-4 text-[9px] text-dark-500 uppercase font-black tracking-widest">Waktu Bayar</th>
                              <th className="p-4 text-[9px] text-dark-500 uppercase font-black tracking-widest text-right">Nominal</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                           {data.history?.map((h, i) => (
                              <tr key={i} className="hover:bg-white/3 transition-all">
                                 <td className="p-4 text-xs text-dark-400 italic">{formatDateShort(h.tanggal_bayar)}</td>
                                 <td className="p-4 text-xs font-black text-emerald-400 text-right">+ {formatCurrency(h.jumlah_bayar)}</td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               </div>
            </div>
         </div>

         {/* MODAL BAYAR */}
         {modalBayar && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-dark-950/90 backdrop-blur-xl animate-fade-in">
               <div className="w-full max-w-xl bg-dark-900 rounded-[40px] border border-white/10 shadow-2xl animate-scale-up overflow-hidden">
                  <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/3">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10"><FiPlus className="text-primary-500" /></div>
                        <div>
                           <h2 className="text-xl font-black text-white tracking-tighter uppercase italic leading-none">Pencatatan Cicilan</h2>
                           <p className="text-[9px] text-dark-400 font-bold uppercase tracking-[0.2em] mt-2">PIN: {data.no_pinjaman} - {data.nama_karyawan}</p>
                        </div>
                     </div>
                     <button onClick={() => setModalBayar(false)} className="p-4 hover:bg-white/10 text-white rounded-2xl transition-all"><FiX size={20} /></button>
                  </div>

                  <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-6">
                        <div className="p-6 bg-dark-950 rounded-3xl border border-white/5 space-y-4">
                           <p className="text-[10px] text-dark-500 font-black uppercase tracking-widest italic border-b border-white/5 pb-2">Detail Transaksi</p>
                           <div className="space-y-2">
                              <div className="flex justify-between text-[10px]">
                                 <span className="text-dark-400">Harga Jual:</span>
                                 <span className="text-white font-bold">{formatCurrency(data.harga_jual_tunai)}</span>
                              </div>
                              {data.dp > 0 && (
                                 <div className="flex justify-between text-[10px]">
                                    <span className="text-dark-400">Uang Muka (DP):</span>
                                    <span className="text-emerald-500 font-bold">-{formatCurrency(data.dp)}</span>
                                 </div>
                              )}
                              <div className="flex justify-between text-[10px]">
                                 <span className="text-dark-400">Bunga ({data.bunga_persen}%):</span>
                                 <span className="text-red-500 font-bold">+{formatCurrency(data.total_bunga)}</span>
                              </div>
                              {data.tukar_tambah > 0 && (
                                 <div className="flex justify-between text-[10px] pt-1 border-t border-white/5">
                                    <span className="text-amber-500 font-bold italic text-[9px]">Tukar Tambah (Barang):</span>
                                    <span className="text-amber-500 font-bold">-{formatCurrency(data.tukar_tambah)}</span>
                                 </div>
                              )}
                              <div className="flex justify-between text-xs pt-3 border-t-2 border-dashed border-white/10">
                                 <span className="text-white font-black uppercase tracking-widest text-[9px]">Total Pinjaman:</span>
                                 <span className="text-white font-black">{formatCurrency(data.total_tagihan)}</span>
                              </div>
                           </div>
                        </div>

                        <div className="p-6 bg-emerald-600/10 rounded-3xl border border-emerald-500/20 text-center relative overflow-hidden">
                           <p className="text-[9px] text-emerald-400 font-black uppercase tracking-widest mb-1">Status Pelunasan</p>
                           <h4 className="text-2xl font-black text-white italic tracking-tighter">{formatCurrency(data.terbayar)}</h4>
                           <p className="text-[9px] text-dark-400 uppercase font-black opacity-50">Sudah Dibayar</p>
                        </div>
                     </div>

                     <div className="space-y-6">
                        <div className="space-y-3">
                           <p className="text-[10px] text-dark-500 font-black uppercase tracking-widest text-center italic">-- Pilih Cepat (Klik) --</p>
                           <div className="grid grid-cols-1 gap-3">
                              <button onClick={() => setForm({ ...form, jumlah_display: formatIDR(smartTarget) })} className="p-4 bg-primary-600/10 border border-primary-500/30 hover:bg-primary-600 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all italic text-primary-400">
                                 {smartTargetObj.label}
                              </button>
                              <button onClick={() => setForm({ jumlah_display: formatIDR(data.sisa_tagihan) })} className="p-4 bg-emerald-600/10 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all italic text-emerald-400">
                                 LUNASI SEMUA
                              </button>
                           </div>
                        </div>

                        <form onSubmit={handleBayar} className="space-y-6">
                           <div className="space-y-3">
                              <p className="text-[10px] text-dark-500 font-black uppercase tracking-widest text-center">Atau Input Manual (Rp)</p>
                              <div className="relative group">
                                 <FiDollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-500 group-focus-within:scale-125 transition-all z-10" />
                                 <input
                                    type="text"
                                    className="w-full h-16 bg-white border-2 border-primary-500/20 rounded-2xl pl-12 pr-6 text-2xl font-black text-black placeholder:text-dark-400 outline-none focus:border-primary-500 transition-all shadow-lg"
                                    placeholder="0"
                                    value={form.jumlah_display}
                                    onChange={e => setForm({ ...form, jumlah_display: formatIDR(e.target.value) })}
                                    autoFocus
                                 />
                              </div>
                           </div>

                           <div className="p-4 bg-white/5 rounded-2xl text-center">
                              <p className="text-[9px] text-dark-500 font-black uppercase tracking-widest mb-1">Sisa Hutang Setelah Bayar</p>
                              <h4 className="text-lg font-black text-white italic tracking-tighter">
                                 {formatCurrency(Math.max(0, data.sisa_tagihan - parseIDR(form.jumlah_display)))}
                              </h4>
                           </div>

                           <button type="submit" className="w-full h-16 bg-primary-600 hover:bg-primary-500 text-white rounded-3xl text-sm font-black uppercase tracking-[0.2em] shadow-xl shadow-primary-600/30 active:scale-95 transition-all">
                              Konfirmasi Pembayaran
                           </button>
                        </form>
                     </div>
                  </div>
               </div>
            </div>
         )}

         {modalEdit && <KasbonModal initialData={data} onClose={() => setModalEdit(false)} onSuccess={load} />}
         {modalStruk && <StrukPenagihan data={data} onClose={() => setModalStruk(false)} />}
      </div>
   );
}

/* ───────────────────────────────────────────────────────────
   KOMPONEN STRUK PENAGIHAN
─────────────────────────────────────────────────────────── */
function StrukPenagihan({ data, onClose }) {
   const strukturRef  = useRef(null);
   const [shareMode, setShareMode]     = useState('teks');   // 'teks' | 'gambar'
   const [capturing, setCapturing]     = useState(false);

   const sisa      = Math.max(0, Number(data.sisa_tagihan));
   const totalBayar = data.history?.reduce((s, h) => s + Number(h.jumlah_bayar), 0) || 0;
   const printDate  = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
   const persen     = Number(data.total_tagihan) > 0
      ? Math.round((totalBayar / Number(data.total_tagihan)) * 100)
      : 0;

   // Judul dinamis berdasarkan kategori
   const kat = String(data.kategori || '').toUpperCase();
   const isElektronik = ['HP', 'TV', 'LAPTOP', 'ELEKTRONIK'].includes(kat);
   const isTunai      = kat === 'UANG';
   const strukSubtitle = isElektronik ? 'CATATAN PENAGIHAN' : isTunai ? 'CATATAN PENAGIHAN' : 'CATATAN PENAGIHAN';
   const strukTitle    = isElektronik ? 'CICILAN ELEKTRONIK' : isTunai ? 'KASBON TUNAI' : 'KASBON';
   const strukEmoji    = isElektronik ? '📱' : isTunai ? '💵' : '📋';

   /* ── Teks penagihan untuk WA / Email ── */
   const buildPesanPenagihan = () => {
      const riwayat = data.history?.length > 0
         ? [...data.history].reverse()
              .map((h, i) => `  ${i + 1}. ${formatDateShort(h.tanggal_bayar)} : ${formatCurrency(h.jumlah_bayar)}`)
              .join('\n')
         : '  (Belum ada pembayaran)';

      return (
`${strukEmoji} *${strukSubtitle} — ${strukTitle}*
━━━━━━━━━━━━━━━━━━━━━━━━━━
No. Pinjaman : ${data.no_pinjaman}
Nama         : ${data.nama_karyawan}
Kategori     : ${data.kategori}${data.nama_produk ? ' – ' + data.nama_produk : ''}
Tgl Pinjam   : ${formatDateShort(data.tanggal_pinjam)}
━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Tagihan: ${formatCurrency(data.total_tagihan)}
Skema Cicilan: ${formatCurrency(data.nominal_cicilan)} / ${data.tipe_cicilan === 'PER_BULAN' ? 'Bulan' : 'Rit'}
━━━━━━━━━━━━━━━━━━━━━━━━━━
Riwayat Bayar:
${riwayat}
─────────────────────────
Sudah Bayar  : ${formatCurrency(totalBayar)} (${persen}%)
*SISA TAGIHAN: ${sisa <= 0 ? 'LUNAS ✓' : formatCurrency(sisa)}*
━━━━━━━━━━━━━━━━━━━━━━━━━━
Dicetak: ${printDate}
Harap segera melakukan pembayaran. Terima kasih.`
      );
   };

   const handleWA = () => {
      const pesan = encodeURIComponent(buildPesanPenagihan());
      window.open(`https://wa.me/?text=${pesan}`, '_blank');
   };

   /* ── Capture struk jadi gambar lalu share ── */
   const handleWAGambar = async () => {
      if (!strukturRef.current) return;
      setCapturing(true);
      try {
         const html2canvas = (await import('html2canvas')).default;
         const paperEl = strukturRef.current.querySelector('.struk-paper') || strukturRef.current;
         const canvas  = await html2canvas(paperEl, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
         });

         canvas.toBlob(async (blob) => {
            if (!blob) { toast.error('Gagal membuat gambar'); setCapturing(false); return; }
            const file = new File([blob], `struk-${data.no_pinjaman}.png`, { type: 'image/png' });

            // Web Share API — bisa langsung share ke WA di HP
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
               try {
                  await navigator.share({
                     files: [file],
                     title: `Tagihan ${data.nama_karyawan}`,
                     text: `${strukEmoji} Tagihan ${strukTitle} - ${data.nama_karyawan}\nSisa: ${sisa <= 0 ? 'LUNAS' : formatCurrency(sisa)}`,
                  });
               } catch (err) {
                  if (err.name !== 'AbortError') toast.error('Share dibatalkan');
               }
            } else {
               // Fallback: download gambar
               const url = URL.createObjectURL(blob);
               const a   = document.createElement('a');
               a.href = url;
               a.download = `struk-${data.no_pinjaman}.png`;
               a.click();
               URL.revokeObjectURL(url);
               toast.success('Gambar diunduh! Buka WA dan kirim manual.');
            }
            setCapturing(false);
         }, 'image/png');
      } catch (err) {
         console.error(err);
         toast.error('Gagal capture struk');
         setCapturing(false);
      }
   };

   const handleEmail = () => {
      const subject = encodeURIComponent(`Tagihan Kasbon – ${data.nama_karyawan} (${data.no_pinjaman})`);
      const body    = encodeURIComponent(buildPesanPenagihan());
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
   };

   const handlePrint = () => {
      const style = document.createElement('style');
      style.id = '__struk_print_style';
      style.innerHTML = `
         @media print {
            body > *:not(#struk-print-root) { display: none !important; }
            #struk-print-root { display: block !important; position: fixed; top: 0; left: 0; width: 100%; }
            .struk-paper { box-shadow: none !important; border: none !important; margin: 0 auto; width: 100%; max-width: 380px; }
            .no-print { display: none !important; }
         }
      `;
      document.head.appendChild(style);
      const container = document.createElement('div');
      container.id = 'struk-print-root';
      container.innerHTML = strukturRef.current.innerHTML;
      document.body.appendChild(container);
      window.print();
      document.body.removeChild(container);
      document.head.removeChild(style);
   };

   return (
      /* Full-screen on mobile, centered card on desktop */
      <div className="fixed inset-0 z-[200] flex flex-col bg-black/95 backdrop-blur-xl md:items-center md:justify-center md:p-4 animate-fade-in">
         <div className="flex flex-col w-full h-full md:h-auto md:max-h-[95vh] md:max-w-sm">

            {/* ── TOOLBAR ── */}
            <div className="no-print flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0 bg-dark-900/80 md:rounded-t-2xl">
               <h3 className="text-white font-black text-sm uppercase tracking-widest flex items-center gap-2">
                  <FiPrinter className="text-cyan-400" size={16} /> Struk Penagihan
               </h3>
               <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all active:scale-95">
                  <FiX size={18} />
               </button>
            </div>

            {/* ── STRUK PAPER (scrollable) ── */}
            <div ref={strukturRef} className="flex-1 overflow-y-auto">
               <div
                  className="struk-paper bg-white text-gray-900 md:rounded-b-2xl shadow-2xl overflow-hidden"
                  style={{ fontFamily: "'Courier New', Courier, monospace" }}
               >
                  {/* Header */}
                  <div className={`text-white text-center py-5 px-4 ${
                     isElektronik ? 'bg-gradient-to-b from-indigo-900 to-gray-900'
                     : isTunai    ? 'bg-gradient-to-b from-emerald-900 to-gray-900'
                     :              'bg-gray-900'
                  }`}>
                     <p className="text-[10px] font-bold tracking-[0.3em] uppercase opacity-70">{strukSubtitle}</p>
                     <p className="text-[20px] font-black tracking-widest uppercase mt-1 leading-tight">{strukTitle}</p>
                     {data.nama_produk && (
                        <p className="text-[10px] font-bold tracking-wider opacity-60 mt-1 italic">{data.nama_produk}</p>
                     )}
                     <div className="border-t border-dashed border-white/20 mt-3 pt-2">
                        <p className="text-[9px] tracking-widest opacity-50">Dicetak: {printDate}</p>
                     </div>
                  </div>

                  {/* No. Pinjaman */}
                  <div className="bg-gray-100 border-b-2 border-dashed border-gray-300 text-center py-2">
                     <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">No. Pinjaman</p>
                     <p className="text-base font-black text-gray-800 tracking-widest">{data.no_pinjaman}</p>
                  </div>

                  {/* Info Debitur */}
                  <div className="px-5 py-4 space-y-1">
                     <StrukRow label="Nama" value={data.nama_karyawan} bold />
                     {data.nik       && <StrukRow label="NIK"       value={data.nik} />}
                     {data.departemen && <StrukRow label="Dept."     value={data.departemen} />}
                     <StrukRow label="Kategori"  value={data.kategori} />
                     <StrukRow label="Tgl Pinjam" value={formatDateShort(data.tanggal_pinjam)} />
                     {data.nama_produk && <StrukRow label="Produk" value={data.nama_produk} />}
                  </div>

                  <div className="border-t-2 border-dashed border-gray-300 mx-4" />

                  {/* Total Tagihan */}
                  <div className="mx-4 border-t-2 border-gray-800 mt-3" />
                  <div className="px-5 py-3">
                     <StrukRow label="TOTAL TAGIHAN" value={formatCurrency(data.total_tagihan)} bold big />
                  </div>

                  <div className="border-t-2 border-dashed border-gray-300 mx-4" />

                  {/* Skema Cicilan */}
                  <div className="px-5 py-3 space-y-1">
                     <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">── Skema Cicilan ──</p>
                     <StrukRow label="Metode"  value={data.tipe_cicilan === 'PER_BULAN' ? `Bulanan (${data.tenor_bulan} bln)` : 'Per Rit'} />
                     <StrukRow label="Cicilan" value={`${formatCurrency(data.nominal_cicilan)} / ${data.tipe_cicilan === 'PER_BULAN' ? 'Bln' : 'Rit'}`} />
                  </div>

                  <div className="border-t-2 border-dashed border-gray-300 mx-4" />

                  {/* Riwayat Pembayaran */}
                  {data.history?.length > 0 && (
                     <div className="px-5 py-3">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">── Riwayat Pembayaran ──</p>
                        <div className="space-y-1">
                           {[...data.history].reverse().map((h, i) => (
                              <div key={i} className="flex justify-between text-[11px]">
                                 <span className="text-gray-500">{i + 1}. {formatDateShort(h.tanggal_bayar)}</span>
                                 <span className="font-bold text-green-700">+{formatCurrency(h.jumlah_bayar)}</span>
                              </div>
                           ))}
                        </div>
                        <div className="mt-2 pt-1 border-t border-dashed border-gray-300 flex justify-between text-[11px] font-black">
                           <span>Subtotal Bayar:</span>
                           <span className="text-green-700">{formatCurrency(totalBayar)}</span>
                        </div>
                     </div>
                  )}

                  {/* Sisa Tagihan */}
                  <div className={`mx-4 mb-4 p-4 rounded-xl text-center ${
                     sisa <= 0 ? 'bg-green-100 border-2 border-green-500' : 'bg-red-50 border-2 border-red-400'
                  }`}>
                     <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                        {sisa <= 0 ? '✓ LUNAS' : 'SISA TAGIHAN'}
                     </p>
                     <p className={`text-2xl font-black tracking-tighter ${
                        sisa <= 0 ? 'text-green-700' : 'text-red-600'
                     }`}>
                        {sisa <= 0 ? 'LUNAS' : formatCurrency(sisa)}
                     </p>
                     {sisa > 0 && (
                        <p className="text-[10px] text-gray-400 mt-1">({persen}% terbayar)</p>
                     )}
                  </div>

                  {/* Footer struk */}
                  <div className="bg-gray-800 text-white text-center py-4 px-4">
                     <div className="border-t border-dashed border-white/20 pt-3">
                        <p className="text-[8px] tracking-[0.2em] opacity-50 uppercase">Struk ini adalah bukti penagihan resmi</p>
                        <p className="text-[8px] tracking-[0.2em] opacity-50 uppercase mt-0.5">Harap simpan sebagai arsip</p>
                     </div>
                  </div>
               </div>
            </div>

            {/* ── MODE TOGGLE ── */}
            <div className="no-print flex-shrink-0 px-3 pt-3">
               <div className="flex bg-dark-800/60 rounded-2xl p-1 border border-white/10">
                  <button
                     onClick={() => setShareMode('teks')}
                     className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        shareMode === 'teks'
                           ? 'bg-white/15 text-white shadow-inner'
                           : 'text-dark-500 hover:text-white'
                     }`}
                  >
                     <FiType size={13} /> Teks
                  </button>
                  <button
                     onClick={() => setShareMode('gambar')}
                     className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        shareMode === 'gambar'
                           ? 'bg-white/15 text-white shadow-inner'
                           : 'text-dark-500 hover:text-white'
                     }`}
                  >
                     <FiImage size={13} /> Gambar
                  </button>
               </div>
            </div>

            {/* ── ACTION BUTTONS ── */}
            <div className="no-print flex-shrink-0 p-3 border-t border-white/10 bg-dark-900/80">
               <div className="grid grid-cols-3 gap-2">

                  {/* WhatsApp — perilaku sesuai mode */}
                  <button
                     onClick={shareMode === 'teks' ? handleWA : handleWAGambar}
                     disabled={capturing}
                     className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-2xl transition-all shadow-lg active:scale-95 text-white ${
                        capturing
                           ? 'bg-green-800 opacity-60 cursor-wait'
                           : 'bg-green-600 hover:bg-green-500 shadow-green-600/30'
                     }`}
                  >
                     {capturing
                        ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <FiMessageCircle size={20} />
                     }
                     <span className="text-[9px] font-black uppercase tracking-widest">
                        {capturing ? 'Proses...' : shareMode === 'gambar' ? 'WA Foto' : 'WhatsApp'}
                     </span>
                  </button>

                  {/* Email */}
                  <button
                     onClick={handleEmail}
                     className="flex flex-col items-center justify-center gap-1.5 py-3 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-2xl transition-all shadow-lg shadow-blue-600/30"
                  >
                     <FiMail size={20} />
                     <span className="text-[9px] font-black uppercase tracking-widest">Email</span>
                  </button>

                  {/* Print/PDF */}
                  <button
                     onClick={handlePrint}
                     className="flex flex-col items-center justify-center gap-1.5 py-3 bg-cyan-700 hover:bg-cyan-600 active:scale-95 text-white rounded-2xl transition-all shadow-lg shadow-cyan-700/30"
                  >
                     <FiPrinter size={20} />
                     <span className="text-[9px] font-black uppercase tracking-widest">Cetak</span>
                  </button>
               </div>

               {/* Hint mode */}
               <p className="text-center text-[9px] text-dark-600 mt-2 font-bold uppercase tracking-widest">
                  {shareMode === 'gambar'
                     ? '📸 Mode Gambar — WA Foto akan share screenshot struk'
                     : '💬 Mode Teks — WA kirim pesan teks terformat'
                  }
               </p>
            </div>

         </div>
      </div>
   );
}

function StrukRow({ label, value, bold, big, color }) {
   return (
      <div className={`flex justify-between items-baseline gap-2 ${ big ? 'text-sm' : 'text-[11px]' }`}>
         <span className={`text-gray-500 shrink-0 ${ bold ? 'font-black text-gray-800' : '' }`}>{label}</span>
         <span className={`text-right break-all ${ bold ? 'font-black text-gray-900' : 'font-bold text-gray-700' } ${ color || '' } ${ big ? 'text-base' : '' }`}>{value}</span>
      </div>
   );
}
