
import React, { useState, useEffect, useRef, useMemo, Suspense, lazy } from 'react';
import { DiaryEntry, Mood } from './types';
import Sidebar from './components/Sidebar';
import { LockScreen } from './components/LockScreen';
import { PrivacySettingsModal } from './components/PrivacySettingsModal';
import { PrivacyPolicyPage } from './components/PrivacyPolicyPage';
import { collection, getDocs, doc, setDoc, deleteDoc, query } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './services/firebase';
import { networkManager, NetworkStatus } from './services/networkService';
import { trialService, TrialInfo } from './services/trialService';

// Lazy load heavy and non-critical components to ensure fast initial page load even on slow networks
const EntryList = lazy(() => import('./components/EntryList'));
const EntryEditor = lazy(() => import('./components/EntryEditor'));
const WeeklyInsight = lazy(() => import('./components/WeeklyInsight'));
const MoodChart = lazy(() => import('./components/MoodChart'));
const DailyAffirmation = lazy(() => import('./components/DailyAffirmation'));
const ShareView = lazy(() => import('./components/ShareView'));
const SharedEntryView = lazy(() => import('./components/SharedEntryView'));
const BackupModal = lazy(() => import('./components/BackupModal'));
const PremiumModal = lazy(() => import('./components/PremiumModal'));
const InviteModal = lazy(() => import('./components/InviteModal').then(m => ({ default: m.InviteModal })));

// Dynamic skeleton loaders that match components perfectly to prevent layout shifts on slow connections
const TimelineSkeleton = () => (
  <div className="space-y-5 md:space-y-6 animate-pulse">
    {/* DailyAffirmation Skeleton */}
    <div className="bg-gradient-to-r from-indigo-50/40 to-pink-50/40 rounded-3xl p-6 border border-indigo-100/30 h-28 flex items-center justify-between" />
    
    {/* WeeklyInsight Skeleton */}
    <div className="bg-white rounded-[32px] p-6 border border-slate-100/80 h-36" />

    {/* EntryList Skeleton */}
    <div className="space-y-4">
      {[1, 2].map((n) => (
        <div key={n} className="bg-white rounded-[32px] p-6 border border-slate-100/80 h-36 flex flex-col justify-between" />
      ))}
    </div>
  </div>
);

const EditorSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="bg-white rounded-[32px] p-6 md:p-8 border border-slate-100/80 space-y-6">
      <div className="h-8 bg-slate-100 rounded-xl w-1/3" />
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <div key={n} className="w-12 h-12 bg-slate-100 rounded-full" />
        ))}
      </div>
      <div className="h-48 bg-slate-100/80 rounded-2xl w-full" />
      <div className="h-12 bg-indigo-100 rounded-xl w-32 ml-auto" />
    </div>
  </div>
);

const StatsSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="h-8 bg-slate-100 rounded-xl w-1/4" />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
      <div className="bg-white p-6 rounded-[32px] border border-slate-100/80 h-80" />
      <div className="bg-white p-6 rounded-[32px] border border-slate-100/80 h-80 flex flex-col justify-center items-center space-y-4">
        <div className="w-14 h-14 bg-slate-100 rounded-full" />
        <div className="h-6 bg-slate-100 rounded-md w-1/3" />
        <div className="h-10 bg-indigo-100 rounded-lg w-1/4" />
      </div>
    </div>
  </div>
);

const ShareSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="bg-white p-8 rounded-[32px] border border-slate-100/80 h-64" />
  </div>
);

const ModalLoader = ({ message = "Loading safety locks..." }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
    <div className="bg-white p-6 md:p-8 rounded-[32px] shadow-2xl flex flex-col items-center justify-center space-y-4 max-w-xs text-center">
      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-slate-500 text-sm font-medium">{message}</p>
    </div>
  </div>
);

const STORAGE_KEY = 'lumina_diary_entries';

