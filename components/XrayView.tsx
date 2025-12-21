
import React, { useState, useRef, useEffect } from 'react';
import { Patient, XrayData } from '../types';
import { XrayIcon, CheckCircleIcon, ClockIcon, ActivityIcon, DownloadIcon, ScansIcon } from './Icons';
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
  const [selectedParts, setSelectedParts] = useState<string[]>(xray.bodyParts);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [language, setLanguage] = useState<'en' | 'mr'>('en');
  const [filmsToUse, setFilmsToUse] = useState<number>(xray.filmsUsedCount || Math.max(1, selectedParts.length));
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (availableFilms < filmsToUse) {
        alert(`Insufficient films!`);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdateXray({
          ...xray,
          issue,
          bodyParts: selectedParts,
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
      alert(`AI Error: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-8 no-print">
        <button onClick={onBack} className="text-[10px] font-black uppercase text-indigo-600 flex items-center gap-2">← Back</button>
        <div className="flex gap-2">
          <button onClick={() => onUpdateXray({...xray, status: 'reported'})} className="px-6 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase">Complete File</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6 no-print">
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Case Info</h3>
             <p className="text-xl font-black text-slate-900">{patient.name}</p>
             <p className="text-xs font-bold text-slate-500 mt-1">{patient.age} Y • {patient.phone}</p>
             <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[9px] font-black text-indigo-400 uppercase mb-1">Clinical Issue</p>
                <input 
                  className="w-full bg-transparent font-bold text-slate-800 text-sm outline-none" 
                  value={issue} 
                  onChange={(e) => setIssue(e.target.value)}
                  placeholder="Clinical history..."
                />
             </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-950 rounded-[2.5rem] min-h-[400px] flex items-center justify-center relative no-print">
            {xray.imageUrl ? (
              <img src={xray.imageUrl} className="max-h-[500px] p-4 object-contain" />
            ) : (
              <div className="text-center">
                <button onClick={() => fileInputRef.current?.click()} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px]">Upload Scan</button>
              </div>
            )}
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
          </div>

          <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm report-container">
            {/* Metadata for Printing (Header is now blank for letterhead) */}
            <div className="hidden print:block mb-8 border-b-2 border-slate-100 pb-4">
               <div className="grid grid-cols-2 gap-y-2 text-[11pt] font-bold">
                  <p>PATIENT: {patient.name.toUpperCase()}</p>
                  <p className="text-right">DATE: {new Date().toLocaleDateString()}</p>
                  <p>AGE/SEX: {patient.age}Y</p>
                  <p className="text-right">REF: {patient.id.toUpperCase()}</p>
               </div>
               <p className="mt-4 text-[10pt] uppercase tracking-wider">INDICATION: {issue || patient.condition}</p>
            </div>

            <div className="flex justify-between items-center mb-6 no-print">
              <h3 className="text-2xl font-black text-slate-900 uppercase italic">Clinical Findings</h3>
              <div className="flex gap-2">
                <button onClick={() => setLanguage('en')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black ${language === 'en' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>ENG</button>
                <button onClick={() => setLanguage('mr')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black ${language === 'mr' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>MAR</button>
              </div>
            </div>

            {xray.aiReport ? (
              <div>
                <div className="report-text bg-slate-900 text-slate-300 p-8 rounded-3xl text-sm font-mono whitespace-pre-wrap leading-relaxed shadow-inner">
                  {xray.aiReport}
                </div>
                <div className="mt-8 flex justify-end no-print">
                  <button onClick={() => window.print()} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-[11px] flex items-center gap-2">
                    <DownloadIcon /> Print on Letterhead
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 no-print">
                {isAnalyzing ? <p className="animate-pulse font-black text-indigo-600">AI GENERATING REPORT...</p> : 
                <button onClick={handleRunAI} disabled={!xray.imageUrl} className="text-indigo-600 font-black uppercase text-xs tracking-widest disabled:opacity-20">Generate Clinical Report</button>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default XrayView;
