import React from 'react';
import { 
  Phone, 
  MessageCircle, 
  Edit3, 
  Trash2, 
  Clock, 
  MapPin, 
  ChevronRight,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Smartphone,
  CalendarCheck
} from 'lucide-react';
import { Lead, MnpStatus } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

interface LeadCardProps {
  lead: Lead;
  isAdmin?: boolean;
  onEdit: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
  onViewDetails: (lead: Lead) => void;
}

export const LeadCard: React.FC<LeadCardProps> = ({
  lead,
  isAdmin,
  onEdit,
  onDelete,
  onViewDetails,
}) => {
  const { t } = useLanguage();
  const { isOwnerAdmin } = useAuth();
  const [copiedUpc, setCopiedUpc] = React.useState(false);

  const copyUpc = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lead.upcCode) {
      navigator.clipboard.writeText(lead.upcCode);
      setCopiedUpc(true);
      setTimeout(() => setCopiedUpc(false), 1500);
    }
  };

  const getStatusBadge = (status: MnpStatus) => {
    switch (status) {
      case 'Ported':
        return {
          bg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          dot: 'bg-emerald-500',
          label: t.filters.statusPorted,
        };
      case 'UPC Generated':
        return {
          bg: 'bg-purple-100 text-purple-800 border-purple-300',
          dot: 'bg-purple-500',
          label: t.filters.statusUpc,
        };
      case 'SIM Allocated':
        return {
          bg: 'bg-amber-100 text-amber-800 border-amber-300',
          dot: 'bg-amber-500',
          label: t.filters.statusSim,
        };
      case 'E-KYC Done':
        return {
          bg: 'bg-indigo-100 text-indigo-800 border-indigo-300',
          dot: 'bg-indigo-500',
          label: t.filters.statusEkyc,
        };
      case 'Cancelled':
        return {
          bg: 'bg-rose-100 text-rose-800 border-rose-300',
          dot: 'bg-rose-500',
          label: t.filters.statusCancelled,
        };
      case 'New':
      default:
        return {
          bg: 'bg-blue-100 text-blue-800 border-blue-300',
          dot: 'bg-blue-500',
          label: t.filters.statusNew,
        };
    }
  };

  const getOperatorColor = (operator: string) => {
    switch (operator) {
      case 'Airtel':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'Jio':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'BSNL':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'MTNL':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const statusInfo = getStatusBadge(lead.status);
  const displayAddress = lead.customerAddress || lead.address || '';

  return (
    <div 
      onClick={() => onViewDetails(lead)}
      className="bg-white rounded-2xl p-4 shadow-xs border border-gray-200/90 hover:border-red-300 hover:shadow-md transition-all active:bg-gray-50/50 cursor-pointer relative"
    >
      {/* Top row: Customer Name, Status Badge, Booking Badge */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-gray-900 text-base leading-snug">
              {lead.customerName}
            </h3>
            {lead.leadType && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                {lead.leadType}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
            <span className="font-mono font-bold text-gray-900">+91 {lead.mobileNumber}</span>
            {lead.alternateNumber && (
              <span className="text-[11px] text-gray-400 font-mono">
                (Alt: {lead.alternateNumber})
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1.5 ${statusInfo.bg}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`}></span>
            {statusInfo.label}
          </span>
          
          {lead.bookingStatus && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200 flex items-center gap-1">
              <CalendarCheck className="w-3 h-3 text-amber-600" />
              <span>{lead.bookingStatus}</span>
              {lead.bookingCount && lead.bookingCount > 1 && (
                <span className="text-amber-700">({lead.bookingCount})</span>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Middle row: Operator and Vi Plan details */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getOperatorColor(lead.currentOperator)}`}>
          {t.leadCard.from}: {lead.currentOperator}
        </span>
        <span className="text-[11px] text-gray-400 font-bold">➔</span>
        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-red-50 text-red-800 border border-red-200">
          Vi {lead.connectionType}
        </span>
        <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-100 text-gray-700 truncate max-w-[170px]">
          {lead.selectedPlan}
        </span>
        {lead.simType && (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gray-50 text-gray-600 border border-gray-200">
            {lead.simType}
          </span>
        )}
      </div>

      {/* SIM number or UPC row */}
      {(lead.simNumber || lead.upcCode) && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          {lead.simNumber && (
            <div className="flex items-center gap-1 bg-gray-100 text-gray-800 px-2 py-0.5 rounded-md border border-gray-200 font-mono text-[11px]">
              <Smartphone className="w-3 h-3 text-gray-500" />
              <span>SIM: <strong>{lead.simNumber}</strong></span>
            </div>
          )}
          {lead.upcCode && (
            <div className="flex items-center gap-1 bg-purple-50 text-purple-900 border border-purple-200 px-2 py-0.5 rounded-md font-mono text-[11px]">
              <KeyRound className="w-3 h-3 text-purple-600" />
              <span>UPC: <strong>{lead.upcCode}</strong></span>
              {lead.upcExpiryDate && <span className="text-[10px] text-purple-600">({lead.upcExpiryDate})</span>}
            </div>
          )}
        </div>
      )}

      {/* Customer Address & Circle */}
      {(displayAddress || lead.cityCircle || lead.pincode) && (
        <div className="mt-2 text-xs text-gray-600 flex items-start gap-1">
          <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
          <span className="line-clamp-1">
            {displayAddress ? `${displayAddress}, ` : ''}
            {lead.cityCircle || ''}
            {lead.pincode ? ` - ${lead.pincode}` : ''}
          </span>
        </div>
      )}

      {/* Creator Info (Admin visibility) */}
      {isAdmin && (lead.createdByName || lead.createdByEmail) && (
        <div className="mt-2 text-[11px] bg-amber-50/80 text-amber-900 border border-amber-200/80 rounded-lg px-2 py-1 flex items-center justify-between font-medium">
          <span>{t.leadCard.salesExecutive}: <strong>{lead.createdByName || lead.createdByEmail}</strong></span>
          <span className="text-[10px] text-amber-700">UID: {(lead.salespersonUid || lead.createdByUid)?.slice(0, 8)}...</span>
        </div>
      )}

      {/* Remarks or notes preview */}
      {lead.remarks && (
        <p className="mt-2 text-xs text-gray-500 line-clamp-1 italic bg-gray-50/80 px-2 py-1 rounded-md">
          "{lead.remarks}"
        </p>
      )}

      {/* Actions row: Mobile call, WhatsApp, Edit, Delete */}
      <div className="mt-3.5 pt-3 border-t border-gray-100 flex items-center justify-between">
        {/* Contact shortcuts */}
        <div className="flex items-center gap-1.5">
          <a
            href={`tel:${lead.mobileNumber}`}
            onClick={(e) => e.stopPropagation()}
            className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors active:scale-95 border border-emerald-200"
            title={t.leadCard.callTooltip}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>{t.common.call}</span>
          </a>

          <a
            href={`https://wa.me/91${lead.mobileNumber}?text=${encodeURIComponent(
              t.leadCard.waGreeting.replace('{name}', lead.customerName).replace('{phone}', lead.mobileNumber)
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors active:scale-95 border border-green-200"
            title={t.leadCard.whatsappTooltip}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>{t.common.whatsapp}</span>
          </a>
        </div>

        {/* Management actions (Edit / Delete) */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(lead);
            }}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors active:scale-95"
            title={t.leadCard.editTooltip}
          >
            <Edit3 className="w-4 h-4" />
          </button>

          {isOwnerAdmin && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(lead);
              }}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors active:scale-95"
              title={t.leadCard.deleteTooltip}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <div className="p-1 text-gray-400">
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
};
