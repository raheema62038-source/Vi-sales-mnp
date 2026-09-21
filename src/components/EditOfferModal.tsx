import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  Plus, 
  Trash2, 
  RotateCcw, 
  Sparkles, 
  Flame, 
  CheckCircle2, 
  AlertCircle,
  ShieldCheck,
  Tag
} from 'lucide-react';
import { PromotionalOffer } from '../types';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  getPromotionalOffer, 
  savePromotionalOffer, 
  DEFAULT_PROMOTIONAL_OFFER 
} from '../services/offerService';

interface EditOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOfferUpdated?: (offer: PromotionalOffer) => void;
}

export const EditOfferModal: React.FC<EditOfferModalProps> = ({
  isOpen,
  onClose,
  onOfferUpdated,
}) => {
  const { user, userProfile, isAdmin } = useAuth();
  const { language } = useLanguage();
  const isHindi = language === 'hi';

  const [heading, setHeading] = useState(DEFAULT_PROMOTIONAL_OFFER.heading);
  const [badge, setBadge] = useState(DEFAULT_PROMOTIONAL_OFFER.badge || 'PROMOTIONAL OFFER');
  const [items, setItems] = useState<string[]>([...DEFAULT_PROMOTIONAL_OFFER.items]);
  const [disclaimer, setDisclaimer] = useState(DEFAULT_PROMOTIONAL_OFFER.disclaimer || '');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load current offer on open
  useEffect(() => {
    if (isOpen) {
      setFeedback(null);
      getPromotionalOffer().then((current) => {
        setHeading(current.heading || DEFAULT_PROMOTIONAL_OFFER.heading);
        setBadge(current.badge || 'PROMOTIONAL OFFER');
        setItems(current.items?.length ? [...current.items] : [...DEFAULT_PROMOTIONAL_OFFER.items]);
        setDisclaimer(current.disclaimer || DEFAULT_PROMOTIONAL_OFFER.disclaimer || '');
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Strict check: non-admins cannot use this modal
  if (!isAdmin) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-red-600 mx-auto" />
          <h3 className="font-bold text-gray-900">अनधिकृत एक्सेस (Unauthorized)</h3>
          <p className="text-xs text-gray-500">केवल एडमिन ही प्रमोशनल ऑफर एडिट कर सकते हैं।</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold"
          >
            बंद करें
          </button>
        </div>
      </div>
    );
  }

  const handleItemChange = (index: number, val: string) => {
    const updated = [...items];
    updated[index] = val;
    setItems(updated);
  };

  const handleAddItem = () => {
    setItems([...items, '']);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      setFeedback({ type: 'error', message: 'कम से कम एक ऑफर लाइन होना अनिवार्य है।' });
      return;
    }
    const updated = items.filter((_, idx) => idx !== index);
    setItems(updated);
  };

  const handleResetToDefault = () => {
    setHeading(DEFAULT_PROMOTIONAL_OFFER.heading);
    setBadge(DEFAULT_PROMOTIONAL_OFFER.badge || 'PROMOTIONAL OFFER');
    setItems([...DEFAULT_PROMOTIONAL_OFFER.items]);
    setDisclaimer(DEFAULT_PROMOTIONAL_OFFER.disclaimer || '');
    setFeedback({ type: 'success', message: 'डिफ़ॉल्ट ऑफर मान रीसेट कर दिए गए हैं। सेव करने के लिए "Save Changes" दबाएं।' });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const cleanHeading = heading.trim();
    if (!cleanHeading) {
      setFeedback({ type: 'error', message: 'कृपया ऑफर हेडिंग दर्ज करें।' });
      return;
    }

    const filteredItems = items.map(it => it.trim()).filter(Boolean);
    if (filteredItems.length === 0) {
      setFeedback({ type: 'error', message: 'कृपया कम से कम एक वैध ऑफर लाइन दर्ज करें।' });
      return;
    }

    setIsSaving(true);
    try {
      const updated = await savePromotionalOffer(
        {
          heading: cleanHeading,
          badge: badge.trim() || 'PROMOTIONAL OFFER',
          items: filteredItems,
          disclaimer: disclaimer.trim(),
        },
        {
          uid: user?.uid || '',
          email: user?.email || '',
          displayName: userProfile?.displayName || user?.displayName || 'Admin',
        }
      );

      setFeedback({ 
        type: 'success', 
        message: 'प्रमोशनल ऑफर सफलतापूर्वक Firebase में सेव हो गया है! ग्राहकों के बुकिंग फॉर्म पर यह तुरंत दिखेगा।' 
      });

      if (onOfferUpdated) {
        onOfferUpdated(updated);
      }

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setFeedback({ 
        type: 'error', 
        message: err?.message || 'ऑफर सेव करने में विफल। कृपया पुनः प्रयास करें।' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-xl max-h-[94vh] overflow-y-auto shadow-2xl flex flex-col animate-in fade-in slide-in-from-bottom-5 duration-200">
        
        {/* Header */}
        <div className="sticky top-0 z-10 bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shadow-md border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 font-black text-xl flex items-center justify-center shadow-xs shrink-0">
              <Sparkles className="w-5 h-5 text-slate-900" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-base sm:text-lg tracking-tight">
                  {isHindi ? 'एडमिन ऑफर कंट्रोल • Edit Offer' : 'Admin Offer Control • Edit Offer'}
                </h2>
                <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-md uppercase">
                  Admin Only
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                {isHindi ? 'यहाँ से ऑफर एडिट करें, ग्राहकों को तुरंत अपडेट दिखेगा।' : 'Modify offer text. Changes sync to Firebase in real-time.'}
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

        {/* Modal Form */}
        <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-5 text-xs">
          
          {feedback && (
            <div
              className={`p-3 rounded-xl border flex items-center gap-2 font-medium ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-red-50 text-red-800 border-red-300'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Heading */}
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              ऑफर मुख्य हेडिंग (Main Heading) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={heading}
              onChange={(e) => setHeading(e.target.value)}
              placeholder="e.g. VI 5G READY MEHKAR"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none font-black text-sm text-slate-900"
            />
          </div>

          {/* Badge */}
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              बैज / टैग (Badge Label)
            </label>
            <div className="relative">
              <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                placeholder="e.g. PROMOTIONAL OFFER"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none font-bold text-xs text-slate-800"
              />
            </div>
          </div>

          {/* Offer Bullet Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block font-bold text-slate-800">
                ऑफर डिटेल्स एवं शर्तें (Offer Lines) ({items.length})
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>लाइन जोड़ें (Add Line)</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-500">
              ग्राहक बुकिंग फॉर्म पर नीचे दी गई सभी लाइनें क्रमानुसार दिखाई देंगी:
            </p>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-6 text-center text-slate-400 font-bold text-[11px] shrink-0">
                    {idx + 1}.
                  </span>
                  <input
                    type="text"
                    required
                    value={item}
                    onChange={(e) => handleItemChange(idx, e.target.value)}
                    placeholder={`Offer line ${idx + 1}`}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none font-semibold text-slate-900 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    title="Remove this line"
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Disclaimer text */}
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              प्रमोशनल डिस्क्लेमर / नोट (Disclaimer Note)
            </label>
            <textarea
              rows={2}
              value={disclaimer}
              onChange={(e) => setDisclaimer(e.target.value)}
              placeholder="Admin-configured promotional information (Doorstep MNP Mehkar)."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none text-xs text-slate-700"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              यह नोट ग्राहक को स्पष्ट करता है कि यह एडमिन द्वारा संचालित विशेष प्रमोशनल ऑफर है।
            </p>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleResetToDefault}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>डिफ़ॉल्ट रीसेट</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                रद्द करें
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl font-black text-slate-950 bg-amber-400 hover:bg-amber-300 active:scale-95 shadow-md flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'सेव हो रहा है...' : 'Save to Firebase'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
