
import React, { useState, useEffect } from 'react';
import { DiaryEntry, Mood } from '../types';
import { getWritingPrompt } from '../services/geminiService';
import { compressImage, networkManager } from '../services/networkService';

interface EntryEditorProps {
  entry: DiaryEntry | null;
  onSave: (entry: DiaryEntry) => void;
  triggerToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const moodOptions: { value: Mood; emoji: string; label: string }[] = [
  { value: 'happy', emoji: '😊', label: 'Happy' },
  { value: 'peaceful', emoji: '🧘', label: 'Peaceful' },
  { value: 'excited', emoji: '🤩', label: 'Excited' },
  { value: 'neutral', emoji: '😐', label: 'Neutral' },
  { value: 'tired', emoji: '😴', label: 'Tired' },
  { value: 'anxious', emoji: '😰', label: 'Anxious' },
  { value: 'sad', emoji: '😢', label: 'Sad' },
];

const EntryEditor: React.FC<EntryEditorProps> = ({ entry, onSave, triggerToast }) => {
  const [title, setTitle] = useState(entry?.title || '');
  const [content, setContent] = useState(entry?.content || '');
  const [mood, setMood] = useState<Mood>(entry?.mood || 'neutral');
  const [tags, setTags] = useState<string>(entry?.tags.join(', ') || '');
  const [prompt, setPrompt] = useState<string | null>(null);
  const [isGettingPrompt, setIsGettingPrompt] = useState(false);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [image, setImage] = useState<string | null>(entry?.image || null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [permissionGranting, setPermissionGranting] = useState(false);
  const [storageGranted, setStorageGranted] = useState<boolean>(() => {
    return localStorage.getItem('lumina_storage_granted') === 'true';
  });

  // Camera states
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  const startCamera = async (currentFacing: 'user' | 'environment' = facingMode) => {
    setIsCameraLoading(true);
    setCameraError(null);
    setCapturedPhoto(null);
    
    // Stop any existing streams first
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
    }

    try {
      const constraints = {
        video: { 
          facingMode: currentFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.warn("Video play failed:", e));
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      let errorMsg = "Could not access camera.";
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = "Camera access denied. Please click the padlock icon in your browser address bar to allow browser camera permissions, then try again.";
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMsg = "No camera hardware detected on this device. Try uploading an image instead.";
      } else {
        errorMsg = err.message || "Unable to acquire camera interface. Please verify connection and try again.";
      }
      setCameraError(errorMsg);
      if (triggerToast) {
        triggerToast("Failed to launch camera services", "error");
      }
    } finally {
      setIsCameraLoading(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCapturedPhoto(null);
    setCameraError(null);
    setShowCameraModal(false);
  };

  const handleToggleCamera = () => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  const handleCapturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (facingMode === 'user') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedPhoto(dataUrl);
      }
    }
  };

  const [isCompressingImage, setIsCompressingImage] = useState(false);

  const handleUseCapturedPhoto = async () => {
    if (capturedPhoto) {
      setIsCompressingImage(true);
      try {
        const compressed = await compressImage(capturedPhoto);
        setImage(compressed);
        stopCamera();
        if (triggerToast) {
          triggerToast("📸 Picture optimized & attached to your journey!", "success");
        }
      } catch (err) {
        setImage(capturedPhoto);
        stopCamera();
      } finally {
        setIsCompressingImage(false);
      }
    }
  };

