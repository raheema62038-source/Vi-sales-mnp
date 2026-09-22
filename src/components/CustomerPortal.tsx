import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Smartphone, 
  ShieldCheck, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  Truck, 
  FileText, 
  LogOut, 
  User, 
  PhoneCall, 
  Calendar, 
  ArrowRight,
  Sparkles,
  Lock,
  ClipboardList,
  RotateCw,
  Copy,
  CheckCheck,
  X,
  Mail,
  ChevronRight,
  MessageCircle,
  Download
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Lead, PortalConfig } from '../types';
import { 
  subscribeToPortalConfig, 
  DEFAULT_PORTAL_CONFIG 
} from '../services/portalConfigService';
import { AppUpdateModal } from './AppUpdateModal';
import { 
  getCurrentAppVersion, 
  INSTALLED_APP_VERSION, 
  isNewerVersionAvailable, 
  AppVersionInfo 
} from '../config/appVersion';
import { 
  hasDismissedUpdateForSession, 
  dismissUpdateForSession, 
  DEFAULT_APP_UPDATE_CONFIG,
  performAppUpdateCheck,
  fetchLatestFromGitHub
} from '../services/appUpdateService';

interface CustomerPortalProps {
  leads: Lead[];
  onOpenNewRequest: () => void;
  onRefresh: () => void;
}

