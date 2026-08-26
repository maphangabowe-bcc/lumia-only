import React, { useState } from 'react';
import { DiaryEntry } from '../types';

interface ShareViewProps {
  entries: DiaryEntry[];
  onImport: (entries: DiaryEntry[]) => void;
  triggerToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  isPremium?: boolean;
  onUpgradeClick?: () => void;
}

const ShareView: React.FC<ShareViewProps> = ({ 
  entries, 
  onImport, 
  triggerToast,
  isPremium = false,
  onUpgradeClick = () => {}
}) => {
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isPremium) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-6 flex flex-col items-center justify-center text-center">
        <div className="bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 border border-indigo-950/20 rounded-[36px] p-8 md:p-12 shadow-2xl relative overflow-hidden w-full max-w-lg">
          {/* Ambient or glowing effect */}
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-44 h-44 bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-44 h-44 bg-violet-600/10 rounded-full blur-3xl animate-pulse" />

          <div className="w-20 h-20 bg-indigo-500/10 border border-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400 text-3xl mb-6 shadow-lg shadow-indigo-950/50 mx-auto">
            <i className="fa-solid fa-lock text-2xl"></i>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-4">
            <i className="fa-solid fa-crown text-amber-300"></i> Lumina Premium Feature
          </div>

          <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mb-3">
            Share Your Journey
          </h2>
          <p className="text-indigo-200/70 text-sm md:text-base leading-relaxed mb-8 max-w-md mx-auto">
            Generate secure secret codes to back up your journal, sync between devices, or share your deeply personal memories and stories with loved ones.
          </p>

          <button
            onClick={onUpgradeClick}
            className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-extrabold py-4 px-8 rounded-2xl transition-all shadow-lg shadow-indigo-900/30 flex items-center justify-center gap-2 text-sm md:text-base hover:brightness-110 active:scale-[0.98]"
          >
            <i className="fa-solid fa-crown text-amber-300"></i>
            Unlock Premium Access
          </button>

          <p className="text-[10px] text-indigo-300/40 mt-5 uppercase tracking-widest font-black">
            One-time purchase • Lifetime support
          </p>
        </div>
      </div>
    );
  }

  const handleGenerateCode = async () => {
    setIsSharing(true);
    setError(null);
    try {
      const response = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries }),
      });
      const data = await response.json();
      if (data.code) {
        setShareCode(data.code);
      } else {
        setError('Failed to generate code');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setIsSharing(false);
    }
  };

  const handleFetchShared = async () => {
    if (!inputCode.trim()) return;
    setIsFetching(true);
    setError(null);
    try {
      const response = await fetch(`/api/share/${inputCode}`);
      if (!response.ok) {
        throw new Error('Invalid code or diary not found');
      }
      const data = await response.json();
      if (data.entries) {
        onImport(data.entries);
        if (triggerToast) {
          triggerToast('Shared diary imported successfully!', 'success');
        } else {
          alert('Shared diary imported successfully!');
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-12 py-10 px-6">
      <section className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
            <i className="fa-solid fa-share-nodes"></i>
          </div>
          Share Your Diary
        </h2>
        <p className="text-slate-500 mb-6 leading-relaxed">
          Generate a secret code to share your current diary entries with someone else. 
          They can use this code to view your journey on their own device.
        </p>
        
        {shareCode ? (
          <div className="bg-indigo-50 p-8 rounded-3xl border border-indigo-100 text-center space-y-6">
            <div>
              <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-2">Your Secret Code</p>
              <p className="text-4xl sm:text-5xl font-mono font-black text-indigo-700 tracking-wider select-all">{shareCode}</p>
              <p className="text-xs text-slate-500 mt-2">Share this code with someone so they can read your shared reflections.</p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(shareCode);
                  if (triggerToast) {
                    triggerToast('Code copied to clipboard!', 'success');
                  }
                }}
                className="bg-white text-indigo-600 font-bold py-2.5 px-5 rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-2 text-xs border border-indigo-100 active:scale-95 cursor-pointer"
              >
                <i className="fa-solid fa-copy"></i>
                Copy Code
              </button>

              <button
                onClick={() => {
                  const shareMsg = `Here is my Lumina Diary secret code: ${shareCode}. You can import it on Lumina Diary to read my journey!`;
                  const url = `https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(shareMsg)}`;
                  window.open(url, '_blank', 'noopener,noreferrer,width=600,height=500');
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-sm transition-all flex items-center gap-2 text-xs active:scale-95 cursor-pointer"
              >
                <i className="fa-brands fa-facebook"></i>
                Facebook
              </button>

              <button
                onClick={() => {
                  const subject = encodeURIComponent("My Lumina Diary Shared Reflections");
                  const body = encodeURIComponent(`Here is my Lumina Diary secret code: ${shareCode}\n\nEnter this code in Lumina Diary under Share Diary -> View a Shared Diary to read my journey.`);
                  window.location.href = `mailto:?subject=${subject}&body=${body}`;
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-sm transition-all flex items-center gap-2 text-xs active:scale-95 cursor-pointer"
              >
                <i className="fa-solid fa-envelope"></i>
                Email
              </button>

              <button
                onClick={() => {
                  const text = encodeURIComponent(`Here is my Lumina Diary secret code: ${shareCode}\n\nEnter this code in Lumina Diary to read my journey!`);
                  window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank', 'noopener,noreferrer');
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-sm transition-all flex items-center gap-2 text-xs active:scale-95 cursor-pointer"
              >
                <i className="fa-brands fa-whatsapp"></i>
                WhatsApp
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={handleGenerateCode}
            disabled={isSharing || entries.length === 0}
            className="w-full bg-indigo-600 text-white font-bold py-5 px-8 rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {isSharing ? <i className="fa-solid fa-spinner fa-spin mr-2"></i> : <i className="fa-solid fa-bolt mr-2"></i>}
            Generate Secret Code
          </button>
        )}
        {entries.length === 0 && <p className="text-xs text-rose-500 mt-3 font-medium text-center">You need at least one entry to share your diary.</p>}
      </section>

      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-100"></div>
        </div>
        <span className="relative px-4 bg-slate-50 text-slate-400 text-xs font-bold uppercase tracking-widest">or</span>
      </div>

      <section className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
        <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
            <i className="fa-solid fa-key"></i>
          </div>
          View a Shared Diary
        </h2>
        <p className="text-slate-500 mb-6 leading-relaxed">
          Enter a secret code shared with you to view another person's diary. 
          This will add their entries to your current collection.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <input 
            type="text" 
            placeholder="Enter 10-digit code..." 
            className="flex-1 px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-lg font-mono focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-300"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value)}
          />
          <button
            onClick={handleFetchShared}
            disabled={isFetching || !inputCode.trim()}
            className="bg-slate-900 text-white font-bold py-4 px-10 rounded-2xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 disabled:opacity-50 active:scale-[0.98]"
          >
            {isFetching ? <i className="fa-solid fa-spinner fa-spin mr-2"></i> : <i className="fa-solid fa-eye mr-2"></i>}
            View Diary
          </button>
        </div>
        {error && <p className="text-sm text-rose-500 mt-4 font-bold flex items-center gap-2">
          <i className="fa-solid fa-circle-exclamation"></i>
          {error}
        </p>}
      </section>
    </div>
  );
};

export default ShareView;
