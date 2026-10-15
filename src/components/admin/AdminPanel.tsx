import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  CalendarCheck,
  Users,
  Flame,
  Image as ImageIcon,
  Sparkles,
  PhoneCall,
  MapPin,
  Settings,
  Navigation,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Edit3,
  Trash2,
  Plus,
  Search,
  Filter,
  ArrowUpRight,
  ShieldCheck,
  AlertTriangle,
  Save,
  RefreshCw,
  Eye,
  LogOut,
  Globe,
  MessageCircle,
  Check,
  Lock,
  Compass,
  Phone,
  Clock,
  ArrowRight,
  Radio,
  FileText,
  Truck,
  Download,
  Building2,
  Crown,
  Shield,
  UserCheck
} from 'lucide-react';
import { 
  Lead, 
  AdminSection, 
  PortalConfig, 
  PortalBanner, 
  PortalOfferItem, 
  PortalLogoConfig, 
  PortalAdminHelp, 
  PortalTexts,
  AppUpdateConfig,
  BookingStatus,
  CurrentOperator,
  UserProfile,
  AdminTerritoryAssignment
} from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  isEmailPrimaryOwner,
  getAllUsers,
  subscribeToAllUsers,
  deactivateAdminUser,
  reactivateAdminUser,
  deleteCustomerUser
} from '../../services/userService';
import {
  getAvailableStates,
  getAvailableDistricts,
  getAvailableTalukas,
  getAvailableVillages,
} from '../../services/territoryService';
import { TerritoryAssignmentModal } from './TerritoryAssignmentModal';
import { AddAdminModal } from '../AddAdminModal';
import { 
  updateLeadBookingStatus, 
  updateLeadVerificationStatus, 
  updateLead, 
  deleteLead 
} from '../../services/leadService';
import { 
  getPortalConfig, 
  savePortalConfig, 
  subscribeToPortalConfig, 
  DEFAULT_PORTAL_CONFIG 
} from '../../services/portalConfigService';
import { DEFAULT_APP_UPDATE_CONFIG } from '../../services/appUpdateService';
import { INSTALLED_APP_VERSION } from '../../config/appVersion';
import { AppUpdateModal } from '../AppUpdateModal';