export const CustomerPortal: React.FC<CustomerPortalProps> = ({
  leads,
  onOpenNewRequest,
  onRefresh,
}) => {
  const { user, userProfile, logout } = useAuth();
  const { language, toggleLanguage } = useLanguage();
  
  // State for Modal Views
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const [portalConfig, setPortalConfig] = useState<PortalConfig>(DEFAULT_PORTAL_CONFIG);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // App Version & Automatic APK Update Check
  const [installedVersion, setInstalledVersion] = useState<AppVersionInfo>(INSTALLED_APP_VERSION);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState<boolean>(false);
  const [isTestPopupOpen, setIsTestPopupOpen] = useState<boolean>(false);
  const [manualUpdateNotice, setManualUpdateNotice] = useState<string | null>(null);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState<boolean>(false);

  // 1. Fetch current installed app version (from native Android App.getInfo() or base config)
  useEffect(() => {
    let isMounted = true;
    getCurrentAppVersion()
      .then((info) => {
        if (isMounted) setInstalledVersion(info);
      })
      .catch((err) => {
        console.warn('App version detection notice:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Automatic non-blocking check when customer opens the app (Requirements 2, 3, 7, 8)
  useEffect(() => {
    let isMounted = true;
    const baseConfig = portalConfig.appUpdate || DEFAULT_APP_UPDATE_CONFIG;

    // Run network check asynchronously without blocking main thread
    performAppUpdateCheck(baseConfig, installedVersion)
      .then((res) => {
        if (!isMounted) return;
        setIsUpdateAvailable(Boolean(res.updateAvailable));
        if (res.shouldShowPopup) {
          setIsUpdateModalOpen(true);
        } else {
          setIsUpdateModalOpen(false);
        }
      })
      .catch((err) => {
        // Safe catch: never crash the app on network/GitHub issues
        console.warn('Startup app update check note:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [portalConfig.appUpdate, installedVersion]);

  const handleDismissUpdateLater = () => {
    const updateConfig = portalConfig.appUpdate || DEFAULT_APP_UPDATE_CONFIG;
    dismissUpdateForSession(updateConfig.latestVersionCode);
    setIsUpdateModalOpen(false);
  };

  const handleManualCheckUpdates = async () => {
    setManualUpdateNotice(isHindi ? '🔄 अपडेट की जाँच की जा रही है...' : '🔄 Checking for updates...');
    try {
      const baseConfig = portalConfig.appUpdate || DEFAULT_APP_UPDATE_CONFIG;
      const res = await performAppUpdateCheck(baseConfig, installedVersion);

      if (res.updateAvailable) {
        setIsUpdateAvailable(true);
        setManualUpdateNotice(null);
        setIsUpdateModalOpen(true);
      } else {
        setIsUpdateAvailable(false);
        // Requirement 3: "आपका ऐप पहले से नवीनतम संस्करण पर है।"
        setManualUpdateNotice(
          isHindi 
            ? '✓ आपका ऐप पहले से नवीनतम संस्करण पर है।' 
            : '✓ Your app is already up to date.'
        );
        setTimeout(() => setManualUpdateNotice(null), 4000);
      }
    } catch (err) {
      console.warn('Manual update check error:', err);
      // Requirement 7: "अपडेट की जाँच नहीं हो सकी। कृपया बाद में पुनः प्रयास करें।"
      setManualUpdateNotice(
        isHindi
          ? '⚠️ अपडेट की जाँच नहीं हो सकी। कृपया बाद में पुनः प्रयास करें।'
          : '⚠️ Could not check for updates. Please try again later.'
      );
      setTimeout(() => setManualUpdateNotice(null), 4000);
    }
  };

  // Subscribe to real-time Admin-controlled portal config (Logo, Admin Help number)
  useEffect(() => {
    const unsub = subscribeToPortalConfig((liveConfig) => {
      setPortalConfig(liveConfig);
    });
    return () => unsub();
  }, []);

  const adminHelp = portalConfig.adminHelp || DEFAULT_PORTAL_CONFIG.adminHelp;
  const logo = portalConfig.logo || DEFAULT_PORTAL_CONFIG.logo;
  const isHindi = language === 'hi';

  // Admin Mobile & WhatsApp Numbers
  const adminMobileNumber = (adminHelp.callNumber || adminHelp.helpNumber || '9175601497').replace(/\D/g, '').slice(-10) || '9175601497';
  const adminWhatsAppRaw = adminHelp.whatsappNumber || adminHelp.callNumber || '9175601497';
  const adminWhatsAppClean = adminWhatsAppRaw.replace(/\D/g, '').slice(-10) || '9175601497';
  const adminWhatsAppFormatted = `+91 ${adminWhatsAppClean}`;
  const defaultWhatsAppMsg = isHindi
    ? 'नमस्ते Admin, मुझे Vi Sales MNP / SIM Porting के बारे में जानकारी चाहिए।'
    : 'Hello Admin, I would like to inquire about Vi Sales MNP / SIM Porting.';
  const adminWhatsAppUrl = `https://wa.me/91${adminWhatsAppClean}?text=${encodeURIComponent(defaultWhatsAppMsg)}`;

  // Strict Customer Data Isolation: A customer can ONLY view their own bookings
  const myLeads = useMemo(() => {
    if (!user) return [];
    const currentUid = user.uid;
    const currentEmail = (user.email || '').toLowerCase().trim();
    const customerPhone = (userProfile?.phoneNumber || userProfile?.phone || user?.phoneNumber || '').replace(/\D/g, '').slice(-10);

    return leads.filter((lead) => {
      // 1. Direct match by Customer UID or Creator UID
      if (lead.customerUid && lead.customerUid === currentUid) return true;
      if (lead.createdByUid && lead.createdByUid === currentUid) return true;

      // 2. Direct match by registered Email
      if (currentEmail && lead.customerEmail && lead.customerEmail.toLowerCase().trim() === currentEmail) {
        return true;
      }

      // 3. Direct match by Customer Phone Number
      if (customerPhone && lead.mobileNumber) {
        const cleanLeadPhone = lead.mobileNumber.replace(/\D/g, '').slice(-10);
        if (cleanLeadPhone && customerPhone === cleanLeadPhone) return true;
      }

      return false;
    });
  }, [leads, user, userProfile]);

  // Derive latest booking for profile address fallback
  const latestLead = myLeads[0];

  // Customer Profile Details (Strictly displayed ONLY inside Profile Modal)
  const profileDetails = useMemo(() => {
    const name = userProfile?.displayName || user?.displayName || latestLead?.customerName || user?.email?.split('@')[0] || 'Customer';
    const mobile = userProfile?.phoneNumber || userProfile?.phone || user?.phoneNumber || latestLead?.mobileNumber || 'Not provided';
    const altMobile = latestLead?.alternateNumber || '—';
    const email = userProfile?.email || user?.email || latestLead?.customerEmail || '—';
    const address = userProfile?.address || latestLead?.address || latestLead?.customerAddress || 'Mehkar Doorstep Service Area';
    const taluka = userProfile?.taluka || latestLead?.taluka || 'Mehkar';
    const district = userProfile?.district || latestLead?.district || 'Buldhana';
    const state = userProfile?.state || latestLead?.state || 'Maharashtra';
    const pincode = userProfile?.pincode || latestLead?.pincode || '443301';
    const circle = userProfile?.assignedCircle || 'Vi Maharashtra & Goa';

    return {
      name,
      mobile,
      altMobile,
      email,
      address,
      taluka,
      district,
      state,
      pincode,
      circle,
      fullAddress: `${address}, ${taluka}, ${district}, ${state} - ${pincode}`
    };
  }, [userProfile, user, latestLead]);

  // Helper to copy text to clipboard
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2500);
  };

  // Helper for manual refresh
  const handleManualRefresh = () => {
    setIsRefreshing(true);
    onRefresh();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  // Helper to format date and time in a clear, readable format
  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return isHindi ? 'हाल ही में' : 'Recent';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleString(isHindi ? 'hi-IN' : 'en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  // Progress Stage Calculation (1 to 5)
  const getProgressStage = (status: string) => {
    switch (status) {
      case 'New':
        return 1;
      case 'UPC Generated':
        return 2;
      case 'SIM Allocated':
        return 3;
      case 'E-KYC Done':
        return 4;
      case 'Ported':
        return 5;
      default:
        return 1;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Ported':
        return {
          bg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
          text: isHindi ? 'सक्रिय / पोर्टेड' : 'Ported & Active',
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
        };
      case 'E-KYC Done':
        return {
          bg: 'bg-blue-100 text-blue-900 border-blue-300',
          text: isHindi ? 'ई-केवाईसी पूर्ण' : 'E-KYC Completed',
          icon: <ShieldCheck className="w-4 h-4 text-blue-600" />,
        };
      case 'SIM Allocated':
        return {
          bg: 'bg-amber-100 text-amber-950 border-amber-300',
          text: isHindi ? 'सिम आवंटित' : 'SIM Dispatched',
          icon: <Truck className="w-4 h-4 text-amber-600" />,
        };
      case 'UPC Generated':
        return {
          bg: 'bg-purple-100 text-purple-900 border-purple-300',
          text: isHindi ? 'UPC प्राप्त' : 'UPC Received',
          icon: <FileText className="w-4 h-4 text-purple-600" />,
        };
      default:
        return {
          bg: 'bg-red-50 text-red-800 border-red-200',
          text: isHindi ? 'अनुरोध प्राप्त' : 'Request Received',
          icon: <Clock className="w-4 h-4 text-red-500" />,
        };
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-800 font-sans flex flex-col justify-between">
      {/* =================================================================== */}
      {/* HEADER: Clean Top Bar (Personal Details are kept inside Profile) */}
      {/* =================================================================== */}
      <header className="sticky top-0 z-30 bg-red-600 text-white shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          {/* Brand Logo & Portal Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-xs border-2 border-amber-400 shrink-0 overflow-hidden">
              {logo.imageUrl ? (
                <img src={logo.imageUrl} alt={logo.text} className="w-8 h-8 object-contain" />
              ) : (
                <span className="text-red-600 font-black text-xl tracking-tighter">
                  {logo.symbol || 'V!'}
                </span>
              )}
            </div>
            <div>
              <h1 className="font-black text-base sm:text-lg tracking-tight leading-tight">
                {isHindi ? 'Vi ग्राहक पोर्टल' : 'Vi Customer Portal'}
              </h1>
              <p className="text-[11px] text-red-100 font-medium">
                {isHindi ? 'मेहेकर डोरस्टेप सिम पोर्टिंग' : 'Mehkar Doorstep SIM Service'}
              </p>
            </div>
          </div>

          {/* Action Buttons: Profile, Language & Logout */}
          <div className="flex items-center gap-2 shrink-0">
            {/* 3. PROFILE BUTTON: Opens Customer Profile */}
            <button
              type="button"
              id="btn-customer-open-profile"
              onClick={() => setIsProfileOpen(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-black bg-white text-red-700 hover:bg-red-50 border border-white shadow-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              title={isHindi ? 'मेरी प्रोफाइल देखें' : 'View Profile'}
            >
              <User className="w-3.5 h-3.5 text-red-600" />
              <span>{isHindi ? 'प्रोफाइल' : 'Profile'}</span>
            </button>

            {/* Language Toggle */}
            <button
              type="button"
              id="btn-customer-lang-toggle"
              onClick={toggleLanguage}
              title={isHindi ? 'Switch to English' : 'हिंदी में बदलें'}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-white/15 hover:bg-white/25 border border-white/30 flex items-center gap-1 text-white transition-all active:scale-95 cursor-pointer"
            >
              <span>{language === 'hi' ? '🇮🇳 HI' : '🇬🇧 EN'}</span>
            </button>

            {/* Logout */}
            <button
              type="button"
              id="btn-customer-logout"
              onClick={logout}
              title={isHindi ? 'लॉगआउट करें' : 'Logout'}
              className="p-2 rounded-xl bg-red-700 hover:bg-red-800 text-red-100 hover:text-white transition-colors active:scale-95 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* =================================================================== */}
      {/* MAIN CONTENT AREA */}
      {/* =================================================================== */}
      <main className="max-w-4xl w-full mx-auto px-4 py-6 space-y-6">

        {/* 2. NEW BOOKING: Separate Button / Card on Dashboard */}
        <section id="section-new-booking" className="animate-in fade-in duration-200">
          <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-3xl p-5 sm:p-6 text-white shadow-md border border-red-500 relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1.5 z-10">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-400 text-red-950 text-[11px] font-black uppercase tracking-wide">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isHindi ? 'डोरस्टेप सिम डिलीवरी' : 'Doorstep SIM Service'}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                {isHindi ? '✨ नई सिम पोर्टिंग बुकिंग (New Booking)' : '✨ New SIM Porting Booking'}
              </h2>
              <p className="text-xs sm:text-sm text-red-100 font-medium">
                {isHindi 
                  ? 'अपना नंबर Vi 4G/5G में फ्री में पोर्ट कराएं। सिम आपके घर पर डिलीवर की जाएगी।'
                  : 'Port your existing number or get a new Vi SIM delivered at your doorstep in Mehkar.'}
              </p>
            </div>

            <div className="z-10 shrink-0 w-full sm:w-auto">
              <button
                type="button"
                id="btn-customer-new-booking"
                onClick={onOpenNewRequest}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-red-950 font-black text-sm shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-5 h-5 stroke-[3]" />
                <span>{isHindi ? 'नई बुकिंग करें' : 'Book New Porting'}</span>
              </button>
            </div>

            {/* Subtle background decoration */}
            <div className="absolute right-[-10px] bottom-[-20px] opacity-10 text-white font-black text-8xl select-none pointer-events-none">
              Vi
            </div>
          </div>
        </section>

        {/* =================================================================== */}
        {/* ADMIN WHATSAPP CONTACT: "Admin से WhatsApp पर संपर्क करें" */}
        {/* =================================================================== */}
        <section id="section-admin-whatsapp-contact" className="animate-in fade-in duration-200">
          <div className="bg-gradient-to-r from-emerald-50 via-green-50 to-emerald-100/70 border-2 border-emerald-300/80 rounded-3xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#25D366] text-white flex items-center justify-center shadow-md shrink-0">
                <MessageCircle className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div className="space-y-0.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-200/80 text-emerald-950 text-[10px] font-black uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                  <span>{isHindi ? 'सीधा संपर्क' : 'Direct Support'}</span>
                </div>
                <h3 className="font-black text-base sm:text-lg text-emerald-950 tracking-tight leading-snug">
                  {isHindi ? 'Admin से WhatsApp पर संपर्क करें' : 'Contact Admin on WhatsApp'}
                </h3>
                <p className="text-xs text-emerald-800 font-semibold flex items-center gap-1.5">
                  <span>{isHindi ? 'WhatsApp नंबर:' : 'WhatsApp Number:'}</span>
                  <a 
                    href={adminWhatsAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono font-black text-emerald-950 text-sm hover:underline"
                  >
                    {adminWhatsAppFormatted}
                  </a>
                </p>
              </div>
            </div>

            <div className="w-full sm:w-auto shrink-0">
              <a
                href={adminWhatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                id="btn-customer-whatsapp-admin"
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-[#25D366] hover:bg-[#20ba5a] active:scale-95 text-white font-black text-sm shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <MessageCircle className="w-5 h-5 fill-white/20" />
                <span>{isHindi ? 'WhatsApp पर संपर्क करें' : 'Chat on WhatsApp'}</span>
              </a>
            </div>
          </div>
        </section>

        {/* 1. BOOKING: Existing / Current Booking on Dashboard */}
        <section id="section-existing-booking" className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-red-600" />
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                {isHindi ? 'मेरी बुकिंग (Current / Existing Booking)' : 'My Booking'}
              </h3>
            </div>
            
            <button
              type="button"
              id="btn-customer-refresh-data"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="text-slate-500 hover:text-red-600 font-bold text-xs flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white border border-slate-200 shadow-2xs hover:bg-slate-50 transition-colors"
              title={isHindi ? 'डेटा रीफ्रेश करें' : 'Refresh'}
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-red-600' : ''}`} />
              <span>{isHindi ? 'रीफ्रेश' : 'Refresh'}</span>
            </button>
          </div>

          {/* If No Existing Bookings */}
          {myLeads.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-10 text-center space-y-4 shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-100">
                <ClipboardList className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h4 className="font-extrabold text-slate-900 text-base">
                  {isHindi ? 'आपकी कोई मौजूदा बुकिंग नहीं है' : 'No Existing Bookings Found'}
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {isHindi 
                    ? 'आपने अभी तक कोई पोर्टिंग अनुरोध नहीं किया है। ऊपर "नई बुकिंग करें" बटन पर क्लिक करके नई बुकिंग दर्ज करें।'
                    : 'You do not have any active booking yet. Click on "Book New Porting" above to place your request.'}
                </p>
              </div>
            </div>
          ) : (
            /* Booking List Card(s) - Clicking opens full booking detail */
            <div className="space-y-4">
              {myLeads.map((lead, idx) => {
                const badge = getStatusBadge(lead.status);
                const stage = getProgressStage(lead.status);

                return (
                  <div
                    key={lead.id || idx}
                    id={`booking-card-${lead.id || idx}`}
                    onClick={() => setSelectedLead(lead)}
                    className="group bg-white rounded-3xl border-2 border-slate-200/90 hover:border-red-500 p-5 sm:p-6 shadow-xs hover:shadow-md transition-all cursor-pointer space-y-4"
                  >
                    {/* Top Row: Status Badge & Booking Date */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border ${badge.bg}`}>
                          {badge.icon}
                          <span>{badge.text}</span>
                        </span>
                        <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-slate-200">
                          {lead.leadType || 'Porting (MNP)'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatDateTime(lead.createdAt)}</span>
                      </div>
                    </div>

                    {/* Middle Row: Operator & Plan Summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">
                          {isHindi ? 'पोर्टिंग विवरण' : 'Porting Route'}
                        </span>
                        <span className="font-black text-slate-900 text-sm">
                          {lead.currentOperator} ➔ Vi 4G/5G
                        </span>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">
                          {isHindi ? 'चुना गया प्लान' : 'Selected Plan'}
                        </span>
                        <span className="font-black text-slate-900 text-sm truncate block">
                          {lead.selectedPlan || 'Vi Regular 4G/5G Plan'}
                        </span>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">
                          {isHindi ? 'लाइव प्रगति' : 'Live Progress'}
                        </span>
                        <span className="font-bold text-red-600 text-sm">
                          {stage}/5 {isHindi ? 'चरण पूर्ण' : 'Stages Complete'}
                        </span>
                      </div>
                    </div>

                    {/* Visual Progress Bar */}
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-red-600 to-emerald-500 rounded-full transition-all duration-700"
                        style={{ width: `${(stage / 5) * 100}%` }}
                      ></div>
                    </div>

                    {/* Bottom Row: Click prompt to open full details */}
                    <div className="pt-1 flex items-center justify-between text-xs font-bold text-red-600 group-hover:text-red-700">
                      <span className="flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        <span>{isHindi ? 'क्लिक करें: पूरी बुकिंग डिटेल देखें' : 'Click to view full booking details'}</span>
                      </span>
                      <div className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        <span>{isHindi ? 'खोलें' : 'Open Details'}</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </main>

      {/* =================================================================== */}
      {/* 4. ADMIN CONTACT OPTIONS: Shown at the bottom of Customer Portal */}
      {/* =================================================================== */}
      <footer id="footer-admin-mobile" className="mt-8 border-t border-slate-200/80 bg-white py-6">
        <div className="max-w-4xl mx-auto px-4 space-y-4">
          <div className="text-center space-y-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              {isHindi ? 'मदद या सहायता के लिए एडमिन से संपर्क करें' : 'Need Assistance? Contact Admin Directly'}
            </span>

            {/* Automatic Update Badge: Shown only when an update is available */}
            {isUpdateAvailable && (
              <div className="inline-flex items-center justify-center animate-bounce-subtle">
                <button
                  type="button"
                  id="btn-customer-care-update-badge"
                  onClick={() => setIsUpdateModalOpen(true)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-linear-to-r from-red-600 via-rose-600 to-red-700 text-white shadow-md shadow-red-500/25 hover:shadow-lg hover:shadow-red-500/40 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer border border-red-400/50 group"
                  title={isHindi ? 'नया अपडेट उपलब्ध है - अभी अपडेट करें' : 'New update available - Click to install'}
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                  </span>
                  <span className="text-xs font-bold text-white tracking-wide">
                    🔴 {isHindi ? 'नया अपडेट उपलब्ध है' : 'New Update Available'}
                  </span>
                  <span className="bg-white/20 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full text-white backdrop-blur-xs border border-white/25">
                    NEW UPDATE
                  </span>
                  <Download className="w-3.5 h-3.5 text-white group-hover:translate-y-0.5 transition-transform" />
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
            {/* WhatsApp Contact Box (Green) */}
            <div className="bg-emerald-50/90 rounded-2xl p-3.5 border border-emerald-200 shadow-2xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#25D366] text-white flex items-center justify-center font-bold shrink-0">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider block">
                    {isHindi ? 'Admin WhatsApp नंबर' : 'Admin WhatsApp'}
                  </span>
                  <a
                    href={adminWhatsAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-black text-emerald-950 text-sm hover:underline"
                  >
                    {adminWhatsAppFormatted}
                  </a>
                </div>
              </div>

              <a
                href={adminWhatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                id="btn-footer-whatsapp-admin"
                className="px-3.5 py-2 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs transition-transform active:scale-95 cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>{isHindi ? 'WhatsApp' : 'Chat'}</span>
              </a>
            </div>

            {/* Call Contact Box */}
            <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 shadow-2xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold shrink-0">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                    {isHindi ? 'एडमिन कॉल नंबर' : 'Admin Call Number'}
                  </span>
                  <a
                    href={`tel:${adminMobileNumber}`}
                    className="font-black text-slate-900 text-sm hover:text-red-600 transition-colors"
                  >
                    +91 {adminMobileNumber}
                  </a>
                </div>
              </div>

              <a
                href={`tel:${adminMobileNumber}`}
                id="btn-call-admin-mobile"
                className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs transition-transform active:scale-95 cursor-pointer"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>{isHindi ? 'कॉल करें' : 'Call'}</span>
              </a>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2 text-[11px] text-slate-400 font-medium">
            <span>{adminHelp.supportTitle || 'VI 5G Doorstep SIM Service Mehkar'} • {adminHelp.supportHours || '8:00 AM - 9:00 PM'}</span>
            <span className="hidden sm:inline">•</span>
            <div className="inline-flex items-center gap-2">
              <span className="font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md text-[10px] font-bold border border-slate-200">
                App v{installedVersion.versionName}
              </span>
              <button
                type="button"
                id="btn-customer-check-update"
                onClick={handleManualCheckUpdates}
                className="text-red-600 hover:text-red-700 font-bold hover:underline cursor-pointer flex items-center gap-1 transition-colors"
                title={isHindi ? 'ऐप अपडेट चेक करें' : 'Check for app update'}
              >
                <Download className="w-3 h-3" />
                <span>{isHindi ? 'अपडेट चेक करें' : 'Check Update'}</span>
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                id="btn-test-customer-popup"
                onClick={() => setIsTestPopupOpen(true)}
                className="text-amber-600 hover:text-amber-700 font-bold hover:underline cursor-pointer flex items-center gap-1 transition-colors"
                title={isHindi ? 'ग्राहक अपडेट पॉपअप टेस्ट करें' : 'Test Customer Popup'}
              >
                <Sparkles className="w-3 h-3" />
                <span>{isHindi ? 'पॉपअप टेस्ट करें' : 'Test Customer Popup'}</span>
              </button>
            </div>
          </div>

          {manualUpdateNotice && (
            <p className="text-center text-xs font-bold text-emerald-600 animate-in fade-in">
              {manualUpdateNotice}
            </p>
          )}
        </div>
      </footer>

      {/* =================================================================== */}
      {/* 3. PROFILE MODAL: All Customer Personal Details reside strictly here */}
      {/* =================================================================== */}
      {isProfileOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-base text-slate-900 leading-tight">
                    {isHindi ? 'ग्राहक प्रोफाइल (Customer Profile)' : 'Customer Profile'}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {isHindi ? 'आपकी व्यक्तिगत जानकारी' : 'Your Personal Details'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                id="btn-close-profile-modal"
                onClick={() => setIsProfileOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Profile Personal Details List */}
            <div className="space-y-3 text-xs">
              {/* Name */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-slate-400 font-bold uppercase text-[10px] block">
                  👤 {isHindi ? 'ग्राहक का नाम' : 'Full Name'}
                </span>
                <p className="font-black text-slate-900 text-sm">
                  {profileDetails.name}
                </p>
              </div>

              {/* Mobile Numbers */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-slate-400 font-bold uppercase text-[10px] block">
                    📱 {isHindi ? 'मोबाइल नंबर' : 'Mobile Number'}
                  </span>
                  <p className="font-black text-slate-900 text-sm">
                    {profileDetails.mobile}
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-slate-400 font-bold uppercase text-[10px] block">
                    📞 {isHindi ? 'वैकल्पिक नंबर' : 'Alternate Mobile'}
                  </span>
                  <p className="font-bold text-slate-700 text-sm">
                    {profileDetails.altMobile}
                  </p>
                </div>
              </div>

              {/* Email */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-slate-400 font-bold uppercase text-[10px] block">
                  ✉️ {isHindi ? 'ईमेल आईडी' : 'Email Address'}
                </span>
                <p className="font-bold text-slate-800 text-xs truncate">
                  {profileDetails.email}
                </p>
              </div>

              {/* Full Address */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-slate-400 font-bold uppercase text-[10px] block">
                  📍 {isHindi ? 'ग्राहक का पूरा पता' : 'Delivery Address'}
                </span>
                <p className="font-bold text-slate-900 leading-relaxed">
                  {profileDetails.fullAddress}
                </p>
              </div>

              {/* Taluka & District */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-bold">तालुका</span>
                  <span className="font-bold text-slate-800">{profileDetails.taluka}</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-bold">जिला</span>
                  <span className="font-bold text-slate-800">{profileDetails.district}</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-bold">पिनकोड</span>
                  <span className="font-bold text-slate-800">{profileDetails.pincode}</span>
                </div>
              </div>

              {/* Service Circle */}
              <div className="p-3 bg-red-50 rounded-2xl border border-red-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-red-700 font-bold uppercase block">
                    {isHindi ? 'अधिकृत दूरसंचार सर्किल' : 'Telecom Circle'}
                  </span>
                  <span className="font-bold text-slate-900 text-xs">{profileDetails.circle}</span>
                </div>
                <ShieldCheck className="w-5 h-5 text-red-600" />
              </div>

              {/* Requirement 3: Check for Update option in settings/profile menu */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">
                    {isHindi ? 'ऐप संस्करण (App Version)' : 'App Version'}
                  </span>
                  <span className="font-mono font-bold text-slate-800 text-xs">
                    v{installedVersion.versionName} (Build {installedVersion.versionCode})
                  </span>
                </div>
                <button
                  type="button"
                  id="btn-profile-check-update"
                  onClick={() => {
                    setIsProfileOpen(false);
                    handleManualCheckUpdates();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-xs transition-transform active:scale-95 cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  <span>{isHindi ? 'अपडेट चेक करें' : 'Check for Update'}</span>
                </button>
              </div>
            </div>

            {/* Close Button */}
            <div className="pt-2">
              <button
                type="button"
                id="btn-close-profile"
                onClick={() => setIsProfileOpen(false)}
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs cursor-pointer shadow-xs transition-colors"
              >
                {isHindi ? 'बंद करें (Close)' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 1. FULL BOOKING DETAIL MODAL: Opened when clicking on any Booking */}
      {/* =================================================================== */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-base text-slate-900">
                    {isHindi ? 'पूरी बुकिंग डिटेल (Booking Details)' : 'Full Booking Details'}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {isHindi ? 'बुकिंग संदर्भ व लाइव स्थिति' : 'Booking Reference & Live Status'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                id="btn-close-lead-detail"
                onClick={() => setSelectedLead(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Status Banner */}
              <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">
                    {isHindi ? 'वर्तमान स्थिति' : 'Current Status'}
                  </span>
                  <span className="font-black text-slate-900 text-sm">
                    {selectedLead.bookingStatus || selectedLead.status}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">
                    {isHindi ? 'बुकिंग दिनांक' : 'Booking Date'}
                  </span>
                  <span className="font-bold text-slate-800">
                    {formatDateTime(selectedLead.createdAt)}
                  </span>
                </div>
              </div>

              {/* 5-Stage Tracker */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-black">
                  <span className="text-slate-700 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-red-600" />
                    {isHindi ? 'लाइव प्रगति स्थिति' : 'Progress Stage'}
                  </span>
                  <span className="text-red-600">
                    {getProgressStage(selectedLead.status)}/5 {isHindi ? 'पूर्ण' : 'Done'}
                  </span>
                </div>

                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-600 to-emerald-500 rounded-full"
                    style={{ width: `${(getProgressStage(selectedLead.status) / 5) * 100}%` }}
                  ></div>
                </div>

                <div className="grid grid-cols-5 gap-1 pt-1 text-[10px] font-bold text-center">
                  <div className={getProgressStage(selectedLead.status) >= 1 ? 'text-emerald-700' : 'text-slate-400'}>
                    1. अनुरोध
                  </div>
                  <div className={getProgressStage(selectedLead.status) >= 2 ? 'text-emerald-700' : 'text-slate-400'}>
                    2. UPC
                  </div>
                  <div className={getProgressStage(selectedLead.status) >= 3 ? 'text-emerald-700' : 'text-slate-400'}>
                    3. सिम
                  </div>
                  <div className={getProgressStage(selectedLead.status) >= 4 ? 'text-emerald-700' : 'text-slate-400'}>
                    4. ई-केवाईसी
                  </div>
                  <div className={getProgressStage(selectedLead.status) >= 5 ? 'text-emerald-700' : 'text-slate-400'}>
                    5. सक्रिय
                  </div>
                </div>
              </div>

              {/* Booking Porting & SIM Info */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block font-medium">{isHindi ? 'ग्राहक का नाम' : 'Customer Name'}</span>
                  <span className="font-bold text-slate-900 text-sm">{selectedLead.customerName || profileDetails.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">{isHindi ? 'मोबाइल नंबर' : 'Mobile Number'}</span>
                  <span className="font-bold text-slate-900 text-sm">{selectedLead.mobileNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">{isHindi ? 'मौजूदा ऑपरेटर' : 'Current Operator'}</span>
                  <span className="font-bold text-red-600 text-sm">{selectedLead.currentOperator} ➔ Vi</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">{isHindi ? 'कनेक्शन प्रकार' : 'Connection Type'}</span>
                  <span className="font-bold text-slate-800">{selectedLead.connectionType}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">{isHindi ? 'चुना गया प्लान' : 'Selected Plan'}</span>
                  <span className="font-bold text-slate-800">{selectedLead.selectedPlan}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">{isHindi ? 'सिम आवंटन' : 'SIM Allocation'}</span>
                  <span className="font-bold text-slate-800">{selectedLead.simNumber || 'Doorstep SIM Allocation'}</span>
                </div>
              </div>

              {/* UPC Code Box (If available) */}
              {selectedLead.upcCode && (
                <div className="bg-red-50 border border-red-200 p-3.5 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-red-900 font-bold block text-xs">UPC (Unique Porting Code)</span>
                    <span className="text-[11px] text-red-600">
                      {selectedLead.upcExpiryDate ? `Valid till: ${selectedLead.upcExpiryDate}` : 'Active'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-black text-red-700 tracking-wider bg-white px-3 py-1 rounded-xl shadow-2xs border border-red-200">
                      {selectedLead.upcCode}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(selectedLead.upcCode || '', 'upc')}
                      className="p-1.5 rounded-lg bg-white border border-red-200 text-slate-600 hover:text-red-600 cursor-pointer"
                      title="Copy UPC"
                    >
                      {copiedText === 'upc' ? <CheckCheck className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Delivery Address */}
              <div className="space-y-1 text-slate-700 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium block">{isHindi ? 'डिलीवरी का पता' : 'Delivery Address'}</span>
                  {selectedLead.locationCoordinates && (
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      GPS Verified
                    </span>
                  )}
                </div>
                <p className="font-bold text-slate-900 leading-relaxed">
                  {selectedLead.taluka
                    ? `${selectedLead.address || ''}, ${selectedLead.taluka}, ${selectedLead.district}, ${selectedLead.state} - ${selectedLead.pincode}`
                    : (selectedLead.customerAddress || selectedLead.address || profileDetails.fullAddress)}
                </p>
                {selectedLead.locationCoordinates && (
                  <p className="text-[11px] text-blue-700 font-mono bg-blue-50 p-2 rounded-xl border border-blue-100 mt-1">
                    📍 GPS: {selectedLead.locationCoordinates.latitude.toFixed(6)}, {selectedLead.locationCoordinates.longitude.toFixed(6)}
                  </p>
                )}
              </div>

              {/* Remarks */}
              {selectedLead.remarks && (
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900">
                  <span className="font-bold block">{isHindi ? 'टिप्पणी (Remarks):' : 'Remarks:'}</span>
                  <p className="mt-0.5">{selectedLead.remarks}</p>
                </div>
              )}
            </div>

            {/* Quick Contact Admin via WhatsApp for this Booking */}
            <div className="pt-2 space-y-2">
              <a
                href={`https://wa.me/91${adminWhatsAppClean}?text=${encodeURIComponent(
                  `नमस्ते Admin, मेरी Vi बुकिंग (मोबाइल: ${selectedLead.mobileNumber}, स्थिति: ${selectedLead.bookingStatus || selectedLead.status}) के बारे में सहायता चाहिए।`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                id="btn-lead-whatsapp-inquiry"
                className="w-full py-3 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>{isHindi ? 'इस बुकिंग के लिए WhatsApp पर संपर्क करें' : 'Inquire on WhatsApp about this Booking'}</span>
              </a>

              <button
                type="button"
                id="btn-close-lead-modal-bottom"
                onClick={() => setSelectedLead(null)}
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs cursor-pointer shadow-xs transition-colors"
              >
                {isHindi ? 'बंद करें (Close)' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 4. APP UPDATE MODAL: Android APK Automatic Update System            */}
      {/* =================================================================== */}
      <AppUpdateModal
        isOpen={isUpdateModalOpen || isTestPopupOpen}
        installedVersion={
          isTestPopupOpen 
            ? { versionName: '1.0', versionCode: 1, appId: 'com.vi.salesmnp', isNative: false } 
            : installedVersion
        }
        updateConfig={portalConfig.appUpdate || DEFAULT_APP_UPDATE_CONFIG}
        onDismissLater={() => {
          if (isTestPopupOpen) {
            setIsTestPopupOpen(false);
          } else {
            handleDismissUpdateLater();
          }
        }}
        isHindi={isHindi}
      />
    </div>
  );
};
