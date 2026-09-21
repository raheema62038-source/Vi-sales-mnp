import React from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import { Lead } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface DeleteConfirmModalProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (leadId: string) => Promise<void>;
  isDeleting: boolean;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  lead,
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
}) => {
  const { t } = useLanguage();

  if (!isOpen || !lead) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
          <Trash2 className="w-6 h-6" />
        </div>

        <h3 className="text-base font-bold text-gray-900 text-center">
          {t.deleteModal.title}
        </h3>

        <p className="text-xs text-gray-600 text-center mt-1.5 leading-relaxed">
          {t.deleteModal.message.replace('{name}', lead.customerName).replace('{phone}', lead.mobileNumber)}
        </p>

        <div className="mt-5 flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 py-2.5 rounded-xl font-semibold text-xs text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            {t.deleteModal.cancelBtn || t.common.cancel}
          </button>

          <button
            type="button"
            onClick={() => onConfirm(lead.id)}
            disabled={isDeleting}
            className="flex-1 py-2.5 rounded-xl font-bold text-xs text-white bg-red-600 hover:bg-red-700 active:scale-95 shadow-sm transition-all disabled:opacity-50"
          >
            {isDeleting ? t.deleteModal.deletingBtn : t.deleteModal.deleteBtn}
          </button>
        </div>
      </div>
    </div>
  );
};
