import React, { useEffect, useState } from 'react';
import { FiX, FiUser, FiInfo, FiClock, FiDollarSign, FiFileText } from 'react-icons/fi';
import api from '../api/axios';
import { formatCurrency, formatDateShort } from '../utils/helpers';

export default function KasbonDetail({ id, onClose, onRefresh }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/kasbon/${id}`);
      setData(res.data);
    } catch {
      // Fallback: If kasbon detail fetch fails, it might be because it's still in approval status
      // (sometimes the endpoints are separate). But usually detailed view is same.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) load();
  }, [id]);

  if (!id) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="glass-card w-full max-w-2xl p-0 overflow-hidden shadow-2xl relative border-white/10 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/3">
          <div className="flex items-center gap-3 text-white">
            <div className="w-10 h-10 bg-primary-600/30 rounded-xl flex items-center justify-center text-primary-400">
              <FiInfo className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight">Detail Pengajuan</h2>
              <p className="text-[10px] text-dark-500 font-bold tracking-widest uppercase">Pemeriksaan Keaslian Data</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all shadow-lg active:scale-95"><FiX /></button>
        </div>

        {/* Content */}
        <div className="p-8 max-h-[70vh] overflow-y-auto space-y-8 scroll-smooth">
          {loading ? (
            <div className="py-20 text-center"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>
          ) : !data ? (
            <div className="py-20 text-center text-dark-500 italic uppercase text-[10px] tracking-widest">Gagal memuat data detail.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Profiling */}
              <div className="space-y-6">
                <div className="p-6 bg-white/3 rounded-[32px] border border-white/5 text-center">
                  <div className="w-16 h-16 bg-primary-600 text-white rounded-full mx-auto flex items-center justify-center text-2xl font-black mb-3 shadow-xl">{data.nama_karyawan?.charAt(0)}</div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">{data.nama_karyawan}</h3>
                  <p className="text-[10px] text-dark-500 font-bold uppercase tracking-widest mt-1">NIK: {data.nik}</p>
                </div>

                <div className="space-y-3">
                  <DetailItem icon={<FiUser className="text-primary-400" />} label="Departemen" value={data.departemen || 'Operational'} />
                  <DetailItem icon={<FiInfo className="text-primary-400" />} label="Kategori" value={data.kategori} />
                  <DetailItem icon={<FiClock className="text-yellow-400" />} label="Tgl Pengajuan" value={formatDateShort(data.tanggal_pengajuan)} />
                </div>
              </div>

              {/* Financials */}
              <div className="space-y-6">
                <div className="p-6 bg-primary-600/10 rounded-[32px] border border-primary-500/20 shadow-inner">
                  <p className="text-[10px] text-primary-400 font-black uppercase tracking-widest text-center mb-2">Estimasi Pencairan</p>
                  <h3 className="text-3xl font-black text-white text-center tracking-tight">{formatCurrency(data.pokok)}</h3>
                </div>

                <div className="glass-card p-6 border-white/5 bg-dark-800/50">
                  <p className="text-[10px] text-dark-500 font-black uppercase tracking-widest mb-3 flex items-center gap-2"><FiFileText /> Keperluan Dana</p>
                  <p className="text-xs text-gray-300 leading-relaxed italic">"{data.keperluan || 'Tidak ada alasan spesifik yang dicantumkan.'}"</p>
                </div>

                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex justify-between items-center">
                  <div className="flex items-center gap-3 text-emerald-400">
                    <FiDollarSign />
                    <span className="text-[10px] font-black uppercase tracking-widest">Total Tagihan</span>
                  </div>
                  <span className="text-sm font-black text-white uppercase tracking-tighter">{formatCurrency(data.total_tagihan)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-white/3 flex justify-end gap-3">
          <button onClick={onClose} className="px-8 py-3 bg-dark-700 hover:bg-dark-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95">Tutup Detail</button>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ icon, label, value }) {
  return (
    <div className="flex items-center justify-between p-4 bg-dark-800/30 rounded-2xl border border-white/5">
      <div className="flex items-center gap-3 text-dark-400">
        {icon}
        <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <span className="text-xs font-bold text-white uppercase">{value}</span>
    </div>
  );
}
