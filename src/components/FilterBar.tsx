import React from 'react';
import { Search, X, Filter } from 'lucide-react';
import { CurrentOperator } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedOperator: string;
  onOperatorChange: (op: string) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedOperator,
  onOperatorChange,
  selectedStatus,
  onStatusChange,
}) => {
  const { t } = useLanguage();

  const statusFilters = [
    { id: 'ALL', label: t.filters.statusAll },
    { id: 'New', label: t.filters.statusNew },
    { id: 'UPC Generated', label: t.filters.statusUpc },
    { id: 'SIM Allocated', label: t.filters.statusSim },
    { id: 'E-KYC Done', label: t.filters.statusEkyc },
    { id: 'Ported', label: t.filters.statusPorted },
    { id: 'Cancelled', label: t.filters.statusCancelled },
  ];

  const operators = [
    { id: 'ALL', label: t.filters.allOperators },
    { id: 'Airtel', label: 'Airtel' },
    { id: 'Jio', label: 'Jio' },
    { id: 'BSNL', label: 'BSNL' },
    { id: 'Other', label: t.filters.otherOperator },
  ];

  return (
    <div className="bg-white border-b border-gray-200 px-3 py-2.5 space-y-2 sticky top-[82px] z-20 shadow-2xs">
      
      {/* Search Field */}
      <div className="relative">
        <span className="absolute left-3 top-2.5 text-gray-400">
          <Search className="w-4 h-4" />
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t.filters.searchPlaceholder}
          className="w-full pl-9 pr-8 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Horizontal Scrolling Chips for Status & Operator */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 text-xs">
        {/* Operator Select dropdown or chips */}
        <select
          value={selectedOperator}
          onChange={(e) => onOperatorChange(e.target.value)}
          className="px-2 py-1 bg-gray-100 border border-gray-300 rounded-lg text-[11px] font-semibold text-gray-700 focus:outline-none shrink-0"
        >
          {operators.map(op => (
            <option key={op.id} value={op.id}>{op.label}</option>
          ))}
        </select>

        <div className="h-4 w-[1px] bg-gray-300 shrink-0 mx-0.5" />

        {/* Status Filter Chips */}
        {statusFilters.map((f) => {
          const isActive = selectedStatus === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => onStatusChange(f.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0 transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
