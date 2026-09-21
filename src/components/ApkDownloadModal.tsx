import React, { useState } from 'react';
import { 
  Smartphone, 
  Download, 
  X, 
  ExternalLink, 
  CheckCircle, 
  FileCode, 
  HelpCircle,
  Copy,
  Check,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { trackAppDownload } from '../services/userService';

interface ApkDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApkDownloadModal: React.FC<ApkDownloadModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const { language } = useLanguage();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [downloadedPackage, setDownloadedPackage] = useState(false);
  const [activeTab, setActiveTab] = useState<'instant' | 'builder' | 'studio'>('instant');

  if (!isOpen) return null;

  const currentAppUrl = window.location.origin;
  const pwaBuilderUrl = `https://www.pwabuilder.com?url=${encodeURIComponent(currentAppUrl)}`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(currentAppUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDirectInstall = async () => {
    trackAppDownload(
      {
        uid: user?.uid,
        email: user?.email,
        displayName: user?.displayName,
        phoneNumber: user?.phoneNumber,
      },
      'PWA 1-Click Install'
    );
    if (isInstallable) {
      await install();
    }
  };

  const handlePwaBuilderDownload = () => {
    trackAppDownload(
      {
        uid: user?.uid,
        email: user?.email,
        displayName: user?.displayName,
        phoneNumber: user?.phoneNumber,
      },
      'PWABuilder APK Generator'
    );
  };

  const handleDownloadAppBundle = () => {
    trackAppDownload(
      {
        uid: user?.uid,
        email: user?.email,
        displayName: user?.displayName,
        phoneNumber: user?.phoneNumber,
      },
      'Direct App Package Download'
    );

    const manifestData = {
      name: 'Vi Sales & MNP Portal',
      short_name: 'Vi MNP',
      description: 'Official Vodafone Idea (Vi) Doorstep SIM & MNP Porting Portal for Mehkar Taluka, Buldhana',
      start_url: window.location.origin,
      display: 'standalone',
      background_color: '#d92d20',
      theme_color: '#d92d20',
      package_id: 'com.vi.salesmnp',
      version: '1.0.0',
      downloaded_at: new Date().toISOString(),
      downloaded_by: user?.email || user?.phoneNumber || 'Customer',
    };

    const blob = new Blob([JSON.stringify(manifestData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vi-sales-mnp-app.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloadedPackage(true);
    setTimeout(() => setDownloadedPackage(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs animate-fadeIn">
      <div 
        className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-red-100 dark:border-slate-800 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-linear-to-r from-red-600 to-red-700 text-white p-4 sm:p-5 rounded-t-2xl flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center border border-white/20 shrink-0">
              <Smartphone className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight leading-snug">
                {language === 'hi' ? 'Android APK & ऐप डाउनलोड' : 'Download Android APK & App'}
              </h2>
              <p className="text-xs text-red-100">
                {language === 'hi' ? 'अपने फोन में Vi Sales MNP ऐप इंस्टॉल करें' : 'Install Vi Sales MNP directly on your Android phone'}
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-850 px-3 pt-2 gap-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('instant')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'instant'
                ? 'border-red-600 text-red-600 dark:text-red-400 font-extrabold'
                : 'border-transparent text-gray-550 hover:text-gray-900 dark:text-gray-400'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{language === 'hi' ? '1-क्लिक इंस्टॉल' : '1-Click Install'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('builder')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'builder'
                ? 'border-red-600 text-red-600 dark:text-red-400 font-extrabold'
                : 'border-transparent text-gray-550 hover:text-gray-900 dark:text-gray-400'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>{language === 'hi' ? 'APK बनाएं (Online)' : 'Online APK Builder'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('studio')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'studio'
                ? 'border-red-600 text-red-600 dark:text-red-400 font-extrabold'
                : 'border-transparent text-gray-550 hover:text-gray-900 dark:text-gray-400'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>{language === 'hi' ? 'Android Studio' : 'Native Code'}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4">
          
          {/* TAB 1: 1-Click Install (WebAPK) */}
          {activeTab === 'instant' && (
            <div className="space-y-4">
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 p-3.5 rounded-xl flex items-start gap-3">
                <span className="text-2xl shrink-0">📱</span>
                <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1">
                  <p className="font-bold">
                    {language === 'hi' 
                      ? 'अनुशंसा: सबसे आसान व सुरक्षित तरीका (WebAPK)' 
                      : 'Recommended: Fastest & Safest Method (WebAPK)'}
                  </p>
                  <p className="leading-relaxed">
                    {language === 'hi'
                      ? 'Android Chrome से सीधे 1-टैप में इंस्टॉल करें। यह बिना किसी अज्ञात APK फ़ाइल के आपके फोन में असली ऐप (WebAPK) की तरह होम स्क्रीन पर जुड़ जाता है।'
                      : 'Install directly via Android Chrome. Google Play Services packages it automatically into a verified WebAPK with full standalone screen and auto-updates.'}
                  </p>
                </div>
              </div>

              {isInstalled ? (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div className="text-xs text-emerald-900 dark:text-emerald-200">
                    <p className="font-bold text-sm">
                      {language === 'hi' ? 'ऐप पहले से इंस्टॉल है!' : 'App Already Installed!'}
                    </p>
                    <p>{language === 'hi' ? 'आप वर्तमान में इसे ऐप मोड में चला रहे हैं।' : 'You are currently running the app in standalone mode.'}</p>
                  </div>
                </div>
              ) : isInstallable ? (
                <button
                  type="button"
                  onClick={handleDirectInstall}
                  className="w-full py-3 px-4 bg-linear-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold text-sm rounded-xl shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 transition-all active:scale-98"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>{language === 'hi' ? 'फ़ोन में तुरंत इंस्टॉल करें (1-Click)' : 'Install on Android Phone (1-Click)'}</span>
                </button>
              ) : (
                <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 space-y-3">
                  <h3 className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-red-600" />
                    {language === 'hi' ? 'Chrome ब्राउज़र में 3 डॉट्स से इंस्टॉल करें:' : 'How to install via Chrome Browser:'}
                  </h3>
                  <ol className="text-xs text-gray-650 dark:text-gray-300 space-y-2 pl-4 list-decimal leading-relaxed">
                    <li>
                      {language === 'hi' 
                        ? 'अपने Android फोन में Chrome में यह लिंक खोलें।' 
                        : 'Open this website link in Chrome on your Android phone.'}
                    </li>
                    <li>
                      {language === 'hi'
                        ? 'ऊपर दाईं ओर 3 डॉट्स (⋮) मेन्यू बटन पर टैप करें।'
                        : 'Tap the top-right 3 dots (⋮) menu button.'}
                    </li>
                    <li>
                      {language === 'hi'
                        ? 'सूची में "Install app" (ऐप इंस्टॉल करें) या "Add to Home screen" चुनें।'
                        : 'Tap "Install app" or "Add to Home screen".'}
                    </li>
                    <li>
                      {language === 'hi'
                        ? '"Install" दबाएं। ऐप तुरंत आपके फोन के ऐप्स मेन्यू में आ जाएगी।'
                        : 'Tap "Install". The app will appear in your Android app drawer immediately.'}
                    </li>
                  </ol>
                </div>
              )}

              {/* Direct App Package Download Button */}
              <button
                type="button"
                onClick={handleDownloadAppBundle}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                <Download className="w-4 h-4" />
                <span>
                  {downloadedPackage 
                    ? (language === 'hi' ? 'ऐप पैकेज डाउनलोड हो गया!' : 'App Package Downloaded!') 
                    : (language === 'hi' ? 'सीधे ऐप पैकेज डाउनलोड करें (Trackable)' : 'Download App Package (.json manifest)')}
                </span>
              </button>

              {/* Share URL */}
              <div className="pt-2">
                <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">
                  {language === 'hi' ? 'ऐप का लाइव लिंक (अपने फोन पर खोलें):' : 'Live App URL (Open on your phone):'}
                </p>
                <div className="flex items-center gap-2 bg-gray-100 dark:bg-slate-800 p-2 rounded-lg border border-gray-200 dark:border-slate-700">
                  <span className="text-xs text-gray-700 dark:text-gray-300 truncate flex-1 font-mono">
                    {currentAppUrl}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="px-2.5 py-1 bg-white dark:bg-slate-700 hover:bg-gray-50 text-gray-800 dark:text-gray-200 rounded-md text-xs font-semibold shadow-xs border border-gray-200 dark:border-slate-650 flex items-center gap-1 shrink-0 active:scale-95"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? (language === 'hi' ? 'कॉपी हुआ!' : 'Copied!') : (language === 'hi' ? 'कॉपी' : 'Copy')}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PWABuilder Online APK Generator */}
          {activeTab === 'builder' && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 p-3.5 rounded-xl text-xs text-blue-900 dark:text-blue-200 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  {language === 'hi' ? 'PWABuilder से सीधे .APK फ़ाइल बनाएं' : 'Build standalone .APK via PWABuilder'}
                </p>
                <p className="leading-relaxed">
                  {language === 'hi'
                    ? 'Microsoft / Google समर्थित PWABuilder आपके इस ऐप के PWA Manifest से तैयार हस्ताक्षरित (Signed) Android APK व AAB बंडल मुफ्त में डाउनलोड कराता है।'
                    : 'PWABuilder automatically packages this application into a signed Android APK and AAB ready for side-loading or Google Play Store.'}
                </p>
              </div>

              <div className="space-y-2 text-xs text-gray-650 dark:text-gray-300">
                <p className="font-bold text-gray-800 dark:text-gray-200">
                  {language === 'hi' ? 'APK डाउनलोड करने के 3 आसान चरण:' : '3 Simple Steps to Download APK:'}
                </p>
                <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 space-y-2">
                  <div className="flex gap-2 items-start">
                    <span className="w-5 h-5 rounded-full bg-red-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
                    <p>{language === 'hi' ? 'नीचे दिए गए बटन से PWABuilder खोलें।' : 'Click the button below to open PWABuilder.'}</p>
                  </div>
                  <div className="flex gap-2 items-start">
                    <span className="w-5 h-5 rounded-full bg-red-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                    <p>{language === 'hi' ? '"Package for Stores" या "Android" पर क्लिक करें।' : 'Click "Package for Stores" > "Android".'}</p>
                  </div>
                  <div className="flex gap-2 items-start">
                    <span className="w-5 h-5 rounded-full bg-red-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
                    <p>{language === 'hi' ? '"Download APK" पर क्लिक करके APK फ़ाइल अपने फोन में सेव करें।' : 'Click "Download Package" or "Download APK" to save the .apk file.'}</p>
                  </div>
                </div>
              </div>

              <a
                href={pwaBuilderUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handlePwaBuilderDownload}
                className="w-full py-3 px-4 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                <span>{language === 'hi' ? 'PWABuilder पर APK जनरेट करें' : 'Generate APK on PWABuilder'}</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}

          {/* TAB 3: Native Android Studio Code */}
          {activeTab === 'studio' && (
            <div className="space-y-4">
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 p-3.5 rounded-xl text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  {language === 'hi' ? 'पूर्ण Android प्रोजेक्ट पहले से तैयार है!' : 'Native Android project is already included!'}
                </p>
                <p className="leading-relaxed">
                  {language === 'hi'
                    ? 'प्रोजेक्ट के अंदर Capacitor आधारित सम्पूर्ण `android/` फोल्डर मौजूद है जिसमें Package ID: `com.vi.salesmnp` कॉन्फ़िगर है।'
                    : 'The project includes a ready-to-compile `android/` project configured with package `com.vi.salesmnp`.'}
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-slate-800 p-3.5 rounded-xl border border-gray-200 dark:border-slate-700 space-y-2 text-xs">
                <p className="font-bold text-gray-800 dark:text-gray-200">
                  {language === 'hi' ? 'Android Studio में APK कैसे बनाएं:' : 'How to build APK in Android Studio:'}
                </p>
                <ol className="space-y-1.5 pl-4 list-decimal text-gray-650 dark:text-gray-300 leading-relaxed">
                  <li>
                    {language === 'hi' 
                      ? 'AI Studio ऊपर मेन्यू से "Export to ZIP" पर क्लिक करें।' 
                      : 'Click "Export to ZIP" from AI Studio top menu.'}
                  </li>
                  <li>
                    {language === 'hi'
                      ? 'ZIP खोलें और `android` फोल्डर को Android Studio में Open करें।'
                      : 'Unzip and open the `android` folder in Android Studio.'}
                  </li>
                  <li>
                    {language === 'hi'
                      ? 'मेन्यू में जाएं: Build > Build Bundle(s) / APK(s) > Build APK(s)'
                      : 'Go to Menu: Build > Build Bundle(s) / APK(s) > Build APK(s)'}
                  </li>
                  <li>
                    {language === 'hi'
                      ? 'बिल्ड पूरा होने पर `app-debug.apk` फ़ाइल प्राप्त करें।'
                      : 'Locate `app-debug.apk` inside `android/app/build/outputs/apk/debug/`.'}
                  </li>
                </ol>
              </div>

              <div className="bg-slate-900 text-slate-100 p-3 rounded-xl font-mono text-[11px] overflow-x-auto space-y-1">
                <p className="text-gray-400 text-[10px] uppercase font-sans font-bold">Terminal Command:</p>
                <p className="text-emerald-400 font-bold">cd android && ./gradlew assembleDebug</p>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-gray-50 dark:bg-slate-850 rounded-b-2xl border-t border-gray-200 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-slate-700 dark:hover:bg-slate-650 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-bold transition-colors"
          >
            {language === 'hi' ? 'बंद करें' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
