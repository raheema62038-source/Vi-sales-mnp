import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Plus, 
  AlertCircle, 
  CheckCircle2, 
  Download, 
  SearchX,
  ShieldCheck,
  Briefcase,
  Users,
  User,
  Filter,
  X,
  Crown
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { Header } from './components/Header';
import { StatsBar } from './components/StatsBar';
import { FilterBar } from './components/FilterBar';
import { LeadCard } from './components/LeadCard';
import { LeadFormModal } from './components/LeadFormModal';
import { LeadDetailsModal } from './components/LeadDetailsModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { FirebaseConfigModal } from './components/FirebaseConfigModal';
import { ApkDownloadModal } from './components/ApkDownloadModal';
import { AuthScreen } from './components/AuthScreen';
import { PendingAdminScreen } from './components/PendingAdminScreen';
import { DeactivatedAccountScreen } from './components/DeactivatedAccountScreen';
import { CustomerPortal } from './components/CustomerPortal';
import { CustomerBookingModal } from './components/CustomerBookingModal';
import { EditOfferModal } from './components/EditOfferModal';
import { AdminUsersView } from './components/AdminUsersView';
import { AdminAnalyticsView } from './components/AdminAnalyticsView';
import { AdminPanel } from './components/admin/AdminPanel';
import { 
  subscribeToLeads, 
  addLead, 
  updateLead, 
  deleteLead 
} from './services/leadService';
import { isEmailPrimaryOwner, subscribeToAllUsers } from './services/userService';
import { Lead, LeadFormData, MnpStatus, UserRole, UserProfile } from './types';
import { isFirebaseConfigured } from './firebase';

