
import React, { useCallback } from 'react';
import { FileData } from '../types';

interface FileUploadProps {
  onFileSelect: (file: FileData) => void;
  disabled?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, disabled }) => {
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      onFileSelect({
        name: file.name,
        size: file.size,
        base64: base64,
        type: file.type
      });
    };
    reader.readAsDataURL(file);
  }, [onFileSelect]);

  return (
    <div className="w-full">
      <label className={`
        flex flex-col items-center justify-center w-full h-64 
        border-2 border-dashed rounded-3xl cursor-pointer
        transition-all duration-300 group
        ${disabled ? 'opacity-50 cursor-not-allowed border-slate-700' : 'border-slate-600 hover:border-blue-500 hover:bg-slate-800/50'}
      `}>
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <svg className="w-12 h-12 mb-4 text-slate-400 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
          </svg>
          <p className="mb-2 text-lg text-slate-200 font-bold">فایل سخنرانی را اینجا رها کنید</p>
          <p className="text-sm text-slate-400">MP3, WAV, M4A (تا ۱ ساعت)</p>
        </div>
        <input 
          type="file" 
          className="hidden" 
          accept="audio/*" 
          onChange={handleFileChange}
          disabled={disabled}
        />
      </label>
    </div>
  );
};
