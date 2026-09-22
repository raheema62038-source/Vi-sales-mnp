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
  Download
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
  CurrentOperator
} from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { isEmailPrimaryOwner } from '../../services/userService';
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

      return matchesSearch && matchesStatus && matchesOperator && matchesVerification;
    });
  }, [leads, searchQuery, statusFilter, operatorFilter, verificationFilter]);

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
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <span>{user?.email || 'Admin'}</span>
                <span>•</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {isPrimaryOwner ? 'Primary Owner' : 'Administrator'}
                </span>
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
            {[
              { id: 'dashboard', label: isHindi ? 'डैशबोर्ड' : 'Dashboard', icon: LayoutDashboard },
              { id: 'bookings', label: isHindi ? 'बुकिंग्स' : 'Bookings', icon: CalendarCheck, count: stats.totalBookings },
              { id: 'customers', label: isHindi ? 'कस्टमर्स' : 'Customers', icon: Users, count: stats.totalCustomers },
              { id: 'offers', label: isHindi ? 'ऑफर' : 'Offers', icon: Flame },
              { id: 'banners', label: isHindi ? 'बैनर' : 'Banners', icon: ImageIcon },
              { id: 'logo', label: isHindi ? 'लोगो' : 'Logo', icon: Sparkles },
              { id: 'admin-help', label: isHindi ? 'हेल्प नंबर' : 'Admin Help', icon: PhoneCall },
              { id: 'locations', label: isHindi ? 'मैप / लोकेशन' : 'Map/Locations', icon: MapPin, count: stats.mappedLocations },
              { id: 'app-updates', label: isHindi ? 'ऐप अपडेट' : 'App Updates', icon: Download },
              { id: 'settings', label: isHindi ? 'सेटिंग्स' : 'Settings', icon: Settings },
            ].map((tab) => {
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
                className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs hover:border-slate-400 transition-all cursor-pointer space-y-2"
              >
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900">{stats.totalCustomers}</div>
                  <div className="text-xs font-bold text-slate-500">{isHindi ? 'कस्टमर रिकॉर्ड्स' : 'Total Customers'}</div>
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
                  {(statusFilter !== 'ALL' || operatorFilter !== 'ALL' || verificationFilter !== 'ALL' || searchQuery) && (
                    <button
                      type="button"
                      onClick={() => {
                        setStatusFilter('ALL');
                        setOperatorFilter('ALL');
                        setVerificationFilter('ALL');
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
        {/* 3. CUSTOMERS SECTION                                     */}
        {/* ======================================================== */}
        {activeSection === 'customers' && (
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-red-600" />
                  <span>Verified Customer Directory ({aggregatedCustomers.length})</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Unique customers aggregated by registered mobile number with direct contact & verification controls.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {aggregatedCustomers.map((c) => (
                <div
                  key={c.phone}
                  className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-black text-slate-900 text-base">{c.name}</h4>
                      {c.isVerified ? (
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

                    <div className="text-sm font-black font-mono text-slate-800">
                      +91 {c.phone}
                    </div>

                    <div className="text-xs text-slate-500 space-y-1 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                      <div>Total Bookings: <strong className="text-slate-800">{c.totalBookings}</strong></div>
                      <div className="truncate">Address: <strong>{c.address}</strong></div>
                      <div>Last active: <strong>{new Date(c.lastBookingDate).toLocaleDateString()}</strong></div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <a
                        href={`tel:${c.phone}`}
                        className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200"
                        title="Call Customer"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                      <a
                        href={`https://wa.me/91${c.phone}?text=${encodeURIComponent('Hello ' + c.name + ', your Vi Porting doorstep request is being processed.')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-green-50 hover:bg-green-100 text-green-700 border border-green-200"
                        title="WhatsApp Customer"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </a>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleToggleVerification(c.latestLead)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                      >
                        {c.isVerified ? 'Unverify' : 'Verify'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedBookingForDetails(c.latestLead)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white cursor-pointer"
                      >
                        View
                      </button>
                    </div>
                  </div>
                </div>
              ))}
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

            {/* Technical Architecture Info Box */}
            <div className="bg-slate-900 text-white rounded-3xl p-5 space-y-3 shadow-sm border border-slate-800">
              <div className="flex items-center gap-2 text-xs font-bold text-red-400 uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" />
                <span>{isHindi ? 'Persistent Keystore & Signed Release APK गाइड' : 'Persistent Keystore & Signed Release Architecture'}</span>
              </div>
              <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside leading-relaxed">
                <li><strong>Application ID:</strong> <code>com.vi.salesmnp</code> (पैकेज आईडी वही रखी गई है ताकि ऐप अलग से न बने बल्कि मौजूदा ऐप पर ही अपडेट हो)।</li>
                <li><strong>Version Code Sequence:</strong> पुराना APK = Code 1 (v1.0), नया APK = Code 2 (v1.1)।</li>
                <li><strong>Persistent Keystore (Signatures):</strong> एक ही कीस्टोर से साइन होने के कारण भविष्य के सभी APK बिना अनइंस्टॉल किए एक के ऊपर एक अपडेट होंगे।</li>
                <li><strong>GitHub Secrets:</strong> <code>ANDROID_KEYSTORE_BASE64</code>, <code>ANDROID_KEYSTORE_PASSWORD</code>, <code>ANDROID_KEY_ALIAS</code>, <code>ANDROID_KEY_PASSWORD</code>।</li>
                <li><strong>Dual Asset Upload:</strong> GitHub Release में <code>app-release.apk</code> और पुराने लिंक्स के लिए <code>app-debug.apk</code> दोनों उपलब्ध रहते हैं।</li>
              </ul>
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
    </div>
  );
};