  const handleImageUploadClick = () => {
    if (!storageGranted) {
      setShowPermissionModal(true);
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleGrantPermission = () => {
    setPermissionGranting(true);
    // Simulate beautiful permission checking sequence
    setTimeout(() => {
      setPermissionGranting(false);
      localStorage.setItem('lumina_storage_granted', 'true');
      setStorageGranted(true);
      setShowPermissionModal(false);
      // Let React update DOM before clicking
      setTimeout(() => {
        fileInputRef.current?.click();
      }, 100);
    }, 1200);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        if (triggerToast) {
          triggerToast('Please choose an image file (PNG, JPG, WEBP).', 'error');
        } else {
          alert('Please choose an image file (PNG, JPG, WEBP).');
        }
        return;
      }
      setIsCompressingImage(true);
      try {
        const compressed = await compressImage(file);
        setImage(compressed);
        if (triggerToast) {
          const status = networkManager.getStatus();
          if (status.isSlowConnection) {
            triggerToast('⚡ Photo compressed for lightning-fast slow-network sync!', 'info');
          }
        }
      } catch (err) {
        console.warn('Image compression fallback:', err);
        const reader = new FileReader();
        reader.onloadend = () => {
          setImage(reader.result as string);
        };
        reader.readAsDataURL(file);
      } finally {
        setIsCompressingImage(false);
      }
    }
  };

