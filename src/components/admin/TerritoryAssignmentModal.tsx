import React, { useState, useMemo } from 'react';
import {
  X,
  MapPin,
  ShieldCheck,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  User,
  Users,
  Loader2,
  Crown
} from 'lucide-react';
import { UserProfile, AdminTerritoryAssignment } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import {
  getAvailableStates,
  getAvailableDistricts,
  getAvailableTalukas,
  getAvailableVillages,
  assignTerritoryToAdmin,
  removeTerritoryFromAdmin,
} from '../../services/territoryService';

interface TerritoryAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetAdmin: UserProfile | null;
  allUsers: UserProfile[];
  onAssignmentsUpdated: (adminUid: string, updatedTerritories: AdminTerritoryAssignment[]) => void;
}

export const TerritoryAssignmentModal: React.FC<TerritoryAssignmentModalProps> = ({
  isOpen,
  onClose,
  targetAdmin,
  allUsers,
  onAssignmentsUpdated,
}) => {
  const { user: authUser, isOwnerAdmin } = useAuth();
  const { language } = useLanguage();
  const isHindi = language === 'hi';

  const [selectedState, setSelectedState] = useState('Maharashtra');
  const [selectedDistrict, setSelectedDistrict] = useState('Buldhana');
  const [selectedTaluka, setSelectedTaluka] = useState('Mehkar');
  const [selectedVillage, setSelectedVillage] = useState('Mehkar City');
  const [customVillage, setCustomVillage] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const availableStates = useMemo(() => getAvailableStates(), []);
  const availableDistricts = useMemo(() => getAvailableDistricts(selectedState), [selectedState]);
  const availableTalukas = useMemo(() => getAvailableTalukas(selectedState, selectedDistrict), [selectedState, selectedDistrict]);
  const availableVillages = useMemo(() => getAvailableVillages(selectedState, selectedDistrict, selectedTaluka), [selectedState, selectedDistrict, selectedTaluka]);

  if (!isOpen || !targetAdmin) return null;

  const currentTerritories = targetAdmin.assignedTerritories || [];

  const handleStateChange = (st: string) => {
    setSelectedState(st);
    const dists = getAvailableDistricts(st);
    const d = dists[0] || '';
    setSelectedDistrict(d);
    const tals = getAvailableTalukas(st, d);
    const t = tals[0] || '';
    setSelectedTaluka(t);
    const vils = getAvailableVillages(st, d, t);
    setSelectedVillage(vils[0] || '');
    setCustomVillage('');
  };

  const handleDistrictChange = (d: string) => {
    setSelectedDistrict(d);
    const tals = getAvailableTalukas(selectedState, d);
    const t = tals[0] || '';
    setSelectedTaluka(t);
    const vils = getAvailableVillages(selectedState, d, t);
    setSelectedVillage(vils[0] || '');
    setCustomVillage('');
  };

  const handleTalukaChange = (t: string) => {
    setSelectedTaluka(t);
    const vils = getAvailableVillages(selectedState, selectedDistrict, t);
    setSelectedVillage(vils[0] || '');
    setCustomVillage('');
  };

  const finalVillageName = selectedVillage === 'OTHER' ? customVillage.trim() : selectedVillage;

  // Find other admins assigned to this village (to highlight multi-admin support)
  const otherAdminsInVillage = allUsers.filter((u) => {
    if (u.uid === targetAdmin.uid || u.role !== 'admin' || u.isDeactivated) return false;
    const normFinal = finalVillageName.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!normFinal) return false;
    const inTerritories = u.assignedTerritories?.some(
      (t) => t.village.toLowerCase().replace(/[^a-z0-9]/g, '') === normFinal
    );
    const inVillages = u.assignedVillages?.some(
      (v) => v.toLowerCase().replace(/[^a-z0-9]/g, '') === normFinal
    );
    return Boolean(inTerritories || inVillages || (u.assignedVillage && u.assignedVillage.toLowerCase().replace(/[^a-z0-9]/g, '') === normFinal));
  });

  const handleAddAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser) return;
    setStatusMsg(null);

    if (selectedVillage === 'OTHER' && !customVillage.trim()) {
      setStatusMsg({
        type: 'error',
        text: isHindi ? 'कृपया गाँव / क्षेत्र का नाम लिखें।' : 'Please enter village name.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = await assignTerritoryToAdmin(
        targetAdmin.uid,
        {
          state: selectedState,
          district: selectedDistrict,
          taluka: selectedTaluka,
          village: finalVillageName,
        },
        authUser.uid,
        authUser.email || undefined
      );

      setStatusMsg({
        type: 'success',
        text: isHindi
          ? `✓ क्षेत्र "${finalVillageName}, ${selectedTaluka}" सफलतापूर्वक असाइन किया गया!`
          : `✓ Territory "${finalVillageName}, ${selectedTaluka}" successfully assigned!`,
      });

      onAssignmentsUpdated(targetAdmin.uid, updated);
      setCustomVillage('');
    } catch (err: any) {
      console.error('Territory assignment error:', err);
      setStatusMsg({
        type: 'error',
        text: err?.message || 'असाइनमेंट विफल रहा। कृपया पुनः प्रयास करें।',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    setDeletingId(assignmentId);
    setStatusMsg(null);
    try {
      const updated = await removeTerritoryFromAdmin(targetAdmin.uid, assignmentId);
      setStatusMsg({
        type: 'success',
        text: isHindi ? '✓ क्षेत्र असाइनमेंट हटा दिया गया।' : '✓ Territory assignment removed.',
      });
      onAssignmentsUpdated(targetAdmin.uid, updated);
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err?.message || 'हटाने में त्रुटि हुई।',
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white text-slate-900 rounded-3xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto border border-red-200 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-700 via-red-800 to-amber-700 p-5 text-white flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
              <MapPin className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-black tracking-tight">
                  {isHindi ? 'गाँव / शहर क्षेत्र असाइनमेंट' : 'Village & City Territory Assignment'}
                </h3>
                <span className="text-[10px] font-extrabold bg-amber-400 text-red-950 px-2 py-0.5 rounded-full uppercase">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-amber-100 mt-0.5 flex items-center gap-1">
                <span>{targetAdmin.displayName}</span>
                <span>•</span>
                <span>{targetAdmin.email}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 flex-1">
          {/* Status Message */}
          {statusMsg && (
            <div
              className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* Currently Assigned Territories Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>{isHindi ? 'वर्तमान असाइन किए गए क्षेत्र' : 'Currently Assigned Territories'}</span>
                <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.2 rounded-full font-bold">
                  {currentTerritories.length}
                </span>
              </label>
              <span className="text-[10px] text-slate-500 font-semibold">
                {isHindi ? 'एक Admin को कई गाँव असाइन किए जा सकते हैं' : 'Multiple villages allowed'}
              </span>
            </div>

            {currentTerritories.length === 0 ? (
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl text-center text-xs text-amber-900">
                <AlertTriangle className="w-5 h-5 text-amber-600 mx-auto mb-1" />
                <p className="font-bold">
                  {isHindi
                    ? 'इस Admin को अभी कोई क्षेत्र असाइन नहीं है।'
                    : 'No territories assigned yet.'}
                </p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  {isHindi
                    ? 'नीचे दिए गए फ़ॉर्म से State, District, Taluka और Village असाइन करें।'
                    : 'Use the form below to assign a Village or City.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {currentTerritories.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-start justify-between gap-2 shadow-2xs hover:border-red-300 transition-colors"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                        <span className="font-extrabold text-xs text-slate-900 truncate">
                          {t.village}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        {t.taluka}, {t.district}
                      </p>
                      <p className="text-[10px] text-slate-400 font-semibold">
                        {t.state}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={deletingId === t.id}
                      onClick={() => handleRemoveAssignment(t.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      title={isHindi ? 'असाइनमेंट हटाएं' : 'Remove'}
                    >
                      {deletingId === t.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form to Assign New Territory */}
          <form onSubmit={handleAddAssignment} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-red-600" />
                <span>{isHindi ? 'नया क्षेत्र / गाँव असाइन करें' : 'Assign New Territory / Village'}</span>
              </span>
              <span className="text-[10px] font-bold bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
                {isHindi ? 'गाँव-वार नियंत्रण' : 'Village Control'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* State */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  1. {isHindi ? 'राज्य (State)' : 'State'}
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

              {/* District */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  2. {isHindi ? 'ज़िला (District)' : 'District'}
                </label>
                <select
                  value={selectedDistrict}
                  onChange={(e) => handleDistrictChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-red-500 focus:outline-none"
                >
                  {availableDistricts.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              {/* Taluka / City */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  3. {isHindi ? 'तहसील / शहर (Taluka / City)' : 'Taluka / City'}
                </label>
                <select
                  value={selectedTaluka}
                  onChange={(e) => handleTalukaChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-red-500 focus:outline-none"
                >
                  {availableTalukas.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Village */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  4. {isHindi ? 'गाँव / क्षेत्र (Village / Area)' : 'Village / Area'}
                </label>
                <select
                  value={selectedVillage}
                  onChange={(e) => setSelectedVillage(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-red-500 focus:outline-none"
                >
                  {availableVillages.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                  <option value="OTHER">
                    {isHindi ? '➕ अन्य गाँव (Custom Village)' : '➕ Other Village (Custom)'}
                  </option>
                </select>
              </div>
            </div>

            {/* Custom Village Entry */}
            {selectedVillage === 'OTHER' && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-300 space-y-1 animate-in fade-in">
                <label className="block text-[11px] font-bold text-amber-900">
                  {isHindi ? 'कस्टम गाँव / क्षेत्र का नाम लिखें:' : 'Enter Custom Village Name:'}
                </label>
                <input
                  type="text"
                  required
                  value={customVillage}
                  onChange={(e) => setCustomVillage(e.target.value)}
                  placeholder={isHindi ? 'उदा. सोनटी, उमरा, पांगरी' : 'e.g. Sonati, Umra'}
                  className="w-full px-3 py-2 text-xs bg-white border border-amber-400 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>
            )}

            {/* Multi-Admin Info Note (Notice: Multiple Admins in one village allowed) */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                <Users className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  {isHindi ? 'गाँव में एकाधिक (Multiple) Admin की सुविधा:' : 'Multiple Admins per Village:'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {otherAdminsInVillage.length > 0
                  ? (isHindi
                      ? `इस गाँव ("${finalVillageName}") में पहले से ${otherAdminsInVillage.map((a) => a.displayName).join(', ')} असाइन हैं। इस Admin को भी जोड़ने पर दोनों को उस गाँव की बुकिंग्स मिलेंगी।`
                      : `"${finalVillageName}" already has ${otherAdminsInVillage.map((a) => a.displayName).join(', ')}. Assigning this Admin will share bookings.`)
                  : (isHindi
                      ? `इस गाँव ("${finalVillageName}") में यह पहला Admin होगा। बाद में अन्य Admins को भी इसी गाँव में असाइन किया जा सकता है।`
                      : `This will be the primary Admin for "${finalVillageName}". Additional Admins can also be added.`)}
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isHindi ? 'असाइन किया जा रहा है...' : 'Assigning Territory...'}</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>
                    {isHindi
                      ? `✓ "${finalVillageName}" इस Admin को असाइन करें`
                      : `✓ Assign "${finalVillageName}" to ${targetAdmin.displayName}`}
                  </span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold cursor-pointer transition-colors"
          >
            {isHindi ? 'पूर्ण / बंद करें' : 'Done / Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
