import React, { useEffect, useState } from 'react';
import { FiDollarSign, FiClock, FiFileText, FiCalendar, FiArrowUpRight, FiTrendingUp, FiAlertCircle, FiUser, FiPackage, FiCheck, FiRefreshCw } from 'react-icons/fi';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';
import api from '../api/axios';
import { formatCurrency } from '../utils/helpers';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/dashboard', { params: { month } });
      setStats(res.data);
    } catch { toast.error('Gagal memuat dashboard'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [month]);

  if (!stats) return <div className="py-20 text-center text-dark-500 uppercase text-[10px] tracking-widest font-black italic">Sinkronisasi Keuangan...</div>;

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in pb-10 max-w-[1600px] mx-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div>
          <h1 className="text-base md:text-xl font-light text-white uppercase tracking-[0.3em] md:tracking-[0.4em] leading-none mb-1">ANALISA OPERASIONAL</h1>
          <p className="text-[9px] text-dark-500 font-bold uppercase tracking-[0.2em] opacity-60 italic">Portal Manajemen Kas &amp; Pinjaman Internal</p>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <button 
            onClick={load}
            disabled={loading}
            className={`p-2 rounded-lg bg-dark-800/30 border border-white/5 text-dark-500 hover:text-white transition-all ${loading ? 'animate-spin' : ''}`}
            title="Refresh Data"
          >
            <FiRefreshCw size={14} />
          </button>
          <div className="relative group">
            <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-500/50" size={12} />
            <input 
              type="month" 
              className="input-field pl-8 h-9 w-36 md:w-40 font-bold uppercase text-[10px] bg-dark-800/30 border-white/5" 
              value={month} 
              onChange={e => setMonth(e.target.value)} 
            />
          </div>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 px-1">
        <StatCard title="SALDO KAS UTAMA" value={stats.saldo} icon={<FiDollarSign className="text-emerald-500/70" />} color="emerald" />
        
        <div className="glass-card p-3 md:p-5 relative group transform hover:-translate-y-1 transition-all overflow-hidden border-white/5 bg-gradient-to-br from-white/2 to-transparent">
           <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 md:w-10 md:h-10 rounded-xl bg-white/3 flex items-center justify-center text-sm md:text-lg shadow-inner text-indigo-500/70 flex-shrink-0"><FiPackage /></div>
              <p className="text-[8px] md:text-[9px] text-dark-500 font-bold uppercase tracking-[0.15em] leading-tight">UNIT STOK</p>
           </div>
           <div className="grid grid-cols-3 gap-1 pt-2 border-t border-white/5">
              <div className="text-center">
                 <p className="text-xs md:text-sm font-black text-emerald-400">{stats.totalStok || 0}</p>
                 <p className="text-[7px] text-dark-600 font-bold uppercase tracking-tighter">Ada</p>
              </div>
              <div className="text-center border-x border-white/5">
                 <p className="text-xs md:text-sm font-black text-blue-400">{stats.sedangKredit || 0}</p>
                 <p className="text-[7px] text-dark-600 font-bold uppercase tracking-tighter">Kredit</p>
              </div>
              <div className="text-center">
                 <p className="text-xs md:text-sm font-black text-rose-400">{stats.terjualCash || 0}</p>
                 <p className="text-[7px] text-dark-600 font-bold uppercase tracking-tighter">Terjual</p>
              </div>
           </div>
        </div>

        <StatCard title="PIUTANG BERJALAN" value={stats.pinjamanAktif} icon={<FiFileText className="text-amber-500/70" />} color="amber" subtitle="Tagihan Aktif" />
        <StatCard title="PROFIT BULAN INI" value={stats.profitBulan} icon={<FiTrendingUp className="text-rose-500/70" />} color="rose" subtitle="Markup + Bunga" />
      </div>

      {/* NOTIFIKASI KETERLAMBATAN */}
      {stats.overduePins?.length > 0 && (
        <div className="px-1 animate-bounce-subtle">
           <div className="glass-card border-red-500/20 bg-red-500/5 p-4 md:p-6 overflow-hidden relative">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6">
                 <div className="w-10 h-10 md:w-12 md:h-12 bg-red-500 rounded-2xl flex items-center justify-center text-white text-lg md:text-xl shadow-2xl shadow-red-500/50 animate-pulse flex-shrink-0"><FiAlertCircle /></div>
                 <div>
                    <h3 className="text-xs md:text-sm font-black text-white uppercase tracking-[0.2em] mb-1">Cicilan Menunggak</h3>
                    <p className="text-[9px] text-red-300/60 font-bold uppercase tracking-widest italic">{stats.overduePins.length} Pinjaman Telat</p>
                 </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
                 {stats.overduePins.map((p, i) => (
                    <div 
                      key={i} 
                      onClick={() => window.location.href = `/kasbon/${p.id}`}
                      className="group p-3 md:p-4 bg-dark-900/40 border border-red-500/10 rounded-2xl hover:bg-red-500/10 transition-all cursor-pointer"
                    >
                       <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                             <div className="w-7 h-7 rounded-full bg-red-500/20 flex items-center justify-center text-red-500"><FiUser size={12} /></div>
                             <div className="min-w-0">
                                <h4 className="text-[10px] font-black text-white uppercase truncate">{p.nama_karyawan}</h4>
                                <p className="text-[8px] text-dark-500 font-bold uppercase">{p.kategori}</p>
                             </div>
                          </div>
                          <span className="text-[7px] px-1.5 py-0.5 bg-red-500 text-white font-black rounded-lg uppercase whitespace-nowrap">{p.daysLate}H Telat</span>
                       </div>
                       <div className="flex justify-between items-end border-t border-white/5 pt-2">
                          <div>
                             <p className="text-[7px] text-dark-500 uppercase font-black mb-0.5">Sisa</p>
                             <p className="text-[10px] font-black text-red-400">{formatCurrency(p.sisa_tagihan)}</p>
                          </div>
                          <div className="text-right">
                             <p className="text-[7px] text-dark-500 uppercase font-black mb-0.5">Target</p>
                             <p className="text-[10px] font-black text-white">{formatCurrency(p.nominal_cicilan)}</p>
                          </div>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      )}

      {/* CHART & ACTIVITY */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6 px-1">
        <div className="lg:col-span-3 glass-card p-4 md:p-6 border-white/5 relative overflow-hidden h-[300px] md:h-[380px]">
           <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none"><FiTrendingUp size={180} /></div>
           <div className="mb-4 md:mb-6 flex items-center justify-between">
              <h3 className="text-[9px] md:text-[10px] font-bold text-white uppercase tracking-[0.3em] md:tracking-[0.4em] flex items-center gap-2 md:gap-3">
                 <div className="w-1 h-4 md:h-5 bg-primary-500 rounded-full" /> TREN KEUNTUNGAN (6 BLN)
              </h3>
              <span className="text-[8px] text-emerald-400 font-bold uppercase tracking-[0.1em] px-2 py-1 bg-emerald-500/5 rounded-full border border-emerald-500/10">REAL-TIME</span>
           </div>
           
           <div className="h-[200px] md:h-[260px] w-full relative">
              <ResponsiveContainer width="100%" height="100%" minHeight={200} minWidth={0}>
                 <AreaChart data={stats.chartData} margin={{ top: 10, right: 5, left: 0, bottom: 0 }}>
                    <defs>
                       <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                       </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#4b5563', fontSize: 8, fontWeight: 700}} dy={10} />
                    <YAxis hide />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="profit" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorProfit)" />
                 </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* RECENT ACTIVITY */}
        <div className="lg:col-span-1 glass-card p-0 flex flex-col items-stretch shadow-2xl border-white/5 h-[300px] md:h-[380px]">
           <div className="p-4 md:p-5 border-b border-white/5 bg-white/2">
              <h3 className="text-[9px] font-bold text-white uppercase tracking-[0.3em] flex items-center gap-2 md:gap-3"><FiArrowUpRight className="text-primary-500" /> Mutasi Internal</h3>
           </div>
           <div className="flex-1 overflow-y-auto p-2 md:p-3 space-y-2">
              {stats.recentHistory?.map((h, i) => (
                 <div key={i} className="group p-2 md:p-3 bg-white/[0.01] border border-white/5 rounded-xl flex items-center gap-2 md:gap-3 hover:bg-white/3 transition-all">
                    <div className={`w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${h.uiTipe === 'masuk' ? 'bg-emerald-500/5 text-emerald-500' : 'bg-red-500/5 text-red-500'}`}>
                       {h.uiTipe === 'masuk' ? '+' : '-'}
                    </div>
                    <div className="flex-1 min-w-0">
                       <p className="text-[7px] md:text-[8px] text-dark-500 font-bold uppercase tracking-widest">{h.uiLabel}</p>
                       <p className="text-[9px] md:text-[10px] text-gray-300 font-medium tracking-tight uppercase truncate leading-tight">{h.keterangan}</p>
                    </div>
                    <p className={`text-[9px] md:text-[10px] font-bold flex-shrink-0 ${h.uiTipe === 'masuk' ? 'text-emerald-400' : 'text-red-400'}`}>
                       {formatCurrency(h.jumlah)}
                    </p>
                 </div>
              ))}
              {stats.recentHistory?.length === 0 && <div className="py-20 text-center text-dark-500 italic text-[9px] uppercase tracking-widest opacity-40">Mutasi Nihil</div>}
           </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color, subtitle, isCurrency = true }) {
  return (
    <div className="glass-card p-3 md:p-5 relative group transform hover:-translate-y-1 transition-all overflow-hidden border-white/5 bg-gradient-to-br from-white/2 to-transparent">
      <div className={`absolute top-0 right-0 w-20 h-20 bg-${color}-500 opacity-5 group-hover:opacity-10 transition-all -translate-y-4 translate-x-4 rounded-full`} />
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-7 h-7 md:w-10 md:h-10 rounded-xl bg-white/3 flex items-center justify-center text-sm md:text-lg shadow-inner flex-shrink-0`}>{icon}</div>
        <p className="text-[8px] md:text-[9px] text-dark-500 font-bold uppercase tracking-[0.15em] leading-tight">{title}</p>
      </div>
      <h2 className="text-sm md:text-xl font-black text-white leading-tight break-all">
        {isCurrency ? formatCurrency(value) : value}
      </h2>
      {subtitle && <p className="text-[7px] md:text-[8px] text-dark-700 font-bold italic uppercase tracking-wider mt-1 opacity-60">{subtitle}</p>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-dark-900/90 backdrop-blur-xl border border-white/5 p-3 rounded-xl shadow-2xl">
        <p className="text-[8px] font-bold text-dark-500 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-[11px] font-bold text-white">Profit: {formatCurrency(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};
