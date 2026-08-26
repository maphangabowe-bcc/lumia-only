import React from 'react';
import { DiaryEntry, Mood } from '../types';

interface SharedEntryViewProps {
  entry: DiaryEntry;
  onClose: () => void;
  onImport: () => void;
}

const moodEmoji: Record<Mood, string> = {
  happy: '😊',
  neutral: '😐',
  sad: '😢',
  excited: '🤩',
  anxious: '😰',
  tired: '😴',
  peaceful: '🧘'
};

const SharedEntryView: React.FC<SharedEntryViewProps> = ({ entry, onClose, onImport }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
        <div className="p-8 md:p-12 overflow-y-auto flex-1 custom-scrollbar">
          <div className="flex justify-between items-start mb-8">
            <div className="flex items-center gap-4">
              <span className="text-5xl">{moodEmoji[entry.mood]}</span>
              <div>
                <h2 className="text-3xl font-bold text-slate-800 leading-tight">{entry.title}</h2>
                <time className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                  {new Date(entry.date).toLocaleDateString(undefined, { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </time>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
            >
              <i className="fa-solid fa-xmark text-xl"></i>
            </button>
          </div>

          {entry.image && (
            <div className="mb-6 overflow-hidden rounded-2xl max-h-72 bg-slate-50 border border-slate-100 flex justify-center items-center">
              <img src={entry.image} alt={entry.title || "Attached image"} className="object-cover w-full h-full max-h-72 select-none" referrerPolicy="no-referrer" />
            </div>
          )}

          <div className="prose prose-slate max-w-none mb-10">
            <p className="text-xl text-slate-600 font-serif leading-relaxed italic whitespace-pre-wrap">
              "{entry.content}"
            </p>
          </div>

          <div className="flex flex-wrap gap-2 mb-10">
            {entry.tags.map(tag => (
              <span key={tag} className="px-4 py-1.5 bg-slate-50 text-slate-500 rounded-full text-sm font-bold border border-slate-100">
                #{tag}
              </span>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-slate-100">
            <button 
              onClick={onImport}
              className="flex-1 bg-indigo-600 text-white font-bold py-4 px-8 rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-plus-circle"></i>
              Add to My Diary
            </button>
            <button 
              onClick={onClose}
              className="flex-1 bg-slate-100 text-slate-600 font-bold py-4 px-8 rounded-2xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
            >
              Close
            </button>
          </div>
        </div>
        <div className="bg-slate-50 p-6 text-center">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
                <i className="fa-solid fa-sparkles text-indigo-400"></i>
                Shared via Lumina Diary
            </p>
        </div>
      </div>
    </div>
  );
};

export default SharedEntryView;
