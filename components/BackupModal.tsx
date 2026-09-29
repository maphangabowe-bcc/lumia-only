import React, { useState, useEffect, useRef } from 'react';
import { DiaryEntry } from '../types';
import { 
  initAuth, 
  googleSignIn, 
  logout, 
  uploadBackupToDrive, 
  getAccessToken,
  setCachedToken
} from '../services/googleDriveService';
import { User } from 'firebase/auth';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: DiaryEntry[];
  onLocalExport: () => void;
  onLocalImport: (entries: DiaryEntry[]) => void;
  isPremium?: boolean;
  onUpgradeClick?: () => void;
}

const BackupModal: React.FC<BackupModalProps> = ({ 
  isOpen, 
  onClose, 
  entries, 
  onLocalExport, 
  onLocalImport,
  isPremium = true,
  onUpgradeClick = () => {}
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [successInfo, setSuccessInfo] = useState<{ name: string; id: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [permissionGranting, setPermissionGranting] = useState(false);
  const [storageGranted, setStorageGranted] = useState<boolean>(() => {
    return localStorage.getItem('lumina_storage_granted') === 'true';
  });

  const handleImportClick = () => {
    if (!storageGranted) {
      setShowPermissionModal(true);
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleGrantPermission = () => {
    setPermissionGranting(true);
    setTimeout(() => {
      setPermissionGranting(false);
      localStorage.setItem('lumina_storage_granted', 'true');
      setStorageGranted(true);
      setShowPermissionModal(false);
      setTimeout(() => {
        fileInputRef.current?.click();
      }, 100);
    }, 1200);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
        setErrorMsg('Please select a valid JSON backup file.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) {
            onLocalImport(parsed);
            onClose();
          } else {
            setErrorMsg('Invalid backup format. File must contain diary entries.');
          }
        } catch (err) {
          setErrorMsg('Error reading backup file. Make sure it is a valid JSON file.');
        }
      };
      reader.readAsText(file);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setStatus('idle');
      setSuccessInfo(null);
      setErrorMsg(null);
    }

    // Check if we are already signed in in this active session
    const checkSessionToken = async () => {
      const token = await getAccessToken();
      if (token && authUser) {
        setAccessToken(token);
      }
    };

    const authUser = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
      },
      () => {
        setUser(null);
        setAccessToken(null);
      }
    );

    checkSessionToken();

    return () => {
      authUser();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setErrorMsg(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to authenticate with Google');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setAccessToken(null);
      setStatus('idle');
    } catch (err) {
      console.error(err);
    }
  };

  const handleBackupToDrive = async () => {
    if (!accessToken) {
      // Prompt sign in if token expired or is not cached
      try {
        setIsLoggingIn(true);
        const result = await googleSignIn();
        if (result) {
          setUser(result.user);
          setAccessToken(result.accessToken);
          performUpload(result.accessToken);
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Please sign in with Google to authorize backup.');
      } finally {
        setIsLoggingIn(false);
      }
      return;
    }

    performUpload(accessToken);
  };

  const performUpload = async (token: string) => {
    setStatus('saving');
    setErrorMsg(null);
    try {
      const result = await uploadBackupToDrive(token, entries);
      setSuccessInfo({ name: result.name, id: result.id });
      setStatus('success');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Fail to upload backup to Google Drive');
      setStatus('error');
    }
  };

  if (!isOpen) return null;

  if (!isPremium) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-4 border border-slate-100 relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-50 transition-all cursor-pointer"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
          
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center text-2xl mx-auto shadow-sm">
            <i className="fa-solid fa-lock"></i>
          </div>

          <div className="space-y-1">
            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 font-extrabold text-[9px] uppercase tracking-wider inline-flex items-center gap-1">
              <i className="fa-solid fa-crown text-[8px]" /> Premium Feature
            </span>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">
              Vault & Cloud Backup Locked
            </h3>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
            Your free trial has ended. Backing up to Google Drive and exporting diary data requires Lumina Premium ($2.50).
          </p>

          <div className="pt-2 space-y-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onUpgradeClick();
              }}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-700 hover:to-sky-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-md shadow-cyan-100 flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <i className="fa-solid fa-crown text-amber-300"></i>
              <span>Unlock Premium ($2.50 via Paystack)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 text-xs text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-[36px] shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
        <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
          <div className="flex justify-between items-start mb-6">
            <h3 id="backup-modal-title" className="text-2xl font-bold text-slate-800 flex items-center gap-2.5">
              <span className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                <i className="fa-solid fa-cloud-arrow-up"></i>
              </span>
              Backup Your Memories
            </h3>
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <i className="fa-solid fa-xmark text-sm"></i>
            </button>
          </div>

          <p className="text-slate-500 text-sm mb-6 leading-relaxed">
            Ensure your personal reflections and memories are never lost by exporting them. You can download a backup locally, or securely upload your backup file directly to your Google Drive account.
          </p>

          <div className="space-y-4 mb-8">
            {/* Option 1: Local Backup */}
            <div className="p-4 border border-slate-100 rounded-2xl bg-slate-50/55 hover:bg-slate-50 hover:border-slate-200 transition-all flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-200/50 flex items-center justify-center text-slate-600">
                  <i className="fa-solid fa-file-arrow-down text-base"></i>
                </div>
                <div>
                  <h4 className="font-bold text-slate-700 text-sm">Local File Export</h4>
                  <p className="text-[11px] text-slate-400">Save a JSON backup to your computer or device.</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => {
                  onLocalExport();
                  onClose();
                }}
                className="px-4 py-2 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-600 hover:text-indigo-600 font-bold text-xs rounded-xl hover:shadow-sm active:scale-95 transition-all"
              >
                Download
              </button>
            </div>

            {/* Option 2: Local File Import */}
            <div className="p-4 border border-slate-100 rounded-2xl bg-slate-50/55 hover:bg-slate-50 hover:border-slate-200 transition-all flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-200/50 flex items-center justify-center text-slate-600">
                  <i className="fa-solid fa-file-arrow-up text-base"></i>
                </div>
                <div>
                  <h4 className="font-bold text-slate-700 text-sm">Local File Import</h4>
                  <p className="text-[11px] text-slate-400">Restore your diary entries from a saved backup file.</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={handleImportClick}
                className="px-4 py-2 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-600 hover:text-indigo-600 font-bold text-xs rounded-xl hover:shadow-sm active:scale-95 transition-all"
              >
                Upload File
              </button>
            </div>

            {/* Option 3: Google Drive Backup */}
            <div className="p-5 border border-indigo-50 rounded-2xl bg-indigo-50/10 hover:bg-indigo-50/30 transition-all">
              <div className="flex items-center gap-3 justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500 text-xl">
                    <i className="fa-brands fa-google-drive"></i>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-700 text-sm">Save to Google Drive</h4>
                    <p className="text-[11px] text-slate-400">Securely store your backups on Google Drive.</p>
                  </div>
                </div>
              </div>

              {user ? (
                <div className="space-y-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm animate-in fade-in duration-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {user.photoURL ? (
                        <img 
                          src={user.photoURL} 
                          alt={user.displayName || "Google User"} 
                          className="w-8 h-8 rounded-full border border-slate-100"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                          {user.displayName?.[0] || 'U'}
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-bold text-slate-700 leading-none">{user.displayName}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 leading-none">{user.email}</p>
                      </div>
                    </div>
                    <button 
                      onClick={handleLogout}
                      className="text-[10px] uppercase font-bold tracking-wider text-rose-500 hover:text-rose-700 hover:underline"
                    >
                      Sign Out
                    </button>
                  </div>

                  {status === 'saving' ? (
                    <div className="flex items-center justify-center py-2 text-indigo-600 font-bold text-sm gap-2 animate-pulse">
                      <i className="fa-solid fa-spinner fa-spin"></i>
                      Uploading backup to Google Drive...
                    </div>
                  ) : status === 'success' ? (
                    <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl space-y-1.5 animate-in slide-in-from-bottom-2">
                      <p className="text-xs font-bold flex items-center gap-1.5">
                        <i className="fa-solid fa-circle-check text-emerald-600"></i> Backup Saved Successfully!
                      </p>
                      <p className="text-[10px] text-emerald-600/80 font-mono break-all leading-tight">
                        File name: {successInfo?.name}
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={handleBackupToDrive}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl text-xs shadow-md shadow-indigo-100 transition-all flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <i className="fa-solid fa-cloud-arrow-up"></i>
                      Upload Backup file Now
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center py-2">
                  <button 
                    onClick={handleGoogleLogin}
                    disabled={isLoggingIn}
                    className="gsi-material-button w-full"
                    style={{
                      backgroundColor: 'white',
                      border: '1px solid #dadce0',
                      borderRadius: '12px',
                      boxSizing: 'border-box',
                      color: '#3c4043',
                      cursor: 'pointer',
                      fontFamily: '"Google Sans",arial,sans-serif',
                      fontSize: '14px',
                      height: '46px',
                      letterSpacing: '0.25px',
                      outline: 'none',
                      overflow: 'hidden',
                      position: 'relative',
                      textAlign: 'center',
                      verticalAlign: 'middle',
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 12px',
                      transition: 'background-color .218s, border-color .218s, box-shadow .218s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {isLoggingIn ? (
                        <>
                          <i className="fa-solid fa-spinner fa-spin text-indigo-500"></i>
                          <span>Connecting...</span>
                        </>
                      ) : (
                        <>
                          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block', width: '20px', height: '20px' }}>
                            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                            <path fill="none" d="M0 0h48v48H0z"></path>
                          </svg>
                          <span className="font-bold text-sm">Sign in with Google</span>
                        </>
                      )}
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 rounded-2xl text-xs font-bold mb-4 flex items-center gap-2 animate-in slide-in-from-bottom-2">
              <i className="fa-solid fa-circle-exclamation text-rose-500 text-sm"></i>
              {errorMsg}
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button 
              onClick={onClose}
              className="px-6 py-3 bg-slate-100 text-slate-500 hover:text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept=".json" 
        className="hidden" 
      />

      {showPermissionModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-100 text-center animate-in zoom-in-95 duration-350 max-h-[90vh] flex flex-col">
            <div className="p-8 overflow-y-auto flex-1 custom-scrollbar flex flex-col items-center">
              <div className="w-16 h-16 bg-indigo-100 border border-indigo-200 rounded-2xl flex items-center justify-center mb-6 text-indigo-600 text-3xl shrink-0">
                <i className="fa-solid fa-folder-open text-indigo-500"></i>
              </div>
              
              <h3 className="text-xl font-black text-slate-800 mb-2">Device Storage Permission</h3>
              <p className="text-slate-400 mb-6 leading-relaxed text-xs">
                Lumina requires local file-system and storage permissions on your device to choose, import, or save your diary backup data.
              </p>

              <div className="space-y-3 w-full">
                <button
                  type="button"
                  onClick={handleGrantPermission}
                  disabled={permissionGranting}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3.5 px-6 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 disabled:opacity-75 active:scale-95"
                >
                  {permissionGranting ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin mr-1"></i>
                      Assigning Storage Access Rights...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-shield-check mr-1 text-emerald-300"></i>
                      Grant File Access
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPermissionModal(false)}
                  disabled={permissionGranting}
                  className="w-full text-slate-400 hover:text-slate-600 font-bold py-2 rounded-xl transition-all text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackupModal;
