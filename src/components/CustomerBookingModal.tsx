import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Sparkles, 
  MapPin, 
  Lock, 
  CheckCircle2, 
  User, 
  Phone, 
  Radio, 
  ShieldCheck, 
  Send,
  Flame,
  Info
} from 'lucide-react';
import { CurrentOperator, LeadFormData, PromotionalOffer, CustomerLocation, PortalConfig } from '../types';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { subscribeToPortalConfig, DEFAULT_PORTAL_CONFIG } from '../services/portalConfigService';
import { DEFAULT_PROMOTIONAL_OFFER, subscribeToPromotionalOffer } from '../services/offerService';
import { 
  getAvailableStates, 
  getAvailableDistricts, 
  getAvailableTalukas, 
  getAvailableVillages 
} from '../services/territoryService';

interface CustomerBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: LeadFormData) => Promise<void>;
  isSubmitting: boolean;
}

const OPERATOR_OPTIONS: { id: CurrentOperator; label: string; color: string }[] = [
  { id: 'Airtel', label: 'Airtel', color: 'border-red-400 text-red-700 bg-red-50' },
  { id: 'Jio', label: 'Jio', color: 'border-blue-400 text-blue-700 bg-blue-50' },
  { id: 'BSNL', label: 'BSNL', color: 'border-emerald-400 text-emerald-700 bg-emerald-50' },
  { id: 'Other', label: 'Other / इतर', color: 'border-slate-400 text-slate-700 bg-slate-50' },
];

