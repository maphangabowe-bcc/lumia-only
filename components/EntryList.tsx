
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DiaryEntry, Mood } from '../types';

interface EntryListProps {
  entries: DiaryEntry[];
  onEdit: (entry: DiaryEntry) => void;
  onDelete: (id: string) => void;
  triggerToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  isPremium?: boolean;
  onUpgradeClick?: () => void;
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

const moodLabels: Record<Mood, string> = {
  happy: 'Happy',
  neutral: 'Neutral',
  sad: 'Sad',
  excited: 'Excited',
  anxious: 'Anxious',
  tired: 'Tired',
  peaceful: 'Peaceful'
};

const EntryList: React.FC<EntryListProps> = ({ 
  entries, 
  onEdit, 
  onDelete, 
  triggerToast,
  isPremium = false,
  onUpgradeClick = () => {}
}) => {
  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMood, setSelectedMood] = useState<Mood | 'all'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const listRef = useRef<HTMLDivElement>(null);

  // Filter and sort entries
  const filteredAndSortedEntries = useMemo(() => {
    let result = [...entries];

    if (selectedMood !== 'all') {
      result = result.filter(e => e.mood === selectedMood);
    }

    result.sort((a, b) => {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      return sortBy === 'newest' ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [entries, selectedMood, sortBy]);

  // Mood counts calculation for badges
  const moodCounts = useMemo(() => {
    const counts: Record<string, number> = { all: entries.length };
    entries.forEach(e => {
      counts[e.mood] = (counts[e.mood] || 0) + 1;
    });
    return counts;
  }, [entries]);

  const totalPages = Math.ceil(filteredAndSortedEntries.length / ITEMS_PER_PAGE);

  // Reset pagination when mood filter or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedMood, sortBy]);

  // Smooth scroll to top on page change
  useEffect(() => {
    if (listRef.current) {
      const scrollParent = listRef.current.closest('.overflow-y-auto');
      if (scrollParent) {
        scrollParent.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [currentPage]);

  // Smart Page Adjustment when filtered length changes
  useEffect(() => {
    const totalP = Math.ceil(filteredAndSortedEntries.length / ITEMS_PER_PAGE);
    if (currentPage > totalP && totalP > 0) {
      setCurrentPage(totalP);
    } else if (currentPage < 1) {
      setCurrentPage(1);
    }
  }, [filteredAndSortedEntries.length]);

  const handleShare = async (entry: DiaryEntry) => {
    if (!isPremium) {
      onUpgradeClick();
      if (triggerToast) {
        triggerToast('Individual sharing is a Premium Feature. Upgrade to unlock!', 'info');
      }
      return;
    }
    try {
      const response = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry }),
      });
      const data = await response.json();
      
      if (!data.code) throw new Error('Failed to generate share code');

      const shareUrl = `${window.location.origin}/?view=${data.code}`;
      
      const shareData = {
        title: entry.title,
        text: `Read my diary entry: "${entry.title}"\n\nMood: ${entry.mood}\n\nShared from Lumina Diary`,
        url: shareUrl,
      };

      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        if (triggerToast) {
          triggerToast('Share link copied to clipboard!', 'success');
        } else {
          alert('Share link copied to clipboard!');
        }
      }
    } catch (err) {
      console.error('Share failed:', err);
      if (triggerToast) {
        triggerToast('Could not generate share link. Using text-only share.', 'info');
      } else {
        alert('Could not generate share link. Using text-only share.');
      }
      
      const textOnly = `${entry.title}\n\n${entry.content}\n\nShared from Lumina Diary`;
      await navigator.clipboard.writeText(textOnly);
      if (triggerToast) {
        triggerToast('Text copied to clipboard!', 'success');
      } else {
        alert('Text copied to clipboard!');
      }
    }
  };

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-32 h-32 bg-slate-100 rounded-full flex items-center justify-center mb-6">
          <i className="fa-solid fa-feather text-4xl text-slate-300"></i>
        </div>
        <h3 className="text-xl font-bold text-slate-800">No memories yet</h3>
        <p className="text-slate-500 max-w-xs mt-2">Write your first entry to start your journey of self-reflection.</p>
      </div>
    );
  }

  // Slice displayed entries based on pagination
  const displayedEntries = filteredAndSortedEntries.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div ref={listRef} className="space-y-6">
      {/* Interactive Filter & Sort Toolbar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Mood Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <button
              onClick={() => setSelectedMood('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                selectedMood === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>All Moods</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${selectedMood === 'all' ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                {moodCounts.all || 0}
              </span>
            </button>

            {(Object.keys(moodEmoji) as Mood[]).map(mood => {
              const count = moodCounts[mood] || 0;
              if (count === 0 && selectedMood !== mood) return null;
              return (
                <button
                  key={mood}
                  onClick={() => setSelectedMood(mood)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    selectedMood === mood
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                  title={`Filter by ${moodLabels[mood]}`}
                >
                  <span>{moodEmoji[mood]}</span>
                  <span className="hidden sm:inline">{moodLabels[mood]}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${selectedMood === mood ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center justify-end gap-2 shrink-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sort:</span>
            <div className="flex bg-slate-50 p-0.5 rounded-xl border border-slate-100">
              <button
                onClick={() => setSortBy('newest')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  sortBy === 'newest'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <i className="fa-solid fa-arrow-down-wide-short text-[10px]"></i>
                Newest
              </button>
              <button
                onClick={() => setSortBy('oldest')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  sortBy === 'oldest'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <i className="fa-solid fa-arrow-up-wide-short text-[10px]"></i>
                Oldest
              </button>
            </div>
          </div>
        </div>

        {selectedMood !== 'all' && (
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-50">
            <span className="flex items-center gap-1">
              Showing {filteredAndSortedEntries.length} entries for <strong>{moodLabels[selectedMood]} {moodEmoji[selectedMood]}</strong>
            </span>
            <button
              onClick={() => setSelectedMood('all')}
              className="text-indigo-600 hover:underline font-semibold text-[11px] cursor-pointer"
            >
              Clear Filter
            </button>
          </div>
        )}
      </div>

      {displayedEntries.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center space-y-3">
          <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 text-2xl mx-auto">
            <i className="fa-solid fa-filter"></i>
          </div>
          <h4 className="font-bold text-slate-800">No matching memories</h4>
          <p className="text-xs text-slate-500">No entries recorded with the selected mood filter.</p>
          <button
            onClick={() => setSelectedMood('all')}
            className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold rounded-xl text-xs transition-all cursor-pointer"
          >
            Show All Memories
          </button>
        </div>
      ) : (
        <div className="grid gap-6">
          {displayedEntries.map((entry) => (
            <article 
              key={entry.id} 
              className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm hover:shadow-xl hover:shadow-indigo-50/50 transition-all group animate-in fade-in duration-300"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl" title={entry.mood}>{moodEmoji[entry.mood]}</span>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 group-hover:text-indigo-600 transition-colors leading-tight">
                      {entry.title || "Untitled Entry"}
                    </h3>
                    <time className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                      {new Date(entry.date).toLocaleDateString(undefined, { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </time>
                  </div>
                </div>
                <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity whitespace-nowrap shrink-0">
                  <button 
                    onClick={() => handleShare(entry)}
                    className={`p-2 rounded-xl transition-all relative ${
                      isPremium 
                        ? 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50' 
                        : 'text-amber-500 hover:text-amber-600 hover:bg-amber-50'
                    }`}
                    title={isPremium ? "Share Entry" : "Share Entry (Premium)"}
                  >
                    <i className="fa-solid fa-share-nodes"></i>
                    {!isPremium && (
                      <span className="absolute -top-1 -right-1 text-[8px] bg-amber-500 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center border border-white">
                        <i className="fa-solid fa-crown text-[6px]"></i>
                      </span>
                    )}
                  </button>
                  <button 
                    onClick={() => onEdit(entry)}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                    title="Edit"
                  >
                    <i className="fa-solid fa-pen"></i>
                  </button>
                  <button 
                    onClick={() => onDelete(entry.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                    title="Delete"
                  >
                    <i className="fa-solid fa-trash"></i>
                  </button>
                </div>
              </div>

              {entry.image && (
                <div className="mb-4 overflow-hidden rounded-2xl max-h-80 bg-slate-100 border border-slate-100 flex justify-center items-center">
                  <img 
                    src={entry.image} 
                    alt={entry.title || "Diary entry attachment"} 
                    className="object-cover w-full h-full max-h-80 select-none" 
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer" 
                  />
                </div>
              )}

              <p className="text-slate-600 line-clamp-3 font-serif leading-relaxed mb-4">
                {entry.content}
              </p>

              <div className="flex flex-wrap gap-2">
                {entry.tags.map(tag => (
                  <span key={tag} className="px-3 py-1 bg-slate-50 text-slate-500 rounded-full text-xs font-medium border border-slate-100">
                    #{tag}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages >= 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 pb-2 border-t border-slate-100">
          <div className="text-xs text-slate-400 font-semibold font-mono">
            Showing Page {currentPage} of {isPremium ? totalPages : Math.max(1, Math.min(3, totalPages))} {!isPremium && totalPages > 3 && `(locked: ${totalPages - 3} premium pages)`}
          </div>
          
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
            {/* Previous */}
            <button
              onClick={() => {
                if (currentPage > 1) {
                  setCurrentPage(prev => prev - 1);
                }
              }}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/50 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400 rounded-xl transition-all flex items-center gap-1"
              title="Previous Page"
            >
              <i className="fa-solid fa-chevron-left text-[10px]"></i>
              <span className="inline-block">Prev</span>
            </button>

            {/* Page Buttons */}
            {Array.from({ length: totalPages }).map((_, i) => {
              const pageNum = i + 1;
              const isPageLocked = !isPremium && pageNum > 3;
              
              return (
                <button
                  key={pageNum}
                  onClick={() => {
                    if (isPageLocked) {
                      onUpgradeClick();
                      if (triggerToast) {
                        triggerToast('Pages beyond Page 3 are locked. Upgrade to Premium to unlock unlimited pages!', 'info');
                      }
                    } else {
                      setCurrentPage(pageNum);
                    }
                  }}
                  className={`w-9 h-9 flex items-center justify-center text-xs font-black rounded-xl transition-all relative ${
                    currentPage === pageNum
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                      : isPageLocked
                        ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50 border border-dashed border-amber-200 bg-amber-50/10'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-600'
                  }`}
                >
                  {isPageLocked ? (
                    <span className="flex items-center justify-center gap-0.5" title="Premium Locked Page">
                      {pageNum}
                      <i className="fa-solid fa-crown text-[8px] text-amber-500 absolute -top-1 -right-0.5 bg-white border border-amber-200 rounded-full p-0.5"></i>
                    </span>
                  ) : (
                    pageNum
                  )}
                </button>
              );
            })}

            {/* Next */}
            <button
              onClick={() => {
                const nextPage = currentPage + 1;
                const isNextLocked = !isPremium && nextPage > 3;
                
                if (isNextLocked) {
                   onUpgradeClick();
                   if (triggerToast) {
                     triggerToast('Pages beyond Page 3 are locked. Upgrade to Premium to unlock unlimited pages!', 'info');
                   }
                } else if (nextPage <= totalPages) {
                  setCurrentPage(nextPage);
                }
              }}
              disabled={currentPage === totalPages && (isPremium || currentPage <= 3)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/50 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400 rounded-xl transition-all flex items-center gap-1"
              title="Next Page"
            >
              <span className="inline-block">Next</span>
              <i className="fa-solid fa-chevron-right text-[10px]"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EntryList;