function MainAppContent() {
  const { 
    user, 
    userProfile, 
    role, 
    isAdmin, 
    isOwnerAdmin,
    isRubiOwner, 
    isDeactivated,
    isPendingAdmin, 
    loading: authLoading 
  } = useAuth();
  const { t, language } = useLanguage();

  // Admin Multi-View Navigation ('leads' | 'team' | 'analytics')
  const [adminTab, setAdminTab] = useState<'leads' | 'team' | 'analytics'>('leads');
  const [adminUserFilter, setAdminUserFilter] = useState<string | null>(null);
  const [adminViewMode, setAdminViewMode] = useState<'admin_panel' | 'classic_leads' | 'customer_preview'>('admin_panel');

  // Users Directory & Stats State for Admin
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (isAdmin) {
      const unsub = subscribeToAllUsers((uList) => {
        if (uList) setAllUsers(uList);
      });
      return () => {
        try { unsub(); } catch (_) {}
      };
    }
  }, [isAdmin]);

  const customerUsers = useMemo(() => {
    return allUsers.filter(
      (u) => u.role === 'customer' || (!u.role && !isEmailPrimaryOwner(u.email))
    );
  }, [allUsers]);

  const totalNewCustomers = customerUsers.length;
  const totalCustomersJoined = customerUsers.length;
  const totalCustomers = customerUsers.length;
  const totalCustomersLoggedIn = customerUsers.filter(
    (u) => u.hasLoggedIn || (u.loginCount && u.loginCount > 0) || Boolean(u.lastLoginAt)
  ).length;
  const totalAppDownloads = customerUsers.filter(
    (u) => (u.downloadCount && u.downloadCount > 0) || u.hasDownloaded
  ).length;

  // Leads State
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [isFirestoreLive, setIsFirestoreLive] = useState(false);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedOperator, setSelectedOperator] = useState('ALL');

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [detailsLead, setDetailsLead] = useState<Lead | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const [deletingLead, setDeletingLead] = useState<Lead | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isApkModalOpen, setIsApkModalOpen] = useState(false);
  const [isCustomerBookingOpen, setIsCustomerBookingOpen] = useState(false);
  const [isEditOfferOpen, setIsEditOfferOpen] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Subscribe to existing Firestore 'leads' collection with user role scoping
  const refreshLeads = useCallback(() => {
    setLoadingLeads(true);
    setFirestoreError(null);

    const isOwner = isOwnerAdmin || (user?.email && isEmailPrimaryOwner(user.email));
    const effectiveRole: UserRole = isOwner ? 'owner' : (isAdmin ? 'admin' : role);

    const authContextInfo = user
      ? {
          uid: user.uid,
          role: effectiveRole,
          isAdmin: Boolean(isAdmin || isOwner),
          isOwnerAdmin: Boolean(isOwner),
          email: user.email,
          phone: userProfile?.phone || userProfile?.phoneNumber || user.phoneNumber || '',
          phoneNumber: user.phoneNumber || userProfile?.phoneNumber || '',
          displayName: userProfile?.displayName || user.displayName,
        }
      : null;

    const unsubscribe = subscribeToLeads(
      authContextInfo,
      (data, isFromCloud) => {
        setLeads(data);
        setIsFirestoreLive(isFromCloud);
        setLoadingLeads(false);
      },
      (err) => {
        console.warn('Subscription notice:', err);
        setFirestoreError(err?.message || 'Firestore Connection Error');
        setIsFirestoreLive(false);
        setLoadingLeads(false);
      }
    );

    return unsubscribe;
  }, [user, role, isAdmin, isOwnerAdmin, userProfile]);

  useEffect(() => {
    const unsubscribe = refreshLeads();
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [refreshLeads]);

  // If lead in details modal gets updated, keep it in sync
  useEffect(() => {
    if (detailsLead) {
      const refreshed = leads.find((l) => l.id === detailsLead.id);
      if (refreshed) {
        setDetailsLead(refreshed);
      }
    }
  }, [leads, detailsLead]);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Admin filter by specific user
      if (isAdmin && adminUserFilter) {
        if (
          lead.createdByUid !== adminUserFilter &&
          lead.customerUid !== adminUserFilter &&
          lead.salespersonUid !== adminUserFilter
        ) {
          return false;
        }
      }

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = lead.customerName?.toLowerCase().includes(q);
        const matchesPhone = lead.mobileNumber?.includes(q);
        const matchesAltPhone = lead.alternateNumber?.includes(q);
        const matchesUpc = lead.upcCode?.toLowerCase().includes(q);
        const matchesCircle = lead.cityCircle?.toLowerCase().includes(q);
        const matchesAddress = lead.customerAddress?.toLowerCase().includes(q) || lead.address?.toLowerCase().includes(q);
        const matchesLeadType = lead.leadType?.toLowerCase().includes(q);
        const matchesBooking = lead.bookingStatus?.toLowerCase().includes(q);
        const matchesSim = lead.simNumber?.toLowerCase().includes(q);
        const matchesCreator = lead.createdByName?.toLowerCase().includes(q) || lead.createdByEmail?.toLowerCase().includes(q);
        if (
          !matchesName && 
          !matchesPhone && 
          !matchesAltPhone && 
          !matchesUpc && 
          !matchesCircle && 
          !matchesAddress && 
          !matchesLeadType && 
          !matchesBooking && 
          !matchesSim && 
          !matchesCreator
        ) {
          return false;
        }
      }

      // Status / Dashboard Category
      if (selectedStatus === 'IN_PROCESS') {
        if (!['New', 'UPC Generated', 'SIM Allocated', 'E-KYC Done'].includes(lead.status)) return false;
      } else if (selectedStatus === 'SIM_PORTING') {
        if (
          lead.leadType !== 'Porting (MNP)' && 
          lead.leadType !== 'New SIM Connection' && 
          !lead.simNumber && 
          !lead.upcCode && 
          lead.leadType
        ) return false;
      } else if (selectedStatus === 'BOOKED') {
        if (lead.bookingStatus !== 'Booked' && (!lead.bookingCount || lead.bookingCount <= 0)) return false;
      } else if (selectedStatus !== 'ALL') {
        if (lead.status !== selectedStatus) return false;
      }

      // Operator
      if (selectedOperator !== 'ALL') {
        if (lead.currentOperator !== selectedOperator) return false;
      }

      return true;
    });
  }, [leads, searchQuery, selectedStatus, selectedOperator, isAdmin, adminUserFilter]);

  // Helper to get user name for filter badge
  const filterUserName = useMemo(() => {
    if (!adminUserFilter) return null;
    const found = leads.find((l) => l.createdByUid === adminUserFilter);
    return found?.createdByName || found?.createdByEmail || adminUserFilter;
  }, [leads, adminUserFilter]);

  // CRUD Handlers
  const handleOpenAdd = () => {
    setEditingLead(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (lead: Lead) => {
    setEditingLead(lead);
    setIsFormOpen(true);
  };

  const handleOpenDelete = (lead: Lead) => {
    setDeletingLead(lead);
    setIsDeleteOpen(true);
  };

  const handleOpenDetails = (lead: Lead) => {
    setDetailsLead(lead);
    setIsDetailsOpen(true);
  };

  const handleFormSubmit = async (formData: LeadFormData) => {
    setIsSubmitting(true);
    try {
      if (!user?.uid) {
        showNotification('प्रमाणीकरण आवश्यक है (Authentication required)', 'error');
        return;
      }

      const isOwner = isOwnerAdmin || (user?.email && isEmailPrimaryOwner(user.email));
      const effectiveRole: UserRole = isOwner ? 'owner' : (isAdmin ? 'admin' : role);

      if (editingLead) {
        // Update in Firestore with role check
        await updateLead(editingLead.id, formData, { uid: user.uid, role: effectiveRole });
        showNotification(t.notifications.leadUpdated.replace('{name}', formData.customerName));
      } else {
        // Add to Firestore stamping active user UID
        await addLead(formData, {
          uid: user.uid,
          email: user.email || '',
          displayName: userProfile?.displayName || user.displayName || 'User',
          role: effectiveRole,
        });
        showNotification(t.notifications.leadAdded);
      }
      setIsFormOpen(false);
      setEditingLead(null);
    } catch (err: any) {
      console.error(err);
      showNotification((err?.message || 'Error saving lead'), 'error');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async (leadId: string) => {
    setIsDeleting(true);
    try {
      const isOwner = isOwnerAdmin || (user?.email && isEmailPrimaryOwner(user.email));
      const effectiveRole: UserRole = isOwner ? 'owner' : (isAdmin ? 'admin' : role);
      await deleteLead(leadId, { uid: user?.uid, email: user?.email, role: effectiveRole });
      showNotification(t.notifications.leadDeleted);
      setIsDeleteOpen(false);
      setDeletingLead(null);
      if (detailsLead?.id === leadId) {
        setIsDetailsOpen(false);
        setDetailsLead(null);
      }
    } catch (err: any) {
      console.error(err);
      showNotification(err?.message || 'Error deleting lead', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateStatus = async (leadId: string, newStatus: MnpStatus) => {
    try {
      await updateLead(leadId, { status: newStatus }, { uid: user?.uid, role });
      showNotification(`${t.notifications.statusUpdatedPrefix} ${newStatus}`);
    } catch (err: any) {
      console.error(err);
      showNotification('Error updating status', 'error');
    }
  };

  // Export CSV helper
  const exportLeadsToCSV = () => {
    if (filteredLeads.length === 0) {
      showNotification(t.notifications.noLeadsForExport, 'error');
      return;
    }
    const headers = [
      'ID',
      'Customer Name',
      'Mobile',
      'Alternate',
      'Operator',
      'Connection',
      'Vi Plan',
      'Status',
      'UPC Code',
      'UPC Expiry',
      'SIM No',
      'Circle',
      'Address',
      'Remarks',
      'Created By Name',
      'Created By Email',
      'Created At',
    ];
    const rows = filteredLeads.map((l) => [
      l.id,
      `"${l.customerName}"`,
      l.mobileNumber,
      l.alternateNumber || '',
      l.currentOperator,
      l.connectionType,
      `"${l.selectedPlan}"`,
      l.status,
      l.upcCode || '',
      l.upcExpiryDate || '',
      l.simNumber || '',
      `"${l.cityCircle || ''}"`,
      `"${(l.address || '').replace(/"/g, '""')}"`,
      `"${(l.remarks || '').replace(/"/g, '""')}"`,
      `"${l.createdByName || ''}"`,
      `"${l.createdByEmail || ''}"`,
      l.createdAt,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Vi_Sales_MNP_Leads_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification(t.notifications.csvExportSuccess);
  };

  // Auth Loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-red-600 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-red-600 font-extrabold text-2xl shadow-xl animate-bounce mb-3">
          V!
        </div>
        <div className="text-sm font-bold tracking-wide">{t.common.appName} {t.common.loading}</div>
      </div>
    );
  }

  // Not logged in: strictly enforce authentication via AuthScreen
  if (!user) {
    return (
      <>
        <AuthScreen
          onOpenConfig={() => setIsConfigOpen(true)}
          isFirestoreConnected={isFirestoreLive || isFirebaseConfigured()}
        />
        <FirebaseConfigModal
          isOpen={isConfigOpen}
          onClose={() => setIsConfigOpen(false)}
          isFirestoreConnected={isFirestoreLive}
        />
      </>
    );
  }

  // Deactivated Admin state
  if (user && isDeactivated) {
    return <DeactivatedAccountScreen />;
  }

  // Pending Admin Approval state (Owner Admin permission required)
  if (isPendingAdmin) {
    return (
      <>
        <PendingAdminScreen />
        <FirebaseConfigModal
          isOpen={isConfigOpen}
          onClose={() => setIsConfigOpen(false)}
          isFirestoreConnected={isFirestoreLive}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 font-sans pb-24">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl shadow-xl text-xs font-bold flex items-center gap-2 border animate-in fade-in slide-in-from-top-4 duration-200 ${
            notification.type === 'error'
              ? 'bg-red-600 text-white border-red-700'
              : 'bg-emerald-600 text-white border-emerald-700'
          }`}
        >
          {notification.type === 'error' ? (
            <AlertCircle className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Render based on role: CUSTOMER vs ADMIN */}
      {!isAdmin ? (
        <CustomerPortal
          leads={leads}
          onOpenNewRequest={() => setIsCustomerBookingOpen(true)}
          onRefresh={refreshLeads}
        />
      ) : adminViewMode === 'customer_preview' ? (
        <div className="min-h-screen bg-slate-50">
          <div className="sticky top-0 z-50 bg-amber-400 text-amber-950 px-4 py-2 text-xs font-bold flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-600 animate-pulse"></span>
              <span>Customer Portal Preview Mode (Live Customer View)</span>
            </div>
            <button
              type="button"
              onClick={() => setAdminViewMode('admin_panel')}
              className="px-3 py-1 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-extrabold shadow-xs transition-all cursor-pointer"
            >
              Return to Admin Panel ➔
            </button>
          </div>
          <CustomerPortal
            leads={leads}
            onOpenNewRequest={() => setIsCustomerBookingOpen(true)}
            onRefresh={refreshLeads}
          />
        </div>
      ) : adminViewMode === 'admin_panel' ? (
        <AdminPanel
          leads={leads}
          onRefreshLeads={refreshLeads}
          onPreviewCustomerPortal={() => setAdminViewMode('customer_preview')}
        />
      ) : (
        /* Classic Admin Leads/Team/Analytics View fallback */
        <>
          <Header
            onOpenConfig={() => setIsConfigOpen(true)}
            onOpenApkModal={() => setIsApkModalOpen(true)}
            onOpenEditOffer={() => setIsEditOfferOpen(true)}
            onRefresh={refreshLeads}
            isFirestoreConnected={isFirestoreLive}
            totalLeadsCount={leads.length}
            activeAdminTab={adminTab}
            onSelectAdminTab={(tab) => setAdminTab(tab)}
          />

          <div className="bg-white border-b border-gray-200 px-4 py-2 text-xs flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="text-gray-800 font-bold">
                Classic Leads Management
              </span>
            </div>
            <button
              type="button"
              onClick={() => setAdminViewMode('admin_panel')}
              className="text-xs font-bold text-red-600 hover:underline"
            >
              Switch to New Admin Panel ➔
            </button>
          </div>

          {adminTab === 'team' ? (
            <AdminUsersView
              allLeads={leads}
              onFilterByUser={(uid) => {
                setAdminUserFilter(uid);
                setAdminTab('leads');
              }}
              onOpenEditOffer={() => setIsEditOfferOpen(true)}
            />
          ) : adminTab === 'analytics' ? (
            <AdminAnalyticsView
              allLeads={leads}
              allUsers={allUsers}
              onFilterByUser={(uid) => {
                setAdminUserFilter(uid);
                setAdminTab('leads');
              }}
            />
          ) : (
            <main className="max-w-2xl mx-auto">
              <StatsBar
                leads={leads}
                selectedFilter={selectedStatus}
                onSelectFilter={(st) => setSelectedStatus(st)}
                totalNewCustomers={totalNewCustomers}
                totalCustomersJoined={totalCustomersJoined}
                totalCustomers={totalCustomers}
                totalCustomersLoggedIn={totalCustomersLoggedIn}
                totalAppDownloads={totalAppDownloads}
              />

          {/* Admin active filter chip */}
          {adminUserFilter && (
            <div className="mx-4 mt-3 p-2 bg-amber-50 border border-amber-300 rounded-xl text-xs flex items-center justify-between text-amber-900 font-medium">
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-amber-600" />
                <span>
                  {language === 'hi'
                    ? `फ़िल्टर: ${filterUserName || ''} की लीड्स`
                    : `Filtered by: ${filterUserName || ''}`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAdminUserFilter(null)}
                className="p-1 hover:bg-amber-100 rounded-lg text-amber-800 flex items-center gap-0.5 text-[11px]"
              >
                <span>{t.filters.seeAll}</span>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Search and Filters */}
          <FilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedOperator={selectedOperator}
            onOperatorChange={setSelectedOperator}
            selectedStatus={selectedStatus}
            onStatusChange={setSelectedStatus}
          />

          {/* Action strip: Quick export + active filter count */}
          <div className="px-4 py-2 flex items-center justify-between text-xs text-gray-500">
            <div className="font-semibold text-gray-700">
              {filteredLeads.length} {filteredLeads.length === 1 ? t.filters.leadsCountSingle : t.filters.leadsCountPlural}
              {(selectedStatus !== 'ALL' || selectedOperator !== 'ALL' || searchQuery || adminUserFilter) && (
                <button
                  onClick={() => {
                    setSelectedStatus('ALL');
                    setSelectedOperator('ALL');
                    setSearchQuery('');
                    setAdminUserFilter(null);
                  }}
                  className="ml-2 text-red-600 hover:underline text-[11px]"
                >
                  {t.filters.clearFilters}
                </button>
              )}
            </div>

            <button
              onClick={exportLeadsToCSV}
              title="CSV"
              className="flex items-center gap-1 text-[11px] font-semibold text-gray-600 hover:text-red-600 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t.filters.exportCsv}</span>
            </button>
          </div>

          {/* Leads List */}
          <div className="px-3 sm:px-4 space-y-3">
            {loadingLeads ? (
              <div className="py-16 text-center text-gray-500">
                <div className="w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs font-semibold">{t.notifications.loadingLeads}</p>
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 text-center border border-gray-200 shadow-xs my-4">
                <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <SearchX className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-gray-800 text-base">{t.notifications.emptyStateTitle}</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                  {searchQuery || selectedStatus !== 'ALL' || selectedOperator !== 'ALL' || adminUserFilter
                    ? t.notifications.emptyFilteredMsg
                    : t.notifications.emptyAdminMsg}
                </p>
                <button
                  onClick={handleOpenAdd}
                  className="mt-4 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t.notifications.addNewLeadFab}</span>
                </button>
              </div>
            ) : (
              filteredLeads.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  isAdmin={isAdmin}
                  onEdit={handleOpenEdit}
                  onDelete={handleOpenDelete}
                  onViewDetails={handleOpenDetails}
                />
              ))
            )}
          </div>
        </main>
          )}
        </>
      )}

      {/* Floating Action Button (FAB) for Admin Quick Add */}
      {isAdmin && adminTab === 'leads' && (
        <div className="fixed bottom-5 right-5 sm:right-10 z-40">
          <button
            onClick={handleOpenAdd}
            className="px-5 py-3.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-full font-extrabold text-sm shadow-2xl flex items-center gap-2 border-2 border-white transition-all transform hover:shadow-red-500/40"
            title={t.notifications.addNewLeadFab}
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>{t.notifications.addNewLeadFab}</span>
          </button>
        </div>
      )}

      {/* Modals */}
      <LeadFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        initialLead={editingLead}
        isSubmitting={isSubmitting}
      />

      <LeadDetailsModal
        lead={detailsLead}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        onEdit={handleOpenEdit}
        onDelete={handleOpenDelete}
        onUpdateStatus={handleUpdateStatus}
      />

      <DeleteConfirmModal
        lead={deletingLead}
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />

      <FirebaseConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        isFirestoreConnected={isFirestoreLive}
      />

      <ApkDownloadModal
        isOpen={isApkModalOpen}
        onClose={() => setIsApkModalOpen(false)}
      />

      {/* Customer Booking Form Modal with Admin-controlled offer */}
      <CustomerBookingModal
        isOpen={isCustomerBookingOpen}
        onClose={() => setIsCustomerBookingOpen(false)}
        onSubmit={async (formData) => {
          await handleFormSubmit(formData);
        }}
        isSubmitting={isSubmitting}
      />

      {/* Admin Edit Offer Modal (Admin only) */}
      <EditOfferModal
        isOpen={isEditOfferOpen}
        onClose={() => setIsEditOfferOpen(false)}
        onOfferUpdated={(updatedOffer) => {
          showNotification(
            language === 'hi'
              ? `प्रमोशनल ऑफर "${updatedOffer.heading}" अपडेट हो गया!`
              : `Promotional offer "${updatedOffer.heading}" updated!`,
            'success'
          );
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <MainAppContent />
      </AuthProvider>
    </LanguageProvider>
  );
}
