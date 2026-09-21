import React from 'react';
import { 
  TrendingUp, 
  Users, 
  CheckCircle2, 
  Award, 
  Smartphone, 
  PieChart, 
  BarChart3, 
  ArrowRight,
  ShieldCheck,
  CheckCheck,
  Building,
  UserPlus,
  UserCheck
} from 'lucide-react';
import { Lead, UserProfile } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface AdminAnalyticsViewProps {
  allLeads: Lead[];
  allUsers?: UserProfile[];
  onFilterByUser: (userUid: string) => void;
}

export const AdminAnalyticsView: React.FC<AdminAnalyticsViewProps> = ({
  allLeads,
  allUsers = [],
  onFilterByUser,
}) => {
  const { t, language } = useLanguage();
  const total = allLeads.length;
  const ported = allLeads.filter((l) => l.status === 'Ported').length;
  const upc = allLeads.filter((l) => l.status === 'UPC Generated').length;
  const simAllocated = allLeads.filter((l) => l.status === 'SIM Allocated').length;
  const ekyc = allLeads.filter((l) => l.status === 'E-KYC Done').length;
  const cancelled = allLeads.filter((l) => l.status === 'Cancelled').length;
  const newLeads = allLeads.filter((l) => l.status === 'New').length;

  // Customer activity stats
  const customerUsers = allUsers.filter((u) => u.role === 'customer' || (!u.role && !u.isPrimaryOwner));
  const totalNewCustomers = customerUsers.length;
  const totalCustomersLoggedIn = customerUsers.filter((u) => u.hasLoggedIn || (u.loginCount && u.loginCount > 0)).length;

  const conversionRate = total > 0 ? Math.round((ported / total) * 100) : 0;

  // Source Operator breakdown
  const airtel = allLeads.filter((l) => l.currentOperator === 'Airtel').length;
  const jio = allLeads.filter((l) => l.currentOperator === 'Jio').length;
  const bsnl = allLeads.filter((l) => l.currentOperator === 'BSNL').length;
  const other = allLeads.filter((l) => !['Airtel', 'Jio', 'BSNL'].includes(l.currentOperator)).length;

  // Connection type
  const prepaid = allLeads.filter((l) => l.connectionType === 'Prepaid').length;
  const postpaid = allLeads.filter((l) => l.connectionType === 'Postpaid').length;
  const corporate = allLeads.filter((l) => l.connectionType === 'Corporate').length;

  // Group by user
  const userMap = new Map<string, { uid: string; name: string; email: string; total: number; ported: number }>();
  allLeads.forEach((l) => {
    const key = l.createdByUid || 'unknown';
    const entry = userMap.get(key) || {
      uid: key,
      name: l.createdByName || l.createdByEmail?.split('@')[0] || 'User',
      email: l.createdByEmail || '',
      total: 0,
      ported: 0,
    };
    entry.total += 1;
    if (l.status === 'Ported') entry.ported += 1;
    userMap.set(key, entry);
  });

  const leaderboard = Array.from(userMap.values()).sort((a, b) => b.ported - a.ported || b.total - a.total);

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto pb-24">
      {/* Overview Banner */}
      <div className="bg-gradient-to-r from-red-600 to-red-800 rounded-2xl p-5 text-white shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold">{t.adminAnalytics.title}</h2>
          </div>
          <p className="text-xs text-red-100 mt-1">
            {t.adminAnalytics.subtitle}
          </p>
        </div>

        <div className="bg-white/10 border border-white/20 px-4 py-2 rounded-xl text-center">
          <div className="text-[10px] text-red-200 uppercase font-bold tracking-wider">{t.adminAnalytics.overallSuccessRate}</div>
          <div className="text-2xl font-black text-amber-400">{conversionRate}%</div>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs">
          <div className="text-[10px] uppercase font-bold text-gray-400">{t.adminAnalytics.totalLeadsCard}</div>
          <div className="text-xl font-bold text-gray-900 mt-1 flex items-center justify-between">
            <span>{total}</span>
            <Users className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-[10px] text-gray-500 mt-1">{t.adminAnalytics.totalLeadsCardSub}</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs">
          <div className="text-[10px] uppercase font-bold text-purple-600">{t.adminAnalytics.upcCard}</div>
          <div className="text-xl font-bold text-purple-700 mt-1 flex items-center justify-between">
            <span>{upc}</span>
            <Smartphone className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-[10px] text-purple-600 mt-1">{total > 0 ? Math.round((upc / total) * 100) : 0}% ({t.adminAnalytics.upcCardSub})</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs">
          <div className="text-[10px] uppercase font-bold text-emerald-600">{t.adminAnalytics.portedCard}</div>
          <div className="text-xl font-bold text-emerald-700 mt-1 flex items-center justify-between">
            <span>{ported}</span>
            <CheckCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-[10px] text-emerald-600 mt-1">{t.adminAnalytics.portedCardSub}</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs">
          <div className="text-[10px] uppercase font-bold text-amber-600">{t.adminAnalytics.inProgressCard}</div>
          <div className="text-xl font-bold text-amber-700 mt-1 flex items-center justify-between">
            <span>{simAllocated + ekyc}</span>
            <TrendingUp className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-[10px] text-amber-600 mt-1">{t.adminAnalytics.inProgressCardSub}</div>
        </div>
      </div>

      {/* Customer Engagement & Growth Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-4 text-white shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-blue-100 uppercase tracking-wider block">
              {language === 'hi' ? 'कुल नए ग्राहक (Total New Customers)' : 'Total New Customers'}
            </span>
            <div className="text-2xl font-black">{totalNewCustomers}</div>
            <p className="text-[10px] text-blue-100/90">
              {language === 'hi' ? 'पंजीकृत उपभोक्ता खाते' : 'Registered customer profiles'}
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
            <UserPlus className="w-5 h-5 text-white" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-4 text-white shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-emerald-100 uppercase tracking-wider block">
              {language === 'hi' ? 'लॉग इन किए ग्राहक (Total Customers Logged In)' : 'Total Customers Logged In'}
            </span>
            <div className="text-2xl font-black">{totalCustomersLoggedIn}</div>
            <p className="text-[10px] text-emerald-100/90">
              {totalNewCustomers > 0 ? Math.round((totalCustomersLoggedIn / totalNewCustomers) * 100) : 0}% {language === 'hi' ? 'सक्रिय लॉगिन' : 'active customers with login activity'}
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>

      {/* MNP Conversion Pipeline Funnel */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-2xs">
        <h3 className="text-xs font-bold text-gray-800 mb-3 flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-red-600" />
          <span>{t.leadDetails.portingProgressTitle}</span>
        </h3>

        <div className="space-y-2 text-xs">
          <div>
            <div className="flex justify-between text-gray-700 mb-1">
              <span className="font-semibold">1. {t.leadDetails.stNew}</span>
              <span className="font-bold">{newLeads} ({total > 0 ? Math.round((newLeads / total) * 100) : 0}%)</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${total > 0 ? (newLeads / total) * 100 : 0}%` }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-purple-700 mb-1">
              <span className="font-semibold">2. {t.leadDetails.stUpc}</span>
              <span className="font-bold">{upc} ({total > 0 ? Math.round((upc / total) * 100) : 0}%)</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-purple-500 h-2 rounded-full transition-all"
                style={{ width: `${total > 0 ? (upc / total) * 100 : 0}%` }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-indigo-700 mb-1">
              <span className="font-semibold">3. {t.leadDetails.stSim}</span>
              <span className="font-bold">{simAllocated} ({total > 0 ? Math.round((simAllocated / total) * 100) : 0}%)</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-indigo-500 h-2 rounded-full transition-all"
                style={{ width: `${total > 0 ? (simAllocated / total) * 100 : 0}%` }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-amber-700 mb-1">
              <span className="font-semibold">4. {t.leadDetails.stEkyc}</span>
              <span className="font-bold">{ekyc} ({total > 0 ? Math.round((ekyc / total) * 100) : 0}%)</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-amber-500 h-2 rounded-full transition-all"
                style={{ width: `${total > 0 ? (ekyc / total) * 100 : 0}%` }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-emerald-700 mb-1">
              <span className="font-semibold">5. {t.leadDetails.stPorted}</span>
              <span className="font-bold">{ported} ({total > 0 ? Math.round((ported / total) * 100) : 0}%)</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all"
                style={{ width: `${total > 0 ? (ported / total) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Operator Migration breakdown & Type Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Churn from other operators */}
        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-2xs">
          <h3 className="text-xs font-bold text-gray-800 mb-2 flex items-center gap-1.5">
            <Building className="w-4 h-4 text-red-600" />
            <span>{t.adminAnalytics.operatorBreakdownTitle}</span>
          </h3>

          <div className="space-y-2 text-xs pt-1">
            <div className="flex items-center justify-between p-2 bg-red-50/70 rounded-xl border border-red-100">
              <span className="font-bold text-red-900">Airtel → Vi</span>
              <span className="font-black text-red-700">{airtel} {t.filters.leadsCountPlural}</span>
            </div>

            <div className="flex items-center justify-between p-2 bg-blue-50/70 rounded-xl border border-blue-100">
              <span className="font-bold text-blue-900">Jio → Vi</span>
              <span className="font-black text-blue-700">{jio} {t.filters.leadsCountPlural}</span>
            </div>

            <div className="flex items-center justify-between p-2 bg-emerald-50/70 rounded-xl border border-emerald-100">
              <span className="font-bold text-emerald-900">BSNL → Vi</span>
              <span className="font-black text-emerald-700">{bsnl} {t.filters.leadsCountPlural}</span>
            </div>

            {other > 0 && (
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded-xl border border-gray-200">
                <span className="font-bold text-gray-700">{t.filters.otherOperator} → Vi</span>
                <span className="font-black text-gray-900">{other} {t.filters.leadsCountPlural}</span>
              </div>
            )}
          </div>
        </div>

        {/* Connection Type Breakdown */}
        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-2xs">
          <h3 className="text-xs font-bold text-gray-800 mb-2 flex items-center gap-1.5">
            <PieChart className="w-4 h-4 text-amber-600" />
            <span>{t.adminAnalytics.connectionTypesTitle}</span>
          </h3>

          <div className="space-y-2 text-xs pt-1">
            <div className="flex items-center justify-between p-2 bg-amber-50/70 rounded-xl border border-amber-200">
              <div>
                <span className="font-bold text-amber-900">{t.adminAnalytics.prepaidLabel}</span>
              </div>
              <span className="font-black text-amber-900 text-sm">{prepaid}</span>
            </div>

            <div className="flex items-center justify-between p-2 bg-purple-50/70 rounded-xl border border-purple-200">
              <div>
                <span className="font-bold text-purple-900">{t.adminAnalytics.postpaidLabel}</span>
              </div>
              <span className="font-black text-purple-900 text-sm">{postpaid}</span>
            </div>

            <div className="flex items-center justify-between p-2 bg-indigo-50/70 rounded-xl border border-indigo-200">
              <div>
                <span className="font-bold text-indigo-900">{t.adminAnalytics.corporateLabel}</span>
              </div>
              <span className="font-black text-indigo-900 text-sm">{corporate}</span>
            </div>
          </div>
        </div>
      </div>

      {/* User Leaderboard */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-500" />
            <span>{t.adminAnalytics.leaderboardTitle}</span>
          </h3>
          <span className="text-[10px] text-gray-500 font-medium">{t.adminAnalytics.leaderboardSub}</span>
        </div>

        <div className="space-y-2">
          {leaderboard.map((person, index) => {
            const rate = person.total > 0 ? Math.round((person.ported / person.total) * 100) : 0;
            return (
              <div
                key={person.uid}
                className="flex items-center justify-between p-2.5 rounded-xl border border-gray-100 hover:border-gray-200 bg-gray-50/60 transition-all text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs ${
                      index === 0
                        ? 'bg-amber-400 text-amber-950'
                        : index === 1
                        ? 'bg-gray-300 text-gray-800'
                        : index === 2
                        ? 'bg-amber-700 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {index + 1}
                  </div>

                  <div>
                    <span className="font-bold text-gray-900">{person.name}</span>
                    <span className="text-[10px] text-gray-400 ml-1.5">({person.email})</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-bold text-emerald-700">{person.ported} {t.stats.ported}</div>
                    <div className="text-[10px] text-gray-500">{person.total} {t.stats.totalLeads} • {rate}%</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onFilterByUser(person.uid)}
                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title={t.adminAnalytics.viewLeadsBtn}
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
