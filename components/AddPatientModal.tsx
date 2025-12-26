
import React, { useState } from 'react';
import { Patient, ServiceType, DayOfWeek } from '../types';
import { ActivityIcon, XrayIcon, CalendarIcon } from './Icons';

interface AddPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (patient: Partial<Patient>) => void;
}

const RADIOLOGY_REGIONS = [
  { name: "Head & Spine", parts: ["Skull", "Sinuses", "Cervical Spine", "Thoracic Spine", "Lumbar Spine"], bilateral: false },
  { name: "Torso", parts: ["Chest (PA/Lat)", "Abdomen (KUB)", "Pelvis", "Ribs"], bilateral: true },
  { name: "Upper Limb", parts: ["Shoulder", "Humerus", "Elbow", "Forearm", "Wrist", "Hand"], bilateral: true },
  { name: "Lower Limb", parts: ["Hip", "Femur", "Knee", "Leg", "Ankle", "Foot"], bilateral: true }
];

const DAYS_OF_WEEK: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const AddPatientModal: React.FC<AddPatientModalProps> = ({ isOpen, onClose, onAdd }) => {
  const systemDate = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    phone: '',
    address: '',
    condition: '',
    startDate: systemDate,
    durationWeeks: '2',
    serviceType: 'physiotherapy' as ServiceType,
  });

  const [selectedProjections, setSelectedProjections] = useState<string[]>([]);
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>(['Monday', 'Wednesday', 'Friday']);

  if (!isOpen) return null;

  const toggleDay = (day: DayOfWeek) => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const toggleProjection = (part: string, side?: 'L' | 'R') => {
    const label = side ? `${part} (${side})` : part;
    setSelectedProjections(prev => 
      prev.includes(label) ? prev.filter(p => p !== label) : [...prev, label]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const start = new Date(formData.startDate);
    const weeks = parseInt(formData.durationWeeks) || 1;
    const end = new Date(start);
    end.setDate(start.getDate() + (weeks * 7) - 1);

    onAdd({
      ...formData,
      age: parseInt(formData.age),
      id: Math.random().toString(36).substr(2, 9),
      status: 'active',
      registrationDate: systemDate,
      endDate: end.toISOString().split('T')[0],
      dailyPlans: [],
      selectedDays: formData.serviceType === 'physiotherapy' ? selectedDays : [],
      xrayData: formData.serviceType === 'x-ray' ? {
        issue: formData.condition,
        bodyParts: selectedProjections,
        status: 'ordered',
        orderDate: new Date().toISOString()
      } : undefined
    });

    onClose();
    setFormData({ 
      name: '', age: '', phone: '', address: '', condition: '', 
      startDate: systemDate, durationWeeks: '2', serviceType: 'physiotherapy'
    });
    setSelectedProjections([]);
    setSelectedDays(['Monday', 'Wednesday', 'Friday']);
  };

  const inputClasses = "w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-slate-900 text-sm font-medium placeholder:text-slate-400 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all shadow-sm";
  const labelClasses = "block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-white/20">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Patient Admission</h2>
            <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-[0.2em] mt-0.5">Electronic Health Record v1.2</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white hover:shadow-md text-slate-400 hover:text-slate-600 transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, serviceType: 'physiotherapy' })}
              className={`flex flex-col items-center gap-2 p-5 rounded-3xl border-2 transition-all ${formData.serviceType === 'physiotherapy' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-xl shadow-indigo-100' : 'border-slate-50 bg-slate-50 text-slate-400 hover:border-slate-200'}`}
            >
              <ActivityIcon />
              <span className="text-xs font-black uppercase tracking-widest">Physio Dept</span>
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, serviceType: 'x-ray' })}
              className={`flex flex-col items-center gap-2 p-5 rounded-3xl border-2 transition-all ${formData.serviceType === 'x-ray' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-xl shadow-indigo-100' : 'border-slate-50 bg-slate-50 text-slate-400 hover:border-slate-200'}`}
            >
              <XrayIcon />
              <span className="text-xs font-black uppercase tracking-widest">Radiology Dept</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClasses}>Patient Name</label>
              <input required className={inputClasses} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Atharva Bidwe" />
            </div>
            <div>
              <label className={labelClasses}>Phone Number</label>
              <input required type="tel" className={inputClasses} value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+91 98XXX XXXXX" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <label className={labelClasses}>Age</label>
              <input required type="number" className={inputClasses} value={formData.age} onChange={(e) => setFormData({ ...formData, age: e.target.value })} placeholder="Years" />
            </div>
             <div className="md:col-span-2">
              <label className={labelClasses}>Town / City</label>
              <input required className={inputClasses} value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="e.g. Pune, Maharashtra" />
            </div>
          </div>

          <div>
            <label className={labelClasses}>Clinical Indication / History</label>
            <input 
              required 
              className={inputClasses} 
              value={formData.condition} 
              onChange={(e) => setFormData({ ...formData, condition: e.target.value })} 
              placeholder="Brief reason for visit..." 
            />
          </div>

          {formData.serviceType === 'x-ray' && (
            <div className="space-y-4 animate-in slide-in-from-top-4">
              <label className={labelClasses}>X-Ray Projections (Multiple Selection)</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {RADIOLOGY_REGIONS.map(region => (
                  <div key={region.name} className="bg-slate-50/50 p-4 rounded-3xl border border-slate-100">
                    <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3 px-1">{region.name}</h4>
                    <div className="space-y-2">
                      {region.parts.map(part => (
                        <div key={part} className="flex items-center justify-between gap-2 p-1 bg-white rounded-xl border border-slate-100 shadow-sm">
                          <span className="text-[11px] font-bold text-slate-600 ml-2">{part}</span>
                          <div className="flex gap-1">
                            {region.bilateral ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => toggleProjection(part, 'L')}
                                  className={`w-7 h-7 rounded-lg text-[10px] font-black transition-all ${selectedProjections.includes(`${part} (L)`) ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                                >
                                  L
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleProjection(part, 'R')}
                                  className={`w-7 h-7 rounded-lg text-[10px] font-black transition-all ${selectedProjections.includes(`${part} (R)`) ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                                >
                                  R
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => toggleProjection(part)}
                                className={`px-3 h-7 rounded-lg text-[10px] font-black transition-all ${selectedProjections.includes(part) ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                              >
                                Select
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {formData.serviceType === 'physiotherapy' && (
            <div className="space-y-6 animate-in slide-in-from-top-4">
              <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                <label className={labelClasses}>Select Visit Days</label>
                <div className="flex flex-wrap gap-2 mt-4">
                  {DAYS_OF_WEEK.map(day => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedDays.includes(day) ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white text-slate-400 border border-slate-100 hover:border-indigo-200'}`}
                    >
                      {day.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className={labelClasses}>Plan Start Date</label>
                  <input required type="date" className={inputClasses} value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} />
                </div>
                <div>
                  <label className={labelClasses}>Course Duration (Weeks)</label>
                  <input required type="number" min="1" className={inputClasses} value={formData.durationWeeks} onChange={(e) => setFormData({ ...formData, durationWeeks: e.target.value })} />
                </div>
              </div>
            </div>
          )}

          <div className="pt-6 flex gap-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-4 rounded-2xl border border-slate-200 text-slate-400 font-black uppercase tracking-widest text-[11px] hover:bg-slate-50 transition-all">Cancel</button>
            <button type="submit" className="flex-[2] px-4 py-4 rounded-2xl bg-indigo-600 text-white font-black uppercase tracking-widest text-[11px] hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-100">Initialize Admission</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPatientModal;
