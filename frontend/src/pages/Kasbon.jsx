import React, { useEffect, useState } from 'react';
import { FiPlus, FiSearch, FiChevronRight, FiCreditCard, FiSmartphone, FiMonitor, FiUser, FiArrowRight, FiChevronLeft } from 'react-icons/fi';
import api from '../api/axios';
import { formatCurrency, formatDateShort } from '../utils/helpers';
import KasbonModal from '../components/KasbonModal';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function Kasbon() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: 'aktif', search: '', page: 1 });
  const [pages, setPages] = useState({ total: 1, current: 1 });
  const [modalOpen, setModalOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/kasbon', { params: filter });
      setData(res.data.data);
      setPages({ total: res.data.totalPages, current: res.data.currentPage });
    } catch { toast.error('Gagal memuat pinjaman'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filter]);

  const changePage = (p) => {
    if (p < 1 || p > pages.total) return;
    setFilter({ ...filter, page: p });
  };

  const getIcon = (kat) => {
    if (kat === 'HP') return <FiSmartphone className="text-emerald-500" />;
    if (kat === 'TV') return <FiMonitor className="text-blue-500" />;
    return <FiCreditCard className="text-amber-500" />;
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg md:text-2xl font-black text-white uppercase tracking-tight">Manajemen Pinjaman</h1>
        <button onClick={() => setModalOpen(true)} className="btn-primary text-xs md:text-sm px-3 md:px-4 py-2">
          <FiPlus /> <span className="hidden sm:inline">Cairkan Baru</span><span className="sm:hidden">Baru</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="glass-card flex-1 flex items-center gap-3 py-2.5 px-4">
          <FiSearch className="text-dark-500 flex-shrink-0" size={14} />
          <input
            className="bg-transparent border-none focus:outline-none text-white text-sm w-full"
            placeholder="Cari nama atau PIN..."
            value={filter.search}
            onChange={e => setFilter({ ...filter, search: e.target.value, page: 1 })}
          />
        </div>
        <div className="flex bg-dark-800 rounded-2xl p-1 border border-white/5 shadow-inner self-start">
          {['semua', 'aktif', 'lunas'].map(s => (
            <button key={s} onClick={() => setFilter({ ...filter, status: s, page: 1 })}
              className={`px-3 md:px-5 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${filter.status === s ? 'bg-primary-600 text-white' : 'text-dark-500'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block glass-card p-0 overflow-hidden shadow-2xl border-white/5">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-white/3 border-b border-white/5">
              <th className="table-header">No. PIN / Supir</th>
              <th className="table-header text-center">Kategori</th>
              <th className="table-header text-right">Pokok + Bunga</th>
              <th className="table-header text-right">Sisa Tagihan</th>
              <th className="table-header text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr><td colSpan="5" className="py-20 text-center text-dark-500 italic">Membuka lembaran data...</td></tr>
            ) : data.map(p => (
              <tr key={p.id} className="table-row group">
                <td className="table-cell">
                  <span className="text-[9px] font-black text-dark-500 block uppercase">{p.no_pinjaman}</span>
                  <span className="text-sm font-bold text-white uppercase group-hover:text-primary-400 transition-colors">{p.nama_karyawan}</span>
                </td>
                <td className="table-cell text-center">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/3 text-[10px] font-black uppercase text-dark-200">
                    {getIcon(p.kategori)} {p.kategori}
                  </div>
                </td>
                <td className="table-cell text-right">
                  {p.kategori === 'UANG' ? (
                    <>
                      <p className="text-xs font-bold text-white">{formatCurrency(p.pokok)}</p>
                      <p className="text-[10px] text-red-400 font-bold mt-0.5">+ {formatCurrency(p.total_bunga)} ({p.bunga_persen}%)</p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs font-bold text-white">{formatCurrency(p.harga_jual_tunai || p.pokok)}</p>
                      <p className="text-[10px] text-red-400 font-bold mt-0.5">+ Bunga: {formatCurrency(p.total_bunga)}</p>
                      {(Number(p.dp) > 0 || Number(p.tukar_tambah) > 0) && (
                        <p className="text-[10px] text-emerald-400 font-bold mt-0.5">- DP/TT: {formatCurrency(Number(p.dp) + Number(p.tukar_tambah))}</p>
                      )}
                    </>
                  )}
                </td>
                <td className="table-cell text-right">
                  <div className="text-sm font-black text-white">{formatCurrency(p.sisa_tagihan)}</div>
                  <div className="w-full bg-white/5 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div className="bg-primary-500 h-full" style={{ width: `${(p.terbayar / p.total_tagihan) * 100}%` }} />
                  </div>
                  {p.tipe_cicilan === 'PER_RIT' ? (
                    <p className="text-[9px] text-indigo-400 uppercase font-bold mt-1.5">{formatCurrency(p.nominal_cicilan)}/Rit</p>
                  ) : p.tenor_bulan > 0 ? (
                    <p className="text-[9px] text-emerald-400 uppercase font-bold mt-1.5">{p.tenor_bulan} Bln ({formatCurrency(p.nominal_cicilan)})</p>
                  ) : null}
                </td>
                <td className="table-cell text-center">
                  <Link to={`/kasbon/${p.id}`} className="inline-flex items-center gap-1 px-3 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-[10px] font-black uppercase shadow-lg active:scale-95 transition-all">
                    DETAIL <FiArrowRight />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination Desktop */}
        {!loading && pages.total > 1 && (
          <div className="p-4 border-t border-white/5 bg-white/2 flex items-center justify-between">
            <p className="text-xs text-dark-500 font-bold uppercase">Hal {pages.current}/{pages.total}</p>
            <div className="flex gap-2">
              <button onClick={() => changePage(pages.current - 1)} disabled={pages.current === 1}
                className="p-2 rounded-xl bg-white/5 text-white disabled:opacity-30 hover:bg-white/10 transition-all">
                <FiChevronLeft size={14} />
              </button>
              {[...Array(pages.total)].map((_, i) => (
                <button key={i} onClick={() => changePage(i + 1)}
                  className={`w-8 h-8 rounded-xl font-black text-[10px] transition-all ${pages.current === i + 1 ? 'bg-primary-600 text-white' : 'bg-white/5 text-dark-500 hover:bg-white/10'}`}>
                  {i + 1}
                </button>
              ))}
              <button onClick={() => changePage(pages.current + 1)} disabled={pages.current === pages.total}
                className="p-2 rounded-xl bg-white/5 text-white disabled:opacity-30 hover:bg-white/10 transition-all">
                <FiChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
        {data.length === 0 && !loading && <div className="py-20 text-center text-dark-500 italic uppercase text-[10px] tracking-widest">Belum ada data</div>}
      </div>

      {/* Mobile Card List */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="py-16 text-center text-dark-500 italic text-[10px] uppercase tracking-widest animate-pulse">Memuat data...</div>
        ) : data.length === 0 ? (
          <div className="py-16 text-center text-dark-500 italic text-[10px] uppercase tracking-widest">Belum ada data</div>
        ) : data.map(p => (
          <Link key={p.id} to={`/kasbon/${p.id}`} className="block glass-card p-4 border-white/5 active:scale-[0.98] transition-all">
            <div className="flex items-start justify-between mb-3">
              <div className="min-w-0 flex-1">
                <p className="text-[8px] font-black text-dark-500 uppercase tracking-widest mb-0.5">{p.no_pinjaman}</p>
                <p className="text-sm font-black text-white uppercase truncate">{p.nama_karyawan}</p>
              </div>
              <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/5 text-[9px] font-black uppercase text-dark-300">
                  {getIcon(p.kategori)} {p.kategori}
                </div>
              </div>
            </div>
            <div className="flex justify-between items-end mb-2">
              <div>
                <p className="text-[8px] text-dark-500 uppercase font-black mb-0.5">Total Tagihan</p>
                <p className="text-xs font-bold text-white">{formatCurrency(p.total_tagihan)}</p>
              </div>
              <div className="text-right">
                <p className="text-[8px] text-dark-500 uppercase font-black mb-0.5">Sisa Hutang</p>
                <p className="text-sm font-black text-primary-400">{formatCurrency(p.sisa_tagihan)}</p>
              </div>
            </div>
            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mb-2">
              <div className="bg-primary-500 h-full transition-all" style={{ width: `${Math.min(100, (p.terbayar / p.total_tagihan) * 100)}%` }} />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-[8px] text-dark-500 font-bold">
                {p.tipe_cicilan === 'PER_RIT' ? `${formatCurrency(p.nominal_cicilan)}/Rit` : `${p.tenor_bulan} Bln · ${formatCurrency(p.nominal_cicilan)}/Bln`}
              </p>
              <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase ${p.sisa_tagihan <= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-primary-500/20 text-primary-400'}`}>
                {p.sisa_tagihan <= 0 ? 'LUNAS' : 'AKTIF'}
              </span>
            </div>
          </Link>
        ))}

        {/* Pagination Mobile */}
        {!loading && pages.total > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-dark-500 font-bold uppercase">Hal {pages.current}/{pages.total}</p>
            <div className="flex gap-2">
              <button onClick={() => changePage(pages.current - 1)} disabled={pages.current === 1}
                className="px-4 py-2 rounded-xl bg-white/5 text-white disabled:opacity-30 text-xs font-bold">
                ‹ Prev
              </button>
              <button onClick={() => changePage(pages.current + 1)} disabled={pages.current === pages.total}
                className="px-4 py-2 rounded-xl bg-white/5 text-white disabled:opacity-30 text-xs font-bold">
                Next ›
              </button>
            </div>
          </div>
        )}
      </div>

      {modalOpen && <KasbonModal onClose={() => setModalOpen(false)} onSuccess={load} />}
    </div>
  );
}
