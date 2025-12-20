import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import AddPatientModal from './components/AddPatientModal';
import PlannerView from './components/PlannerView';
import XrayView from './components/XrayView';
import LoginPage from './components/LoginPage';
import { Patient, DailyPlan, XrayData, CLINIC_CONFIG } from './types';
import { HospitalLogo } from './components/Icons';
import { apiService } from './services/apiService';
import { supabase } from './services/supabaseClient';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filmCount, setFilmCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [configError, setConfigError] = useState(false);
  
  const [view, setView] = useState<'dashboard' | 'planner' | 'xray'>('dashboard');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Auth Listener
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    }).catch(err => {
      console.error("Auth initialization failed:", err);
      setConfigError(true);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      subscription.unsubscribe();
    };
  }, []);

  // Fetch data only when session is active
  useEffect(() => {
    if (!session) return;

    const initData = async () => {
      setIsSyncing(true);
      try {
        const [loadedPatients, loadedFilms] = await Promise.all([
          apiService.getPatients(),
          apiService.getFilmCount()
        ]);
        setPatients(loadedPatients);
        setFilmCount(loadedFilms);
      } catch (error) {
        console.error("Initial data load failed:", error);
      } finally {
        setIsSyncing(false);
      }
    };
    initData();
  }, [session]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleAddPatient = async (patientData: Partial<Patient>) => {
    setIsSyncing(true);
    try {
      const newPatient = patientData as Patient;
      // Optimistic Update
      setPatients(prev => [...prev, newPatient]);
      await apiService.addPatient(newPatient);
    } catch (e) {
      // Revert if failed
      const reloaded = await apiService.getPatients();
      setPatients(reloaded);
    } finally {
      setIsSyncing(false);
      setIsAddModalOpen(false);
    }
  };

  const handleUpdatePlan = async (updatedPlans: DailyPlan[]) => {
    if (!selectedPatientId) return;
    setIsSyncing(true);
    try {
      const updatedList = patients.map(p => 
        p.id === selectedPatientId ? { ...p, dailyPlans: updatedPlans } : p
      );
      setPatients(updatedList);
      await apiService.savePatients(updatedList);
    } catch (e) {
      console.error("Save failed:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateXray = async (updatedXray: XrayData) => {
    if (!selectedPatientId) return;
    setIsSyncing(true);
    try {
      let currentFilms = filmCount;
      if (updatedXray.status !== 'ordered' && !updatedXray.filmConsumed) {
          currentFilms = Math.max(0, filmCount - 1);
          setFilmCount(currentFilms);
          updatedXray.filmConsumed = true;
          await apiService.updateFilmCount(currentFilms);
      }

      const updatedList = patients.map(p => 
        p.id === selectedPatientId ? { ...p, xrayData: updatedXray } : p
      );
      setPatients(updatedList);
      await apiService.savePatients(updatedList);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdatePatientStatus = async (patientId: string, status: Patient['status']) => {
    setIsSyncing(true);
    try {
      const updated = await apiService.updatePatient(patientId, { status });
      setPatients(updated);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddFilms = async (count: number) => {
    setIsSyncing(true);
    try {
      const newTotal = filmCount + count;
      setFilmCount(newTotal);
      await apiService.updateFilmCount(newTotal);
    } finally {
      setIsSyncing(false);
    }
  };

  if (configError) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-center">
        <div className="max-w-md">
          <div className="w-20 h-20 bg-red-500/20 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
          </div>
          <h1 className="text-white text-2xl font-black mb-4">Database Conflict</h1>
          <p className="text-slate-400 text-sm leading-relaxed mb-8">
            The portal is unable to communicate with the secure vault. Please check your Supabase tables and RLS policies.
          </p>
          <button onClick={() => window.location.reload()} className="px-8 py-3 bg-white text-slate-900 rounded-2xl font-black uppercase tracking-widest text-[11px]">Reconnect Gateway</button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-6">
        <div className="w-16 h-16 relative">
          <div className="absolute inset-0 border-4 border-slate-100 rounded-2xl"></div>
          <div className="absolute inset-0 border-4 border-[#2563EB] border-t-transparent rounded-2xl animate-spin"></div>
        </div>
        <div className="text-center">
          <p className="text-[#0F172A] font-black text-xl uppercase tracking-tighter">{CLINIC_CONFIG.name}</p>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] mt-1">Authenticating Credentials</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <LoginPage />;
  }

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      <nav className="bg-white border-b border-slate-100 sticky top-0 z-40 backdrop-blur-md bg-white/90">
        <div className="max-w-6xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-5 cursor-pointer group" onClick={() => setView('dashboard')}>
              <HospitalLogo />
              <div className="flex flex-col">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black tracking-tighter text-[#0F172A] uppercase">{CLINIC_CONFIG.name.split(' ')[0]}</span>
                  <span className="text-2xl font-light tracking-[0.1em] text-[#2563EB] uppercase">{CLINIC_CONFIG.name.split(' ').slice(1).join(' ')}</span>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                      {isOnline ? 'Secure Link' : 'Offline'}
                    </span>
                  </div>
                  {isSyncing && (
                    <div className="flex items-center gap-1.5">
                       <span className="w-2 h-2 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></span>
                       <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500">Syncing...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-black text-[#0F172A] uppercase tracking-tight">{CLINIC_CONFIG.clinicianName}</p>
              <button onClick={handleLogout} className="text-[9px] font-bold text-red-500 hover:text-red-700 uppercase tracking-widest mt-1">Log Out</button>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 shadow-inner overflow-hidden flex items-center justify-center">
               <img className="w-10 h-10 rounded-xl" src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${session?.user?.email}&backgroundColor=b6e3f4`} alt="Clinician" />
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-6">
        {view === 'dashboard' ? (
          <Dashboard 
            patients={patients} 
            filmCount={filmCount}
            onAddFilms={handleAddFilms}
            onAddPatient={() => setIsAddModalOpen(true)}
            onSelectPatient={(p) => {
              setSelectedPatientId(p.id);
              setView(p.serviceType === 'x-ray' ? 'xray' : 'planner');
            }}
            onUpdatePatientStatus={handleUpdatePatientStatus}
          />
        ) : (
          selectedPatient && (
            view === 'planner' ? (
              <PlannerView 
                patient={selectedPatient}
                onUpdatePlan={handleUpdatePlan}
                onBack={() => setView('dashboard')}
              />
            ) : (
              <XrayView
                patient={selectedPatient}
                onUpdateXray={handleUpdateXray}
                onBack={() => setView('dashboard')}
              />
            )
          )
        )}
      </main>

      <AddPatientModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddPatient}
      />
    </div>
  );
};

export default App;