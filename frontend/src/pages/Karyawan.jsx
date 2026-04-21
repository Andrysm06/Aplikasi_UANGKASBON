import React, { useEffect, useState } from 'react';
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiUser, FiPhone } from 'react-icons/fi';
import api from '../api/axios';
import { formatDateShort } from '../utils/helpers';
import toast from 'react-hot-toast';
import KaryawanModal from '../components/KaryawanModal';

export default function Karyawan() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState({ show: false, editData: null });

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/karyawan', { params: { search } });
      setData(res.data);
    } catch { toast.error('Gagal memuat data'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id, nama) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus profil '${nama}'?`)) return;
    
    try {
      await api.delete(`/karyawan/${id}`);
      toast.success('Karyawan Berhasil Dihapus!');
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal menghapus data');
    }
  };

  useEffect(() => { load(); }, [search]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white uppercase tracking-tight">Profil Karyawan</h1>
        <button className="btn-primary" onClick={() => setModal({ show: true, editData: null })}>
          <FiPlus /> Daftarkan Karyawan
        </button>
      </div>

      <div className="glass-card flex items-center gap-3">
        <FiSearch className="text-dark-500" />
        <input className="bg-transparent border-none focus:outline-none text-white text-sm w-full" 
          placeholder="Cari Nama atau Jabatan..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="glass-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/3 border-b border-white/5">
              <tr>
                <th className="table-header">Profil Karyawan</th>
                <th className="table-header text-center">Nomor HP</th>
                <th className="table-header text-center">Tanggal Masuk</th>
                <th className="table-header text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" className="py-20 text-center text-dark-500 italic">Memperbarui database...</td></tr>
              ) : data.map(k => (
                <tr key={k.id} className="table-row group">
                  <td className="table-cell">
                    <div className="font-bold text-white group-hover:text-primary-400 transition-colors uppercase flex items-center gap-3">
                       <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-dark-500 shadow-inner"><FiUser size={16}/></div>
                       <div>
                          <p>{k.nama}</p>
                          <p className="text-[10px] text-dark-500 font-normal tracking-wide">{k.jabatan || '-'}</p>
                       </div>
                    </div>
                  </td>
                  <td className="table-cell text-center">
                    <div className="flex items-center justify-center gap-2 text-xs text-dark-400">
                       <FiPhone size={11} className="text-emerald-500" /> {k.no_hp || '-'}
                    </div>
                  </td>
                  <td className="table-cell text-center">
                    <div className="text-xs text-dark-500 font-mono italic">{k.tgl_masuk ? formatDateShort(k.tgl_masuk) : '-'}</div>
                  </td>
                  <td className="table-cell text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button 
                        onClick={() => setModal({ show: true, editData: k })}
                        className="p-2.5 text-dark-500 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                        title="Ubah Profil"
                      >
                        <FiEdit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(k.id, k.nama)}
                        className="p-2.5 text-red-500/50 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                        title="Hapus Karyawan"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.length === 0 && !loading && <p className="text-center text-dark-500 py-10 italic">Data tidak ditemukan</p>}
        </div>
      </div>

      {modal.show && (
        <KaryawanModal 
          initialData={modal.editData} 
          onClose={() => setModal({ show: false, editData: null })} 
          onSuccess={load} 
        />
      )}
    </div>
  );
}
