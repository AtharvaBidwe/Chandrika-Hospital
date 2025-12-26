
import React, { useState, useEffect, useRef } from 'react';
import Dashboard from './components/Dashboard';
import AddPatientModal from './components/AddPatientModal';
import PlannerView from './components/PlannerView';
import XrayView from './components/XrayView';
import LoginPage from './components/LoginPage';
import { Patient, DailyPlan, XrayData, CLINIC_CONFIG } from './types';
import { HospitalLogo } from './components/Icons';
import { apiService } from './services/apiService';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filmCount, setFilmCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const [view, setView] = useState<'dashboard' | 'planner' | 'xray'>('dashboard');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const authSubscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    const initAuth = async () => {
      if (isSupabaseConfigured()) {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
        
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
          setSession(newSession);
        });
        authSubscriptionRef.current = subscription;
      } else {
        const demoSession = localStorage.getItem('chandrika_demo_session');
        if (demoSession) setSession(JSON.parse(demoSession));
      }
      setIsLoading(false);
    };

    initAuth();
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (authSubscriptionRef.current) {
        authSubscriptionRef.current.unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    if (session) {
      refreshData();
    }
  }, [session]);

  const refreshData = async () => {
    setIsSyncing(true);
    setSyncError(false);
    try {
      const [loadedPatients, loadedFilms] = await Promise.all([
        apiService.getPatients(),
        apiService.getFilmCount()
      ]);
      setPatients(loadedPatients);
      setFilmCount(loadedFilms);
    } catch (err) {
      console.error("Data refresh failed:", err);
      setSyncError(true);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDemoLogin = () => {
    const mockSession = { user: { email: 'demo@hospital.com', id: 'demo-user' } };
    localStorage.setItem('chandrika_demo_session', JSON.stringify(mockSession));
    setSession(mockSession);
  };

  const handleLogout = async () => {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    } else {
      localStorage.removeItem('chandrika_demo_session');
      setSession(null);
    }
  };

  const handleAddPatient = async (patientData: Partial<Patient>) => {
    const newPatient = patientData as Patient;
    setPatients(prev => [newPatient, ...prev]);
    setIsAddModalOpen(false);
    setIsSyncing(true);
    setSyncError(false);

    try {
      await apiService.addPatient(newPatient);
    } catch (e) {
      console.warn("Sync failed. Stored locally.", e);
      setSyncError(true);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeletePatient = async (patientId: string) => {
    const patientToDelete = patients.find(p => p.id === patientId);
    if (!patientToDelete) return;

    if (window.confirm(`Delete record for "${patientToDelete.name}"?`)) {
      setIsSyncing(true);
      setSyncError(false);
      try {
        setPatients(prev => prev.filter(p => p.id !== patientId));
        await apiService.deletePatient(patientId);
        if (selectedPatientId === patientId) {
          setView('dashboard');
          setSelectedPatientId(null);
        }
      } catch (e) {
        setSyncError(true);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const handleUpdatePlan = async (updatedPlans: DailyPlan[]) => {
    if (!selectedPatientId) return;
    setIsSyncing(true);
    setSyncError(false);
    try {
      const updatedList = patients.map(p => 
        p.id === selectedPatientId ? { ...p, dailyPlans: updatedPlans } : p
      );
      setPatients(updatedList);
      await apiService.savePatients(updatedList);
    } catch (e) {
      setSyncError(true);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateXray = async (updatedXray: XrayData) => {
    if (!selectedPatientId) return;
    setIsSyncing(true);
    setSyncError(false);
    try {
      let currentFilms = filmCount;
      if (updatedXray.status !== 'ordered' && updatedXray.filmsUsedCount && !updatedXray.filmConsumed) {
          const deduction = updatedXray.filmsUsedCount;
          currentFilms = Math.max(0, filmCount - deduction);
          setFilmCount(currentFilms);
          updatedXray.filmConsumed = true; 
          await apiService.updateFilmCount(currentFilms);
      }

      const updatedList = patients.map(p => 
        p.id === selectedPatientId ? { ...p, xrayData: updatedXray } : p
      );
      setPatients(updatedList);
      await apiService.savePatients(updatedList);
    } catch (e) {
      setSyncError(true);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdatePatientStatus = async (patientId: string, status: Patient['status']) => {
    setIsSyncing(true);
    setSyncError(false);
    try {
      const updated = await apiService.updatePatient(patientId, { status });
      setPatients(updated);
    } catch (e) {
      setSyncError(true);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddFilms = async (count: number) => {
    setIsSyncing(true);
    setSyncError(false);
    try {
      const newTotal = filmCount + count;
      setFilmCount(newTotal);
      await apiService.updateFilmCount(newTotal);
    } catch (e) {
      setSyncError(true);
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Initializing Clinical Portal...</p>
      </div>
    );
  }

  if (!session) return <LoginPage onDemoLogin={handleDemoLogin} />;

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      <nav className="bg-white border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-5 cursor-pointer" onClick={() => setView('dashboard')}>
            <HospitalLogo />
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black text-[#0F172A] uppercase">{CLINIC_CONFIG.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`w-1.5 h-1.5 rounded-full ${isOnline && !syncError ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                <span className="text-[9px] font-black uppercase text-slate-400">
                  {isSyncing ? 'Syncing...' : syncError ? 'Sync Failed - Working Locally' : isOnline ? 'Cloud Linked' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-black text-[#0F172A] uppercase">{CLINIC_CONFIG.clinicianName}</p>
              <button onClick={handleLogout} className="text-[9px] font-bold text-red-500 uppercase tracking-widest">End Session</button>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-400">
              {CLINIC_CONFIG.clinicianName[0]}
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
            onDeletePatient={handleDeletePatient}
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
                availableFilms={filmCount}
              />
            )
          )
        )}
      </main>

      <footer className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 print:hidden pointer-events-none group">
        <div className={`backdrop-blur-2xl px-8 py-3 rounded-full border border-white/10 shadow-[0_15px_40px_rgba(0,0,0,0.5)] flex items-center gap-6 pointer-events-auto transition-all duration-300 hover:scale-105 ${syncError ? 'bg-red-950/95' : 'bg-slate-900/95'}`}>
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center">
               <div className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-indigo-400 animate-spin' : syncError ? 'bg-red-400' : 'bg-emerald-500 animate-ping'} absolute opacity-75`}></div>
               <div className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-indigo-400' : syncError ? 'bg-red-400' : 'bg-emerald-500'} relative shadow-[0_0_10px_rgba(16,185,129,0.8)]`}></div>
            </div>
            <span className={`text-[9px] font-black uppercase tracking-[0.2em] whitespace-nowrap ${isSyncing ? 'text-indigo-400' : syncError ? 'text-red-400' : 'text-emerald-400'}`}>
              {isSyncing ? 'SYNCHRONIZING' : syncError ? 'CLOUD OFFLINE' : 'CHANDRIKA HOSPITAL'}
            </span>
          </div>
          
          <div className="w-[1px] h-3 bg-white/10"></div>
          
          <div className="flex items-center gap-4">
            <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.3em] whitespace-nowrap">
            PATIENT MANAGEMENT SYSTEM • <span className="text-indigo-400">V1.2</span>
            </p>
          </div>
        </div>
      </footer>

      <AddPatientModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddPatient}
      />
    </div>
  );
};

export default App;
