import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  User, 
  Phone, 
  Signal, 
  CreditCard, 
  FileText, 
  MapPin, 
  Calendar,
  KeyRound,
  Sparkles,
  Check,
  Smartphone,
  CalendarCheck,
  Lock,
  ShieldCheck
} from 'lucide-react';
import { 
  Lead, 
  LeadFormData, 
  CurrentOperator, 
  ConnectionType, 
  MnpStatus,
  LeadType,
  BookingStatus
} from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { validateServiceArea, SERVICE_AREA_ERROR } from '../services/leadService';

interface LeadFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: LeadFormData) => Promise<void>;
  initialLead?: Lead | null;
  isSubmitting: boolean;
}

const COMMON_VI_PLANS = [
  'Vi Hero ₹719 (1.5GB/day + Binge All Night + Weekend Rollover)',
  'Vi Super ₹299 (1.5GB/day - 28 Days)',
  'Vi Dhamaka ₹479 (1.5GB/day - 56 Days)',
  'Vi Annual ₹2999 (2GB/day - 365 Days)',
  'Vi Max Postpaid ₹401 (50GB + Unlimited Night)',
  'Vi Max Postpaid ₹501 (90GB + Disney+ Hotstar + Prime)',
  'Vi Corporate CUG Special Plan',
];

const CIRCLES = [
  'Delhi NCR',
  'Mumbai',
  'Maharashtra & Goa',
  'UP East',
  'UP West',
  'Gujarat',
  'Bihar & Jharkhand',
  'Rajasthan',
  'Punjab',
  'Haryana',
  'Madhya Pradesh',
  'Kolkata & West Bengal',
  'Karnataka',
  'Tamil Nadu',
  'Andhra Pradesh & Telangana',
  'Other',
];

const LEAD_TYPES: LeadType[] = [
  'Porting (MNP)',
  'New SIM Connection',
  'Postpaid Migration',
  'Corporate Port',
];

const BOOKING_STATUSES: BookingStatus[] = [
  'Lead Received',
  'Booked',
  'SIM Dispatched',
  'Appointment Scheduled',
  'Completed',
  'Cancelled',
];

