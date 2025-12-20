
import React, { useState, useMemo, useEffect } from 'react';
import { Patient, CLINIC_CONFIG } from '../types';
import { 
  UserPlusIcon, 
  UsersIcon,
  ActivityIcon, 
  CheckCircleIcon, 
  CalendarIcon, 
  ChevronRightIcon, 
  PhoneIcon, 
  HistoryIcon, 
  SearchIcon, 
  DownloadIcon,
  BoneIcon,
  ClockIcon,
  ScansIcon,
  XCircleIcon,
  TrashIcon
} from './Icons';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, Tooltip, ResponsiveContainer, Radar as RadarComponent } from 'recharts';
import * as XLSX from 'xlsx';
import { analyzePainPatterns } from '../services/geminiService';

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
  const [painData, setPainData] = useState<any[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [addFilmValue, setAddFilmValue] = useState<string>('');

  const calculateProgress = (patient: Patient) => {
    if (patient.serviceType === 'x-ray') {
      if (!patient.xrayData) return 0;
      if (patient.xrayData.status === 'reported') return 100;
      if (patient.xrayData.status === 'captured') return 50;
      return 10;
    }
    const totalSessions = patient.dailyPlans.reduce((acc, plan) => acc + plan.sessions.length, 0);
    if (totalSessions === 0) return 0;
    const completedSessions = patient.dailyPlans.reduce((acc, plan) => 
      acc + plan.sessions.filter(s => s.status === 'completed').length, 0
    );
    return Math.round((completedSessions / totalSessions) * 100);
  };

  const activePatients = patients.filter(p => p.status === 'active');
  const pastPatients = patients.filter(p => p.status === 'completed' || p.status === 'archived');

  const totalPhysioCount = patients.filter(p => p.serviceType === 'physiotherapy').length;
  const totalXrayCount = patients.filter(p => p.serviceType === 'x-ray').length;
  const currentActiveCount = activePatients.length;
  const totalHistoryCount = pastPatients.length;

  useEffect(() => {
    const runAnalysis = async () => {
      const physioConditions = patients.filter(p => p.serviceType === 'physiotherapy').map(p => p.condition);
      if (physioConditions.length === 0) {
        setPainData([]);
        return;
      }
      setIsAnalyzing(true);
      const results = await analyzePainPatterns(physioConditions);
      setPainData(results);
      setIsAnalyzing(false);
    };
    runAnalysis();
  }, [patients.length]);

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
        p.phone.includes(term) ||
        (p.address && p.address.toLowerCase().includes(term)) ||
        p.id.toLowerCase().includes(term)
      );
    }

    if (activeTab === 'history') {
      if (fromDate) filtered = filtered.filter(p => p.startDate >= fromDate);
      if (toDate) filtered = filtered.filter(p => p.startDate <= toDate);
    }
    
    return filtered.sort((a, b) => b.startDate.localeCompare(a.startDate));
  }, [activeTab, activePatients, pastPatients, searchTerm, serviceFilter, fromDate, toDate]);

  const handleExportToExcel = () => {
    const dataToExport = patients.map(p => ({
      'Patient ID': p.id,
      'Name': p.name,
      'Age': p.age,
      'Phone': p.phone,
      'Address': p.address || 'N/A',
      'Service': p.serviceType.toUpperCase(),
      'Condition/History': p.condition,
      'Status': p.status,
      'Progress %': calculateProgress(p),
      'Start Date': p.startDate,
      'End Date': p.endDate,
      'Xray Status': p.serviceType === 'x-ray' ? p.xrayData?.status : 'N/A'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Patients Data");
    XLSX.writeFile(workbook, `${CLINIC_CONFIG.shortName}_Clinical_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const isLowStock = filmCount <= CLINIC_CONFIG.lowFilmThreshold;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {isLowStock && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl flex items-center justify-between animate-bounce shadow-sm">
          <div className="flex items-center gap-3 text-red-700">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-bold">Low X-Ray Film Stock!</p>
              <p className="text-xs">Only {filmCount} films remaining. Please restock immediately.</p>
            </div>
          </div>
          <button 
            onClick={() => document.getElementById('film-input')?.focus()}
            className="text-xs font-bold bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors"
          >
            Restock Now
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Clinical Dashboard</h1>
          <p className="text-slate-500 font-medium tracking-tight">Welcome, {CLINIC_CONFIG.clinicianName}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportToExcel}
            className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
          >
            <DownloadIcon />
            <span className="hidden sm:inline">Export Records</span>
          </button>
          <button
            onClick={onAddPatient}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
          >
            <UserPlusIcon />
            <span>New Patient</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-indigo-200 transition-all">
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
            <ActivityIcon />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Physiotherapy</p>
            <p className="text-2xl font-black text-slate-900">{totalPhysioCount}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-blue-200 transition-all">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
            <BoneIcon />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">X-Ray Radiology</p>
            <p className="text-2xl font-black text-slate-900">{totalXrayCount}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-orange-200 transition-all">
          <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
            <ClockIcon />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">In-Care</p>
            <p className="text-2xl font-black text-slate-900">{currentActiveCount}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-emerald-200 transition-all">
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
            <HistoryIcon />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">History</p>
            <p className="text-2xl font-black text-slate-900">{totalHistoryCount}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col gap-4 mb-2">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="flex bg-slate-200/50 p-1.5 rounded-2xl w-fit shadow-inner">
                <button
                  onClick={() => { setActiveTab('active'); setServiceFilter('all'); }}
                  className={`px-8 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'active' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  In-Care
                </button>
                <button
                  onClick={() => { setActiveTab('history'); setServiceFilter('all'); }}
                  className={`px-8 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'history' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  History
                </button>
              </div>
              
              <div className="relative flex-1 sm:max-w-xs">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                  <SearchIcon />
                </div>
                <input
                  type="text"
                  placeholder="Patient name or ID..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          {filteredPatients.length === 0 ? (
            <div className="bg-white rounded-3xl p-16 text-center border-2 border-dashed border-slate-200">
              <h3 className="text-xl font-bold text-slate-800">No records found</h3>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5">
              {filteredPatients.map((patient) => {
                const progress = calculateProgress(patient);
                
                if (activeTab === 'history') {
                  return (
                    <div key={patient.id} className="group bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm hover:shadow-2xl hover:border-indigo-100 transition-all border-l-8 border-l-slate-200 hover:border-l-indigo-500 relative">
                      <div className="flex flex-col lg:flex-row gap-8">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-6">
                             <div className="flex items-center gap-4">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${patient.serviceType === 'x-ray' ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'}`}>
                                  {patient.serviceType === 'x-ray' ? <BoneIcon /> : <ActivityIcon />}
                                </div>
                                <div>
                                  <h3 className="text-2xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                                    {patient.name}
                                  </h3>
                                  <span className="text-[10px] font-black uppercase text-indigo-500 bg-indigo-50 px-2.5 py-1 rounded-lg">ID: {patient.id.toUpperCase()}</span>
                                </div>
                             </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6 bg-slate-50/80 rounded-3xl border border-slate-100/50">
                            <div className="space-y-2">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Period</p>
                              <p className="text-sm font-bold text-slate-700">{patient.startDate} → {patient.endDate}</p>
                            </div>
                            <div className="space-y-2">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progress</p>
                              <div className="flex items-center gap-3">
                                <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-500" style={{ width: `${progress}%` }} />
                                </div>
                                <span className="text-xs font-black text-slate-600">{progress}%</span>
                              </div>
                            </div>
                            <div className="space-y-2 lg:col-span-2">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Clinical History</p>
                              <p className="text-sm font-bold text-slate-800 truncate">{patient.condition}</p>
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 flex lg:flex-col justify-end lg:justify-center gap-4 lg:border-l lg:pl-8 border-slate-100">
                          <button 
                            onClick={() => onSelectPatient(patient)}
                            className="bg-slate-900 text-white px-8 py-4 rounded-[1.25rem] text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200 hover:shadow-indigo-200"
                          >
                            Clinical File
                          </button>
                        </div>
                      </div>
                      
                      <button 
                        onClick={(e) => { e.stopPropagation(); onDeletePatient(patient.id); }}
                        className="absolute top-6 right-6 p-2.5 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                        title="Delete Record"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  );
                }

                return (
                  <div key={patient.id} className="group bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-lg transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative">
                    <div onClick={() => onSelectPatient(patient)} className="flex items-center gap-5 cursor-pointer flex-1">
                      <div className={`w-14 h-14 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center transition-all ${patient.serviceType === 'x-ray' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'} group-hover:scale-110`}>
                         {patient.serviceType === 'x-ray' ? <BoneIcon /> : <ActivityIcon />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {patient.name}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase">{patient.condition}</span>
                          <span className="text-[10px] text-slate-300">•</span>
                          <span className="text-[10px] text-slate-400 font-bold">{patient.age} Yrs</span>
                        </div>
                        <div className="mt-4">
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-1000 ${patient.serviceType === 'x-ray' ? 'bg-blue-600' : 'bg-indigo-600'}`} 
                              style={{ width: `${progress}%` }} 
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 sm:border-l sm:pl-6 border-slate-100">
                      <a 
                        href={`tel:${patient.phone}`}
                        className="p-3.5 rounded-2xl bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <PhoneIcon />
                      </a>
                      
                      <button 
                        onClick={(e) => { e.stopPropagation(); onUpdatePatientStatus(patient.id, 'completed'); }} 
                        className="px-5 py-3 rounded-2xl bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-all shadow-sm text-xs font-black uppercase tracking-widest"
                      >
                        Discharge
                      </button>

                      <button 
                        onClick={(e) => { e.stopPropagation(); onDeletePatient(patient.id); }}
                        className="p-3.5 rounded-2xl text-slate-200 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                        title="Delete Record"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
            <h3 className="text-xl font-black text-slate-800 tracking-tight mb-8">X-Ray Storage</h3>
            <div className="flex items-center justify-between bg-slate-900 p-8 rounded-[1.5rem] mb-8 shadow-2xl">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Films Available</p>
                <p className={`text-5xl font-black ${isLowStock ? 'text-red-400' : 'text-white'}`}>{filmCount}</p>
              </div>
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Restock</label>
              <div className="flex gap-3">
                <input 
                  id="film-input"
                  type="number"
                  placeholder="Count..."
                  className="flex-1 px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  value={addFilmValue}
                  onChange={(e) => setAddFilmValue(e.target.value)}
                />
                <button 
                  onClick={() => {
                    const count = parseInt(addFilmValue);
                    if (count > 0) { onAddFilms(count); setAddFilmValue(''); }
                  }}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm relative overflow-hidden">
            <h3 className="text-xl font-black text-slate-800 tracking-tight mb-6">Cohort Insights</h3>
            {isAnalyzing ? (
              <div className="h-[240px] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : painData.length === 0 ? (
              <div className="h-[240px] flex items-center justify-center text-slate-400 text-sm italic text-center">
                Insufficient data for cohort analysis.
              </div>
            ) : (
              <div className="h-[240px] -mx-4">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={painData}>
                    <PolarGrid stroke="#f1f5f9" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 900 }} />
                    <RadarComponent name="Cases" dataKey="A" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.15} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
