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
  UserPlus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

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
    error: authError, 
    clearError 
  } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();
  
  // Two Portal Roles: 'customer' and 'admin'
  const [activePortal, setActivePortal] = useState<'customer' | 'admin'>('customer');

  // Customer Portal Sub-Tabs: 'login' or 'register'
  const [customerAuthMode, setCustomerAuthMode] = useState<'login' | 'register'>('login');

  // Customer Login Form State (Email & Password ONLY)
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPassword, setCustomerPassword] = useState('');
  const [showCustomerPassword, setShowCustomerPassword] = useState(false);

  // Customer Sign Up Form State (Email + Password + Details)
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regCircle, setRegCircle] = useState('Delhi NCR');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Admin Form State (Email and Password ONLY)
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  // UI State
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmailInput, setResetEmailInput] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const isHindi = language === 'hi';

  // Clear errors when switching tabs or modes
  useEffect(() => {
    clearError();
    setLocalError(null);
    setLocalSuccess(null);
  }, [activePortal, customerAuthMode]);

  // Handle Customer Login (Email & Password)
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

  // Handle Customer Sign Up / Register (Email + Password + Name & Mobile)
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

    // Basic email format check
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

  // Handle Admin Secure Login (Email & Password ONLY)
  const handleAdminSubmit = async (e: React.FormEvent) => {
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
            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white/15 hover:bg-white/25 border border-white/30 flex items-center gap-1.5 text-white transition-all active:scale-95"
          >
            <span>{language === 'hi' ? '🇮🇳 HI' : '🇬🇧 EN'}</span>
          </button>

          {/* Firebase Connection Status */}
          <button
            type="button"
            onClick={onOpenConfig}
            title="Firebase Settings"
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all ${
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
                ? 'वोडाफोन आइडिया • ग्राहक एवं एडमिन पोर्टल' 
                : 'Vodafone Idea Limited • Customer & Admin Portal'}
            </p>
          </div>

          {/* TWO PORTAL ROLE SELECTOR TABS ONLY */}
          <div className="grid grid-cols-2 p-1.5 bg-slate-100 border-b border-slate-200">
            <button
              type="button"
              id="tab-customer-portal"
              onClick={() => setActivePortal('customer')}
              className={`py-2.5 px-3 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all ${
                activePortal === 'customer'
                  ? 'bg-white text-red-600 shadow-xs border border-slate-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <User className="w-4 h-4" />
              <span>{isHindi ? '1. ग्राहक (Customer)' : '1. Customer Portal'}</span>
            </button>

            <button
              type="button"
              id="tab-admin-portal"
              onClick={() => setActivePortal('admin')}
              className={`py-2.5 px-3 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all ${
                activePortal === 'admin'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>{isHindi ? '2. एडमिन (Admin)' : '2. Admin Portal'}</span>
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
            {/* 1. CUSTOMER PORTAL (Email & Password Login + Register)   */}
            {/* ======================================================== */}
            {activePortal === 'customer' && (
              <div className="space-y-4">
                {/* Sub-Tabs: Login vs Register */}
                <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200">
                  <button
                    type="button"
                    id="btn-customer-tab-login"
                    onClick={() => setCustomerAuthMode('login')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      customerAuthMode === 'login'
                        ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <LogIn className="w-3.5 h-3.5 text-red-600" />
                    <span>{isHindi ? 'लॉगिन करें (Sign In)' : 'Sign In'}</span>
                  </button>

                  <button
                    type="button"
                    id="btn-customer-tab-register"
                    onClick={() => setCustomerAuthMode('register')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      customerAuthMode === 'register'
                        ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5 text-red-600" />
                    <span>{isHindi ? 'नया खाता बनाएँ (Sign Up)' : 'Create Account'}</span>
                  </button>
                </div>

                {/* Sub-Header Description */}
                <div className="text-center space-y-1">
                  <h3 className="font-black text-slate-900 text-base">
                    {customerAuthMode === 'login'
                      ? (isHindi ? 'ग्राहक पोर्टल में लॉगिन करें' : 'Customer Sign In')
                      : (isHindi ? 'नया ग्राहक खाता बनाएँ' : 'Create Customer Account')}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    {customerAuthMode === 'login'
                      ? (isHindi 
                          ? 'अपनी पंजीकृत Email ID और Password से सीधे प्रवेश करें' 
                          : 'Sign in directly with your registered Email ID & Password')
                      : (isHindi 
                          ? 'नया सिम ऑर्डर करने या नंबर पोर्ट करने हेतु ईमेल व पासवर्ड से खाता बनाएँ' 
                          : 'Register with Email & Password to track your SIM & MNP orders')}
                  </p>
                </div>

                {/* CUSTOMER LOGIN FORM */}
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
                          className="text-[11px] text-red-600 hover:underline font-medium"
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
                      className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-50"
                    >
                      {submitting ? (
                        <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      ) : (
                        <>
                          <LogIn className="w-4 h-4" />
                          <span>{isHindi ? 'ग्राहक लॉगिन करें' : 'Sign In as Customer'}</span>
                        </>
                      )}
                    </button>

                    <div className="pt-2 text-center border-t border-slate-100">
                      <p className="text-xs text-slate-500">
                        {isHindi ? 'नया खाता बनाना चाहते हैं?' : "Don't have an account yet?"}{' '}
                        <button
                          type="button"
                          onClick={() => setCustomerAuthMode('register')}
                          className="text-red-600 hover:text-red-700 font-bold hover:underline cursor-pointer"
                        >
                          {isHindi ? 'यहाँ रजिस्टर करें' : 'Sign Up here'}
                        </button>
                      </p>
                    </div>
                  </form>
                )}

                {/* CUSTOMER REGISTER FORM */}
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
                            minLength={6}
                            placeholder="••••••••"
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => setShowRegPassword(!showRegPassword)}
                            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                          >
                            {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
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
                            minLength={6}
                            placeholder="••••••••"
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
                      className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-50"
                    >
                      {submitting ? (
                        <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          <span>{isHindi ? 'खाता बनाएँ और लॉगिन करें' : 'Create Account & Sign In'}</span>
                        </>
                      )}
                    </button>

                    <div className="pt-2 text-center border-t border-slate-100">
                      <p className="text-xs text-slate-500">
                        {isHindi ? 'पहले से खाता मौजूद है?' : 'Already have an account?'}{' '}
                        <button
                          type="button"
                          onClick={() => setCustomerAuthMode('login')}
                          className="text-red-600 hover:text-red-700 font-bold hover:underline cursor-pointer"
                        >
                          {isHindi ? 'यहाँ लॉगिन करें' : 'Sign In here'}
                        </button>
                      </p>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* ======================================================== */}
            {/* 2. ADMIN AUTHENTICATION FLOW (Email & Password ONLY)     */}
            {/* ======================================================== */}
            {activePortal === 'admin' && (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-950">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    <span>{isHindi ? 'अधिकृत एडमिन लॉगिन' : 'Authorized Admin Login'}</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    {isHindi 
                      ? 'Primary Owner Admin (raheema62038@gmail.com) एवं Owner द्वारा अधिकृत Admins अपने पंजीकृत ईमेल और पासवर्ड से यहाँ लॉगिन करें।'
                      : 'Primary Owner Admin (raheema62038@gmail.com) and Owner-authorized Admins sign in here using their email and password.'}
                  </p>
                </div>

                <form onSubmit={handleAdminSubmit} className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">
                        {isHindi ? 'एडमिन / Owner ईमेल *' : 'Admin / Owner Email *'}
                      </label>
                      <button
                        type="button"
                        onClick={() => setAdminEmail('raheema62038@gmail.com')}
                        className="text-[11px] text-red-600 hover:text-red-700 font-bold hover:underline cursor-pointer"
                        title="Click to fill Primary Owner Email"
                      >
                        {isHindi ? 'Owner ईमेल भरें' : 'Use Owner Email'}
                      </button>
                    </div>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="email"
                        required
                        placeholder="raheema62038@gmail.com"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
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
                        className="text-[11px] text-red-600 hover:underline font-medium"
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
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Password Reset Modal (Usable for both Customer and Admin) */}
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
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold flex items-center justify-center text-xs"
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
                  className="flex-1 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  {isHindi ? 'रद्द करें' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="flex-1 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs disabled:opacity-50"
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
