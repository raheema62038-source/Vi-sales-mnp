import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  ShieldCheck, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  ArrowUpRight,
  Search,
  Check,
  Clock,
  CheckCircle2,
  XCircle,
  Crown,
  UserPlus,
  UserX,
  UserCheck,
  Ban,
  RotateCcw,
  Shield,
  AlertTriangle,
  Lock,
  Trash2,
  History,
  Download,
  Sparkles,
  Flame
} from 'lucide-react';
import { UserProfile, UserRole, Lead } from '../types';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { 
  getAllUsers, 
  subscribeToAllUsers,
  getPendingAdminRequests, 
  approveAdminRequest, 
  rejectAdminRequest,
  deactivateAdminUser,
  reactivateAdminUser,
  removeAdminUser,
  isEmailPrimaryOwner,
  PRIMARY_OWNER_EMAIL
} from '../services/userService';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { AddAdminModal } from './AddAdminModal';

interface AdminUsersViewProps {
  allLeads: Lead[];
  onFilterByUser: (userUid: string) => void;
  onOpenEditOffer?: () => void;
}

export const AdminUsersView: React.FC<AdminUsersViewProps> = ({
  allLeads,
  onFilterByUser,
  onOpenEditOffer,
}) => {
  const { language } = useLanguage();
  const { user: authUser, isOwnerAdmin } = useAuth();
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'admin' | 'customer'>('ALL');
  const [downloadEventsCount, setDownloadEventsCount] = useState<number>(0);
  const [actionUid, setActionUid] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);
  const [adminActionModal, setAdminActionModal] = useState<{
    user: UserProfile;
    action: 'deactivate' | 'delete';
  } | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [userList, pendingList] = await Promise.all([
        getAllUsers(),
        getPendingAdminRequests(),
      ]);
      setUsers(userList);
      setPendingRequests(pendingList);
    } catch (e: any) {
      console.error('Error loading admin user data:', e);
      setErrorMsg(e?.message || 'डेटा लोड करने में त्रुटि हुई');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = subscribeToAllUsers((liveUsers) => {
      if (liveUsers && liveUsers.length > 0) {
        setUsers(liveUsers);
        setLoading(false);
      }
    });

    let unsubDl: (() => void) | undefined;
    try {
      unsubDl = onSnapshot(collection(db, 'app_downloads'), (snap) => {
        setDownloadEventsCount(snap.size);
      }, (err) => {
        console.warn('app_downloads subscription error:', err);
      });
    } catch (e) {
      console.warn(e);
    }

    return () => {
      try {
        unsub();
      } catch (_) {}
      if (unsubDl) {
        try {
          unsubDl();
        } catch (_) {}
      }
    };
  }, []);

  const executeAdminAction = async () => {
    if (!adminActionModal || !authUser || !isOwnerAdmin) return;
    const { user, action } = adminActionModal;
    setIsSubmittingAction(true);
    setErrorMsg(null);
    try {
      if (action === 'deactivate') {
        await deactivateAdminUser(user.uid, authUser.uid, user.email);
        setSuccessMsg(
          language === 'hi'
            ? `Admin "${user.displayName}" का खाता Deactivate कर दिया गया। लॉगिन एक्सेस तत्काल बंद कर दी गई है। इनका ऑडिट इतिहास व लीड्स सुरक्षित हैं।`
            : `Admin "${user.displayName}" deactivated. Login access terminated; historical leads & records remain safe.`
        );
      } else {
        await removeAdminUser(user.uid, authUser.uid, user.email, authUser.email || undefined, actionReason);
        setSuccessMsg(
          language === 'hi'
            ? `Admin "${user.displayName}" की एडमिन एक्सेस हटा दी गई है। पुराना इतिहास व लीड्स Owner Portal में पूर्णतः सुरक्षित हैं।`
            : `Admin access revoked for "${user.displayName}". Customer & lead records preserved in Owner Portal.`
        );
      }
      setAdminActionModal(null);
      setActionReason('');
      setTimeout(() => setSuccessMsg(null), 5000);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err?.message || 'कार्रवाई करने में त्रुटि हुई');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleReactivate = async (targetUser: UserProfile) => {
    if (!authUser || !isOwnerAdmin) return;
    setActionUid(targetUser.uid);
    try {
      await reactivateAdminUser(targetUser.uid, authUser.uid);
      setSuccessMsg(
        language === 'hi'
          ? `${targetUser.displayName} का Admin खाता पुनः सक्रिय (Reactivated) कर दिया गया!`
          : `${targetUser.displayName} has been reactivated!`
      );
      setTimeout(() => setSuccessMsg(null), 4000);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Reactivation error');
    } finally {
      setActionUid(null);
    }
  };

  const handleApprovePending = async (req: UserProfile) => {
    if (!authUser || !isOwnerAdmin) return;
    setActionUid(req.uid);
    try {
      await approveAdminRequest(req.uid, authUser.uid);
      setSuccessMsg(
        language === 'hi'
          ? `${req.displayName} को Admin के रूप में स्वीकृत किया गया!`
          : `${req.displayName} approved as Admin!`
      );
      setTimeout(() => setSuccessMsg(null), 3500);
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Approve error');
    } finally {
      setActionUid(null);
    }
  };

  const handleRejectPending = async (req: UserProfile) => {
    if (!authUser || !isOwnerAdmin) return;
    setActionUid(req.uid);
    try {
      await rejectAdminRequest(req.uid, authUser.uid);
      setSuccessMsg(
        language === 'hi'
          ? `${req.displayName} का Admin अनुरोध अस्वीकार किया गया।`
          : `${req.displayName}'s request was rejected.`
      );
      setTimeout(() => setSuccessMsg(null), 3500);
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Reject error');
    } finally {
      setActionUid(null);
    }
  };

  const getUserStats = (uid: string) => {
    const userLeads = allLeads.filter((l) => l.customerUid === uid || l.createdByUid === uid || l.salespersonUid === uid);
    const ported = userLeads.filter((l) => l.status === 'Ported').length;
    const upc = userLeads.filter((l) => l.status === 'UPC Generated').length;
    return {
      total: userLeads.length,
      ported,
      upc,
      rate: userLeads.length > 0 ? Math.round((ported / userLeads.length) * 100) : 0,
    };
  };

  const filteredUsers = users.filter((u) => {
    const nameMatch = u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
    const emailMatch = u.email?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
    const phoneMatch = (u.phone && u.phone.includes(searchQuery)) || false;
    const circleMatch = (u.assignedCircle && u.assignedCircle.toLowerCase().includes(searchQuery.toLowerCase())) || false;
    const matchesSearch = nameMatch || emailMatch || phoneMatch || circleMatch;

    const isAdminUser = u.role === 'admin' || u.role === 'owner';
    const matchesRole = 
      roleFilter === 'ALL' || 
      (roleFilter === 'admin' && isAdminUser) || 
      (roleFilter === 'customer' && !isAdminUser);

    return matchesSearch && matchesRole;
  });

  const totalAdminsCount = users.filter((u) => u.role === 'admin' || u.role === 'owner' || isEmailPrimaryOwner(u.email)).length;
  const activeAdminsCount = users.filter((u) => (u.role === 'admin' || u.role === 'owner' || isEmailPrimaryOwner(u.email)) && !u.isDeactivated && u.status !== 'deactivated' && u.status !== 'deleted').length;

  const customerUsers = useMemo(() => {
    return users.filter((u) => u.role === 'customer' || (!u.role && !isEmailPrimaryOwner(u.email)));
  }, [users]);

  // 1. TOTAL CUSTOMERS JOINED = total unique customer accounts registered in the app.
  const totalCustomersJoined = customerUsers.length;
  // 2. TOTAL CUSTOMERS = total unique customer accounts stored in Firebase.
  const totalCustomers = customerUsers.length;
  // 3. TOTAL CUSTOMERS LOGGED IN = number of unique customers who have successfully logged in at least once.
  const totalCustomersLoggedIn = customerUsers.filter(
    (u) => u.hasLoggedIn || (u.loginCount && u.loginCount > 0) || Boolean(u.lastLoginAt)
  ).length;
  // 4. TOTAL APP/APK DOWNLOADS = number of customers who actually downloaded the APK/app through a trackable download action.
  const customersWithDownloads = customerUsers.filter(
    (u) => (u.downloadCount && u.downloadCount > 0) || u.hasDownloaded
  ).length;
  const totalAppDownloads = Math.max(customersWithDownloads, downloadEventsCount);

  // Filtered customer list for the Admin Customer List table
  const filteredCustomers = useMemo(() => {
    if (!customerSearchQuery.trim()) return customerUsers;
    const q = customerSearchQuery.toLowerCase().trim();
    return customerUsers.filter((u) => {
      const name = (u.displayName || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const phone = (u.phone || u.phoneNumber || '').toLowerCase();
      const uid = (u.uid || '').toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q) || uid.includes(q);
    });
  }, [customerUsers, customerSearchQuery]);

  return (
    <div className="p-4 space-y-5 max-w-5xl mx-auto pb-24 font-sans">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-red-600 via-red-700 to-amber-700 rounded-2xl p-5 text-white shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-amber-300" />
            <h2 className="text-lg font-black tracking-tight">
              {language === 'hi' ? 'प्रशासक एवं उपयोगकर्ता प्रबंधन' : 'Admin & User Management'}
            </h2>
          </div>
          <p className="text-xs text-red-100 mt-1 max-w-lg">
            {isOwnerAdmin 
              ? (language === 'hi' 
                  ? 'Primary Owner Admin विशेषाधिकार सक्रिय: केवल आप नए Admin जोड़ सकते हैं और Admins को Deactivate/Remove कर सकते हैं।' 
                  : 'Primary Owner Admin privileges active: Only you can Add, Deactivate, or Remove Admins.')
              : (language === 'hi'
                  ? 'Admin Portal: आप MNP Leads और Customer Requests प्रबंधित कर सकते हैं। Admin जोड़ना Owner के लिए आरक्षित है।'
                  : 'Admin Portal: Operational access for Customer Requests & MNP Leads. Admin creation reserved for Primary Owner.')}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {onOpenEditOffer && (
            <button
              id="admin-view-edit-offer-btn"
              type="button"
              onClick={onOpenEditOffer}
              className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>{language === 'hi' ? 'प्रमोशनल ऑफर एडिट करें' : 'Edit Customer Offer'}</span>
            </button>
          )}

          {isOwnerAdmin && (
            <button
              id="open-add-admin-modal-btn"
              type="button"
              onClick={() => setIsAddAdminOpen(true)}
              className="px-4 py-2.5 bg-white hover:bg-red-50 active:scale-95 text-red-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer border border-red-200"
            >
              <UserPlus className="w-4 h-4 text-red-700" />
              <span>{language === 'hi' ? '+ नया Admin जोड़ें' : '+ Add New Admin'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Admin Offer Control Banner */}
      <div className="bg-gradient-to-r from-amber-50 via-white to-red-50 p-4 rounded-2xl border-2 border-amber-300 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-black shrink-0 shadow-xs">
            <Flame className="w-5 h-5 text-amber-300 fill-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-slate-900">
                {language === 'hi' ? 'ग्राहक बुकिंग फॉर्म ऑफर: VI 5G READY MEHKAR' : 'Customer Booking Form Offer: VI 5G READY MEHKAR'}
              </span>
              <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-md">
                Admin Controlled
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5">
              {language === 'hi'
                ? 'यह ऑफर Firestore डेटाबेस से जुड़ा है। आप इसे कभी भी एडिट कर सकते हैं और ग्राहकों को तुरंत लाइव दिखेगा।'
                : 'Offer text is synced with Firebase Firestore. Only Admin can edit; updates propagate in real time.'}
            </p>
          </div>
        </div>

        {onOpenEditOffer && (
          <button
            type="button"
            onClick={onOpenEditOffer}
            className="shrink-0 px-4 py-2 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{language === 'hi' ? 'ऑफर एडिट करें' : 'Edit Offer'}</span>
          </button>
        )}
      </div>

      {/* Role Notice Card */}
      <div className={`p-4 rounded-2xl border text-xs flex items-start gap-3 ${
        isOwnerAdmin 
          ? 'bg-amber-50/80 border-amber-300 text-amber-950' 
          : 'bg-blue-50/80 border-blue-200 text-blue-950'
      }`}>
        {isOwnerAdmin ? (
          <Crown className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        ) : (
          <Shield className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        )}
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-extrabold text-xs">
              {isOwnerAdmin
                ? (language === 'hi' ? '👑 Primary Owner Admin नियंत्रण' : '👑 Primary Owner Admin Controls')
                : (language === 'hi' ? '🛡️ Admin Operations Access' : '🛡️ Admin Operations Access')}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isOwnerAdmin ? 'bg-amber-200 text-amber-900' : 'bg-blue-200 text-blue-900'
            }`}>
              {isOwnerAdmin ? `Owner: ${PRIMARY_OWNER_EMAIL}` : 'Standard Admin'}
            </span>
          </div>
          <p className="text-[11px] opacity-90 leading-relaxed">
            {isOwnerAdmin
              ? (language === 'hi'
                  ? 'सिस्टम में एक ही Primary Owner Admin है। केवल Owner ही "Add Admin" करके नया Admin बना सकते हैं और Admins को निष्क्रीय (Deactivate) कर सकते हैं।'
                  : 'System has one Primary Owner Admin. Only the Owner can Add, Deactivate, or Revoke Admin rights.')
              : (language === 'hi'
                  ? 'आपको Admin Portal में ग्राहकों की MNP Leads और प्रक्रियाएँ प्रबंधित करने की पूरी अनुमति है। नए Admin बनाने या Owner बदलने की अनुमति केवल Primary Owner को है।'
                  : 'You have permissions to manage MNP Leads and customer workflows. Creating admins or modifying roles is restricted to the Primary Owner.')}
          </p>
        </div>
      </div>

      {/* Notification Messages */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 font-semibold">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2 font-semibold">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 4 Separate Customer Statistics Cards */}
      <section aria-labelledby="customer-stats-heading" className="space-y-2">
        <h3 id="customer-stats-heading" className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          {language === 'hi' ? 'ग्राहक आँकड़े (Customer Statistics)' : 'Customer Statistics'}
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: TOTAL CUSTOMERS JOINED */}
          <div className="bg-white border border-blue-200/90 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <UserPlus className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                Joined
              </span>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-black text-gray-900 leading-none block">
                {totalCustomersJoined}
              </span>
              <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider block mt-1.5">
                {language === 'hi' ? 'कुल जुड़े ग्राहक' : 'TOTAL CUSTOMERS JOINED'}
              </span>
              <span className="text-[10px] text-gray-500 block mt-0.5">
                {language === 'hi' ? 'ऐप में पंजीकृत अद्वितीय खाते' : 'Unique accounts registered'}
              </span>
            </div>
          </div>

          {/* Card 2: TOTAL CUSTOMERS (Stored in Firebase) */}
          <div className="bg-white border border-amber-200/90 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full">
                Firebase
              </span>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-black text-gray-900 leading-none block">
                {totalCustomers}
              </span>
              <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider block mt-1.5">
                {language === 'hi' ? 'कुल ग्राहक' : 'TOTAL CUSTOMERS'}
              </span>
              <span className="text-[10px] text-gray-500 block mt-0.5">
                {language === 'hi' ? 'Firebase में संग्रहीत अद्वितीय ग्राहक' : 'Stored in Firebase'}
              </span>
            </div>
          </div>

          {/* Card 3: TOTAL CUSTOMERS LOGGED IN */}
          <div className="bg-white border border-emerald-200/90 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <UserCheck className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                Active
              </span>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-black text-gray-900 leading-none block">
                {totalCustomersLoggedIn}
              </span>
              <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider block mt-1.5">
                {language === 'hi' ? 'लॉग इन किए ग्राहक' : 'TOTAL CUSTOMERS LOGGED IN'}
              </span>
              <span className="text-[10px] text-gray-500 block mt-0.5">
                {language === 'hi' ? 'सफल लॉगिन ≥ 1 बार' : 'Logged in ≥ 1 time'}
              </span>
            </div>
          </div>

          {/* Card 4: TOTAL APP/APK DOWNLOADS */}
          <div className="bg-white border border-purple-200/90 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <Download className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                Downloads
              </span>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-black text-gray-900 leading-none block">
                {totalAppDownloads}
              </span>
              <span className="text-[11px] font-bold text-purple-900 uppercase tracking-wider block mt-1.5">
                {language === 'hi' ? 'कुल ऐप/APK डाउनलोड' : 'TOTAL APP/APK DOWNLOADS'}
              </span>
              <span className="text-[10px] text-gray-500 block mt-0.5">
                {language === 'hi' ? 'ट्रैक किए गए ऐप डाउनलोड' : 'Trackable app downloads'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ADMIN CUSTOMER LIST (Placed Directly Below Statistics) */}
      <section className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden space-y-0">
        <div className="p-4 bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-red-600" />
              <h3 className="font-extrabold text-sm sm:text-base text-gray-900">
                {language === 'hi' ? 'ग्राहक सूची (ADMIN CUSTOMER LIST)' : 'ADMIN CUSTOMER LIST'}
              </h3>
              <span className="text-xs font-bold text-gray-700 bg-white border border-gray-200 px-2.5 py-0.5 rounded-full shadow-2xs">
                {filteredCustomers.length} {filteredCustomers.length === 1 ? 'Customer' : 'Customers'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {language === 'hi' 
                ? 'सभी ग्राहकों का नाम, मोबाइल, ईमेल, पंजीकरण तिथि, अंतिम लॉगिन, लॉगिन संख्या और डाउनलोड स्थिति' 
                : 'Customer directory: Name, mobile, login ID, registration date, last login, login count & downloads'}
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
            <input
              id="admin-search-customers-input"
              type="text"
              value={customerSearchQuery}
              onChange={(e) => setCustomerSearchQuery(e.target.value)}
              placeholder={language === 'hi' ? 'नाम, मोबाइल, ईमेल खोजें...' : 'Search name, mobile, email...'}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none shadow-2xs"
            />
          </div>
        </div>

        {/* Customer List Table */}
        {loading ? (
          <div className="text-center py-10 text-xs text-gray-500">
            <div className="inline-block animate-spin text-red-600 text-lg mb-2">⟳</div>
            <p>{language === 'hi' ? 'ग्राहक सूची लोड हो रही है...' : 'Loading customer list...'}</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-xs">
            <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="font-semibold text-gray-700">
              {language === 'hi' ? 'कोई ग्राहक रिकॉर्ड नहीं मिला' : 'No customer records found'}
            </p>
            <p className="text-gray-400 mt-0.5">
              {customerSearchQuery 
                ? (language === 'hi' ? 'खोज शब्द बदलकर प्रयास करें' : 'Try searching with a different term')
                : (language === 'hi' ? 'नए ग्राहक पंजीकरण करने पर यहां दिखाई देंगे।' : 'Registered customers will appear here.')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-100/80 border-b border-gray-200 text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-3">Mobile Number</th>
                  <th className="py-3 px-3">Email / Login ID</th>
                  <th className="py-3 px-3">Registration Date</th>
                  <th className="py-3 px-3">Last Login Date</th>
                  <th className="py-3 px-3 text-center">Login Count</th>
                  <th className="py-3 px-3 text-center">Download Count</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCustomers.map((cust) => {
                  const leadStats = getUserStats(cust.uid);
                  const regDate = cust.createdAt 
                    ? new Date(cust.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                    : '-';
                  const lastLoginStr = cust.lastLoginAt
                    ? new Date(cust.lastLoginAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : (cust.hasLoggedIn ? 'Logged in' : 'Never');
                  const loginNum = cust.loginCount ?? (cust.hasLoggedIn || cust.lastLoginAt ? 1 : 0);
                  const dlNum = cust.downloadCount ?? (cust.hasDownloaded ? 1 : 0);

                  return (
                    <tr key={cust.uid} className="hover:bg-gray-50/75 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center shrink-0 border border-emerald-200">
                            {(cust.displayName || cust.email || 'C').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-gray-900 block truncate max-w-[150px]">
                              {cust.displayName || cust.email?.split('@')[0] || 'Customer'}
                            </span>
                            <span className="text-[10px] text-gray-400 font-mono block">
                              UID: {cust.uid.slice(0, 8)}...
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 font-mono font-medium text-gray-800 whitespace-nowrap">
                        {cust.phone || cust.phoneNumber || '-'}
                      </td>

                      <td className="py-3 px-3 text-gray-600 font-mono text-[11px] truncate max-w-[160px]" title={cust.email || cust.uid}>
                        {cust.email || cust.phoneNumber || cust.uid}
                      </td>

                      <td className="py-3 px-3 text-gray-600 whitespace-nowrap text-[11px]">
                        {regDate}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`text-[11px] font-medium ${cust.lastLoginAt ? 'text-gray-800' : 'text-gray-400'}`}>
                          {lastLoginStr}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full text-[11px] font-black ${
                          loginNum > 0 
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {loginNum}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 justify-center min-w-[28px] px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                          dlNum > 0
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : 'bg-gray-100 text-gray-400'
                        }`}>
                          <Download className="w-3 h-3" />
                          <span>{dlNum}</span>
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onFilterByUser(cust.uid)}
                          className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition-all inline-flex items-center gap-1 cursor-pointer"
                          title="View Customer Leads"
                        >
                          <span>{leadStats.total} Leads</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ADMIN & OWNER TEAM MANAGEMENT SECTION */}
      <section className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-600" />
            <h3 className="font-extrabold text-sm sm:text-base text-gray-900">
              {language === 'hi' ? 'प्रशासक एवं संचालन टीम (Admin Team Management)' : 'Admin & Operations Team'}
            </h3>
          </div>
          <span className="text-xs font-bold text-gray-500">
            {totalAdminsCount} {language === 'hi' ? 'एडमिन्स' : 'Admins'} ({activeAdminsCount} {language === 'hi' ? 'सक्रिय' : 'Active'})
          </span>
        </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            id="admin-search-users-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'hi' ? 'नाम, ईमेल, फ़ोन या सर्कल से खोजें...' : 'Search by name, email, phone or circle...'}
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none shadow-2xs"
          />
        </div>

        <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setRoleFilter('ALL')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              roleFilter === 'ALL' ? 'bg-white shadow-2xs text-gray-900' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {language === 'hi' ? 'सभी' : 'All'} ({users.length})
          </button>
          <button
            type="button"
            onClick={() => setRoleFilter('admin')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              roleFilter === 'admin' ? 'bg-white shadow-2xs text-amber-700 font-extrabold' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {language === 'hi' ? 'Admins' : 'Admins'} ({totalAdminsCount})
          </button>
          <button
            type="button"
            onClick={() => setRoleFilter('customer')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              roleFilter === 'customer' ? 'bg-white shadow-2xs text-emerald-700 font-extrabold' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {language === 'hi' ? 'Customers' : 'Customers'} ({users.length - totalAdminsCount})
          </button>
        </div>
      </div>

      {/* Users Directory */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-10 text-xs text-gray-500">
            <div className="inline-block animate-spin text-red-600 text-lg mb-2">⟳</div>
            <p>{language === 'hi' ? 'उपयोगकर्ता सूची लोड हो रही है...' : 'Loading users list...'}</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center text-gray-500 text-xs border border-gray-200">
            <h4 className="font-bold text-gray-800 text-sm mb-1">
              {language === 'hi' ? 'कोई उपयोगकर्ता नहीं मिला' : 'No Users Found'}
            </h4>
            <p>{language === 'hi' ? 'खोज या फ़िल्टर बदलकर पुनः प्रयास करें।' : 'Try changing your search query or role filter.'}</p>
          </div>
        ) : (
          filteredUsers.map((user) => {
            const stats = getUserStats(user.uid);
            const isOwner = isEmailPrimaryOwner(user.email) || user.role === 'owner' || user.isPrimaryOwner;
            const isDeactivated = user.isDeactivated === true || user.status === 'deactivated';
            const isNormalAdmin = !isOwner && user.role === 'admin';
            const isCustomer = !isOwner && !isNormalAdmin;
            const isSelf = authUser?.uid ? user.uid === authUser.uid : false;

            return (
              <div
                key={user.uid}
                className={`bg-white rounded-2xl p-4 border shadow-2xs hover:shadow-xs transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
                  isOwner
                    ? 'border-amber-300 ring-1 ring-amber-300/50 bg-gradient-to-r from-amber-50/20 to-white'
                    : isDeactivated
                    ? 'border-red-200 bg-red-50/20'
                    : 'border-gray-200'
                }`}
              >
                {/* User Details */}
                <div className="flex items-start gap-3">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs ${
                      isOwner
                        ? 'bg-amber-100 text-amber-900 border border-amber-400'
                        : isDeactivated
                        ? 'bg-red-100 text-red-800 border border-red-300'
                        : isNormalAdmin
                        ? 'bg-red-50 text-red-800 border border-red-200'
                        : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    {isOwner ? (
                      <Crown className="w-6 h-6 text-amber-600" />
                    ) : isDeactivated ? (
                      <Ban className="w-5 h-5 text-red-600" />
                    ) : isNormalAdmin ? (
                      <ShieldCheck className="w-5 h-5 text-red-600" />
                    ) : (
                      <Users className="w-5 h-5 text-emerald-600" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-gray-900">{user.displayName}</h3>
                      
                      {/* Role & Status Badges */}
                      {isOwner ? (
                        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-400 text-red-950 flex items-center gap-1 shadow-2xs">
                          <Crown className="w-3 h-3 text-red-950" />
                          <span>Primary Owner Admin</span>
                        </span>
                      ) : user.status === 'deleted' ? (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-300 flex items-center gap-1">
                          <Trash2 className="w-3 h-3 text-red-600" />
                          <span>{language === 'hi' ? 'Admin Access Deleted (History Safe)' : 'Admin Access Deleted'}</span>
                        </span>
                      ) : isDeactivated ? (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                          <Ban className="w-3 h-3 text-amber-600" />
                          <span>Deactivated</span>
                        </span>
                      ) : isNormalAdmin ? (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-200">
                          Admin (Operations)
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                          Customer
                        </span>
                      )}

                      {user.assignedCircle && (
                        <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md flex items-center gap-1 font-medium">
                          <MapPin className="w-2.5 h-2.5" />
                          {user.assignedCircle}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-1 flex-wrap">
                      {user.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-gray-400" />
                          {user.email}
                        </span>
                      )}
                      {(user.phone || user.phoneNumber) && (
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3 text-gray-400" />
                          {user.phone || user.phoneNumber}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-[10px] text-gray-400">
                        UID: {user.uid.slice(0, 8)}...
                      </span>
                    </div>

                    {/* Preserved History Banner for Deleted / Deactivated Admin */}
                    {(user.status === 'deleted' || isDeactivated) && (
                      <div className="mt-2 text-[10px] text-gray-700 bg-amber-50/70 border border-amber-200 rounded-lg p-2 space-y-0.5">
                        <div className="font-bold text-amber-900 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          <span>{language === 'hi' ? 'सुरक्षित रिकॉर्ड्स (Data Intact)' : 'Preserved Records & History'}</span>
                        </div>
                        <p className="text-[10px] text-gray-600">
                          {language === 'hi' 
                            ? `इस Admin की लॉगिन एक्सेस बंद है, लेकिन इनके द्वारा बनाई/प्रबंधित की गई सभी ${stats.total} Leads व प्रोफ़ाइल Owner Portal में सुरक्षित हैं।`
                            : `Admin login access is terminated, but all ${stats.total} leads and profile audit history remain fully preserved.`}
                        </p>
                        {user.deletedAt && (
                          <span className="block text-[9px] text-gray-500 font-mono">
                            Deleted: {new Date(user.deletedAt).toLocaleDateString()} {user.deletedBy ? `by ${user.deletedBy}` : ''}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Stats */}
                    {isNormalAdmin && (
                      <div className="mt-2 flex items-center gap-2 text-[10px] text-gray-600">
                        <span className="bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-md font-medium">
                          Leads: <strong className="text-gray-900">{stats.total}</strong>
                        </span>
                        <span className="bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md text-emerald-800 font-medium">
                          Ported: <strong className="text-emerald-950">{stats.ported}</strong>
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex sm:flex-col items-center sm:items-end gap-1.5 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                  {/* Filter leads button */}
                  <button
                    type="button"
                    onClick={() => onFilterByUser(user.uid)}
                    className="flex-1 sm:flex-none text-xs font-bold px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 rounded-xl transition-all flex items-center justify-center gap-1"
                  >
                    <span>{language === 'hi' ? 'Leads देखें' : 'View Leads'}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>

                  {/* Owner Controls on Admins */}
                  {isOwnerAdmin && !isOwner && !isSelf && (
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {isNormalAdmin && !isDeactivated && user.status !== 'deleted' && (
                        <button
                          id={`deactivate-btn-${user.uid}`}
                          type="button"
                          disabled={actionUid === user.uid}
                          onClick={() => setAdminActionModal({ user, action: 'deactivate' })}
                          className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-300 transition-colors flex items-center gap-1 disabled:opacity-50"
                          title="Deactivate Admin Account"
                        >
                          <Ban className="w-3 h-3 text-amber-700" />
                          <span>{language === 'hi' ? 'Deactivate' : 'Deactivate'}</span>
                        </button>
                      )}

                      {(isDeactivated || user.status === 'deleted') && (
                        <button
                          id={`reactivate-btn-${user.uid}`}
                          type="button"
                          disabled={actionUid === user.uid}
                          onClick={() => handleReactivate(user)}
                          className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors flex items-center gap-1 disabled:opacity-50"
                          title="Reactivate Admin Account"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>{language === 'hi' ? 'Reactivate' : 'Reactivate'}</span>
                        </button>
                      )}

                      {isNormalAdmin && user.status !== 'deleted' && (
                        <button
                          id={`delete-admin-btn-${user.uid}`}
                          type="button"
                          disabled={actionUid === user.uid}
                          onClick={() => setAdminActionModal({ user, action: 'delete' })}
                          className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors flex items-center gap-1 disabled:opacity-50"
                          title="Delete Admin Access (Keep Leads)"
                        >
                          <Trash2 className="w-3 h-3 text-red-600" />
                          <span>{language === 'hi' ? 'Admin हटाएं' : 'Delete'}</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Owner Protected Tag on Owner Account */}
                  {isOwner && (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-1 rounded-lg flex items-center gap-1 border border-amber-200">
                      <Lock className="w-3 h-3 text-amber-700" />
                      <span>{language === 'hi' ? 'सुरक्षित Master खाता' : 'Master Account (Protected)'}</span>
                    </span>
                  )}

                  {/* Normal Admin view indicator */}
                  {!isOwnerAdmin && !isCustomer && !isSelf && (
                    <span className="text-[10px] text-gray-400 font-medium italic">
                      {language === 'hi' ? 'नियंत्रण: केवल Owner' : 'Owner Controlled'}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
      </section>

      {/* Add Admin Modal (Owner Only) */}
      <AddAdminModal
        isOpen={isAddAdminOpen}
        onClose={() => setIsAddAdminOpen(false)}
        onAdminCreated={(newAdmin) => {
          setSuccessMsg(
            language === 'hi'
              ? `नया Admin "${newAdmin.displayName}" (${newAdmin.email}) सफलतापूर्वक जोड़ा गया!`
              : `New Admin "${newAdmin.displayName}" (${newAdmin.email}) successfully created!`
          );
          setTimeout(() => setSuccessMsg(null), 4500);
          loadData();
        }}
      />

      {/* Admin Deactivate / Delete Access Confirmation Modal */}
      {adminActionModal && (
        <div 
          id="admin-action-confirm-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
        >
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                adminActionModal.action === 'delete' 
                  ? 'bg-red-100 text-red-600' 
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {adminActionModal.action === 'delete' ? (
                  <Trash2 className="w-6 h-6" />
                ) : (
                  <Ban className="w-6 h-6" />
                )}
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-red-600 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200">
                  {adminActionModal.action === 'delete' ? 'Admin Access Revocation' : 'Admin Deactivation'}
                </span>
                <h3 className="text-base font-black text-gray-900 mt-1">
                  {adminActionModal.action === 'delete'
                    ? (language === 'hi' ? `Admin Access हटाएं` : `Revoke Admin Access`)
                    : (language === 'hi' ? `Admin खाता Deactivate करें` : `Deactivate Admin Account`)}
                </h3>
              </div>
            </div>

            {/* Admin summary details */}
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3.5 space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">{language === 'hi' ? 'नाम:' : 'Name:'}</span>
                <strong className="text-gray-900 font-bold">{adminActionModal.user.displayName}</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">{language === 'hi' ? 'ईमेल:' : 'Email:'}</span>
                <span className="font-mono text-gray-800 text-[11px]">{adminActionModal.user.email || 'No Email'}</span>
              </div>
              {adminActionModal.user.assignedCircle && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">{language === 'hi' ? 'सर्कल:' : 'Circle:'}</span>
                  <span className="text-gray-700 font-medium">{adminActionModal.user.assignedCircle}</span>
                </div>
              )}
            </div>

            {/* Crucial Security Guarantees */}
            <div className="space-y-2 text-xs">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-950 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-emerald-900 text-[11px]">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{language === 'hi' ? 'ग्राहक व लीड डेटा 100% सुरक्षित रहेगा' : 'Customer & Lead Records Remain Safe'}</span>
                </div>
                <p className="text-[10px] text-emerald-800 leading-relaxed pl-5">
                  {language === 'hi'
                    ? 'इस Admin द्वारा बनाई या हैंडल की गई कोई भी Lead या Customer डिलीट नहीं होगी। सभी रिकॉर्ड्स Owner Portal में सुरक्षित रहेंगे।'
                    : 'Customer bookings, MNP leads, and audit trails created or managed by this admin will never be deleted.'}
                </p>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-950 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-red-900 text-[11px]">
                  <Lock className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{language === 'hi' ? 'लॉगिन एक्सेस तत्काल बंद होगी' : 'Authentication Access Immediately Terminated'}</span>
                </div>
                <p className="text-[10px] text-red-800 leading-relaxed pl-5">
                  {language === 'hi'
                    ? 'Firebase Authentication से इस Admin की एक्टिव एक्सेस हटा दी जाएगी। वे अब Admin Portal में लॉगिन नहीं कर पाएंगे।'
                    : 'Active login session is terminated immediately and future logins to Admin Portal are blocked.'}
                </p>
              </div>
            </div>

            {/* Optional Reason */}
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">
                {language === 'hi' ? 'कारण / नोट (वैकल्पिक):' : 'Reason / Note (Optional):'}
              </label>
              <input
                id="admin-action-reason-input"
                type="text"
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder={language === 'hi' ? 'जैसे: भूमिका परिवर्तन या काम समाप्त' : 'e.g. Role transition'}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
              />
            </div>

            {/* Modal Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                id="cancel-admin-action-btn"
                type="button"
                onClick={() => {
                  setAdminActionModal(null);
                  setActionReason('');
                }}
                disabled={isSubmittingAction}
                className="flex-1 py-2.5 rounded-xl font-bold text-xs text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {language === 'hi' ? 'रद्द करें' : 'Cancel'}
              </button>

              <button
                id="confirm-admin-action-btn"
                type="button"
                onClick={executeAdminAction}
                disabled={isSubmittingAction}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs text-white transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5 ${
                  adminActionModal.action === 'delete'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {isSubmittingAction ? (
                  <span>{language === 'hi' ? 'प्रक्रिया जारी...' : 'Processing...'}</span>
                ) : (
                  <span>
                    {adminActionModal.action === 'delete'
                      ? (language === 'hi' ? 'हां, Access हटाएं' : 'Confirm Revoke')
                      : (language === 'hi' ? 'हां, Deactivate करें' : 'Confirm Deactivate')}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
