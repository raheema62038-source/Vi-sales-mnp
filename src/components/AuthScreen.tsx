import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  LogIn, 
  AlertCircle, 
  Database, 
  CheckCircle2, 
  ShieldCheck, 
  User, 
  Shield, 
  Phone, 
  MapPin,
  Sparkles,
  UserPlus,
  Smartphone,
  ArrowRight,
  RefreshCw,
  ArrowLeft,
  Crown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { CustomConfirmationResult } from '../services/phoneAuthService';
import { ConfirmationResult } from 'firebase/auth';
import { PRIMARY_OWNER_EMAIL, isEmailPrimaryOwner } from '../services/userService';

interface AuthScreenProps {
  onOpenConfig: () => void;
  isFirestoreConnected: boolean;
}

const VI_CIRCLES = [
  'Delhi NCR',
  'Mumbai',
  'Maharashtra & Goa',
  'Gujarat',
  'UP East',
  'UP West',
  'Bihar & Jharkhand',
  'Rajasthan',
  'Punjab',
  'Haryana',
  'Madhya Pradesh & Chhattisgarh',
  'Karnataka',
  'Kerala',
  'Tamil Nadu',
  'Andhra Pradesh & Telangana',
  'West Bengal',
  'Kolkata',
  'Assam & North East',
  'Odisha',
];

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onOpenConfig,
  isFirestoreConnected,
}) => {
  const { 
    signIn, 
    signUp,
    resetPassword, 
    sendPhoneOtp,
    verifyPhoneOtp,
    error: authError, 
    clearError 
  } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();
  
  // Three Separate Portal Roles: 'customer', 'admin', and 'owner'
  const [activePortal, setActivePortal] = useState<'customer' | 'admin' | 'owner'>('customer');

  // Customer Portal Sub-Tabs: 'otp' | 'login' | 'register'
  const [customerAuthMode, setCustomerAuthMode] = useState<'otp' | 'login' | 'register'>('otp');

  // 1. Customer Mobile OTP State
  const [custPhone, setCustPhone] = useState('');
  const [custOtp, setCustOtp] = useState('');
  const [custPhoneStep, setCustPhoneStep] = useState<'input' | 'verify'>('input');
  const [custCr, setCustCr] = useState<ConfirmationResult | CustomConfirmationResult | null>(null);
  const [custOtpNotice, setCustOtpNotice] = useState<string | null>(null);
  const [custCountdown, setCustCountdown] = useState(0);
  const [isSendingCustOtp, setIsSendingCustOtp] = useState(false);
  const [isVerifyingCustOtp, setIsVerifyingCustOtp] = useState(false);

  // 2. Customer Email & Password State
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPassword, setCustomerPassword] = useState('');
  const [showCustomerPassword, setShowCustomerPassword] = useState(false);

  // 3. Customer Sign Up Form State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regCircle, setRegCircle] = useState('Delhi NCR');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // 4. Admin Portal State: 'email' | 'otp'
  const [adminAuthMode, setAdminAuthMode] = useState<'email' | 'otp'>('email');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  // Admin Mobile OTP State
  const [adminPhone, setAdminPhone] = useState('');
  const [adminOtp, setAdminOtp] = useState('');
  const [adminPhoneStep, setAdminPhoneStep] = useState<'input' | 'verify'>('input');
  const [adminCr, setAdminCr] = useState<ConfirmationResult | CustomConfirmationResult | null>(null);
  const [adminOtpNotice, setAdminOtpNotice] = useState<string | null>(null);
  const [adminCountdown, setAdminCountdown] = useState(0);
  const [isSendingAdminOtp, setIsSendingAdminOtp] = useState(false);
  const [isVerifyingAdminOtp, setIsVerifyingAdminOtp] = useState(false);

  // 5. Owner Portal State (Designated Primary Owner raheema62038@gmail.com)
  const [ownerEmail, setOwnerEmail] = useState(PRIMARY_OWNER_EMAIL);
  const [ownerPassword, setOwnerPassword] = useState('');
  const [showOwnerPassword, setShowOwnerPassword] = useState(false);

  // General UI State
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmailInput, setResetEmailInput] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const isHindi = language === 'hi';

  // Countdowns
  useEffect(() => {
    let timer: any;
    if (custCountdown > 0) {
      timer = setTimeout(() => setCustCountdown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [custCountdown]);

  useEffect(() => {
    let timer: any;
    if (adminCountdown > 0) {
      timer = setTimeout(() => setAdminCountdown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [adminCountdown]);

  // Clear errors when switching tabs
  useEffect(() => {
    clearError();
    setLocalError(null);
    setLocalSuccess(null);
  }, [activePortal, customerAuthMode, adminAuthMode]);

  // ==========================================
  // CUSTOMER MOBILE OTP HANDLERS
  // ==========================================
  const handleSendCustomerOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLocalError(null);
    setLocalSuccess(null);
    setCustOtpNotice(null);

    const clean = custPhone.replace(/\D/g, '').slice(-10);
    if (clean.length !== 10 || !/^[6-9]/.test(clean)) {
      setLocalError(
        isHindi 
          ? 'कृपया 10 अंकों का मान्य भारतीय मोबाइल नंबर दर्ज करें (6, 7, 8 या 9 से शुरू)।' 
          : 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8 or 9.'
      );
      return;
    }

    try {
      setIsSendingCustOtp(true);
      const cr = await sendPhoneOtp(clean, 'customer-phone-recaptcha-container');
      setCustCr(cr);
      setCustPhoneStep('verify');
      setCustCountdown(30);

      const customCr = cr as CustomConfirmationResult;
      if (customCr?.isSimulation && customCr?.simulationOtp) {
        setCustOtpNotice(`परीक्षण OTP: ${customCr.simulationOtp}`);
        setCustOtp(customCr.simulationOtp);
        setLocalSuccess(isHindi ? `परीक्षण OTP तैयार है: ${customCr.simulationOtp}` : `Test OTP generated: ${customCr.simulationOtp}`);
      } else {
        setLocalSuccess(isHindi ? `+91 ${clean} पर 6-अंकों का OTP भेजा गया है।` : `6-digit OTP sent to +91 ${clean}.`);
      }
    } catch (err: any) {
      console.error('Customer Send OTP error:', err);
      setLocalError(err?.message || (isHindi ? 'OTP भेजने में रुकावट आई। कृपया पुनः प्रयास करें।' : 'Failed to send OTP. Please try again.'));
    } finally {
      setIsSendingCustOtp(false);
    }
  };

  const handleVerifyCustomerOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setLocalSuccess(null);

    const cleanOtp = custOtp.replace(/\D/g, '').trim();
    if (cleanOtp.length < 4 || cleanOtp.length > 6) {
      setLocalError(isHindi ? 'कृपया 6 अंकों का सही OTP कोड दर्ज करें।' : 'Please enter the 6-digit OTP code.');
      return;
    }

    try {
      setIsVerifyingCustOtp(true);
      await verifyPhoneOtp(
        cleanOtp,
        custCr || undefined,
        'customer',
        { displayName: `Customer (+91 ${custPhone.slice(-10)})` }
      );
      setLocalSuccess(isHindi ? 'सत्यापन सफल! ग्राहक पोर्टल में स्वागत है...' : 'Verification successful! Welcome to customer portal...');
    } catch (err: any) {
      console.error('Customer Verify OTP error:', err);
      setLocalError(err?.message || (isHindi ? 'गलत या अमान्य OTP। कृपया दोबारा जांचें।' : 'Invalid OTP. Please check and try again.'));
    } finally {
      setIsVerifyingCustOtp(false);
    }
  };

  // ==========================================
  // CUSTOMER EMAIL & PASSWORD HANDLERS
  // ==========================================
  const handleCustomerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setLocalSuccess(null);

    const email = customerEmail.trim().toLowerCase();
    const pass = customerPassword.trim();

    if (!email || !pass) {
      setLocalError(isHindi ? 'कृपया ईमेल और पासवर्ड दर्ज करें।' : 'Please enter your email and password.');
      return;
    }

    try {
      setSubmitting(true);
      await signIn(email, pass, 'customer');
      setLocalSuccess(isHindi ? 'लॉगिन सफल! ग्राहक पोर्टल में आपका स्वागत है।' : 'Sign in successful! Welcome to Vi Customer Portal.');
    } catch (err: any) {
      console.error('Customer Login error:', err);
      setLocalError(err?.message || (isHindi ? 'ईमेल या पासवर्ड अमान्य है।' : 'Invalid email or password.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCustomerRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setLocalSuccess(null);

    const name = regName.trim();
    const email = regEmail.trim().toLowerCase();
    const pass = regPassword.trim();
    const confirmPass = regConfirmPassword.trim();
    const cleanMobile = regMobile.replace(/\D/g, '').trim();

    if (!name) {
      setLocalError(isHindi ? 'कृपया अपना पूरा नाम दर्ज करें।' : 'Please enter your full name.');
      return;
    }

    if (!email) {
      setLocalError(isHindi ? 'कृपया ईमेल पता दर्ज करें।' : 'Please enter your email address.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setLocalError(isHindi ? 'कृपया वैध ईमेल पता दर्ज करें।' : 'Please enter a valid email address.');
      return;
    }

    if (cleanMobile && (cleanMobile.length !== 10 || !/^[6-9]/.test(cleanMobile))) {
      setLocalError(isHindi ? 'कृपया 10 अंकों का वैध भारतीय मोबाइल नंबर दर्ज करें।' : 'Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    if (pass.length < 6) {
      setLocalError(isHindi ? 'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।' : 'Password must be at least 6 characters long.');
      return;
    }

    if (pass !== confirmPass) {
      setLocalError(isHindi ? 'पासवर्ड और कन्फर्म पासवर्ड मेल नहीं खा रहे हैं।' : 'Passwords do not match.');
      return;
    }

    try {
      setSubmitting(true);
      await signUp(email, pass, 'customer', name, cleanMobile, regCircle);
      setLocalSuccess(isHindi ? 'खाता सफलतापूर्वक बन गया! ग्राहक पोर्टल में आपका स्वागत है।' : 'Account created successfully! Welcome to Vi Customer Portal.');
    } catch (err: any) {
      console.error('Customer Register error:', err);
      setLocalError(err?.message || (isHindi ? 'खाता बनाने में त्रुटि हुई।' : 'Failed to create customer account.'));
    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================
  // ADMIN HANDLERS (EMAIL & MOBILE OTP)
  // ==========================================
  const handleAdminEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setLocalSuccess(null);

    const email = adminEmail.trim();
    const pass = adminPassword.trim();

    if (!email || !pass) {
      setLocalError(isHindi ? 'कृपया एडमिन ईमेल और पासवर्ड दर्ज करें।' : 'Please enter admin email and password.');
      return;
    }

    let timer: any;
    try {
      setSubmitting(true);
      timer = setTimeout(() => setSubmitting(false), 8000);
      await signIn(email, pass, 'admin');
    } catch (err: any) {
      setLocalError(err?.message || (isHindi ? 'एडमिन लॉगिन में त्रुटि।' : 'Admin authentication error.'));
    } finally {
      clearTimeout(timer);
      setSubmitting(false);
    }
  };

  // ==========================================
  // OWNER HANDLERS (PRIMARY OWNER EMAIL & PASSWORD)
  // ==========================================
  const handleOwnerEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setLocalSuccess(null);

    const email = ownerEmail.trim().toLowerCase();
    const pass = ownerPassword.trim();

    if (!email || !pass) {
      setLocalError(isHindi ? 'कृपया Primary Owner ईमेल और पासवर्ड दर्ज करें।' : 'Please enter Owner email and password.');
      return;
    }

    if (!isEmailPrimaryOwner(email)) {
      setLocalError(
        isHindi
          ? `सुरक्षा प्रतिबंध: केवल अधिकृत Primary Owner (${PRIMARY_OWNER_EMAIL}) ही Owner Login कर सकते हैं। अन्य एडमिन्स कृपया "Admin Login" विकल्प का उपयोग करें।`
          : `Security Restriction: Only the authorized Primary Owner (${PRIMARY_OWNER_EMAIL}) can sign in here. Admins please use Admin Login tab.`
      );
      return;
    }

    let timer: any;
    try {
      setSubmitting(true);
      timer = setTimeout(() => setSubmitting(false), 8000);
      await signIn(email, pass, 'owner');
      setLocalSuccess(
        isHindi
          ? 'Primary Owner लॉगिन सफल! Master Control Panel लोड हो रहा है...'
          : 'Owner authentication successful! Loading Master Control Panel...'
      );
    } catch (err: any) {
      console.error('Owner Login error:', err);
      setLocalError(
        err?.message || (isHindi ? 'Owner लॉगिन में त्रुटि। कृपया पासवर्ड जांचें।' : 'Owner authentication error.')
      );
    } finally {
      clearTimeout(timer);
      setSubmitting(false);
    }
  };

  const handleSendAdminOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLocalError(null);
    setLocalSuccess(null);
    setAdminOtpNotice(null);

    const clean = adminPhone.replace(/\D/g, '').slice(-10);
    if (clean.length !== 10 || !/^[6-9]/.test(clean)) {
      setLocalError(isHindi ? 'कृपया 10 अंकों का वैध भारतीय मोबाइल नंबर दर्ज करें।' : 'Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    try {
      setIsSendingAdminOtp(true);
      const cr = await sendPhoneOtp(clean, 'admin-phone-recaptcha-container');
      setAdminCr(cr);
      setAdminPhoneStep('verify');
      setAdminCountdown(30);

      const customCr = cr as CustomConfirmationResult;
      if (customCr?.isSimulation && customCr?.simulationOtp) {
        setAdminOtpNotice(`परीक्षण OTP: ${customCr.simulationOtp}`);
        setAdminOtp(customCr.simulationOtp);
        setLocalSuccess(isHindi ? `परीक्षण OTP तैयार: ${customCr.simulationOtp}` : `Test OTP ready: ${customCr.simulationOtp}`);
      } else {
        setLocalSuccess(isHindi ? `+91 ${clean} पर 6-अंकों का OTP भेजा गया है।` : `6-digit OTP sent to +91 ${clean}.`);
      }
    } catch (err: any) {
      console.error('Admin Send OTP error:', err);
      setLocalError(err?.message || (isHindi ? 'OTP भेजने में त्रुटि हुई।' : 'Failed to send OTP.'));
    } finally {
      setIsSendingAdminOtp(false);
    }
  };

  const handleVerifyAdminOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setLocalSuccess(null);

    const cleanOtp = adminOtp.replace(/\D/g, '').trim();
    if (cleanOtp.length < 4 || cleanOtp.length > 6) {
      setLocalError(isHindi ? 'कृपया 6 अंकों का सही OTP कोड दर्ज करें।' : 'Please enter the 6-digit OTP code.');
      return;
    }

    try {
      setIsVerifyingAdminOtp(true);
      await verifyPhoneOtp(
        cleanOtp,
        adminCr || undefined,
        'admin',
        { displayName: `Admin (+91 ${adminPhone.slice(-10)})` }
      );
      setLocalSuccess(isHindi ? 'सत्यापन सफल! एडमिन पोर्टल लोड हो रहा है...' : 'Verification successful! Loading admin portal...');
    } catch (err: any) {
      console.error('Admin Verify OTP error:', err);
      setLocalError(err?.message || (isHindi ? 'गलत या अमान्य OTP।' : 'Invalid OTP.'));
    } finally {
      setIsVerifyingAdminOtp(false);
    }
  };

  // Handle Password Reset
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmailInput.trim()) return;

    let timer: any;
    try {
      setResetLoading(true);
      timer = setTimeout(() => setResetLoading(false), 8000);
      await resetPassword(resetEmailInput.trim());
      setLocalSuccess(
        isHindi 
          ? `पासवर्ड रीसेट लिंक ${resetEmailInput} पर भेज दिया गया है।`
          : `Password reset link sent to ${resetEmailInput}.`
      );
      setShowResetModal(false);
    } catch (err: any) {
      setLocalError(err?.message || 'Password reset error.');
    } finally {
      clearTimeout(timer);
      setResetLoading(false);
    }
  };

  const displayedError = localError || authError;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between font-sans">
      {/* Top Brand Bar */}
      <div className="bg-red-700 text-white px-4 py-2 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-white flex items-center justify-center shadow-xs border border-amber-400">
            <span className="text-red-600 font-black text-sm">
              V<span className="text-amber-500">!</span>
            </span>
          </div>
          <span className="text-xs font-black tracking-wide text-amber-300">Vi 4G / 5G Plus</span>
          <span className="text-xs text-red-200 hidden sm:inline">• Vodafone Idea MNP Portal</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Language Switcher */}
          <button
            type="button"
            onClick={toggleLanguage}
            title={isHindi ? 'Switch to English' : 'हिंदी में बदलें'}
            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white/15 hover:bg-white/25 border border-white/30 flex items-center gap-1.5 text-white transition-all active:scale-95 cursor-pointer"
          >
            <span>{language === 'hi' ? '🇮🇳 HI' : '🇬🇧 EN'}</span>
          </button>

          {/* Firebase Connection Status */}
          <button
            type="button"
            onClick={onOpenConfig}
            title="Firebase Settings"
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              isFirestoreConnected 
                ? 'bg-red-800 text-emerald-300 border border-emerald-500/40' 
                : 'bg-amber-400 text-red-950 font-bold'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {isFirestoreConnected ? 'Firebase Connected' : 'Config'}
            </span>
          </button>
        </div>
      </div>

      {/* Main Authentication Container */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-red-600 via-red-700 to-red-800 p-6 text-white text-center relative">
            <div className="w-14 h-14 rounded-2xl bg-white mx-auto flex items-center justify-center shadow-md border-2 border-amber-400 mb-3">
              <span className="text-red-600 font-black text-2xl tracking-tighter">
                V<span className="text-amber-500 text-xl">!</span>
              </span>
            </div>
            <h2 className="text-xl font-black tracking-tight">{t.common.appName}</h2>
            <p className="text-xs text-red-100 mt-0.5">
              {isHindi 
                ? 'वोडाफोन आइडिया • ग्राहक, एडमिन एवं Owner पोर्टल' 
                : 'Vodafone Idea Limited • Customer, Admin & Owner Portal'}
            </p>
          </div>

          {/* THREE SEPARATE PRIMARY LOGIN OPTIONS */}
          <div className="grid grid-cols-3 p-1.5 bg-slate-100 border-b border-slate-200 gap-1">
            {/* 1. Customer Login */}
            <button
              type="button"
              id="tab-customer-portal"
              onClick={() => {
                setActivePortal('customer');
                setLocalError(null);
              }}
              className={`py-2.5 px-2 rounded-2xl text-[11px] sm:text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activePortal === 'customer'
                  ? 'bg-white text-red-600 shadow-xs border border-slate-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>{isHindi ? '1. Customer' : '1. Customer'}</span>
            </button>

            {/* 2. Admin Login */}
            <button
              type="button"
              id="tab-admin-portal"
              onClick={() => {
                setActivePortal('admin');
                setLocalError(null);
              }}
              className={`py-2.5 px-2 rounded-2xl text-[11px] sm:text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activePortal === 'admin'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>{isHindi ? '2. Admin' : '2. Admin'}</span>
            </button>

            {/* 3. Owner Login */}
            <button
              type="button"
              id="tab-owner-portal"
              onClick={() => {
                setActivePortal('owner');
                setLocalError(null);
              }}
              className={`py-2.5 px-2 rounded-2xl text-[11px] sm:text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activePortal === 'owner'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-xs border border-amber-400 font-black'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-950 shrink-0" />
              <span>{isHindi ? '3. Owner' : '3. Owner'}</span>
            </button>
          </div>

          <div className="p-6 space-y-4">
            {/* Feedback Alerts */}
            {displayedError && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">{displayedError}</div>
              </div>
            )}

            {localSuccess && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-start gap-2.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">{localSuccess}</div>
              </div>
            )}

            {/* ======================================================== */}
            {/* 1. CUSTOMER PORTAL (Mobile OTP + Email + Sign Up)        */}
            {/* ======================================================== */}
            {activePortal === 'customer' && (
              <div className="space-y-4">
                {/* Sub-Tabs: Mobile OTP vs Email & Password vs Create Account */}
                <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200 gap-1">
                  <button
                    type="button"
                    id="btn-customer-tab-otp"
                    onClick={() => {
                      setCustomerAuthMode('otp');
                      setLocalError(null);
                    }}
                    className={`flex-1 py-2 px-1.5 rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      customerAuthMode === 'otp'
                        ? 'bg-white text-red-600 shadow-xs border border-slate-200'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5 text-red-600 shrink-0" />
                    <span>{isHindi ? 'मोबाइल OTP' : 'Mobile OTP'}</span>
                  </button>

                  <button
                    type="button"
                    id="btn-customer-tab-login"
                    onClick={() => {
                      setCustomerAuthMode('login');
                      setLocalError(null);
                    }}
                    className={`flex-1 py-2 px-1.5 rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      customerAuthMode === 'login'
                        ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <LogIn className="w-3.5 h-3.5 text-red-600 shrink-0" />
                    <span>{isHindi ? 'ईमेल' : 'Email'}</span>
                  </button>

                  <button
                    type="button"
                    id="btn-customer-tab-register"
                    onClick={() => {
                      setCustomerAuthMode('register');
                      setLocalError(null);
                    }}
                    className={`flex-1 py-2 px-1.5 rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      customerAuthMode === 'register'
                        ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5 text-red-600 shrink-0" />
                    <span>{isHindi ? 'नया खाता' : 'Sign Up'}</span>
                  </button>
                </div>

                {/* Sub-Header Description */}
                <div className="text-center space-y-1">
                  <h3 className="font-black text-slate-900 text-base">
                    {customerAuthMode === 'otp'
                      ? (isHindi ? 'मोबाइल नंबर OTP से लॉगिन करें' : 'Sign In with Mobile OTP')
                      : customerAuthMode === 'login'
                      ? (isHindi ? 'ग्राहक ईमेल से लॉगिन करें' : 'Customer Email Sign In')
                      : (isHindi ? 'नया ग्राहक खाता बनाएँ' : 'Create Customer Account')}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    {customerAuthMode === 'otp'
                      ? (isHindi 
                          ? '10-अंकों का मोबाइल नंबर दर्ज करें और त्वरित OTP प्राप्त करें' 
                          : 'Enter your 10-digit mobile number for instant OTP verification')
                      : customerAuthMode === 'login'
                      ? (isHindi 
                          ? 'पंजीकृत Email ID और Password से सीधे प्रवेश करें' 
                          : 'Sign in directly with your registered Email ID & Password')
                      : (isHindi 
                          ? 'नया सिम ऑर्डर या MNP पोर्टिंग के लिए नया खाता बनाएँ' 
                          : 'Register with details to track SIM & MNP orders')}
                  </p>
                </div>

                {/* OPTION 1: CUSTOMER MOBILE OTP FORM */}
                {customerAuthMode === 'otp' && (
                  <div className="space-y-3">
                    {custPhoneStep === 'input' ? (
                      <form onSubmit={handleSendCustomerOtp} className="space-y-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            {isHindi ? 'मोबाइल नंबर (Mobile Number) *' : '10-Digit Mobile Number *'}
                          </label>
                          <div className="flex rounded-xl border border-slate-200 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-500/20 overflow-hidden bg-white">
                            <div className="bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 border-r border-slate-200 flex items-center gap-1.5 shrink-0 select-none">
                              <span className="text-base leading-none">🇮🇳</span>
                              <span>+91</span>
                            </div>
                            <input
                              type="tel"
                              required
                              autoFocus
                              maxLength={10}
                              placeholder="9876543210"
                              value={custPhone}
                              onChange={(e) => setCustPhone(e.target.value.replace(/\D/g, ''))}
                              className="w-full px-3 py-2 text-xs font-mono font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none"
                            />
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1">
                            {isHindi ? 'हम इस नंबर पर 6-अंकों का सत्यापन कोड (OTP) भेजेंगे।' : 'We will send a 6-digit verification code (OTP) to this number.'}
                          </p>
                        </div>

                        <button
                          type="submit"
                          id="btn-customer-send-otp"
                          disabled={isSendingCustOtp || custPhone.length !== 10}
                          className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-red-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-50"
                        >
                          {isSendingCustOtp ? (
                            <>
                              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                              <span>{isHindi ? 'OTP भेजा जा रहा है...' : 'Sending OTP...'}</span>
                            </>
                          ) : (
                            <>
                              <span>{isHindi ? 'OTP प्राप्त करें (Send OTP)' : 'Send OTP'}</span>
                              <ArrowRight className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      </form>
                    ) : (
                      <form onSubmit={handleVerifyCustomerOtp} className="space-y-3">
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Smartphone className="w-4 h-4 text-red-600" />
                            <span className="text-xs font-mono font-bold text-slate-900">+91 {custPhone}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setCustPhoneStep('input');
                              setCustOtp('');
                              setCustOtpNotice(null);
                            }}
                            className="text-xs text-red-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <ArrowLeft className="w-3 h-3" />
                            <span>{isHindi ? 'नंबर बदलें' : 'Change'}</span>
                          </button>
                        </div>

                        {custOtpNotice && (
                          <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-center justify-between font-mono font-bold">
                            <div className="flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>{custOtpNotice}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setCustOtp(custOtpNotice.replace(/\D/g, ''))}
                              className="px-2 py-0.5 bg-amber-200 hover:bg-amber-300 rounded text-[11px] font-bold text-amber-950 cursor-pointer"
                            >
                              {isHindi ? 'ऑटो-भरें' : 'Auto Fill'}
                            </button>
                          </div>
                        )}

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            {isHindi ? '6-अंकों का OTP कोड दर्ज करें *' : 'Enter 6-Digit OTP Code *'}
                          </label>
                          <input
                            type="text"
                            required
                            autoFocus
                            maxLength={6}
                            placeholder="••••••"
                            value={custOtp}
                            onChange={(e) => setCustOtp(e.target.value.replace(/\D/g, ''))}
                            className="w-full px-3 py-2.5 text-center text-lg font-mono font-black tracking-widest rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                          />
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                          <span>
                            {custCountdown > 0
                              ? (isHindi ? `पुनः OTP (${custCountdown}s)` : `Resend in ${custCountdown}s`)
                              : (isHindi ? 'OTP नहीं मिला?' : "Didn't receive OTP?")}
                          </span>
                          {custCountdown === 0 && (
                            <button
                              type="button"
                              onClick={() => handleSendCustomerOtp()}
                              disabled={isSendingCustOtp}
                              className="text-red-600 font-bold hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              <RefreshCw className={`w-3 h-3 ${isSendingCustOtp ? 'animate-spin' : ''}`} />
                              <span>{isHindi ? 'दोबारा OTP भेजें' : 'Resend OTP'}</span>
                            </button>
                          )}
                        </div>

                        <button
                          type="submit"
                          id="btn-customer-verify-otp"
                          disabled={isVerifyingCustOtp || custOtp.length < 4}
                          className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-red-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-50"
                        >
                          {isVerifyingCustOtp ? (
                            <>
                              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                              <span>{isHindi ? 'सत्यापन हो रहा है...' : 'Verifying...'}</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              <span>{isHindi ? 'सत्यापित करें और लॉगिन करें' : 'Verify & Sign In'}</span>
                            </>
                          )}
                        </button>
                      </form>
                    )}
                  </div>
                )}

                {/* OPTION 2: CUSTOMER EMAIL LOGIN FORM */}
                {customerAuthMode === 'login' && (
                  <form onSubmit={handleCustomerLogin} className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {isHindi ? 'ईमेल आईडी (Email ID) *' : 'Email Address *'}
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="email"
                          required
                          autoFocus
                          placeholder="customer@example.com"
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-700">
                          {isHindi ? 'पासवर्ड (Password) *' : 'Password *'}
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setResetEmailInput(customerEmail);
                            setShowResetModal(true);
                          }}
                          className="text-[11px] text-red-600 hover:underline font-medium cursor-pointer"
                        >
                          {isHindi ? 'पासवर्ड भूल गए?' : 'Forgot password?'}
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type={showCustomerPassword ? 'text' : 'password'}
                          required
                          placeholder="••••••••"
                          value={customerPassword}
                          onChange={(e) => setCustomerPassword(e.target.value)}
                          className="w-full pl-9 pr-10 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCustomerPassword(!showCustomerPassword)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showCustomerPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-red-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-3 disabled:opacity-50"
                    >
                      {submitting ? (
                        <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      ) : (
                        <>
                          <LogIn className="w-4 h-4" />
                          <span>{isHindi ? 'लॉगिन करें' : 'Sign In'}</span>
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* OPTION 3: CUSTOMER SIGN UP / REGISTRATION FORM */}
                {customerAuthMode === 'register' && (
                  <form onSubmit={handleCustomerRegister} className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {isHindi ? 'पूरा नाम (Full Name) *' : 'Full Name *'}
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          required
                          autoFocus
                          placeholder="e.g. Rahul Sharma"
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {isHindi ? 'ईमेल आईडी (Email ID) *' : 'Email Address *'}
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="email"
                          required
                          placeholder="name@example.com"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {isHindi ? 'संपर्क मोबाइल नंबर (Mobile Number for Delivery)' : 'Contact Mobile Number (for Delivery)'}
                      </label>
                      <div className="flex rounded-xl border border-slate-200 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-500/20 overflow-hidden bg-white">
                        <div className="bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 border-r border-slate-200 flex items-center gap-1.5 shrink-0 select-none">
                          <span className="text-base leading-none">🇮🇳</span>
                          <span>+91</span>
                        </div>
                        <input
                          type="tel"
                          maxLength={10}
                          placeholder="9876543210"
                          value={regMobile}
                          onChange={(e) => setRegMobile(e.target.value.replace(/\D/g, ''))}
                          className="w-full px-3 py-2 text-xs font-mono font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {isHindi ? 'टेलीकॉम सर्कल / राज्य (Circle) *' : 'Telecom Circle / City *'}
                      </label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <select
                          value={regCircle}
                          onChange={(e) => setRegCircle(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                        >
                          {VI_CIRCLES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          {isHindi ? 'पासवर्ड (Min 6 chars) *' : 'Password (Min 6 chars) *'}
                        </label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                          <input
                            type={showRegPassword ? 'text' : 'password'}
                            required
                            placeholder="••••••"
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          {isHindi ? 'कन्फर्म पासवर्ड *' : 'Confirm Password *'}
                        </label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                          <input
                            type={showRegPassword ? 'text' : 'password'}
                            required
                            placeholder="••••••"
                            value={regConfirmPassword}
                            onChange={(e) => setRegConfirmPassword(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-red-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-3 disabled:opacity-50"
                    >
                      {submitting ? (
                        <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          <span>{isHindi ? 'नया खाता बनाएँ (Register)' : 'Create Account'}</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* ======================================================== */}
            {/* 2. ADMIN AUTHENTICATION FLOW (Email OR Mobile OTP)       */}
            {/* ======================================================== */}
            {activePortal === 'admin' && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 text-xs text-blue-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-blue-950">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>{isHindi ? 'अधिकृत एडमिन लॉगिन (Admin Login)' : 'Authorized Admin Login'}</span>
                  </div>
                  <p className="text-[11px] text-blue-800 leading-relaxed font-medium">
                    {isHindi 
                      ? 'यहाँ केवल वही Admin लॉगिन कर सकते हैं जिनका खाता Primary Owner द्वारा बनाया गया है। Admin लॉगिन करके अपने निर्धारित गाँव/शहर की MNP बुकिंग्स प्रबंधित कर सकते हैं।'
                      : 'Every admin must use the email account created or authorized by the Owner. Each admin can view only customers and bookings assigned to their own village/city.'}
                  </p>
                </div>

                {/* Admin Sub-Tabs: Email vs Mobile OTP */}
                <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200 gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setAdminAuthMode('email');
                      setLocalError(null);
                    }}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      adminAuthMode === 'email'
                        ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5 text-blue-600" />
                    <span>{isHindi ? 'एडमिन ईमेल' : 'Admin Email'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAdminAuthMode('otp');
                      setLocalError(null);
                    }}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      adminAuthMode === 'otp'
                        ? 'bg-white text-red-600 shadow-xs border border-slate-200'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5 text-red-600" />
                    <span>{isHindi ? 'मोबाइल OTP' : 'Mobile OTP'}</span>
                  </button>
                </div>

                {/* ADMIN OPTION 1: EMAIL & PASSWORD */}
                {adminAuthMode === 'email' && (
                  <form onSubmit={handleAdminEmailSubmit} className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-700">
                          {isHindi ? 'एडमिन ईमेल ID (Owner द्वारा अधिकृत) *' : 'Admin Email ID (Authorized by Owner) *'}
                        </label>
                      </div>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="email"
                          required
                          placeholder="admin@visales.com"
                          value={adminEmail}
                          onChange={(e) => setAdminEmail(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-700">
                          {isHindi ? 'एडमिन पासवर्ड (Password) *' : 'Admin Password *'}
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setResetEmailInput(adminEmail);
                            setShowResetModal(true);
                          }}
                          className="text-[11px] text-red-600 hover:underline font-medium cursor-pointer"
                        >
                          {isHindi ? 'पासवर्ड भूल गए?' : 'Forgot password?'}
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type={showAdminPassword ? 'text' : 'password'}
                          required
                          placeholder="••••••••"
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          className="w-full pl-9 pr-10 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAdminPassword(!showAdminPassword)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer mt-3 disabled:opacity-50"
                    >
                      {submitting ? (
                        <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4 text-amber-400" />
                          {isHindi ? 'एडमिन लॉगिन करें' : 'Sign In as Admin'}
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* ADMIN OPTION 2: MOBILE OTP */}
                {adminAuthMode === 'otp' && (
                  <div className="space-y-3">
                    {adminPhoneStep === 'input' ? (
                      <form onSubmit={handleSendAdminOtp} className="space-y-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            {isHindi ? 'पंजीकृत एडमिन मोबाइल नंबर *' : 'Registered Admin Mobile Number *'}
                          </label>
                          <div className="flex rounded-xl border border-slate-200 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-500/20 overflow-hidden bg-white">
                            <div className="bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 border-r border-slate-200 flex items-center gap-1.5 shrink-0 select-none">
                              <span className="text-base leading-none">🇮🇳</span>
                              <span>+91</span>
                            </div>
                            <input
                              type="tel"
                              required
                              autoFocus
                              maxLength={10}
                              placeholder="9876543210"
                              value={adminPhone}
                              onChange={(e) => setAdminPhone(e.target.value.replace(/\D/g, ''))}
                              className="w-full px-3 py-2 text-xs font-mono font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={isSendingAdminOtp || adminPhone.length !== 10}
                          className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-50"
                        >
                          {isSendingAdminOtp ? (
                            <>
                              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                              <span>{isHindi ? 'OTP भेजा जा रहा है...' : 'Sending OTP...'}</span>
                            </>
                          ) : (
                            <>
                              <span>{isHindi ? 'एडमिन OTP प्राप्त करें' : 'Send Admin OTP'}</span>
                              <ArrowRight className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      </form>
                    ) : (
                      <form onSubmit={handleVerifyAdminOtp} className="space-y-3">
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Smartphone className="w-4 h-4 text-amber-600" />
                            <span className="text-xs font-mono font-bold text-slate-900">+91 {adminPhone}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setAdminPhoneStep('input');
                              setAdminOtp('');
                              setAdminOtpNotice(null);
                            }}
                            className="text-xs text-red-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <ArrowLeft className="w-3 h-3" />
                            <span>{isHindi ? 'बदलें' : 'Change'}</span>
                          </button>
                        </div>

                        {adminOtpNotice && (
                          <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-center justify-between font-mono font-bold">
                            <div className="flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>{adminOtpNotice}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setAdminOtp(adminOtpNotice.replace(/\D/g, ''))}
                              className="px-2 py-0.5 bg-amber-200 hover:bg-amber-300 rounded text-[11px] font-bold text-amber-950 cursor-pointer"
                            >
                              {isHindi ? 'ऑटो-भरें' : 'Auto Fill'}
                            </button>
                          </div>
                        )}

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            {isHindi ? '6-अंकों का एडमिन OTP दर्ज करें *' : 'Enter 6-Digit Admin OTP *'}
                          </label>
                          <input
                            type="text"
                            required
                            autoFocus
                            maxLength={6}
                            placeholder="••••••"
                            value={adminOtp}
                            onChange={(e) => setAdminOtp(e.target.value.replace(/\D/g, ''))}
                            className="w-full px-3 py-2.5 text-center text-lg font-mono font-black tracking-widest rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                          />
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                          <span>
                            {adminCountdown > 0
                              ? (isHindi ? `पुनः OTP (${adminCountdown}s)` : `Resend in ${adminCountdown}s`)
                              : (isHindi ? 'OTP नहीं मिला?' : "Didn't receive OTP?")}
                          </span>
                          {adminCountdown === 0 && (
                            <button
                              type="button"
                              onClick={() => handleSendAdminOtp()}
                              disabled={isSendingAdminOtp}
                              className="text-red-600 font-bold hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              <RefreshCw className={`w-3 h-3 ${isSendingAdminOtp ? 'animate-spin' : ''}`} />
                              <span>{isHindi ? 'दोबारा OTP भेजें' : 'Resend OTP'}</span>
                            </button>
                          )}
                        </div>

                        <button
                          type="submit"
                          disabled={isVerifyingAdminOtp || adminOtp.length < 4}
                          className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-50"
                        >
                          {isVerifyingAdminOtp ? (
                            <>
                              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                              <span>{isHindi ? 'सत्यापन हो रहा है...' : 'Verifying...'}</span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="w-4 h-4 text-amber-400" />
                              <span>{isHindi ? 'सत्यापित करें और एडमिन लॉगिन करें' : 'Verify & Sign In'}</span>
                            </>
                          )}
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ======================================================== */}
            {/* 3. OWNER AUTHENTICATION FLOW (Primary Owner Login)       */}
            {/* ======================================================== */}
            {activePortal === 'owner' && (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-4 text-xs text-amber-950 space-y-1.5 shadow-2xs">
                  <div className="flex items-center gap-2 font-black text-amber-900 text-sm">
                    <Crown className="w-5 h-5 text-amber-600 shrink-0" />
                    <span>{isHindi ? '👑 Primary Owner Login (Master Access)' : '👑 Primary Owner Login (Master Access)'}</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                    {isHindi
                      ? `केवल अधिकृत Primary Owner (${PRIMARY_OWNER_EMAIL}) ही यहाँ सुरक्षित लॉगिन कर सकते हैं। Owner यहाँ से नए Admin बना सकते हैं, उनका गाँव निर्धारित कर सकते हैं और सभी बुकिंग्स व Admins को नियंत्रित कर सकते हैं।`
                      : `Only the authorized Primary Owner (${PRIMARY_OWNER_EMAIL}) can sign in here. Owner can create Admin accounts, assign villages, and manage all bookings and Admins.`}
                  </p>
                </div>

                <form onSubmit={handleOwnerEmailSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isHindi ? 'Primary Owner ईमेल ID *' : 'Primary Owner Email ID *'}
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-amber-600 absolute left-3 top-3" />
                      <input
                        type="email"
                        required
                        value={ownerEmail}
                        onChange={(e) => setOwnerEmail(e.target.value)}
                        placeholder={PRIMARY_OWNER_EMAIL}
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-amber-50/30 font-medium"
                      />
                    </div>
                    <div className="flex justify-between items-center mt-1 text-[10px] text-slate-500">
                      <span>{isHindi ? 'पंजीकृत Owner ID:' : 'Registered Owner ID:'} <strong className="text-amber-800">{PRIMARY_OWNER_EMAIL}</strong></span>
                      <button
                        type="button"
                        onClick={() => setOwnerEmail(PRIMARY_OWNER_EMAIL)}
                        className="text-amber-700 font-bold hover:underline cursor-pointer"
                      >
                        {isHindi ? 'Owner ID भरें' : 'Set Owner ID'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">
                        {isHindi ? 'Owner पासवर्ड (Master Password) *' : 'Owner Master Password *'}
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setResetEmailInput(ownerEmail);
                          setShowResetModal(true);
                        }}
                        className="text-[11px] text-red-600 hover:text-red-700 font-semibold cursor-pointer"
                      >
                        {isHindi ? 'पासवर्ड भूल गए?' : 'Forgot password?'}
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-amber-600 absolute left-3 top-3" />
                      <input
                        type={showOwnerPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••"
                        value={ownerPassword}
                        onChange={(e) => setOwnerPassword(e.target.value)}
                        className="w-full pl-9 pr-9 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOwnerPassword(!showOwnerPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showOwnerPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? (
                      <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Crown className="w-4 h-4 text-slate-950" />
                        <span>{isHindi ? 'Owner लॉगिन करें (Master Login)' : 'Sign In as Primary Owner'}</span>
                      </>
                    )}
                  </button>
                </form>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 space-y-1">
                  <div className="font-bold text-slate-800 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{isHindi ? 'Owner विशेषाधिकार:' : 'Owner Privileges:'}</span>
                  </div>
                  <ul className="list-disc pl-4 space-y-0.5 text-[10px]">
                    <li>{isHindi ? 'नए Admin की अलग ID व पासवर्ड बनाना और गाँव निर्धारित करना' : 'Create new Admin IDs and assign village/taluka/district'}</li>
                    <li>{isHindi ? 'सभी Admins और सभी गाँवों की बुकिंग्स देखना व नियंत्रित करना' : 'Full visibility of all village bookings and admin accounts'}</li>
                    <li>{isHindi ? 'ग्राहक आईडी डिलीट करना एवं Admin खाते निष्क्रिय/डिलीट करना' : 'Delete customer IDs and manage/revoke admin privileges'}</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Containers for Firebase invisible reCAPTCHA */}
      <div id="customer-phone-recaptcha-container" className="absolute w-0 h-0 opacity-0 pointer-events-none overflow-hidden" aria-hidden="true" />
      <div id="admin-phone-recaptcha-container" className="absolute w-0 h-0 opacity-0 pointer-events-none overflow-hidden" aria-hidden="true" />

      {/* Password Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-sm text-slate-900">
                {isHindi ? 'पासवर्ड रीसेट करें' : 'Reset Password'}
              </h4>
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold flex items-center justify-center text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePasswordReset} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isHindi ? 'पंजीकृत ईमेल दर्ज करें' : 'Registered Email'}
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={resetEmailInput}
                  onChange={(e) => setResetEmailInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="flex-1 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  {isHindi ? 'रद्द करें' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="flex-1 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {resetLoading ? '...' : (isHindi ? 'लिंक भेजें' : 'Send Reset Link')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-3 text-center text-xs text-slate-400 border-t border-slate-200 bg-white">
        <span>Vodafone Idea Limited • Vi Sales MNP Portal</span>
      </footer>
    </div>
  );
};
