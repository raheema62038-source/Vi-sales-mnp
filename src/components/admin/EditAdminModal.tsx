import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Mail,
  Lock,
  User,
  Phone,
  MapPin,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Edit3
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { updateAdminUserByOwner } from '../../services/userService';
import { UserProfile } from '../../types';
import {
  getAvailableStates,
  getAvailableDistricts,
  getAvailableTalukas,
  getAvailableVillages,
} from '../../services/territoryService';

interface EditAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetAdmin: UserProfile | null;
  onAdminUpdated: (updatedAdmin: UserProfile) => void;
}

const VI_CIRCLES = [
  'National HQ',
  'Delhi NCR',
  'Mumbai',
  'Maharashtra & Goa',
  'Gujarat',
  'UP East',
  'UP West',
  'Rajasthan',
  'Punjab & Haryana',
  'Madhya Pradesh & CG',
  'Bihar & Jharkhand',
  'West Bengal & Kolkata',
  'Assam & North East',
  'Odisha',
  'Karnataka',
  'Tamil Nadu & Chennai',
  'Kerala',
  'Andhra Pradesh & Telangana'
];

export const EditAdminModal: React.FC<EditAdminModalProps> = ({
  isOpen,
  onClose,
  targetAdmin,
  onAdminUpdated,
}) => {
  const { user, isOwnerAdmin } = useAuth();
  const { language } = useLanguage();
  const isHindi = language === 'hi';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [circle, setCircle] = useState('National HQ');
  const [status, setStatus] = useState<'approved' | 'deactivated'>('approved');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Territory state
  const [assignedState, setAssignedState] = useState('Maharashtra');
  const [assignedDistrict, setAssignedDistrict] = useState('Buldhana');
  const [assignedTaluka, setAssignedTaluka] = useState('Mehkar');
  const [assignedVillage, setAssignedVillage] = useState('Mehkar City');
  const [customVillage, setCustomVillage] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (targetAdmin) {
      setName(targetAdmin.displayName || (targetAdmin as any).name || '');
      setEmail(targetAdmin.email || '');
      setPhone((targetAdmin.phone || targetAdmin.phoneNumber || '').replace(/\D/g, '').slice(-10));
      setCircle(targetAdmin.assignedCircle || 'National HQ');
      setStatus(targetAdmin.isDeactivated || targetAdmin.status === 'deactivated' ? 'deactivated' : 'approved');
      setNewPassword('');

      const st = targetAdmin.assignedState || 'Maharashtra';
      setAssignedState(st);
      const dist = targetAdmin.assignedDistrict || 'Buldhana';
      setAssignedDistrict(dist);
      const tal = targetAdmin.assignedTaluka || 'Mehkar';
      setAssignedTaluka(tal);
      const vil = targetAdmin.assignedVillage || 'Mehkar City';
      setAssignedVillage(vil);
      setCustomVillage('');
      setError(null);
      setSuccess(null);
    }
  }, [targetAdmin, isOpen]);

  const availableStates = getAvailableStates();
  const availableDistricts = getAvailableDistricts(assignedState);
  const availableTalukas = getAvailableTalukas(assignedState, assignedDistrict);
  const availableVillages = getAvailableVillages(assignedState, assignedDistrict, assignedTaluka);

  const handleStateChange = (st: string) => {
    setAssignedState(st);
    const dList = getAvailableDistricts(st);
    const d = dList[0] || '';
    setAssignedDistrict(d);
    const tList = getAvailableTalukas(st, d);
    const t = tList[0] || '';
    setAssignedTaluka(t);
    const vList = getAvailableVillages(st, d, t);
    setAssignedVillage(vList[0] || '');
    setCustomVillage('');
  };

  const handleDistrictChange = (d: string) => {
    setAssignedDistrict(d);
    const tList = getAvailableTalukas(assignedState, d);
    const t = tList[0] || '';
    setAssignedTaluka(t);
    const vList = getAvailableVillages(assignedState, d, t);
    setAssignedVillage(vList[0] || '');
    setCustomVillage('');
  };

  const handleTalukaChange = (t: string) => {
    setAssignedTaluka(t);
    const vList = getAvailableVillages(assignedState, assignedDistrict, t);
    setAssignedVillage(vList[0] || '');
    setCustomVillage('');
  };

  if (!isOpen || !targetAdmin) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!isOwnerAdmin) {
      setError(isHindi ? 'सुरक्षा नियम: केवल Primary Owner Admin ही Admin डेटा बदल सकते हैं।' : 'Only Primary Owner can edit admin details.');
      return;
    }

    const cleanName = name.trim();
    const cleanPhone = phone.trim().replace(/\D/g, '').slice(-10);
    const finalVillage = assignedVillage === 'OTHER' ? customVillage.trim() : assignedVillage;

    if (!cleanName) {
      setError(isHindi ? 'कृपया Admin का नाम दर्ज करें।' : 'Please enter admin name.');
      return;
    }
    if (cleanPhone && cleanPhone.length !== 10) {
      setError(isHindi ? 'कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें।' : 'Please enter a valid 10-digit mobile number.');
      return;
    }
    if (newPassword && newPassword.trim().length < 6) {
      setError(isHindi ? 'नया पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।' : 'New password must be at least 6 characters.');
      return;
    }
    if (!finalVillage) {
      setError(isHindi ? 'कृपया Admin के लिए गाँव (Village) निर्धारित करें।' : 'Please assign a village.');
      return;
    }

    setLoading(true);
    try {
      const updated = await updateAdminUserByOwner(
        {
          uid: user?.uid || '',
          email: user?.email || '',
          role: (user as any)?.role || 'owner',
          isPrimaryOwner: true,
          isOwner: true,
        } as any,
        targetAdmin.uid,
        {
          displayName: cleanName,
          phone: cleanPhone,
          assignedCircle: circle,
          assignedState,
          assignedDistrict,
          assignedTaluka,
          assignedVillage: finalVillage,
          status,
          newPassword: newPassword ? newPassword.trim() : undefined,
        }
      );

      setSuccess(isHindi ? '✓ एडमिन जानकारी सफलतापूर्वक अपडेट हो गई!' : '✓ Admin details updated successfully!');
      onAdminUpdated(updated);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err?.message || (isHindi ? 'एडमिन अपडेट करने में त्रुटि हुई।' : 'Error updating admin.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        id="edit-admin-modal-card"
        className="bg-white text-gray-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-amber-200 max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-red-700 via-red-800 to-amber-700 p-5 text-white flex items-start justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
              <Edit3 className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-black tracking-tight">
                  {isHindi ? 'Admin जानकारी एडिट करें' : 'Edit Admin Details'}
                </h3>
                <span className="text-[10px] font-extrabold bg-amber-400 text-red-950 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Owner Control
                </span>
              </div>
              <p className="text-xs text-red-100 mt-0.5 font-mono">
                ID: {email || targetAdmin.uid}
              </p>
            </div>
          </div>
          <button
            id="close-edit-admin-modal-btn"
            type="button"
            onClick={onClose}
            disabled={loading}
            className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2 text-xs text-red-700 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2 text-xs text-emerald-700 font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          <form id="edit-admin-form" onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Admin Name */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                {isHindi ? 'Admin का पूरा नाम' : 'Admin Full Name'} *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="उदा. राजेश शर्मा"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
                />
              </div>
            </div>

            {/* Admin Email (Login ID) - Display Only */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                {isHindi ? 'अधिकृत लॉगिन ईमेल / ID (सुरक्षित)' : 'Authorized Login Email / ID (Secure)'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  readOnly
                  disabled
                  value={email}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-600 font-mono font-medium cursor-not-allowed"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                {isHindi ? 'लॉगिन ईमेल Firebase Auth सुरक्षा से जुड़ा है और बदला नहीं जा सकता।' : 'Login email is linked to Firebase Auth UID.'}
              </p>
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                {isHindi ? 'Admin मोबाइल नंबर' : 'Admin Mobile Number'}
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="tel"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="9876543210"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 font-mono font-medium"
                />
              </div>
            </div>

            {/* Status (Active / Deactivated) */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                {isHindi ? 'खाता स्थिति (Status)' : 'Account Status'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setStatus('approved')}
                  className={`py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    status === 'approved'
                      ? 'bg-emerald-500 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isHindi ? 'सक्रिय (Active)' : 'Active / Approved'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('deactivated')}
                  className={`py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    status === 'deactivated'
                      ? 'bg-red-600 text-white border-red-700 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{isHindi ? 'निष्क्रिय (Deactivated)' : 'Deactivated'}</span>
                </button>
              </div>
            </div>

            {/* Optional Password Reset */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
              <label className="block text-slate-800 font-bold">
                {isHindi ? 'पासवर्ड बदलें / रीसेट करें (वैकल्पिक)' : 'Reset Admin Password (Optional)'}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={isHindi ? 'नया पासवर्ड (खाली छोड़ें यदि नहीं बदलना)' : 'New password (leave blank to keep current)'}
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Territory Assignment (State, District, Taluka, Village) */}
            <div className="bg-purple-50/60 p-4 rounded-2xl border border-purple-200 space-y-3">
              <div className="flex items-center gap-2 text-purple-900 font-black">
                <MapPin className="w-4 h-4 text-purple-700" />
                <span>{isHindi ? 'आवंटित गाँव एवं कार्यक्षेत्र' : 'Assigned Village & Territory'}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-0.5">
                    {isHindi ? 'राज्य (State)' : 'State'}
                  </label>
                  <select
                    value={assignedState}
                    onChange={(e) => handleStateChange(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-200 bg-white font-medium"
                  >
                    {availableStates.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-0.5">
                    {isHindi ? 'ज़िला (District)' : 'District'}
                  </label>
                  <select
                    value={assignedDistrict}
                    onChange={(e) => handleDistrictChange(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-200 bg-white font-medium"
                  >
                    {availableDistricts.map((dist) => (
                      <option key={dist} value={dist}>{dist}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-0.5">
                    {isHindi ? 'तहसील/शहर (Taluka)' : 'Taluka / City'}
                  </label>
                  <select
                    value={assignedTaluka}
                    onChange={(e) => handleTalukaChange(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-200 bg-white font-medium"
                  >
                    {availableTalukas.map((tal) => (
                      <option key={tal} value={tal}>{tal}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-0.5">
                    {isHindi ? 'गाँव (Village)' : 'Village'} *
                  </label>
                  <select
                    value={assignedVillage}
                    onChange={(e) => setAssignedVillage(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-200 bg-white font-bold text-purple-900"
                  >
                    {availableVillages.map((vil) => (
                      <option key={vil} value={vil}>🏡 {vil}</option>
                    ))}
                    <option value="OTHER">{isHindi ? '➕ अन्य गाँव (मैन्युअल दर्ज करें)' : '➕ Other Village (Manual)'}</option>
                  </select>
                </div>
              </div>

              {assignedVillage === 'OTHER' && (
                <div>
                  <input
                    type="text"
                    required
                    value={customVillage}
                    onChange={(e) => setCustomVillage(e.target.value)}
                    placeholder={isHindi ? 'गाँव का नाम यहाँ लिखें' : 'Enter custom village name'}
                    className="w-full p-2 rounded-lg border border-purple-300 bg-white font-medium"
                  />
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold transition-all"
              >
                {isHindi ? 'रद्द करें' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black shadow-md flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{isHindi ? 'सहेज रहे हैं...' : 'Saving...'}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isHindi ? 'बदलाव सुरक्षित करें' : 'Save Changes'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
