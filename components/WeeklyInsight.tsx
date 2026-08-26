
import React, { useState, useEffect } from 'react';
import { DiaryEntry } from '../types';
import { generateWeeklyReflections } from '../services/geminiService';

interface WeeklyInsightProps {
  entries: DiaryEntry[];
  isPremium: boolean;
  onUpgradeClick?: () => void;
}

const WeeklyInsight: React.FC<WeeklyInsightProps> = ({ entries, isPremium, onUpgradeClick }) => {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getRecentWeekEntries = () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return entries.filter(e => new Date(e.date) >= oneWeekAgo);
  };

  const handleGenerate = async () => {
    if (!isPremium) {
      if (onUpgradeClick) onUpgradeClick();
      return;
    }
    const weekEntries = getRecentWeekEntries();
    if (weekEntries.length === 0) return;

    setLoading(true);
    try {
      const result = await generateWeeklyReflections(weekEntries);
      setInsight(result);
    } catch (e) {
      console.error(e);
      setInsight("I couldn't generate insights right now, but your consistency is amazing!");
    } finally {
      setLoading(false);
    }
  };

  const weekEntries = getRecentWeekEntries();

  if (weekEntries.length < 2) return null;

  return (
    <div className={`rounded-3xl p-8 text-white shadow-xl overflow-hidden relative ${isPremium ? 'bg-gradient-to-br from-indigo-600 to-violet-700' : 'bg-slate-900'} shadow-indigo-100`}>
      <div className="absolute top-0 right-0 p-8 opacity-10">
        <i className="fa-solid fa-sparkles text-8xl"></i>
      </div>
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${isPremium ? 'bg-white/20' : 'bg-amber-500/20'} rounded-xl flex items-center justify-center backdrop-blur-md`}>
              <i className={`fa-solid ${isPremium ? 'fa-star' : 'fa-crown text-amber-400'}`}></i>
            </div>
            <h2 className="text-xl font-bold">Weekly Reflection</h2>
          </div>
          {!isPremium && (
            <span className="px-2 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 font-black text-[9px] uppercase tracking-wider">
              Premium Feature
            </span>
          )}
        </div>

        {!insight && !loading && (
          <div>
            <p className={`${isPremium ? 'text-indigo-100' : 'text-slate-400'} mb-6 max-w-lg`}>
              {isPremium 
                ? `You've written ${weekEntries.length} entries this week. Want to see what your journey reveals about your progress?`
                : "Deep emotional patterns and growth trajectories are locked. Upgrade to Premium to analyze your weekly reflections with AI."
              }
            </p>
            <button 
              onClick={handleGenerate}
              className={`${isPremium ? 'bg-white text-indigo-700' : 'bg-amber-500 text-white'} font-bold py-3.5 px-7 rounded-2xl hover:opacity-90 transition-all flex items-center gap-2 shadow-lg active:scale-95`}
            >
              <i className={`fa-solid ${isPremium ? 'fa-wand-magic-sparkles' : 'fa-crown text-xs'}`}></i>
              {isPremium ? 'Analyze My Week' : 'Unlock Weekly Insights'}
            </button>
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-4 py-4">
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            <p className="text-indigo-100 font-medium">Lumina is reflecting on your journey...</p>
          </div>
        )}

        {insight && (
          <div className="animate-in fade-in zoom-in duration-500">
            <div className="prose prose-invert max-w-none text-indigo-50 font-serif leading-relaxed italic mb-6">
              {insight.split('\n').map((para, i) => <p key={i} className="mb-4">{para}</p>)}
            </div>
            <button 
              onClick={() => setInsight(null)}
              className="text-xs text-indigo-200 hover:text-white underline font-bold"
            >
              Clear reflection
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WeeklyInsight;
