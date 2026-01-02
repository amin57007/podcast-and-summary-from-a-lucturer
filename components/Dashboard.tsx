
import React, { useState, useRef } from 'react';
import { AnalysisResult, FileData } from '../types';
import { base64ToUint8Array, parseTimeToSeconds, audioBufferToMp3Blob } from '../services/geminiService';

interface DashboardProps {
  result: AnalysisResult;
  originalFile: FileData | null;
}

export const Dashboard: React.FC<DashboardProps> = ({ result, originalFile }) => {
  const [isProcessingPodcast, setIsProcessingPodcast] = useState(false);
  const [isProcessingEnhanced, setIsProcessingEnhanced] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [podcastUrl, setPodcastUrl] = useState<string | null>(null);
  const pdfContentRef = useRef<HTMLDivElement>(null);

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const processEnhancedAudio = async (buffer: AudioBuffer): Promise<AudioBuffer> => {
    const offlineCtx = new OfflineAudioContext(
      buffer.numberOfChannels,
      buffer.length,
      buffer.sampleRate
    );

    const source = offlineCtx.createBufferSource();
    source.buffer = buffer;

    // High-pass filter to remove low-frequency rumble
    const hpFilter = offlineCtx.createBiquadFilter();
    hpFilter.type = 'highpass';
    hpFilter.frequency.value = 120;

    // Dynamics Compressor for that "broadcast" radio sound
    const compressor = offlineCtx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-24, offlineCtx.currentTime);
    compressor.knee.setValueAtTime(40, offlineCtx.currentTime);
    compressor.ratio.setValueAtTime(12, offlineCtx.currentTime);
    compressor.attack.setValueAtTime(0, offlineCtx.currentTime);
    compressor.release.setValueAtTime(0.25, offlineCtx.currentTime);

    // Final Gain Node for normalization
    const gainNode = offlineCtx.createGain();
    
    // Simple Peak estimation for gain setting
    let maxPeak = 0;
    for (let c = 0; c < buffer.numberOfChannels; c++) {
      const data = buffer.getChannelData(c);
      for (let i = 0; i < data.length; i++) {
        const abs = Math.abs(data[i]);
        if (abs > maxPeak) maxPeak = abs;
      }
    }
    gainNode.gain.value = maxPeak > 0 ? 0.95 / maxPeak : 1.0;

    source.connect(hpFilter);
    hpFilter.connect(compressor);
    compressor.connect(gainNode);
    gainNode.connect(offlineCtx.destination);

    source.start(0);
    return await offlineCtx.startRendering();
  };

  const handleDownloadEnhanced = async () => {
    if (!originalFile) return;
    setIsProcessingEnhanced(true);
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const bytes = base64ToUint8Array(originalFile.base64);
      const audioBuffer = await audioCtx.decodeAudioData(bytes.buffer);
      
      const enhancedBuffer = await processEnhancedAudio(audioBuffer);
      const mp3Blob = audioBufferToMp3Blob(enhancedBuffer, 128);
      downloadBlob(mp3Blob, `Enhanced_Lecture_128k.mp3`);
    } catch (err) {
      console.error(err);
      alert("خطا در بهینه‌سازی فایل صوتی.");
    } finally {
      setIsProcessingEnhanced(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!pdfContentRef.current) return;
    setIsGeneratingPdf(true);

    const element = pdfContentRef.current;
    const opt = {
      margin: [10, 12, 10, 12], 
      filename: `LecTune_Summary.pdf`,
      image: { type: 'jpeg', quality: 1.0 },
      html2canvas: { 
        scale: 4, 
        useCORS: true, 
        letterRendering: true,
        scrollX: 0,
        scrollY: 0,
        backgroundColor: '#ffffff'
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: 'avoid-all' }
    };

    try {
      // @ts-ignore
      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('PDF Generation Error:', error);
      alert('خطا در تولید فایل PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const renderPodcastBuffer = async (originalBuffer: AudioBuffer): Promise<AudioBuffer> => {
    const segments = result.podcastSegments.map(seg => ({
      start: parseTimeToSeconds(seg.startTime),
      end: parseTimeToSeconds(seg.endTime)
    }));

    const totalSamples = segments.reduce((acc, seg) => {
      const duration = Math.max(0, seg.end - seg.start);
      return acc + Math.floor(duration * originalBuffer.sampleRate);
    }, 0);

    const offlineCtx = new OfflineAudioContext(
      originalBuffer.numberOfChannels,
      totalSamples,
      originalBuffer.sampleRate
    );

    let currentOffset = 0;
    for (const seg of segments) {
      const startSample = Math.floor(seg.start * originalBuffer.sampleRate);
      const endSample = Math.floor(seg.end * originalBuffer.sampleRate);
      const segmentDuration = (endSample - startSample) / originalBuffer.sampleRate;
      
      if (segmentDuration <= 0) continue;

      const source = offlineCtx.createBufferSource();
      source.buffer = originalBuffer;

      // Add slight crossfade or cleaning to highlights
      const compressor = offlineCtx.createDynamicsCompressor();
      source.connect(compressor);
      compressor.connect(offlineCtx.destination);
      
      source.start(currentOffset, seg.start, segmentDuration);
      currentOffset += segmentDuration;
    }

    return await offlineCtx.startRendering();
  };

  const handlePodcastAction = async (downloadOnly: boolean = false) => {
    if (!originalFile) return;
    setIsProcessingPodcast(true);
    
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const bytes = base64ToUint8Array(originalFile.base64);
      const audioBuffer = await audioCtx.decodeAudioData(bytes.buffer);
      
      const podcastBuffer = await renderPodcastBuffer(audioBuffer);
      const mp3Blob = audioBufferToMp3Blob(podcastBuffer, 128);

      if (downloadOnly) {
        downloadBlob(mp3Blob, `Podcast_Highlights_128k.mp3`);
      } else {
        const url = URL.createObjectURL(mp3Blob);
        if (podcastUrl) URL.revokeObjectURL(podcastUrl);
        setPodcastUrl(url);
        const audio = new Audio(url);
        audio.play();
      }
      
    } catch (err) {
      console.error(err);
      alert("خطا در پردازش پادکست.");
    } finally {
      setIsProcessingPodcast(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
      
      {/* 
          Refined Single-Page PDF Template 
      */}
      <div className="hidden">
        <div ref={pdfContentRef} className="p-12 bg-white text-slate-900" style={{ width: '210mm', minHeight: '297mm', direction: 'rtl', textAlign: 'right' }}>
          <div className="border-b-[3px] border-blue-600 pb-3 mb-6" style={{ direction: 'rtl' }}>
            <h1 className="text-[20pt] font-black text-slate-800" style={{ direction: 'rtl' }}>گزیده نکات سخنرانی</h1>
          </div>
          
          <div className="space-y-3" style={{ direction: 'rtl' }}>
            {result.fullSummary.split('\n').map((line, i) => {
              const trimmed = line.trim();
              if (trimmed.startsWith('*')) {
                // Aggressively remove all asterisks for a clean title
                const cleanTitle = trimmed.replace(/\*/g, '').trim();
                return (
                  <div key={i} className="mt-4 mb-1" style={{ direction: 'rtl' }}>
                    <h3 className="text-[12pt] font-black text-blue-900 bg-blue-50/50 px-2 py-1.5 rounded-lg border-r-[4px] border-blue-600" style={{ direction: 'rtl', textAlign: 'right' }}>
                      {cleanTitle}
                    </h3>
                  </div>
                );
              }
              if (trimmed.length > 0) {
                return (
                  <p key={i} className="text-[10pt] text-slate-700 leading-[1.6] mb-2 pr-1" style={{ direction: 'rtl', textAlign: 'right', unicodeBidi: 'embed' }}>
                    {trimmed}
                  </p>
                );
              }
              return null;
            })}
          </div>
        </div>
      </div>

      {/* Main Dashboard UI */}
      <div className="lg:col-span-2 space-y-6">
        <div className="glass-panel p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
          <div className="flex justify-between items-center mb-10 border-b border-slate-700/50 pb-6">
            <h2 className="text-3xl font-extrabold text-white">گزارش محتوا</h2>
            <div className="flex gap-3">
               <button 
                onClick={handleDownloadEnhanced}
                disabled={isProcessingEnhanced}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-xl text-xs font-bold transition-all border border-blue-500/20 flex items-center gap-2"
                title="دانلود فایل صوتی کامل با نویززدایی و تقویت کیفیت"
              >
                {isProcessingEnhanced ? 'درحال پردازش...' : '📥 دانلود صوت نویززدایی شده (MP3)'}
              </button>
              <button 
                onClick={handleDownloadPDF}
                disabled={isGeneratingPdf}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-all shadow-xl shadow-indigo-900/30"
              >
                {isGeneratingPdf ? 'درحال تولید...' : 'دریافت PDF نهایی'}
              </button>
            </div>
          </div>

          <div className="space-y-6 text-slate-300">
            {result.fullSummary.split('\n').map((line, i) => {
              const trimmed = line.trim();
              if (trimmed.startsWith('*')) {
                // Aggressively remove all asterisks for a clean title
                const cleanTitle = trimmed.replace(/\*/g, '').trim();
                return (
                  <h3 key={i} className="text-2xl font-black text-blue-100 flex items-center gap-3 mt-10 bg-slate-800/20 p-3 rounded-xl border-r-4 border-blue-500">
                    {cleanTitle}
                  </h3>
                );
              }
              if (trimmed.length > 0) {
                return <p key={i} className="leading-relaxed text-justify text-xl px-1 opacity-90">{trimmed}</p>;
              }
              return null;
            })}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="glass-panel p-8 rounded-[2rem] border-blue-500/20 bg-blue-950/10">
          <div className="flex items-center gap-3 mb-8">
            <span className="text-3xl">🎙️</span>
            <h3 className="text-2xl font-bold">پادکست برگزیده</h3>
          </div>

          <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
            {result.podcastSegments.map((seg, i) => (
              <div key={i} className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/50">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[11px] font-mono text-blue-400 bg-blue-400/10 px-3 py-1 rounded-full">
                    {seg.startTime} — {seg.endTime}
                  </span>
                </div>
                <h4 className="font-bold text-white mb-1">{seg.title}</h4>
                <p className="text-[11px] text-slate-500">{seg.description}</p>
              </div>
            ))}
          </div>

          <div className="space-y-3 mt-8">
            <button 
              onClick={() => handlePodcastAction(false)}
              disabled={isProcessingPodcast}
              className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-[1.5rem] font-black text-lg shadow-2xl shadow-blue-900/50 flex items-center justify-center gap-3 transition-all active:scale-95"
            >
              {isProcessingPodcast ? 'درحال آماده‌سازی...' : '▶ پخش پادکست'}
            </button>
            <button 
              onClick={() => handlePodcastAction(true)}
              disabled={isProcessingPodcast}
              className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-[1.5rem] font-bold text-sm border border-slate-700 flex items-center justify-center gap-2 transition-all"
            >
              {isProcessingPodcast ? 'درحال آماده‌سازی...' : '📥 دانلود MP3 برگزیده (128k)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
