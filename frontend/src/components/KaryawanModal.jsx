import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { FiX, FiUser, FiSave } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function KaryawanModal({ onClose, onSuccess, initialData }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nama: '', jabatan: '', 
    no_hp: '', tgl_masuk: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (initialData) {
      setForm({
        nama: initialData.nama || '',
        jabatan: initialData.jabatan || '',
        no_hp: initialData.no_hp || '',
        tgl_masuk: initialData.tgl_masuk || new Date().toISOString().split('T')[0]
      });
    }
  }, [initialData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nama) return toast.error('Nama Lengkap wajib!');
    
    setLoading(true);
    try {
      if (initialData) {
        // Mode EDIT
        await api.put(`/karyawan/${initialData.id}`, form);
        toast.success('Profil Karyawan Berhasil Diperbarui!');
      } else {
        // Mode BARU
        const autoNIK = 'EMP-' + Date.now().toString().slice(-6);
        await api.post('/karyawan', { ...form, nik: autoNIK });
        toast.success('Pendaftaran Karyawan Berhasil!');
      }
      onSuccess();
      onClose();
    } catch (e) { toast.error(e.response?.data?.message || 'Gagal menyimpan'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in text-white">
      <div className="glass rounded-3xl w-full max-w-sm max-h-[90vh] overflow-y-auto animate-slide-up bg-dark-900/60 shadow-2xl p-6 border border-white/10">
        <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
           <h2 className="text-xl font-bold flex items-center gap-2 uppercase tracking-wide">
             <FiUser className="text-primary-400" /> {initialData ? 'Ubah Profil' : 'Karyawan Baru'}
           </h2>
           <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors"><FiX /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
           <div>
              <label className="text-xs font-bold text-dark-400 block mb-1 uppercase">Nama Lengkap *</label>
              <input type="text" className="input-field" placeholder="Nama..." 
                value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })} required />
           </div>

           <div>
              <label className="text-xs font-bold text-dark-400 block mb-1 uppercase">Jabatan</label>
              <input type="text" className="input-field" placeholder="Staff, Manager, Supir..." 
                value={form.jabatan} onChange={e => setForm({ ...form, jabatan: e.target.value })} />
           </div>

           <div>
              <label className="text-xs font-bold text-dark-400 block mb-1 uppercase">Nomor HP</label>
              <input type="text" className="input-field" placeholder="081234567890" 
                value={form.no_hp} onChange={e => setForm({ ...form, no_hp: e.target.value })} />
           </div>

           <div>
              <label className="text-xs font-bold text-dark-400 block mb-1 uppercase">Tanggal Masuk</label>
              <input type="date" className="input-field scheme-dark" 
                value={form.tgl_masuk} onChange={e => setForm({ ...form, tgl_masuk: e.target.value })} />
           </div>

           <div className="pt-6 flex gap-3">
              <button type="button" onClick={onClose} className="btn-secondary flex-1 py-3 text-sm">Batal</button>
              <button type="submit" disabled={loading} className="btn-primary flex-1 py-3 text-sm shadow-md shadow-primary-600/20 gap-2 flex items-center justify-center">
                {loading ? '...' : (initialData ? <><FiSave /> Perbarui</> : 'Simpan Karyawan')}
              </button>
           </div>
        </form>
      </div>
    </div>
  );
}