const App: React.FC = () => {
  const [entries, setEntries] = useState<DiaryEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [activeView, setActiveView] = useState<'list' | 'editor' | 'stats' | 'share'>('list');
  const [editingEntry, setEditingEntry] = useState<DiaryEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sharedEntryToView, setSharedEntryToView] = useState<DiaryEntry | null>(null);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [privacyModalTab, setPrivacyModalTab] = useState<'security' | 'policy' | 'network'>('security');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState<string>(window.location.pathname);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(networkManager.getStatus());
  const [hideSlowBanner, setHideSlowBanner] = useState(false);

  useEffect(() => {
    const unsub = networkManager.subscribe((status) => {
      setNetworkStatus(status);
    });
    return () => unsub();
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);
  const [trialInfo, setTrialInfo] = useState<TrialInfo>(() => trialService.getTrialInfo());
  const isPremium = trialInfo.hasPremiumAccess;

  useEffect(() => {
    const unsub = trialService.subscribe(setTrialInfo);
    return () => unsub();
  }, []);
  const [showPremiumWelcome, setShowPremiumWelcome] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState<boolean>(() => {
    return localStorage.getItem('lumina_permissions_prompt_shown') !== 'true';
  });
  const [requestingPermissions, setRequestingPermissions] = useState(false);
  const triggerToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const refCode = params.get('ref') || params.get('invite');
      if (refCode) {
        localStorage.setItem('lumina_referred_by', refCode);
        triggerToast(`✨ Welcome! You were invited to Lumina Diary (${refCode}).`, 'info');
      }
    } catch (e) {
      console.warn('Error parsing referral code:', e);
    }
  }, []);

  useEffect(() => {
    (window as any).__luminaMounted = true;

    const handleOnline = () => {
      triggerToast("Network connection restored! Cloud tools synchronized.", "success");
    };
    const handleOffline = () => {
      triggerToast("Lumina is operating offline. Your journal reflections remain 100% safe locally.", "info");
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    if (!isUnlocked) return;

    const resetTimer = () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = setTimeout(() => {
        setIsUnlocked(false);
      }, 5 * 60 * 1000); // 5 minutes
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetTimer));

    resetTimer();

    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [isUnlocked]);

  // Firebase Auth and Firestore Entries Syncer
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        setAuthLoading(true);
        const entriesPath = `users/${user.uid}/entries`;
        try {
          const q = query(collection(db, entriesPath));
          const querySnapshot = await getDocs(q);
          const fbEntries: DiaryEntry[] = [];
          querySnapshot.forEach((doc) => {
            fbEntries.push(doc.data() as DiaryEntry);
          });

          // Sort by date descending
          fbEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

          // One-time auto migration of local entries to cloud
          const savedEntries = localStorage.getItem(STORAGE_KEY);
          if (savedEntries) {
            try {
              const localEntries: DiaryEntry[] = JSON.parse(savedEntries);
              if (localEntries.length > 0 && fbEntries.length === 0) {
                triggerToast('Syncing your local reflections to secure cloud storage...', 'info');
                for (const localEntry of localEntries) {
                  await setDoc(doc(db, entriesPath, localEntry.id), {
                    ...localEntry,
                    userId: user.uid,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                  });
                  fbEntries.push(localEntry);
                }
                triggerToast('All reflections synced to your secure cloud sanctuary successfully!', 'success');
                // Clean up local storage to prevent double-trigger
                localStorage.removeItem(STORAGE_KEY);
              }
            } catch (err) {
              console.error('Migration error', err);
            }
          }

          setEntries(fbEntries);
        } catch (err) {
          console.error("Firestore loading error:", err);
          // Gracefully fallback to whatever is local if cloud loading fails
          const savedEntries = localStorage.getItem(STORAGE_KEY);
          if (savedEntries) {
            try {
              setEntries(JSON.parse(savedEntries));
            } catch (e) {
              console.error("Local fallback parse failed:", e);
            }
          }
        } finally {
          setAuthLoading(false);
        }
      } else {
        setIsUnlocked(false);
        setEntries([]);
        setAuthLoading(false);
      }
    });

    // Check for shared entry link
    const params = new URLSearchParams(window.location.search);
    const viewCode = params.get('view');
    if (viewCode) {
      fetch(`/api/share/${viewCode}`)
        .then(res => res.json())
        .then(data => {
            if (data.entry) {
                setSharedEntryToView(data.entry);
            } else if (data.entries) {
                handleImport(data.entries);
            }
        })
        .catch(err => console.error("Failed to fetch shared entry", err));
      
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }

    return () => unsubscribe();
  }, []);

  // Save entries to localStorage only if not logged in
  useEffect(() => {
    if (!currentUser && entries.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    }
  }, [entries, currentUser]);



  const handleUnlockPremium = (billingType: 'manual' | 'auto' = 'manual') => {
    trialService.markPaid(billingType);
    setShowPremiumWelcome(true);
    triggerToast('🎉 Lumina Premium Unlocked! Unlimited cloud diary activated.', 'success');
    const expiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    if (billingType === 'auto') {
      localStorage.setItem('lumina_premium_renews_at', expiry);
      localStorage.removeItem('lumina_premium_expires_at');
    } else {
      localStorage.setItem('lumina_premium_expires_at', expiry);
      localStorage.removeItem('lumina_premium_renews_at');
    }
    setShowPremiumModal(false);
  };

  const handleRequestSystemPermissions = async () => {
    setRequestingPermissions(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      localStorage.setItem('lumina_storage_granted', 'true');
      localStorage.setItem('lumina_permissions_prompt_shown', 'true');
      setShowPermissionsModal(false);
      triggerToast('Camera and device file permissions authorized!', 'success');
    } catch (err: any) {
      console.warn("Direct hardware initialization catch", err);
      localStorage.setItem('lumina_storage_granted', 'true');
      localStorage.setItem('lumina_permissions_prompt_shown', 'true');
      setShowPermissionsModal(false);
      triggerToast('Files and storage options successfully configured.', 'info');
    } finally {
      setRequestingPermissions(false);
    }
  };

  const handleSaveEntry = async (entry: DiaryEntry) => {
    const isNew = !entries.some(e => e.id === entry.id);
    
    if (!isPremium && isNew && entries.length >= 30) {
      setShowPremiumModal(true);
      triggerToast('60-day free trial has expired (30-entry free limit). Upgrade to Lumina Premium ($2.50) to continue writing unlimited pages.', 'info');
      return;
    }

    // Instant optimistic update — zero waiting or freezing on slow network
    setEntries(prev => {
      const exists = prev.find(e => e.id === entry.id);
      const nextList = exists 
        ? prev.map(e => e.id === entry.id ? entry : e)
        : [entry, ...prev];
      
      // Save synchronously to local device storage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextList));
      } catch (e) {
        console.warn('Local storage write warning:', e);
      }
      return nextList;
    });

    setActiveView('list');
    setEditingEntry(null);
    triggerToast('Memory safely saved to your local sanctuary!', 'success');

    // Background asynchronous Cloud Sync with error protection
    if (currentUser) {
      const entriesPath = `users/${currentUser.uid}/entries`;
      setDoc(doc(db, entriesPath, entry.id), {
        ...entry,
        userId: currentUser.uid,
        updatedAt: new Date().toISOString()
      }).catch((err) => {
        console.warn("Background cloud sync note:", err);
      });
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (confirm('Are you sure you want to delete this memory?')) {
      // Instant optimistic local deletion
      setEntries(prev => {
        const nextList = prev.filter(e => e.id !== id);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(nextList));
        } catch (e) {
          console.warn('Local storage write warning:', e);
        }
        return nextList;
      });
      triggerToast('Memory removed from local sanctuary.', 'info');

      // Background asynchronous Cloud Deletion
      if (currentUser) {
        const entriesPath = `users/${currentUser.uid}/entries`;
        deleteDoc(doc(db, entriesPath, id)).catch((err) => {
          console.warn("Background cloud delete note:", err);
        });
      }
    }
  };

  const handleEditEntry = (entry: DiaryEntry) => {
    setEditingEntry(entry);
    setActiveView('editor');
  };

  const handleNewEntry = () => {
    if (!isPremium && entries.length >= 30) {
      setShowPremiumModal(true);
      triggerToast('60-day free trial has expired (30-entry free limit). Upgrade to Lumina Premium ($2.50) to write more entries.', 'info');
      return;
    }
    setEditingEntry(null);
    setActiveView('editor');
  };

  const handleExport = () => {
    if (!isPremium) {
      setShowPremiumModal(true);
      triggerToast('Vault export & cloud backup is a Lumina Premium feature. Upgrade to unlock.', 'info');
      return;
    }
    setShowBackupModal(true);
  };

  const handleLocalExport = () => {
    if (!isPremium) {
      setShowPremiumModal(true);
      triggerToast('Exporting diary data requires Lumina Premium. Upgrade to unlock.', 'info');
      return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(entries));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `lumina_diary_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImport = async (newEntries: DiaryEntry[]) => {
    if (currentUser) {
      const entriesPath = `users/${currentUser.uid}/entries`;
      triggerToast('Importing entries to your secure cloud sanctuary...', 'info');
      try {
        for (const entry of newEntries) {
          await setDoc(doc(db, entriesPath, entry.id), {
            ...entry,
            userId: currentUser.uid,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
        triggerToast('Successfully imported and synced backups!', 'success');
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, entriesPath);
      }
    }

    setEntries(prev => {
      const existingIds = new Set(prev.map(e => e.id));
      const filteredNew = newEntries.filter(e => !existingIds.has(e.id));
      return [...prev, ...filteredNew].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });
    setActiveView('list');
  };

  const filteredEntries = useMemo(() => {
    return entries
      .filter(e => 
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        e.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [entries, searchQuery]);

  const lastMood = entries[0]?.mood || 'peaceful';

  if (currentPath === '/privacy' || currentPath === '/privacy-policy') {
    return <PrivacyPolicyPage onBack={() => navigate('/')} />;
  }

  if (!isUnlocked) {
    return (
      <div className="min-h-screen w-full bg-slate-50 overflow-y-auto relative">
        <LockScreen onUnlock={() => setIsUnlocked(true)} />
        {toast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 md:left-auto md:right-6 md:translate-x-0 z-[110] animate-in fade-in slide-in-from-top-3 md:slide-in-from-right-3 duration-300">
            <div className={`px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 border text-sm font-semibold ${
              toast.type === 'success' 
                ? 'bg-emerald-50 border-emerald-100/80 text-emerald-800' 
                : toast.type === 'error'
                ? 'bg-rose-50 border-rose-100/80 text-rose-800'
                : 'bg-indigo-50 border-indigo-100/80 text-indigo-800'
            }`}>
              <i className={`fa-solid ${
                toast.type === 'success' 
                  ? 'fa-circle-check text-emerald-500' 
                  : toast.type === 'error'
                  ? 'fa-circle-exclamation text-rose-500'
                  : 'fa-circle-info text-indigo-500'
              } text-base`}></i>
              <span>{toast.message}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden relative">
      <Sidebar 
        activeView={activeView} 
        setActiveView={setActiveView} 
        onNewEntry={handleNewEntry}
        onExport={handleExport}
        isPremium={isPremium}
        trialInfo={trialInfo}
        onUpgradeClick={() => setShowPremiumModal(true)}
        entryCount={entries.length}
        onOpenPrivacy={() => {
          setPrivacyModalTab('security');
          setShowPrivacyModal(true);
        }}
        onOpenInvite={() => setShowInviteModal(true)}
        onLock={() => {
          auth.signOut();
          setIsUnlocked(false);
        }}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      <main className="flex-1 flex flex-col min-w-0 bg-white shadow-inner overflow-hidden pb-16 md:pb-0">
        {(!networkStatus.isOnline || networkStatus.isSlowConnection || networkStatus.isDataSaver) && !hideSlowBanner && (
          <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white px-4 py-2 text-xs flex items-center justify-between border-b border-indigo-500/20 shrink-0 select-none animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="flex h-2 w-2 relative shrink-0">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  !networkStatus.isOnline ? 'bg-rose-400' : 'bg-amber-400'
                }`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                  !networkStatus.isOnline ? 'bg-rose-500' : 'bg-amber-500'
                }`}></span>
              </span>
              <span className="font-medium truncate">
                {!networkStatus.isOnline 
                  ? 'Offline Sanctuary Mode • All entries safe on device' 
                  : networkStatus.isDataSaver
                  ? 'Data Saver Active • Fast lite media & instant local saves'
                  : 'Slow Connection Detected • Optimized offline-first mode active'}
              </span>
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-2">
              <button
                type="button"
                onClick={() => {
                  setPrivacyModalTab('network');
                  setShowPrivacyModal(true);
                }}
                className="text-[11px] font-bold text-indigo-300 hover:text-white underline cursor-pointer"
              >
                Network Settings
              </button>
              <button
                type="button"
                onClick={() => setHideSlowBanner(true)}
                className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
                title="Dismiss banner"
              >
                <i className="fa-solid fa-xmark text-xs"></i>
              </button>
            </div>
          </div>
        )}

        {activeView === 'list' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <header className="px-4 sm:px-6 py-3.5 border-b flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="md:hidden w-9 h-9 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
                  title="Open Navigation Menu"
                >
                  <i className="fa-solid fa-bars text-sm"></i>
                </button>
                <div className="w-8 h-8 hidden sm:flex md:hidden bg-indigo-600 rounded-lg items-center justify-center shadow-md shadow-indigo-100">
                  <i className="fa-solid fa-book-open text-white text-xs"></i>
                </div>
                <h1 className="text-lg sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <span className="md:inline hidden">Your Journey</span>
                  <span className="inline md:hidden font-extrabold tracking-tight text-indigo-600">Lumina</span>
                  {(trialInfo.isPaid || trialInfo.isTrialActive) && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 font-extrabold text-[8px] uppercase tracking-wider inline-flex items-center gap-0.5 select-none shrink-0">
                      <i className="fa-solid fa-crown text-[7px]" /> PREMIUM
                    </span>
                  )}
                  {trialInfo.isTrialExpired && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-600 font-extrabold text-[8px] uppercase tracking-wider inline-flex items-center gap-0.5 select-none shrink-0">
                      TRIAL EXPIRED
                    </span>
                  )}
                </h1>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="relative w-32 sm:w-64">
                  <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                  <input 
                    type="text" 
                    placeholder="Search..." 
                    className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-full text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 font-medium"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                {trialInfo.isTrialActive && (
                  <button
                    onClick={() => setShowPremiumModal(true)}
                    className="px-2.5 sm:px-3.5 py-1.5 rounded-full bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer shrink-0"
                    title="All features unlocked! Upgrade anytime for $2.50 to keep forever"
                  >
                    <i className="fa-solid fa-crown text-[10px] text-amber-500"></i>
                    <span className="hidden sm:inline">Keep Pro</span>
                    <span className="font-mono font-bold">$2.50</span>
                  </button>
                )}

                {trialInfo.isTrialExpired && (
                  <button
                    onClick={() => setShowPremiumModal(true)}
                    className="px-2.5 sm:px-3.5 py-1.5 rounded-full bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-700 hover:to-sky-700 text-white font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-sm shadow-cyan-200 active:scale-95 cursor-pointer shrink-0 animate-pulse"
                    title="Trial Ended - Upgrade to Lumina Pro via Paystack ($2.50)"
                  >
                    <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="4" width="18" height="3" rx="1.5" fill="#FFFFFF" />
                      <rect x="3" y="10.5" width="18" height="3" rx="1.5" fill="#FFFFFF" />
                      <rect x="3" y="17" width="18" height="3" rx="1.5" fill="#FFFFFF" />
                    </svg>
                    <span>Upgrade <span className="hidden sm:inline font-mono font-bold">$2.50</span></span>
                  </button>
                )}

                <button
                  onClick={() => setShowInviteModal(true)}
                  className="px-2.5 sm:px-3 py-1.5 rounded-full bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-700 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
                  title="Invite Friends to Lumina"
                >
                  <i className="fa-solid fa-user-plus text-[11px] text-indigo-600"></i>
                  <span className="hidden sm:inline">Invite</span>
                </button>

                <button
                  onClick={() => {
                    auth.signOut();
                    setIsUnlocked(false);
                  }}
                  className="w-8 h-8 rounded-full border border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-slate-400 hover:text-rose-600 transition-all flex items-center justify-center bg-white shadow-sm cursor-pointer"
                  title="Lock Diary Immediately"
                >
                  <i className="fa-solid fa-lock text-[11px]"></i>
                </button>

                <button
                  onClick={() => {
                    setPrivacyModalTab('security');
                    setShowPrivacyModal(true);
                  }}
                  className="w-8 h-8 rounded-full border border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-slate-400 hover:text-indigo-600 transition-all flex items-center justify-center bg-white shadow-sm cursor-pointer"
                  title="Privacy Settings"
                >
                  <i className="fa-solid fa-user-shield text-[11px]"></i>
                </button>
              </div>
            </header>
            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50">
              <div className="max-w-4xl mx-auto w-full">
                <Suspense fallback={<TimelineSkeleton />}>
                  <div className="space-y-5 md:space-y-6">
                    {showPremiumWelcome && (
                      <div className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white rounded-[32px] p-6 md:p-8 border border-white/20 shadow-2xl relative overflow-hidden animate-in zoom-in-95 fade-in duration-700">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none -mr-32 -mt-32" />
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-400/20 rounded-full blur-2xl pointer-events-none -ml-24 -mb-24" />
                        
                        <div className="relative flex flex-col md:flex-row items-center gap-6">
                          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center text-white text-3xl shadow-xl border border-white/10 animate-bounce">
                            <i className="fa-solid fa-crown text-amber-300"></i>
                          </div>
                          <div className="flex-1 text-center md:text-left space-y-2">
                            <h2 className="text-xl sm:text-3xl font-black tracking-tight">Welcome to Lumina Premium!</h2>
                            <p className="text-indigo-100/90 text-xs sm:text-sm font-medium leading-relaxed max-w-xl">
                              Your sanctuary is now boundless. Thank you for supporting Lumina. You have unlocked unlimited pages, deep insight metrics, and secure remote backups.
                            </p>
                            <div className="flex flex-wrap justify-center md:justify-start gap-3 pt-2">
                              <span className="px-2.5 py-1 rounded-lg bg-white/15 border border-white/10 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                                <i className="fa-solid fa-infinity text-amber-300"></i>
                                Unlimited Entries
                              </span>
                              <span className="px-2.5 py-1 rounded-lg bg-white/15 border border-white/10 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                                <i className="fa-solid fa-cloud-arrow-up text-amber-300"></i>
                                Cloud Sync
                              </span>
                              <span className="px-2.5 py-1 rounded-lg bg-white/15 border border-white/10 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                                <i className="fa-solid fa-bell text-amber-300"></i>
                                Intent Alerts
                              </span>
                            </div>
                          </div>
                          <button 
                            onClick={() => setShowPremiumWelcome(false)}
                            className="bg-white text-indigo-700 hover:bg-indigo-50 font-black px-6 py-3 rounded-2xl shadow-lg transition-all active:scale-95 text-xs sm:text-sm cursor-pointer whitespace-nowrap"
                          >
                            Enter Sanctuary
                          </button>
                        </div>
                      </div>
                    )}

                    {!isPremium && entries.length >= 10 && (
                      <div className="bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 text-white rounded-[32px] p-6 md:p-8 border border-indigo-500/20 shadow-2xl relative overflow-hidden animate-in slide-in-from-top-4 duration-500">
                        {/* Decorative background flare */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-indigo-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />
                        
                        <div className="relative flex flex-col xl:flex-row items-center justify-between gap-6">
                          <div className="flex items-start gap-4 flex-col md:flex-row text-center md:text-left min-w-0">
                            <div className="w-14 h-14 bg-gradient-to-tr from-amber-400 to-amber-500 rounded-2xl flex items-center justify-center text-white text-2xl shadow-xl shadow-amber-500/10 mx-auto md:mx-0 shrink-0">
                              <i className="fa-solid fa-crown text-amber-100"></i>
                            </div>
                            <div className="space-y-1.5 flex-1">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] uppercase tracking-wider font-extrabold bg-indigo-500/20 border border-indigo-500/30 text-indigo-200 rounded-full">
                                <i className="fa-solid fa-sparkles"></i> SUGGESTED RECOMMENDATION
                              </span>
                              <h3 className="text-lg md:text-xl font-black tracking-tight text-white leading-tight">
                                Upgrade to Premium for Unlimited Journeys
                              </h3>
                              <p className="text-indigo-200/70 text-xs md:text-sm max-w-xl leading-relaxed">
                                You have completed your first page of diaries! Upgrade to Lumina Premium to keep scaling your beautiful memories and write without limits.
                              </p>
                              
                              <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-5 gap-y-2.5 pt-1.5 text-xs text-indigo-200/60 font-semibold">
                                <div className="flex items-center gap-2">
                                  <i className="fa-solid fa-circle-check text-indigo-400 shrink-0"></i>
                                  <span>Unlimited Stories & Thoughts</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <i className="fa-solid fa-circle-check text-indigo-400 shrink-0"></i>
                                  <span>Secure Remote Backups</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <i className="fa-solid fa-circle-check text-indigo-400 shrink-0"></i>
                                  <span>Deep Insight Analytics</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row xl:flex-col gap-3 w-full xl:w-auto shrink-0 justify-center">
                            <button
                              onClick={() => setShowPremiumModal(true)}
                              className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-500/40 font-extrabold text-xs md:text-sm rounded-2xl shadow-lg active:scale-95 transition-all text-nowrap flex items-center justify-center gap-2"
                            >
                              <i className="fa-solid fa-crown text-[10px] text-amber-300"></i>
                              Upgrade Premium Option
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    <DailyAffirmation lastMood={lastMood} isPremium={isPremium} onUpgradeClick={() => setShowPremiumModal(true)} />
                    <WeeklyInsight entries={entries} isPremium={isPremium} onUpgradeClick={() => setShowPremiumModal(true)} />
                    <EntryList triggerToast={triggerToast} isPremium={isPremium} onUpgradeClick={() => setShowPremiumModal(true)} 
                      entries={filteredEntries} 
                      onEdit={handleEditEntry} 
                      onDelete={handleDeleteEntry}
                    />

                    {/* Minimalist Brand Footer */}
                    <footer className="mt-12 py-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400 font-medium">
                      <div>
                        © {new Date().getFullYear()} Lumina. Your words are your sanctuary.
                      </div>
                      <div className="flex items-center gap-4">
                        <a 
                          href="http://luminadiary.unaux.com/privacy%20policy"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-indigo-600 transition-colors flex items-center gap-1.5 cursor-pointer font-bold text-[11px] text-slate-400"
                        >
                          <i className="fa-solid fa-user-shield text-[10px]"></i>
                          Privacy Policy
                        </a>
                        <span>•</span>
                        <a 
                          href="#" 
                          className="hover:text-indigo-600 transition-colors"
                          onClick={(e) => {
                            e.preventDefault();
                            triggerToast('For assistance, configure your offline backup options or contact help.', 'info');
                          }}
                        >
                          Support Docs
                        </a>
                      </div>
                    </footer>
                  </div>
                </Suspense>
              </div>
            </div>
          </div>
        )}

        {activeView === 'editor' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <header className="px-4 sm:px-6 py-3.5 border-b flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-10 shrink-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="md:hidden w-9 h-9 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
                  title="Open Navigation Menu"
                >
                  <i className="fa-solid fa-bars text-sm"></i>
                </button>
                <button 
                  onClick={() => setActiveView('list')}
                  className="text-slate-600 hover:text-indigo-600 flex items-center gap-2 text-xs sm:text-sm font-semibold transition-colors bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-100 cursor-pointer"
                >
                  <i className="fa-solid fa-arrow-left"></i>
                  <span>Back to Memories</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={() => {
                    auth.signOut();
                    setIsUnlocked(false);
                  }}
                  className="w-8 h-8 rounded-full border border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-slate-400 hover:text-rose-600 transition-all flex items-center justify-center bg-white shadow-sm cursor-pointer"
                  title="Lock Diary Immediately"
                >
                  <i className="fa-solid fa-lock text-[11px]"></i>
                </button>

                <button
                  onClick={() => {
                    setPrivacyModalTab('security');
                    setShowPrivacyModal(true);
                  }}
                  className="w-8 h-8 rounded-full border border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-slate-400 hover:text-indigo-600 transition-all flex items-center justify-center bg-white shadow-sm cursor-pointer"
                  title="Privacy Settings"
                >
                  <i className="fa-solid fa-user-shield text-[11px]"></i>
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              <div className="max-w-3xl mx-auto">
                <Suspense fallback={<EditorSkeleton />}>
                  <EntryEditor triggerToast={triggerToast} 
                    key={editingEntry?.id || 'new'}
                    entry={editingEntry} 
                    onSave={handleSaveEntry} 
                  />
                </Suspense>
              </div>
            </div>
          </div>
        )}

        {activeView === 'stats' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <header className="px-4 sm:px-6 py-3.5 border-b flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-10 shrink-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="md:hidden w-9 h-9 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
                  title="Open Navigation Menu"
                >
                  <i className="fa-solid fa-bars text-sm"></i>
                </button>
                <h1 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2">
                  <i className="fa-solid fa-chart-pie text-indigo-600 text-sm"></i>
                  Reflections & Insights
                </h1>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={() => {
                    auth.signOut();
                    setIsUnlocked(false);
                  }}
                  className="w-8 h-8 rounded-full border border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-slate-400 hover:text-rose-600 transition-all flex items-center justify-center bg-white shadow-sm cursor-pointer"
                  title="Lock Diary Immediately"
                >
                  <i className="fa-solid fa-lock text-[11px]"></i>
                </button>

                <button
                  onClick={() => {
                    setPrivacyModalTab('security');
                    setShowPrivacyModal(true);
                  }}
                  className="w-8 h-8 rounded-full border border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-slate-400 hover:text-indigo-600 transition-all flex items-center justify-center bg-white shadow-sm cursor-pointer"
                  title="Privacy Settings"
                >
                  <i className="fa-solid fa-user-shield text-[11px]"></i>
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50">
              <div className="max-w-5xl mx-auto">
                <Suspense fallback={<StatsSkeleton />}>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 animate-in fade-in duration-500">
                    <MoodChart entries={entries} />
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
                      <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 text-xl mb-4 animate-bounce">
                        <i className="fa-solid fa-pen-nib"></i>
                      </div>
                      <h3 className="text-lg font-semibold text-slate-800">Memory Count</h3>
                      <p className="text-4xl font-bold text-indigo-600 my-2">{entries.length}</p>
                      <p className="text-slate-500 text-sm">Stories told since you joined.</p>
                    </div>
                  </div>
                </Suspense>
              </div>
            </div>
          </div>
        )}

        {activeView === 'share' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <header className="px-4 sm:px-6 py-3.5 border-b flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-10 shrink-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="md:hidden w-9 h-9 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
                  title="Open Navigation Menu"
                >
                  <i className="fa-solid fa-bars text-sm"></i>
                </button>
                <h1 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2">
                  <i className="fa-solid fa-share-nodes text-indigo-600 text-sm"></i>
                  Share & Sync Sanctuary
                </h1>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={() => {
                    auth.signOut();
                    setIsUnlocked(false);
                  }}
                  className="w-8 h-8 rounded-full border border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-slate-400 hover:text-rose-600 transition-all flex items-center justify-center bg-white shadow-sm cursor-pointer"
                  title="Lock Diary Immediately"
                >
                  <i className="fa-solid fa-lock text-[11px]"></i>
                </button>

                <button
                  onClick={() => {
                    setPrivacyModalTab('security');
                    setShowPrivacyModal(true);
                  }}
                  className="w-8 h-8 rounded-full border border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-slate-400 hover:text-indigo-600 transition-all flex items-center justify-center bg-white shadow-sm cursor-pointer"
                  title="Privacy Settings"
                >
                  <i className="fa-solid fa-user-shield text-[11px]"></i>
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50">
              <Suspense fallback={<ShareSkeleton />}>
                <ShareView entries={entries} onImport={handleImport} triggerToast={triggerToast} isPremium={isPremium} onUpgradeClick={() => setShowPremiumModal(true)} />
              </Suspense>
            </div>
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-t border-slate-100 flex items-center justify-around px-2 z-40 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.06)]">
        <button 
          onClick={() => setActiveView('list')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all active:scale-95 ${activeView === 'list' ? 'text-indigo-600 font-bold scale-105' : 'text-slate-400 hover:text-slate-500'}`}
        >
          <i className="fa-solid fa-house text-lg"></i>
          <span className="text-[10px] mt-0.5">Timeline</span>
        </button>

        <button 
          onClick={() => setActiveView('stats')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all active:scale-95 ${activeView === 'stats' ? 'text-indigo-600 font-bold scale-105' : 'text-slate-400 hover:text-slate-500'}`}
        >
          <i className="fa-solid fa-chart-pie text-lg"></i>
          <span className="text-[10px] mt-0.5">Insights</span>
        </button>

        {/* Floating action button in the center */}
        <button 
          onClick={handleNewEntry}
          className="flex items-center justify-center -mt-6 w-12 h-12 bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-90 transition-all outline-none"
          title="New Entry"
        >
          <i className="fa-solid fa-plus text-xl"></i>
        </button>

        <button 
          onClick={() => {
            if (!isPremium) {
              setShowPremiumModal(true);
            } else {
              setActiveView('share');
            }
          }}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all active:scale-95 ${
            activeView === 'share' 
              ? 'text-indigo-600 font-bold scale-105' 
              : !isPremium 
                ? 'text-amber-500 hover:text-amber-600' 
                : 'text-slate-400 hover:text-slate-500'
          }`}
        >
          <i className="fa-solid fa-share-nodes text-lg"></i>
          <span className="text-[10px] mt-0.5 flex items-center gap-0.5 font-bold">
            Share {!isPremium && <i className="fa-solid fa-crown text-[8px] text-amber-500"></i>}
          </span>
        </button>

        <button 
          onClick={() => {
            if (!isPremium) {
              setShowPremiumModal(true);
            } else {
              handleExport();
            }
          }}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all active:scale-95 ${
            !isPremium ? 'text-amber-500 hover:text-amber-600' : 'text-slate-400 hover:text-indigo-600'
          }`}
        >
          <i className="fa-solid fa-file-export text-lg"></i>
          <span className="text-[10px] mt-0.5 flex items-center gap-0.5 font-bold">
            Backup {!isPremium && <i className="fa-solid fa-crown text-[8px] text-amber-500"></i>}
          </span>
        </button>
      </div>

      {sharedEntryToView && (
        <Suspense fallback={<ModalLoader message="Opening shared memory..." />}>
          <SharedEntryView 
              entry={sharedEntryToView} 
              onClose={() => setSharedEntryToView(null)} 
              onImport={() => {
                  handleImport([sharedEntryToView]);
                  setSharedEntryToView(null);
              }} 
          />
        </Suspense>
      )}

      {showBackupModal && (
        <Suspense fallback={<ModalLoader message="Preparing secure export/import vault..." />}>
          <BackupModal 
            isOpen={showBackupModal}
            onClose={() => setShowBackupModal(false)}
            entries={entries}
            onLocalExport={handleLocalExport}
            onLocalImport={handleImport}
            isPremium={isPremium}
            onUpgradeClick={() => {
              setShowBackupModal(false);
              setShowPremiumModal(true);
            }}
          />
        </Suspense>
      )}

      {showPrivacyModal && (
        <PrivacySettingsModal 
          defaultTab={privacyModalTab}
          onClose={() => setShowPrivacyModal(false)}
          onLock={() => {
            auth.signOut();
            setIsUnlocked(false);
            setShowPrivacyModal(false);
            triggerToast('Diary locked successfully!', 'success');
          }}
          triggerToast={triggerToast}
          onNavigate={navigate}
          isPremium={isPremium}
          trialInfo={trialInfo}
          onOpenPremium={() => setShowPremiumModal(true)}
        />
      )}

      {showPremiumModal && (
        <Suspense fallback={<ModalLoader message="Initializing secure premium gateway..." />}>
          <PremiumModal 
            isOpen={showPremiumModal}
            onClose={() => setShowPremiumModal(false)}
            onUnlock={handleUnlockPremium}
            entryCount={entries.length}
            userEmail={currentUser?.email || ''}
            trialInfo={trialInfo}
          />
        </Suspense>
      )}

      {showInviteModal && (
        <Suspense fallback={<ModalLoader message="Opening invitation portal..." />}>
          <InviteModal 
            isOpen={showInviteModal}
            onClose={() => setShowInviteModal(false)}
            currentUser={currentUser}
            triggerToast={triggerToast}
          />
        </Suspense>
      )}

      {showPermissionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden border border-slate-100 text-center animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
            <div className="p-8 md:p-10 overflow-y-auto flex-1 custom-scrollbar">
              <div className="w-16 h-16 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6 text-indigo-600 text-3xl">
                <i className="fa-solid fa-camera-retro animate-pulse"></i>
              </div>
              
              <h3 className="text-2xl font-bold text-slate-800 mb-3 tracking-tight">Access Device Features</h3>
              <p className="text-slate-500 mb-6 leading-relaxed text-sm text-center">
                Lumina Diary would like to access your <strong className="text-slate-800 font-semibold">Camera</strong> (for taking diary entry snapshots) and your <strong className="text-slate-800 font-semibold">Device Storage/Files</strong> (to select, embed, and securely export/import backups).
              </p>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left space-y-3 mb-8 text-xs text-slate-500">
                <div className="flex items-start gap-3">
                  <i className="fa-solid fa-camera text-indigo-500 mt-0.5 shrink-0"></i>
                  <span><strong>Diary Portraits:</strong> Capture high-quality photography directly inside your diary inputs to complement your memories.</span>
                </div>
                <div className="flex items-start gap-3">
                  <i className="fa-solid fa-file-invoice text-indigo-500 mt-0.5 shrink-0"></i>
                  <span><strong>Local File Backups:</strong> Securely choose files or import/export your local journal backup archive.</span>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleRequestSystemPermissions}
                  disabled={requestingPermissions}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 active:scale-[0.98] disabled:opacity-75 cursor-pointer"
                >
                  {requestingPermissions ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin mr-1"></i>
                      Requesting browser permission...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-shield-check mr-1"></i>
                      Grant Device Access
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem('lumina_permissions_prompt_shown', 'true');
                    setShowPermissionsModal(false);
                    triggerToast('You can grant permissions later during camera capture.', 'info');
                  }}
                  disabled={requestingPermissions}
                  className="w-full text-slate-400 hover:text-slate-600 font-semibold py-3 hover:bg-slate-50 rounded-2xl transition-all text-sm active:scale-[0.98] cursor-pointer"
                >
                  Configure Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modern, non-blocking floating toast notification */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 md:left-auto md:right-6 md:translate-x-0 z-50 animate-in fade-in slide-in-from-top-3 md:slide-in-from-right-3 duration-300">
          <div className={`px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 border text-sm font-semibold ${
            toast.type === 'success' 
              ? 'bg-emerald-50 border-emerald-100/80 text-emerald-800' 
              : toast.type === 'error'
              ? 'bg-rose-50 border-rose-100/80 text-rose-800'
              : 'bg-indigo-50 border-indigo-100/80 text-indigo-800'
          }`}>
            <i className={`fa-solid ${
              toast.type === 'success' 
                ? 'fa-circle-check text-emerald-500' 
                : toast.type === 'error'
                ? 'fa-circle-exclamation text-rose-500'
                : 'fa-circle-info text-indigo-500'
            } text-base`}></i>
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