export const CustomerBookingModal: React.FC<CustomerBookingModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}) => {
  const { user, userProfile } = useAuth();
  const { language } = useLanguage();
  const isHindi = language === 'hi';

  const [customerName, setCustomerName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [currentOperator, setCurrentOperator] = useState<CurrentOperator>('Airtel');
  const [localLandmark, setLocalLandmark] = useState('');
  const [validationError, setValidationError] = useState('');
  const [offer, setOffer] = useState<PromotionalOffer>(DEFAULT_PROMOTIONAL_OFFER);
  const [portalConfig, setPortalConfig] = useState<PortalConfig>(DEFAULT_PORTAL_CONFIG);

  // Village-wise & City-wise Territory Selection State
  const [selectedState, setSelectedState] = useState('Maharashtra');
  const [selectedDistrict, setSelectedDistrict] = useState('Buldhana');
  const [selectedTaluka, setSelectedTaluka] = useState('Mehkar');
  const [selectedVillage, setSelectedVillage] = useState('Mehkar City');
  const [customVillage, setCustomVillage] = useState('');
  const [pincode, setPincode] = useState('443301');

  // Dynamic cascading option lists
  const availableStates = useMemo(() => getAvailableStates(), []);
  const availableDistricts = useMemo(() => getAvailableDistricts(selectedState), [selectedState]);
  const availableTalukas = useMemo(() => getAvailableTalukas(selectedState, selectedDistrict), [selectedState, selectedDistrict]);
  const availableVillages = useMemo(() => getAvailableVillages(selectedState, selectedDistrict, selectedTaluka), [selectedState, selectedDistrict, selectedTaluka]);

  // Keep cascade in sync when selections change
  const handleStateChange = (newState: string) => {
    setSelectedState(newState);
    const districts = getAvailableDistricts(newState);
    const newDistrict = districts[0] || '';
    setSelectedDistrict(newDistrict);
    const talukas = getAvailableTalukas(newState, newDistrict);
    const newTaluka = talukas[0] || '';
    setSelectedTaluka(newTaluka);
    const villages = getAvailableVillages(newState, newDistrict, newTaluka);
    setSelectedVillage(villages[0] || 'City Center');
    setCustomVillage('');
  };

  const handleDistrictChange = (newDistrict: string) => {
    setSelectedDistrict(newDistrict);
    const talukas = getAvailableTalukas(selectedState, newDistrict);
    const newTaluka = talukas[0] || '';
    setSelectedTaluka(newTaluka);
    const villages = getAvailableVillages(selectedState, newDistrict, newTaluka);
    setSelectedVillage(villages[0] || 'City Center');
    setCustomVillage('');
  };

  const handleTalukaChange = (newTaluka: string) => {
    setSelectedTaluka(newTaluka);
    const villages = getAvailableVillages(selectedState, selectedDistrict, newTaluka);
    setSelectedVillage(villages[0] || 'City Center');
    setCustomVillage('');
  };
  
  // Location capture state
  const [customerLocation, setCustomerLocation] = useState<CustomerLocation | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatusMsg, setLocationStatusMsg] = useState('');

  // Subscribe to real-time Admin-controlled offer & portal settings
  useEffect(() => {
    const unsubPortal = subscribeToPortalConfig((liveConfig) => {
      setPortalConfig(liveConfig);
      if (liveConfig.offers && liveConfig.offers.length > 0) {
        const primary = liveConfig.offers.find(o => o.enabled) || liveConfig.offers[0];
        setOffer({
          heading: primary.heading,
          badge: primary.badge,
          items: primary.items,
          disclaimer: primary.disclaimer,
          updatedAt: liveConfig.updatedAt
        });
      }
    });
    const unsubPromo = subscribeToPromotionalOffer((livePromo) => {
      if (livePromo && livePromo.heading) {
        setOffer((prev) => {
          const prevTime = prev.updatedAt ? new Date(prev.updatedAt).getTime() : 0;
          const nextTime = livePromo.updatedAt ? new Date(livePromo.updatedAt).getTime() : 0;
          return nextTime >= prevTime ? livePromo : prev;
        });
      }
    });
    return () => {
      unsubPortal();
      unsubPromo();
    };
  }, []);

  // Request GPS location upon explicit customer button press
  const handleCaptureLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatusMsg(isHindi ? 'ब्राउज़र में GPS सपोर्ट उपलब्ध नहीं है।' : 'Geolocation not supported by browser.');
      return;
    }

    setIsLocating(true);
    setLocationStatusMsg(isHindi ? 'GPS लोकेशन खोजी जा रही है...' : 'Detecting your GPS location...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: CustomerLocation = {
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
          accuracy: Math.round(pos.coords.accuracy),
          sharedAt: new Date().toISOString(),
          address: localLandmark.trim() || 'Customer Doorstep (Mehkar)'
        };
        setCustomerLocation(coords);
        setIsLocating(false);
        setLocationStatusMsg(
          isHindi 
            ? `✓ लोकेशन सफलता से जोड़ी गई (सटीकता ±${coords.accuracy}m)` 
            : `✓ Location captured successfully (±${coords.accuracy}m accuracy)`
        );
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation error:', err);
        setLocationStatusMsg(
          isHindi 
            ? 'लोकेशन अनुमति नहीं मिली। आप नीचे लैंडमार्क दर्ज कर सकते हैं।' 
            : 'Location permission denied or unavailable. You can specify landmark below.'
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 10000
      }
    );
  };

  // Pre-fill user profile if available
  useEffect(() => {
    if (isOpen) {
      if (userProfile?.displayName && !userProfile.displayName.startsWith('+') && userProfile.displayName !== 'Customer') {
        setCustomerName(userProfile.displayName);
      } else if (!customerName) {
        setCustomerName('');
      }

      const rawPhone = userProfile?.phone || userProfile?.phoneNumber || user?.phoneNumber || '';
      const digits = rawPhone.replace(/\D/g, '').slice(-10);
      if (digits.length === 10 && !mobileNumber) {
        setMobileNumber(digits);
      }
      setValidationError('');
    }
  }, [isOpen, userProfile, user]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    const trimmedName = customerName.trim();
    if (!trimmedName) {
      setValidationError(isHindi ? 'कृपया अपना पूरा नाम दर्ज करें।' : 'Please enter customer name.');
      return;
    }

    const cleanPhone = mobileNumber.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setValidationError(isHindi ? 'कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें।' : 'Please enter a valid 10-digit mobile number.');
      return;
    }

    const finalVillage = (selectedVillage === 'OTHER' ? customVillage.trim() : selectedVillage) || 'Village Area';
    if (selectedVillage === 'OTHER' && !customVillage.trim()) {
      setValidationError(isHindi ? 'कृपया अपने गाँव / क्षेत्र का नाम दर्ज करें।' : 'Please enter your village / area name.');
      return;
    }

    const formattedAddress = localLandmark.trim()
      ? `${localLandmark.trim()}, ${finalVillage}, ${selectedTaluka}, ${selectedDistrict}, ${selectedState}${pincode ? ` - ${pincode}` : ''}`
      : `${finalVillage}, ${selectedTaluka}, ${selectedDistrict}, ${selectedState}${pincode ? ` - ${pincode}` : ''}`;

    const leadData: LeadFormData = {
      customerName: trimmedName,
      mobileNumber: cleanPhone,
      currentOperator,
      connectionType: 'Prepaid',
      selectedPlan: offer.items[2] || '₹398 KA RECHARGE FREE FREE',
      leadType: 'Porting (MNP)',
      bookingStatus: 'Lead Received',
      bookingCount: 1,
      status: 'New',
      state: selectedState,
      district: selectedDistrict,
      taluka: selectedTaluka,
      village: finalVillage,
      cityCircle: selectedState === 'Maharashtra' ? 'Maharashtra & Goa' : selectedState,
      address: formattedAddress,
      customerAddress: formattedAddress,
      pincode: pincode.trim() || '443301',
      remarks: `Customer booked via promotional offer: ${offer.heading || 'VI 5G READY'}. Area: ${finalVillage}, ${selectedTaluka}, ${selectedDistrict}. Operator: ${currentOperator}${customerLocation ? ` [GPS Shared: ${customerLocation.latitude}, ${customerLocation.longitude}]` : ''}`,
      ...(customerLocation ? { locationCoordinates: customerLocation } : {}),
      customerVerificationStatus: 'Pending',
      isCustomerVerified: false,
    };

    try {
      await onSubmit(leadData);
      onClose();
    } catch (err: any) {
      setValidationError(err?.message || (isHindi ? 'अनुरोध सबमिट करने में विफल। कृपया पुनः प्रयास करें।' : 'Failed to submit booking. Please try again.'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[94vh] overflow-y-auto shadow-2xl flex flex-col animate-in fade-in slide-in-from-bottom-5 duration-200 border border-red-200">
        
        {/* Sticky Header with Red Theme */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-red-600 via-red-700 to-red-600 text-white p-4 sm:p-5 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white text-red-600 font-black text-xl flex items-center justify-center shadow-xs border-2 border-amber-300 shrink-0 overflow-hidden">
              {portalConfig.logo?.imageUrl ? (
                <img src={portalConfig.logo.imageUrl} alt={portalConfig.logo.text} className="w-8 h-8 object-contain" />
              ) : (
                <span>{portalConfig.logo?.symbol || 'V!'}</span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="font-black text-base sm:text-lg tracking-tight uppercase">
                  {offer.heading || 'VI 5G READY MEHKAR'}
                </h2>
              </div>
              <p className="text-[11px] text-amber-200 font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-300 shrink-0" />
                <span>{isHindi ? 'डोरस्टेप सिम पोर्टिंग बुकिंग फॉर्म' : 'Doorstep SIM Porting Booking Form'}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-5 space-y-5 text-xs">
          
          {/* ======================================================== */}
          {/* ADMIN-CONTROLLED PROMOTIONAL OFFER BOX (CUSTOMER VIEW ONLY) */}
          {/* ======================================================== */}
          <div className="bg-gradient-to-br from-red-50 via-amber-50/40 to-red-50/60 rounded-2xl p-4 border-2 border-red-200/90 shadow-xs relative overflow-hidden space-y-3">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600 text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
                <Flame className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                <span>{offer.badge || 'PROMOTIONAL OFFER'}</span>
              </div>
              <span className="text-[10px] font-bold text-red-700 bg-amber-200/80 px-2 py-0.5 rounded-md border border-amber-300">
                Mehkar Special
              </span>
            </div>

            {/* Offer Big Heading */}
            <div className="text-center py-1 border-b border-red-200/60">
              <h3 className="text-xl sm:text-2xl font-black text-red-700 tracking-tight">
                {offer.heading || 'VI 5G READY MEHKAR'}
              </h3>
            </div>

            {/* Offer Items List - Displayed cleanly */}
            <div className="grid grid-cols-1 gap-2 pt-1">
              {offer.items.map((item, idx) => {
                const isHighlight = item.includes('FREE') || item.includes('₹398') || item.includes('UNLIMITED');
                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                      isHighlight
                        ? 'bg-white text-red-700 border-red-200 shadow-xs'
                        : 'bg-white/80 text-slate-800 border-red-100'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="leading-snug">{item}</span>
                  </div>
                );
              })}
            </div>

            {/* Promotional Note Disclaimer */}
            <div className="text-[10px] text-slate-500 bg-white/90 p-2.5 rounded-xl border border-red-100 flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">
                {offer.disclaimer || 'Admin-configured promotional information (Doorstep MNP Mehkar). Terms and KYC verification apply.'}
              </span>
            </div>
          </div>

          {/* Error Message */}
          {validationError && (
            <div className="p-3 bg-red-50 border border-red-300 text-red-700 rounded-xl font-medium">
              {validationError}
            </div>
          )}

          {/* ======================================================== */}
          {/* CUSTOMER INPUT FORM (NAME, MOBILE, CURRENT OPERATOR)     */}
          {/* ======================================================== */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Field 1: Customer Name */}
            <div>
              <label className="block font-bold text-gray-800 mb-1">
                1. {isHindi ? 'ग्राहक का नाम' : 'Customer Name'} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder={isHindi ? 'उदा. राहुल रमेश देशमुख' : 'e.g. Rahul Deshmukh'}
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none font-medium text-slate-900"
                />
              </div>
            </div>

            {/* Field 2: Mobile Number */}
            <div>
              <label className="block font-bold text-gray-800 mb-1">
                2. {isHindi ? 'मोबाइल नंबर (पोर्ट करने वाला)' : 'Mobile Number'} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-500 font-bold text-xs">+91</span>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="9876543210"
                  className="w-full pl-11 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none font-mono text-slate-900 font-bold"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {isHindi ? '10 अंकों का नंबर दर्ज करें जिस पर आप Vi का सिम चाहते हैं।' : 'Enter 10-digit number to be ported to Vi.'}
              </p>
            </div>

            {/* Field 3: Current SIM / Operator (Airtel, Jio, BSNL, Other) */}
            <div>
              <label className="block font-bold text-gray-800 mb-1.5">
                3. {isHindi ? 'वर्तमान सिम / ऑपरेटर' : 'Current SIM / Operator'} <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {OPERATOR_OPTIONS.map((op) => {
                  const isSelected = currentOperator === op.id;
                  return (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() => setCurrentOperator(op.id)}
                      className={`p-2.5 rounded-xl border-2 text-xs font-bold text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'border-red-600 bg-red-600 text-white shadow-sm ring-2 ring-red-300'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {op.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ======================================================== */}
            {/* 4. VILLAGE & CITY AREA SELECTION DROPDOWNS               */}
            {/* Cascading State -> District -> Taluka -> Village         */}
            {/* ======================================================== */}
            <div className="bg-slate-50 rounded-2xl p-3.5 border-2 border-red-200/90 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-900 flex items-center gap-1.5 text-xs">
                  <MapPin className="w-4 h-4 text-red-600 shrink-0" />
                  <span>4. {isHindi ? 'डोरस्टेप सिम डिलीवरी क्षेत्र (गाँव / शहर)' : 'Doorstep SIM Delivery Area'}</span>
                  <span className="text-red-500">*</span>
                </span>
                <span className="text-[10px] font-black bg-red-100 text-red-700 px-2 py-0.5 rounded-full border border-red-200 uppercase">
                  {isHindi ? 'गाँव-वार सेवा' : 'Village-Wise'}
                </span>
              </div>

              {/* Grid of cascading dropdowns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Dropdown 1: State */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-1">
                    {isHindi ? 'राज्य (State)' : 'State'} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedState}
                    onChange={(e) => handleStateChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-red-500 focus:outline-none"
                  >
                    {availableStates.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Dropdown 2: District */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-1">
                    {isHindi ? 'ज़िला (District)' : 'District'} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedDistrict}
                    onChange={(e) => handleDistrictChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-red-500 focus:outline-none"
                  >
                    {availableDistricts.map((dist) => (
                      <option key={dist} value={dist}>
                        {dist}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Dropdown 3: Taluka / City */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-1">
                    {isHindi ? 'तहसील / शहर (Taluka / City)' : 'Taluka / City'} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedTaluka}
                    onChange={(e) => handleTalukaChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-red-500 focus:outline-none"
                  >
                    {availableTalukas.map((tal) => (
                      <option key={tal} value={tal}>
                        {tal}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Dropdown 4: Village / Area */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-1">
                    {isHindi ? 'गाँव / क्षेत्र (Village / Area)' : 'Village / Area'} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedVillage}
                    onChange={(e) => setSelectedVillage(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-red-500 focus:outline-none"
                  >
                    {availableVillages.map((vil) => (
                      <option key={vil} value={vil}>
                        {vil}
                      </option>
                    ))}
                    <option value="OTHER">
                      {isHindi ? '➕ अन्य गाँव / कस्टम क्षेत्र' : '➕ Other Village / Custom Area'}
                    </option>
                  </select>
                </div>
              </div>

              {/* If "OTHER" village selected: show custom village text field */}
              {selectedVillage === 'OTHER' && (
                <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-300 animate-in fade-in">
                  <label className="block text-[10px] font-bold text-amber-900 mb-1">
                    {isHindi ? 'अपने गाँव / क्षेत्र का नाम लिखें:' : 'Enter your Village / Area Name:'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customVillage}
                    onChange={(e) => setCustomVillage(e.target.value)}
                    placeholder={isHindi ? 'उदा. सावित्री नगर, सोनटी, उमरा' : 'e.g. Sonati, Umra, Savitri Nagar'}
                    className="w-full px-3 py-2 text-xs bg-white border border-amber-400 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
              )}

              {/* Selected Area Confirmation Badge */}
              <div className="bg-white p-2.5 rounded-xl border border-red-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-bold">
                    {isHindi ? 'सेवा क्षेत्र:' : 'Service Area:'}{' '}
                    <span className="text-red-700">
                      {selectedVillage === 'OTHER' ? (customVillage || 'कस्टम क्षेत्र') : selectedVillage}, {selectedTaluka}, {selectedDistrict}
                    </span>
                  </span>
                </div>
                <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  {isHindi ? '✓ बुकिंग इसी गाँव के Admin को मिलेगी' : '✓ Routed to Local Admin'}
                </span>
              </div>

              {/* House / Street / Landmark */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                    {isHindi ? 'घर क्र. / गली / लैंडमार्क (वैकल्पिक)' : 'House / Street / Landmark (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={localLandmark}
                    onChange={(e) => setLocalLandmark(e.target.value)}
                    placeholder={isHindi ? 'उदा. बस स्टैंड के पास, मुख्य चौक' : 'e.g. Near Bus Stand, Main Chowk'}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                    {isHindi ? 'पिन कोड (PIN Code)' : 'PIN Code'}
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                    placeholder="443301"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-mono font-bold focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Live GPS Location Capture Block (Secure & Opt-in) */}
              <div className="pt-2 border-t border-slate-200/80">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-red-600" />
                    <span className="text-[11px] font-bold text-slate-800">
                      {isHindi ? 'डोरस्टेप डिलीवरी हेतु लाइव लोकेशन (वैकल्पिक)' : 'Live GPS Location for Delivery (Optional)'}
                    </span>
                  </div>
                  {customerLocation && (
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      {isHindi ? 'सत्यापित' : 'Captured'}
                    </span>
                  )}
                </div>

                {!customerLocation ? (
                  <button
                    type="button"
                    onClick={handleCaptureLocation}
                    disabled={isLocating}
                    className="w-full py-2.5 px-3 rounded-xl border border-dashed border-red-300 bg-red-50/70 hover:bg-red-100/70 text-red-700 text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
                  >
                    <MapPin className={`w-4 h-4 ${isLocating ? 'animate-bounce' : ''}`} />
                    <span>
                      {isLocating 
                        ? (isHindi ? 'लोकेशन खोजी जा रही है...' : 'Detecting GPS Location...') 
                        : (isHindi ? '📍 वर्तमान GPS लोकेशन शेयर करें' : '📍 Share Current GPS Location')}
                    </span>
                  </button>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-xs text-emerald-900 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1 text-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        {isHindi ? 'GPS लोकेशन शेयर की गई' : 'GPS Location Attached'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomerLocation(null);
                          setLocationStatusMsg('');
                        }}
                        className="text-[10px] text-red-600 hover:underline font-bold"
                      >
                        {isHindi ? 'हटाएं' : 'Remove'}
                      </button>
                    </div>
                    <p className="text-[11px] text-emerald-700 font-mono">
                      Lat: {customerLocation.latitude}, Long: {customerLocation.longitude} (±{customerLocation.accuracy}m)
                    </p>
                    <p className="text-[10px] text-emerald-600">
                      {isHindi 
                        ? 'डिलीवरी एजेंट इस लोकेशन पर सीधे Google Maps द्वारा पहुंच सकेगा।' 
                        : 'Delivery agent can navigate directly to this point using Google Maps.'}
                    </p>
                  </div>
                )}

                {locationStatusMsg && !customerLocation && (
                  <p className="text-[10px] text-slate-500 mt-1 pl-1">{locationStatusMsg}</p>
                )}
              </div>
            </div>

            {/* Form Actions */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                {isHindi ? 'रद्द करें' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 rounded-xl font-extrabold text-white bg-red-600 hover:bg-red-700 active:scale-95 shadow-md flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>
                  {isSubmitting 
                    ? (isHindi ? 'बुकिंग दर्ज हो रही है...' : 'Submitting Booking...') 
                    : (isHindi ? 'पोर्टिंग अनुरोध दर्ज करें' : 'Submit Porting Request')
                  }
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