  useEffect(() => {
    if (!entry) {
      handleGetPrompt();
    }
    return () => {
      // Cleanup any active camera tracks if component is unmounted
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [entry, cameraStream]);

  const handleGetPrompt = async () => {
    setIsGettingPrompt(true);
    try {
      const p = await getWritingPrompt([]);
      setPrompt(p);
    } finally {
      setIsGettingPrompt(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newEntry: DiaryEntry = {
      id: entry?.id || Date.now().toString(),
      date: entry?.date || new Date().toISOString(),
      title: title || 'Untitled Reflection',
      content,
      mood,
      tags: tags.split(',').map(t => t.trim()).filter(t => t !== ''),
      image: image || undefined,
    };
    onSave(newEntry);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl">
        <input 
          type="text" 
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Give your memory a title..."
          className="w-full text-4xl font-bold text-slate-800 placeholder:text-slate-200 focus:outline-none mb-6"
        />

        <div className="flex flex-wrap items-center gap-4 mb-8 pb-8 border-b border-slate-50">
          <label className="text-sm font-bold text-slate-400 uppercase tracking-widest mr-2">Mood:</label>
          <div className="flex flex-wrap gap-2">
            {moodOptions.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setMood(opt.value)}
                className={`flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all ${
                  mood === opt.value 
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 ring-2 ring-indigo-500/20' 
                    : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'
                }`}
              >
                <span className="text-xl">{opt.emoji}</span>
                <span className="text-sm font-medium">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {prompt && (
          <div className="mb-8 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 flex items-start gap-4">
            <i className="fa-solid fa-lightbulb text-indigo-400 mt-1"></i>
            <div>
              <p className="text-sm text-indigo-900 font-medium">Prompt: {prompt}</p>
              <button 
                type="button" 
                onClick={handleGetPrompt}
                className="text-xs text-indigo-500 hover:underline mt-1 font-bold"
              >
                Refresh prompt
              </button>
            </div>
          </div>
        )}

        {/* Image Attachment Row */}
        <div className="mb-8 p-6 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col md:flex-row items-center gap-6 justify-between animate-in fade-in duration-300">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 text-xl shrink-0">
              <i className="fa-solid fa-camera"></i>
            </div>
            <div>
              <h4 className="font-bold text-slate-700 text-sm">Attach or Take a Photo</h4>
              <p className="text-xs text-slate-400 mt-0.5">Complement your reflection with an upload or camera shot.</p>
              {storageGranted && (
                <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md mt-1.5 animate-in slide-in-from-left-2">
                  <i className="fa-solid fa-circle-check text-emerald-500"></i> Storage Access Granted
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            {isCompressingImage ? (
              <div className="w-24 h-24 rounded-2xl bg-indigo-50 border border-indigo-200 flex flex-col items-center justify-center text-indigo-600 text-xs font-bold gap-1 animate-pulse">
                <i className="fa-solid fa-spinner fa-spin text-base"></i>
                <span>Optimizing...</span>
              </div>
            ) : image ? (
              <div className="relative group shrink-0 w-24 h-24 rounded-2xl overflow-hidden border border-slate-200 shadow-md">
                <img src={image} className="w-full h-full object-cover" alt="Attached memory" referrerPolicy="no-referrer" />
                <span className="absolute bottom-1 left-1 bg-slate-900/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded backdrop-blur-sm pointer-events-none">
                  ⚡ Lite
                </span>
                <button
                  type="button"
                  onClick={() => setImage(null)}
                  className="absolute inset-0 bg-slate-900/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-sm font-bold cursor-pointer"
                  title="Remove Image"
                >
                  <i className="fa-solid fa-trash-can text-lg"></i>
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleImageUploadClick}
                  className="w-full sm:w-auto px-5 py-3 bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 font-bold text-xs md:text-sm rounded-xl hover:border-indigo-300 hover:bg-slate-50/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-file-arrow-up text-indigo-500 text-sm"></i>
                  Upload Photo
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowCameraModal(true);
                    startCamera(facingMode);
                  }}
                  className="w-full sm:w-auto px-5 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:brightness-105 hover:shadow-md text-white font-bold text-xs md:text-sm rounded-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-video text-white text-xs"></i>
                  Take Picture
                </button>
              </div>
            )}
          </div>
        </div>

        <textarea 
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="How was your day? Pour your thoughts here..."
          className="w-full min-h-[400px] text-lg font-serif text-slate-700 placeholder:text-slate-300 focus:outline-none resize-none leading-relaxed"
          required
        />
      </div>

      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-lg flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Tags</label>
          <div className="relative">
            <i className="fa-solid fa-tag absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input 
              type="text" 
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="work, gratitude, travel..."
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>
        <button 
          type="submit"
          className="bg-indigo-600 text-white font-bold py-4 px-10 rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95"
        >
          Save Memory
        </button>
      </div>

      {showCameraModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
              <h3 className="text-base font-black text-slate-100 tracking-tight flex items-center gap-2">
                <i className="fa-solid fa-camera text-indigo-400 animate-pulse"></i> Capture Your Journey Photo
              </h3>
              <button 
                type="button" 
                onClick={stopCamera}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 hover:text-slate-100 text-slate-400 transition-colors flex items-center justify-center"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto flex flex-col justify-center items-center bg-slate-950/25 min-h-[300px]">
              {cameraError ? (
                <div className="p-6 bg-rose-950/30 border border-rose-800/40 rounded-2xl text-center max-w-md my-4 space-y-4">
                  <div className="w-12 h-12 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mx-auto text-xl">
                    <i className="fa-solid fa-triangle-exclamation"></i>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-rose-200 text-sm">Failed to access your camera</h4>
                    <p className="text-xs text-rose-300/80 mt-1 leading-relaxed">
                      {cameraError}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 pt-2">
                    <button 
                      type="button" 
                      onClick={() => startCamera(facingMode)}
                      className="w-full py-2.5 bg-rose-600/30 hover:bg-rose-600/40 text-rose-200 border border-rose-500/20 text-xs font-bold rounded-xl transition-all"
                    >
                      <i className="fa-solid fa-arrows-rotate mr-1.5 animate-spin"></i> Retry Camera Services
                    </button>
                    <button 
                      type="button" 
                      onClick={() => { stopCamera(); handleImageUploadClick(); }}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all"
                    >
                      <i className="fa-solid fa-file-arrow-up mr-1.5"></i> Select Memory Photo Upload Instead
                    </button>
                    <button 
                      type="button" 
                      onClick={stopCamera}
                      className="w-full py-2 hover:bg-slate-800/60 text-slate-400 text-xs font-bold rounded-xl transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative w-full aspect-video md:max-w-md bg-slate-950 border border-slate-850 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
                  {isCameraLoading && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900/90 gap-3">
                      <i className="fa-solid fa-spinner fa-spin text-2l text-indigo-400"></i>
                      <span className="text-xs font-bold text-slate-400 tracking-wider">Securing stream connection...</span>
                    </div>
                  )}
                  
                  {capturedPhoto ? (
                    <img 
                      src={capturedPhoto} 
                      alt="Captured memory reflection" 
                      className="w-full h-full object-cover animate-in fade-in duration-300" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <video 
                      ref={videoRef} 
                      className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                      playsInline 
                      muted
                    />
                  )}
                  
                  {/* Real-time Indicator Overlay */}
                  {!capturedPhoto && !isCameraLoading && (
                    <div className="absolute top-3 left-3 bg-indigo-600 border border-indigo-450 text-white flex items-center gap-1.5 px-2.5 py-1 text-[9px] uppercase font-bold tracking-wider rounded-full shadow-md animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-white inline-block animate-ping"></span>
                      <span>Live camera stream</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {!cameraError && (
              <div className="p-5 border-t border-slate-800 flex justify-between items-center bg-slate-950/40">
                {capturedPhoto ? (
                  <div className="flex gap-2 w-full">
                    <button 
                      type="button" 
                      onClick={() => { setCapturedPhoto(null); startCamera(facingMode); }}
                      className="flex-1 py-3 bg-slate-850 hover:bg-slate-800 text-slate-200 font-bold text-xs rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <i className="fa-solid fa-arrow-rotate-left text-[10px]"></i> Retake Photo
                    </button>
                    <button 
                      type="button" 
                      onClick={handleUseCapturedPhoto}
                      className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-950"
                    >
                      <i className="fa-solid fa-circle-check text-[10px]"></i> Keep Photo
                    </button>
                  </div>
                ) : (
                  <div className="flex justify-between items-center w-full">
                    <button 
                      type="button" 
                      onClick={stopCamera}
                      className="py-2.5 px-4 bg-slate-800 hover:bg-slate-705 text-slate-300 text-xs font-bold rounded-xl transition-all active:scale-95"
                    >
                      Cancel
                    </button>
                    
                    <button 
                      type="button" 
                      onClick={handleCapturePhoto}
                      disabled={isCameraLoading}
                      className="relative w-14 h-14 bg-white border-4 border-slate-700 hover:border-indigo-400 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-md group disabled:opacity-50"
                      title="Capture Photo"
                    >
                      <span className="w-10 h-10 bg-indigo-600 group-hover:bg-indigo-500 rounded-full transition-colors inline-block animate-pulse"></span>
                    </button>
                    
                    <button 
                      type="button" 
                      onClick={handleToggleCamera}
                      title="Flip facing direction"
                      className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-indigo-400 text-xs font-bold rounded-xl transition-all active:scale-95 flex items-center gap-1.5 border border-slate-750"
                    >
                      <i className="fa-solid fa-arrows-rotate text-[11px] text-indigo-400 animate-spin-slow"></i>
                      <span className="hidden sm:inline">Flip Camera</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {showPermissionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-100 text-center animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
            <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
            <div className="w-16 h-16 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6 text-indigo-600 text-4xl">
              <i className="fa-solid fa-folder-open animate-pulse"></i>
            </div>
            
            <h3 className="text-2xl font-bold text-slate-800 mb-3">Device Storage Access</h3>
            <p className="text-slate-500 mb-8 leading-relaxed text-sm">
              Lumina Diary requires local device storage access to securely choose, upload, and embed high-resolution photos into your diary entries.
            </p>

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGrantPermission}
                disabled={permissionGranting}
                className="w-full bg-indigo-600 text-white font-bold py-4 px-6 rounded-2xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 disabled:opacity-75"
              >
                {permissionGranting ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                    Requesting Storage Access...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-shield-check mr-1"></i>
                    Grant Storage Access
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowPermissionModal(false)}
                disabled={permissionGranting}
                className="w-full text-slate-400 hover:text-slate-600 font-bold py-3 hover:bg-slate-50 rounded-2xl transition-all text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </form>
  );
};

export default EntryEditor;
