import React, { useState } from 'react';
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
  Crown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { createAdminUserByOwner } from '../services/userService';
import { UserProfile } from '../types';

interface AddAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdminCreated: (newAdmin: UserProfile) => void;
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

export const AddAdminModal: React.FC<AddAdminModalProps> = ({
  isOpen,
  onClose,
  onAdminCreated,
}) => {
  const { user, isOwnerAdmin } = useAuth();
  const { language } = useLanguage();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [circle, setCircle] = useState('National HQ');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isOwnerAdmin) {
      setError('सुरक्षा नियम: केवल Primary Owner Admin ही नया Admin बना सकते हैं।');
      return;
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanName) {
      setError('कृपया Admin का नाम दर्ज करें।');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('कृपया वैध ईमेल पता दर्ज करें।');
      return;
    }
    if (cleanPassword.length < 6) {
      setError('पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।');
      return;
    }

    setLoading(true);
    try {
      const newAdmin = await createAdminUserByOwner(
        { uid: user?.uid || '', email: user?.email || '' },
        {
          displayName: cleanName,
          email: cleanEmail,
          password: cleanPassword,
          phone: phone.trim(),
          assignedCircle: circle,
        }
      );

      // Reset form
      setName('');
      setEmail('');
      setPassword('');
      setPhone('');
      setCircle('National HQ');
      onAdminCreated(newAdmin);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Admin बनाने में त्रुटि हुई।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        id="add-admin-modal-card"
        className="bg-white text-gray-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-amber-200"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-red-700 via-red-800 to-amber-700 p-5 text-white flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
              <Crown className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-black tracking-tight">
                  {language === 'hi' ? 'नया Admin जोड़ें' : 'Add New Admin'}
                </h3>
                <span className="text-[10px] font-extrabold bg-amber-400 text-red-950 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Owner Only
                </span>
              </div>
              <p className="text-xs text-red-100 mt-0.5">
                {language === 'hi'
                  ? 'केवल Primary Owner ही नया Admin अधिकृत कर सकते हैं'
                  : 'Only Primary Owner can authorize a new Admin'}
              </p>
            </div>
          </div>
          <button
            id="close-add-admin-modal-btn"
            type="button"
            onClick={onClose}
            disabled={loading}
            className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-5 mt-4 p-3 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2 text-xs text-red-700 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          {/* Admin Name */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              {language === 'hi' ? 'Admin का पूरा नाम *' : 'Admin Full Name *'}
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                id="admin-full-name-input"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={language === 'hi' ? 'जैसे: राजेश शर्मा' : 'e.g. Rajesh Sharma'}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
          </div>

          {/* Admin Email */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              {language === 'hi' ? 'Admin ईमेल (Login Email) *' : 'Admin Login Email *'}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                id="admin-email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin.rajesh@vi.com"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
          </div>

          {/* Admin Password */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              {language === 'hi' ? 'Admin पासवर्ड (कम से कम 6 अक्षर) *' : 'Admin Password (min 6 chars) *'}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                id="admin-password-input"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Phone (Optional) */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              {language === 'hi' ? 'मोबाइल नंबर (वैकल्पिक)' : 'Mobile Number (Optional)'}
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                id="admin-phone-input"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="98XXXXXXXX"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
          </div>

          {/* Circle */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              {language === 'hi' ? 'निर्दिष्ट Vi सर्कल (Assigned Circle)' : 'Assigned Circle'}
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <select
                id="admin-circle-select"
                value={circle}
                onChange={(e) => setCircle(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                {VI_CIRCLES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Permissions Notice */}
          <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3 text-[11px] text-amber-900 leading-relaxed">
            <span className="font-bold">नियम एवं अनुमतियाँ:</span> नया Admin केवल Admin Portal एक्सेस करके MNP Leads और Customer Requests प्रबंधित कर सकेगा। इसे नया Admin बनाने या Owner बदलने का कोई अधिकार नहीं होगा।
          </div>

          {/* Modal Actions */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              id="cancel-add-admin-btn"
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-800 rounded-xl hover:bg-gray-100 transition-colors"
            >
              {language === 'hi' ? 'रद्द करें' : 'Cancel'}
            </button>
            <button
              id="submit-create-admin-btn"
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{language === 'hi' ? 'Admin बनाया जा रहा है...' : 'Creating Admin...'}</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>{language === 'hi' ? 'Admin बनाएं' : 'Create Admin'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
