import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiDollarSign, FiCreditCard } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function Login() {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 7);
    setPin(val);
  };

  const handleSubmit = async (currentPin) => {
    setLoading(true);
    try {
      await login(currentPin);
      toast.success('Akses Diterima');
      navigate('/dashboard');
    } catch (err) {
      toast.error('PIN Akses Salah');
      setPin('');
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (pin.length === 7) {
      handleSubmit(pin);
    }
  }, [pin]);

  return (
    <div 
      className="min-h-screen bg-dark-900 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Background glow effects */}
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-primary-500 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-500 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '3s' }} />
      </div>

      <div className="w-full max-w-sm z-10 animate-fade-in text-center">
        {/* Logo Section */}
        <div className="mb-14 flex flex-col items-center">
          <div className="relative w-24 h-24 mb-6 group animate-float">
            <div className="absolute inset-0 bg-primary-500 rounded-[32px] blur-[15px] opacity-20" />
            <div className="w-24 h-24 bg-gradient-to-br from-indigo-400 via-primary-500 to-primary-700 rounded-[32px] flex items-center justify-center shadow-[0_20px_50px_rgba(59,130,246,0.3)] relative border border-white/10 overflow-hidden">
               <FiCreditCard className="w-10 h-10 text-white/90" />
               <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-2xl transform rotate-12 transition-transform">
                  <FiDollarSign className="w-8 h-8 text-primary-600 animate-pulse" />
               </div>
            </div>
          </div>
          <h2 className="text-[10px] font-black text-dark-400 uppercase tracking-[0.5em] opacity-80 leading-none">Keamanan Akses</h2>
        </div>

        {/* PIN Indicators */}
        <div className="flex justify-center gap-6 mb-16 relative">
          {[...Array(7)].map((_, i) => (
            <div 
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-300 transform ${
                pin.length > i 
                  ? 'bg-primary-500 border-primary-500 scale-125 shadow-[0_0_25px_rgba(59,130,246,0.8)]' 
                  : 'bg-transparent border-dark-700'
              }`}
            />
          ))}
          
          <input
            ref={inputRef}
            type="tel"
            inputMode="numeric"
            value={pin}
            onChange={handleChange}
            autoComplete="off"
            className="absolute inset-0 opacity-0 cursor-default"
            onBlur={() => !loading && inputRef.current?.focus()}
          />
        </div>

        {loading && (
          <div className="mt-14 space-y-3 flex flex-col items-center">
            <div className="flex justify-center gap-2">
              <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <p className="text-[8px] font-black text-primary-400/50 uppercase tracking-[0.3em]">Memverifikasi Identitas</p>
          </div>
        )}
      </div>

      <div className="absolute bottom-10 left-0 w-full text-center">
        <p className="text-[9px] font-black text-dark-600 uppercase tracking-[0.5em] opacity-40">Security Gateway v6.13</p>
      </div>
    </div>
  );
}
