// Format angka untuk tampilan (misal: 1000000 -> 1.000.000)
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
};

// Format tanggal pendek (misal: 2024-03-22 -> 22 Mar 2024)
export const formatDateShort = (dateString) => {
  if (!dateString) return '-';
  const options = { day: 'numeric', month: 'short', year: 'numeric' };
  return new Date(dateString).toLocaleDateString('id-ID', options);
};

// --- FUNGSI BARU UNTUK INPUT (IDR FORMATTER) ---

// Menambahkan titik saat mengetik (misal: 23000 -> 23.000)
export const formatIDR = (val) => {
  if (!val) return '';
  const number = val.toString().replace(/[^0-9]/g, '');
  return number.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

// Menghapus titik agar bisa disimpan ke database (misal: 23.000 -> 23000)
export const parseIDR = (val) => {
  if (!val) return 0;
  return parseInt(val.toString().replace(/\./g, ''), 10) || 0;
};
