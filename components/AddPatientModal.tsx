import React, { useState } from 'react';
import { Patient, ServiceType } from '../types';
import { ActivityIcon, BoneIcon } from './Icons';

interface AddPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (patient: Partial<Patient>) => void;
}

const AddPatientModal: React.FC<AddPatientModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    phone: '',
    address: '',
    condition: '',
    startDate: new Date().toISOString().split('T')[0],
    durationDays: '10',
    serviceType: 'physiotherapy' as ServiceType,
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const start = new Date(formData.startDate);
    const days = parseInt(formData.durationDays) || 1;
    const end = new Date(start);
    end.setDate(start.getDate() + days - 1);

    onAdd({
      ...formData,
      age: parseInt(formData.age),
      id: Math.random().toString(36).substr(2, 9),
      status: 'active',
      endDate: end.toISOString().split('T')[0],
      dailyPlans: [],
      selectedDays: [], // No longer used for filtering, but kept for type compatibility
      xrayData: formData.serviceType === 'x-ray' ? {
        issue: '',
        bodyParts: [],
        status: 'ordered',
        orderDate: new Date().toISOString()
      } : undefined
    });

    setFormData({ 
      name: '', 
      age: '', 
      phone: '', 
      address: '',
      condition: '', 
      startDate: new Date().toISOString().split('T')[0], 
      durationDays: '10',
      serviceType: 'physiotherapy'
    });
  };

  const inputClasses = "w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-slate-900 text-sm font-medium placeholder:text-slate-400 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all shadow-sm";
  const labelClasses = "block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200 border border-white/20">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Patient Admission</h2>
            <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-[0.2em] mt-0.5">Electronic Health Record v1.0</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white hover:shadow-md text-slate-400 hover:text-slate-600 transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
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
              <BoneIcon />
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClasses}>Age</label>
              <input required type="number" className={inputClasses} value={formData.age} onChange={(e) => setFormData({ ...formData, age: e.target.value })} placeholder="Years" />
            </div>
             <div>
              <label className={labelClasses}>Clinical Condition</label>
              <input required className={inputClasses} value={formData.condition} onChange={(e) => setFormData({ ...formData, condition: e.target.value })} placeholder="e.g. Cervical Spondylosis" />
            </div>
          </div>

          <div>
            <label className={labelClasses}>Residential Address</label>
            <textarea required className={inputClasses} value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="Complete address for records..." rows={2} />
          </div>

          {formData.serviceType === 'physiotherapy' && (
            <div className="animate-in slide-in-from-top-4 duration-500">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className={labelClasses}>Plan Start Date</label>
                  <input required type="date" className={inputClasses} value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} />
                </div>
                <div>
                  <label className={labelClasses}>Treatment Course (Days)</label>
                  <input required type="number" min="1" className={inputClasses} value={formData.durationDays} onChange={(e) => setFormData({ ...formData, durationDays: e.target.value })} />
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