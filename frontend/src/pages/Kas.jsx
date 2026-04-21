import React, { useEffect, useState } from 'react';
import { FiPlus, FiMinus, FiDollarSign, FiArrowUpRight, FiArrowDownLeft, FiClock, FiX } from 'react-icons/fi';
import api from '../api/axios';
import { formatCurrency, formatDateShort, formatIDR, parseIDR } from '../utils/helpers';
import toast from 'react-hot-toast';

export default function Kas() {
  const [data, setData] = useState({ saldo: 0, recentHistory: [] });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ show: false, mode: 'masuk' }); // masuk / keluar
  const [form, setForm] = useState({ jumlah_display: '', keterangan: '' });

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/kas');
      setData(res.data);
    } catch { toast.error('Gagal memuat kas'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const rawJumlah = parseIDR(form.jumlah_display);
    if (!rawJumlah) return toast.error('Masukkan jumlah uang!');
    
    try {
      const endpoint = modal.mode === 'masuk' ? '/kas/modal' : '/kas/tarik';
      await api.post(endpoint, { jumlah: rawJumlah, keterangan: form.keterangan });
      toast.success(modal.mode === 'masuk' ? 'Modal berhasil ditambah' : 'Uang berhasil ditarik');
      setModal({ show: false });
      setForm({ jumlah_display: '', keterangan: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Transaksi gagal');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white uppercase tracking-tight">Manajemen Kas Utama</h1>
        <div className="flex gap-3">
          <button onClick={() => setModal({ show: true, mode: 'masuk' })} className="btn-primary-outline border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10">
            <FiPlus /> Setor Modal
          </button>
          <button onClick={() => setModal({ show: true, mode: 'keluar' })} className="btn-primary-outline border-red-500/50 text-red-400 hover:bg-red-500/10">
            <FiMinus /> Tarik Tunai
          </button>
        </div>
      </div>

      {/* Main Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 glass-card p-8 bg-gradient-to-br from-primary-600/20 to-primary-900/10 border-primary-500/20 relative overflow-hidden group">
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-primary-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
          <p className="text-sm text-dark-400 font-medium mb-2 uppercase tracking-widest italic">Total Saldo Kas</p>
          <h2 className="text-4xl font-black text-white tracking-tighter">
            {loading ? '---' : formatCurrency(data.saldo)}
          </h2>
          <div className="mt-6 flex items-center gap-2 text-dark-500 text-xs">
            <FiClock /> Terakhir update: {new Date().toLocaleTimeString('id-ID')}
          </div>
        </div>

        <div className="lg:col-span-2 glass-card p-0 overflow-hidden">
          <div className="p-6 border-b border-white/5 bg-white/3 flex items-center justify-between">
            <h3 className="font-bold text-white uppercase text-sm tracking-widest flex items-center gap-3">
              <FiClock className="text-primary-500" /> Riwayat Mutasi Terakhir
            </h3>
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            <table className="w-full text-left">
              <tbody className="divide-y divide-white/5">
                {data.recentHistory?.map((h, i) => (
                  <tr key={i} className="hover:bg-white/5 transition-colors group">
                    <td className="p-4">
                      {h.tipe === 'masuk' ? 
                        <FiArrowUpRight className="text-emerald-500 w-8 h-8 p-1.5 bg-emerald-500/10 rounded-xl" /> : 
                        <FiArrowDownLeft className="text-red-500 w-8 h-8 p-1.5 bg-red-500/10 rounded-xl" />
                      }
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-bold text-white group-hover:text-primary-400 transition-colors uppercase tracking-tight">{h.keterangan || (h.tipe === 'masuk' ? 'Setoran Modal' : 'Penarikan Dana')}</div>
                      <div className="text-[10px] text-dark-500 mt-1">{formatDateShort(h.tanggal)}</div>
                    </td>
                    <td className={`p-4 text-right font-bold ${h.tipe === 'masuk' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {h.tipe === 'masuk' ? '+' : '-'} {formatCurrency(h.jumlah)}
                    </td>
                  </tr>
                ))}
                {data.recentHistory?.length === 0 && (
                  <tr><td colSpan="3" className="p-10 text-center text-dark-500 italic">Belum ada aktivitas mutasi kas</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Transaction */}
      {modal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-md p-0 overflow-hidden shadow-2xl">
            <div className={`p-6 border-b border-white/5 bg-white/3 flex items-center justify-between ${modal.mode === 'masuk' ? 'border-emerald-500/20' : 'border-red-500/20'}`}>
              <h3 className="text-xl font-bold text-white uppercase tracking-tighter">
                {modal.mode === 'masuk' ? 'Tambah Setoran Modal' : 'Penarikan Kas Utama'}
              </h3>
              <button onClick={() => setModal({ show: false })} className="p-2 hover:bg-white/10 rounded-xl transition-colors"><FiX /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="label text-xs font-black text-dark-400 mb-3 block uppercase tracking-[0.2em]">Nominal Uang (Rp)</label>
                <div className="relative">
                  <FiDollarSign className={`absolute left-4 top-1/2 -translate-y-1/2 ${modal.mode === 'masuk' ? 'text-emerald-500' : 'text-red-500'}`} />
                  <input 
                    type="text" 
                    className="input-field pl-12 text-2xl font-black tracking-tighter" 
                    placeholder="23.000" 
                    value={form.jumlah_display} 
                    onChange={e => setForm({ ...form, jumlah_display: formatIDR(e.target.value) })}
                    autoFocus
                  />
                </div>
              </div>
              <div>
                <label className="label text-xs font-black text-dark-400 mb-3 block uppercase tracking-[0.2em]">Keterangan Transaksi</label>
                <textarea rows="3" className="input-field py-3 text-sm h-auto" placeholder="Tulis catatan (misal: Setoran sisa lunas, kebutuhan TV, dll)" value={form.keterangan} onChange={e => setForm({ ...form, keterangan: e.target.value.toUpperCase() })} />
              </div>
              <button type="submit" className={`w-full h-16 rounded-[24px] text-base font-black tracking-[0.2em] shadow-xl transition-all active:scale-95 ${modal.mode === 'masuk' ? 'bg-emerald-600 text-white shadow-emerald-600/20' : 'bg-red-600 text-white shadow-red-600/20'}`}>
                KONFIRMASI {modal.mode === 'masuk' ? 'SETORAN' : 'PENARIKAN'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
