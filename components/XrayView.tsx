
import React, { useState, useRef } from 'react';
import { Patient, XrayData, CLINIC_CONFIG } from '../types';
import { XrayIcon, CheckCircleIcon, ClockIcon, ActivityIcon, DownloadIcon } from './Icons';
import { analyzeXrayImage } from '../services/geminiService';

interface XrayViewProps {
  patient: Patient;
  onUpdateXray: (updatedXray: XrayData) => void;
  onBack: () => void;
}

const RADIOLOGY_REGIONS = [
  { name: "Head/Spine", parts: ["Skull", "Sinuses", "Cervical Spine", "Thoracic Spine", "Lumbar Spine"], bilateral: false },
  { name: "Torso", parts: ["Chest (PA/Lat)", "Abdomen (KUB)", "Pelvis", "Ribs"], bilateral: true },
  { name: "Upper Limb", parts: ["Shoulder", "Humerus", "Elbow", "Forearm", "Wrist", "Hand"], bilateral: true },
  { name: "Lower Limb", parts: ["Hip", "Femur", "Knee", "Leg", "Ankle", "Foot"], bilateral: true }
];

const XrayView: React.FC<XrayViewProps> = ({ patient, onUpdateXray, onBack }) => {
  const xray = patient.xrayData || { issue: '', bodyParts: [], status: 'ordered', orderDate: new Date().toISOString() };
  
  const [issue, setIssue] = useState(xray.issue);
  const [selectedParts, setSelectedParts] = useState<string[]>(xray.bodyParts);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [language, setLanguage] = useState<'en' | 'mr'>('en');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const togglePart = (part: string, side?: 'L' | 'R') => {
    const label = side ? `${part} (${side})` : part;
    setSelectedParts(prev => 
      prev.includes(label) ? prev.filter(p => p !== label) : [...prev, label]
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        onUpdateXray({
          ...xray,
          issue,
          bodyParts: selectedParts,
          imageUrl: base64String,
          status: 'captured'
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
      console.error("X-Ray Analysis failed:", err);
      alert(`AI Analysis failed: ${err.message || 'Check your internet connection or API key configuration.'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSave = () => {
    onUpdateXray({
      ...xray,
      issue,
      bodyParts: selectedParts
    });
  };

  const updateStatus = (status: XrayData['status']) => {
    onUpdateXray({
      ...xray,
      issue,
      bodyParts: selectedParts,
      status
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 animate-in fade-in duration-500 relative">
      {/* Printable Area */}
      <div className="hidden print:block print:absolute print:inset-0 bg-white p-12 font-serif text-black min-h-screen w-full z-50">
        <div className="h-[2in]"></div>
        <div className="grid grid-cols-3 gap-6 mb-4 pb-4 border-b border-slate-400">
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-black mb-0.5">Patient Name</p>
            <p className="text-base font-black uppercase tracking-tight">{patient.name}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-black mb-0.5">Age / Phone</p>
            <p className="text-base font-bold">{patient.age} Yrs / {patient.phone}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-500 uppercase font-black mb-0.5">Examination Date</p>
            <p className="text-base font-bold">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
          </div>
          <div className="col-span-2 mt-1">
            <p className="text-[10px] text-slate-500 uppercase font-black mb-0.5">Clinical Indication</p>
            <p className="text-sm italic font-medium">{issue || patient.condition}</p>
          </div>
          <div className="text-right mt-1">
            <p className="text-[10px] text-slate-500 uppercase font-black mb-0.5">Radiological Series</p>
            <p className="text-sm font-bold">{selectedParts.join(', ') || 'Standard Series'}</p>
          </div>
        </div>

        <div className="mt-6">
          <div className="text-[14px] leading-[1.6] whitespace-pre-wrap text-justify font-serif tracking-normal">
            {xray.aiReport || "Report data pending AI analysis..."}
          </div>
        </div>

        <div className="mt-20 flex justify-end">
          <div className="text-center w-72 pt-4">
             <div className="h-12 flex items-end justify-center mb-1">
                <div className="w-40 border-b border-slate-200"></div>
             </div>
            <p className="text-sm font-black">{CLINIC_CONFIG.clinicianName}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Consultant Radiologist</p>
            <p className="text-[9px] text-slate-400 mt-0.5">{CLINIC_CONFIG.credentials}</p>
          </div>
        </div>
      </div>

      {/* Screen UI */}
      <div className="print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <button onClick={onBack} className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 mb-2">
              ← Back to Dashboard
            </button>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-slate-900">Radiology Order</h1>
              <span className="bg-indigo-100 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">Diagnostic</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-1">
              <p className="text-slate-500 font-medium">{patient.name} • Age {patient.age}</p>
              <span className="hidden sm:inline text-slate-300">|</span>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                Clinician: <span className="text-slate-600">{CLINIC_CONFIG.clinicianName}</span>
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all shadow-sm"
            >
              Save Progress
            </button>
            <button
              onClick={() => updateStatus('reported')}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
            >
              Finalize Order
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-6">Workflow Status</h3>
              <div className="space-y-3">
                {[
                  { id: 'ordered', label: 'Ordered', color: 'orange', icon: <ClockIcon /> },
                  { id: 'captured', label: 'Imaging Captured', color: 'blue', icon: <ActivityIcon /> },
                  { id: 'reported', label: 'Report Generated', color: 'indigo', icon: <CheckCircleIcon /> }
                ].map((step) => (
                  <button
                    key={step.id}
                    onClick={() => updateStatus(step.id as any)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                      xray.status === step.id 
                      ? `border-${step.color}-200 bg-${step.color}-50 text-${step.color}-700` 
                      : 'border-slate-50 bg-white text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {step.icon}
                      <span className="font-bold">{step.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-black">!</span>
                Clinical Indication
              </h3>
              <textarea
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                rows={3}
                value={issue}
                onChange={(e) => setIssue(e.target.value)}
              />
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <XrayIcon />
                Radiology Grid
              </h3>
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {RADIOLOGY_REGIONS.map(region => (
                  <div key={region.name}>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{region.name}</p>
                    <div className="flex flex-wrap gap-2">
                      {region.parts.map(part => (
                        <div key={part} className="flex gap-1">
                          {region.bilateral ? (
                            <>
                              <button
                                onClick={() => togglePart(part, 'L')}
                                className={`px-2 py-1.5 rounded-lg border text-[10px] font-bold uppercase transition-all ${selectedParts.includes(`${part} (L)`) ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm' : 'border-slate-100 bg-slate-50 text-slate-500'}`}
                              >
                                {part} (L)
                              </button>
                              <button
                                onClick={() => togglePart(part, 'R')}
                                className={`px-2 py-1.5 rounded-lg border text-[10px] font-bold uppercase transition-all ${selectedParts.includes(`${part} (R)`) ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm' : 'border-slate-100 bg-slate-50 text-slate-500'}`}
                              >
                                {part} (R)
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => togglePart(part)}
                              className={`px-2 py-1.5 rounded-lg border text-[10px] font-bold uppercase transition-all ${selectedParts.includes(part) ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm' : 'border-slate-100 bg-slate-50 text-slate-500'}`}
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
            <div className="bg-slate-900 rounded-3xl overflow-hidden shadow-2xl relative min-h-[400px] flex items-center justify-center">
              {xray.imageUrl ? (
                <div className="relative group w-full h-full">
                  <img src={xray.imageUrl} alt="X-ray view" className="w-full h-full object-contain max-h-[600px]" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                    <button onClick={() => fileInputRef.current?.click()} className="bg-white/20 backdrop-blur-md text-white px-6 py-2 rounded-full font-bold border border-white/30">
                      Replace Image
                    </button>
                  </div>
                  {isAnalyzing && (
                    <div className="absolute inset-0 bg-indigo-900/60 backdrop-blur-sm flex flex-col items-center justify-center text-white p-6 text-center">
                      <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
                      <h3 className="text-xl font-bold">Processing...</h3>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center p-12">
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-400">
                    <XrayIcon />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Awaiting Imaging</h3>
                  <button onClick={() => fileInputRef.current?.click()} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all">
                    Capture / Upload X-ray
                  </button>
                </div>
              )}
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleFileUpload} />
            </div>

            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-slate-900">Radiological Report</h3>
                  <div className="mt-4 flex bg-slate-100 p-1 rounded-xl w-fit">
                    <button onClick={() => setLanguage('en')} className={`px-4 py-1.5 rounded-lg text-xs font-bold ${language === 'en' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>English</button>
                    <button onClick={() => setLanguage('mr')} className={`px-4 py-1.5 rounded-lg text-xs font-bold ${language === 'mr' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>मराठी</button>
                  </div>
                </div>
                {xray.imageUrl && !isAnalyzing && (
                  <button onClick={handleRunAI} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
                    ✨ Generate Analysis
                  </button>
                )}
              </div>

              {xray.aiReport ? (
                <div className="prose prose-slate max-w-none">
                  <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200 font-mono text-sm whitespace-pre-wrap leading-relaxed">
                    {xray.aiReport}
                  </div>
                  <div className="mt-8 flex justify-end">
                     <button onClick={handlePrint} className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg">
                       <DownloadIcon /> Print on Letterhead
                     </button>
                  </div>
                </div>
              ) : (
                <div className="py-20 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                  <p className="text-slate-400 italic">Imaging captured. Run analysis to create the report.</p>
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
