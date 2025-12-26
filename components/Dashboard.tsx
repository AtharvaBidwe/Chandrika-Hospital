
import React, { useState, useMemo } from 'react';
import { Patient, CLINIC_CONFIG, DayOfWeek } from '../types';
import { 
  UserPlusIcon, 
  ActivityIcon, 
  CheckCircleIcon, 
  PhoneIcon, 
  HistoryIcon, 
  SearchIcon, 
  DownloadIcon,
  XrayIcon,
  ClockIcon,
  TrashIcon,
  CalendarIcon
} from './Icons';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';

interface DashboardProps {
  patients: Patient[];
  filmCount: number;
  onAddFilms: (count: number) => void;
  onAddPatient: () => void;
  onSelectPatient: (patient: Patient) => void;
  onUpdatePatientStatus: (patientId: string, status: Patient['status']) => void;
  onDeletePatient: (patientId: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  patients, 
  filmCount, 
  onAddFilms, 
  onAddPatient, 
  onSelectPatient, 
  onUpdatePatientStatus,
  onDeletePatient
}) => {
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [serviceFilter, setServiceFilter] = useState<'all' | 'physiotherapy' | 'x-ray'>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [addFilmValue, setAddFilmValue] = useState<string>('');

  const calculateProgress = (patient: Patient) => {
    if (patient.serviceType === 'x-ray') {
      if (!patient.xrayData) return 0;
      if (patient.xrayData.status === 'reported') return 100;
      if (patient.xrayData.status === 'captured') return 50;
      return 10;
    }
    
    // Calculate adherence specifically based on selected visit days
    const relevantPlans = patient.dailyPlans.filter(plan => {
      const dayName = new Date(plan.date).toLocaleDateString('en-US', { weekday: 'long' }) as DayOfWeek;
      return !patient.selectedDays || patient.selectedDays.length === 0 || patient.selectedDays.includes(dayName);
    });

    const totalSessions = relevantPlans.reduce((acc, plan) => acc + plan.sessions.length, 0);
    if (totalSessions === 0) return 0;
    
    const completedSessions = relevantPlans.reduce((acc, plan) => 
      acc + plan.sessions.filter(s => s.status === 'completed').length, 0
    );
    
    return Math.round((completedSessions / totalSessions) * 100);
  };

  const performanceData = useMemo(() => {
    let completed = 0;
    let pending = 0;
    let missed = 0;

    patients.forEach(p => {
      p.dailyPlans.forEach(plan => {
        plan.sessions.forEach(s => {
          if (s.status === 'completed') completed++;
          else if (s.status === 'missed') missed++;
          else pending++;
        });
      });
    });

    return [
      { name: 'Completed', value: completed, color: '#10b981' },
      { name: 'Pending', value: pending, color: '#6366f1' },
      { name: 'Missed', value: missed, color: '#ef4444' }
    ].filter(d => d.value > 0);
  }, [patients]);

  const activePatients = patients.filter(p => p.status === 'active');
  const pastPatients = patients.filter(p => p.status === 'completed' || p.status === 'archived');

  const filteredPatients = useMemo(() => {
    const baseList = activeTab === 'active' ? activePatients : pastPatients;
    let filtered = [...baseList];
    
    if (serviceFilter !== 'all') {
      filtered = filtered.filter(p => p.serviceType === serviceFilter);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(term) || 
        p.condition.toLowerCase().includes(term) ||
        p.phone.includes(term)
      );
    }
    
    return filtered.sort((a, b) => (b.registrationDate || '').localeCompare(a.registrationDate || ''));
  }, [activeTab, activePatients, pastPatients, searchTerm, serviceFilter]);

  const handleExportToExcel = () => {
    const dataToExport = patients.map(p => ({
      'Name': p.name,
      'Age': p.age,
      'Phone': p.phone,
      'Condition': p.condition,
      'Schedule': p.selectedDays?.join('/') || 'Daily',
      'Progress': `${calculateProgress(p)}%`,
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Patients");
    XLSX.writeFile(workbook, `Clinical_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const isLowStock = filmCount <= CLINIC_CONFIG.lowFilmThreshold;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-8 animate-in fade-in duration-700">
      {isLowStock && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl flex items-center justify-between shadow-sm animate-pulse">
          <div className="flex items-center gap-3 text-red-700">
            <span className="text-xl">⚠️</span>
            <p className="font-bold">Low Film Stock: Only {filmCount} left.</p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Clinical Dashboard</h1>
          <p className="text-slate-500 font-medium tracking-tight">{CLINIC_CONFIG.clinicianName}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExportToExcel} className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm">
            <DownloadIcon /> Export
          </button>
          <button onClick={onAddPatient} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
            <UserPlusIcon /> New Patient
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6">
              <div className="flex bg-slate-100 p-1 rounded-2xl w-fit">
                <button
                  onClick={() => setActiveTab('active')}
                  className={`px-8 py-2.5 rounded-xl text-sm font-black transition-all uppercase tracking-widest ${activeTab === 'active' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400'}`}
                >
                  In-Care
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`px-8 py-2.5 rounded-xl text-sm font-black transition-all uppercase tracking-widest ${activeTab === 'history' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400'}`}
                >
                  History
                </button>
              </div>
              
              <div className="relative flex-1 md:max-w-xs">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400">
                  <SearchIcon />
                </div>
                <input
                  type="text"
                  placeholder="Search patients..."
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-indigo-50 outline-none transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-5">
            {filteredPatients.map((patient) => {
              const progress = calculateProgress(patient);
              return (
                <div key={patient.id} className="group bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-lg transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div onClick={() => onSelectPatient(patient)} className="flex items-center gap-5 cursor-pointer flex-1">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${patient.serviceType === 'x-ray' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                       {patient.serviceType === 'x-ray' ? <XrayIcon /> : <ActivityIcon />}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{patient.name}</h3>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 mt-1">
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase">{patient.condition}</span>
                        <span className="text-[10px] text-slate-300">•</span>
                        <span className="text-[10px] text-slate-400 font-bold">Visit Days: {patient.selectedDays?.map(d => d.slice(0,3)).join('/') || 'Daily'}</span>
                      </div>
                      <div className="mt-4">
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-1000 ${patient.serviceType === 'x-ray' ? 'bg-blue-600' : 'bg-emerald-600'}`} style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:border-l sm:pl-6 border-slate-100">
                    <a href={`tel:${patient.phone}`} className="p-3.5 rounded-2xl bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                      <PhoneIcon />
                    </a>
                    <button onClick={(e) => { e.stopPropagation(); onDeletePatient(patient.id); }} className="p-3.5 rounded-2xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all">
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
            <h3 className="text-xl font-black text-slate-800 tracking-tight mb-8">Clinical Inventory</h3>
            <div className="bg-slate-900 p-8 rounded-[1.5rem] mb-8 shadow-2xl">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Films In Stock</p>
              <p className={`text-5xl font-black ${isLowStock ? 'text-red-400' : 'text-white'}`}>{filmCount}</p>
            </div>
            <div className="flex gap-3">
              <input 
                type="number"
                placeholder="Count..."
                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none"
                value={addFilmValue}
                onChange={(e) => setAddFilmValue(e.target.value)}
              />
              <button onClick={() => { onAddFilms(parseInt(addFilmValue) || 0); setAddFilmValue(''); }} className="bg-indigo-600 text-white px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all">Restock</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
