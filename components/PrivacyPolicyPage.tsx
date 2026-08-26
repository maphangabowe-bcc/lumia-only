import React from 'react';
import { motion } from 'motion/react';

interface PrivacyPolicyPageProps {
  onBack: () => void;
}

export const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-slate-50 overflow-y-auto font-sans flex flex-col">
      {/* Header Bar */}
      <header className="px-6 py-4 border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-10 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full border border-slate-100 hover:bg-slate-50 text-slate-500 hover:text-indigo-600 transition-all flex items-center justify-center bg-white shadow-sm"
            title="Back to Journal"
          >
            <i className="fa-solid fa-arrow-left text-sm"></i>
          </button>
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md shadow-indigo-100">
              <i className="fa-solid fa-book-open text-white text-xs"></i>
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-800 leading-none">Lumina Diary</h1>
              <p className="text-[9px] text-slate-400 mt-0.5 font-bold tracking-wider uppercase">Private Sanctuary</p>
            </div>
          </div>
        </div>

        <button
          onClick={onBack}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-100/40 active:scale-95 transition-all flex items-center gap-1.5"
        >
          <i className="fa-solid fa-chevron-left text-[9px]"></i>
          Back to Journal
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-5 py-12 md:py-16">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white rounded-[32px] border border-slate-100 shadow-xl overflow-hidden p-8 md:p-12 space-y-10"
        >
          {/* Top Banner */}
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-indigo-50 border border-indigo-100/50 rounded-2xl flex items-center justify-center text-indigo-600 text-3xl mx-auto shadow-md shadow-indigo-100/30">
              <i className="fa-solid fa-user-shield text-indigo-500"></i>
            </div>
            <div className="space-y-1.5">
              <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight leading-tight">
                Privacy Policy
              </h2>
              <p className="text-slate-400 text-xs md:text-sm font-medium">
                Our strict, uncompromised commitment to your personal safety and data confidentiality.
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-full text-[10px] font-extrabold tracking-wider uppercase">
              <i className="fa-solid fa-shield-check"></i> Active Shield Protected
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Absolute Commitment */}
          <div className="bg-indigo-50/60 rounded-3xl p-6 border border-indigo-100/40 flex items-start gap-4">
            <div className="w-10 h-10 bg-white border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 text-lg shrink-0 shadow-sm">
              <i className="fa-solid fa-hands-holding-heart"></i>
            </div>
            <div className="space-y-1.5 text-sm">
              <h3 className="font-extrabold text-slate-800">Your Privacy is Absolute</h3>
              <p className="text-slate-500 leading-relaxed text-xs">
                Lumina Diary is designed from the ground up as a private sanctuary. We operate under a strict, uncompromised commitment to user confidentiality and local sovereignty. We do not track, profile, monetize, or harvest your personal reflections.
              </p>
            </div>
          </div>

          {/* Policy Sections */}
          <div className="space-y-8 text-slate-600 text-xs leading-relaxed md:text-[13px]">
            {/* Section 1 */}
            <div className="space-y-3">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2.5 pb-2 border-b border-slate-50">
                <span className="w-6 h-6 bg-slate-100 text-slate-700 rounded-lg flex items-center justify-center text-[10px] font-black">1</span>
                Local Offline Sovereignty
              </h3>
              <p className="pl-8 text-slate-500">
                Your journal entries, uploaded snapshots, custom audio logs, mood selections, and lock passwords reside strictly in your device's browser space (<strong className="text-slate-800 font-semibold">Local Storage</strong>). Lumina never uploads your reflections to an external cloud without your manual backup request. Everything is saved inside your local database, meaning no outside server or entity ever gets access to your daily logs.
              </p>
            </div>

            {/* Section 2 */}
            <div className="space-y-3">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2.5 pb-2 border-b border-slate-50">
                <span className="w-6 h-6 bg-slate-100 text-slate-700 rounded-lg flex items-center justify-center text-[10px] font-black">2</span>
                Secure AI Features
              </h3>
              <p className="pl-8 text-slate-500">
                Lumina offers dynamic morning intentions, smart journal prompts, and emotional insight trends powered by Gemini AI. To preserve utmost security, <strong className="text-slate-800 font-semibold">your actual written diary entry bodies are processed with extreme confidentiality</strong>. AI features are built on custom privacy proxies to analyze entries safely on the server side without retaining user records. Only the mood metadata or manual polish requests are routed to the API. Your records are never parsed or collected for training models.
              </p>
            </div>

            {/* Section 3 */}
            <div className="space-y-3">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2.5 pb-2 border-b border-slate-50">
                <span className="w-6 h-6 bg-slate-100 text-slate-700 rounded-lg flex items-center justify-center text-[10px] font-black">3</span>
                Custody of Backups & Export File Formats
              </h3>
              <p className="pl-8 text-slate-500">
                Data exports (backups) are generated as secure, readable JSON files locally on your computer. You hold complete custody over where these files are stored, imported, or transferred. We have no backend capability to view, recover, modify, or access your backup vaults. If you lose your password or erase your browser storage without a local backup, your diaries will be permanently lost to preserve confidentiality.
              </p>
            </div>

            {/* Section 4 */}
            <div className="space-y-3">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2.5 pb-2 border-b border-slate-50">
                <span className="w-6 h-6 bg-slate-100 text-slate-700 rounded-lg flex items-center justify-center text-[10px] font-black">4</span>
                Right to Deletion and Full Application Reset
              </h3>
              <p className="pl-8 text-slate-500">
                You possess absolute ownership over your data. Inside the Privacy settings of your diary, you can execute a full Application Reset with a single click. This action instantly wipes all local databases, cached images, and access passwords from your browser space forever, executing your complete right to erasure securely.
              </p>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Contact Support */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs">
            <div className="text-slate-400 font-mono font-medium">
              Last Updated: July 2026 • Version 1.0.1
            </div>
            <button
              onClick={onBack}
              className="text-indigo-600 hover:text-indigo-700 font-extrabold flex items-center gap-1 bg-transparent border-none outline-none cursor-pointer"
            >
              Back to safe workspace <i className="fa-solid fa-arrow-right text-[10px]"></i>
            </button>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-slate-400 text-xs border-t border-slate-100 bg-white">
        <p>© {new Date().getFullYear()} Lumina Diary. Your memories remain completely your own.</p>
      </footer>
    </div>
  );
};
