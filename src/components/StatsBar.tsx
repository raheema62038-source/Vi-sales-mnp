import React from 'react';
import { 
  Users, 
  Sparkles, 
  Smartphone, 
  CalendarCheck, 
  CheckCheck,
  Clock,
  TrendingUp,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Download
} from 'lucide-react';
import { Lead } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

interface StatsBarProps {
  leads: Lead[];
  selectedFilter: string;
  onSelectFilter: (filterKey: string) => void;
  totalNewCustomers?: number;
  totalCustomersJoined?: number;
  totalCustomers?: number;
  totalCustomersLoggedIn?: number;
  totalAppDownloads?: number;
}

export const StatsBar: React.FC<StatsBarProps> = ({
  leads,
  selectedFilter,
  onSelectFilter,
  totalNewCustomers = 0,
  totalCustomersJoined,
  totalCustomers,
  totalCustomersLoggedIn = 0,
  totalAppDownloads = 0,
}) => {
  const { t, language } = useLanguage();
  const { isAdmin, user } = useAuth();

  const joinedCount = totalCustomersJoined ?? totalNewCustomers;
  const storedCount = totalCustomers ?? totalNewCustomers;

  // 1. Total leads (or all leads if admin, customer's own if customer)
  const total = leads.length;

  // 2. New leads
  const newLeads = leads.filter(l => l.status === 'New').length;

  // 3. SIM/Porting leads
  const simPortingLeads = leads.filter(l => 
    l.leadType === 'Porting (MNP)' || 
    l.leadType === 'New SIM Connection' || 
    !!l.simNumber || 
    !!l.upcCode || 
    !l.leadType
  ).length;

  // 4. Bookings made
  const bookingsCount = leads.filter(l => 
    l.bookingStatus === 'Booked' || 
    (l.bookingCount && l.bookingCount > 0)
  ).length;
  const totalBookedUnits = leads.reduce((acc, l) => {
    if (l.bookingStatus === 'Booked' || (l.bookingCount && l.bookingCount > 0)) {
      return acc + (l.bookingCount || 1);
    }
    return acc;
  }, 0);

  // 5. Completed / Ported leads
  const completedPorted = leads.filter(l => l.status === 'Ported').length;

  // 6. Pending / In-process leads
  const inProcess = leads.filter(l => ['New', 'UPC Generated', 'SIM Allocated', 'E-KYC Done'].includes(l.status)).length;

  // Conversion rate
  const conversionRate = total > 0 ? Math.round((completedPorted / total) * 100) : 0;

  return (
    <div className="bg-white border-b border-gray-200 p-3 shadow-2xs">
      {/* Dashboard Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {/* 1. Total leads */}
        <button
          type="button"
          onClick={() => onSelectFilter('ALL')}
          className={`p-2.5 rounded-xl text-left transition-all border relative flex flex-col justify-between ${
            selectedFilter === 'ALL'
              ? 'bg-red-50 border-red-500 shadow-xs ring-2 ring-red-400'
              : 'bg-gray-50/80 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
          }`}
          title={t.stats.totalLeads}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider line-clamp-1">
              {t.stats.totalLeads}
            </span>
            <Users className="w-3.5 h-3.5 text-red-600 shrink-0" />
          </div>
          <div className="mt-1">
            <div className="text-xl font-black text-gray-900 leading-none">{total}</div>
            <span className="text-[9px] font-medium text-gray-500 line-clamp-1 mt-0.5">
              {isAdmin ? 'All Leads' : 'My Leads Only'}
            </span>
          </div>
        </button>

        {/* 2. New leads */}
        <button
          type="button"
          onClick={() => onSelectFilter('New')}
          className={`p-2.5 rounded-xl text-left transition-all border relative flex flex-col justify-between ${
            selectedFilter === 'New'
              ? 'bg-blue-50 border-blue-500 shadow-xs ring-2 ring-blue-400'
              : 'bg-gray-50/80 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
          }`}
          title="2. New leads"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider line-clamp-1">
              {t.stats.newLeads}
            </span>
            <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          </div>
          <div className="mt-1">
            <div className="text-xl font-black text-blue-700 leading-none">{newLeads}</div>
            <span className="text-[9px] font-medium text-blue-600 line-clamp-1 mt-0.5">
              Fresh Intake
            </span>
          </div>
        </button>

        {/* 3. SIM / Porting leads */}
        <button
          type="button"
          onClick={() => onSelectFilter('SIM_PORTING')}
          className={`p-2.5 rounded-xl text-left transition-all border relative flex flex-col justify-between ${
            selectedFilter === 'SIM_PORTING'
              ? 'bg-purple-50 border-purple-500 shadow-xs ring-2 ring-purple-400'
              : 'bg-gray-50/80 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
          }`}
          title="3. SIM / Porting leads"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider line-clamp-1">
              {t.stats.simPortingLeads}
            </span>
            <Smartphone className="w-3.5 h-3.5 text-purple-600 shrink-0" />
          </div>
          <div className="mt-1">
            <div className="text-xl font-black text-purple-700 leading-none">{simPortingLeads}</div>
            <span className="text-[9px] font-medium text-purple-600 line-clamp-1 mt-0.5">
              MNP & SIMs
            </span>
          </div>
        </button>

        {/* 4. Bookings made */}
        <button
          type="button"
          onClick={() => onSelectFilter('BOOKED')}
          className={`p-2.5 rounded-xl text-left transition-all border relative flex flex-col justify-between ${
            selectedFilter === 'BOOKED'
              ? 'bg-amber-50 border-amber-500 shadow-xs ring-2 ring-amber-400'
              : 'bg-gray-50/80 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
          }`}
          title={t.stats.bookingsMade}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider line-clamp-1">
              {t.stats.bookingsMade}
            </span>
            <CalendarCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          </div>
          <div className="mt-1">
            <div className="text-xl font-black text-amber-800 leading-none">{bookingsCount}</div>
            <span className="text-[9px] font-medium text-amber-700 line-clamp-1 mt-0.5">
              {totalBookedUnits} SIMs Booked
            </span>
          </div>
        </button>

        {/* 5. Completed / ported leads */}
        <button
          type="button"
          onClick={() => onSelectFilter('Ported')}
          className={`p-2.5 rounded-xl text-left transition-all border relative flex flex-col justify-between ${
            selectedFilter === 'Ported'
              ? 'bg-emerald-50 border-emerald-500 shadow-xs ring-2 ring-emerald-400'
              : 'bg-gray-50/80 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
          }`}
          title="5. Completed/ported leads"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider line-clamp-1">
              {t.stats.completedPorted}
            </span>
            <CheckCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          </div>
          <div className="mt-1">
            <div className="text-xl font-black text-emerald-700 leading-none">{completedPorted}</div>
            <span className="text-[9px] font-medium text-emerald-600 line-clamp-1 mt-0.5">
              100% Ported
            </span>
          </div>
        </button>

        {/* 6. Pending / In-process leads */}
        <button
          type="button"
          onClick={() => onSelectFilter('IN_PROCESS')}
          className={`p-2.5 rounded-xl text-left transition-all border relative flex flex-col justify-between ${
            selectedFilter === 'IN_PROCESS'
              ? 'bg-orange-50 border-orange-500 shadow-xs ring-2 ring-orange-400'
              : 'bg-gray-50/80 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
          }`}
          title="6. Pending/In-process leads"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-orange-800 uppercase tracking-wider line-clamp-1">
              {t.stats.inProcess}
            </span>
            <Clock className="w-3.5 h-3.5 text-orange-600 shrink-0" />
          </div>
          <div className="mt-1">
            <div className="text-xl font-black text-orange-700 leading-none">{inProcess}</div>
            <span className="text-[9px] font-medium text-orange-600 line-clamp-1 mt-0.5">
              Action Required
            </span>
          </div>
        </button>
      </div>

      {/* Conversion Rate & Operator Performance Strip */}
      <div className="mt-2.5 pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-600 px-1">
        <div className="flex items-center gap-1.5 font-medium">
          <TrendingUp className="w-3.5 h-3.5 text-red-600" />
          <span>{t.stats.successRate}</span>
          <span className="font-extrabold text-gray-900 bg-gray-100 px-1.5 py-0.5 rounded-md">
            {conversionRate}%
          </span>
        </div>
        
        <div className="flex items-center gap-2 text-[10px] text-gray-500 font-medium">
          <span>Airtel: <strong>{leads.filter(l => l.currentOperator === 'Airtel').length}</strong></span>
          <span>•</span>
          <span>Jio: <strong>{leads.filter(l => l.currentOperator === 'Jio').length}</strong></span>
          <span>•</span>
          <span>BSNL: <strong>{leads.filter(l => l.currentOperator === 'BSNL').length}</strong></span>
        </div>
      </div>

      {/* Admin Customer Metrics */}
      {isAdmin && (
        <div className="mt-2.5 pt-2 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* 1. TOTAL CUSTOMERS JOINED */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/90 rounded-xl p-2.5 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                <UserPlus className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[9px] font-bold text-blue-900 uppercase tracking-wider block">
                  {language === 'hi' ? 'कुल जुड़े ग्राहक' : 'Total Customers Joined'}
                </span>
                <span className="text-base font-black text-blue-950 leading-none">
                  {joinedCount}
                </span>
              </div>
            </div>
            <span className="text-[9px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded-full">
              Joined
            </span>
          </div>

          {/* 2. TOTAL CUSTOMERS (Stored in Firebase) */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 rounded-xl p-2.5 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[9px] font-bold text-amber-900 uppercase tracking-wider block">
                  {language === 'hi' ? 'कुल ग्राहक (Firebase)' : 'Total Customers'}
                </span>
                <span className="text-base font-black text-amber-950 leading-none">
                  {storedCount}
                </span>
              </div>
            </div>
            <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded-full">
              Stored
            </span>
          </div>

          {/* 3. TOTAL CUSTOMERS LOGGED IN */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/90 rounded-xl p-2.5 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[9px] font-bold text-emerald-900 uppercase tracking-wider block">
                  {language === 'hi' ? 'लॉग इन किए ग्राहक' : 'Total Customers Logged In'}
                </span>
                <span className="text-base font-black text-emerald-950 leading-none">
                  {totalCustomersLoggedIn}
                </span>
              </div>
            </div>
            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">
              Active
            </span>
          </div>

          {/* 4. TOTAL APP/APK DOWNLOADS */}
          <div className="bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200/90 rounded-xl p-2.5 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[9px] font-bold text-purple-900 uppercase tracking-wider block">
                  {language === 'hi' ? 'ऐप/APK डाउनलोड' : 'Total App/APK Downloads'}
                </span>
                <span className="text-base font-black text-purple-950 leading-none">
                  {totalAppDownloads}
                </span>
              </div>
            </div>
            <span className="text-[9px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded-full">
              Tracked
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
