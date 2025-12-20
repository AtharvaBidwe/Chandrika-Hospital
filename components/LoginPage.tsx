
import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { HospitalLogo } from './Icons';
import { CLINIC_CONFIG } from '../types';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-100/50 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-100/50 rounded-full blur-[120px]"></div>

      <div className="w-full max-w-[440px] z-10">
        <div className="bg-white rounded-[2.5rem] shadow-2xl border border-white p-10 md:p-12">
          <div className="flex flex-col items-center mb-10 text-center">
            <div className="mb-6 scale-125">
              <HospitalLogo />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">
              {CLINIC_CONFIG.name}
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em] mt-2">
              Clinical Operating System v1.0
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-2xl text-xs font-bold animate-in fade-in slide-in-from-top-2">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Staff Email</label>
              <input
                required
                type="email"
                placeholder="doctor@chandrika.com"
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Secure Password</label>
              <input
                required
                type="password"
                placeholder="••••••••"
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              disabled={loading}
              type="submit"
              className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-2xl shadow-slate-200 hover:bg-indigo-600 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                  Authenticating...
                </span>
              ) : (
                "Authorize Access"
              )}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-slate-50 text-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Authorized Personnel Only
            </p>
          </div>
        </div>

        <p className="text-center mt-8 text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em]">
          Integrated Clinical Security Gateway
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
