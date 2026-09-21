import React from 'react';
import { Ban, LogOut, Mail, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { PRIMARY_OWNER_EMAIL } from '../services/userService';

export const DeactivatedAccountScreen: React.FC = () => {
  const { user, userProfile, logout } = useAuth();
  const { language } = useLanguage();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
      <div 
        id="deactivated-account-card"
        className="bg-white border border-red-200 rounded-3xl shadow-xl max-w-md w-full p-6 text-center space-y-5"
      >
        <div className="w-16 h-16 rounded-3xl bg-red-100 border border-red-200 text-red-600 flex items-center justify-center mx-auto shadow-inner">
          <Ban className="w-8 h-8 text-red-600" />
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-black tracking-widest text-red-600 uppercase bg-red-50 px-3 py-1 rounded-full border border-red-200">
            Account Suspended
          </span>
          <h2 className="text-lg font-black text-gray-900 tracking-tight">
            {language === 'hi' 
              ? 'Admin खाता निष्क्रिय है' 
              : 'Admin Account Deactivated'}
          </h2>
          <p className="text-xs text-gray-600 leading-relaxed max-w-sm mx-auto">
            {language === 'hi'
              ? 'आपका Admin खाता Primary Owner Admin द्वारा निष्क्रिय (Deactivate) कर दिया गया है। आप Admin Portal एक्सेस नहीं कर सकते।'
              : 'Your Admin account has been deactivated by the Primary Owner Admin. Access to the Admin Portal is suspended.'}
          </p>
        </div>

        {/* Owner Contact Box */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left space-y-1 text-xs">
          <div className="flex items-center gap-1.5 text-amber-900 font-bold">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
            <span>{language === 'hi' ? 'पुनः सक्रियता हेतु संपर्क:' : 'For Reactivation Contact:'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-700 pl-5 pt-0.5">
            <Mail className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-mono font-bold text-gray-900">{PRIMARY_OWNER_EMAIL}</span>
          </div>
          <p className="text-[11px] text-amber-800 pl-5">
            {language === 'hi'
              ? 'केवल Primary Owner ही आपके खाते को पुनः सक्रिय कर सकते हैं।'
              : 'Only the Primary Owner can reactivate your account.'}
          </p>
        </div>

        {/* User identification */}
        <div className="text-[11px] text-gray-400">
          <span>{userProfile?.displayName || user?.displayName || user?.email}</span>
          {user?.email && <span className="block font-mono text-[10px]">{user.email}</span>}
        </div>

        {/* Logout button */}
        <button
          id="deactivated-logout-btn"
          type="button"
          onClick={() => logout()}
          className="w-full py-2.5 px-4 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          <span>{language === 'hi' ? 'लॉगआउट करें (Sign Out)' : 'Sign Out'}</span>
        </button>
      </div>
    </div>
  );
};
