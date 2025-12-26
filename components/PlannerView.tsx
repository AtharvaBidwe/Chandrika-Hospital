
import React, { useState, useMemo, useEffect } from 'react';
import { Patient, TherapySession, DailyPlan, DayOfWeek } from '../types';
import { ClockIcon, CheckCircleIcon, XCircleIcon, PhoneIcon, HistoryIcon, ActivityIcon, CalendarIcon } from './Icons';
import { suggestPhysioPlan } from '../services/geminiService';

interface PlannerViewProps {
  patient: Patient;
  onUpdatePlan: (updatedPlans: DailyPlan[]) => void;
  onBack: () => void;
}

const HOSPITAL_THERAPIES = [
  "Shockwave Therapy",
  "Laser Therapy",
  "Ultrasound Therapy",
  "IFT Therapy",
  "Manual Mobilization",
  "TENS Therapy"
];

const PlannerView: React.FC<PlannerViewProps> = ({ patient, onUpdatePlan, onBack }) => {
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const dates = useMemo(() => {
    const start = new Date(patient.startDate);
    const end = new Date(patient.endDate);
    const datesArr = [];
    let current = new Date(start);
    
    let safetyCounter = 0;
    while (current <= end && safetyCounter < 365) {
      datesArr.push(new Date(current).toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
      safetyCounter++;
    }
    return datesArr;
  }, [patient.startDate, patient.endDate]);

  useEffect(() => {
    if (dates.length > 0 && !dates.includes(selectedDate)) {
      setSelectedDate(dates[0]);
    }
  }, [dates, selectedDate]);

  const handleAddSession = (date: string) => {
    const newSession: TherapySession = {
      id: Math.random().toString(36).substr(2, 9),
      name: HOSPITAL_THERAPIES[2],
      duration: 15,
      notes: '',
      status: 'pending'
    };

    const existingPlan = patient.dailyPlans.find(p => p.date === date);
    let updatedPlans: DailyPlan[];

    if (existingPlan) {
      updatedPlans = patient.dailyPlans.map(p => 
        p.date === date ? { ...p, sessions: [...p.sessions, newSession] } : p
      );
    } else {
      updatedPlans = [...patient.dailyPlans, { id: Math.random().toString(36).substr(2, 9), date, sessions: [newSession] }];
    }
    onUpdatePlan(updatedPlans);
  };

  const handleCopyPrevious = () => {
    const currentIndex = dates.indexOf(selectedDate);
    if (currentIndex <= 0) return;
    
    const prevDate = dates[currentIndex - 1];
    const prevPlan = patient.dailyPlans.find(p => p.date === prevDate);
    
    if (prevPlan) {
      const newSessions = prevPlan.sessions.map(s => ({
        ...s,
        id: Math.random().toString(36).substr(2, 9),
        status: 'pending' as const
      }));
      
      let updatedPlans = patient.dailyPlans.map(p => 
        p.date === selectedDate ? { ...p, sessions: newSessions } : p
      );
      
      if (!updatedPlans.find(p => p.date === selectedDate)) {
        updatedPlans.push({ id: Math.random().toString(36).substr(2, 9), date: selectedDate, sessions: newSessions });
      }
      
      onUpdatePlan(updatedPlans);
    }
  };

  const handleUpdateSession = (date: string, sessionId: string, updates: Partial<TherapySession>) => {
    const updatedPlans = patient.dailyPlans.map(p => {
      if (p.date === date) {
        return {
          ...p,
          sessions: p.sessions.map(s => s.id === sessionId ? { ...s, ...updates } : s)
        };
      }
      return p;
    });
    onUpdatePlan(updatedPlans);
  };

  const handleSuggestAI = async () => {
    setIsAiLoading(true);
    const durationWeeks = Math.ceil(dates.length / 7);
    const aiSuggestion = await suggestPhysioPlan(patient.condition, durationWeeks, patient.selectedDays);
    
    if (aiSuggestion && aiSuggestion.length > 0) {
      let updatedPlans = [...patient.dailyPlans];
      
      dates.forEach(date => {
        const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }) as DayOfWeek;
        const suggestionForThisDayType = aiSuggestion.find((s: any) => s.dayName === dayOfWeek);
        
        if (suggestionForThisDayType) {
          const sessions: TherapySession[] = suggestionForThisDayType.sessions.map((s: any) => ({
            id: Math.random().toString(36).substr(2, 9),
            name: s.name,
            duration: s.duration,
            notes: s.notes,
            status: 'pending' as const
          }));
          
          const existingIdx = updatedPlans.findIndex(p => p.date === date);
          if (existingIdx > -1) {
            const alreadyHasThese = updatedPlans[existingIdx].sessions.some(existing => 
              sessions.some(newS => newS.name === existing.name)
            );
            if (!alreadyHasThese) {
              updatedPlans[existingIdx] = { ...updatedPlans[existingIdx], sessions: [...updatedPlans[existingIdx].sessions, ...sessions] };
            }
          } else {
            updatedPlans.push({ id: Math.random().toString(36).substr(2, 9), date, sessions });
          }
        }
      });
      onUpdatePlan(updatedPlans);
    }
    setIsAiLoading(false);
  };

  const currentPlan = useMemo(() => 
    patient.dailyPlans.find(p => p.date === selectedDate),
    [patient.dailyPlans, selectedDate]
  );

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
        <div>
          <button onClick={onBack} className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 flex items-center gap-2 mb-3">
            <span className="text-sm">←</span> Record Dashboard
          </button>
          <div className="flex items-center gap-5">
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter">{patient.name}</h1>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-4">
             <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-widest">{patient.condition}</span>
             </div>
             {patient.selectedDays && patient.selectedDays.length > 0 && (
               <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Scheduled:</span>
                  <div className="flex gap-1">
                    {patient.selectedDays.map(d => (
                      <span key={d} className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[8px] font-black uppercase border border-indigo-100">{d.slice(0,3)}</span>
                    ))}
                  </div>
               </div>
             )}
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <button onClick={handleSuggestAI} disabled={isAiLoading} className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center gap-3 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50">
            <span className="text-lg">✨</span>
            {isAiLoading ? 'Analyzing...' : 'AI Generated Protocol'}
          </button>
          <button onClick={handleCopyPrevious} className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center gap-3 hover:bg-indigo-600 transition-all shadow-2xl shadow-slate-200">
            <HistoryIcon />
            Copy Previous
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-3 max-h-[70vh] overflow-y-auto pr-4 custom-scrollbar">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-2 mb-2 block">Clinical Calendar</label>
          {dates.map((date) => {
            const plan = patient.dailyPlans.find(p => p.date === date);
            const count = plan?.sessions.length || 0;
            const completed = plan?.sessions.filter(s => s.status === 'completed').length || 0;
            const isSelected = selectedDate === date;
            const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }) as DayOfWeek;
            const isScheduledDay = patient.selectedDays?.includes(dayName);
            
            return (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                className={`w-full text-left p-4 rounded-3xl transition-all border relative overflow-hidden ${
                  isSelected 
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xl shadow-indigo-200 scale-[1.02]' 
                  : isScheduledDay 
                  ? 'bg-white border-indigo-100 text-slate-900 hover:border-indigo-400'
                  : 'bg-slate-50 border-slate-100 text-slate-400 grayscale opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isSelected ? 'text-indigo-100' : isScheduledDay ? 'text-indigo-600' : 'text-slate-400'}`}>
                      {dayName} {isScheduledDay && "•"}
                    </div>
                    <div className="text-lg font-black tracking-tight">
                      {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  {count > 0 && (
                    <div className={`w-10 h-10 rounded-2xl flex flex-col items-center justify-center border ${isSelected ? 'bg-white/20 border-white/20 text-white' : 'bg-slate-50 border-slate-100 text-slate-900'}`}>
                      <span className="text-[10px] font-black">{completed}/{count}</span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight italic uppercase">
                  Session Log — {new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                </h2>
              </div>
              <button
                onClick={() => handleAddSession(selectedDate)}
                className="bg-indigo-50 text-indigo-600 px-6 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-600 hover:text-white transition-all shadow-sm border border-indigo-100"
              >
                + Machine Entry
              </button>
            </div>

            {!currentPlan || currentPlan.sessions.length === 0 ? (
              <div className="py-24 text-center">
                 <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200">
                    <ActivityIcon />
                 </div>
                 <h3 className="text-xl font-black text-slate-300 uppercase tracking-widest italic">Awaiting Protocol</h3>
              </div>
            ) : (
              <div className="space-y-6">
                {currentPlan.sessions.map((session) => (
                  <div key={session.id} className="p-8 rounded-[2rem] border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-all group">
                    <div className="flex flex-col md:flex-row items-start gap-8">
                      <div className="flex-1 space-y-6 w-full">
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                          <div className="relative flex-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest absolute -top-5 left-1">Therapy Modality</label>
                            <select
                              className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3.5 font-black text-slate-800 text-sm outline-none transition-all cursor-pointer shadow-sm"
                              value={HOSPITAL_THERAPIES.includes(session.name) ? session.name : "Custom"}
                              onChange={(e) => {
                                const val = e.target.value;
                                handleUpdateSession(selectedDate, session.id, { name: val === "Custom" ? "" : val });
                              }}
                            >
                              {HOSPITAL_THERAPIES.map(t => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                              <option value="Custom">Other...</option>
                            </select>
                          </div>

                          <div className="relative min-w-[120px]">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest absolute -top-5 left-1">Duration</label>
                            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-5 py-3.5 shadow-sm">
                              <input
                                type="number"
                                className="w-10 bg-transparent focus:outline-none font-black text-slate-900 text-sm"
                                value={session.duration}
                                onChange={(e) => handleUpdateSession(selectedDate, session.id, { duration: parseInt(e.target.value) || 0 })}
                              />
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">min</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="relative">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest absolute -top-5 left-1">Settings / Intensity</label>
                          <textarea
                            placeholder="Clinical parameters..."
                            className="w-full bg-white border border-slate-200 rounded-2xl p-5 text-sm font-medium text-slate-600 outline-none transition-all shadow-sm"
                            value={session.notes}
                            rows={2}
                            onChange={(e) => handleUpdateSession(selectedDate, session.id, { notes: e.target.value })}
                          />
                        </div>
                      </div>
                      
                      <div className="flex md:flex-col gap-3 shrink-0">
                        <button
                          onClick={() => handleUpdateSession(selectedDate, session.id, { status: session.status === 'completed' ? 'pending' : 'completed' })}
                          className={`w-14 h-14 rounded-2xl transition-all shadow-xl flex items-center justify-center ${session.status === 'completed' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-200 border border-slate-100 hover:text-emerald-500'}`}
                        >
                          <CheckCircleIcon />
                        </button>
                        <button
                          onClick={() => handleUpdateSession(selectedDate, session.id, { status: session.status === 'missed' ? 'pending' : 'missed' })}
                          className={`w-14 h-14 rounded-2xl transition-all shadow-xl flex items-center justify-center ${session.status === 'missed' ? 'bg-red-600 text-white' : 'bg-white text-slate-200 border border-slate-100 hover:text-red-500'}`}
                        >
                          <XCircleIcon />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlannerView;