export const LeadFormModal: React.FC<LeadFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialLead,
  isSubmitting,
}) => {
  const { t } = useLanguage();
  const { role, userProfile, user } = useAuth();
  const [customerName, setCustomerName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [alternateNumber, setAlternateNumber] = useState('');
  const [leadType, setLeadType] = useState<LeadType>('Porting (MNP)');
  const [bookingStatus, setBookingStatus] = useState<BookingStatus>('Lead Received');
  const [bookingCount, setBookingCount] = useState<number>(1);
  const [currentOperator, setCurrentOperator] = useState<CurrentOperator>('Airtel');
  const [connectionType, setConnectionType] = useState<ConnectionType>('Prepaid');
  const [selectedPlan, setSelectedPlan] = useState(COMMON_VI_PLANS[0]);
  const [customPlan, setCustomPlan] = useState('');
  const [status, setStatus] = useState<MnpStatus>('New');
  const [upcCode, setUpcCode] = useState('');
  const [upcExpiryDate, setUpcExpiryDate] = useState('');
  const [simNumber, setSimNumber] = useState('');
  const [simType, setSimType] = useState<'Physical SIM' | 'eSIM'>('Physical SIM');
  const [state, setState] = useState('Maharashtra');
  const [district, setDistrict] = useState('Buldhana');
  const [taluka, setTaluka] = useState('Mehkar');
  const [cityCircle, setCityCircle] = useState('Maharashtra & Goa');
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('443301');
  const [remarks, setRemarks] = useState('');

  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (initialLead) {
      setCustomerName(initialLead.customerName || '');
      setMobileNumber(initialLead.mobileNumber || '');
      setAlternateNumber(initialLead.alternateNumber || '');
      setLeadType(initialLead.leadType || 'Porting (MNP)');
      setBookingStatus(initialLead.bookingStatus || 'Lead Received');
      setBookingCount(initialLead.bookingCount || 1);
      setCurrentOperator(initialLead.currentOperator || 'Airtel');
      setConnectionType(initialLead.connectionType || 'Prepaid');
      
      if (COMMON_VI_PLANS.includes(initialLead.selectedPlan)) {
        setSelectedPlan(initialLead.selectedPlan);
        setCustomPlan('');
      } else {
        setSelectedPlan('OTHER');
        setCustomPlan(initialLead.selectedPlan || '');
      }

      setStatus(initialLead.status || 'New');
      setUpcCode(initialLead.upcCode || '');
      setUpcExpiryDate(initialLead.upcExpiryDate || '');
      setSimNumber(initialLead.simNumber || '');
      setSimType(initialLead.simType || 'Physical SIM');
      setState(initialLead.state || 'Maharashtra');
      setDistrict(initialLead.district || 'Buldhana');
      setTaluka(initialLead.taluka || 'Mehkar');
      setCityCircle(initialLead.cityCircle || 'Maharashtra & Goa');
      setAddress(initialLead.address || initialLead.customerAddress || '');
      setPincode(initialLead.pincode || '443301');
      setRemarks(initialLead.remarks || '');
    } else {
      // Reset form for fresh lead
      let initialCustomerName = '';
      let initialPhone = '';

      if (role === 'customer') {
        if (userProfile?.displayName && !userProfile.displayName.startsWith('+')) {
          initialCustomerName = userProfile.displayName;
        }
        const rawPhone = userProfile?.phone || userProfile?.phoneNumber || user?.phoneNumber || '';
        const digits = rawPhone.replace(/\D/g, '').slice(-10);
        if (digits.length === 10) {
          initialPhone = digits;
        }
      }

      setCustomerName(initialCustomerName);
      setMobileNumber(initialPhone);
      setAlternateNumber('');
      setLeadType('Porting (MNP)');
      setBookingStatus('Lead Received');
      setBookingCount(1);
      setCurrentOperator('Airtel');
      setConnectionType('Prepaid');
      setSelectedPlan(COMMON_VI_PLANS[0]);
      setCustomPlan('');
      setStatus('New');
      setUpcCode('');
      setUpcExpiryDate('');
      setSimNumber('');
      setSimType('Physical SIM');
      setState('Maharashtra');
      setDistrict('Buldhana');
      setTaluka('Mehkar');
      setCityCircle('Maharashtra & Goa');
      setAddress('');
      setPincode('443301');
      setRemarks('');
    }
    setValidationError('');
  }, [initialLead, isOpen, role, userProfile, user]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!customerName.trim()) {
      setValidationError(t.leadForm.errNameReq);
      return;
    }

    const cleanPhone = mobileNumber.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setValidationError(t.leadForm.errPhoneReq);
      return;
    }

    // Strict Service Area Restriction Validation
    if (!validateServiceArea(state, district, taluka, pincode)) {
      setValidationError(SERVICE_AREA_ERROR);
      return;
    }

    const finalPlan = selectedPlan === 'OTHER' ? (customPlan.trim() || 'Vi Custom Plan') : selectedPlan;

    const data: LeadFormData = {
      customerName: customerName.trim(),
      mobileNumber: cleanPhone,
      alternateNumber: alternateNumber.trim() ? alternateNumber.replace(/\D/g, '') : undefined,
      currentOperator,
      connectionType,
      selectedPlan: finalPlan,
      leadType,
      bookingStatus,
      bookingCount: Number(bookingCount) || 1,
      status,
      upcCode: upcCode.trim().toUpperCase() || undefined,
      upcExpiryDate: upcExpiryDate || undefined,
      simNumber: simNumber.trim() || undefined,
      simType,
      state: 'Maharashtra',
      district: 'Buldhana',
      taluka: 'Mehkar',
      cityCircle: 'Maharashtra & Goa',
      address: address.trim() ? `${address.trim()}, Mehkar, Buldhana, Maharashtra - 443301` : 'Mehkar, Buldhana, Maharashtra - 443301',
      customerAddress: address.trim() ? `${address.trim()}, Mehkar, Buldhana, Maharashtra - 443301` : 'Mehkar, Buldhana, Maharashtra - 443301',
      pincode: '443301',
      remarks: remarks.trim() || undefined,
    };

    try {
      await onSubmit(data);
      onClose();
    } catch (err: any) {
      setValidationError(err?.message || t.leadForm.errFailed);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-xs">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col animate-in fade-in slide-in-from-bottom-5 duration-200">
        
        {/* Modal Top Bar */}
        <div className="sticky top-0 z-10 bg-red-600 text-white p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-bold">
              {initialLead ? '✎' : '+'}
            </span>
            <div>
              <h2 className="font-bold text-base leading-tight">
                {initialLead ? t.leadForm.editTitle : t.leadForm.addTitle}
              </h2>
              <p className="text-[11px] text-red-100">{t.leadForm.subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 text-xs">
          {validationError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl font-medium">
              {validationError}
            </div>
          )}

          {/* Section 1: Customer Details */}
          <div className="space-y-3">
            <h3 className="font-bold text-gray-800 flex items-center gap-1.5 text-xs uppercase tracking-wider text-red-600">
              <User className="w-3.5 h-3.5" />
              {t.leadForm.section1Customer}
            </h3>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                {t.leadForm.customerName} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder={t.leadForm.customerNamePlaceholder}
                className="w-full px-3 py-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  {t.leadForm.mobileNo} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-400 font-semibold">+91</span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="9876543210"
                    className="w-full pl-11 pr-3 py-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  {t.leadForm.alternateNo}
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  value={alternateNumber}
                  onChange={(e) => setAlternateNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder={t.leadForm.alternateNoPlaceholder}
                  className="w-full px-3 py-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Porting & Operator Details */}
          <div className="space-y-3 pt-2 border-t border-gray-100">
            <h3 className="font-bold text-gray-800 flex items-center gap-1.5 text-xs uppercase tracking-wider text-red-600">
              <Signal className="w-3.5 h-3.5" />
              {t.leadForm.section2Porting}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  {t.leadForm.leadType}
                </label>
                <select
                  value={leadType}
                  onChange={(e) => setLeadType(e.target.value as LeadType)}
                  className="w-full px-3 py-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none font-semibold text-gray-800"
                >
                  {LEAD_TYPES.map((lt) => (
                    <option key={lt} value={lt}>{lt}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  {t.leadForm.currentOperator}
                </label>
                <select
                  value={currentOperator}
                  onChange={(e) => setCurrentOperator(e.target.value as CurrentOperator)}
                  className="w-full px-3 py-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                >
                  <option value="Airtel">Airtel</option>
                  <option value="Jio">Jio</option>
                  <option value="BSNL">BSNL</option>
                  <option value="MTNL">MTNL</option>
                  <option value="Other">{t.filters.otherOperator}</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  {t.leadForm.connectionType}
                </label>
                <select
                  value={connectionType}
                  onChange={(e) => setConnectionType(e.target.value as ConnectionType)}
                  className="w-full px-3 py-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                >
                  <option value="Prepaid">{t.leadForm.prepaid}</option>
                  <option value="Postpaid">{t.leadForm.postpaid}</option>
                  <option value="Corporate">{t.leadForm.corporate}</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  {t.leadForm.simType}
                </label>
                <select
                  value={simType}
                  onChange={(e) => setSimType(e.target.value as 'Physical SIM' | 'eSIM')}
                  className="w-full px-3 py-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                >
                  <option value="Physical SIM">Physical SIM</option>
                  <option value="eSIM">eSIM (Digital)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                {t.leadForm.selectedPlan}
              </label>
              <select
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
                className="w-full px-3 py-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
              >
                {COMMON_VI_PLANS.map((plan) => (
                  <option key={plan} value={plan}>{plan}</option>
                ))}
                <option value="OTHER">{t.leadForm.otherPlanOption}</option>
              </select>
            </div>

            {selectedPlan === 'OTHER' && (
              <div>
                <input
                  type="text"
                  value={customPlan}
                  onChange={(e) => setCustomPlan(e.target.value)}
                  placeholder={t.leadForm.customPlanPlaceholder}
                  className="w-full px-3 py-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Section 3: Booking & MNP Status */}
          <div className="space-y-3 pt-2 border-t border-gray-100">
            <h3 className="font-bold text-gray-800 flex items-center gap-1.5 text-xs uppercase tracking-wider text-red-600">
              <CalendarCheck className="w-3.5 h-3.5" />
              {t.leadForm.section3Verification}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  {t.leadForm.bookingStatus}
                </label>
                <select
                  value={bookingStatus}
                  onChange={(e) => setBookingStatus(e.target.value as BookingStatus)}
                  className="w-full px-3 py-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl font-semibold text-gray-800 focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                >
                  {BOOKING_STATUSES.map((bs) => (
                    <option key={bs} value={bs}>{bs}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  {t.leadForm.bookingCount}
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={bookingCount}
                  onChange={(e) => setBookingCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl font-bold focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  {t.leadForm.mnpStatus} <span className="text-red-500">*</span>
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as MnpStatus)}
                  className="w-full px-3 py-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl font-semibold text-gray-800 focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                >
                  <option value="New">{t.filters.statusNew}</option>
                  <option value="UPC Generated">{t.filters.statusUpc}</option>
                  <option value="SIM Allocated">{t.filters.statusSim}</option>
                  <option value="E-KYC Done">{t.filters.statusEkyc}</option>
                  <option value="Ported">{t.filters.statusPorted}</option>
                  <option value="Cancelled">{t.filters.statusCancelled}</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  {t.leadForm.simNo}
                </label>
                <input
                  type="text"
                  value={simNumber}
                  onChange={(e) => setSimNumber(e.target.value)}
                  placeholder={t.leadForm.simNoPlaceholder}
                  className="w-full px-3 py-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  {t.leadForm.upcCode}
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={upcCode}
                  onChange={(e) => setUpcCode(e.target.value.toUpperCase())}
                  placeholder={t.leadForm.upcCodePlaceholder}
                  className="w-full px-3 py-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl font-mono uppercase tracking-wider focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  {t.leadForm.upcExpiry}
                </label>
                <input
                  type="date"
                  value={upcExpiryDate}
                  onChange={(e) => setUpcExpiryDate(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Customer Address & Location */}
          <div className="space-y-3 pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800 flex items-center gap-1.5 text-xs uppercase tracking-wider text-red-600">
                <MapPin className="w-3.5 h-3.5" />
                {t.leadForm.section4Location}
              </h3>
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                <Lock className="w-3 h-3 text-emerald-700" />
                Fixed Service Address
              </span>
            </div>

            {/* Permanent Fixed Service Address Card (Locked) */}
            <div className="p-3.5 bg-gradient-to-br from-red-50 to-amber-50/60 border-2 border-red-200 rounded-2xl text-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="font-extrabold text-red-700 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-red-600 shrink-0" />
                  <span>Doorstep Fixed Service Area</span>
                </div>
                <span className="text-[10px] font-bold bg-red-100 text-red-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> Permanently Fixed
                </span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-red-100 shadow-xs space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">
                    <span className="text-[10px] text-gray-500 font-semibold block uppercase">State / राज्य</span>
                    <span className="font-bold text-gray-900 flex items-center gap-1">
                      Maharashtra
                      <Lock className="w-2.5 h-2.5 text-gray-400 inline" />
                    </span>
                  </div>
                  <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">
                    <span className="text-[10px] text-gray-500 font-semibold block uppercase">District / जिल्हा</span>
                    <span className="font-bold text-gray-900 flex items-center gap-1">
                      Buldhana
                      <Lock className="w-2.5 h-2.5 text-gray-400 inline" />
                    </span>
                  </div>
                  <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">
                    <span className="text-[10px] text-gray-500 font-semibold block uppercase">Taluka / तालुका</span>
                    <span className="font-bold text-gray-900 flex items-center gap-1">
                      Mehkar
                      <Lock className="w-2.5 h-2.5 text-gray-400 inline" />
                    </span>
                  </div>
                  <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">
                    <span className="text-[10px] text-gray-500 font-semibold block uppercase">PIN Code / पिन कोड</span>
                    <span className="font-black text-red-700 font-mono flex items-center gap-1">
                      443301
                      <Lock className="w-2.5 h-2.5 text-gray-400 inline" />
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-700 bg-emerald-50/80 p-2 rounded-lg border border-emerald-200 flex items-start gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Service address is fixed to:</strong> Mehkar Taluka, Buldhana, Maharashtra - 443301. Customer cannot alter, replace, or enter another service area.
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                House / Landmark in Mehkar (घर क्र. / लँडमार्क / गल्ली - Optional)
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="उदा. स्टेशन रोड, शिवाजी नगर (Mehkar Landmark / House No.)"
                className="w-full px-3 py-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none font-medium text-gray-900"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Recorded service address: {address.trim() ? `${address.trim()}, ` : ''}Mehkar, Buldhana, Maharashtra - 443301
              </p>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                {t.leadForm.remarks}
              </label>
              <textarea
                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder={t.leadForm.remarksPlaceholder}
                className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 active:scale-95 shadow-md flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>
                {isSubmitting 
                  ? t.leadForm.saving 
                  : initialLead 
                    ? t.leadForm.updateLeadBtn 
                    : t.leadForm.saveLeadBtn
                }
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
