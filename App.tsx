
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
  
  const [view, setView] = useState<'dashboard' | 'planner' | 'xray'>('dashboard');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Network Status Listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auth Listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Initial Data Load
  useEffect(() => {
    if (!session) return;

    const initData = async () => {
      setIsLoading(true);
      try {
        const [loadedPatients, loadedFilms] = await Promise.all([
          apiService.getPatients(),
          apiService.getFilmCount()
        ]);
        setPatients(loadedPatients);
        setFilmCount(loadedFilms);
      } catch (error) {
        console.error("Critical: Data fetch failed", error);
      } finally {
        setIsLoading(false);
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
      setPatients(prev => [...prev, newPatient]);
      await apiService.addPatient(newPatient);
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

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  // Auth Guard
  if (!session && !isLoading) {
    return <LoginPage />;
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
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] mt-1">Securing Clinical Environment</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      {!isOnline && (
        <div className="bg-red-600 text-white text-[10px] font-black uppercase tracking-[0.3em] py-2 text-center animate-pulse sticky top-0 z-[60]">
          System Offline — Working on Local Cache
        </div>
      )}
      
      <nav className="bg-white border-b border-slate-100 sticky top-0 z-40 backdrop-blur-md bg-white/90">
        <div className="max-w-6xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div 
              className="flex items-center gap-5 cursor-pointer group" 
              onClick={() => setView('dashboard')}
            >
              <div className="shadow-lg group-hover:scale-105 transition-transform duration-300">
                <HospitalLogo />
              </div>
              <div className="flex flex-col">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black tracking-tighter text-[#0F172A]">
                    {CLINIC_CONFIG.name.split(' ')[0].toUpperCase()}
                  </span>
                  <span className="text-2xl font-light tracking-[0.1em] text-[#2563EB]">
                    {CLINIC_CONFIG.name.split(' ').slice(1).join(' ').toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
                  <span className={`text-[9px] font-black uppercase tracking-widest ${isSyncing ? 'text-emerald-500' : 'text-slate-400'}`}>
                    {isSyncing ? 'Encrypted Syncing...' : 'Cloud Verified'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-black text-[#0F172A] uppercase tracking-tight">{CLINIC_CONFIG.clinicianName}</p>
              <button 
                onClick={handleLogout}
                className="text-[9px] font-bold text-red-500 uppercase tracking-widest mt-1 opacity-80 hover:opacity-100 transition-opacity"
              >
                End Session
              </button>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#F8FAFC] border border-slate-100 shadow-inner overflow-hidden p-0.5">
              <img 
                className="w-full h-full rounded-xl bg-slate-200"
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${session?.user?.email || 'doctor'}&backgroundColor=b6e3f4`} 
                alt="Clinician" 
              />
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

      <footer className="fixed bottom-6 left-0 right-0 pointer-events-none flex justify-center z-50">
        <div className="bg-[#0F172A]/90 text-white/80 px-8 py-3 rounded-2xl text-[9px] font-black uppercase tracking-[0.4em] shadow-2xl border border-white/5 backdrop-blur-xl flex items-center gap-4">
          <span className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-red-500 shadow-[0_0_8px_red]'}`}></span>
            {isOnline ? 'Network Secured' : 'Offline Mode'}
          </span>
          <span className="w-1 h-1 bg-white/20 rounded-full"></span>
          CHANDRIKA HOSPITAL OPS V1.0
        </div>
      </footer>
    </div>
  );
};

export default App;
