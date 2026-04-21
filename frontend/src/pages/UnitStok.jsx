import React, { useEffect, useState, useCallback } from 'react';
import {
  FiPlus, FiSearch, FiEdit2, FiTrash2, FiPackage,
  FiSmartphone, FiTv, FiX, FiSave, FiFilter,
  FiAlertCircle, FiCheck, FiBox, FiRefreshCw, FiClock,
  FiUsers, FiDollarSign, FiRepeat
} from 'react-icons/fi';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { formatCurrency, formatDateShort } from '../utils/helpers';

const KATEGORI_LIST = ['HP', 'TV', 'LAINNYA'];
const KONDISI_LIST = ['BARU', 'BEKAS'];

const KATEGORI_ICON = {
  HP: '📱', TV: '📺', LAINNYA: '📦'
};

const KONDISI_COLOR = {
  BARU: { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/30', dot: 'bg-emerald-400' },
  BEKAS: { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30', dot: 'bg-amber-400' },
};

const KATEGORI_COLOR = {
  HP: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  TV: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  LAINNYA: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
};

const STATUS_COLOR = {
  'TERSEDIA': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  'SEDANG DIKREDIT': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'LUNAS': 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  'TERJUAL': 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  'TERJUAL (TT)': 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
};

const emptyForm = {
  kategori: 'HP', nama_produk: '', merek: '', tipe: '',
  kondisi: 'BARU', stok: 1,
  harga_beli: '', harga_jual: '', status: 'TERSEDIA', keterangan: '',
  is_tt: false, tt_barang: '', tt_merek: '', tt_tipe: '', tt_harga: '', tt_harga_jual: '', tt_profit: ''
};

function numberInput(val) {
  const n = parseInt(String(val).replace(/\D/g, ''), 10);
  return isNaN(n) ? '' : n;
}

export default function UnitStok() {
  const [allData, setAllData] = useState([]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterKategori, setFilterKategori] = useState('SEMUA');
  const [filterKondisi, setFilterKondisi] = useState('SEMUA');
  const [filterStatus, setFilterStatus] = useState('SEMUA');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Selalu ambil semua data untuk hitung summary secara akurat (Buster-Cache V72)
      const res = await api.get(`/stok?t=${Date.now()}`);
      setAllData(res.data);
    } catch {
      toast.error('Gagal memuat data stok');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Client-side Filter Logic (Agar Summary tetap Global & Filter lebih responsif)
  useEffect(() => {
    let filtered = [...allData];
    if (filterKategori !== 'SEMUA') filtered = filtered.filter(d => d.kategori === filterKategori);
    if (filterKondisi !== 'SEMUA') filtered = filtered.filter(d => d.kondisi === filterKondisi);
    if (filterStatus !== 'SEMUA') {
      if (filterStatus === 'LUNAS') {
        filtered = filtered.filter(d => d.status === 'LUNAS' || d.status === 'TERJUAL' || d.status === 'TERJUAL (TT)');
      } else {
        filtered = filtered.filter(d => d.status === filterStatus);
      }
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(d => 
        (d.nama_produk || '').toLowerCase().includes(q) || 
        (d.merek || '').toLowerCase().includes(q) || 
        (d.tipe || '').toLowerCase().includes(q)
      );
    }
    setData(filtered);
  }, [allData, filterKategori, filterKondisi, filterStatus, search]);

  // Kalkulator Laporan Global (Selalu akurat meskipun ada filter)
  const summary = {
    total: allData.length,
    baru: allData.filter(d => (d.kondisi || '').toUpperCase() === 'BARU').length,
    bekas: allData.filter(d => (d.kondisi || '').toUpperCase() === 'BEKAS').length,
    tersedia: allData.filter(d => d.status === 'TERSEDIA').length,
    kredit: allData.filter(d => d.status === 'SEDANG DIKREDIT').length,
    lunas: allData.filter(d => d.status === 'LUNAS' || d.status === 'TERJUAL' || d.status === 'TERJUAL (TT)').length,
  };

  const openAdd = () => {
    setForm(emptyForm);
    setEditId(null);
    setShowModal(true);
  };

  const openEdit = (item) => {
    setForm({
      kategori: item.kategori,
      nama_produk: item.nama_produk,
      merek: item.merek,
      tipe: item.tipe,
      kondisi: item.kondisi,
      stok: item.stok,
      harga_beli: item.harga_beli,
      harga_jual: item.harga_jual,
      status: item.status,
      keterangan: item.keterangan || '',
      is_tt: item.is_tt ? true : false,
      tt_barang: item.tt_barang || '',
      tt_merek: item.tt_merek || '',
      tt_tipe: item.tt_tipe || '',
      tt_harga: item.tt_harga || '',
      tt_harga_jual: item.tt_harga_jual || '',
      tt_profit: item.tt_profit || ''
    });
    setEditId(item.id);
    setShowModal(true);
  };

    const handleSave = async () => {
    if (!form.nama_produk.trim()) {
      toast.error('Nama produk wajib diisi');
      return;
    }
    setSaving(true);
    try {
      const payload = { 
        ...form, 
        harga_beli: Number(form.harga_beli) || 0, 
        harga_jual: Number(form.harga_jual) || 0,
        tt_harga: Number(form.tt_harga) || 0,
        tt_harga_jual: Number(form.tt_harga_jual) || 0,
        tt_profit: Number(form.tt_profit) || 0,
        is_tt: form.is_tt ? 1 : 0
      };

      console.log('--- ACTION SAVE (TT CHECK) ---', { 
        editId, 
        status: payload.status, 
        is_tt: payload.is_tt,
        tt_barang: payload.tt_barang 
      });

      if (editId) {
        const res = await api.put(`/stok/${editId}`, payload);
        toast.success(res.data.message || '✅ Data berhasil diperbarui');
      } else {
        const res = await api.post('/stok', payload);
        toast.success(res.data.message || '✅ Stok baru berhasil ditambahkan');
      }
      
      setShowModal(false);
      setTimeout(load, 400); // Sinkronisasi cepat
    } catch (e) {
      console.error('--- FRONTEND SAVE ERROR ---', e);
      toast.error(e.response?.data?.message || 'Gagal menyimpan data');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/stok/${id}`);
      toast.success('🗑️ Data dihapus');
      setDeleteConfirm(null);
      load();
    } catch {
      toast.error('Gagal menghapus');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FiPackage className="text-indigo-400" /> Unit Stok
          </h1>
          <p className="text-dark-500 text-sm mt-1">Manajemen stok barang elektronik</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-secondary flex items-center gap-2">
            <FiRefreshCw className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={openAdd} className="btn-primary flex items-center gap-2">
            <FiPlus className="w-4 h-4" /> Tambah Unit
          </button>
        </div>
      </div>

      {/* Small Condition Counters Above */}
      <div className="flex gap-4 px-1">
        <button 
          onClick={() => setFilterKondisi('BARU')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${filterKondisi === 'BARU' ? 'bg-blue-500/20 border-blue-500/50 text-blue-300' : 'bg-white/3 border-white/5 text-dark-500 hover:text-dark-300'}`}
        >
          <span className="text-xs">✨</span>
          <span className="text-[10px] font-black uppercase tracking-widest">{summary.baru} Unit Baru</span>
        </button>
        <button 
          onClick={() => setFilterKondisi('BEKAS')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${filterKondisi === 'BEKAS' ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' : 'bg-white/3 border-white/5 text-dark-500 hover:text-dark-300'}`}
        >
          <span className="text-xs">♻️</span>
          <span className="text-[10px] font-black uppercase tracking-widest">{summary.bekas} Unit Bekas</span>
        </button>
        {filterKondisi !== 'SEMUA' && (
          <button onClick={() => setFilterKondisi('SEMUA')} className="text-[8px] font-black text-rose-500 uppercase tracking-tighter hover:underline">Reset Kondisi</button>
        )}
      </div>

      {/* Main Status Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { id: 'SEMUA', label: 'Total Item', val: summary.total, icon: '📦', color: 'indigo' },
          { id: 'TERSEDIA', label: 'Tersedia', val: summary.tersedia, icon: '🛒', color: 'emerald' },
          { id: 'SEDANG DIKREDIT', label: 'Sedang Kredit', val: summary.kredit, icon: '📈', color: 'rose' },
          { id: 'LUNAS', label: 'Lun./Terjual', val: summary.lunas, icon: '✅', color: 'indigo' },
        ].map(c => (
          <button 
            key={c.label} 
            onClick={() => setFilterStatus(c.id)}
            className={`glass-card p-4 transition-all hover:scale-[1.03] active:scale-95 text-left border ${
              filterStatus === c.id 
                ? `bg-${c.color}-500/20 border-${c.color}-500/50 ring-1 ring-${c.color}-500/30` 
                : 'border-white/5 bg-white/3 opacity-70 hover:opacity-100'
            }`}
          >
            <div className={`text-2xl mb-2 opacity-80 filter drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]`}>{c.icon}</div>
            <div className="text-2xl font-black text-white">{c.val}</div>
            <div className={`text-[7.5px] text-dark-400 font-bold uppercase tracking-tight mt-1`}>{c.label}</div>
          </button>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="glass-card p-4 flex flex-col gap-4">
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500 w-4 h-4" />
            <input
              type="text"
              className="input-field pl-9 h-10 text-sm"
              placeholder="Cari nama, merek, tipe..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <button onClick={load} className="btn-secondary h-10 w-10 flex items-center justify-center" title="Refresh">
            <FiRefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-wrap gap-4 items-center">
            <div className="flex gap-2 flex-wrap items-center">
              <span className="text-[10px] font-black text-dark-500 uppercase tracking-widest mr-2">KATEGORI:</span>
              {['SEMUA', ...KATEGORI_LIST].map(k => (
                <button
                  key={k}
                  onClick={() => setFilterKategori(k)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all duration-200 ${
                    filterKategori === k
                      ? 'bg-indigo-500 border-indigo-400 text-white shadow-lg'
                      : 'bg-dark-800/60 border-white/10 text-dark-400 hover:text-white'
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>

            <div className="flex gap-2 flex-wrap items-center">
              <span className="text-[10px] font-black text-dark-500 uppercase tracking-widest mr-2">STATUS:</span>
              {['SEMUA', 'TERSEDIA', 'SEDANG DIKREDIT', 'LUNAS'].map(k => (
                <button
                  key={k}
                  onClick={() => setFilterStatus(k)}
                  className={`px-2 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all duration-200 ${
                    filterStatus === k
                      ? 'bg-primary-500 border-primary-400 text-white shadow-lg'
                      : 'bg-dark-800/60 border-white/10 text-dark-400 hover:text-white'
                  }`}
                >
                  {k === 'LUNAS' ? 'LUNAS / TERJUAL' : k}
                </button>
              ))}
            </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-24">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center py-24 text-center">
          <div className="text-6xl mb-4">📭</div>
          <h3 className="text-lg font-semibold text-white">Data Tidak Ditemukan</h3>
          <p className="text-dark-500 text-sm mt-2">Tidak ada unit yang sesuai dengan filter.</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  <th className="px-4 py-4 text-left text-[11px] font-black text-dark-500 uppercase tracking-widest">Produk & Detail</th>
                  <th className="px-4 py-4 text-left text-[11px] font-black text-dark-500 uppercase tracking-widest">Kondisi / Status</th>
                  <th className="px-4 py-4 text-center text-[11px] font-black text-dark-500 uppercase tracking-widest">Sisa Stok</th>
                  <th className="px-4 py-4 text-left text-[11px] font-black text-dark-500 uppercase tracking-widest">Harga Jual</th>
                  <th className="px-4 py-4 text-left text-[11px] font-black text-dark-500 uppercase tracking-widest">Informasi Kredit</th>
                  <th className="px-4 py-4 text-center text-[11px] font-black text-dark-500 uppercase tracking-widest">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.map((item, idx) => {
                  const kondisiStyle = KONDISI_COLOR[item.kondisi] || KONDISI_COLOR.BARU;
                  const statusStyle = STATUS_COLOR[item.status] || STATUS_COLOR.TERSEDIA;
                  
                  return (
                    <tr key={item.id} className="hover:bg-white/[0.03] transition-colors duration-150 animate-slide-up"
                      style={{ animationDelay: `${idx * 30}ms` }}>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-2xl bg-dark-700/80 flex items-center justify-center text-xl flex-shrink-0 border border-white/5 shadow-inner`}>
                            {KATEGORI_ICON[item.kategori] || '📦'}
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm">{item.nama_produk}</div>
                            <div className="text-[11px] text-dark-500 font-semibold uppercase tracking-tight mt-0.5">
                              {item.merek || '-'} • {item.tipe || '-'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-2 items-start text-[10px]">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-black uppercase tracking-wider border ${kondisiStyle.bg} ${kondisiStyle.text} ${kondisiStyle.border}`}>
                              {item.kondisi}
                            </span>
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-black uppercase tracking-wider border ${statusStyle}`}>
                              {item.status}
                            </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {(() => {
                           const isSold = item.status === 'TERJUAL' || item.status === 'TERJUAL (TT)' || item.status === 'LUNAS';
                           const displayStok = isSold ? 0 : item.stok;
                           return (
                               <div className={`inline-flex flex-col items-center justify-center w-12 h-12 rounded-2xl border ${displayStok > 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                                   <span className="text-lg font-black">{displayStok}</span>
                                   <span className="text-[8px] font-bold uppercase tracking-tighter leading-none">{displayStok > 0 ? 'Tersedia' : 'Habis'}</span>
                               </div>
                           )
                        })()}
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                            <div className="text-[10px] text-dark-500 font-bold uppercase tracking-widest leading-none">Beli: <span className="text-dark-300 font-mono">{formatCurrency(item.harga_beli)}</span></div>
                            <div className="text-base text-emerald-400 font-mono font-black">{formatCurrency(item.harga_jual)}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4 min-w-[200px]">
                        {item.status === 'SEDANG DIKREDIT' || item.status === 'LUNAS' ? (
                          <div className={`${item.status === 'LUNAS' ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-blue-500/5 border-blue-500/10'} rounded-2xl p-3 border`}>
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className={`w-6 h-6 rounded-lg ${item.status === 'LUNAS' ? 'bg-emerald-500/20' : 'bg-blue-500/20'} flex items-center justify-center`}>
                                        <FiUsers className={`w-3 h-3 ${item.status === 'LUNAS' ? 'text-emerald-400' : 'text-blue-400'}`} />
                                    </div>
                                    <span className={`text-[11px] font-bold ${item.status === 'LUNAS' ? 'text-emerald-300' : 'text-blue-300'}`}>{item.nama_peminjam}</span>
                                </div>
                                {item.status === 'LUNAS' && (
                                    <span className="text-[8px] font-black bg-emerald-500 text-white px-1.5 py-0.5 rounded-md uppercase">LUNAS</span>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                <div>
                                    <p className="text-[9px] text-dark-500 font-bold uppercase tracking-widest">Sisa Hutang</p>
                                    <p className={`text-[11px] font-mono font-bold ${item.status === 'LUNAS' ? 'text-emerald-400' : 'text-white'}`}>{formatCurrency(item.sisa_tagihan || 0)}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] text-dark-500 font-bold uppercase tracking-widest">Progress</p>
                                    <p className="text-[11px] text-white font-bold">
                                      {(() => {
                                         if (item.tipe_cicilan === 'PER_RIT' && item.nominal_cicilan > 0) {
                                            const totalRit = Math.ceil(item.total_tagihan / item.nominal_cicilan);
                                            return `${item.cicilan_count || 0} / ${totalRit} Rit`;
                                         }
                                         return `${item.cicilan_count || 0} / ${item.tenor_bulan} Bln`;
                                      })()}
                                    </p>
                                    {item.status !== 'LUNAS' && (
                                        <p className="text-[9px] text-blue-400 font-bold italic">
                                          Sisa: {(() => {
                                             if (item.tipe_cicilan === 'PER_RIT' && item.nominal_cicilan > 0) {
                                                const totalRit = Math.ceil(item.total_tagihan / item.nominal_cicilan);
                                                return `${Math.max(0, totalRit - (item.cicilan_count || 0))} Rit`;
                                             }
                                             return `${Math.max(0, item.tenor_bulan - (item.cicilan_count || 0))} Bln`;
                                          })()}
                                        </p>
                                    )}
                                </div>
                                <div className="col-span-2">
                                    <div className="w-full bg-dark-800 h-1.5 rounded-full overflow-hidden mt-1">
                                        <div 
                                            className={`${item.status === 'LUNAS' ? 'bg-emerald-500' : 'bg-blue-500'} h-full rounded-full transition-all duration-1000`} 
                                            style={{ 
                                              width: item.status === 'LUNAS' ? '100%' : `${(() => {
                                                 if (item.tipe_cicilan === 'PER_RIT' && item.nominal_cicilan > 0) {
                                                    const totalRit = Math.ceil(item.total_tagihan / item.nominal_cicilan);
                                                    return ((item.cicilan_count || 0) / totalRit) * 100;
                                                 }
                                                 return ((item.cicilan_count || 0) / (item.tenor_bulan || 1)) * 100;
                                              })()}%` 
                                            }} 
                                        />
                                    </div>
                                </div>
                            </div>
                          </div>
                        ) : (item.status === 'TERJUAL' || item.status === 'TERJUAL (TT)') ? (
                          <div className="flex flex-col gap-1">
                             <div className="flex items-center gap-2 text-rose-400 font-bold italic">
                                <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                                <span className="text-[10px] uppercase tracking-widest">
                                    {item.status === 'TERJUAL (TT)' ? 'Sudah Terjual (Tukar Tambah)' : 'Sudah Terjual (Cash)'}
                                </span>
                             </div>
                             {item.status === 'TERJUAL (TT)' && item.tt_barang && (
                                 <div className="text-[9px] text-indigo-400 font-black uppercase tracking-tighter bg-indigo-500/5 px-2 py-1 rounded-lg border border-indigo-500/10">
                                     Masuk: {item.tt_barang}
                                 </div>
                             )}
                          </div>
                        ) : (
                          <span className="text-dark-600 text-[10px] font-bold italic tracking-widest uppercase">Tersedia untuk dijual</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => openEdit(item)}
                            className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/30 flex items-center justify-center transition-all border border-indigo-500/20 active:scale-95">
                            <FiEdit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleteConfirm(item)}
                            className="w-9 h-9 rounded-xl bg-red-500/15 text-red-400 hover:bg-red-500/30 flex items-center justify-center transition-all border border-red-500/20 active:scale-95">
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass rounded-3xl p-8 w-full max-w-2xl animate-slide-up overflow-y-auto max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  {editId ? <FiEdit2 className="text-indigo-400" /> : <FiPlus className="text-indigo-400" />}
                  {editId ? 'Edit Unit Stok' : 'Tambah Unit Stok'}
                </h3>
                <p className="text-dark-500 text-sm mt-0.5">Lengkapi spesifikasi dan harga unit</p>
              </div>
              <button onClick={() => setShowModal(false)}
                className="w-10 h-10 rounded-2xl bg-dark-700 text-dark-400 hover:text-white flex items-center justify-center border border-white/5 active:scale-95 transition-all">
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Kategori */}
                <div className="space-y-3">
                    <label className="text-[11px] font-black text-dark-500 uppercase tracking-widest">Kategori Unit</label>
                    <div className="flex flex-wrap gap-2">
                        {KATEGORI_LIST.map(k => (
                        <button key={k} type="button" onClick={() => setForm(f => ({ ...f, kategori: k }))}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold border transition-all duration-200 ${
                            form.kategori === k
                                ? 'bg-indigo-500 border-indigo-400 text-white shadow-lg shadow-indigo-500/30 scale-105'
                                : 'bg-dark-800/60 border-white/10 text-dark-400 hover:text-white'
                            }`}>
                            <span>{KATEGORI_ICON[k]}</span> {k}
                        </button>
                        ))}
                    </div>
                </div>

                {/* Kondisi */}
                <div className="space-y-3">
                    <label className="text-[11px] font-black text-dark-500 uppercase tracking-widest">Kondisi Barang</label>
                    <div className="flex gap-2">
                        {KONDISI_LIST.map(k => {
                        const s = KONDISI_COLOR[k];
                            return (
                                <button key={k} type="button" onClick={() => setForm(f => ({ ...f, kondisi: k }))}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-xs font-bold border transition-all duration-200 ${
                                    form.kondisi === k ? `${s.bg} ${s.text} ${s.border} scale-105 shadow-lg` : 'bg-dark-800/60 border-white/10 text-dark-400 hover:text-white'
                                }`}>
                                    {k === 'BARU' ? '✨ BARU' : '♻️ BEKAS'}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Main Data */}
                <div className="md:col-span-2 space-y-4">
                    <div>
                        <label className="form-label">Nama / Model Produk <span className="text-red-400">*</span></label>
                        <input type="text" className="input-field mt-1"
                        placeholder="Contoh: IPHONE 15 PRO MAX 256GB"
                        value={form.nama_produk}
                        onChange={e => setForm(f => ({ ...f, nama_produk: e.target.value.toUpperCase() }))} />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="form-label">Merek</label>
                            <input type="text" className="input-field mt-1"
                            placeholder="SAMSUNG, APPLE, DLL"
                            value={form.merek}
                            onChange={e => setForm(f => ({ ...f, merek: e.target.value.toUpperCase() }))} />
                        </div>
                        <div>
                            <label className="form-label">Tipe / Varian</label>
                            <input type="text" className="input-field mt-1"
                            placeholder="HITAM / 8GB / 256GB"
                            value={form.tipe}
                            onChange={e => setForm(f => ({ ...f, tipe: e.target.value.toUpperCase() }))} />
                        </div>
                    </div>
                </div>

                {/* Pricing, Status & Trade-In Section */}
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                    <div className="space-y-4">
                        <div>
                            <label className="form-label">Harga Beli Modal (Rp)</label>
                            <input type="text" className="input-field mt-1 font-mono font-bold text-indigo-400"
                            placeholder="0"
                            value={form.harga_beli ? Number(form.harga_beli).toLocaleString('id-ID') : ''}
                            onChange={e => setForm(f => ({ ...f, harga_beli: numberInput(e.target.value) }))} />
                        </div>
                        <div>
                            <label className="form-label">Harga Jual (Rp)</label>
                            <input type="text" className="input-field mt-1 font-mono font-bold text-emerald-400"
                            placeholder="0"
                            value={form.harga_jual ? Number(form.harga_jual).toLocaleString('id-ID') : ''}
                            onChange={e => setForm(f => ({ ...f, harga_jual: numberInput(e.target.value) }))} />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-end gap-3">
                            <div className="flex-1">
                                <label className="form-label">Update Status</label>
                                <select 
                                    className="input-field mt-1"
                                    value={form.status}
                                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                                >
                                    <option value="TERSEDIA">TERSEDIA</option>
                                    <option value="TERJUAL">TERJUAL (CASH)</option>
                                    <option value="TERJUAL (TT)">TERJUAL (TUKER TAMBAH)</option>
                                </select>
                            </div>
                            <button 
                                type="button"
                                onClick={() => setForm(f => ({ 
                                    ...f, 
                                    is_tt: !f.is_tt,
                                    status: !f.is_tt ? 'TERJUAL (TT)' : 'TERSEDIA' 
                                }))}
                                className={`p-2.5 rounded-xl border transition-all flex items-center justify-center gap-2 ${form.is_tt ? 'bg-indigo-500 border-indigo-400 text-white shadow-lg' : 'bg-dark-800 border-white/5 text-dark-500 hover:text-white'}`}
                                title="Lakukan Tukar Tambah"
                            >
                                <FiRepeat className={form.is_tt ? 'animate-spin-slow' : ''} />
                                <span className="text-[10px] font-black uppercase tracking-widest">{form.is_tt ? 'Batal TT' : 'Tukar Tambah'}</span>
                            </button>
                        </div>

                        {form.is_tt && (
                            <div className="p-4 bg-primary-500/5 border border-primary-500/20 rounded-2xl space-y-4 animate-slide-up">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded bg-primary-500/20 flex items-center justify-center text-primary-400"><FiRepeat size={10} /></div>
                                        <h4 className="text-[9px] font-black text-white uppercase tracking-widest">Detail Tukar Tambah</h4>
                                    </div>
                                    <div className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20">
                                        <span className="text-[8px] text-emerald-400 font-black uppercase tracking-tighter">Nambah: +{formatCurrency(Math.max(0, Number(form.harga_jual || 0) - Number(form.tt_harga || 0)))}</span>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <input type="text" className="input-field h-9 text-[11px]" placeholder="NAMA PRODUK TT (CONTOH: VIVO V30)" value={form.tt_barang} onChange={e => setForm(f => ({ ...f, tt_barang: e.target.value.toUpperCase() }))} />
                                    <div className="grid grid-cols-2 gap-3">
                                        <input type="text" className="input-field h-9 text-[11px]" placeholder="MEREK" value={form.tt_merek} onChange={e => setForm(f => ({ ...f, tt_merek: e.target.value.toUpperCase() }))} />
                                        <input type="text" className="input-field h-9 text-[11px]" placeholder="TIPE / VARIAN" value={form.tt_tipe} onChange={e => setForm(f => ({ ...f, tt_tipe: e.target.value.toUpperCase() }))} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[8px] font-bold text-dark-500 uppercase tracking-widest mb-1 block">Harga Asset (Beli TT)</label>
                                            <input type="text" className="input-field h-9 text-[11px] font-mono text-indigo-400" placeholder="0" value={form.tt_harga ? Number(form.tt_harga).toLocaleString('id-ID') : ''} onChange={e => setForm(f => ({ ...f, tt_harga: numberInput(e.target.value) }))} />
                                        </div>
                                        <div>
                                            <label className="text-[8px] font-bold text-dark-500 uppercase tracking-widest mb-1 block">Harga Jual TT (Stok)</label>
                                            <input type="text" className="input-field h-9 text-[11px] font-mono text-emerald-400" placeholder="0" value={form.tt_harga_jual ? Number(form.tt_harga_jual).toLocaleString('id-ID') : ''} onChange={e => setForm(f => ({ ...f, tt_harga_jual: numberInput(e.target.value) }))} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1">
                                        <div>
                                            <label className="text-[8px] font-bold text-dark-500 uppercase tracking-widest mb-1 block">Profit Tambahan / Fee Admin</label>
                                            <input type="text" className="input-field h-9 text-[11px] font-mono text-emerald-400" placeholder="0" value={form.tt_profit ? Number(form.tt_profit).toLocaleString('id-ID') : ''} onChange={e => setForm(f => ({ ...f, tt_profit: numberInput(e.target.value) }))} />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                        <span className="text-[9px] text-dark-400 font-bold uppercase tracking-wider">Profit Unit Sudah Otomatis: <span className="text-emerald-400">{formatCurrency(Math.max(0, Number(form.harga_jual || 0) - Number(form.harga_beli || 0)))}</span></span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="md:col-span-2">
                    <label className="form-label">Keterangan Tambahan</label>
                    <textarea rows={2} className="input-field mt-1 resize-none text-xs"
                    placeholder="Info kelengkapan, garansi, dll..."
                    value={form.keterangan}
                    onChange={e => setForm(f => ({ ...f, keterangan: e.target.value }))} />
                </div>

                {/* Margin Display */}
                {form.harga_beli > 0 && form.harga_jual > 0 && (
                    <div className="md:col-span-2 flex items-center justify-between px-5 py-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                                <FiDollarSign className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] text-dark-500 font-bold uppercase tracking-widest">Margin Keuntungan</p>
                                <p className="text-lg font-black text-emerald-400 font-mono">+{formatCurrency(Number(form.harga_jual) - Number(form.harga_beli) + (form.is_tt ? Number(form.tt_profit || 0) : 0))}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] text-dark-500 font-bold uppercase tracking-widest">Persentase</p>
                            <p className="text-lg font-black text-emerald-500">{Math.round(((Number(form.harga_jual) - Number(form.harga_beli) + (form.is_tt ? Number(form.tt_profit || 0) : 0)) / Number(form.harga_beli)) * 100)}%</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex gap-4 mt-10">
              <button onClick={() => setShowModal(false)}
                className="btn-secondary h-12 flex-1 justify-center rounded-2xl font-bold uppercase text-[11px] tracking-widest">
                BATAL
              </button>
              <button onClick={handleSave} disabled={saving}
                className="btn-primary h-12 flex-1 justify-center rounded-2xl font-bold flex items-center gap-2 uppercase text-[11px] tracking-widest">
                {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiSave />}
                {editId ? 'SIMPAN PERUBAHAN' : 'TAMBAH UNIT STOK'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass rounded-3xl p-8 w-full max-w-sm animate-slide-up text-center border border-red-500/20">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
              <FiTrash2 className="w-10 h-10 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Konfirmasi Hapus</h3>
            <p className="text-dark-400 text-sm mb-1 leading-relaxed">
              Anda akan menghapus data <span className="text-white font-bold">{deleteConfirm.nama_produk}</span>
            </p>
            <p className="text-red-400/60 text-[10px] font-bold uppercase tracking-widest mb-8">Tidakan ini bersifat permanen!</p>
            
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="btn-secondary h-11 flex-1 justify-center rounded-xl">Batal</button>
              <button onClick={() => handleDelete(deleteConfirm.id)}
                className="btn-danger h-11 flex-1 justify-center rounded-xl font-bold">HAPUS DATA</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


