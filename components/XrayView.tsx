
import React, { useState, useRef, useEffect } from 'react';
import { Patient, XrayData, CLINIC_CONFIG } from '../types';
import { XrayIcon, CheckCircleIcon, ClockIcon, ActivityIcon, DownloadIcon, ScansIcon, BoneIcon } from './Icons';
import { analyzeXrayImage } from '../services/geminiService';

interface XrayViewProps {
  patient: Patient;
  onUpdateXray: (updatedXray: XrayData) => void;
  onBack: () => void;
  availableFilms: number;
}

const XrayView: React.FC<XrayViewProps> = ({ patient, onUpdateXray, onBack, availableFilms }) => {
  const xray = patient.xrayData || { issue: '', bodyParts: [], status: 'ordered', orderDate: new Date().toISOString() };
  
  const [issue, setIssue] = useState(xray.issue);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [language, setLanguage] = useState<'en' | 'mr'>('en');
  const [filmsToUse, setFilmsToUse] = useState<number>(xray.filmsUsedCount || Math.max(1, xray.bodyParts.length));
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to strip markdown bolding/italics for consistent print output
  const sanitizeReport = (text: string) => {
    if (!text) return "";
    return text.replace(/\*\*|\*|__/g, "");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (availableFilms < filmsToUse) {
        alert(`Inventory Alert: Only ${availableFilms} films left. Selected: ${filmsToUse}.`);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdateXray({
          ...xray,
          issue,
          imageUrl: reader.result as string,
          status: 'captured',
          filmsUsedCount: filmsToUse
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRunAI = async () => {
    if (!xray.imageUrl) return;
    setIsAnalyzing(true);
    try {
      const report = await analyzeXrayImage(xray.imageUrl, 'image/jpeg', issue || patient.condition, language);
      onUpdateXray({ ...xray, aiReport: report, status: 'reported' });
    } catch (err: any) {
      alert(`Radiology AI Error: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const statusSteps = [
    { key: 'ordered', label: 'Ordered', icon: <ClockIcon /> },
    { key: 'captured', label: 'Captured', icon: <ScansIcon /> },
    { key: 'reported', label: 'Reported', icon: <CheckCircleIcon /> }
  ];

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 animate-in fade-in duration-500">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10 no-print">
        <div>
          <button onClick={onBack} className="text-[10px] font-black uppercase tracking-widest text-indigo-600 flex items-center gap-2 mb-3 hover:translate-x-[-4px] transition-transform">
            <span>←</span> Clinical Records
          </button>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-4">
            {patient.name}
            <span className="text-xs bg-slate-100 text-slate-400 px-3 py-1 rounded-full font-bold uppercase tracking-widest">Case #{patient.id.slice(-4)}</span>
          </h1>
        </div>
        
        {/* Status Stepper */}
        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
          {statusSteps.map((step, idx) => {
            const isActive = xray.status === step.key;
            const isDone = statusSteps.findIndex(s => s.key === xray.status) >= idx;
            return (
              <div key={step.key} className="flex items-center">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : isDone ? 'text-indigo-600' : 'text-slate-300'}`}>
                  <span className="scale-75">{step.icon}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest">{step.label}</span>
                </div>
                {idx < statusSteps.length - 1 && <div className={`w-4 h-[2px] mx-1 ${isDone ? 'bg-indigo-100' : 'bg-slate-50'}`}></div>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* SIDEBAR */}
        <div className="lg:col-span-1 space-y-6 no-print">
          <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 px-1">Order Details</h3>
             
             <div className="space-y-6">
                <div>
                   <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest ml-1 mb-2 block">Clinical Indication</label>
                   <textarea 
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 font-bold text-slate-800 text-sm outline-none focus:ring-4 focus:ring-indigo-50 focus:bg-white transition-all" 
                    value={issue} 
                    rows={3}
                    onChange={(e) => setIssue(e.target.value)}
                    placeholder="Brief history/reason..."
                  />
                </div>

                <div>
                   <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest ml-1 mb-2 block">Projections Requested</label>
                   <div className="flex flex-wrap gap-2">
                      {xray.bodyParts.map(part => (
                        <span key={part} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-xl text-[10px] font-black uppercase border border-indigo-100 flex items-center gap-2">
                          <BoneIcon /> {part}
                        </span>
                      ))}
                   </div>
                </div>

                <div className="pt-4 border-t border-slate-50">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Films Inventory</span>
                    <span className={`text-xs font-black ${availableFilms < filmsToUse ? 'text-red-500' : 'text-slate-900'}`}>{availableFilms} Available</span>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-black uppercase text-slate-400 ml-2">Films to Use:</span>
                    <input 
                      type="number" 
                      className="w-12 bg-transparent font-black text-indigo-600 text-sm outline-none"
                      value={filmsToUse}
                      onChange={(e) => setFilmsToUse(parseInt(e.target.value) || 1)}
                    />
                  </div>
                </div>
             </div>
          </div>
        </div>

        {/* MAIN VIEW */}
        <div className="lg:col-span-2 space-y-6">
          {/* SCAN DISPLAY */}
          <div className="bg-slate-900 rounded-[2.5rem] min-h-[450px] flex flex-col items-center justify-center relative overflow-hidden group no-print">
            {xray.imageUrl ? (
              <>
                <img src={xray.imageUrl} className="max-h-[600px] w-full object-contain p-8" alt="X-ray scan" />
                <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => fileInputRef.current?.click()} className="bg-white/10 backdrop-blur-md text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/20 hover:bg-white/20 transition-all">Replace Scan</button>
                </div>
              </>
            ) : (
              <div className="text-center p-12">
                <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-700">
                  <ScansIcon />
                </div>
                <h3 className="text-xl font-black text-white uppercase tracking-widest mb-2 italic">Awaiting Capture</h3>
                <p className="text-slate-500 text-xs mb-8 max-w-[240px] mx-auto font-medium">Please upload the DICOM/Image scan from the radiology department.</p>
                <button onClick={() => fileInputRef.current?.click()} className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-[11px] hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-900">Upload Digital Scan</button>
              </div>
            )}
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
          </div>

          {/* REPORT VIEWER */}
          <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm report-container relative overflow-hidden">
            {/* Metadata for Printing (Visible only in Print) */}
            <div className="hidden print:block patient-meta-print">
               <div className="w-full flex justify-between items-start text-[10.5pt] font-bold">
                  <div className="space-y-1">
                    <p>PATIENT: {patient.name.toUpperCase()}</p>
                    <p>AGE/SEX: {patient.age}Y / {patient.id.slice(-1).toUpperCase() === 'F' ? 'FEMALE' : 'MALE'}</p>
                    <p>ADDRESS: {patient.address.toUpperCase()}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p>REF NO: {patient.id.toUpperCase()}</p>
                    <p>DATE: {new Date().toLocaleDateString('en-GB')}</p>
                  </div>
               </div>
            </div>
            <div className="hidden print:block mb-6">
               <p className="text-[11.5pt] font-bold uppercase underline">CLINICAL INDICATION: {issue || patient.condition}</p>
            </div>

            {/* AI Control Bar */}
            <div className="flex justify-between items-center mb-8 no-print">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <ActivityIcon />
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">Radiological Report</h3>
              </div>
              <div className="flex gap-2 ai-controls">
                <button onClick={() => setLanguage('en')} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${language === 'en' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-400'}`}>English</button>
                <button onClick={() => setLanguage('mr')} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${language === 'mr' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-400'}`}>Marathi</button>
              </div>
            </div>

            {xray.aiReport ? (
              <div className="animate-in fade-in duration-700">
                <div className="report-text bg-slate-50 p-8 rounded-[2rem] text-slate-800 border border-slate-100 shadow-inner">
                  {sanitizeReport(xray.aiReport)}
                </div>
                
                {/* Footer and Sign-off for print */}
                <div className="hidden print:block mt-12 text-right font-bold text-[10.5pt]">
                  <p className="mb-14">Digitally Signed By,</p>
                  <p className="text-[11.5pt]">{CLINIC_CONFIG.clinicianName.toUpperCase()}</p>
                  <p className="text-slate-600 text-[8.5pt]">{CLINIC_CONFIG.credentials}</p>
                </div>

                <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-end no-print">
                  <button onClick={handleRunAI} className="px-8 py-4 rounded-2xl bg-slate-100 text-slate-600 font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all">Re-Analyze</button>
                  <button onClick={() => window.print()} className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-[11px] flex items-center justify-center gap-3 hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-100">
                    <DownloadIcon /> Finalize & Print Report
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-24 text-center bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-100 no-print flex flex-col items-center">
                {isAnalyzing ? (
                  <>
                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-6"></div>
                    <p className="font-black text-indigo-600 uppercase tracking-[0.2em] text-xs">Generating Clinical Diagnosis...</p>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-200 mb-6 shadow-sm">
                      <DownloadIcon />
                    </div>
                    <h3 className="text-lg font-black text-slate-300 uppercase tracking-widest mb-2">Findings Awaiting Analysis</h3>
                    <p className="text-slate-400 text-xs mb-8 max-w-[280px] font-medium leading-relaxed">Once the scan is uploaded, our AI will assist in generating a professional radiological report.</p>
                    <button 
                      onClick={handleRunAI} 
                      disabled={!xray.imageUrl} 
                      className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black uppercase text-[11px] tracking-widest disabled:opacity-20 hover:bg-indigo-600 transition-all shadow-lg"
                    >
                      Run AI Analysis
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default XrayView;
