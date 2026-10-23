
import React from 'react';
import { TrialInfo } from '../services/trialService';
import { getCurrentSeasonTheme } from '../services/seasonService';

interface SidebarProps {
  activeView: 'list' | 'editor' | 'stats' | 'share';
  setActiveView: (view: 'list' | 'editor' | 'stats' | 'share') => void;
  onNewEntry: () => void;
  onExport: () => void;
  isPremium?: boolean;
  trialInfo?: TrialInfo;
  onUpgradeClick?: () => void;
  entryCount?: number;
  onOpenPrivacy: () => void;
  onOpenInvite?: () => void;
  onLock: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeView, 
  setActiveView, 
  onNewEntry, 
  onExport,
  isPremium = false,
  trialInfo,
  onUpgradeClick = () => {},
  entryCount = 0,
  onOpenPrivacy,
  onOpenInvite = () => {},
  onLock,
  isMobileOpen = false,
  onCloseMobile = () => {}
}) => {
  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);
  const [isInstallable, setIsInstallable] = React.useState(false);

  React.useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
      setDeferredPrompt(null);
    }
  };

  const NavItem = ({ view, icon, label }: { view: 'list' | 'stats' | 'share', icon: string, label: string }) => {
    const isShareLocked = view === 'share' && !isPremium;
    return (
      <button
        onClick={() => {
          if (isShareLocked) {
            onUpgradeClick();
          } else {
            setActiveView(view);
          }
          if (onCloseMobile) onCloseMobile();
        }}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all cursor-pointer ${
          activeView === view 
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
            : 'text-slate-600 hover:bg-slate-100'
        }`}
      >
        <div className="flex items-center gap-3">
          <i className={`fa-solid ${icon} w-5 ${isShareLocked ? 'text-amber-500' : ''}`}></i>
          <span className="font-semibold text-sm">{label}</span>
        </div>
        {isShareLocked && (
          <span className="text-[9px] text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200/50 flex items-center gap-0.5 font-black uppercase tracking-wide">
            <i className="fa-solid fa-crown text-[7px]"></i> PRO
          </span>
        )}
      </button>
    );
  };

  const sidebarContent = (
    <div className="p-6 md:p-8 flex flex-col h-full overflow-y-auto">
      {/* Brand Header */}
      <div className="flex items-center justify-between mb-8 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
            <i className="fa-solid fa-book-open text-white"></i>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tight text-slate-800">Lumina</span>
            {isPremium ? (
              <span className="text-[9px] font-black tracking-widest text-amber-500/90 uppercase inline-flex items-center gap-0.5">
                <i className="fa-solid fa-crown text-[8px]" /> PREMIUM
              </span>
            ) : (
              <span className="text-[10px] font-semibold text-slate-400">Personal Diary</span>
            )}
          </div>
        </div>

        {/* Mobile close button */}
        {isMobileOpen && (
          <button
            onClick={onCloseMobile}
            className="md:hidden w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
            title="Close menu"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        )}
      </div>

      {/* Seasonal Theme Indicator Badge */}
      {(() => {
        const currentSeason = getCurrentSeasonTheme();
        return (
          <div className={`mb-6 p-3 rounded-2xl ${currentSeason.badgeBg} border ${currentSeason.cardBorder} flex items-center justify-between shrink-0`}>
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-lg shrink-0">{currentSeason.emoji}</span>
              <div className="min-w-0">
                <div className={`text-[11px] font-black ${currentSeason.badgeText} truncate`}>{currentSeason.name}</div>
                <div className="text-[9px] text-slate-400 font-medium truncate">{currentSeason.tagline}</div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* New Entry Action Button */}
      <button
        onClick={() => {
          onNewEntry();
          if (onCloseMobile) onCloseMobile();
        }}
        className="w-full bg-slate-900 text-white font-semibold py-3.5 px-5 rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 mb-6 group shrink-0 active:scale-95 cursor-pointer"
      >
        <i className="fa-solid fa-plus transition-transform group-hover:rotate-90"></i>
        New Entry
      </button>

      {/* Navigation Options */}
      <nav className="space-y-1.5 flex-1">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 py-1">
          Menu & Views
        </div>
        <NavItem view="list" icon="fa-house" label="Timeline" />
        <NavItem view="stats" icon="fa-chart-pie" label="Insights & Trends" />
        <NavItem view="share" icon="fa-share-nodes" label="Share Diary" />

        <button
          onClick={() => {
            onOpenInvite();
            if (onCloseMobile) onCloseMobile();
          }}
          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100/80 border border-indigo-100/70 text-left cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <i className="fa-solid fa-user-plus w-5 text-indigo-600 group-hover:scale-110 transition-transform"></i>
            <span className="font-semibold text-sm">Invite Friends</span>
          </div>
          <span className="text-[9px] font-extrabold bg-indigo-600 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
            Share
          </span>
        </button>
        
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 pt-3 pb-1">
          Tools & Privacy
        </div>

        <button
          onClick={() => {
            if (!isPremium) {
              onUpgradeClick();
            } else {
              onExport();
            }
            if (onCloseMobile) onCloseMobile();
          }}
          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all text-slate-600 hover:bg-slate-100 text-left cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <i className={`fa-solid fa-file-export w-5 ${!isPremium ? 'text-amber-500' : 'text-slate-400'}`}></i>
            <span className="font-semibold text-sm">Backup & Sync</span>
          </div>
          {!isPremium && (
            <span className="text-[9px] text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200/50 flex items-center gap-0.5 font-black uppercase tracking-wide">
              <i className="fa-solid fa-crown text-[7px]"></i> PRO
            </span>
          )}
        </button>

        <button
          onClick={() => {
            onOpenPrivacy();
            if (onCloseMobile) onCloseMobile();
          }}
          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all text-slate-600 hover:bg-slate-100 text-left cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <i className="fa-solid fa-user-shield w-5 text-indigo-500 text-sm"></i>
            <span className="font-semibold text-sm">Privacy & Security</span>
          </div>
        </button>

        <button
          onClick={() => {
            onLock();
            if (onCloseMobile) onCloseMobile();
          }}
          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all text-slate-600 hover:bg-rose-50 hover:text-rose-600 text-left cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <i className="fa-solid fa-lock w-5 text-slate-400 group-hover:text-rose-500 text-sm"></i>
            <span className="font-semibold text-sm">Lock Diary</span>
          </div>
        </button>

        {isInstallable && (
          <button
            onClick={() => {
              handleInstallClick();
              if (onCloseMobile) onCloseMobile();
            }}
            className="w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all text-indigo-600 bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-100 animate-in fade-in duration-300 cursor-pointer mt-2"
          >
            <div className="flex items-center gap-3 font-bold text-sm">
              <i className="fa-solid fa-mobile-screen-button w-5"></i>
              <span>Install WebApp</span>
            </div>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
          </button>
        )}
      </nav>

      {/* Footer / Account card */}
      <div className="mt-auto pt-6 border-t border-slate-100 bg-white shrink-0">
        {/* Paid Active Card */}
        {trialInfo?.isPaid ? (
          <div className="bg-gradient-to-tr from-amber-500/10 to-indigo-500/5 p-3.5 rounded-2xl border border-amber-500/20 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600">
                <i className="fa-solid fa-crown text-xs" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-800">Lumina Pro</span>
                <span className="text-[10px] text-emerald-600 font-bold">● Active Member</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenPrivacy}
              className="text-[10px] font-bold text-slate-600 hover:text-slate-900 bg-white/80 hover:bg-white border border-slate-200/80 px-2 py-1 rounded-lg transition-colors cursor-pointer"
              title="Manage or cancel membership in Settings"
            >
              Manage
            </button>
          </div>
        ) : (
          /* Free / Upgrade Needed Card */
          <div className="bg-gradient-to-tr from-slate-950 via-slate-900 to-[#002c6c] p-4 rounded-3xl border border-sky-800/30 shadow-lg mb-4 flex flex-col gap-2.5">
            <div className="flex items-start gap-2.5 text-white">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border bg-sky-900/40 border-sky-700/50 text-sky-300">
                <i className="fa-solid fa-crown text-xs" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black tracking-tight text-white">
                    {trialInfo?.isCancelled ? 'Membership Cancelled' : 'Unlock Lumina Pro'}
                  </h4>
                  <span className="text-[9px] font-black text-amber-300 bg-amber-950/70 border border-amber-700/60 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                    {trialInfo?.isCancelled ? 'Locked' : 'Pro Pass'}
                  </span>
                </div>
                <p className="text-[10px] text-sky-100/70 mt-0.5 leading-normal">
                  {trialInfo?.isCancelled
                    ? 'Premium features are locked. Reactivate anytime via PayPal for only $2.50.'
                    : 'Unlimited diary pages, AI emotion analytics, and secure cloud sync for $2.50.'}
                </p>
              </div>
            </div>
            
            <button
              onClick={() => {
                onUpgradeClick();
                if (onCloseMobile) onCloseMobile();
              }}
              className="w-full bg-gradient-to-r from-[#003087] via-[#0070BA] to-indigo-600 hover:from-[#00256c] hover:to-indigo-500 transition-all font-black py-2.5 px-3 rounded-xl text-xs text-white shadow-md shadow-blue-900/30 flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <i className="fa-brands fa-paypal text-[#00E5FF] text-xs"></i>
              <span>{trialInfo?.isCancelled ? 'Reactivate ($2.50 via PayPal)' : 'Upgrade to Pro ($2.50 via PayPal)'}</span>
            </button>
          </div>
        )}

        <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
          <div className="w-9 h-9 rounded-full overflow-hidden bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
             <i className="fa-solid fa-user text-xs"></i>
          </div>
          <div className="flex flex-col overflow-hidden">
             <span className="text-xs font-bold text-slate-800 truncate">Your Journey</span>
             <span className="text-[10px] font-medium text-slate-500">
               {entryCount} {entryCount === 1 ? 'entry' : 'entries'} recorded
             </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 border-r bg-white flex flex-col shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div 
            onClick={onCloseMobile}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
          />
          {/* Drawer Panel */}
          <aside className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-300">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};

export default Sidebar;
