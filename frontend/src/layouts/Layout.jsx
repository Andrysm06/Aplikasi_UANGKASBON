import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FiGrid, FiFileText, FiUsers, FiPackage, FiSettings,
  FiLogOut, FiDollarSign, FiMenu, FiX, FiBell, FiChevronRight, FiAlertTriangle, FiCreditCard
} from 'react-icons/fi';
import api from '../api/axios';
import toast from 'react-hot-toast';

const navItems = [
  { to: '/dashboard', icon: FiGrid, label: 'Dashboard', roles: ['admin', 'approver', 'karyawan'] },
  { to: '/kasbon', icon: FiFileText, label: 'Kasbon', roles: ['admin', 'approver', 'karyawan'] },
  { to: '/unit-stok', icon: FiPackage, label: 'Unit Stok', roles: ['admin', 'approver', 'karyawan'] },
  { to: '/kas', icon: FiDollarSign, label: 'Kas Utama', roles: ['admin', 'approver'] },
  { to: '/karyawan', icon: FiUsers, label: 'Karyawan', roles: ['admin', 'approver'] },
  { to: '/setting', icon: FiSettings, label: 'Pengaturan', roles: ['admin'] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  const fetchNotifs = async () => {
    try {
      const res = await api.get('/notif');
      setNotifs(res.data.list);
      setUnreadCount(res.data.unread);
      
      // Kita tidak lagi memunculkan Toast popup secara otomatis setiap saat
      // karena akan sangat mengganggu (muncul hilang terus). 
      // User cukup melihat titik merah (unread count) di lonceng pojok kanan atas.
    } catch (err) {
      console.error('Failed to fetch notifications');
    }
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 120000); // Check every 2 mins
    return () => clearInterval(interval);
  }, []);

  const markReadAll = async () => {
    try {
      await api.put('/notif/read-all');
      setUnreadCount(0);
      fetchNotifs();
    } catch {}
  };

  const handleLogout = () => {
    logout();
    toast.success('Berhasil keluar');
    navigate('/login');
  };

  const filteredNav = navItems.filter(n => n.roles.includes(user?.role));

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 px-6 py-5 border-b border-white/5 relative overflow-hidden group">
        <div className="relative w-11 h-11 flex-shrink-0 animate-float">
          <div className="absolute inset-0 bg-primary-500 rounded-2xl blur-[10px] opacity-20 group-hover:opacity-40 transition-opacity" />
          <img 
            src="/logo.png" 
            alt="Logo" 
            className="w-11 h-11 rounded-2xl object-cover shadow-2xl relative border border-white/10"
          />
        </div>
        <div className="relative">
          <p className="text-[12px] text-white font-black uppercase tracking-widest leading-none">Sistem Internal</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {filteredNav.map(n => (
          <NavLink 
            key={n.to} 
            to={n.to} 
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) => `sidebar-link group ${isActive ? 'active' : ''}`}
          >
            {({ isActive }) => (
              <>
                <n.icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? 'text-primary-400' : 'text-dark-500 group-hover:text-white'}`} />
                <span>{n.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-dark-700">
        <div className="flex items-center gap-3 px-3 py-3 rounded-2xl bg-dark-800/50 border border-white/5 mb-2">
          <div className="w-9 h-9 bg-primary-400/10 rounded-xl flex items-center justify-center text-primary-400 font-black flex-shrink-0 text-sm shadow-inner">
            {user?.nama?.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-white truncate uppercase tracking-tighter leading-none mb-1">{user?.nama}</div>
            <div className="text-[9px] text-dark-500 uppercase font-black tracking-widest">{user?.role}</div>
          </div>
        </div>
        {/* <button onClick={handleLogout} className="sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all rounded-xl mt-2">
          <FiLogOut className="w-5 h-5 px-1" /> KELUAR
        </button> */}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-dark-900 overflow-hidden font-sans">
      <aside className="hidden lg:flex flex-col w-64 bg-dark-800/80 backdrop-blur-xl border-r border-dark-700 flex-shrink-0 z-40">
        <SidebarContent />
      </aside>

      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-[100] flex animate-fade-in">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-72 bg-dark-800 border-r border-dark-700 flex flex-col z-10 animate-slide-right">
            <button className="absolute right-4 top-4 text-dark-500 hover:text-white" onClick={() => setSidebarOpen(false)}>
              <FiX className="w-6 h-6" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden relative">
        <header className="bg-dark-900/50 backdrop-blur-xl border-b border-dark-700 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between flex-shrink-0 z-30">
          <button className="lg:hidden p-2 rounded-xl bg-dark-800 text-dark-400 hover:text-white border border-white/5 active:scale-95 transition-all" onClick={() => setSidebarOpen(true)}>
            <FiMenu className="w-6 h-6" />
          </button>
          
          <div className="hidden md:block">
            <p className="text-[10px] uppercase font-black tracking-[0.2em] text-dark-500 leading-none mb-1">Status Keamanan</p>
            <h3 className="text-white font-light text-[11px] italic tracking-[0.25em] uppercase leading-none mt-2 opacity-80">Security v6.13</h3>
          </div>

          <div className="flex items-center gap-2 md:gap-4 ml-auto relative">
            <div className="relative">
              <button 
                onClick={() => {
                  setShowNotifMenu(!showNotifMenu);
                  if (!showNotifMenu && unreadCount > 0) markReadAll();
                }}
                className={`p-2 md:p-2.5 rounded-xl md:rounded-2xl transition-all border duration-300 relative ${showNotifMenu ? 'bg-primary-600 border-primary-500 text-white shadow-lg shadow-primary-600/30' : 'bg-dark-800 hover:bg-dark-700 text-dark-400 border-white/5'}`}
              >
                <FiBell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 md:w-5 md:h-5 bg-red-500 text-white text-[8px] md:text-[10px] font-black rounded-full flex items-center justify-center border-2 border-dark-900 animate-pulse-fast">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifMenu && (
                <div className="absolute right-0 mt-4 w-72 md:w-80 glass-card p-0 overflow-hidden shadow-2xl border-white/10 z-[100] animate-slide-up">
                  <div className="p-4 border-b border-white/5 bg-white/3 flex items-center justify-between">
                    <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Pusat Notifikasi</h4>
                    <button onClick={() => markReadAll()} className="text-[9px] font-black text-primary-400 uppercase hover:text-primary-300">Baca Semua</button>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifs.length === 0 ? (
                      <div className="py-12 text-center text-[10px] text-dark-500 uppercase font-bold italic">Tidak ada notifikasi baru</div>
                    ) : (
                      notifs.map(n => (
                        <div key={n.id} className={`p-4 border-b border-white/5 hover:bg-white/5 transition-colors ${n.dibaca === 0 ? 'bg-primary-500/5' : ''}`}>
                          <div className="flex gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${n.tipe === 'warning' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-primary-500/10 text-primary-500'}`}>
                              {n.tipe === 'warning' ? <FiAlertTriangle /> : <FiBell />}
                            </div>
                            <div>
                              <p className="text-xs text-white leading-relaxed">{n.pesan}</p>
                              <span className="text-[9px] text-dark-500 mt-2 block uppercase font-bold">{new Date(n.created_at).toLocaleString('id-ID')}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
