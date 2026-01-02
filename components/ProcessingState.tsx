
import React from 'react';
import { ProcessingStep } from '../types';

interface ProcessingStateProps {
  step: ProcessingStep;
}

export const ProcessingState: React.FC<ProcessingStateProps> = ({ step }) => {
  const steps: { key: ProcessingStep; label: string; icon: string; detail: string }[] = [
    { key: 'uploading', label: 'در حال بارگذاری...', icon: '📤', detail: 'ارسال امن فایل به استودیو هوشمند' },
    { key: 'cleaning', label: 'آنالیز طیفی و نویز زدایی...', icon: '🪄', detail: 'تمرکز بر پروفایل صوتی بخش‌های میانی سخنرانی' },
    { key: 'analyzing', label: 'استخراج مفاهیم از زبان سخنران...', icon: '🧠', detail: 'بازنویسی محتوا با حفظ لحن و سیر بحث' },
    { key: 'completed', label: 'آماده‌سازی نهایی...', icon: '✅', detail: 'تولید پادکست و خلاصه‌های مدیریتی' },
  ];

  const currentIndex = steps.findIndex(s => s.key === step);

  if (step === 'idle' || step === 'error') return null;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8 p-10 glass-panel rounded-[2.5rem] animate-in fade-in zoom-in duration-500 border-blue-500/10 shadow-2xl">
      <div className="flex justify-between relative px-4">
        <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-700 -translate-y-1/2 -z-10"></div>
        <div 
          className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-500 -translate-y-1/2 transition-all duration-1000 -z-10"
          style={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
        ></div>
        
        {steps.map((s, idx) => (
          <div key={s.key} className="flex flex-col items-center gap-2">
            <div className={`
              w-12 h-12 rounded-2xl flex items-center justify-center text-xl
              transition-all duration-700
              ${idx <= currentIndex ? 'bg-blue-600 scale-110 shadow-xl shadow-blue-900/50 text-white' : 'bg-slate-800 text-slate-500'}
            `}>
              {idx < currentIndex ? '✓' : s.icon}
            </div>
          </div>
        ))}
      </div>
      
      <div className="text-center space-y-4">
        <h3 className="text-3xl font-black text-white">{steps[currentIndex]?.label}</h3>
        <p className="text-slate-400 text-lg">{steps[currentIndex]?.detail}</p>
        
        <div className="mt-8 h-3 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700">
          <div className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-400 shimmer"></div>
        </div>
      </div>
    </div>
  );
};
