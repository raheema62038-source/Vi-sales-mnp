import React, { useState } from 'react';
import { 
  Download, 
  Sparkles, 
  AlertCircle, 
  ArrowRight, 
  CheckCircle2, 
  Smartphone,
  ExternalLink,
  ShieldCheck,
  X
} from 'lucide-react';
import { AppUpdateConfig } from '../types';
import { AppVersionInfo } from '../config/appVersion';
import { openApkDownloadUrl } from '../services/appUpdateService';

interface AppUpdateModalProps {
  isOpen: boolean;
  installedVersion: AppVersionInfo;
  updateConfig: AppUpdateConfig;
  onDismissLater?: () => void;
  isHindi?: boolean;
}

export const AppUpdateModal: React.FC<AppUpdateModalProps> = ({
  isOpen,
  installedVersion,
  updateConfig,
  onDismissLater,
  isHindi = true
}) => {
  const [isOpeningUrl, setIsOpeningUrl] = useState(false);

  if (!isOpen) return null;

  const isForceUpdate = Boolean(updateConfig.forceUpdate);

  const handleUpdateClick = () => {
    setIsOpeningUrl(true);
    // Open the official / latest APK download URL (Requirement 5)
    // Does NOT automatically install without customer permission (Requirement 6)
    openApkDownloadUrl(updateConfig.apkDownloadUrl);
    setTimeout(() => setIsOpeningUrl(false), 2000);
  };

  const handleLaterClick = () => {
    if (isForceUpdate) return;
    if (onDismissLater) {
      onDismissLater();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={isForceUpdate ? undefined : handleLaterClick}
    >
      <div
        className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200/80 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-red-600 via-red-700 to-rose-700 text-white p-5 relative overflow-hidden">
          <div className="flex items-start justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md text-white flex items-center justify-center font-black border border-white/20 shadow-md">
                <Download className="w-6 h-6 animate-bounce" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-black uppercase tracking-wider mb-1">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  <span>{isHindi ? 'नया अपडेट उपलब्ध है' : 'New Update Available'}</span>
                </div>
                <h3 className="text-lg font-black tracking-tight leading-snug">
                  {isHindi ? 'New Update Available' : 'New Update Available'}
                </h3>
              </div>
            </div>

            {/* Optional Close Button only when forceUpdate is false */}
            {!isForceUpdate && onDismissLater && (
              <button
                type="button"
                id="btn-update-modal-close"
                onClick={handleLaterClick}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                title={isHindi ? 'बाद में (Later)' : 'Later'}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Vi Brand Watermark */}
          <div className="absolute right-[-10px] bottom-[-25px] opacity-15 text-white font-black text-8xl select-none pointer-events-none">
            Vi
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Main Hindi / English Prompt (Requirement 4) */}
          <div className="space-y-1.5">
            <p className="text-base font-black text-slate-900 leading-snug">
              {updateConfig.updateMessage || (isHindi ? 'आपके लिए ऐप का नया version उपलब्ध है।' : 'A new version of the app is available for you.')}
            </p>
            <p className="text-xs text-slate-600 font-medium">
              {isHindi 
                ? 'नया वर्जन डाउनलोड करके तुरंत अपडेट करें ताकि आपको नए फीचर्स और तेज अनुभव मिले।'
                : 'Download and install the latest APK to access enhanced features and performance.'}
            </p>
          </div>

          {/* Version Comparison Info Card */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/60 shadow-2xs">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">
                  {isHindi ? 'मौजूदा वर्जन' : 'Installed Version'}
                </span>
                <span className="font-mono font-bold text-slate-700">
                  v{installedVersion.versionName}
                  <span className="text-[10px] text-slate-400 font-normal ml-1">(Code: {installedVersion.versionCode})</span>
                </span>
              </div>

              <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200/80 shadow-2xs">
                <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider block mb-0.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>{isHindi ? 'नया वर्जन' : 'Latest Version'}</span>
                </span>
                <span className="font-mono font-black text-emerald-900">
                  v{updateConfig.latestVersionName}
                  <span className="text-[10px] text-emerald-700 font-normal ml-1">(Code: {updateConfig.latestVersionCode})</span>
                </span>
              </div>
            </div>

            {/* What's New / Release Notes if provided */}
            {updateConfig.releaseNotes && (
              <div className="pt-2 border-t border-slate-200/70">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">
                  {isHindi ? 'नया क्या है (What’s New):' : 'What’s New:'}
                </span>
                <p className="text-xs text-slate-700 whitespace-pre-line bg-white p-3 rounded-xl border border-slate-100 font-sans leading-relaxed">
                  {updateConfig.releaseNotes}
                </p>
              </div>
            )}
          </div>

          {/* Force Update Notice or Permission Note */}
          {isForceUpdate ? (
            <div className="p-3 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-red-900">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <span className="font-bold block">
                  {isHindi ? 'अनिवार्य अपडेट (Required Update)' : 'Mandatory Update'}
                </span>
                <span className="text-red-700">
                  {isHindi 
                    ? 'ऐप की निरंतर सेवाओं के लिए नया वर्जन इंस्टॉल करना आवश्यक है।' 
                    : 'Updating to this version is required to continue using the application.'}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium px-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                {isHindi 
                  ? 'सुरक्षित डाउनलोड: अपडेट बटन दबाने पर आधिकारिक APK डाउनलोड होगा।' 
                  : 'Safe & Secure: Tapping Update opens the verified official APK link.'}
              </span>
            </div>
          )}

          {/* Action Buttons (Requirements 4, 15, 16) */}
          <div className="pt-1 flex flex-col sm:flex-row items-center gap-2.5">
            {/* "Later" Button: Shown ONLY when forceUpdate is OFF (Requirement 15 & 16) */}
            {!isForceUpdate && (
              <button
                type="button"
                id="btn-update-later"
                onClick={handleLaterClick}
                className="w-full sm:w-1/3 py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold text-xs transition-all cursor-pointer text-center"
              >
                {isHindi ? 'बाद में (Later)' : 'Later'}
              </button>
            )}

            {/* "Update Now" Button: Opens official APK download URL (Requirement 5) */}
            <button
              type="button"
              id="btn-update-now"
              onClick={handleUpdateClick}
              disabled={isOpeningUrl}
              className={`w-full ${!isForceUpdate ? 'sm:w-2/3' : 'sm:w-full'} py-3.5 px-5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 active:scale-95 text-white font-black text-xs shadow-lg shadow-red-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer`}
            >
              <Download className={`w-4 h-4 ${isOpeningUrl ? 'animate-bounce' : ''}`} />
              <span>{isHindi ? 'अभी अपडेट करें (Update Now)' : 'Update Now'}</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
