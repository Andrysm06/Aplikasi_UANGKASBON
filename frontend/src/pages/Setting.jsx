import React, { useEffect, useState } from 'react';
import { FiUserPlus, FiTrash2, FiUser, FiShield, FiLock, FiX } from 'react-icons/fi';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function Setting() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ nama: '', username: '', password: '', role: 'staff' });

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/auth/users');
      setUsers(res.data);
    } catch { toast.error('Gagal memuat daftar user'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/register', form);
      toast.success('Akses User Berhasil Dibuat!');
      setModalOpen(false);
      setForm({ nama: '', username: '', password: '', role: 'staff' });
      load();
    } catch (err) {
       toast.error(err.response?.data?.message || 'Gagal menambah user');
    }
  };

  const handleDelete = async (id, name) => {
    if (id === 1) return toast.error('Admin Utama tidak bisa dihapus!');
    if (!window.confirm(`CABUT AKSES untuk ${name}?\n\nSetelah dihapus, orang ini tidak akan bisa login lagi ke sistem ini.`)) return;
    try {
      await api.delete(`/auth/users/${id}`);
      toast.success('Akses Berhasil Dicabut!');
      load();
    } catch (err) { toast.error('Gagal menghapus user'); }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight">PENGATURAN AKSES</h1>
          <p className="text-[10px] text-dark-500 font-bold uppercase tracking-widest mt-1">Kelola Username & Password Login</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary h-12 px-6">
          <FiUserPlus /> Tambah User Baru
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loading ? (
          <div className="py-20 text-center text-dark-500 italic uppercase">Memeriksa Database Keamanan...</div>
        ) : users.map(u => (
          <div key={u.id} className="glass-card p-6 flex items-center justify-between group overflow-hidden border-white/5 bg-white/2 hover:bg-white/5 transition-all">
             <div className="flex items-center gap-5">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl shadow-inner ${u.role === 'admin' ? 'bg-primary-600/10 text-primary-500' : 'bg-amber-600/10 text-amber-500'}`}>
                   {u.role === 'admin' ? <FiShield /> : <FiUser />}
                </div>
                <div>
                   <h3 className="text-sm font-black text-white uppercase">{u.nama}</h3>
                   <div className="flex items-center gap-3 mt-1">
                      <span className="text-[9px] text-dark-500 font-bold uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-full">{u.role}</span>
                      <span className="text-[10px] text-dark-400 font-mono italic">user: {u.username}</span>
                   </div>
                </div>
             </div>
             {u.id !== 1 && (
               <button 
                 onClick={() => handleDelete(u.id, u.nama)}
                 className="p-3 text-dark-700 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
               >
                 <FiTrash2 size={20} />
               </button>
             )}
          </div>
        ))}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
           <div className="glass-card w-full max-w-md p-0 overflow-hidden shadow-2xl border-white/5">
              <div className="p-6 border-b border-white/5 bg-white/3 flex items-center justify-between">
                 <h3 className="text-xl font-black text-white uppercase tracking-tighter text-emerald-400">Tambah Akun Karyawan</h3>
                 <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors"><FiX /></button>
              </div>
              <form onSubmit={handleAddUser} className="p-8 space-y-6">
                 <div>
                    <label className="label uppercase text-[10px] font-black">Nama Lengkap</label>
                    <input type="text" className="input-field" value={form.nama} onChange={e => setForm({...form, nama: e.target.value.toUpperCase()})} placeholder="CONTOH: BUDI SETIAWAN" required />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="label uppercase text-[10px] font-black">Username</label>
                       <input type="text" className="input-field font-mono" value={form.username} onChange={e => setForm({...form, username: e.target.value})} placeholder="budi" required />
                    </div>
                    <div>
                       <label className="label uppercase text-[10px] font-black">Password</label>
                       <input type="password" className="input-field" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="********" required />
                    </div>
                 </div>
                 <div>
                    <label className="label uppercase text-[10px] font-black">Jabatan</label>
                    <select className="input-field" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                       <option value="manager">MANAGER (Full Akses)</option>
                       <option value="staff">KARYAWAN/STAFF</option>
                    </select>
                 </div>
                 <button type="submit" className="w-full h-16 bg-primary-600 text-white rounded-[24px] text-base font-black tracking-[0.2em] shadow-xl active:scale-95 transition-all">BUAT AKUN</button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}
