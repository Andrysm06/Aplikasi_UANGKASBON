import React, { useEffect, useState } from 'react';
import { FiCheckCircle, FiXCircle, FiEye, FiClock } from 'react-icons/fi';
import api from '../api/axios';
import { formatCurrency, formatDateShort } from '../utils/helpers';
import toast from 'react-hot-toast';
import KasbonDetail from '../components/KasbonDetail';

export default function Approval() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState(null);
  const [modal, setModal] = useState({ open: false, id: null, action: '' });
  const [catatan, setCatatan] = useState('');
  const [processing, setProcessing] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const r = await api.get('/approval'); setData(r.data); } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleAction = async () => {
    setProcessing(true);
    try {
      await api.put(`/approval/${modal.id}/${modal.action}`, { catatan_approval: catatan });
      toast.success(modal.action === 'approve' ? '✅ Kasbon disetujui!' : '❌ Kasbon ditolak');
      setModal({ open: false, id: null, action: '' });
      setCatatan('');
      load();
    } catch (e) { toast.error(e.response?.data?.message || 'Gagal'); }
    finally { setProcessing(false); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Approval Kasbon</h1>
        <p className="text-dark-500 text-sm mt-1">{data.length} kasbon menunggu persetujuan</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : data.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center py-24 text-center">
          <FiCheckCircle className="w-16 h-16 text-emerald-400/30 mb-4" />
          <h3 className="text-lg font-semibold text-white">Semua Sudah Diproses</h3>
          <p className="text-dark-500 text-sm mt-2">Tidak ada kasbon yang menunggu persetujuan saat ini.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.map(k => (
            <div key={k.id} className="glass-card hover:border-white/20 transition-all duration-300 animate-slide-up">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <FiClock className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                    <span className="font-mono text-yellow-400 text-xs font-bold">{k.no_kasbon}</span>
                  </div>
                  <h3 className="text-white font-semibold text-lg">{k.nama_karyawan}</h3>
                  <p className="text-dark-500 text-sm">{k.nik} • {k.departemen}</p>
                  <div className="mt-3 bg-dark-800/50 rounded-xl p-3">
                    <p className="text-xs text-dark-500 mb-1">Keperluan</p>
                    <p className="text-sm text-gray-300">{k.keperluan}</p>
                  </div>
                  <div className="flex flex-wrap gap-4 mt-3 text-sm">
                    <div><span className="text-dark-500">Nominal: </span><span className="text-white font-bold text-lg">{formatCurrency(k.jumlah)}</span></div>
                    <div><span className="text-dark-500">Diajukan: </span><span className="text-white">{formatDateShort(k.tanggal_pengajuan)}</span></div>
                    {k.tanggal_butuh && <div><span className="text-dark-500">Dibutuhkan: </span><span className="text-yellow-400">{formatDateShort(k.tanggal_butuh)}</span></div>}
                  </div>
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button className="btn-success" onClick={() => { setModal({ open: true, id: k.id, action: 'approve' }); setCatatan(''); }}>
                    <FiCheckCircle className="w-4 h-4" /> Setujui
                  </button>
                  <button className="btn-danger" onClick={() => { setModal({ open: true, id: k.id, action: 'reject' }); setCatatan(''); }}>
                    <FiXCircle className="w-4 h-4" /> Tolak
                  </button>
                  <button className="btn-secondary" onClick={() => setDetailId(k.id)}>
                    <FiEye className="w-4 h-4" /> Detail
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirm Modal */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-3xl p-6 w-full max-w-md animate-slide-up">
            <h3 className="text-lg font-bold text-white mb-2">
              {modal.action === 'approve' ? '✅ Setujui Kasbon' : '❌ Tolak Kasbon'}
            </h3>
            <p className="text-dark-400 text-sm mb-4">Tambahkan catatan (opsional)</p>
            <textarea rows={3} className="input-field resize-none mb-4" placeholder="Catatan approval..."
              value={catatan} onChange={e => setCatatan(e.target.value)} />
            <div className="flex gap-3">
              <button className="btn-secondary flex-1 justify-center" onClick={() => setModal({ open: false, id: null, action: '' })}>Batal</button>
              <button onClick={handleAction} disabled={processing}
                className={`flex-1 justify-center ${modal.action === 'approve' ? 'btn-success' : 'btn-danger'}`}>
                {processing ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Konfirmasi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {detailId && <KasbonDetail id={detailId} onClose={() => setDetailId(null)} onRefresh={load} />}
    </div>
  );
}
