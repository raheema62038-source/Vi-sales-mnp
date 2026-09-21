import React, { useState } from 'react';
import { 
  X, 
  Phone, 
  MessageCircle, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  KeyRound, 
  MapPin, 
  Calendar,
  CreditCard,
  Copy,
  Check,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Smartphone,
  CalendarCheck,
  User,
  Hash,
  FileText
} from 'lucide-react';
import { Lead, MnpStatus } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

interface LeadDetailsModalProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
  onUpdateStatus: (leadId: string, newStatus: MnpStatus) => Promise<void>;
}

export const LeadDetailsModal: React.FC<LeadDetailsModalProps> = ({
  lead,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onUpdateStatus,
}) => {
  const { t, language } = useLanguage();
  const { isOwnerAdmin } = useAuth();
  const [copiedUpc, setCopiedUpc] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  if (!isOpen || !lead) return null;

  const stages: { status: MnpStatus; label: string; desc: string }[] = [
    { status: 'New', label: t.leadDetails.stNew, desc: t.leadDetails.stNewDesc },
    { status: 'UPC Generated', label: t.leadDetails.stUpc, desc: t.leadDetails.stUpcDesc },
    { status: 'SIM Allocated', label: t.leadDetails.stSim, desc: t.leadDetails.stSimDesc },
    { status: 'E-KYC Done', label: t.leadDetails.stEkyc, desc: t.leadDetails.stEkycDesc },
    { status: 'Ported', label: t.leadDetails.stPorted, desc: t.leadDetails.stPortedDesc },
  ];

  const handleCopyUpc = () => {
    if (lead.upcCode) {
      navigator.clipboard.writeText(lead.upcCode);
      setCopiedUpc(true);
      setTimeout(() => setCopiedUpc(false), 1500);
    }
  };

  const handleStatusChange = async (newStatus: MnpStatus) => {
    try {
      setUpdatingStatus(true);
      await onUpdateStatus(lead.id, newStatus);
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const currentStageIndex = stages.findIndex(s => s.status === lead.status);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-xs">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col animate-in fade-in slide-in-from-bottom-5 duration-200">
        
        {/* Top Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-4 sm:p-5 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-400 text-red-950 uppercase tracking-wide">
                {lead.leadType || 'Vi MNP Lead'}
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/20 text-white uppercase tracking-wide">
                {lead.status}
              </span>
              <span className="text-xs text-red-100">
                {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-white mt-1">
              {lead.customerName}
            </h2>
            <p className="text-sm font-mono text-red-100 mt-0.5">
              +91 {lead.mobileNumber}
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Action Buttons Row */}
        <div className="bg-red-50/50 p-3 border-b border-red-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <a
              href={`tel:${lead.mobileNumber}`}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-transform active:scale-95"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{t.leadDetails.callBtn}</span>
            </a>

            <a
              href={`https://wa.me/91${lead.mobileNumber}?text=${encodeURIComponent(
                t.leadCard.waGreeting.replace('{name}', lead.customerName).replace('{phone}', lead.mobileNumber)
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-transform active:scale-95"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>{t.leadDetails.whatsappBtn}</span>
            </a>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                onClose();
                onEdit(lead);
              }}
              className="p-2 text-blue-600 hover:bg-blue-100/50 rounded-xl transition-colors"
              title={t.leadDetails.editTooltip}
            >
              <Edit3 className="w-4 h-4" />
            </button>

            {isOwnerAdmin && (
              <button
                onClick={() => {
                  onClose();
                  onDelete(lead);
                }}
                className="p-2 text-red-600 hover:bg-red-100/50 rounded-xl transition-colors"
                title={t.leadDetails.deleteTooltip}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-4 text-xs">
          
          {/* Progress Tracker */}
          <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-200/80">
            <h3 className="font-bold text-gray-800 text-xs uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-red-600" />
              {t.leadDetails.portingProgressTitle}
            </h3>

            <div className="space-y-1.5">
              {stages.map((st, idx) => {
                const isPassed = currentStageIndex > idx;
                const isCurrent = currentStageIndex === idx;

                return (
                  <div
                    key={st.status}
                    onClick={() => handleStatusChange(st.status)}
                    className={`p-2 rounded-xl flex items-center justify-between cursor-pointer transition-all border ${
                      isCurrent
                        ? 'bg-red-50 border-red-300 font-bold text-red-900 shadow-2xs'
                        : isPassed
                        ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800'
                        : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          isCurrent
                            ? 'bg-red-600 text-white'
                            : isPassed
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {isPassed ? <Check className="w-3 h-3" /> : idx + 1}
                      </div>
                      <div>
                        <div className="text-xs">{st.label}</div>
                        <div className="text-[10px] text-gray-500 font-normal">{st.desc}</div>
                      </div>
                    </div>

                    {isCurrent && (
                      <span className="text-[10px] font-bold text-red-600 px-2 py-0.5 bg-red-100 rounded-md">
                        {t.leadDetails.currentStatusTag}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            
            <p className="text-[10px] text-gray-500 mt-2 text-center">
              {t.leadDetails.tapToChangePrompt}
            </p>
          </div>

          {/* Booking & Lead Classification */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200">
              <span className="text-amber-800 text-[10px] font-bold uppercase tracking-wider block">
                {t.leadDetails.bookingStatusLabel}
              </span>
              <span className="font-extrabold text-amber-950 text-sm mt-0.5 block">
                {lead.bookingStatus || 'Lead Received'}
              </span>
              <span className="text-[10px] text-amber-700 block mt-0.5">
                {t.leadDetails.bookingCountLabel} <strong>{lead.bookingCount || 1} SIM(s)</strong>
              </span>
            </div>

            <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200">
              <span className="text-blue-800 text-[10px] font-bold uppercase tracking-wider block">
                {t.leadDetails.leadTypeLabel}
              </span>
              <span className="font-extrabold text-blue-950 text-sm mt-0.5 block">
                {lead.leadType || 'Porting (MNP)'}
              </span>
              <span className="text-[10px] text-blue-700 block mt-0.5">
                {lead.simType || 'Physical SIM'}
              </span>
            </div>
          </div>

          {/* Key Operator Transfer Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-gray-500 text-[10px] block">{t.leadDetails.fromOperatorLabel}</span>
              <span className="font-bold text-gray-900 text-sm mt-0.5 block">{lead.currentOperator}</span>
            </div>

            <div className="p-3 bg-red-50/50 rounded-xl border border-red-100">
              <span className="text-gray-500 text-[10px] block">{t.leadDetails.toOperatorLabel}</span>
              <span className="font-bold text-red-700 text-sm mt-0.5 block">Vi {lead.connectionType}</span>
            </div>
          </div>

          {/* UPC Code Box */}
          <div className="p-3.5 bg-purple-50 rounded-2xl border border-purple-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">
                {t.leadDetails.upcCodeHeading}
              </span>
              <span className="font-mono text-base font-extrabold text-purple-950 mt-0.5 block">
                {lead.upcCode || t.leadDetails.upcNotYetGenerated}
              </span>
              {lead.upcExpiryDate && (
                <span className="text-[10px] text-purple-600 block mt-0.5">
                  {t.leadDetails.validityPrefix}: {lead.upcExpiryDate}
                </span>
              )}
            </div>
            {lead.upcCode && (
              <button
                onClick={handleCopyUpc}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                {copiedUpc ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUpc ? t.leadDetails.copied : t.leadDetails.copy}</span>
              </button>
            )}
          </div>

          {/* Detailed Customer & SIM Specifications */}
          <div className="space-y-2 bg-gray-50/60 p-3 rounded-2xl border border-gray-200">
            <h4 className="font-bold text-gray-800 text-[11px] uppercase tracking-wider mb-1 flex items-center gap-1.5 text-red-600">
              <User className="w-3.5 h-3.5" />
              {t.leadDetails.customerDetailsTitle}
            </h4>

            <div className="flex justify-between items-center py-1.5 border-b border-gray-200/70">
              <span className="text-gray-500">{t.leadDetails.customerNameLabel}</span>
              <span className="font-bold text-gray-900">{lead.customerName}</span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-gray-200/70">
              <span className="text-gray-500">{t.leadDetails.phoneLabel}</span>
              <span className="font-mono font-bold text-gray-900">+91 {lead.mobileNumber}</span>
            </div>

            {lead.alternateNumber && (
              <div className="flex justify-between items-center py-1.5 border-b border-gray-200/70">
                <span className="text-gray-500">{t.leadDetails.altNumberLabel}</span>
                <span className="font-mono font-semibold text-gray-900">+91 {lead.alternateNumber}</span>
              </div>
            )}

            <div className="flex justify-between items-center py-1.5 border-b border-gray-200/70">
              <span className="text-gray-500">{t.leadDetails.planLabel}</span>
              <span className="font-semibold text-gray-900 text-right max-w-[220px]">{lead.selectedPlan}</span>
            </div>

            {lead.simNumber && (
              <div className="flex justify-between items-center py-1.5 border-b border-gray-200/70">
                <span className="text-gray-500">{t.leadDetails.simNumberLabel}</span>
                <span className="font-mono font-bold text-gray-900">{lead.simNumber}</span>
              </div>
            )}

            {lead.simType && (
              <div className="flex justify-between items-center py-1.5 border-b border-gray-200/70">
                <span className="text-gray-500">{t.leadDetails.simTypeLabel}</span>
                <span className="font-semibold text-gray-900">{lead.simType}</span>
              </div>
            )}

            <div className="flex justify-between items-center py-1.5 border-b border-gray-200/70">
              <span className="text-gray-500">{t.leadDetails.circleLabel}</span>
              <span className="font-semibold text-gray-900">{lead.cityCircle || 'N/A'}</span>
            </div>

            {(lead.taluka || lead.district || lead.state) && (
              <div className="flex justify-between items-center py-1.5 border-b border-gray-200/70">
                <span className="text-gray-500">Taluka / District / State</span>
                <span className="font-semibold text-gray-900 text-right">
                  {[lead.taluka, lead.district, lead.state].filter(Boolean).join(', ')}
                </span>
              </div>
            )}

            {(lead.customerAddress || lead.address) && (
              <div className="flex justify-between items-start py-1.5 border-b border-gray-200/70">
                <span className="text-gray-500">{t.leadDetails.addressLabel}</span>
                <span className="font-semibold text-gray-900 text-right max-w-[220px]">
                  {lead.customerAddress || lead.address}
                </span>
              </div>
            )}

            {lead.pincode && (
              <div className="flex justify-between items-center py-1.5 border-b border-gray-200/70">
                <span className="text-gray-500">{t.leadDetails.pincodeLabel}</span>
                <span className="font-mono font-semibold text-gray-900">{lead.pincode}</span>
              </div>
            )}
          </div>

          {/* Remarks */}
          {lead.remarks && (
            <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200">
              <span className="font-bold text-amber-900 text-[10px] block uppercase tracking-wider">
                {t.leadDetails.remarksLabel}
              </span>
              <p className="text-xs text-amber-950 mt-1 leading-relaxed">
                {lead.remarks}
              </p>
            </div>
          )}

          {/* Created by / User attribution badge */}
          <div className="text-[11px] text-gray-600 bg-gray-50 p-2.5 rounded-xl border border-gray-200 text-center">
            <span className="font-semibold text-gray-700">
              {language === 'hi' ? 'अनुरोधकर्ता / यूज़र:' : 'Submitted by:'}{' '}
            </span>
            <strong className="text-gray-900">{lead.createdByName || lead.createdByEmail || lead.customerName || 'User'}</strong>
            <div className="text-[10px] text-gray-500 font-mono mt-0.5 space-y-0.5">
              <div>Lead ID: {lead.leadId || lead.id} • Assigned: {lead.assignedTo || 'Unassigned'}</div>
              <div>Customer UID: {lead.customerUid || lead.createdByUid || 'N/A'} {lead.customerEmail ? `• Email: ${lead.customerEmail}` : ''}</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-gray-900 hover:bg-black text-white rounded-xl font-bold text-xs transition-colors"
          >
            {t.common.close}
          </button>
        </div>
      </div>
    </div>
  );
};
