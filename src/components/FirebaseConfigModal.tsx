import React, { useState } from 'react';
import { 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Copy, 
  ExternalLink, 
  Save, 
  Trash2,
  Key,
  Globe,
  Check
} from 'lucide-react';
import { 
  getActiveFirebaseConfig, 
  saveCustomFirebaseConfig, 
  clearCustomFirebaseConfig,
  verifyFirebaseWebConfig
} from '../firebase';
import { FirebaseConfigOptions } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface FirebaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  isFirestoreConnected: boolean;
}

export const FirebaseConfigModal: React.FC<FirebaseConfigModalProps> = ({
  isOpen,
  onClose,
  isFirestoreConnected,
}) => {
  const { language, setLanguage, t } = useLanguage();
  const currentConfig = getActiveFirebaseConfig();
  
  const [apiKey, setApiKey] = useState(currentConfig?.apiKey || '');
  const [projectId, setProjectId] = useState(currentConfig?.projectId || '');
  const [authDomain, setAuthDomain] = useState(currentConfig?.authDomain || '');
  const [storageBucket, setStorageBucket] = useState(currentConfig?.storageBucket || '');
  const [messagingSenderId, setMessagingSenderId] = useState(currentConfig?.messagingSenderId || '');
  const [appId, setAppId] = useState(currentConfig?.appId || '');
  const [jsonInput, setJsonInput] = useState('');
  const [showJsonMode, setShowJsonMode] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleJsonPaste = () => {
    try {
      setErrorMsg('');
      let clean = jsonInput.trim();
      // If user pasted "const firebaseConfig = { ... };"
      if (clean.includes('{') && clean.includes('}')) {
        const start = clean.indexOf('{');
        const end = clean.lastIndexOf('}') + 1;
        clean = clean.substring(start, end);
      }
      // Replace unquoted keys if any
      const formatted = clean
        .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":')
        .replace(/'/g, '"');
      const parsed = JSON.parse(formatted);

      if (parsed.apiKey) setApiKey(parsed.apiKey);
      if (parsed.projectId) setProjectId(parsed.projectId);
      if (parsed.authDomain) setAuthDomain(parsed.authDomain);
      if (parsed.storageBucket) setStorageBucket(parsed.storageBucket);
      if (parsed.messagingSenderId) setMessagingSenderId(parsed.messagingSenderId);
      if (parsed.appId) setAppId(parsed.appId);

      setShowJsonMode(false);
    } catch (e: any) {
      setErrorMsg(`${t.settings.jsonParseError} ` + e.message);
    }
  };

  const handleSave = () => {
    if (!apiKey.trim() || !projectId.trim()) {
      setErrorMsg(t.settings.apiKeyRequiredError);
      return;
    }

    // Gracefully handle Android App ID by ensuring web SDK has a compatible Web App ID
    let safeAppId = appId.trim();
    if (!safeAppId || safeAppId.includes(':android:')) {
      safeAppId = '1:1064518972558:web:bc6ad9ca16f166fa2245df';
    }

    const newConfig: FirebaseConfigOptions = {
      apiKey: apiKey.trim(),
      projectId: projectId.trim(),
      authDomain: authDomain.trim() || `${projectId.trim()}.firebaseapp.com`,
      storageBucket: storageBucket.trim() || `${projectId.trim()}.firebasestorage.app`,
      messagingSenderId: messagingSenderId.trim() || '1064518972558',
      appId: safeAppId,
    };

    const validation = verifyFirebaseWebConfig(newConfig);
    if (!validation.isValid) {
      setErrorMsg(validation.error || 'अमान्य कॉन्फ़िगरेशन');
      return;
    }

    saveCustomFirebaseConfig(newConfig);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleClear = () => {
    if (confirm(t.settings.resetConfirm)) {
      clearCustomFirebaseConfig();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl border border-gray-100 flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-4 sm:p-5 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shadow-xs">
              <Globe className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold">{t.settings.modalTitle}</h2>
              <p className="text-xs text-red-100">{t.settings.modalSubtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-5 text-sm text-gray-700 flex-1">
          
          {/* SECTION 1: App Language Switcher in Settings */}
          <div className="bg-red-50/50 p-4 rounded-2xl border border-red-100 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-red-600" />
                <h3 className="font-extrabold text-gray-900 text-xs sm:text-sm">
                  {t.settings.languageHeading}
                </h3>
              </div>
              <span className="text-[10px] font-bold uppercase bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                {language === 'hi' ? 'हिन्दी सक्रिय' : 'English Active'}
              </span>
            </div>
            
            <p className="text-[11px] text-gray-600">
              {t.settings.languageSubheading}
            </p>

            {/* Language Selection Radio Cards */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {/* Hindi Option */}
              <button
                type="button"
                onClick={() => setLanguage('hi')}
                className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                  language === 'hi'
                    ? 'bg-white border-red-500 shadow-md ring-2 ring-red-400/40 text-red-950'
                    : 'bg-white/80 border-gray-200 text-gray-700 hover:bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xl">🇮🇳</span>
                  {language === 'hi' && (
                    <span className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    </span>
                  )}
                </div>
                <div className="mt-2">
                  <div className="font-bold text-xs text-gray-900">
                    {t.settings.hindiName}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">
                    {t.settings.hindiSubtitle}
                  </div>
                </div>
              </button>

              {/* English Option */}
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                  language === 'en'
                    ? 'bg-white border-red-500 shadow-md ring-2 ring-red-400/40 text-red-950'
                    : 'bg-white/80 border-gray-200 text-gray-700 hover:bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xl">🇬🇧</span>
                  {language === 'en' && (
                    <span className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    </span>
                  )}
                </div>
                <div className="mt-2">
                  <div className="font-bold text-xs text-gray-900">
                    {t.settings.englishName}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">
                    {t.settings.englishSubtitle}
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* SECTION 2: Firebase Connection Settings */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-gray-700" />
                <h3 className="font-bold text-gray-900 text-xs sm:text-sm">
                  {t.settings.firebaseHeading}
                </h3>
              </div>
              <span className="text-[11px] text-gray-500">Firestore</span>
            </div>

            {/* Status Indicator */}
            <div className={`p-3 rounded-xl border flex items-start gap-2.5 ${
              isFirestoreConnected 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              {isFirestoreConnected ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-bold text-xs">
                  {isFirestoreConnected 
                    ? t.settings.activeStatusConnected 
                    : t.settings.activeStatusDisconnected}
                </p>
                <p className="text-[11px] mt-0.5 opacity-90">
                  {isFirestoreConnected 
                    ? `Project ID: ${currentConfig?.projectId || 'Configured'} • "leads" collection synced.`
                    : 'Configure your Firebase project credentials below to enable cloud synchronization.'}
                </p>
              </div>
            </div>

            {savedSuccess && (
              <div className="p-2.5 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{t.settings.savedToast}</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Quick Paste JSON Toggle */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-semibold text-gray-600">{t.settings.firebaseSubheading}</span>
              <button
                type="button"
                onClick={() => setShowJsonMode(!showJsonMode)}
                className="text-xs text-red-600 hover:text-red-700 font-medium underline"
              >
                {showJsonMode ? t.settings.manualModeBtn : t.settings.pasteJsonModeBtn}
              </button>
            </div>

            {showJsonMode ? (
              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-700">
                  {t.settings.pasteJsonModeBtn}:
                </label>
                <textarea
                  rows={4}
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder={t.settings.jsonPlaceholder}
                  className="w-full p-2.5 text-xs font-mono bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleJsonPaste}
                  className="w-full py-2 bg-gray-900 text-white rounded-xl text-xs font-medium hover:bg-black transition-colors"
                >
                  {t.settings.parseJsonBtn}
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {t.settings.projectIdLabel} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    placeholder="e.g. vi-sales-mnp-leads"
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {t.settings.apiKeyLabel} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      {t.settings.authDomainLabel}
                    </label>
                    <input
                      type="text"
                      value={authDomain}
                      onChange={(e) => setAuthDomain(e.target.value)}
                      placeholder="project-id.firebaseapp.com"
                      className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      {t.settings.appIdLabel}
                    </label>
                    <input
                      type="text"
                      value={appId}
                      onChange={(e) => setAppId(e.target.value)}
                      placeholder="1:123456789:web:abcdef"
                      className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 rounded-b-2xl flex items-center justify-between gap-3">
          {currentConfig ? (
            <button
              type="button"
              onClick={handleClear}
              className="px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t.settings.resetDefaultBtn}</span>
            </button>
          ) : <div />}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-200 rounded-xl transition-colors"
            >
              {t.settings.closeBtn}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{t.settings.saveConfigBtn}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
