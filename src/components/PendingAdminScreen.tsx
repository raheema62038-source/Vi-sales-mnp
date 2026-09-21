import React, { useState } from 'react';
import { 
  ShieldAlert, 
  RotateCw, 
  LogOut, 
  Clock, 
  Phone, 
  User, 
  MapPin, 
  FileText,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export const PendingAdminScreen: React.FC = () => {
  const { user, userProfile, refreshProfile, logout } = useAuth();
  const { language, t } = useLanguage();

  const [checking, setChecking] = useState(false);

  const handleRefresh = async () => {
    setChecking(true);
    try {
      await refreshProfile();
    } finally {
      setTimeout(() => setChecking(false), 500);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-600 via-red-700 to-red-800 flex flex-col justify-between p-4 text-white font-sans">
      {/* Top Bar */}
      <div className="flex items-center justify-between max-w-md mx-auto w-full pt-2">
        <div className="flex items-center gap-1.5 text-xs text-red-100">
          <span className="font-black text-amber-300">Vi</span>
          <span>4G / 5G Plus • Admin Verification</span>
        </div>
        <button
          type="button"
          onClick={logout}
          className="flex items-center gap-1 text-xs text-red-200 hover:text-white bg-white/10 px-2.5 py-1 rounded-full border border-white/20"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>{t.header.logout}</span>
        </button>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md mx-auto my-4 bg-white text-gray-900 rounded-3xl shadow-2xl p-5 sm:p-6 border border-red-100">
        
        {/* Header Icon & Title */}
        <div className="text-center pb-3 border-b border-gray-100">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border-2 border-amber-300 mb-2">
            <Clock className="w-7 h-7 animate-pulse" />
          </div>
          <h2 className="text-lg font-black text-gray-900">
            {language === 'hi' ? 'Rubi Owner स्वीकृति लंबित है' : 'Rubi Owner Approval Pending'}
          </h2>
          <p className="text-xs text-amber-700 font-semibold mt-0.5">
            {language === 'hi'
              ? 'Admin Dashboard एक्सेस के लिए Rubi Owner की अनुमति आवश्यक है'
              : 'Rubi Owner permission required for Admin Dashboard'}
          </p>
        </div>

        {/* Workflow Stepper */}
        <div className="my-4 bg-gray-50 p-3.5 rounded-2xl border border-gray-200 space-y-2.5">
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
            {language === 'hi' ? 'सत्यापन प्रक्रिया (Workflow)' : 'Verification Workflow'}
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between text-emerald-700 font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>1. {language === 'hi' ? 'मोबाइल नंबर सत्यापन' : 'Mobile Number OTP'}</span>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                ✓ Verified
              </span>
            </div>

            <div className="flex items-center justify-between text-emerald-700 font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>2. {language === 'hi' ? 'Admin अनुरोध सबमिट' : 'Admin Request Submitted'}</span>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                ✓ Submitted
              </span>
            </div>

            <div className="flex items-center justify-between text-amber-700 font-bold bg-amber-50/80 p-1.5 rounded-xl border border-amber-200">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600 animate-spin" />
                <span>3. {language === 'hi' ? 'Rubi Owner स्वीकृति (Approval)' : 'Rubi Owner Approval'}</span>
              </div>
              <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                ⏳ Pending
              </span>
            </div>

            <div className="flex items-center justify-between text-gray-400 font-medium">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-gray-300" />
                <span>4. {language === 'hi' ? 'Admin Dashboard अनलॉक' : 'Admin Dashboard Unlock'}</span>
              </div>
              <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                Locked
              </span>
            </div>
          </div>
        </div>

        {/* User Request Summary */}
        <div className="bg-red-50/60 border border-red-100 rounded-2xl p-3.5 mb-4 text-xs space-y-1.5">
          <div className="flex items-center gap-1.5 text-gray-700">
            <User className="w-3.5 h-3.5 text-red-600" />
            <span className="font-bold">{userProfile?.displayName || user?.displayName || 'Admin Applicant'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-600">
            <Phone className="w-3.5 h-3.5 text-red-600" />
            <span>{userProfile?.phone || user?.phoneNumber || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-600">
            <MapPin className="w-3.5 h-3.5 text-red-600" />
            <span>Circle: {userProfile?.assignedCircle || 'Vi Circle'}</span>
          </div>
          {userProfile?.requestNote && (
            <div className="flex items-start gap-1.5 text-gray-600 pt-1 border-t border-red-100">
              <FileText className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
              <span className="italic text-[11px]">"{userProfile.requestNote}"</span>
            </div>
          )}
        </div>

        {/* Information Notice */}
        <div className="text-[11px] text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-200 mb-4">
          <span className="font-bold text-gray-800">
            {language === 'hi' ? 'सुरक्षा नियम:' : 'Security Directive:'}
          </span>{' '}
          {language === 'hi'
            ? 'बिना Admin / Owner की स्वीकृति के किसी भी उपयोगकर्ता को सभी लीड्स या Admin Dashboard का एक्सेस नहीं दिया जा सकता।'
            : 'Access to all portal leads and the Admin Dashboard is strictly restricted until approval is confirmed.'}
        </div>

        {/* Check Status Button */}
        <button
          type="button"
          onClick={handleRefresh}
          disabled={checking}
          className="w-full py-2.5 bg-red-600 hover:bg-red-700 active:scale-98 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 mb-3 disabled:opacity-60"
        >
          <RotateCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
          <span>
            {checking
              ? (language === 'hi' ? 'जांच हो रही है...' : 'Checking Status...')
              : (language === 'hi' ? 'स्वीकृति स्थिति पुनः जांचें (Check Status)' : 'Check Approval Status')}
          </span>
        </button>
      </div>

      {/* Footer */}
      <div className="text-center text-[11px] text-red-200/80 pb-1">
        Vi Sales MNP • Admin Verification Portal
      </div>
    </div>
  );
};
