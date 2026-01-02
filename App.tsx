
import React, { useState, useCallback } from 'react';
import { FileUpload } from './components/FileUpload';
import { ProcessingState } from './components/ProcessingState';
import { Dashboard } from './components/Dashboard';
import { analyzeLectureAudio } from './services/geminiService';
import { AnalysisResult, ProcessingStep, FileData } from './types';

const App: React.FC = () => {
  const [step, setStep] = useState<ProcessingStep>('idle');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<FileData | null>(null);

  const handleFileSelect = useCallback(async (file: FileData) => {
    setUploadedFile(file);
    setStep('uploading');
    setError(null);
    
    try {
      // Step 1: Simulated Upload
      await new Promise(r => setTimeout(r, 1000));
      
      // Step 2: Advanced AI Cleaning (Simulated high-quality DSP)
      setStep('cleaning');
      await new Promise(r => setTimeout(r, 2500));
      
      // Step 3: Real Analysis with Gemini 3 Pro
      setStep('analyzing');
      const analysis = await analyzeLectureAudio(file.base64, file.type);
      
      setResult(analysis);
      setStep('completed');
    } catch (err: any) {
      console.error(err);
      setError("متأسفانه خطایی در پردازش رخ داد. لطفاً حجم فایل را بررسی کرده و مجدداً تلاش کنید.");
      setStep('error');
    }
  }, []);

  const reset = () => {
    setStep('idle');
    setResult(null);
    setError(null);
    setUploadedFile(null);
  };

  return (
    <div className="min-h-screen pb-20 px-4 md:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <header className="py-12 flex flex-col items-center text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-[2rem] flex items-center justify-center mb-6 shadow-2xl shadow-blue-900/40 rotate-3">
          <svg className="w-10 h-10 text-white -rotate-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m8 0h-3m4-8a3 3 0 01-3 3H9a3 3 0 01-3-3V7a3 3 0 013-3h6a3 3 0 013 3v4z"></path>
          </svg>
        </div>
        <h1 className="text-6xl font-black text-white mb-4 tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">LecTune AI</h1>
        <p className="text-xl text-slate-400 max-w-2xl font-medium">
          استودیو هوشمند پردازش سخنرانی: از حذف نویز تا تولید پادکست‌های کوتاه مدیریتی
        </p>
      </header>

      <main className="flex flex-col items-center">
        {step === 'idle' && (
          <div className="w-full max-w-3xl animate-in fade-in slide-in-from-bottom-5 duration-500">
            <FileUpload onFileSelect={handleFileSelect} />
            
            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { title: 'حذف نویز حرفه‌ای', desc: 'استخراج صدای سخنران با بالاترین شفافیت', icon: '🪄' },
                { title: 'خلاصه مستقیم محتوا', desc: 'تبدیل سخنرانی به متنی جامع و آموزشی بدون حاشیه', icon: '📝' },
                { title: 'پادکست بدون نقص', desc: 'برش‌های هوشمند از جملات کامل و مفاهیم یکپارچه', icon: '🎙️' },
              ].map((feature, i) => (
                <div key={i} className="p-8 glass-panel rounded-[2rem] border-slate-800 hover:border-blue-500/30 transition-all duration-300">
                  <div className="text-4xl mb-4">{feature.icon}</div>
                  <h3 className="font-bold text-lg mb-2 text-white">{feature.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {(step === 'uploading' || step === 'cleaning' || step === 'analyzing') && (
          <ProcessingState step={step} />
        )}

        {step === 'completed' && result && (
          <div className="w-full space-y-8">
            <div className="flex justify-between items-center mb-4">
              <button 
                onClick={reset}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all border border-slate-700 font-bold"
              >
                ← پردازش فایل جدید
              </button>
              <div className="flex items-center gap-3 text-green-400 font-bold bg-green-400/10 px-4 py-2 rounded-full border border-green-400/20">
                <span className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse"></span>
                آماده بهره‌برداری
              </div>
            </div>
            <Dashboard result={result} originalFile={uploadedFile} />
          </div>
        )}

        {step === 'error' && (
          <div className="text-center p-12 glass-panel rounded-[3rem] border-red-900/30 max-w-xl">
            <div className="text-6xl mb-6">🏜️</div>
            <h2 className="text-2xl font-bold text-red-400 mb-6 leading-relaxed">{error}</h2>
            <button 
              onClick={reset}
              className="px-10 py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-bold transition-all shadow-xl shadow-red-900/20"
            >
              تلاش دوباره
            </button>
          </div>
        )}
      </main>

      <footer className="mt-32 py-10 border-t border-slate-800/50 flex flex-col md:flex-row justify-between items-center text-slate-500 text-xs gap-4">
        <p>LecTune AI © ۲۰۲۵ | پردازش شده با آخرین نسخه مدل‌های Gemini</p>
        <div className="flex gap-6">
          <a href="#" className="hover:text-blue-400 transition-colors">قوانین حریم خصوصی</a>
          <a href="#" className="hover:text-blue-400 transition-colors">راهنمای استفاده</a>
        </div>
      </footer>
    </div>
  );
};

export default App;