interface AdminPanelProps {
  leads: Lead[];
  onRefreshLeads: () => void;
  onPreviewCustomerPortal?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  leads,
  onRefreshLeads,
  onPreviewCustomerPortal
}) => {
  const { user, userProfile, logout } = useAuth();
  const { language, toggleLanguage } = useLanguage();
  const isHindi = language === 'hi';

  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const [portalConfig, setPortalConfig] = useState<PortalConfig>(DEFAULT_PORTAL_CONFIG);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [actionErrorMsg, setActionErrorMsg] = useState('');

  // Search & Filters for Bookings
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [operatorFilter, setOperatorFilter] = useState<string>('ALL');
  const [verificationFilter, setVerificationFilter] = useState<string>('ALL');
  const [villageFilter, setVillageFilter] = useState<string>('ALL');

  // Territory Management & Admin Assignment State
  const [allAdminsList, setAllAdminsList] = useState<UserProfile[]>([]);
  const [selectedAdminForTerritory, setSelectedAdminForTerritory] = useState<UserProfile | null>(null);
  const [isTerritoryModalOpen, setIsTerritoryModalOpen] = useState(false);
  const [isAddAdminModalOpen, setIsAddAdminModalOpen] = useState(false);

  // Customer Login Directory & Owner Delete State
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerLoginFilter, setCustomerLoginFilter] = useState<'ALL' | 'LOGGED_IN' | 'NOT_LOGGED_IN'>('ALL');
  const [customerToDelete, setCustomerToDelete] = useState<UserProfile | null>(null);
  const [isDeletingCustomer, setIsDeletingCustomer] = useState(false);

  // App Update Preview Modal
  const [isPreviewUpdateModalOpen, setIsPreviewUpdateModalOpen] = useState(false);

  // Modals
  const [selectedBookingForDetails, setSelectedBookingForDetails] = useState<Lead | null>(null);
  const [bookingToEdit, setBookingToEdit] = useState<Lead | null>(null);
  const [isUpdatingLead, setIsUpdatingLead] = useState(false);
  
  // Offer Edit Modal
  const [editingOffer, setEditingOffer] = useState<PortalOfferItem | null>(null);
  const [isNewOffer, setIsNewOffer] = useState(false);

  // Banner Edit Modal
  const [editingBanner, setEditingBanner] = useState<PortalBanner | null>(null);
  const [isNewBanner, setIsNewBanner] = useState(false);

  // Is current user the primary owner
  const isPrimaryOwner = Boolean(
    (user?.email && isEmailPrimaryOwner(user.email)) || userProfile?.role === 'owner'
  );

  // Subscribe to real-time Portal Config
  useEffect(() => {
    const unsub = subscribeToPortalConfig((cfg) => {
      setPortalConfig(cfg);
    });
    return () => unsub();
  }, []);

  // Subscribe to all users in real-time for territory admin assignments and customer login directory
  useEffect(() => {
    const unsub = subscribeToAllUsers((liveUsers) => {
      if (liveUsers) {
        setAllAdminsList(liveUsers);
      }
    });
    return () => unsub();
  }, []);

  // Strict RBAC: Non-owner Admins can access Dashboard, Bookings, Customers, and Profile/Help
  useEffect(() => {
    if (!isPrimaryOwner && activeSection !== 'dashboard' && activeSection !== 'bookings' && activeSection !== 'customers' && activeSection !== 'admin-help') {
      setActiveSection('bookings');
    }
  }, [isPrimaryOwner, activeSection]);

  // Compute available villages for filter
  const availableVillageOptions = useMemo(() => {
    const vSet = new Set<string>();
    const mehkarVillages = getAvailableVillages('Maharashtra', 'Buldhana', 'Mehkar');
    mehkarVillages.forEach((v) => vSet.add(v));
    leads.forEach((l) => {
      if (l.village) vSet.add(l.village);
    });
    return Array.from(vSet).sort();
  }, [leads]);

  const triggerSaveNotification = (msg: string) => {
    setSaveSuccessMsg(msg);
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const totalBookings = leads.length;
    const pendingBookings = leads.filter(
      (l) => l.bookingStatus === 'Pending' || l.bookingStatus === 'Lead Received' || l.customerVerificationStatus === 'Pending'
    ).length;
    const verifiedBookings = leads.filter(
      (l) => l.customerVerificationStatus === 'Verified' || l.isCustomerVerified
    ).length;
    const completedBookings = leads.filter(
      (l) => l.bookingStatus === 'Completed' || l.status === 'Ported'
    ).length;
    const mappedLocations = leads.filter(
      (l) => Boolean(l.locationCoordinates?.latitude && l.locationCoordinates?.longitude)
    ).length;

    // Unique customers by phone number
    const uniquePhones = new Set(leads.map((l) => (l.mobileNumber || '').replace(/\D/g, '').slice(-10)).filter(Boolean));
    const totalCustomers = uniquePhones.size;

    return {
      totalBookings,
      pendingBookings,
      verifiedBookings,
      completedBookings,
      mappedLocations,
      totalCustomers
    };
  }, [leads]);

  // Customer Users List from real-time database (Firestore users collection)
  const customerUsersList = useMemo(() => {
    return allAdminsList.filter(
      (u) => u.role === 'customer' || (!u.role && !isEmailPrimaryOwner(u.email))
    );
  }, [allAdminsList]);

  const totalCustomersCount = customerUsersList.length;
  const totalCustomersLoggedInCount = customerUsersList.filter(
    (u) => u.hasLoggedIn || (u.loginCount && u.loginCount > 0) || Boolean(u.lastLoginAt)
  ).length;

  const filteredCustomerUsers = useMemo(() => {
    let list = customerUsersList;

    if (customerLoginFilter === 'LOGGED_IN') {
      list = list.filter((u) => u.hasLoggedIn || (u.loginCount && u.loginCount > 0) || Boolean(u.lastLoginAt));
    } else if (customerLoginFilter === 'NOT_LOGGED_IN') {
      list = list.filter((u) => !u.hasLoggedIn && (!u.loginCount || u.loginCount === 0) && !u.lastLoginAt);
    }

    if (!customerSearchQuery.trim()) return list;
    const q = customerSearchQuery.toLowerCase().trim();
    return list.filter((u) => {
      const name = (u.displayName || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const phone = (u.phone || u.phoneNumber || '').toLowerCase();
      const uid = (u.uid || '').toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q) || uid.includes(q);
    });
  }, [customerUsersList, customerLoginFilter, customerSearchQuery]);

  const handleDeleteCustomerConfirm = async () => {
    if (!customerToDelete) return;
    if (!isPrimaryOwner) {
      setActionErrorMsg(isHindi ? 'सुरक्षा नियम: केवल Owner ही ग्राहक आईडी डिलीट कर सकते हैं।' : 'Security rule: Only Owner can delete customer IDs.');
      setCustomerToDelete(null);
      return;
    }

    try {
      setIsDeletingCustomer(true);
      setActionErrorMsg(null);
      await deleteCustomerUser(customerToDelete.uid, user?.email || undefined);
      triggerSaveNotification(
        isHindi
          ? `✓ ग्राहक आईडी "${customerToDelete.displayName || customerToDelete.phone || customerToDelete.uid}" सफलतापूर्वक डिलीट कर दी गई!`
          : `✓ Customer ID "${customerToDelete.displayName || customerToDelete.phone || customerToDelete.uid}" deleted successfully!`
      );
      setCustomerToDelete(null);
    } catch (err: any) {
      console.error('Delete customer error:', err);
      setActionErrorMsg(err?.message || (isHindi ? 'ग्राहक आईडी डिलीट करने में त्रुटि हुई' : 'Failed to delete customer ID'));
    } finally {
      setIsDeletingCustomer(false);
    }
  };

  // Filtered Bookings List
  const filteredBookings = useMemo(() => {
    return leads.filter((lead) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !q ||
        (lead.customerName || '').toLowerCase().includes(q) ||
        (lead.mobileNumber || '').includes(q) ||
        (lead.currentOperator || '').toLowerCase().includes(q) ||
        (lead.address || '').toLowerCase().includes(q) ||
        (lead.leadId || '').toLowerCase().includes(q);

      const matchesStatus = 
        statusFilter === 'ALL' || lead.bookingStatus === statusFilter;

      const matchesOperator = 
        operatorFilter === 'ALL' || lead.currentOperator === operatorFilter;

      const matchesVerification = 
        verificationFilter === 'ALL' ||
        (verificationFilter === 'VERIFIED' && (lead.isCustomerVerified || lead.customerVerificationStatus === 'Verified')) ||
        (verificationFilter === 'UNVERIFIED' && (!lead.isCustomerVerified && lead.customerVerificationStatus !== 'Verified'));

      const matchesVillage =
        villageFilter === 'ALL' ||
        (lead.village && lead.village.toLowerCase() === villageFilter.toLowerCase()) ||
        (lead.address && lead.address.toLowerCase().includes(villageFilter.toLowerCase()));

      return matchesSearch && matchesStatus && matchesOperator && matchesVerification && matchesVillage;
    });
  }, [leads, searchQuery, statusFilter, operatorFilter, verificationFilter, villageFilter]);

  // Aggregated Customers List
  const aggregatedCustomers = useMemo(() => {
    const map = new Map<string, {
      phone: string;
      name: string;
      email: string;
      address: string;
      isVerified: boolean;
      totalBookings: number;
      lastBookingDate: string;
      hasLocation: boolean;
      latestLead: Lead;
    }>();

    for (const lead of leads) {
      const phone = (lead.mobileNumber || '').replace(/\D/g, '').slice(-10);
      if (!phone) continue;

      const existing = map.get(phone);
      const isLeadVerified = Boolean(lead.isCustomerVerified || lead.customerVerificationStatus === 'Verified');
      const hasCoords = Boolean(lead.locationCoordinates?.latitude);

      if (!existing) {
        map.set(phone, {
          phone,
          name: lead.customerName || 'Customer',
          email: lead.customerEmail || '',
          address: lead.address || lead.customerAddress || 'Mehkar',
          isVerified: isLeadVerified,
          totalBookings: 1,
          lastBookingDate: lead.createdAt,
          hasLocation: hasCoords,
          latestLead: lead
        });
      } else {
        existing.totalBookings += 1;
        if (isLeadVerified) existing.isVerified = true;
        if (hasCoords) existing.hasLocation = true;
        if (new Date(lead.createdAt).getTime() > new Date(existing.lastBookingDate).getTime()) {
          existing.lastBookingDate = lead.createdAt;
          existing.latestLead = lead;
        }
      }
    }

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.lastBookingDate).getTime() - new Date(a.lastBookingDate).getTime()
    );
  }, [leads]);

  // Bookings with GPS locations
  const locationBookings = useMemo(() => {
    return leads.filter((l) => Boolean(l.locationCoordinates?.latitude && l.locationCoordinates?.longitude));
  }, [leads]);

  // ==========================================
  // HANDLERS FOR BOOKINGS
  // ==========================================

  const handleToggleVerification = async (lead: Lead) => {
    const newStatus = !(lead.isCustomerVerified || lead.customerVerificationStatus === 'Verified');
    try {
      await updateLeadVerificationStatus(lead.id, newStatus, user);
      triggerSaveNotification(
        newStatus ? `✓ Customer ${lead.customerName} verified successfully!` : `Customer unverified.`
      );
      onRefreshLeads();
      if (selectedBookingForDetails?.id === lead.id) {
        setSelectedBookingForDetails({
          ...selectedBookingForDetails,
          isCustomerVerified: newStatus,
          customerVerificationStatus: newStatus ? 'Verified' : 'Unverified'
        });
      }
    } catch (err: any) {
      console.error('Failed to update verification:', err);
      setActionErrorMsg(`Verification update failed: ${err.message}`);
    }
  };

  const handleUpdateStatus = async (lead: Lead, newStatus: BookingStatus) => {
    try {
      await updateLeadBookingStatus(lead.id, newStatus, user);
      triggerSaveNotification(`Status updated to "${newStatus}"`);
      onRefreshLeads();
      if (selectedBookingForDetails?.id === lead.id) {
        setSelectedBookingForDetails({
          ...selectedBookingForDetails,
          bookingStatus: newStatus
        });
      }
    } catch (err: any) {
      console.error('Failed to update status:', err);
      setActionErrorMsg(`Status update failed: ${err.message}`);
    }
  };

  const handleSaveBookingEdits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingToEdit) return;
    setIsUpdatingLead(true);
    try {
      await updateLead(
        bookingToEdit.id,
        {
          customerName: bookingToEdit.customerName,
          mobileNumber: bookingToEdit.mobileNumber,
          currentOperator: bookingToEdit.currentOperator,
          connectionType: bookingToEdit.connectionType,
          selectedPlan: bookingToEdit.selectedPlan,
          address: bookingToEdit.address,
          customerAddress: bookingToEdit.address,
          bookingStatus: bookingToEdit.bookingStatus,
          remarks: bookingToEdit.remarks,
        },
        user
      );
      triggerSaveNotification('✓ Booking details updated successfully');
      setBookingToEdit(null);
      onRefreshLeads();
    } catch (err: any) {
      console.error('Error saving booking:', err);
      setActionErrorMsg(`Failed to save booking: ${err.message}`);
    } finally {
      setIsUpdatingLead(false);
    }
  };

  const handleDeleteLeadClick = async (lead: Lead) => {
    if (!isPrimaryOwner) {
      alert('Security Protection: Only Primary Owner (raheema62038@gmail.com) can delete customer records.');
      return;
    }
    const conf = window.confirm(`Are you sure you want to permanently delete booking for "${lead.customerName}" (${lead.mobileNumber})? This cannot be undone.`);
    if (!conf) return;

    try {
      await deleteLead(lead.id, user);
      triggerSaveNotification('✓ Customer record deleted by Primary Owner.');
      onRefreshLeads();
      setSelectedBookingForDetails(null);
    } catch (err: any) {
      console.error('Failed to delete lead:', err);
      alert(err.message);
    }
  };

  // Navigate to Google Maps
  const openGoogleMapsDirections = (lead: Lead) => {
    if (lead.locationCoordinates?.latitude && lead.locationCoordinates?.longitude) {
      const lat = lead.locationCoordinates.latitude;
      const lng = lead.locationCoordinates.longitude;
      const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      const addr = lead.address || lead.customerAddress || 'Mehkar, Buldhana, Maharashtra - 443301';
      const encoded = encodeURIComponent(`${addr}`);
      const url = `https://www.google.com/maps/search/?api=1&query=${encoded}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // ==========================================
  // HANDLERS FOR PORTAL SETTINGS
  // ==========================================

  const handleSaveAllPortalConfig = async (newConfig: Partial<PortalConfig>) => {
    setIsSavingConfig(true);
    setActionErrorMsg('');
    try {
      await savePortalConfig(newConfig, user || undefined);
      triggerSaveNotification('✓ Portal changes saved! Live customer view updated.');
    } catch (err: any) {
      console.error('Error saving portal config:', err);
      setActionErrorMsg(`Failed to save portal settings: ${err.message}`);
    } finally {
      setIsSavingConfig(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col">
      {/* Top Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-40 shadow-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-600 text-white font-black text-xl flex items-center justify-center shadow-md">
              V!
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base sm:text-lg tracking-tight text-white flex items-center gap-2">
                  <span>VI ADMIN PANEL</span>
                  <span className="bg-red-600/90 text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                    Control Center
                  </span>
                </h1>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 flex-wrap">
                <span className="font-mono text-slate-300">{user?.email || 'Admin'}</span>
                <span>•</span>
                <span className={`${isPrimaryOwner ? 'text-amber-400 font-extrabold' : 'text-emerald-400 font-bold'} flex items-center gap-1`}>
                  {isPrimaryOwner ? (
                    <>
                      <Crown className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isHindi ? 'Primary Owner (सर्वोच्च स्वामी)' : 'Primary Owner Admin'}</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{isHindi ? 'गाँव एडमिन (Village Admin)' : 'Village Admin'}</span>
                    </>
                  )}
                </span>
                {!isPrimaryOwner && (userProfile?.assignedVillage || userProfile?.assignedTaluka) && (
                  <>
                    <span>•</span>
                    <span className="text-amber-300 font-bold bg-amber-950/60 border border-amber-800/80 px-2 py-0.5 rounded-md text-[11px] flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-amber-400" />
                      <span>{userProfile.assignedVillage || userProfile.assignedTaluka} ({userProfile.assignedTaluka || 'Mehkar'}, {userProfile.assignedDistrict || 'Buldhana'})</span>
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onPreviewCustomerPortal && (
              <button
                type="button"
                onClick={onPreviewCustomerPortal}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                title="Preview what customers see"
              >
                <Eye className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Preview Customer Portal</span>
                <span className="sm:hidden">Preview</span>
              </button>
            )}

            <button
              type="button"
              onClick={onRefreshLeads}
              className="p-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer"
              title="Refresh Bookings"
            >
              <RefreshCw className="w-4 h-4 text-red-400" />
            </button>

            <button
              type="button"
              onClick={toggleLanguage}
              className="px-2.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
            >
              {isHindi ? '🇮🇳 HI' : '🇬🇧 EN'}
            </button>

            <button
              type="button"
              onClick={logout}
              className="p-2 rounded-xl bg-red-700 hover:bg-red-800 text-white transition-colors cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="bg-slate-950/80 border-t border-slate-800 px-4 overflow-x-auto scrollbar-none">
          <div className="max-w-7xl mx-auto flex items-center gap-1 py-1 text-xs font-bold">
            {(isPrimaryOwner
              ? [
                  { id: 'dashboard', label: isHindi ? 'डैशबोर्ड' : 'Dashboard', icon: LayoutDashboard },
                  { id: 'bookings', label: isHindi ? 'बुकिंग्स (सभी गाँव)' : 'All Bookings', icon: CalendarCheck, count: stats.totalBookings },
                  { id: 'territories', label: isHindi ? 'क्षेत्र / एडमिन आवंटन' : 'Territories & Admins', icon: Building2 },
                  { id: 'customers', label: isHindi ? 'कस्टमर्स' : 'Customers', icon: Users, count: totalCustomersCount },
                  { id: 'offers', label: isHindi ? 'ऑफर' : 'Offers', icon: Flame },
                  { id: 'banners', label: isHindi ? 'बैनर' : 'Banners', icon: ImageIcon },
                  { id: 'logo', label: isHindi ? 'लोगो' : 'Logo', icon: Sparkles },
                  { id: 'admin-help', label: isHindi ? 'हेल्प नंबर' : 'Admin Help', icon: PhoneCall },
                  { id: 'locations', label: isHindi ? 'मैप / लोकेशन' : 'Map/Locations', icon: MapPin, count: stats.mappedLocations },
                  { id: 'app-updates', label: isHindi ? 'ऐप अपडेट' : 'App Updates', icon: Download },
                  { id: 'settings', label: isHindi ? 'सेटिंग्स' : 'Settings', icon: Settings },
                ]
              : [
                  { id: 'dashboard', label: isHindi ? 'डैशबोर्ड' : 'Dashboard', icon: LayoutDashboard },
                  { id: 'bookings', label: isHindi ? 'गाँव की बुकिंग्स' : 'Village Bookings', icon: CalendarCheck, count: stats.totalBookings },
                  { id: 'customers', label: isHindi ? 'कस्टमर्स लॉगिन' : 'Customer Logins', icon: Users, count: totalCustomersLoggedInCount },
                  { id: 'admin-help', label: isHindi ? 'हेल्प व प्रोफाइल' : 'Help & Profile', icon: PhoneCall },
                ]
            ).map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSection === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSection(tab.id as AdminSection)}
                  className={`px-3.5 py-2 rounded-xl flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      isActive ? 'bg-white text-red-700' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Notifications Bar */}
      {saveSuccessMsg && (
        <div className="bg-emerald-600 text-white text-xs font-bold px-4 py-2 text-center flex items-center justify-center gap-2 shadow-sm animate-in fade-in slide-in-from-top-1">
          <CheckCircle2 className="w-4 h-4" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}
      {actionErrorMsg && (
        <div className="bg-red-600 text-white text-xs font-bold px-4 py-2 text-center flex items-center justify-center gap-2 shadow-sm animate-in fade-in">
          <AlertTriangle className="w-4 h-4" />
          <span>{actionErrorMsg}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full p-4 sm:p-6 flex-1 space-y-6">
        {/* ======================================================== */}
        {/* 1. DASHBOARD VIEW                                        */}
        {/* ======================================================== */}
        {activeSection === 'dashboard' && (
          <div className="space-y-6">
            {/* Header / Intro */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  {isHindi ? 'कंट्रोल डैशबोर्ड' : 'Customer Portal Admin Overview'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isHindi 
                    ? 'यहाँ से आप सभी कस्टमर बुकिंग्स, GPS लोकेशन, ऑफर्स, बैनर और हेल्प नंबर प्रबंधित कर सकते हैं।' 
                    : 'Manage all live customer porting bookings, GPS coordinates, offers, banners, and help numbers.'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveSection('bookings')}
                  className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer transition-all"
                >
                  <CalendarCheck className="w-4 h-4" />
                  <span>{isHindi ? 'सभी बुकिंग्स देखें' : 'View All Bookings'}</span>
                </button>
              </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
              <div 
                onClick={() => setActiveSection('bookings')}
                className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs hover:border-red-300 transition-all cursor-pointer space-y-2"
              >
                <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                  <CalendarCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900">{stats.totalBookings}</div>
                  <div className="text-xs font-bold text-slate-500">{isHindi ? 'कुल बुकिंग्स' : 'Total Bookings'}</div>
                </div>
              </div>

              <div 
                onClick={() => {
                  setVerificationFilter('UNVERIFIED');
                  setActiveSection('bookings');
                }}
                className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs hover:border-amber-300 transition-all cursor-pointer space-y-2"
              >
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-2xl font-black text-amber-600">{stats.pendingBookings}</div>
                  <div className="text-xs font-bold text-slate-500">{isHindi ? 'पेंडिंग वेरिफिकेशन' : 'Pending Verification'}</div>
                </div>
              </div>

              <div 
                onClick={() => {
                  setVerificationFilter('VERIFIED');
                  setActiveSection('bookings');
                }}
                className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-all cursor-pointer space-y-2"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-2xl font-black text-emerald-600">{stats.verifiedBookings}</div>
                  <div className="text-xs font-bold text-slate-500">{isHindi ? 'सत्यापित ग्राहक' : 'Verified Customers'}</div>
                </div>
              </div>

              <div 
                onClick={() => {
                  setStatusFilter('Completed');
                  setActiveSection('bookings');
                }}
                className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs hover:border-blue-300 transition-all cursor-pointer space-y-2"
              >
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-2xl font-black text-blue-600">{stats.completedBookings}</div>
                  <div className="text-xs font-bold text-slate-500">{isHindi ? 'पूर्ण / पोर्टेड' : 'Completed / Ported'}</div>
                </div>
              </div>

              <div 
                onClick={() => setActiveSection('locations')}
                className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs hover:border-purple-300 transition-all cursor-pointer space-y-2"
              >
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-2xl font-black text-purple-600">{stats.mappedLocations}</div>
                  <div className="text-xs font-bold text-slate-500">{isHindi ? 'GPS लोकेशन्स' : 'GPS Mapped'}</div>
                </div>
              </div>

              <div 
                onClick={() => setActiveSection('customers')}
                className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs hover:border-emerald-400 transition-all cursor-pointer space-y-2 group"
                title={isHindi ? "ग्राहक लॉगिन सूची देखें" : "View Customer Logins"}
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900 flex items-baseline gap-1.5">
                    <span>{totalCustomersLoggedInCount}</span>
                    <span className="text-xs font-bold text-slate-400">/ {totalCustomersCount}</span>
                  </div>
                  <div className="text-xs font-bold text-emerald-800 flex items-center justify-between">
                    <span>{isHindi ? 'लॉगिन किए ग्राहक' : 'Logged In Customers'}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                type="button"
                onClick={() => setActiveSection('offers')}
                className="bg-white p-4 rounded-3xl border border-slate-200 hover:shadow-md transition-all text-left space-y-2 cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center">
                    <Flame className="w-5 h-5" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-red-600 transition-colors" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">Manage Offers</h4>
                  <p className="text-xs text-slate-500">Edit promotional plans, pricing, benefits & validity</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('banners')}
                className="bg-white p-4 rounded-3xl border border-slate-200 hover:shadow-md transition-all text-left space-y-2 cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition-colors" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">Manage Banners</h4>
                  <p className="text-xs text-slate-500">Change top hero banner titles, gradient & CTA</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('admin-help')}
                className="bg-white p-4 rounded-3xl border border-slate-200 hover:shadow-md transition-all text-left space-y-2 cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <PhoneCall className="w-5 h-5" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">Admin Help Numbers</h4>
                  <p className="text-xs text-slate-500">Update support call & WhatsApp numbers instantly</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('locations')}
                className="bg-white p-4 rounded-3xl border border-slate-200 hover:shadow-md transition-all text-left space-y-2 cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center">
                    <Compass className="w-5 h-5" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-colors" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">Live Customer Maps</h4>
                  <p className="text-xs text-slate-500">One-click Google Maps navigation for home delivery</p>
                </div>
              </button>
            </div>

            {/* Recent Bookings Activity Feed */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarCheck className="w-5 h-5 text-red-600" />
                  <h3 className="font-extrabold text-base text-slate-900">
                    {isHindi ? 'ताज़ा बुकिंग्स' : 'Recent Customer Bookings'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSection('bookings')}
                  className="text-xs font-bold text-red-600 hover:text-red-700"
                >
                  {isHindi ? 'सभी देखें ➔' : 'View All ➔'}
                </button>
              </div>

              {leads.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  {isHindi ? 'अभी कोई बुकिंग दर्ज नहीं हुई है।' : 'No bookings registered yet.'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-bold">
                        <th className="pb-2.5">Customer Name</th>
                        <th className="pb-2.5">Mobile</th>
                        <th className="pb-2.5">Operator</th>
                        <th className="pb-2.5">Status</th>
                        <th className="pb-2.5">Verification</th>
                        <th className="pb-2.5">Location</th>
                        <th className="pb-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {leads.slice(0, 5).map((lead) => (
                        <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 font-bold text-slate-900">{lead.customerName}</td>
                          <td className="py-3 font-mono font-bold text-slate-700">{lead.mobileNumber}</td>
                          <td className="py-3">
                            <span className="font-bold text-red-600">{lead.currentOperator} ➔ Vi</span>
                          </td>
                          <td className="py-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800">
                              {lead.bookingStatus || 'Booked'}
                            </span>
                          </td>
                          <td className="py-3">
                            {lead.customerVerificationStatus === 'Verified' || lead.isCustomerVerified ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 w-fit">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Verified
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1 w-fit">
                                <Clock className="w-3 h-3 text-amber-600" />
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="py-3">
                            {lead.locationCoordinates ? (
                              <button
                                type="button"
                                onClick={() => openGoogleMapsDirections(lead)}
                                className="text-purple-700 hover:text-purple-900 font-bold flex items-center gap-1 underline"
                              >
                                <MapPin className="w-3.5 h-3.5 text-purple-600" />
                                <span>Navigate</span>
                              </button>
                            ) : (
                              <span className="text-slate-400 text-[11px]">Address Only</span>
                            )}
                          </td>
                          <td className="py-3 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedBookingForDetails(lead)}
                              className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg"
                            >
                              Open
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 2. BOOKINGS SECTION (MANAGEMENT & EDITING)               */}
        {/* ======================================================== */}
        {activeSection === 'bookings' && (
          <div className="space-y-4">
            {/* Territory Scoping & Role Info Banner */}
            {!isPrimaryOwner ? (
              <div className="bg-gradient-to-r from-red-50 via-amber-50 to-red-50 border-2 border-red-200 rounded-3xl p-4 text-xs flex flex-wrap items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-slate-900 text-sm">
                        {isHindi ? 'आपका निर्धारित गाँव:' : 'Your Assigned Village:'}
                      </span>
                      <span className="font-black text-red-700 bg-red-100 border border-red-200 px-2.5 py-0.5 rounded-full text-xs">
                        🏡 {userProfile?.assignedVillage || 'Mehkar City'}
                      </span>
                      <span className="text-slate-600 font-bold">
                        ({userProfile?.assignedTaluka || 'Mehkar'}, {userProfile?.assignedDistrict || 'Buldhana'}, {userProfile?.assignedState || 'Maharashtra'})
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px] mt-0.5 font-medium">
                      {isHindi
                        ? 'सुरक्षा नियम: आप केवल Owner द्वारा निर्धारित अपने गाँव के ग्राहकों का नाम, मोबाइल नंबर, बुकिंग की तारीख, पता और पोर्टिंग स्टेटस देख सकते हैं। दूसरे गाँव का डेटा पूर्णतः सुरक्षित है।'
                        : 'Security Policy: You are viewing customer name, phone, booking date, address, and porting status strictly for your assigned village.'}
                    </p>
                  </div>
                </div>
                <div className="text-[11px] font-bold text-slate-600 bg-white/90 border border-slate-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-2xs">
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  <span>{isHindi ? 'भूमिका व गाँव: केवल Owner द्वारा परिवर्तनीय' : 'Role & Village: Owner Assigned Only'}</span>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-amber-500/10 via-red-500/10 to-amber-500/10 border border-amber-300 rounded-2xl p-3 px-4 text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-600" />
                  <span className="font-extrabold text-slate-900">
                    {isHindi
                      ? '👑 Super Owner View: आप सभी 20+ गाँवों और सभी Admins की बुकिंग्स देख रहे हैं।'
                      : '👑 Super Owner View: You are viewing customer bookings across all villages and all Admins nationwide.'}
                  </span>
                </div>
                <span className="text-[11px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                  {leads.length} {isHindi ? 'कुल बुकिंग्स' : 'Total Bookings'}
                </span>
              </div>
            )}

            {/* Top Filter and Search Bar */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CalendarCheck className="w-5 h-5 text-red-600" />
                  <h3 className="font-extrabold text-base text-slate-900">
                    {isHindi ? `ग्राहक बुकिंग्स (${filteredBookings.length})` : `Customer Bookings Management (${filteredBookings.length})`}
                  </h3>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder={isHindi ? 'नाम, मोबाइल, ऑपरेटर खोजें...' : 'Search name, phone, operator...'}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none w-56 font-medium"
                    />
                  </div>

                  {/* Reset Filters */}
                  {(statusFilter !== 'ALL' || operatorFilter !== 'ALL' || verificationFilter !== 'ALL' || villageFilter !== 'ALL' || searchQuery) && (
                    <button
                      type="button"
                      onClick={() => {
                        setStatusFilter('ALL');
                        setOperatorFilter('ALL');
                        setVerificationFilter('ALL');
                        setVillageFilter('ALL');
                        setSearchQuery('');
                      }}
                      className="text-xs font-bold text-slate-500 hover:text-red-600 underline"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {/* Filter Pills */}
              <div className="flex flex-wrap gap-2 pt-1 text-xs">
                {/* Village / Area Filter */}
                <div className="flex items-center gap-1 bg-red-50 border border-red-200 px-2 py-1 rounded-xl">
                  <MapPin className="w-3.5 h-3.5 text-red-600" />
                  <span className="text-red-950 font-bold text-[11px]">{isHindi ? 'गाँव / क्षेत्र:' : 'Village / Area:'}</span>
                  <select
                    value={villageFilter}
                    onChange={(e) => setVillageFilter(e.target.value)}
                    className="bg-transparent font-bold text-red-900 focus:outline-none text-xs max-w-44 truncate"
                  >
                    <option value="ALL">{isHindi ? 'सभी गाँव / क्षेत्र' : 'All Villages / Areas'}</option>
                    {availableVillageOptions.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-1 rounded-xl">
                  <span className="text-slate-500 font-bold text-[11px]">Status:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-transparent font-bold text-slate-800 focus:outline-none text-xs"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="Verified">Verified</option>
                    <option value="Booked">Booked</option>
                    <option value="In Process">In Process</option>
                    <option value="SIM Dispatched">SIM Dispatched</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-1 rounded-xl">
                  <span className="text-slate-500 font-bold text-[11px]">Verification:</span>
                  <select
                    value={verificationFilter}
                    onChange={(e) => setVerificationFilter(e.target.value)}
                    className="bg-transparent font-bold text-slate-800 focus:outline-none text-xs"
                  >
                    <option value="ALL">All Verification</option>
                    <option value="VERIFIED">Verified Only</option>
                    <option value="UNVERIFIED">Pending / Unverified</option>
                  </select>
                </div>

                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-1 rounded-xl">
                  <span className="text-slate-500 font-bold text-[11px]">Operator:</span>
                  <select
                    value={operatorFilter}
                    onChange={(e) => setOperatorFilter(e.target.value)}
                    className="bg-transparent font-bold text-slate-800 focus:outline-none text-xs"
                  >
                    <option value="ALL">All Operators</option>
                    <option value="Airtel">Airtel</option>
                    <option value="Jio">Jio</option>
                    <option value="BSNL">BSNL</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Bookings List Cards / Table */}
            {filteredBookings.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center space-y-3">
                <CalendarCheck className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="font-bold text-slate-700 text-sm">No bookings match your filter criteria</h4>
                <p className="text-xs text-slate-400">Try changing or resetting your search and filter parameters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBookings.map((lead) => {
                  const isVerified = Boolean(lead.isCustomerVerified || lead.customerVerificationStatus === 'Verified');
                  return (
                    <div
                      key={lead.id}
                      className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-2.5">
                        {/* Status Header */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-red-100 text-red-800 border border-red-200">
                              {lead.bookingStatus || 'Booked'}
                            </span>
                            {isVerified ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                Verified
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-amber-600" />
                                Unverified
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-mono text-slate-400">
                            {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : ''}
                          </span>
                        </div>

                        {/* Customer Info */}
                        <div>
                          <h4 className="text-base font-extrabold text-slate-900 tracking-tight">
                            {lead.customerName}
                          </h4>
                          <div className="text-sm font-black font-mono text-slate-800 mt-0.5">
                            +91 {lead.mobileNumber}
                          </div>
                          <div className="text-xs text-slate-600 flex items-center gap-2 mt-1">
                            <span className="font-bold text-red-600">{lead.currentOperator} ➔ Vi</span>
                            <span>•</span>
                            <span className="font-semibold text-slate-700">{lead.connectionType}</span>
                          </div>
                        </div>

                        {/* Plan & Address */}
                        <div className="bg-slate-50 rounded-2xl p-2.5 text-xs text-slate-600 space-y-1 border border-slate-100">
                          <div className="font-bold text-slate-800 truncate">
                            Plan: {lead.selectedPlan || '₹398 KA RECHARGE FREE FREE'}
                          </div>
                          <div className="flex items-start gap-1.5 text-slate-500 text-[11px]">
                            <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                            <span className="line-clamp-2">
                              {lead.taluka
                                ? `${lead.address || ''}, ${lead.taluka}, ${lead.district} - ${lead.pincode}`
                                : (lead.customerAddress || lead.address || 'Mehkar (443301)')}
                            </span>
                          </div>
                          {lead.locationCoordinates && (
                            <div className="text-[10px] text-purple-700 font-mono font-bold flex items-center gap-1 pt-0.5">
                              <span>📍 Lat: {lead.locationCoordinates.latitude}, Lng: {lead.locationCoordinates.longitude}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Bar */}
                      <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                        {/* Status change select */}
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="text-[11px] font-bold text-slate-500">Status:</span>
                          <select
                            value={lead.bookingStatus || 'Booked'}
                            onChange={(e) => handleUpdateStatus(lead, e.target.value as BookingStatus)}
                            className="bg-slate-50 border border-slate-200 text-slate-800 font-bold rounded-lg px-2 py-1 text-xs focus:ring-1 focus:ring-red-500"
                          >
                            <option value="Pending">Pending</option>
                            <option value="Verified">Verified</option>
                            <option value="Booked">Booked</option>
                            <option value="In Process">In Process</option>
                            <option value="SIM Dispatched">SIM Dispatched</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </div>

                        {/* Verification toggle & Details button */}
                        <div className="flex items-center justify-between gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleToggleVerification(lead)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer ${
                              isVerified
                                ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200'
                            }`}
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>{isVerified ? 'Unverify' : 'Verify'}</span>
                          </button>

                          <div className="flex items-center gap-1.5">
                            {lead.locationCoordinates && (
                              <button
                                type="button"
                                onClick={() => openGoogleMapsDirections(lead)}
                                className="p-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200"
                                title="Open Google Maps Directions"
                              >
                                <Navigation className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setBookingToEdit(lead)}
                              className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700"
                              title="Edit Booking"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setSelectedBookingForDetails(lead)}
                              className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
                            >
                              Details
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* 3. CUSTOMERS SECTION (LOGIN DIRECTORY & OWNER DELETE)    */}
        {/* ======================================================== */}
        {activeSection === 'customers' && (
          <div className="space-y-5">
            {/* Header Banner */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                      <span>{isHindi ? 'ग्राहक लॉगिन एवं आईडी प्रबंधन' : 'Customer Logins & ID Directory'}</span>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        {filteredCustomerUsers.length} / {totalCustomersCount} {isHindi ? 'ग्राहक' : 'Customers'}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {isHindi 
                        ? 'कितने ग्राहकों ने आईडी लॉगिन किया है, उनकी सूची, अंतिम लॉगिन समय और विवरण। केवल Primary Owner को आईडी डिलीट करने की अनुमति है।'
                        : 'Real-time overview of customer ID logins, last login activity, and accounts. ID deletion is strictly reserved for Primary Owner.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 border ${
                  isPrimaryOwner 
                    ? 'bg-amber-50 text-amber-900 border-amber-300' 
                    : 'bg-blue-50 text-blue-900 border-blue-200'
                }`}>
                  {isPrimaryOwner ? <Crown className="w-4 h-4 text-amber-600" /> : <Shield className="w-4 h-4 text-blue-600" />}
                  <span>
                    {isPrimaryOwner 
                      ? (isHindi ? '👑 Owner: आईडी डिलीट की अनुमति' : '👑 Owner: ID Delete Authorized')
                      : (isHindi ? '🛡️ Admin: केवल देखने की अनुमति' : '🛡️ Admin: View-Only Access')}
                  </span>
                </span>
              </div>
            </div>

            {/* 4 Customer Statistics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Card 1: Total Customer IDs */}
              <div className="bg-white p-4 rounded-3xl border border-blue-200/90 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Users className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                    {isHindi ? 'कुल खाते' : 'Total IDs'}
                  </span>
                </div>
                <div className="mt-3">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 leading-none block">
                    {totalCustomersCount}
                  </span>
                  <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider block mt-1.5">
                    {isHindi ? 'कुल पंजीकृत ग्राहक आईडी' : 'TOTAL CUSTOMER IDS'}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    {isHindi ? 'ऐप में पंजीकृत अद्वितीय खाते' : 'Registered customer accounts'}
                  </span>
                </div>
              </div>

              {/* Card 2: Customers Logged In ID */}
              <div className="bg-white p-4 rounded-3xl border border-emerald-200/90 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {totalCustomersCount > 0 ? `${Math.round((totalCustomersLoggedInCount / totalCustomersCount) * 100)}% Logged In` : 'Active'}
                  </span>
                </div>
                <div className="mt-3">
                  <span className="text-2xl sm:text-3xl font-black text-emerald-600 leading-none block">
                    {totalCustomersLoggedInCount}
                  </span>
                  <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider block mt-1.5">
                    {isHindi ? 'आईडी लॉगिन किए ग्राहक' : 'CUSTOMERS LOGGED IN ID'}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    {isHindi ? 'सफल लॉगिन संख्या ≥ 1 बार' : 'Logged in ≥ 1 time'}
                  </span>
                </div>
              </div>

              {/* Card 3: Never Logged In */}
              <div className="bg-white p-4 rounded-3xl border border-amber-200/90 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                    <Clock className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                    {isHindi ? 'लॉगिन शेष' : 'Pending Login'}
                  </span>
                </div>
                <div className="mt-3">
                  <span className="text-2xl sm:text-3xl font-black text-amber-600 leading-none block">
                    {Math.max(0, totalCustomersCount - totalCustomersLoggedInCount)}
                  </span>
                  <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider block mt-1.5">
                    {isHindi ? 'लॉगिन नहीं किया' : 'NEVER LOGGED IN'}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    {isHindi ? 'खाता पंजीकृत है परंतु लॉगिन नहीं' : 'Account created, no login yet'}
                  </span>
                </div>
              </div>

              {/* Card 4: Total Bookings */}
              <div className="bg-white p-4 rounded-3xl border border-purple-200/90 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                    <CalendarCheck className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                    {isHindi ? 'बुकिंग्स' : 'Bookings'}
                  </span>
                </div>
                <div className="mt-3">
                  <span className="text-2xl sm:text-3xl font-black text-purple-600 leading-none block">
                    {stats.totalBookings}
                  </span>
                  <span className="text-[11px] font-bold text-purple-900 uppercase tracking-wider block mt-1.5">
                    {isHindi ? 'कुल ग्राहक बुकिंग्स' : 'DOORSTEP BOOKINGS'}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    {isHindi ? 'सत्यापित एवं MNP अनुरोध' : 'Doorstep porting leads'}
                  </span>
                </div>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  placeholder={isHindi ? 'ग्राहक का नाम, मोबाइल नंबर, ईमेल या UID खोजें...' : 'Search by name, mobile number, email, or UID...'}
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-1.5 bg-slate-100 p-1 rounded-2xl shrink-0">
                <button
                  type="button"
                  onClick={() => setCustomerLoginFilter('ALL')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    customerLoginFilter === 'ALL'
                      ? 'bg-white shadow-2xs text-slate-900'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {isHindi ? 'सभी ग्राहक' : 'All'} ({customerUsersList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerLoginFilter('LOGGED_IN')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    customerLoginFilter === 'LOGGED_IN'
                      ? 'bg-white shadow-2xs text-emerald-700 font-extrabold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {isHindi ? 'लॉगिन किए ग्राहक' : 'Logged In'} ({totalCustomersLoggedInCount})
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerLoginFilter('NOT_LOGGED_IN')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    customerLoginFilter === 'NOT_LOGGED_IN'
                      ? 'bg-white shadow-2xs text-amber-700 font-extrabold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {isHindi ? 'लॉगिन नहीं किए' : 'Never'} ({Math.max(0, totalCustomersCount - totalCustomersLoggedInCount)})
                </button>
              </div>
            </div>

            {/* Customers Table */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
              {filteredCustomerUsers.length === 0 ? (
                <div className="p-10 text-center text-slate-500 text-xs">
                  <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-slate-700 text-sm">
                    {isHindi ? 'कोई ग्राहक रिकॉर्ड नहीं मिला' : 'No customer records found'}
                  </p>
                  <p className="text-slate-400 mt-1">
                    {customerSearchQuery 
                      ? (isHindi ? 'खोज शब्द बदलकर प्रयास करें' : 'Try searching with a different keyword')
                      : (isHindi ? 'जैसे ही ग्राहक ऐप में खाता बनाएंगे, वे यहाँ दिखाई देंगे।' : 'Registered customers will appear here.')}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">{isHindi ? 'ग्राहक का नाम' : 'Customer Name'}</th>
                        <th className="py-3 px-3">{isHindi ? 'मोबाइल नंबर' : 'Mobile Number'}</th>
                        <th className="py-3 px-3">{isHindi ? 'लॉगिन आईडी / ईमेल' : 'Login ID / Email'}</th>
                        <th className="py-3 px-3">{isHindi ? 'पंजीकरण दिनांक' : 'Registration Date'}</th>
                        <th className="py-3 px-3">{isHindi ? 'अंतिम लॉगिन' : 'Last Login'}</th>
                        <th className="py-3 px-3 text-center">{isHindi ? 'लॉगिन संख्या' : 'Login Count'}</th>
                        <th className="py-3 px-3 text-center">{isHindi ? 'स्थिति' : 'Status'}</th>
                        <th className="py-3 px-3 text-center">{isHindi ? 'बुकिंग्स' : 'Bookings'}</th>
                        <th className="py-3 px-4 text-right">
                          {isHindi ? 'कार्रवाई (Owner Delete)' : 'Actions'}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredCustomerUsers.map((cust) => {
                        const cleanPhone = (cust.phone || cust.phoneNumber || '').replace(/\D/g, '').slice(-10);
                        const userLeads = leads.filter(
                          (l) => l.customerUid === cust.uid || (cleanPhone && (l.mobileNumber || '').replace(/\D/g, '').slice(-10) === cleanPhone)
                        );
                        const regDateStr = cust.createdAt
                          ? new Date(cust.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '-';
                        const lastLoginStr = cust.lastLoginAt
                          ? new Date(cust.lastLoginAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                          : (cust.hasLoggedIn ? 'Logged in' : 'Never');
                        const loginNum = cust.loginCount ?? (cust.hasLoggedIn || cust.lastLoginAt ? 1 : 0);
                        const isActuallyLoggedIn = cust.hasLoggedIn || loginNum > 0 || Boolean(cust.lastLoginAt);

                        return (
                          <tr key={cust.uid} className="hover:bg-slate-50/80 transition-colors">
                            {/* Customer Name */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-500 to-amber-500 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                                  {(cust.displayName || cust.email || 'C').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <span className="font-extrabold text-slate-900 block truncate max-w-[150px]">
                                    {cust.displayName || cust.email?.split('@')[0] || 'Customer'}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono block">
                                    UID: {cust.uid.slice(0, 8)}...
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Mobile Number with Call & WhatsApp */}
                            <td className="py-3.5 px-3 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-slate-800">
                                  {cleanPhone ? `+91 ${cleanPhone}` : '-'}
                                </span>
                                {cleanPhone && (
                                  <div className="flex items-center gap-1">
                                    <a
                                      href={`tel:${cleanPhone}`}
                                      className="p-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors"
                                      title={isHindi ? "कॉल करें" : "Call Customer"}
                                    >
                                      <Phone className="w-3 h-3" />
                                    </a>
                                    <a
                                      href={`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(`Hello ${cust.displayName || 'Customer'}, Vi Doorstep MNP update.`)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 transition-colors"
                                      title="WhatsApp"
                                    >
                                      <MessageCircle className="w-3 h-3" />
                                    </a>
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Login ID / Email */}
                            <td className="py-3.5 px-3 font-mono text-[11px] text-slate-600 truncate max-w-[170px]" title={cust.email || cust.uid}>
                              {cust.email || cust.phoneNumber || cust.uid}
                            </td>

                            {/* Registration Date */}
                            <td className="py-3.5 px-3 whitespace-nowrap text-[11px] text-slate-600">
                              {regDateStr}
                            </td>

                            {/* Last Login */}
                            <td className="py-3.5 px-3 whitespace-nowrap">
                              <span className={`text-[11px] font-semibold ${isActuallyLoggedIn ? 'text-slate-800' : 'text-slate-400'}`}>
                                {lastLoginStr}
                              </span>
                            </td>

                            {/* Login Count */}
                            <td className="py-3.5 px-3 text-center whitespace-nowrap">
                              <span className={`inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full text-[11px] font-black ${
                                loginNum > 0
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-400'
                              }`}>
                                {loginNum} {isHindi ? 'बार' : 'times'}
                              </span>
                            </td>

                            {/* Login Status */}
                            <td className="py-3.5 px-3 text-center whitespace-nowrap">
                              {isActuallyLoggedIn ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                                  <span>{isHindi ? 'लॉगिन किया' : 'Logged In'}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                                  {isHindi ? 'लॉगिन शेष' : 'No Login'}
                                </span>
                              )}
                            </td>

                            {/* Leads / Bookings */}
                            <td className="py-3.5 px-3 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => {
                                  if (cleanPhone) setSearchQuery(cleanPhone);
                                  setActiveSection('bookings');
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 border border-slate-200 transition-all cursor-pointer"
                                title={isHindi ? "बुकिंग्स देखें" : "View Bookings"}
                              >
                                <span>{userLeads.length}</span>
                                <ArrowUpRight className="w-3 h-3" />
                              </button>
                            </td>

                            {/* Actions Column: OWNER DELETE vs ADMIN READ-ONLY */}
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              {isPrimaryOwner ? (
                                <button
                                  type="button"
                                  onClick={() => setCustomerToDelete(cust)}
                                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-50 hover:bg-red-600 hover:text-white text-red-700 border border-red-200 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                  title={isHindi ? "ग्राहक आईडी डिलीट करें (केवल Primary Owner)" : "Delete Customer ID (Owner Only)"}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>{isHindi ? 'आईडी डिलीट' : 'Delete ID'}</span>
                                </button>
                              ) : (
                                <span
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                                  title={isHindi ? "केवल Primary Owner ही ग्राहक आईडी डिलीट कर सकते हैं" : "Only Primary Owner can delete customer IDs"}
                                >
                                  <Lock className="w-3 h-3 text-slate-400" />
                                  <span>{isHindi ? 'Owner Only' : 'Owner Only'}</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 4. OFFERS MANAGEMENT SECTION                             */}
        {/* ======================================================== */}
        {activeSection === 'offers' && (
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <Flame className="w-5 h-5 text-red-600" />
                  <span>Customer Portal Promotional Offers</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Add, edit, enable/disable, and reorder offers displayed on the customer app. Changes update in real time.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingOffer({
                    id: `offer_${Date.now()}`,
                    heading: 'VI 5G READY MEHKAR',
                    badge: 'PROMOTIONAL OFFER',
                    price: '₹398 FREE',
                    validity: '28 DAYS',
                    items: [
                      'VI PORT FREE FREE',
                      'AIRTEL / JIO / BSNL TO VI TRANSFER',
                      '₹398 KA RECHARGE FREE FREE',
                      'UNLIMITED DATA & CALL',
                      '28 DIN TAK VALIDITY',
                      'FREE PORTING - AASAN PORT',
                      'DOCUMENT ONLY AADHAAR CARD'
                    ],
                    disclaimer: 'Admin-configured promotional information (Doorstep MNP Mehkar). Terms apply.',
                    enabled: true,
                    order: portalConfig.offers.length + 1
                  });
                  setIsNewOffer(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Offer</span>
              </button>
            </div>

            {/* Offers Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {portalConfig.offers.map((off, idx) => (
                <div
                  key={off.id || idx}
                  className={`bg-white rounded-3xl border-2 p-5 shadow-xs space-y-4 transition-all ${
                    off.enabled ? 'border-red-300' : 'border-slate-200 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-red-600 text-white">
                        {off.badge || 'PROMOTIONAL OFFER'}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg text-xs font-black bg-amber-100 text-amber-900 border border-amber-300">
                        {off.price} • {off.validity}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          const updated = portalConfig.offers.map((o) =>
                            o.id === off.id ? { ...o, enabled: !o.enabled } : o
                          );
                          await handleSaveAllPortalConfig({ offers: updated });
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          off.enabled
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {off.enabled ? 'Active (Live)' : 'Disabled'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-black text-red-700 uppercase tracking-tight">{off.heading}</h4>
                    <p className="text-xs text-slate-500 mt-1">{off.disclaimer}</p>
                  </div>

                  {/* Benefit Items */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {off.items.map((it, i) => (
                      <div key={i} className="flex items-center gap-2 bg-red-50/70 p-2 rounded-xl border border-red-100 text-xs font-bold text-red-900">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">{it}</span>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingOffer(off);
                        setIsNewOffer(false);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Offer</span>
                    </button>

                    {portalConfig.offers.length > 1 && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (window.confirm('Are you sure you want to delete this offer?')) {
                            const updated = portalConfig.offers.filter((o) => o.id !== off.id);
                            await handleSaveAllPortalConfig({ offers: updated });
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 5. BANNERS MANAGEMENT SECTION                            */}
        {/* ======================================================== */}
        {activeSection === 'banners' && (
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-red-600" />
                  <span>Customer Portal Promotional Banners</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Control the hero banner title, subtitle, colors, and action buttons shown on the customer app.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingBanner({
                    id: `banner_${Date.now()}`,
                    title: 'VI 5G READY MEHKAR',
                    subtitle: 'Doorstep MNP & Free SIM Delivery in Mehkar Taluka',
                    badge: 'PROMOTIONAL OFFER',
                    imageUrl: '',
                    bgGradient: 'from-red-600 via-red-700 to-red-800',
                    ctaText: 'Open Porting Booking Form',
                    ctaAction: 'book_porting',
                    enabled: true,
                    order: portalConfig.banners.length + 1
                  });
                  setIsNewBanner(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Add Banner</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {portalConfig.banners.map((ban, idx) => (
                <div key={ban.id || idx} className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-xs font-bold text-slate-500">Banner #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={async () => {
                        const updated = portalConfig.banners.map((b) =>
                          b.id === ban.id ? { ...b, enabled: !b.enabled } : b
                        );
                        await handleSaveAllPortalConfig({ banners: updated });
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                        ban.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {ban.enabled ? 'Live' : 'Hidden'}
                    </button>
                  </div>

                  {/* Banner Preview Card */}
                  <div className={`p-5 rounded-2xl text-white bg-gradient-to-br ${ban.bgGradient || 'from-red-600 to-red-800'} shadow-sm space-y-2`}>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-400 text-red-950">
                      {ban.badge || 'PROMOTIONAL OFFER'}
                    </span>
                    <h4 className="text-lg font-black uppercase">{ban.title}</h4>
                    {ban.subtitle && <p className="text-xs text-red-100">{ban.subtitle}</p>}
                    <div className="pt-2">
                      <span className="inline-block px-3 py-1.5 rounded-xl bg-amber-400 text-red-950 text-xs font-black">
                        {ban.ctaText || 'Open Porting Booking Form'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingBanner(ban);
                        setIsNewBanner(false);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Banner</span>
                    </button>

                    {portalConfig.banners.length > 1 && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (window.confirm('Delete this banner?')) {
                            const updated = portalConfig.banners.filter((b) => b.id !== ban.id);
                            await handleSaveAllPortalConfig({ banners: updated });
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 6. LOGO & BRANDING SECTION                               */}
        {/* ======================================================== */}
        {activeSection === 'logo' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs max-w-2xl space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Sparkles className="w-5 h-5 text-red-600" />
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Brand Logo & Header Settings</h3>
                <p className="text-xs text-slate-500">Configure the brand icon, brand title, and tagline displayed on top of the Customer Portal.</p>
              </div>
            </div>

            {/* Live Header Simulation */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 block">Live Header Preview (How Customers See It):</label>
              <div className="bg-red-600 p-4 rounded-2xl text-white shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-xs border-2 border-amber-400 overflow-hidden">
                    {portalConfig.logo.imageUrl ? (
                      <img src={portalConfig.logo.imageUrl} alt={portalConfig.logo.text} className="w-8 h-8 object-contain" />
                    ) : (
                      <span className="text-red-600 font-black text-xl tracking-tighter">
                        {portalConfig.logo.symbol || 'V!'}
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-base tracking-tight">{portalConfig.logo.text}</h4>
                    <p className="text-xs text-red-100">{portalConfig.logo.subtext}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Edit Form */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await handleSaveAllPortalConfig({ logo: portalConfig.logo });
              }}
              className="space-y-4 pt-2"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Brand Name / Title</label>
                <input
                  type="text"
                  value={portalConfig.logo.text}
                  onChange={(e) =>
                    setPortalConfig({
                      ...portalConfig,
                      logo: { ...portalConfig.logo, text: e.target.value }
                    })
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-bold focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                  placeholder="e.g. Vi / Vodafone Idea"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Brand Subtext / Tagline</label>
                <input
                  type="text"
                  value={portalConfig.logo.subtext}
                  onChange={(e) =>
                    setPortalConfig({
                      ...portalConfig,
                      logo: { ...portalConfig.logo, subtext: e.target.value }
                    })
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                  placeholder="e.g. 4G / 5G Plus • Mehkar Doorstep Service"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Brand Symbol (If Image Not Provided)</label>
                <input
                  type="text"
                  value={portalConfig.logo.symbol}
                  onChange={(e) =>
                    setPortalConfig({
                      ...portalConfig,
                      logo: { ...portalConfig.logo, symbol: e.target.value }
                    })
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-black focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                  placeholder="e.g. V!"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Custom Image Logo URL (Optional)</label>
                <input
                  type="url"
                  value={portalConfig.logo.imageUrl || ''}
                  onChange={(e) =>
                    setPortalConfig({
                      ...portalConfig,
                      logo: { ...portalConfig.logo, imageUrl: e.target.value }
                    })
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                  placeholder="https://example.com/logo.png"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSavingConfig}
                  className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingConfig ? 'Saving Changes...' : 'Save & Update Logo'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ======================================================== */}
        {/* 7. ADMIN HELP & NUMBERS MANAGEMENT SECTION               */}
        {/* ======================================================== */}
        {activeSection === 'admin-help' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs max-w-2xl space-y-6">
            {!isPrimaryOwner ? (
              <div className="space-y-5">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <ShieldCheck className="w-5 h-5 text-red-600" />
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900">
                      {isHindi ? 'आपकी एडमिन प्रोफाइल एवं निर्धारित क्षेत्र' : 'Admin Profile & Assigned Territory'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {isHindi ? 'Primary Owner द्वारा अधिकृत विवरण एवं अनुमति दायरा' : 'Authorized credentials and territory bounds defined by Primary Owner'}
                    </p>
                  </div>
                </div>

                {/* Territory Profile Card */}
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block font-medium">{isHindi ? 'एडमिन का नाम' : 'Display Name'}</span>
                      <span className="font-black text-slate-900 text-sm">{userProfile?.displayName || user?.displayName || 'Admin'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">{isHindi ? 'लॉगिन ID / ईमेल' : 'Login ID / Email'}</span>
                      <span className="font-mono font-bold text-slate-900">{user?.email}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">{isHindi ? 'सिस्टम भूमिका' : 'Assigned Role'}</span>
                      <span className="font-extrabold text-red-700 bg-red-100 px-2 py-0.5 rounded-md w-fit inline-block">
                        Administrator
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">{isHindi ? 'अनुमति स्थिति' : 'Status'}</span>
                      <span className="font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md w-fit inline-block">
                        Active & Approved
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200">
                    <span className="text-xs font-black text-slate-900 flex items-center gap-1.5 mb-2">
                      <MapPin className="w-4 h-4 text-red-600" />
                      <span>{isHindi ? 'Owner द्वारा निर्धारित क्षेत्रीय दायरा (Territory Bounds)' : 'Owner-Assigned Territory Scope'}</span>
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 block font-medium">{isHindi ? 'राज्य' : 'State'}</span>
                        <span className="font-bold text-slate-800">{userProfile?.assignedState || 'Maharashtra'}</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 block font-medium">{isHindi ? 'जिला' : 'District'}</span>
                        <span className="font-bold text-slate-800">{userProfile?.assignedDistrict || 'Buldhana'}</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 block font-medium">{isHindi ? 'तालुका / तहसील' : 'Taluka'}</span>
                        <span className="font-bold text-slate-800">{userProfile?.assignedTaluka || 'Mehkar'}</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-red-300 bg-red-50/50">
                        <span className="text-[10px] text-red-700 block font-black">{isHindi ? 'निर्धारित गाँव' : 'Village'}</span>
                        <span className="font-black text-red-900">{userProfile?.assignedVillage || 'Mehkar City'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Security Notice */}
                  <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                    <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">
                        {isHindi ? 'सुरक्षा एवं गोपनीयता नियम' : 'Security Policy Enforced'}
                      </span>
                      <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                        {isHindi
                          ? 'Admin अपनी भूमिका (Role) या आवंटित गाँव (Village) खुद नहीं बदल सकते और दूसरे गाँव का डेटा नहीं देख सकते। केवल Primary Owner Admin ही आपका गाँव या भूमिका निर्धारित कर सकते हैं।'
                          : 'Admins cannot alter their role or assigned village, and cannot access data of other villages. Only the Primary Owner can reassign your territory.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Support Contact */}
                <div className="pt-2">
                  <span className="text-xs font-bold text-slate-500 block mb-1.5">{isHindi ? 'मुख्य संपर्क नंबर:' : 'Owner Support Contact:'}</span>
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-800 text-xs">Primary Owner Support</div>
                      <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">
                        +91 {portalConfig.adminHelp.callNumber || '9175601497'}
                      </div>
                    </div>
                    <a
                      href={`tel:${portalConfig.adminHelp.callNumber || '9175601497'}`}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold"
                    >
                      Call Owner
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <PhoneCall className="w-5 h-5 text-red-600" />
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900">Admin Help Numbers & Support Details</h3>
                    <p className="text-xs text-slate-500">Manage the direct phone and WhatsApp numbers customers use to call or chat with the delivery agent.</p>
                  </div>
                </div>

                {/* Live Contact Card Preview */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 block">Live Preview on Customer Portal:</label>
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-red-700 uppercase tracking-wider block">
                        {portalConfig.adminHelp.supportTitle || 'VI Porting / Home Service Contact'}
                      </span>
                      <div className="text-xl font-black text-red-950 flex items-center gap-2 mt-0.5">
                        <PhoneCall className="w-5 h-5 text-red-600" />
                        <span>{portalConfig.adminHelp.callNumber || '9175601497'}</span>
                      </div>
                      <div className="text-xs font-bold text-emerald-700 flex items-center gap-1.5 mt-0.5">
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Admin WhatsApp: {portalConfig.adminHelp.whatsappNumber || '9175601497'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${portalConfig.adminHelp.callNumber || '9175601497'}`}
                        className="bg-emerald-600 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                        <span>Call Now</span>
                      </a>
                      <a
                        href={`https://wa.me/91${(portalConfig.adminHelp.whatsappNumber || '9175601497').replace(/\D/g, '').slice(-10)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-green-600 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    </div>
                  </div>
                </div>

                {/* Edit Numbers Form */}
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await handleSaveAllPortalConfig({ adminHelp: portalConfig.adminHelp });
                  }}
                  className="space-y-4 pt-2"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Admin Call Number</label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="tel"
                          required
                          value={portalConfig.adminHelp.callNumber}
                          onChange={(e) =>
                            setPortalConfig({
                              ...portalConfig,
                              adminHelp: { ...portalConfig.adminHelp, callNumber: e.target.value }
                            })
                          }
                          className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-bold font-mono focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Admin WhatsApp Number</label>
                      <div className="relative">
                        <MessageCircle className="w-4 h-4 text-emerald-600 absolute left-3 top-2.5" />
                        <input
                          type="tel"
                          required
                          value={portalConfig.adminHelp.whatsappNumber}
                          onChange={(e) =>
                            setPortalConfig({
                              ...portalConfig,
                              adminHelp: { ...portalConfig.adminHelp, whatsappNumber: e.target.value }
                            })
                          }
                          className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-bold font-mono focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Support Title / Heading</label>
                    <input
                      type="text"
                      value={portalConfig.adminHelp.supportTitle}
                      onChange={(e) =>
                        setPortalConfig({
                          ...portalConfig,
                          adminHelp: { ...portalConfig.adminHelp, supportTitle: e.target.value }
                        })
                      }
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-bold focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Fixed Service Area Notice</label>
                    <input
                      type="text"
                      value={portalConfig.adminHelp.fixedServiceArea}
                      onChange={(e) =>
                        setPortalConfig({
                          ...portalConfig,
                          adminHelp: { ...portalConfig.adminHelp, fixedServiceArea: e.target.value }
                        })
                      }
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSavingConfig}
                      className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      <span>{isSavingConfig ? 'Saving...' : 'Save & Update Help Numbers'}</span>
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* 8. MAP / LOCATIONS SECTION                               */}
        {/* ======================================================== */}
        {activeSection === 'locations' && (
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-purple-600" />
                  <span>Customer GPS Locations & Navigation Map ({locationBookings.length})</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Secure GPS coordinates authorized and shared by customers during booking. Click "Navigate" to open directions in Google Maps.
                </p>
              </div>
            </div>

            {locationBookings.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center space-y-3">
                <MapPin className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="font-bold text-slate-700 text-sm">No GPS coordinates captured yet</h4>
                <p className="text-xs text-slate-400">When customers share their live location during booking, direct navigation links appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {locationBookings.map((lead) => {
                  const coords = lead.locationCoordinates!;
                  return (
                    <div
                      key={lead.id}
                      className="bg-white rounded-3xl border border-purple-200 p-5 shadow-xs hover:shadow-md transition-all space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-200 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-purple-600" />
                            GPS Verified (±{coords.accuracy || 10}m)
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : ''}
                          </span>
                        </div>

                        <div>
                          <h4 className="font-black text-slate-900 text-base">{lead.customerName}</h4>
                          <div className="text-sm font-black font-mono text-slate-800">
                            +91 {lead.mobileNumber}
                          </div>
                          <div className="text-xs font-bold text-red-600 mt-0.5">
                            {lead.currentOperator} ➔ Vi ({lead.connectionType})
                          </div>
                        </div>

                        {/* Coordinates Box */}
                        <div className="bg-purple-50/70 rounded-2xl p-3 border border-purple-100 space-y-1 text-xs">
                          <div className="font-mono text-[11px] text-purple-900 font-bold">
                            Lat: {coords.latitude}, Long: {coords.longitude}
                          </div>
                          <div className="text-slate-600 text-[11px]">
                            Address: {coords.address || lead.address || lead.customerAddress || 'Mehkar Doorstep'}
                          </div>
                          {coords.sharedAt && (
                            <div className="text-[10px] text-slate-400">
                              Captured: {new Date(coords.sharedAt).toLocaleTimeString()}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedBookingForDetails(lead)}
                          className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                        >
                          View Lead
                        </button>

                        <button
                          type="button"
                          onClick={() => openGoogleMapsDirections(lead)}
                          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                        >
                          <Navigation className="w-4 h-4" />
                          <span>🧭 Open Directions</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TERRITORY & ADMIN ASSIGNMENT SECTION (VILLAGE & CITY)    */}
        {/* ======================================================== */}
        {activeSection === 'territories' && (
          <div className="space-y-6">
            {/* Header & Quick Action Banner */}
            <div className="bg-gradient-to-r from-red-600 via-rose-700 to-red-900 rounded-3xl p-6 text-white shadow-md flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-white/20 rounded-xl backdrop-blur-xs">
                    <Building2 className="w-5 h-5 text-white" />
                  </span>
                  <span className="text-xs font-black uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
                    {isHindi ? 'सुपर एडमिन नियंत्रण' : 'Super Admin Territory Control'}
                  </span>
                </div>
                <h3 className="text-xl font-black tracking-tight">
                  {isHindi ? 'गाँव-वार और शहर-वार एडमिन आवंटन सिस्टम' : 'Village & City Admin Assignment System'}
                </h3>
                <p className="text-xs text-red-100 leading-relaxed font-medium">
                  {isHindi
                    ? 'सुपर एडमिन किसी भी एडमिन को State, District, Taluka/City और Village असाइन कर सकते हैं। एक गाँव में कई एडमिन की अनुमति है। कस्टमर बुकिंग सीधे संबंधित गाँव के एडमिन को प्राप्त होती है।'
                    : 'Super Admin can assign any Admin State, District, Taluka/City, and Village. Multiple Admins per village are fully supported. Customer bookings route automatically to the assigned village Admin.'}
                </p>
              </div>

              {/* Action Button */}
              {isPrimaryOwner && (
                <button
                  type="button"
                  onClick={() => setIsAddAdminModalOpen(true)}
                  className="px-5 py-3 rounded-2xl bg-white text-red-700 hover:bg-red-50 font-black text-xs shadow-lg flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4 text-red-600" />
                  <span>{isHindi ? '➕ नया एडमिन जोड़ें और गाँव सौंपें' : '➕ Add Admin & Assign Village'}</span>
                </button>
              )}
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <div className="text-[11px] font-bold text-slate-500">{isHindi ? 'सक्रिय एडमिन' : 'Active Admins'}</div>
                <div className="text-2xl font-black text-slate-900">
                  {allAdminsList.filter((u) => u.role === 'admin' && !u.isDeactivated).length}
                </div>
                <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> {isHindi ? 'सत्यापित और अधिकृत' : 'Verified & authorized'}
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <div className="text-[11px] font-bold text-slate-500">{isHindi ? 'मेहकर/बुलढाणा गाँव' : 'Covered Villages'}</div>
                <div className="text-2xl font-black text-red-600">
                  {availableVillageOptions.length}
                </div>
                <div className="text-[10px] text-slate-500 font-bold">
                  {isHindi ? 'डोरस्टेप सिम डिलीवरी' : 'Doorstep SIM coverage'}
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <div className="text-[11px] font-bold text-slate-500">{isHindi ? 'कुल ग्राहक बुकिंग्स' : 'Total Bookings'}</div>
                <div className="text-2xl font-black text-slate-900">
                  {leads.length}
                </div>
                <div className="text-[10px] text-purple-600 font-bold flex items-center gap-1">
                  <Radio className="w-3 h-3" /> {isHindi ? 'लाइव सिंक चालू' : 'Real-time live sync'}
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <div className="text-[11px] font-bold text-slate-500">{isHindi ? 'सुपर एडमिन' : 'Super Admin'}</div>
                <div className="text-xs font-black text-slate-900 truncate">
                  raheema62038@gmail.com
                </div>
                <div className="text-[10px] text-amber-700 font-bold flex items-center gap-1">
                  <Crown className="w-3 h-3 text-amber-500" /> {isHindi ? 'अखिल भारतीय पूर्ण अधिकार' : 'All-India Full Access'}
                </div>
              </div>
            </div>

            {/* Owner Multi-Admin Allocation Rule Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="space-y-0.5">
                  <h4 className="font-black text-base text-slate-900 flex items-center gap-2">
                    <Users className="w-5 h-5 text-red-600" />
                    <span>{isHindi ? 'एक गाँव में कई Admin होने पर बुकिंग वितरण नियम (Owner Setting)' : 'Multi-Admin Booking Allocation Rule (Owner Setting)'}</span>
                  </h4>
                  <p className="text-xs text-slate-500">
                    {isHindi
                      ? 'जब किसी गाँव में 1 से अधिक Admin असाइन हों, तो नए ग्राहक की बुकिंग किस प्रकार दिखाई दे / प्राप्त हो:'
                      : 'When multiple Admins are assigned to the same village, configure how incoming bookings are routed:'}
                  </p>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-800 border border-red-200 px-2.5 py-1 rounded-full">
                  {isHindi ? 'Owner द्वारा निर्धारित' : 'Owner Controlled'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  {
                    mode: 'shared_pool' as const,
                    title: isHindi ? '1. सभी को दिखे (Shared Pool)' : '1. Shared Pool (All Admins)',
                    desc: isHindi
                      ? 'गाँव के सभी असाइन किए गए Admins को उस गाँव की हर नई बुकिंग दिखाई देगी और कोई भी प्रोसेस कर सकेगा।'
                      : 'All Admins assigned to this village see every booking and can service the customer.',
                    badge: isHindi ? 'डिफ़ॉल्ट नियम' : 'Default Rule',
                  },
                  {
                    mode: 'round_robin' as const,
                    title: isHindi ? '2. रोटेशन बारी-बारी (Round Robin)' : '2. Round Robin (Equal Rotation)',
                    desc: isHindi
                      ? 'नई बुकिंग्स गाँव के Admins के बीच बारी-बारी रोटेशन में बँटेंगी ताकि सभी को समान बुकिंग मिले।'
                      : 'Incoming customer bookings rotate turn-by-turn equally among active Admins in that village.',
                    badge: isHindi ? 'समान वितरण' : 'Equal Sharing',
                  },
                  {
                    mode: 'primary_admin' as const,
                    title: isHindi ? '3. मुख्य एडमिन (Primary Admin)' : '3. Primary Admin First',
                    desc: isHindi
                      ? 'बुकिंग पहले असाइन किए गए मुख्य Admin को दी जाएगी। बैकअप एडमिन आवश्यकतानुसार सहयोग करेंगे।'
                      : 'Bookings route primarily to the first/primary Admin assigned to that village.',
                    badge: isHindi ? 'मुख्य प्रभारी' : 'Lead Admin',
                  },
                ].map((rule) => {
                  const isSelected = (portalConfig.territoryRules?.multiAdminMode || 'shared_pool') === rule.mode;
                  return (
                    <button
                      key={rule.mode}
                      type="button"
                      disabled={!isPrimaryOwner || isSavingConfig}
                      onClick={async () => {
                        if (!isPrimaryOwner) return;
                        const updatedRules = {
                          multiAdminMode: rule.mode,
                          updatedAt: new Date().toISOString(),
                          updatedBy: user?.email || user?.uid,
                        };
                        setPortalConfig({ ...portalConfig, territoryRules: updatedRules });
                        await handleSaveAllPortalConfig({ territoryRules: updatedRules });
                      }}
                      className={`text-left p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                        isSelected
                          ? 'bg-red-50 border-red-500 ring-2 ring-red-500 shadow-xs'
                          : 'bg-slate-50/70 border-slate-200 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className={`font-black text-xs ${isSelected ? 'text-red-900' : 'text-slate-900'}`}>
                            {rule.title}
                          </span>
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                            isSelected ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {isSelected ? (isHindi ? '✓ सक्रिय' : '✓ Active') : rule.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                          {rule.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Admin Users Directory with Territory Assignments */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h4 className="font-black text-base text-slate-900 flex items-center gap-2">
                    <Users className="w-5 h-5 text-red-600" />
                    <span>{isHindi ? 'अधिकृत एडमिन और उनका आवंटित क्षेत्र' : 'Authorized Admins & Territory Scopes'}</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isHindi
                      ? 'प्रत्येक एडमिन केवल अपने आवंटित गाँव/शहर का डेटा देख और अपडेट कर सकता है। दूसरे क्षेत्रों का डेटा पूरी तरह सुरक्षित है।'
                      : 'Each Admin can strictly view and update bookings in their assigned village/territory. Other territories are protected by Backend API and Firestore Security Rules.'}
                  </p>
                </div>

                <div className="text-xs font-bold bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl border border-slate-200">
                  {allAdminsList.filter((u) => u.role === 'admin').length} {isHindi ? 'एडमिन पंजीकृत' : 'Admins registered'}
                </div>
              </div>

              {/* Admins Cards / Table */}
              <div className="space-y-3">
                {allAdminsList
                  .filter((u) => u.role === 'admin' || u.role === 'owner')
                  .map((admin) => {
                    const isOwner = Boolean(
                      admin.role === 'owner' ||
                      admin.isPrimaryOwner ||
                      (admin.email && isEmailPrimaryOwner(admin.email))
                    );
                    const territories = admin.assignedTerritories || [];
                    const hasTerritories = territories.length > 0 || Boolean(admin.assignedVillage);

                    return (
                      <div
                        key={admin.uid}
                        className={`rounded-2xl p-4 border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                          isOwner
                            ? 'bg-amber-50/60 border-amber-200'
                            : admin.isDeactivated
                            ? 'bg-slate-50 border-slate-200 opacity-60'
                            : 'bg-white border-slate-200 hover:border-red-300 hover:shadow-xs'
                        }`}
                      >
                        {/* Admin Info */}
                        <div className="space-y-1.5 max-w-md">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-slate-900 text-sm">
                              {admin.displayName || (admin as any).name || 'Admin User'}
                            </span>
                            {isOwner ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-200 text-amber-900 border border-amber-300 flex items-center gap-1">
                                <Crown className="w-3 h-3 text-amber-600" />
                                {isHindi ? 'सुपर एडमिन (सभी क्षेत्र)' : 'Super Owner (All India)'}
                              </span>
                            ) : admin.isDeactivated ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                                {isHindi ? 'निष्क्रिय' : 'Deactivated'}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                {isHindi ? 'सक्रिय एडमिन' : 'Active Admin'}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                            <span className="font-mono text-slate-700">{admin.email}</span>
                            {(admin.phoneNumber || admin.phone) && (
                              <span className="font-mono font-bold text-slate-800">
                                +91 {(admin.phoneNumber || admin.phone || '').replace(/\D/g, '').slice(-10)}
                              </span>
                            )}
                          </div>

                          {/* Assigned Territory Badges */}
                          <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-red-600" />
                              {isHindi ? 'आवंटित क्षेत्र:' : 'Assigned Territory:'}
                            </span>
                            {isOwner ? (
                              <span className="text-[10px] font-black bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                                🌐 {isHindi ? 'संपूर्ण भारत (अनपेक्षित पहुँच)' : 'All India / Universal Access'}
                              </span>
                            ) : hasTerritories ? (
                              <>
                                {territories.map((t) => (
                                  <span
                                    key={t.id}
                                    className="text-[10px] font-extrabold bg-red-100 text-red-800 px-2.5 py-0.5 rounded-full border border-red-200 flex items-center gap-1"
                                  >
                                    🏡 {t.village || t.taluka} ({t.district || 'Buldhana'})
                                  </span>
                                ))}
                                {admin.assignedVillage && !territories.some((t) => t.village === admin.assignedVillage) && (
                                  <span className="text-[10px] font-extrabold bg-red-100 text-red-800 px-2.5 py-0.5 rounded-full border border-red-200">
                                    🏡 {admin.assignedVillage} ({admin.assignedTaluka || 'Mehkar'})
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                                {isHindi ? '⚠️ कोई विशिष्ट गाँव असाइन नहीं (नीचे क्लिक करें)' : '⚠️ No village assigned (Click to assign)'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Assign Territory Action */}
                        <div className="flex items-center gap-2 shrink-0">
                          {isPrimaryOwner && !isOwner && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAdminForTerritory(admin);
                                setIsTerritoryModalOpen(true);
                              }}
                              className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                            >
                              <MapPin className="w-3.5 h-3.5" />
                              <span>{isHindi ? '📍 गाँव/क्षेत्र असाइन करें' : '📍 Assign / Edit Village'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Village Explorer with Multi-Admin Highlight */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h4 className="font-black text-base text-slate-900 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-purple-600" />
                    <span>{isHindi ? 'मेहकर तहसील - गाँव डायरेक्टरी एवं मल्टी-एडमिन स्थिति' : 'Mehkar Taluka - Village Directory & Multi-Admin Coverage'}</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isHindi
                      ? 'एक गाँव में कई एडमिन काम कर सकते हैं। प्रत्येक गाँव की बुकिंग उसी गाँव के सभी असाइन किए गए एडमिन को दिखाई देगी।'
                      : 'Multiple Admins can be assigned to the same village. Bookings in that village are automatically delivered to all assigned Admins.'}
                  </p>
                </div>
              </div>

              {/* Village Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {getAvailableVillages('Maharashtra', 'Buldhana', 'Mehkar').map((villageName) => {
                  const normV = villageName.toLowerCase().replace(/[^a-z0-9]/g, '');
                  
                  // Find all admins assigned to this village
                  const assignedAdmins = allAdminsList.filter((admin) => {
                    if (admin.role !== 'admin' || admin.isDeactivated) return false;
                    if (Array.isArray(admin.assignedTerritories)) {
                      const matchInArray = admin.assignedTerritories.some(
                        (t) => t.village && t.village.toLowerCase().replace(/[^a-z0-9]/g, '') === normV
                      );
                      if (matchInArray) return true;
                    }
                    if (admin.assignedVillage && admin.assignedVillage.toLowerCase().replace(/[^a-z0-9]/g, '') === normV) {
                      return true;
                    }
                    return false;
                  });

                  // Count bookings in this village
                  const villageBookings = leads.filter((l) => {
                    const lv = (l.village || l.address || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                    return lv.includes(normV) || normV.includes(lv);
                  });

                  return (
                    <div
                      key={villageName}
                      className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-200 hover:border-purple-300 hover:bg-white transition-all space-y-2 flex flex-col justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <h5 className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-red-600"></span>
                            <span>{villageName}</span>
                          </h5>
                          {assignedAdmins.length > 1 && (
                            <span className="text-[9px] font-black bg-purple-100 text-purple-900 px-1.5 py-0.5 rounded-full border border-purple-200">
                              👥 Multi-Admin ({assignedAdmins.length})
                            </span>
                          )}
                        </div>

                        <div className="text-[10px] text-slate-500 font-medium">
                          Buldhana District • Mehkar Taluka
                        </div>

                        {/* Assigned Admins Pills */}
                        <div className="pt-1 space-y-1">
                          <div className="text-[10px] font-bold text-slate-600">
                            {isHindi ? 'असाइन किए गए एडमिन:' : 'Assigned Admins:'}
                          </div>
                          {assignedAdmins.length === 0 ? (
                            <div className="text-[10px] text-slate-400 italic">
                              {isHindi ? 'कोई एडमिन असाइन नहीं' : 'No Admin assigned yet'}
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {assignedAdmins.map((adm) => (
                                <span
                                  key={adm.uid}
                                  className="text-[9px] font-bold bg-white text-slate-800 px-2 py-0.5 rounded-md border border-slate-200 truncate max-w-full"
                                >
                                  👤 {adm.displayName || adm.email}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Footer: Bookings count & Quick Assign button */}
                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-1 text-[10px]">
                        <span className="font-bold text-red-600">
                          {villageBookings.length} {isHindi ? 'बुकिंग्स' : 'Bookings'}
                        </span>

                        {isPrimaryOwner && (
                          <button
                            type="button"
                            onClick={() => {
                              // If there's an active non-owner admin, open assignment for them
                              const firstAdmin = allAdminsList.find(
                                (u) => u.role === 'admin' && !u.isDeactivated && !isEmailPrimaryOwner(u.email || '')
                              );
                              if (firstAdmin) {
                                setSelectedAdminForTerritory(firstAdmin);
                                setIsTerritoryModalOpen(true);
                              } else {
                                setIsAddAdminModalOpen(true);
                              }
                            }}
                            className="font-bold text-red-600 hover:text-red-700 hover:underline cursor-pointer"
                          >
                            {isHindi ? 'असाइन करें ➔' : 'Assign ➔'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 9. SETTINGS & APP TEXTS SECTION                          */}
        {/* ======================================================== */}
        {activeSection === 'settings' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs max-w-2xl space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Settings className="w-5 h-5 text-red-600" />
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Portal Text & System Settings</h3>
                <p className="text-xs text-slate-500">Configure global announcements, service area disclaimers, and system synchronizations.</p>
              </div>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await handleSaveAllPortalConfig({ texts: portalConfig.texts });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Global Announcement Banner (Optional)</label>
                <input
                  type="text"
                  value={portalConfig.texts.announcement || ''}
                  onChange={(e) =>
                    setPortalConfig({
                      ...portalConfig,
                      texts: { ...portalConfig.texts, announcement: e.target.value }
                    })
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                  placeholder="e.g. Special Doorstep MNP Offer: Port to Vi and get 28 Days Unlimited Recharge Free!"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Service Area Restriction Text</label>
                <input
                  type="text"
                  value={portalConfig.texts.serviceAreaNotice || ''}
                  onChange={(e) =>
                    setPortalConfig({
                      ...portalConfig,
                      texts: { ...portalConfig.texts, serviceAreaNotice: e.target.value }
                    })
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                  placeholder="Fixed Service Area: Maharashtra → Buldhana → Mehkar → 443301"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSavingConfig}
                  className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingConfig ? 'Saving...' : 'Save Settings'}</span>
                </button>
              </div>
            </form>

            <div className="pt-6 border-t border-slate-100 space-y-3">
              <h4 className="font-bold text-sm text-slate-900">Database & Security Status</h4>
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs space-y-2 text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Firestore Connection:</span>
                  <span className="font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Connected & Active
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Data Isolation Rules:</span>
                  <span className="font-bold text-slate-800">Customers see only their own data</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Deletion Authorization:</span>
                  <span className="font-bold text-red-700">Primary Owner (raheema62038@gmail.com) Only</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 9. APP UPDATES & APK SYSTEM (Requirement 14)            */}
        {/* ======================================================== */}
        {activeSection === 'app-updates' && (
          <div className="space-y-6">
            {/* Header / Overview */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <Download className="w-5 h-5 text-red-600" />
                  <span>{isHindi ? 'Android APK इन-ऐप ऑटोमैटिक अपडेट सिस्टम' : 'Android APK Automatic In-App Update Management'}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
                  {isHindi 
                    ? 'यहाँ से आप नए APK का वर्जन कोड, डाउनलोड लिंक, अपडेट मैसेज और Force Update सेट कर सकते हैं। ग्राहक जब ऐप खोलेगा, तब सिस्टम अपने आप चेक करेगा और नया अपडेट मिलने पर सूचना देगा।'
                    : 'Manage the latest APK version, download URL, update message, and force-update rules. When customers launch the app, this system automatically detects updates and prompts them.'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPreviewUpdateModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs transition-all"
                >
                  <Eye className="w-4 h-4 text-amber-400" />
                  <span>{isHindi ? 'पॉपअप प्रीव्यू करें' : 'Preview Customer Popup'}</span>
                </button>
              </div>
            </div>

            {/* Quick Status Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  {isHindi ? 'वर्तमान में लाइव नया वर्जन' : 'Target Live Release'}
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono font-black text-slate-900 text-lg">
                    v{portalConfig.appUpdate?.latestVersionName || DEFAULT_APP_UPDATE_CONFIG.latestVersionName}
                  </span>
                  <span className="text-xs text-slate-500 font-bold">
                    (Code: {portalConfig.appUpdate?.latestVersionCode || DEFAULT_APP_UPDATE_CONFIG.latestVersionCode})
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 block">
                  Package: <code className="font-mono text-red-600 bg-red-50 px-1 py-0.5 rounded">com.vi.salesmnp</code>
                </span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  {isHindi ? 'अपडेट मोड' : 'Update Enforcement Mode'}
                </span>
                <div className="flex items-center gap-2 pt-0.5">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-black inline-flex items-center gap-1.5 ${
                    portalConfig.appUpdate?.forceUpdate
                      ? 'bg-red-100 text-red-700 border border-red-200'
                      : 'bg-blue-100 text-blue-700 border border-blue-200'
                  }`}>
                    {portalConfig.appUpdate?.forceUpdate ? '⚠️ Force Update (अनिवार्य)' : '✓ Flexible ("Later" अनुमति)'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {portalConfig.appUpdate?.forceUpdate 
                    ? 'ग्राहक को केवल "Update Now" दिखेगा, अपडेट बिना ऐप नहीं चलेगा।' 
                    : 'ग्राहक "Update Now" या "Later" चुन सकता है।'}
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  {isHindi ? 'चेक स्टेटस' : 'System Status'}
                </span>
                <div className="flex items-center gap-2 pt-0.5">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-black inline-flex items-center gap-1.5 ${
                    portalConfig.appUpdate?.enabled !== false
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    {portalConfig.appUpdate?.enabled !== false ? 'Active (सक्रिय)' : 'Paused (रोका गया)'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {portalConfig.appUpdate?.enabled !== false 
                    ? 'ऐप खुलते ही ग्राहकों के डिवाइस पर ऑटोमैटिक चेक चलेगा।' 
                    : 'ऑटोमैटिक अपडेट चेक अभी बंद है।'}
                </p>
              </div>
            </div>

            {/* Main Form Configuration */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveAllPortalConfig({ appUpdate: portalConfig.appUpdate || DEFAULT_APP_UPDATE_CONFIG });
              }}
              className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5"
            >
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">
                    {isHindi ? 'अपडेट सेटिंग्स कॉन्फ़िगर करें' : 'Configure APK Update Parameters'}
                  </h4>
                  <p className="text-xs text-slate-400">
                    {isHindi ? 'इन सेटिंग्स को बदलने पर तुरंत सभी ग्राहकों को नया अपडेट दिखने लगेगा।' : 'Changes sync in real-time across customer devices.'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Latest Version Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isHindi ? 'नवीनतम वर्जन का नाम (Version Name)' : 'Latest Version Name'}
                  </label>
                  <input
                    type="text"
                    required
                    value={portalConfig.appUpdate?.latestVersionName || ''}
                    onChange={(e) =>
                      setPortalConfig({
                        ...portalConfig,
                        appUpdate: {
                          ...(portalConfig.appUpdate || DEFAULT_APP_UPDATE_CONFIG),
                          latestVersionName: e.target.value
                        }
                      })
                    }
                    placeholder="e.g. 1.1"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    {isHindi ? 'दिखने वाला वर्जन (उदा: 1.1, 1.2)' : 'Visible release tag shown to users (e.g. 1.1)'}
                  </p>
                </div>

                {/* Latest Version Code */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isHindi ? 'नवीनतम वर्जन कोड (Version Code - Android)' : 'Latest Version Code (Android)'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={portalConfig.appUpdate?.latestVersionCode ?? 2}
                    onChange={(e) =>
                      setPortalConfig({
                        ...portalConfig,
                        appUpdate: {
                          ...(portalConfig.appUpdate || DEFAULT_APP_UPDATE_CONFIG),
                          latestVersionCode: parseInt(e.target.value, 10) || 1
                        }
                      })
                    }
                    placeholder="e.g. 2"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    {isHindi ? 'एंड्रॉयड में नया अपडेट हमेशा पुराने से बड़ा कोड होना चाहिए (2 > 1)' : 'Integer build number (must increment for Android updates)'}
                  </p>
                </div>
              </div>

              {/* APK Download URL */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isHindi ? 'आधिकारिक APK डाउनलोड URL (APK Download Link)' : 'Official APK Download URL'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    required
                    value={portalConfig.appUpdate?.apkDownloadUrl || ''}
                    onChange={(e) =>
                      setPortalConfig({
                        ...portalConfig,
                        appUpdate: {
                          ...(portalConfig.appUpdate || DEFAULT_APP_UPDATE_CONFIG),
                          apkDownloadUrl: e.target.value
                        }
                      })
                    }
                    placeholder="https://github.com/raheema62038/vi-sales-mnp/releases/latest/download/app-debug.apk"
                    className="flex-1 px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-mono focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                  {portalConfig.appUpdate?.apkDownloadUrl && (
                    <a
                      href={portalConfig.appUpdate.apkDownloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                      title="Test URL in new tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{isHindi ? 'चेक करें' : 'Open Link'}</span>
                    </a>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setPortalConfig({
                        ...portalConfig,
                        appUpdate: {
                          ...(portalConfig.appUpdate || DEFAULT_APP_UPDATE_CONFIG),
                          apkDownloadUrl: 'https://github.com/raheema62038-source/Vi-sales-mnp/releases/latest/download/app-release.apk'
                        }
                      })
                    }
                    className="text-[10px] font-bold text-red-600 hover:underline cursor-pointer"
                  >
                    + Signed Release APK URL (app-release.apk)
                  </button>
                  <span className="text-slate-300 text-[10px]">•</span>
                  <button
                    type="button"
                    onClick={() =>
                      setPortalConfig({
                        ...portalConfig,
                        appUpdate: {
                          ...(portalConfig.appUpdate || DEFAULT_APP_UPDATE_CONFIG),
                          apkDownloadUrl: 'https://github.com/raheema62038-source/Vi-sales-mnp/releases/latest/download/app-debug.apk'
                        }
                      })
                    }
                    className="text-[10px] font-bold text-slate-600 hover:underline cursor-pointer"
                  >
                    + Compatibility URL (app-debug.apk)
                  </button>
                </div>
              </div>

              {/* Toggles: Force Update & Enabled */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* Force Update Toggle */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex items-start justify-between gap-3">
                  <div>
                    <span className="font-bold text-xs text-slate-800 block">
                      {isHindi ? 'Force Update (अनिवार्य अपडेट लागू करें)' : 'Force Update (Block Usage Until Updated)'}
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      {isHindi
                        ? 'चालू करने पर ग्राहक को "Later" का विकल्प नहीं मिलेगा और अपडेट करना जरूरी होगा।'
                        : 'If enabled, customers cannot dismiss with "Later" and must tap "Update Now".'}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                    <input
                      type="checkbox"
                      checked={Boolean(portalConfig.appUpdate?.forceUpdate)}
                      onChange={(e) =>
                        setPortalConfig({
                          ...portalConfig,
                          appUpdate: {
                            ...(portalConfig.appUpdate || DEFAULT_APP_UPDATE_CONFIG),
                            forceUpdate: e.target.checked
                          }
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                  </label>
                </div>

                {/* Enable / Disable Update Check */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex items-start justify-between gap-3">
                  <div>
                    <span className="font-bold text-xs text-slate-800 block">
                      {isHindi ? 'ऑटोमैटिक अपडेट चेक चालू रखें' : 'Enable Automatic Update Check'}
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      {isHindi
                        ? 'ग्राहकों के ऐप खोलते ही बैकग्राउंड में अपडेट चेक करने की अनुमति दें।'
                        : 'Actively prompts customers when newer APK version code is published.'}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                    <input
                      type="checkbox"
                      checked={portalConfig.appUpdate?.enabled !== false}
                      onChange={(e) =>
                        setPortalConfig({
                          ...portalConfig,
                          appUpdate: {
                            ...(portalConfig.appUpdate || DEFAULT_APP_UPDATE_CONFIG),
                            enabled: e.target.checked
                          }
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              </div>

              {/* Update Message */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isHindi ? 'पॉपअप में दिखने वाला मैसेज (Update Message)' : 'Update Popup Message'}
                </label>
                <input
                  type="text"
                  required
                  value={portalConfig.appUpdate?.updateMessage || ''}
                  onChange={(e) =>
                    setPortalConfig({
                      ...portalConfig,
                      appUpdate: {
                        ...(portalConfig.appUpdate || DEFAULT_APP_UPDATE_CONFIG),
                        updateMessage: e.target.value
                      }
                    })
                  }
                  placeholder="आपके लिए ऐप का नया version उपलब्ध है।"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              {/* Release Notes / What's New */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isHindi ? 'नया क्या है (Release Notes / What’s New)' : 'Release Notes / What’s New'}
                </label>
                <textarea
                  rows={3}
                  value={portalConfig.appUpdate?.releaseNotes || ''}
                  onChange={(e) =>
                    setPortalConfig({
                      ...portalConfig,
                      appUpdate: {
                        ...(portalConfig.appUpdate || DEFAULT_APP_UPDATE_CONFIG),
                        releaseNotes: e.target.value
                      }
                    })
                  }
                  placeholder="• नया ऑटोमैटिक अपडेट सिस्टम&#10;• बेहतर परफॉरमेंस और स्टेबिलिटी"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none leading-relaxed"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={isSavingConfig}
                  className="px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-red-500/20 flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingConfig ? 'सेव हो रहा है...' : 'सेव और पब्लिश करें (Save & Deploy Update)'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPreviewUpdateModalOpen(true)}
                  className="px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 font-bold text-xs flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Eye className="w-4 h-4 text-slate-600" />
                  <span>{isHindi ? 'पॉपअप टेस्ट करें' : 'Test Customer Popup'}</span>
                </button>
              </div>
            </form>

            {/* Technical Architecture & Automatic APK Generator Box */}
            <div className="bg-slate-900 text-white rounded-3xl p-6 space-y-5 shadow-lg border border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-red-600/20 text-red-400 flex items-center justify-center border border-red-500/30">
                    <Sparkles className="w-5 h-5 text-red-400 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-white tracking-wide">
                      {isHindi ? 'ऑटोमैटिक Android APK जनरेटर (GitHub Actions)' : 'Automatic Android APK Generator (GitHub Actions)'}
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      {isHindi ? 'क्लाउड पर 1-क्लिक में साइन्ड APK तैयार करें व ग्राहकों को ऑटो-अपडेट भेजें' : 'Generate signed release APK in cloud and push live updates'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href="https://github.com/raheema62038-source/Vi-sales-mnp/actions/workflows/build-apk.yml"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-xl text-xs font-black shadow-md shadow-red-600/30 flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isHindi ? 'APK बनाएं (Run Workflow)' : 'Build APK (Run Workflow)'}</span>
                    <ExternalLink className="w-3 h-3 opacity-80" />
                  </a>

                  <a
                    href="https://github.com/raheema62038-source/Vi-sales-mnp/releases/latest"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 flex items-center gap-1.5 active:scale-95 transition-all"
                  >
                    <span>{isHindi ? 'Releases देखें' : 'View Releases'}</span>
                    <ExternalLink className="w-3 h-3 opacity-80" />
                  </a>
                </div>
              </div>

              {/* Step-by-Step Instructions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-slate-800/70 p-3.5 rounded-2xl border border-slate-700/60 space-y-1">
                  <div className="flex items-center gap-2 text-red-400 font-black text-xs">
                    <span className="w-5 h-5 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center font-bold">1</span>
                    <span>{isHindi ? 'GitHub Actions खोलें' : 'Open Actions'}</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {isHindi ? 'ऊपर दिए बटन "APK बनाएं" पर क्लिक करें। GitHub पर "Build Android APK" वर्कफ़्लो खुलेगा।' : 'Click Build APK above to open the automated build workflow.'}
                  </p>
                </div>

                <div className="bg-slate-800/70 p-3.5 rounded-2xl border border-slate-700/60 space-y-1">
                  <div className="flex items-center gap-2 text-amber-400 font-black text-xs">
                    <span className="w-5 h-5 rounded-full bg-amber-600 text-white text-[10px] flex items-center justify-center font-bold">2</span>
                    <span>{isHindi ? '"Run workflow" दबाएं' : 'Run Workflow'}</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {isHindi ? 'दाईं ओर "Run workflow" बटन दबाकर कन्फर्म करें। GitHub क्लाउड अपने आप साइन्ड APK तैयार करेगा।' : 'Click Run workflow to compile the APK in GitHub cloud runners.'}
                  </p>
                </div>

                <div className="bg-slate-800/70 p-3.5 rounded-2xl border border-slate-700/60 space-y-1">
                  <div className="flex items-center gap-2 text-emerald-400 font-black text-xs">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-bold">3</span>
                    <span>{isHindi ? 'ग्राहकों को ऑटो-अपडेट' : 'Instant In-App Update'}</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {isHindi ? 'APK बनते ही GitHub Release पर पब्लिश हो जाएगा और सभी ग्राहकों के ऐप में नया अपडेट पॉपअप दिखेगा।' : 'Once built, users automatically receive in-app update popups.'}
                  </p>
                </div>
              </div>

              {/* Technical Specifications */}
              <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span><strong>Package ID:</strong> <code className="font-mono text-emerald-300">com.vi.salesmnp</code></span>
                </div>
                <div>
                  <span><strong>Target Version:</strong> <code className="font-mono text-amber-300">v{portalConfig.appUpdate?.latestVersionName || DEFAULT_APP_UPDATE_CONFIG.latestVersionName}</code> (Code: {portalConfig.appUpdate?.latestVersionCode || DEFAULT_APP_UPDATE_CONFIG.latestVersionCode})</span>
                </div>
                <div>
                  <span><strong>Signed Release APK:</strong> <code className="font-mono text-slate-300">app-release.apk</code></span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ======================================================== */}
      {/* MODAL 1: BOOKING FULL DETAILS & GOOGLE MAPS NAVIGATION   */}
      {/* ======================================================== */}
      {selectedBookingForDetails && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-red-600" />
                <h4 className="font-black text-base text-slate-900">
                  Booking & Customer Details
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBookingForDetails(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Top Banner Status & Verification */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-500">Booking Status:</span>
                  <span className="px-2.5 py-0.5 rounded-full font-black text-red-700 bg-red-100 border border-red-200">
                    {selectedBookingForDetails.bookingStatus || 'Booked'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleVerification(selectedBookingForDetails)}
                    className={`px-3 py-1 rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      selectedBookingForDetails.isCustomerVerified || selectedBookingForDetails.customerVerificationStatus === 'Verified'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>
                      {selectedBookingForDetails.isCustomerVerified || selectedBookingForDetails.customerVerificationStatus === 'Verified'
                        ? 'Verified Customer'
                        : 'Click to Verify Customer'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Customer Info Card */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block font-medium">Customer Name</span>
                  <span className="font-bold text-slate-900 text-sm">{selectedBookingForDetails.customerName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Mobile Number</span>
                  <span className="font-black text-slate-900 font-mono text-sm">+91 {selectedBookingForDetails.mobileNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Porting Transfer</span>
                  <span className="font-black text-red-600">{selectedBookingForDetails.currentOperator} ➔ Vi</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Connection Type</span>
                  <span className="font-bold text-slate-800">{selectedBookingForDetails.connectionType}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block font-medium">Selected Plan</span>
                  <span className="font-bold text-slate-800">{selectedBookingForDetails.selectedPlan}</span>
                </div>
              </div>

              {/* Location & Navigation Block */}
              <div className="bg-purple-50/70 border-2 border-purple-200 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-purple-950 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-purple-700" />
                    <span>Customer Location & GPS Coordinates</span>
                  </span>
                  {selectedBookingForDetails.locationCoordinates ? (
                    <span className="text-[10px] font-bold bg-purple-200 text-purple-900 px-2 py-0.5 rounded-md">
                      Live GPS Available
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md">
                      Address Search
                    </span>
                  )}
                </div>

                <p className="text-slate-700 font-medium">
                  {selectedBookingForDetails.taluka
                    ? `${selectedBookingForDetails.address || ''}, ${selectedBookingForDetails.taluka}, ${selectedBookingForDetails.district}, ${selectedBookingForDetails.state} - ${selectedBookingForDetails.pincode}`
                    : (selectedBookingForDetails.customerAddress || selectedBookingForDetails.address || 'Mehkar Doorstep Address')}
                </p>

                {selectedBookingForDetails.locationCoordinates && (
                  <div className="bg-white p-2.5 rounded-xl border border-purple-200 font-mono text-purple-900 font-bold space-y-0.5">
                    <div>Latitude: {selectedBookingForDetails.locationCoordinates.latitude}</div>
                    <div>Longitude: {selectedBookingForDetails.locationCoordinates.longitude}</div>
                    <div className="text-[10px] text-slate-500 font-sans">
                      Accuracy: ±{selectedBookingForDetails.locationCoordinates.accuracy || 10} meters • Shared: {new Date(selectedBookingForDetails.locationCoordinates.sharedAt).toLocaleTimeString()}
                    </div>
                  </div>
                )}

                {/* Google Maps Navigate Button */}
                <button
                  type="button"
                  onClick={() => openGoogleMapsDirections(selectedBookingForDetails)}
                  className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-98 cursor-pointer"
                >
                  <Navigation className="w-4 h-4" />
                  <span>🧭 Navigate to Customer in Google Maps</span>
                </button>
              </div>

              {/* Remarks */}
              {selectedBookingForDetails.remarks && (
                <div className="bg-amber-50 rounded-2xl p-3 border border-amber-200 text-amber-900">
                  <span className="font-bold block">Remarks:</span>
                  <p className="mt-0.5">{selectedBookingForDetails.remarks}</p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setBookingToEdit(selectedBookingForDetails);
                    setSelectedBookingForDetails(null);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Booking</span>
                </button>

                {isPrimaryOwner && (
                  <button
                    type="button"
                    onClick={() => handleDeleteLeadClick(selectedBookingForDetails)}
                    className="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Record</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedBookingForDetails(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: EDIT BOOKING DETAILS                            */}
      {/* ======================================================== */}
      {bookingToEdit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-red-600" />
                <h4 className="font-black text-base text-slate-900">
                  Edit Customer Booking Details
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setBookingToEdit(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBookingEdits} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Customer Full Name</label>
                <input
                  type="text"
                  required
                  value={bookingToEdit.customerName}
                  onChange={(e) => setBookingToEdit({ ...bookingToEdit, customerName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mobile Number (10 Digits)</label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={bookingToEdit.mobileNumber}
                  onChange={(e) => setBookingToEdit({ ...bookingToEdit, mobileNumber: e.target.value.replace(/\D/g, '') })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold font-mono focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Current Operator</label>
                  <select
                    value={bookingToEdit.currentOperator}
                    onChange={(e) => setBookingToEdit({ ...bookingToEdit, currentOperator: e.target.value as CurrentOperator })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                  >
                    <option value="Airtel">Airtel</option>
                    <option value="Jio">Jio</option>
                    <option value="BSNL">BSNL</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Booking Status</label>
                  <select
                    value={bookingToEdit.bookingStatus}
                    onChange={(e) => setBookingToEdit({ ...bookingToEdit, bookingStatus: e.target.value as BookingStatus })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Verified">Verified</option>
                    <option value="Booked">Booked</option>
                    <option value="In Process">In Process</option>
                    <option value="SIM Dispatched">SIM Dispatched</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Delivery Address & Landmark</label>
                <input
                  type="text"
                  value={bookingToEdit.address || ''}
                  onChange={(e) => setBookingToEdit({ ...bookingToEdit, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Selected Plan</label>
                <input
                  type="text"
                  value={bookingToEdit.selectedPlan || ''}
                  onChange={(e) => setBookingToEdit({ ...bookingToEdit, selectedPlan: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Admin Remarks / Notes</label>
                <textarea
                  rows={2}
                  value={bookingToEdit.remarks || ''}
                  onChange={(e) => setBookingToEdit({ ...bookingToEdit, remarks: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setBookingToEdit(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingLead}
                  className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isUpdatingLead ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: ADD / EDIT PROMOTIONAL OFFER                    */}
      {/* ======================================================== */}
      {editingOffer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-red-600" />
                <h4 className="font-black text-base text-slate-900">
                  {isNewOffer ? 'Add New Promotional Offer' : 'Edit Promotional Offer'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setEditingOffer(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                let updatedOffers: PortalOfferItem[];
                if (isNewOffer) {
                  updatedOffers = [...portalConfig.offers, editingOffer];
                } else {
                  updatedOffers = portalConfig.offers.map((o) =>
                    o.id === editingOffer.id ? editingOffer : o
                  );
                }
                await handleSaveAllPortalConfig({ offers: updatedOffers });
                setEditingOffer(null);
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">Offer Heading / Title</label>
                <input
                  type="text"
                  required
                  value={editingOffer.heading}
                  onChange={(e) => setEditingOffer({ ...editingOffer, heading: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Price / Benefit Text</label>
                  <input
                    type="text"
                    required
                    value={editingOffer.price}
                    onChange={(e) => setEditingOffer({ ...editingOffer, price: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                    placeholder="e.g. ₹398 FREE"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Validity</label>
                  <input
                    type="text"
                    required
                    value={editingOffer.validity}
                    onChange={(e) => setEditingOffer({ ...editingOffer, validity: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                    placeholder="e.g. 28 DAYS"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Badge Tag</label>
                <input
                  type="text"
                  value={editingOffer.badge}
                  onChange={(e) => setEditingOffer({ ...editingOffer, badge: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Benefit Items (One per line)</label>
                <textarea
                  rows={6}
                  required
                  value={editingOffer.items.join('\n')}
                  onChange={(e) =>
                    setEditingOffer({
                      ...editingOffer,
                      items: e.target.value.split('\n').filter((l) => l.trim().length > 0)
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Disclaimer / Terms Notice</label>
                <textarea
                  rows={2}
                  value={editingOffer.disclaimer}
                  onChange={(e) => setEditingOffer({ ...editingOffer, disclaimer: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingOffer(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingConfig}
                  className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingConfig ? 'Saving...' : 'Save Offer'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: ADD / EDIT BANNER                               */}
      {/* ======================================================== */}
      {editingBanner && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-red-600" />
                <h4 className="font-black text-base text-slate-900">
                  {isNewBanner ? 'Add Promotional Banner' : 'Edit Promotional Banner'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setEditingBanner(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                let updatedBanners: PortalBanner[];
                if (isNewBanner) {
                  updatedBanners = [...portalConfig.banners, editingBanner];
                } else {
                  updatedBanners = portalConfig.banners.map((b) =>
                    b.id === editingBanner.id ? editingBanner : b
                  );
                }
                await handleSaveAllPortalConfig({ banners: updatedBanners });
                setEditingBanner(null);
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">Banner Title</label>
                <input
                  type="text"
                  required
                  value={editingBanner.title}
                  onChange={(e) => setEditingBanner({ ...editingBanner, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Banner Subtitle / Description</label>
                <input
                  type="text"
                  value={editingBanner.subtitle || ''}
                  onChange={(e) => setEditingBanner({ ...editingBanner, subtitle: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Badge</label>
                <input
                  type="text"
                  value={editingBanner.badge || ''}
                  onChange={(e) => setEditingBanner({ ...editingBanner, badge: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Call-To-Action (CTA) Button Text</label>
                <input
                  type="text"
                  value={editingBanner.ctaText || ''}
                  onChange={(e) => setEditingBanner({ ...editingBanner, ctaText: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Background Gradient Preset</label>
                <select
                  value={editingBanner.bgGradient || 'from-red-600 via-red-700 to-red-800'}
                  onChange={(e) => setEditingBanner({ ...editingBanner, bgGradient: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                >
                  <option value="from-red-600 via-red-700 to-red-800">Red (Default Vi)</option>
                  <option value="from-red-700 via-amber-600 to-red-800">Red & Amber Flame</option>
                  <option value="from-slate-900 via-red-950 to-slate-900">Dark Luxury Red</option>
                  <option value="from-emerald-700 via-teal-800 to-emerald-900">Emerald Green</option>
                  <option value="from-blue-700 via-indigo-800 to-blue-900">Royal Blue</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingBanner(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingConfig}
                  className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingConfig ? 'Saving...' : 'Save Banner'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 5: APP UPDATE PREVIEW FOR ADMIN TESTING            */}
      {/* ======================================================== */}
      <AppUpdateModal
        isOpen={isPreviewUpdateModalOpen}
        installedVersion={{
          versionName: '1.0',
          versionCode: 1,
          appId: 'com.vi.salesmnp',
          isNative: false
        }}
        updateConfig={portalConfig.appUpdate || DEFAULT_APP_UPDATE_CONFIG}
        onDismissLater={() => setIsPreviewUpdateModalOpen(false)}
        isHindi={isHindi}
      />

      {/* ======================================================== */}
      {/* MODAL 6: TERRITORY ASSIGNMENT MODAL (VILLAGE & CITY)     */}
      {/* ======================================================== */}
      <TerritoryAssignmentModal
        isOpen={isTerritoryModalOpen}
        onClose={() => {
          setIsTerritoryModalOpen(false);
          setSelectedAdminForTerritory(null);
        }}
        targetAdmin={selectedAdminForTerritory}
        allUsers={allAdminsList}
        onAssignmentsUpdated={(adminUid, updatedTerritories) => {
          triggerSaveNotification(
            isHindi 
              ? '✓ क्षेत्र आवंटन सफलतापूर्वक अपडेट किया गया' 
              : '✓ Territory assignments updated successfully'
          );
          setAllAdminsList((prev) =>
            prev.map((u) => (u.uid === adminUid ? { ...u, assignedTerritories: updatedTerritories } : u))
          );
          onRefreshLeads();
        }}
      />

      {/* ======================================================== */}
      {/* MODAL 7: ADD NEW ADMIN WITH VILLAGE ASSIGNMENT           */}
      {/* ======================================================== */}
      <AddAdminModal
        isOpen={isAddAdminModalOpen}
        onClose={() => setIsAddAdminModalOpen(false)}
        onAdminCreated={(newAdmin) => {
          triggerSaveNotification(
            isHindi
              ? `✓ नया एडमिन ${newAdmin.displayName} सफलतापूर्वक बनाया गया`
              : `✓ New Admin ${newAdmin.displayName} created successfully`
          );
          setAllAdminsList((prev) => [...prev, newAdmin]);
          onRefreshLeads();
        }}
      />

      {/* ======================================================== */}
      {/* MODAL 8: DELETE CUSTOMER ID CONFIRMATION (OWNER ONLY)    */}
      {/* ======================================================== */}
      {customerToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-red-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 shadow-xs">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {isHindi ? 'ग्राहक आईडी डिलीट करें?' : 'Delete Customer Account?'}
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {isHindi 
                    ? 'क्या आप वाकई इस ग्राहक की आईडी और खाता डेटाबेस से हटाना चाहते हैं?' 
                    : 'Are you sure you want to delete this customer ID from Firebase Firestore?'}
                </p>
              </div>
            </div>

            {/* Customer Details Box */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">{isHindi ? 'ग्राहक का नाम:' : 'Customer Name:'}</span>
                <span className="font-extrabold text-slate-900">{customerToDelete.displayName || 'Customer'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">{isHindi ? 'मोबाइल नंबर:' : 'Mobile Number:'}</span>
                <span className="font-mono font-bold text-slate-900">{customerToDelete.phone || customerToDelete.phoneNumber || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">{isHindi ? 'ईमेल / लॉगिन आईडी:' : 'Login ID / Email:'}</span>
                <span className="font-mono text-slate-700 truncate max-w-[200px]" title={customerToDelete.email || customerToDelete.uid}>
                  {customerToDelete.email || customerToDelete.uid}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">{isHindi ? 'कुल लॉगिन संख्या:' : 'Total Logins:'}</span>
                <span className="font-bold text-emerald-700">{customerToDelete.loginCount ?? (customerToDelete.hasLoggedIn ? 1 : 0)} {isHindi ? 'बार' : 'times'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">{isHindi ? 'अंतिम लॉगिन:' : 'Last Login:'}</span>
                <span className="text-slate-700">
                  {customerToDelete.lastLoginAt ? new Date(customerToDelete.lastLoginAt).toLocaleString('en-IN') : (customerToDelete.hasLoggedIn ? 'Logged in' : 'Never')}
                </span>
              </div>
            </div>

            <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-[11px] text-red-800 leading-relaxed font-semibold flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>
                {isHindi
                  ? 'सुरक्षा चेतावनी: यह ग्राहक आईडी हटाने के बाद ग्राहक ऐप में दोबारा लॉगिन नहीं कर सकेगा। यह कार्रवाई केवल Primary Owner द्वारा की जा सकती है।'
                  : 'Warning: This action permanently deletes the user ID from Firebase. The customer will no longer be able to log in with this ID.'}
              </span>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                disabled={isDeletingCustomer}
                onClick={() => setCustomerToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition-all"
              >
                {isHindi ? 'रद्द करें' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={isDeletingCustomer}
                onClick={handleDeleteCustomerConfirm}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5 cursor-pointer shadow-md transition-all disabled:opacity-50"
              >
                {isDeletingCustomer ? (
                  <>
                    <span className="animate-spin">⟳</span>
                    <span>{isHindi ? 'हटाया जा रहा है...' : 'Deleting...'}</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>{isHindi ? 'हाँ, आईडी डिलीट करें' : 'Yes, Delete ID'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
