
import React, { useState, useRef, useEffect } from 'react';
import { Patient, XrayData, CLINIC_CONFIG } from '../types';
import { XrayIcon, CheckCircleIcon, ClockIcon, ActivityIcon, DownloadIcon, ScansIcon } from './Icons';
import { analyzeXrayImage } from '../services/geminiService';

interface XrayViewProps {
  patient: Patient;
  onUpdateXray: (updatedXray: XrayData) => void;
  onBack: () => void;
  availableFilms: number;
}

const RADIOLOGY_REGIONS = [
  { name: "Head/Spine", parts: ["Skull", "Sinuses", "Cervical Spine", "Thoracic Spine", "Lumbar Spine"], bilateral: false },
  { name: "Torso", parts: ["Chest (PA/Lat)", "Abdomen (KUB)", "Pelvis", "Ribs"], bilateral: true },
  { name: "Upper Limb", parts: ["Shoulder", "Humerus", "Elbow", "Forearm", "Wrist", "Hand"], bilateral: true },
  { name: "Lower Limb", parts: ["Hip", "Femur", "Knee", "Leg", "Ankle", "Foot"], bilateral: true }
];

const XrayView: React.FC<XrayViewProps> = ({ patient, onUpdateXray, onBack, availableFilms }) => {
  const xray = patient.xrayData || { issue: '', bodyParts: [], status: 'ordered', orderDate: new Date().toISOString() };
  
  const [issue, setIssue] = useState(xray.issue);
  const [selectedParts, setSelectedParts] = useState<string[]>(xray.bodyParts);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [language, setLanguage] = useState<'en' | 'mr'>('en');
  const [filmsToUse, setFilmsToUse] = useState<number>(xray.filmsUsedCount || Math.max(1, selectedParts.length));
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (xray.status === 'ordered') {
      setFilmsToUse(Math.max(1, selectedParts.length));
    }
  }, [selectedParts.length, xray.status]);

  const togglePart = (part: string, side?: 'L' | 'R') => {
    const label = side ? `${part} (${side})` : part;
    setSelectedParts(prev => 
      prev.includes(label) ? prev.filter(p => p !== label) : [...prev, label]
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (availableFilms < filmsToUse) {
        alert(`CRITICAL: Insufficient film stock. Required: ${filmsToUse}, Available: ${availableFilms}.`);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        onUpdateXray({
          ...xray,
          issue,
          bodyParts: selectedParts,
          imageUrl: base64String,
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
      const mimeType = xray.imageUrl.split(';')[0].split(':')[1] || 'image/jpeg';
      const report = await analyzeXrayImage(xray.imageUrl, mimeType, issue || patient.condition, language);
      onUpdateXray({
        ...xray,
        issue,
        bodyParts: selectedParts,
        aiReport: report,
        status: 'reported'
      });
    } catch (err: any) {
      alert(`AI Analysis failed: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const updateStatus = (status: XrayData['status']) => {
    onUpdateXray({ ...xray, issue, bodyParts: selectedParts, status });
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 animate-in fade-in duration-500 relative pb-24">
      {/* Custom Styles for Scanning Animation and Printing */}
      <style>{`
        @keyframes scanline {
          0% { top: 0%; opacity: 0.1; }
          50% { opacity: 0.8; }
          100% { top: 100%; opacity: 0.1; }
        }
        .scan-line {
          height: 3px;
          background: linear-gradient(90deg, transparent, #6366f1, transparent);
          box-shadow: 0 0 15px #6366f1;
          position: absolute;
          width: 100%;
          animation: scanline 3s linear infinite;
        }
        .grid-overlay {
          background-image: 
            linear-gradient(rgba(99, 102, 241, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99, 102, 241, 0.05) 1px, transparent 1px);
          background-size: 30px 30px;
        }
        @media print {
          .print-header { display: block !important; margin-bottom: 2rem; border-bottom: 2px solid #eee; padding-bottom: 1rem; }
          .no-print { display: none !important; }
          .report-container { border: none !important; box-shadow: none !important; padding: 0 !important; }
          .report-text { background: transparent !important; color: black !important; font-size: 12pt !important; line-height: 1.6 !important; }
          body { background: white !important; }
        }
      `}</style>

      {/* Print Only Header */}
      <div className="hidden print-header">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black uppercase">{CLINIC_CONFIG.name}</h1>
            <p className="text-sm font-bold text-slate-500">RADIOLOGY & CLINICAL IMAGING DEPARTMENT</p>
          </div>
          <div className="text-right text-xs">
            <p className="font-bold">{CLINIC_CONFIG.clinicianName}</p>
            <p>{CLINIC_CONFIG.credentials}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3 rounded">
          <p><strong>Patient:</strong> {patient.name} ({patient.age}Y)</p>
          <p><strong>ID:</strong> {patient.id.toUpperCase()}</p>
          <p><strong>Indication:</strong> {xray.issue || patient.condition}</p>
          <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
        </div>
      </div>

      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 no-print">
          <div>
            <button onClick={onBack} className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 flex items-center gap-2 mb-3">
              <span className="text-sm">←</span> Return to Dashboard
            </button>
            <div className="flex items-center gap-4">
              <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Radiology Lab</h1>
              <div className={`px-3 py-1 rounded-lg flex items-center gap-2 border ${availableFilms < 5 ? 'bg-red-50 border-red-100 text-red-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${availableFilms < 5 ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                <span className="text-[10px] font-black uppercase tracking-widest">{availableFilms} Films In-Stock</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => updateStatus('reported')}
              className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200"
            >
              Commit & Discharge
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6 no-print">
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 px-1">Order Pipeline</h3>
              <div className="space-y-3">
                {[
                  { id: 'ordered', label: '1. Order Entry', icon: <ClockIcon /> },
                  { id: 'captured', label: '2. Imaging Asset', icon: <ActivityIcon /> },
                  { id: 'reported', label: '3. Clinical Report', icon: <CheckCircleIcon /> }
                ].map((step) => (
                  <div
                    key={step.id}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                      xray.status === step.id 
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-md' 
                      : 'border-slate-50 bg-slate-50/30 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-black text-[11px] uppercase tracking-widest">{step.label}</span>
                    </div>
                    {xray.status === step.id && <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></div>}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 rounded-[2.5rem] p-8 border border-white/5 shadow-2xl">
              <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">Film Allocation</h3>
              <div className="space-y-4">
                <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
                   <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Films for Capture</span>
                      <div className="flex items-center gap-3">
                        <button 
                          disabled={xray.status !== 'ordered'}
                          onClick={() => setFilmsToUse(prev => Math.max(1, prev - 1))}
                          className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white hover:bg-white/20 disabled:opacity-30"
                        >-</button>
                        <span className="text-lg font-black text-white">{filmsToUse}</span>
                        <button 
                          disabled={xray.status !== 'ordered' || filmsToUse >= availableFilms}
                          onClick={() => setFilmsToUse(prev => prev + 1)}
                          className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white hover:bg-white/20 disabled:opacity-30"
                        >+</button>
                      </div>
                   </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-1">Projection Grid</h3>
              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                {RADIOLOGY_REGIONS.map(region => (
                  <div key={region.name}>
                    <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2 opacity-60">{region.name}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {region.parts.map(part => (
                        <div key={part} className="flex gap-1">
                          {region.bilateral ? (
                            <>
                              <button
                                onClick={() => togglePart(part, 'L')}
                                disabled={xray.status !== 'ordered'}
                                className={`px-2 py-1.5 rounded-xl border text-[9px] font-black uppercase transition-all ${selectedParts.includes(`${part} (L)`) ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-100 bg-slate-50 text-slate-400'} disabled:opacity-50`}
                              >
                                {part} (L)
                              </button>
                              <button
                                onClick={() => togglePart(part, 'R')}
                                disabled={xray.status !== 'ordered'}
                                className={`px-2 py-1.5 rounded-xl border text-[9px] font-black uppercase transition-all ${selectedParts.includes(`${part} (R)`) ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-100 bg-slate-50 text-slate-400'} disabled:opacity-50`}
                              >
                                {part} (R)
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => togglePart(part)}
                              disabled={xray.status !== 'ordered'}
                              className={`px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase transition-all ${selectedParts.includes(part) ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-100 bg-slate-50 text-slate-400'} disabled:opacity-50`}
                            >
                              {part}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-950 rounded-[2.5rem] overflow-hidden shadow-2xl relative min-h-[400px] flex items-center justify-center border border-white/5 no-print">
              {xray.imageUrl ? (
                <div className="relative group w-full h-full flex items-center justify-center bg-black">
                  <img src={xray.imageUrl} alt="X-ray view" className="max-w-full max-h-[600px] p-4 object-contain" />
                  
                  <div className="absolute inset-0 grid-overlay pointer-events-none opacity-40"></div>
                  
                  {isAnalyzing && (
                    <div className="absolute inset-0 bg-indigo-950/40 backdrop-blur-[2px] flex flex-col items-center justify-center text-white p-6 text-center z-10 overflow-hidden">
                      <div className="scan-line"></div>
                      <div className="relative z-20">
                        <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-400 rounded-full animate-spin mb-6 mx-auto"></div>
                        <h3 className="text-xl font-black uppercase tracking-widest italic drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">Synthesizing Report</h3>
                      </div>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-4 backdrop-blur-[4px] no-print">
                    <p className="text-white text-[10px] font-black uppercase tracking-[0.3em] mb-2">Radiology Hub</p>
                    <div className="flex gap-4">
                      <button onClick={() => cameraInputRef.current?.click()} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-white/20 hover:bg-indigo-700 transition-all">
                        Camera
                      </button>
                      <button onClick={() => fileInputRef.current?.click()} className="bg-white/10 backdrop-blur-md text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-white/20 hover:bg-white/20 transition-all">
                        Gallery
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center p-16">
                  <div className="w-24 h-24 bg-white/5 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-indigo-400 ring-1 ring-white/10 shadow-inner">
                    <ScansIcon />
                  </div>
                  <h3 className="text-2xl font-black text-white mb-3 uppercase tracking-tight">Image Acquisition</h3>
                  <p className="text-white/40 text-[10px] font-black uppercase tracking-widest max-w-xs mx-auto mb-10 leading-relaxed">
                    System ready. Choose input source:
                  </p>
                  
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-sm mx-auto no-print">
                    <button 
                      disabled={filmsToUse > availableFilms}
                      onClick={() => cameraInputRef.current?.click()} 
                      className={`w-full px-8 py-5 rounded-3xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-3 ${filmsToUse > availableFilms ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xl shadow-indigo-900'}`}
                    >
                      Open Camera
                    </button>
                    <button 
                      disabled={filmsToUse > availableFilms}
                      onClick={() => fileInputRef.current?.click()} 
                      className={`w-full px-8 py-5 rounded-3xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-3 ${filmsToUse > availableFilms ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-slate-800 text-white border border-white/10 hover:bg-slate-700'}`}
                    >
                      From Gallery
                    </button>
                  </div>
                </div>
              )}
              
              <input type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleFileUpload} />
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
            </div>

            <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm report-container">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 no-print">
                <div className="flex-1">
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">Clinical Synthesis</h3>
                  <div className="mt-4 flex bg-slate-100 p-1 rounded-2xl w-fit border border-slate-200 shadow-inner">
                    <button onClick={() => setLanguage('en')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${language === 'en' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>English</button>
                    <button onClick={() => setLanguage('mr')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${language === 'mr' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>मराठी</button>
                  </div>
                </div>
                {xray.imageUrl && !isAnalyzing && (
                  <button onClick={handleRunAI} className="px-8 py-3 bg-white border-2 border-slate-900 text-slate-900 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-slate-900 hover:text-white transition-all shadow-xl shadow-slate-100 flex items-center gap-2">
                    <span className="text-lg">✨</span> Run AI Analysis
                  </button>
                )}
              </div>

              {xray.aiReport ? (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-slate-900 text-slate-300 p-10 rounded-[2rem] font-mono text-sm whitespace-pre-wrap leading-loose shadow-2xl border border-white/5 report-text">
                    {xray.aiReport}
                  </div>
                  <div className="mt-10 flex justify-end no-print">
                     <button onClick={() => window.print()} className="flex items-center gap-3 bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-100">
                       <DownloadIcon /> Print Report
                     </button>
                  </div>
                </div>
              ) : (
                <div className="py-24 text-center bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-200 no-print">
                  <p className="text-slate-400 font-black uppercase tracking-widest text-xs italic">Awaiting radiological findings...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default XrayView;
