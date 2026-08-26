import React, { useState, useEffect } from 'react';
import { Mood } from '../types';
import { getDailyAffirmation } from '../services/geminiService';

interface DailyAffirmationProps {
  lastMood: Mood;
  isPremium: boolean;
  onUpgradeClick?: () => void;
}

const DailyAffirmation: React.FC<DailyAffirmationProps> = ({ lastMood, isPremium, onUpgradeClick }) => {
  const [affirmation, setAffirmation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<string>('default');
  const [showManualGuide, setShowManualGuide] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lumina_morning_notifications_enabled');
      return saved !== 'false';
    }
    return true;
  });
  const [scheduleTime, setScheduleTime] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lumina_notification_time');
      return saved || '08:00';
    }
    return '08:00';
  });
  const [usedAffirmations, setUsedAffirmations] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lumina_used_affirmations');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  const checkPermissionState = () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    } else {
      setNotificationPermission('unsupported');
    }
  };

  useEffect(() => {
    checkPermissionState();
    const savedAffirmation = typeof window !== 'undefined' ? localStorage.getItem('lumina_current_affirmation') : null;
    const savedDate = typeof window !== 'undefined' ? localStorage.getItem('lumina_current_affirmation_date') : null;
    const todayStr = new Date().toDateString();

    if (savedAffirmation && savedDate === todayStr) {
      setAffirmation(savedAffirmation);
    } else {
      handleRefresh();
    }
  }, []);

  // Daily checker to trigger the push notification at the scheduled time
  useEffect(() => {
    if (!isPremium || notificationPermission !== 'granted' || !notificationsEnabled) return;

    const checkAndSendDailyNotification = async () => {
      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`;

      if (currentTimeStr === scheduleTime) {
        const todayStr = now.toDateString(); // e.g. "Thu Jul 16 2026"
        const lastSentDate = localStorage.getItem('lumina_last_notification_sent_date');

        if (lastSentDate !== todayStr) {
          localStorage.setItem('lumina_last_notification_sent_date', todayStr);
          try {
            const currentUsed: string[] = typeof window !== 'undefined' && localStorage.getItem('lumina_used_affirmations')
              ? JSON.parse(localStorage.getItem('lumina_used_affirmations')!)
              : usedAffirmations;

            const result = await getDailyAffirmation(lastMood, currentUsed);
            setAffirmation(result);
            sendNotification(result, true);
            
            // Update used affirmations history
            const updatedUsed = [result, ...currentUsed.filter(item => item.toLowerCase().trim() !== result.toLowerCase().trim())].slice(0, 250);
            setUsedAffirmations(updatedUsed);
            localStorage.setItem('lumina_used_affirmations', JSON.stringify(updatedUsed));
            localStorage.setItem('lumina_current_affirmation', result);
            localStorage.setItem('lumina_current_affirmation_date', todayStr);
          } catch (e) {
            console.error("Scheduled daily notification fetch failed:", e);
            const fallback = "I am worthy of growth, calm clarity, and quiet joy today.";
            setAffirmation(fallback);
            sendNotification(fallback, true);
          }
        }
      }
    };

    // Run check immediately and periodically
    checkAndSendDailyNotification();
    const interval = setInterval(checkAndSendDailyNotification, 30000);

    return () => clearInterval(interval);
  }, [notificationPermission, notificationsEnabled, scheduleTime, lastMood, usedAffirmations]);

  const sendNotification = (text: string, force: boolean = false) => {
    if (!isPremium) return;
    if (!force && !notificationsEnabled) return;
    if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') return;

    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SHOW_NOTIFICATION',
        title: 'Morning Intent 🌅',
        body: text
      });
    } else {
      try {
        new Notification('Morning Intent 🌅', {
          body: text,
          icon: '/icon.png'
        });
      } catch (e) {
        console.warn('Fallback standard notification failed:', e);
      }
    }
  };

  const toggleNotifications = () => {
    const nextState = !notificationsEnabled;
    setNotificationsEnabled(nextState);
    if (typeof window !== 'undefined') {
      localStorage.setItem('lumina_morning_notifications_enabled', String(nextState));
    }
    if (nextState) {
      sendNotification("Morning intent notifications are active! 🌅", true);
    }
  };

  const requestPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        if (permission === 'granted') {
          sendNotification("Lumina mobile notifications are now active! 🌅", true);
        }
      } catch (e) {
        console.error('Failed to request notification permission:', e);
      }
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const currentUsed: string[] = typeof window !== 'undefined' && localStorage.getItem('lumina_used_affirmations')
        ? JSON.parse(localStorage.getItem('lumina_used_affirmations')!)
        : usedAffirmations;

      const result = await getDailyAffirmation(lastMood, currentUsed);
      setAffirmation(result);
      
      // Update used affirmations history and current day cache
      const updatedUsed = [result, ...currentUsed.filter(item => item.toLowerCase().trim() !== result.toLowerCase().trim())].slice(0, 250);
      setUsedAffirmations(updatedUsed);
      if (typeof window !== 'undefined') {
        localStorage.setItem('lumina_used_affirmations', JSON.stringify(updatedUsed));
        localStorage.setItem('lumina_current_affirmation', result);
        localStorage.setItem('lumina_current_affirmation_date', new Date().toDateString());
      }

      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        sendNotification(result);
      }
    } catch (e) {
      console.error(e);
      const fallback = "I am worthy of growth, calm clarity, and quiet joy today.";
      setAffirmation(fallback);
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        sendNotification(fallback);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="daily-affirmation-card" className="bg-white border border-indigo-100 rounded-[32px] p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
      <div className="absolute -top-4 -right-4 w-20 h-20 bg-indigo-50 rounded-full opacity-50 group-hover:scale-150 transition-transform"></div>
      
      <div className="relative z-10 flex flex-col gap-3">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex flex-shrink-0 items-center justify-center text-white shadow-lg shadow-indigo-100">
            <i className={`fa-solid ${loading ? 'fa-spinner fa-spin' : 'fa-quote-left'}`}></i>
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-1">Morning Intent</p>
            <p className="text-slate-800 font-serif text-lg leading-relaxed">
              {affirmation || "Finding the right words for your day..."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              id="refresh-affirmation-button"
              onClick={handleRefresh}
              className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-full transition-all"
              title="Refresh Affirmation"
              disabled={loading}
            >
              <i className={`fa-solid fa-rotate-right text-xs ${loading ? 'animate-spin' : ''}`}></i>
            </button>
          </div>
        </div>

        {/* Push Notification Section */}
        {notificationPermission !== 'unsupported' && (
          <div className="border-t border-slate-100/80 pt-4 mt-2 flex flex-col gap-3 text-xs">
            {!isPremium ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 bg-indigo-50/40 border border-indigo-100/50 rounded-2xl">
                <div className="flex items-center gap-2.5 text-left">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shrink-0">
                    <i className="fa-solid fa-crown text-xs"></i>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                      Morning Intent Notifications
                      <span className="px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 font-extrabold text-[8px] uppercase tracking-wider">
                        Premium
                      </span>
                    </h4>
                    <p className="text-slate-500 text-[10px] leading-normal mt-0.5">
                      Receive your beautiful daily affirmation as a system alert every morning.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onUpgradeClick}
                  className="sm:self-center px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer text-[11px] flex items-center justify-center gap-1.5 shrink-0 animate-pulse"
                >
                  <i className="fa-solid fa-crown text-[10px]"></i>
                  Unlock Notifications
                </button>
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <i className="fa-solid fa-bell text-indigo-500 text-sm"></i>
                <div className="flex flex-col">
                  <span className="font-semibold text-slate-600">
                    {notificationPermission === 'granted' ? (
                      <span className="text-emerald-600 font-bold flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${notificationsEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
                        Mobile Notifications {notificationsEnabled ? 'Active' : 'Muted'}
                      </span>
                    ) : notificationPermission === 'denied' ? (
                      <span className="text-rose-500 font-medium flex items-center gap-1.5">
                        <i className="fa-solid fa-circle-exclamation"></i>
                        Blocked in browser settings
                      </span>
                    ) : (
                      <span className="text-slate-500 font-medium">
                        Receive your morning intent as a system alert
                      </span>
                    )}
                  </span>
                  {notificationPermission === 'granted' && (
                    <span className="text-slate-400 text-[10px]">
                      {notificationsEnabled ? 'Daily alerts are enabled.' : 'Daily alerts are currently turned off.'}
                    </span>
                  )}
                  {notificationPermission === 'denied' && (
                    <span className="text-slate-400 text-[10px]">
                      Requires manual activation in browser permissions.
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {notificationPermission === 'default' && (
                  <>
                    <button
                      type="button"
                      onClick={requestPermission}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
                    >
                      Enable Notifications
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowManualGuide(!showManualGuide)}
                      className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 font-medium rounded-xl transition-all"
                      title="Show manual instructions"
                    >
                      How?
                    </button>
                  </>
                )}

                {notificationPermission === 'denied' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowManualGuide(!showManualGuide)}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl transition-all active:scale-95 cursor-pointer"
                    >
                      {showManualGuide ? 'Hide Instructions' : 'Manual Setup Guide'}
                    </button>
                    <button
                      type="button"
                      onClick={checkPermissionState}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-xl transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                      title="Re-check browser permission status"
                    >
                      <i className="fa-solid fa-rotate-right text-[10px]"></i>
                      Verify State
                    </button>
                  </>
                )}

                {notificationPermission === 'granted' && (
                  <div className="flex items-center gap-3">
                    {/* Sliding Toggle Switch */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Alerts</span>
                      <button
                        type="button"
                        onClick={toggleNotifications}
                        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          notificationsEnabled ? 'bg-indigo-600' : 'bg-slate-200'
                        }`}
                        title={notificationsEnabled ? "Switch off notifications" : "Switch on notifications"}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            notificationsEnabled ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {notificationsEnabled && (
                      <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-right-1 duration-200">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Time</span>
                        <input
                          type="time"
                          value={scheduleTime}
                          onChange={(e) => {
                            const newTime = e.target.value;
                            setScheduleTime(newTime);
                            if (typeof window !== 'undefined') {
                              localStorage.setItem('lumina_notification_time', newTime);
                            }
                          }}
                          className="px-2 py-1 bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100/60 rounded-lg text-slate-700 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] shadow-sm cursor-pointer transition-colors"
                        />
                      </div>
                    )}

                    {/* Test Push button removed for users */}
                  </div>
                )}
              </div>
            </div>

            {/* Manual Instruction Guide Block */}
            {showManualGuide && (
              <div className="mt-2 p-3.5 bg-slate-50 border border-slate-100 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-200 text-slate-600 leading-relaxed text-xs">
                <p className="font-bold text-indigo-950 mb-1.5 flex items-center gap-1">
                  <i className="fa-solid fa-circle-info text-indigo-500"></i>
                  Manual Notification Guide
                </p>
                <ol className="list-decimal pl-4.5 space-y-1 text-[11px]">
                  <li>
                    Look at your address bar and click the <strong>site settings icon</strong> (usually a lock <i className="fa-solid fa-lock text-[10px]"></i> or toggle sliders next to the website address).
                  </li>
                  <li>
                    Find the <strong>Notifications</strong> option and switch it to <strong>Allow</strong>.
                  </li>
                  <li>
                    On mobile devices (like iOS/Safari), you must first use the "Share" menu to <strong>Add to Home Screen</strong>, then launch the app from your home screen to enable push options.
                  </li>
                </ol>
                <div className="mt-2.5 pt-2.5 border-t border-slate-200/60 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-400 font-medium">Changed it? Tap verify to load instantly.</span>
                  <button
                    type="button"
                    onClick={() => {
                      checkPermissionState();
                      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                        setShowManualGuide(false);
                      }
                    }}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors shadow-sm text-[11px]"
                  >
                    Verify Connection
                  </button>
                </div>
              </div>
            )}
          </>
        )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyAffirmation;
