import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: any;
  triggerToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const TEMPLATES = [
  {
    id: 'mindful',
    title: 'Mindfulness & Peace',
    icon: 'fa-feather-pointed',
    message: "I've been using Lumina Diary for mindful self-reflection and daily thoughts. Join me and start your own private sanctuary: "
  },
  {
    id: 'privacy',
    title: 'Private & Secure',
    icon: 'fa-shield-halved',
    message: "Looking for a completely private, encrypted personal journal? Check out Lumina Diary with me: "
  },
  {
    id: 'habits',
    title: 'Daily Journaling Buddy',
    icon: 'fa-heart',
    message: "Let's build a daily journaling habit together on Lumina Diary! Here is my personal invite to start: "
  }
];

export const InviteModal: React.FC<InviteModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  triggerToast
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(0);
  const [customMessage, setCustomMessage] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('lumina_custom_invite_msg');
      return saved !== null ? saved : TEMPLATES[0].message;
    } catch {
      return TEMPLATES[0].message;
    }
  });
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedFull, setCopiedFull] = useState(false);
  const [activeTab, setActiveTab] = useState<'link' | 'qr' | 'milestones'>('link');
  const [invitedCount, setInvitedCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('lumina_invited_shares_count');
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });

  const referralCode = currentUser?.uid 
    ? currentUser.uid.slice(0, 8).toUpperCase()
    : 'SANCTUARY';
  
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://luminadiary.app';
  const inviteUrl = `${baseUrl}?ref=${referralCode}`;
  
  const trimmedMessage = customMessage.trim();
  const fullShareText = trimmedMessage 
    ? `${trimmedMessage} ${inviteUrl}`
    : inviteUrl;

  const handleMessageChange = (newMsg: string) => {
    setCustomMessage(newMsg);
    try {
      localStorage.setItem('lumina_custom_invite_msg', newMsg);
    } catch (e) {
      console.warn('Could not save custom message', e);
    }
  };

  const handleSelectTemplate = (idx: number) => {
    setSelectedTemplate(idx);
    const tmplMsg = TEMPLATES[idx].message;
    handleMessageChange(tmplMsg);
  };

  const handleResetToTemplate = () => {
    const idx = selectedTemplate !== null ? selectedTemplate : 0;
    const defaultMsg = TEMPLATES[idx].message;
    handleMessageChange(defaultMsg);
    triggerToast('Reset message to template default', 'info');
  };

  const recordShareAction = () => {
    const nextCount = invitedCount + 1;
    setInvitedCount(nextCount);
    try {
      localStorage.setItem('lumina_invited_shares_count', nextCount.toString());
    } catch (e) {
      console.warn('Could not save invite count', e);
    }
  };

  const copyTextToClipboard = async (text: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  };

  const handleCopyLink = async () => {
    try {
      await copyTextToClipboard(inviteUrl);
      setCopiedLink(true);
      recordShareAction();
      triggerToast('🎉 Invite link copied to clipboard!', 'success');
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (err) {
      console.error('Failed to copy link:', err);
      triggerToast('Could not copy link. Please manually copy the URL.', 'error');
    }
  };

  const handleCopyFullMessage = async () => {
    try {
      await copyTextToClipboard(fullShareText);
      setCopiedFull(true);
      recordShareAction();
      triggerToast('📋 Full invitation message & link copied!', 'success');
      setTimeout(() => setCopiedFull(false), 2500);
    } catch (err) {
      console.error('Failed to copy message:', err);
      triggerToast('Could not copy text. Please try again.', 'error');
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Lumina Diary',
          text: trimmedMessage,
          url: inviteUrl
        });
        recordShareAction();
        triggerToast('✨ Thank you for sharing Lumina Diary!', 'success');
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    } else {
      handleCopyFullMessage();
    }
  };

  const handleShareFacebook = () => {
    recordShareAction();
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(inviteUrl)}&quote=${encodeURIComponent(fullShareText)}`;
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=500');
  };

  const handleShareWhatsApp = () => {
    recordShareAction();
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(fullShareText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleShareTelegram = () => {
    recordShareAction();
    const url = `https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(trimmedMessage)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleShareTwitter = () => {
    recordShareAction();
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(fullShareText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleShareEmail = () => {
    recordShareAction();
    const subject = encodeURIComponent("You're invited to Lumina Diary — Private Sanctuary");
    const body = encodeURIComponent(fullShareText);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleShareSMS = () => {
    recordShareAction();
    const body = encodeURIComponent(fullShareText);
    window.location.href = `sms:?&body=${body}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 md:p-8 pb-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-gradient-to-b from-indigo-50/40 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-xl shadow-lg shadow-indigo-200">
              <i className="fa-solid fa-users"></i>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">
                Invite Friends
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Share the gift of mindful journaling & personal sanctuary
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
            title="Close modal"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 px-6 shrink-0 bg-slate-50/40">
          <button
            onClick={() => setActiveTab('link')}
            className={`flex-1 py-3 text-xs font-bold border-b-2 transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'link' 
                ? 'border-indigo-600 text-indigo-600' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <i className="fa-solid fa-paper-plane text-[11px]"></i>
            Share Link & Apps
          </button>
          <button
            onClick={() => setActiveTab('qr')}
            className={`flex-1 py-3 text-xs font-bold border-b-2 transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'qr' 
                ? 'border-indigo-600 text-indigo-600' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <i className="fa-solid fa-qrcode text-[11px]"></i>
            In-Person QR
          </button>
          <button
            onClick={() => setActiveTab('milestones')}
            className={`flex-1 py-3 text-xs font-bold border-b-2 transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'milestones' 
                ? 'border-indigo-600 text-indigo-600' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <i className="fa-solid fa-award text-[11px]"></i>
            Sanctuary Circle
            {invitedCount > 0 && (
              <span className="px-1.5 py-0.2 bg-indigo-100 text-indigo-700 text-[10px] font-black rounded-full">
                {invitedCount}
              </span>
            )}
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {activeTab === 'link' && (
            <div className="space-y-6">
              {/* Personalized Link Box */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 pl-1 flex items-center justify-between">
                  <span>Your Personal Invite Link</span>
                  <span className="text-indigo-600 font-mono text-[10px]">Code: {referralCode}</span>
                </label>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-2xl p-1.5 pl-4 focus-within:border-indigo-500 focus-within:bg-white transition-all">
                  <i className="fa-solid fa-link text-indigo-500 text-xs shrink-0"></i>
                  <input 
                    type="text"
                    readOnly
                    value={inviteUrl}
                    className="w-full bg-transparent text-slate-700 font-mono text-xs outline-none truncate"
                  />
                  <button
                    id="copy-invite-link-btn"
                    onClick={handleCopyLink}
                    className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                      copiedLink 
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' 
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 active:scale-95'
                    }`}
                  >
                    <i className={`fa-solid ${copiedLink ? 'fa-check' : 'fa-copy'}`}></i>
                    <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                </div>
              </div>

              {/* Editable Invitation Message Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pl-1">
                  <label htmlFor="custom-invite-message" className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <i className="fa-solid fa-pen-to-square text-indigo-500 text-xs"></i>
                    <span>Invitation Message</span>
                    <span className="text-[10px] font-medium text-slate-400 normal-case">(tap to edit)</span>
                  </label>
                  {customMessage !== (selectedTemplate !== null ? TEMPLATES[selectedTemplate].message : TEMPLATES[0].message) && (
                    <button
                      id="reset-invite-message-btn"
                      onClick={handleResetToTemplate}
                      className="text-[11px] text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Reset to template default"
                    >
                      <i className="fa-solid fa-rotate-left text-[10px]"></i>
                      <span>Reset</span>
                    </button>
                  )}
                </div>

                {/* Template Preset Buttons */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider pl-1">
                    Quick Templates
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {TEMPLATES.map((tmpl, idx) => {
                      const isSelected = selectedTemplate === idx;
                      return (
                        <button
                          key={tmpl.id}
                          id={`template-btn-${tmpl.id}`}
                          onClick={() => handleSelectTemplate(idx)}
                          className={`p-2.5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-1 cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-50/80 border-indigo-300 text-indigo-900 shadow-sm ring-1 ring-indigo-200'
                              : 'bg-white border-slate-200/80 hover:border-slate-300 text-slate-600 hover:bg-slate-50/60'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <i className={`fa-solid ${tmpl.icon} ${isSelected ? 'text-indigo-600' : 'text-slate-400'} text-xs`}></i>
                            {isSelected && (
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                            )}
                          </div>
                          <span className="text-[11px] font-bold leading-tight truncate w-full">{tmpl.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Message Textarea */}
                <div className="relative bg-white border border-slate-200 rounded-2xl p-3 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all shadow-sm">
                  <textarea
                    id="custom-invite-message"
                    rows={3}
                    value={customMessage}
                    onChange={(e) => handleMessageChange(e.target.value)}
                    placeholder="Write your custom invitation message here..."
                    className="w-full bg-transparent text-slate-800 text-xs leading-relaxed resize-none outline-none placeholder:text-slate-400 font-sans"
                  />
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <i className="fa-solid fa-wand-magic-sparkles text-indigo-400"></i>
                      Your personal link is automatically attached
                    </span>
                    <span className="font-mono">{customMessage.length} chars</span>
                  </div>
                </div>

                {/* Message Preview & Quick Copy */}
                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs space-y-2 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <i className="fa-regular fa-eye text-indigo-500"></i>
                      Recipient View Preview
                    </span>
                    <button
                      id="copy-full-invitation-btn"
                      onClick={handleCopyFullMessage}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        copiedFull
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-700 active:scale-95'
                      }`}
                    >
                      <i className={`fa-solid ${copiedFull ? 'fa-check' : 'fa-copy'} text-[10px]`}></i>
                      <span>{copiedFull ? 'Copied Message!' : 'Copy Full Message'}</span>
                    </button>
                  </div>
                  <div className="text-slate-700 italic leading-relaxed text-[11px] bg-white/70 p-2.5 rounded-xl border border-slate-100 select-text">
                    "{fullShareText}"
                  </div>
                </div>
              </div>

              {/* Quick Share Buttons */}
              <div className="space-y-3">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 pl-1">
                  Send Directly Via
                </label>
                
                {typeof navigator !== 'undefined' && 'share' in navigator && (
                  <button
                    onClick={handleNativeShare}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                  >
                    <i className="fa-solid fa-share-nodes"></i>
                    <span>Open Phone Share Sheet</span>
                  </button>
                )}

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  <button
                    onClick={handleShareFacebook}
                    className="p-3 rounded-2xl bg-blue-50 hover:bg-blue-100 border border-blue-200/60 text-blue-900 font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm"
                  >
                    <i className="fa-brands fa-facebook text-xl text-blue-600"></i>
                    <span className="text-[10px] font-bold">Facebook</span>
                  </button>

                  <button
                    onClick={handleShareEmail}
                    className="p-3 rounded-2xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/60 text-indigo-900 font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm"
                  >
                    <i className="fa-solid fa-envelope text-xl text-indigo-600"></i>
                    <span className="text-[10px] font-bold">Email</span>
                  </button>

                  <button
                    onClick={handleShareWhatsApp}
                    className="p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60 text-emerald-900 font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm"
                  >
                    <i className="fa-brands fa-whatsapp text-xl text-emerald-600"></i>
                    <span className="text-[10px] font-bold">WhatsApp</span>
                  </button>

                  <button
                    onClick={handleShareTelegram}
                    className="p-3 rounded-2xl bg-sky-50 hover:bg-sky-100 border border-sky-200/60 text-sky-900 font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm"
                  >
                    <i className="fa-brands fa-telegram text-xl text-sky-500"></i>
                    <span className="text-[10px] font-bold">Telegram</span>
                  </button>

                  <button
                    onClick={handleShareSMS}
                    className="p-3 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-200/60 text-amber-900 font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm"
                  >
                    <i className="fa-solid fa-comment-sms text-xl text-amber-600"></i>
                    <span className="text-[10px] font-bold">SMS / Text</span>
                  </button>

                  <button
                    onClick={handleShareTwitter}
                    className="p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-200/70 text-slate-800 font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm"
                  >
                    <i className="fa-brands fa-x-twitter text-xl text-slate-800"></i>
                    <span className="text-[10px] font-bold">X / Twitter</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'qr' && (
            <div className="flex flex-col items-center text-center space-y-5">
              <div className="p-6 bg-white border-2 border-indigo-100 rounded-3xl shadow-xl shadow-indigo-100/40 relative">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(inviteUrl)}&color=312e81`}
                  alt="Lumina Diary Invite QR Code"
                  className="w-48 h-48 rounded-xl object-contain"
                  onError={(e) => {
                    // Fallback visual if third party is offline
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center pointer-events-none opacity-0">
                  {/* Invisible container to preserve sizing */}
                  <div className="w-48 h-48"></div>
                </div>
              </div>

              <div className="space-y-1 max-w-xs">
                <h4 className="text-sm font-bold text-slate-800">Scan to Open Lumina</h4>
                <p className="text-xs text-slate-400">
                  Have your friend point their phone camera at this QR code to immediately open your invite.
                </p>
              </div>

              <div className="w-full bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center justify-between text-xs text-slate-600 font-mono">
                <span className="truncate pr-2">{inviteUrl}</span>
                <button
                  id="copy-qr-invite-link-btn"
                  onClick={handleCopyLink}
                  className="text-indigo-600 font-bold hover:underline shrink-0 cursor-pointer"
                >
                  {copiedLink ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'milestones' && (
            <div className="space-y-5">
              {/* Stats Card */}
              <div className="bg-gradient-to-tr from-indigo-900 via-slate-900 to-indigo-950 p-6 rounded-3xl text-white shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-amber-400 text-lg">
                      <i className="fa-solid fa-sparkles"></i>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold">Sanctuary Circle</h3>
                      <p className="text-[11px] text-indigo-200/70">Friends Welcomed</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-black text-white">{invitedCount}</span>
                    <span className="text-[10px] block text-indigo-300 uppercase font-bold">Shares</span>
                  </div>
                </div>

                <div className="p-3 bg-white/10 rounded-2xl border border-white/10 text-xs text-indigo-100 leading-relaxed flex items-center gap-2.5">
                  <i className="fa-solid fa-heart text-rose-400 text-sm shrink-0"></i>
                  <span>Journaling is 3x more fulfilling when practiced alongside thoughtful friends and loved ones!</span>
                </div>
              </div>

              {/* Badges Checklist */}
              <div className="space-y-2.5">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 pl-1">
                  Community Badges
                </h4>

                <div className={`p-4 rounded-2xl border flex items-center gap-3.5 transition-all ${
                  invitedCount >= 1 
                    ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900' 
                    : 'bg-slate-50 border-slate-100 text-slate-400 opacity-60'
                }`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                    invitedCount >= 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-400'
                  }`}>
                    <i className="fa-solid fa-seedling"></i>
                  </div>
                  <div className="flex-1">
                    <h5 className="text-xs font-bold text-slate-800">Seed of Kindness</h5>
                    <p className="text-[11px] text-slate-500">Shared Lumina Diary with at least 1 friend</p>
                  </div>
                  {invitedCount >= 1 && (
                    <i className="fa-solid fa-circle-check text-emerald-500 text-lg"></i>
                  )}
                </div>

                <div className={`p-4 rounded-2xl border flex items-center gap-3.5 transition-all ${
                  invitedCount >= 3 
                    ? 'bg-indigo-50/50 border-indigo-200 text-indigo-900' 
                    : 'bg-slate-50 border-slate-100 text-slate-400 opacity-60'
                }`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                    invitedCount >= 3 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-400'
                  }`}>
                    <i className="fa-solid fa-hands-holding-circle"></i>
                  </div>
                  <div className="flex-1">
                    <h5 className="text-xs font-bold text-slate-800">Sanctuary Circle Leader</h5>
                    <p className="text-[11px] text-slate-500">Invited 3 or more friends to reflect</p>
                  </div>
                  {invitedCount >= 3 && (
                    <i className="fa-solid fa-circle-check text-indigo-500 text-lg"></i>
                  )}
                </div>

                <div className={`p-4 rounded-2xl border flex items-center gap-3.5 transition-all ${
                  invitedCount >= 5 
                    ? 'bg-amber-50/50 border-amber-200 text-amber-900' 
                    : 'bg-slate-50 border-slate-100 text-slate-400 opacity-60'
                }`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                    invitedCount >= 5 ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-400'
                  }`}>
                    <i className="fa-solid fa-crown text-amber-500"></i>
                  </div>
                  <div className="flex-1">
                    <h5 className="text-xs font-bold text-slate-800">Mindfulness Ambassador</h5>
                    <p className="text-[11px] text-slate-500">Spread mindful journaling across your network</p>
                  </div>
                  {invitedCount >= 5 && (
                    <i className="fa-solid fa-circle-check text-amber-500 text-lg"></i>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <i className="fa-solid fa-shield-halved text-indigo-500"></i>
            <span>No email spam • 100% private to each user</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
};
