
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

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
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

  useEffect(() => {
    if (session) {
      refreshData();
    }
  }, [session]);

  const refreshData = async () => {
    setIsSyncing(true);
    try {
      const [loadedPatients, loadedFilms] = await Promise.all([
        apiService.getPatients(),
        apiService.getFilmCount()
      ]);
      setPatients(loadedPatients);
      setFilmCount(loadedFilms);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleAddPatient = async (patientData: Partial<Patient>) => {
    setIsSyncing(true);
    try {
      const newPatient = patientData as Patient;
      setPatients(prev => [newPatient, ...prev]);
      await apiService.addPatient(newPatient);
      setIsAddModalOpen(false);
    } catch (e) {
      alert("Failed to save patient. Please check database connectivity.");
      await refreshData();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeletePatient = async (patientId: string) => {
    const patientToDelete = patients.find(p => p.id === patientId);
    if (!patientToDelete) return;

    if (window.confirm(`Are you sure you want to completely delete the record for "${patientToDelete.name}"? This action cannot be undone.`)) {
      setIsSyncing(true);
      try {
        setPatients(prev => prev.filter(p => p.id !== patientId));
        await apiService.deletePatient(patientId);
        if (selectedPatientId === patientId) {
          setView('dashboard');
          setSelectedPatientId(null);
        }
      } catch (e) {
        alert("Failed to delete patient. Please try again.");
        await refreshData();
      } finally {
        setIsSyncing(false);
      }
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session) return <LoginPage />;

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
                <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                <span className="text-[9px] font-black uppercase text-slate-400">
                  {isSyncing ? 'Synchronizing Data...' : isOnline ? 'Encrypted Link Active' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-black text-[#0F172A] uppercase">{CLINIC_CONFIG.clinicianName}</p>
              <button onClick={handleLogout} className="text-[9px] font-bold text-red-500 uppercase tracking-widest">Sign Out</button>
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
