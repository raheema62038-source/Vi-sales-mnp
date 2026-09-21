import React from 'react';
import { 
  LogOut, 
  Database, 
  RotateCw, 
  Signal,
  Shield,
  Briefcase,
  User,
  Globe,
  Crown,
  CheckCircle2,
  Smartphone,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

interface HeaderProps {
  onOpenConfig: () => void;
  onRefresh: () => void;
  isFirestoreConnected: boolean;
  totalLeadsCount: number;
  activeAdminTab?: 'leads' | 'team' | 'analytics';
  onSelectAdminTab?: (tab: 'leads' | 'team' | 'analytics') => void;
  onOpenApkModal?: () => void;
  onOpenEditOffer?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenConfig,
  onRefresh,
  isFirestoreConnected,
  totalLeadsCount,
  activeAdminTab = 'leads',
  onSelectAdminTab,
  onOpenApkModal,
  onOpenEditOffer,
}) => {
  const { user, userProfile, role, isAdmin, isRubiOwner, logout } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();

  const leadsCountText = isAdmin
    ? t.header.totalTeamLeads.replace('{count}', totalLeadsCount.toString())
    : (language === 'hi' ? `मेरे अनुरोध (${totalLeadsCount})` : `My Requests (${totalLeadsCount})`);

  return (
    <header className="sticky top-0 z-30 bg-red-600 text-white shadow-md font-sans">
      {/* Android Mobile Status Bar simulation */}
      <div className="bg-red-700/90 px-4 py-1 text-[11px] flex items-center justify-between font-medium border-b border-red-500/30">
        <div className="flex items-center gap-1.5">
          <span className="font-bold tracking-wider text-amber-300">Vi</span>
          <span>{t.header.brandSubtitle}</span>
          <Signal className="w-3 h-3 text-white inline-block" />
        </div>

        {/* Role badge in status bar */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-red-800/80 px-2 py-0.5 rounded-full text-[10px]">
            {isRubiOwner ? (
              <>
                <Crown className="w-3 h-3 text-amber-300" />
                <span className="font-bold text-amber-300">Owner Admin</span>
              </>
            ) : isAdmin ? (
              <>
                <Shield className="w-3 h-3 text-amber-300" />
                <span className="font-bold text-amber-300">{t.header.adminMode}</span>
              </>
            ) : (
              <>
                <User className="w-3 h-3 text-emerald-300" />
                <span className="font-bold text-emerald-200">{language === 'hi' ? 'ग्राहक पोर्टल' : 'Customer Portal'}</span>
              </>
            )}
          </div>
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
        </div>
      </div>

      {/* Main AppBar */}
      <div className="px-3 sm:px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Vi Brand Symbol */}
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-white flex items-center justify-center shadow-xs border-2 border-amber-400 shrink-0">
            <span className="text-red-600 font-black text-xl tracking-tighter">
              V<span className="text-amber-500 text-lg">!</span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-black text-sm sm:text-base tracking-tight leading-tight">{t.common.appName}</h1>
              <span
                className={`text-[9px] sm:text-[10px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                  isRubiOwner
                    ? 'bg-amber-300 text-amber-950 font-black shadow-2xs'
                    : isAdmin 
                    ? 'bg-amber-400 text-red-950' 
                    : 'bg-emerald-500 text-white font-bold'
                }`}
              >
                {isRubiOwner 
                  ? '👑 OWNER' 
                  : isAdmin 
                  ? t.header.adminBadge 
                  : (language === 'hi' ? '👤 ग्राहक' : '👤 CUSTOMER')}
              </span>
            </div>
            <p className="text-[11px] text-red-100 flex items-center gap-1 mt-0.5">
              <span className="truncate max-w-[110px] sm:max-w-none">
                {userProfile?.displayName || user?.displayName || user?.phoneNumber || user?.email?.split('@')[0] || 'Customer'}
              </span>
              <span>•</span>
              <span className="font-semibold text-white">
                {leadsCountText}
              </span>
            </p>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1.5">
          {/* Admin Edit Offer Button (Admin / Owner only) */}
          {onOpenEditOffer && isAdmin && (
            <button
              id="admin-edit-offer-btn"
              type="button"
              onClick={onOpenEditOffer}
              title={language === 'hi' ? 'प्रमोशनल ऑफर एडिट करें (VI 5G READY MEHKAR)' : 'Edit Promotional Offer'}
              className="px-2.5 py-1.5 rounded-xl text-xs font-black bg-amber-400 hover:bg-amber-300 text-slate-950 flex items-center gap-1.5 transition-all active:scale-95 shadow-xs border border-amber-300 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-slate-950" />
              <span className="hidden sm:inline">
                {language === 'hi' ? 'ऑफर एडिट' : 'Edit Offer'}
              </span>
              <span className="sm:hidden">Offer</span>
            </button>
          )}

          {/* APK / App Download Button (Admin / Owner only) */}
          {onOpenApkModal && isAdmin && (
            <button
              type="button"
              onClick={onOpenApkModal}
              title={language === 'hi' ? 'Android APK व ऐप डाउनलोड करें' : 'Download Android APK & App'}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-300 text-red-950 flex items-center gap-1.5 transition-all active:scale-95 shadow-xs border border-amber-300 animate-bounce sm:animate-none"
            >
              <Smartphone className="w-3.5 h-3.5 text-red-900" />
              <span className="font-extrabold tracking-wide hidden sm:inline">
                {language === 'hi' ? 'APK डाउनलोड' : 'Download APK'}
              </span>
              <span className="font-extrabold tracking-wide sm:hidden">APK</span>
            </button>
          )}

          {/* Language Switcher Button 🇮🇳 HI / 🇬🇧 EN */}
          <button
            type="button"
            onClick={toggleLanguage}
            title={t.header.switchLangTooltip}
            className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-white/15 hover:bg-white/25 border border-white/30 flex items-center gap-1.5 text-white transition-all active:scale-95 shadow-xs"
          >
            <span className="text-sm leading-none">{language === 'hi' ? '🇮🇳' : '🇬🇧'}</span>
            <span className="font-extrabold tracking-wide">{language === 'hi' ? 'HI' : 'EN'}</span>
          </button>

          {/* Settings & Firestore Connection Badge */}
          <button
            type="button"
            onClick={onOpenConfig}
            title={t.header.settings}
            className={`px-2 py-1.5 rounded-xl text-[11px] font-semibold flex items-center gap-1 transition-all ${
              isFirestoreConnected 
                ? 'bg-red-700 text-emerald-300 border border-emerald-500/40 hover:bg-red-800' 
                : 'bg-amber-400 text-red-950 font-bold animate-pulse hover:bg-amber-300'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {isFirestoreConnected ? t.header.connected : t.header.setup}
            </span>
          </button>

          {/* Refresh button */}
          <button
            type="button"
            onClick={onRefresh}
            title={t.header.refresh}
            className="w-8 h-8 rounded-xl bg-red-700 hover:bg-red-800 flex items-center justify-center transition-colors active:scale-95"
          >
            <RotateCw className="w-3.5 h-3.5 text-white" />
          </button>

          {/* User Signout */}
          {user && (
            <button
              type="button"
              onClick={logout}
              title={`${t.header.logout} (${user.email || user.phoneNumber})`}
              className="w-8 h-8 rounded-xl bg-red-700 hover:bg-red-800 flex items-center justify-center transition-colors active:scale-95 text-red-100 hover:text-white"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Admin Multi-View Navigation Tabs (Only visible when logged in as Admin or Rubi Owner) */}
      {isAdmin && onSelectAdminTab && (
        <div className="bg-red-750 px-4 pt-1 flex gap-2 border-t border-red-500/30 overflow-x-auto">
          <button
            type="button"
            onClick={() => onSelectAdminTab('leads')}
            className={`py-2 px-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeAdminTab === 'leads'
                ? 'border-amber-400 text-white bg-red-700/50 rounded-t-lg'
                : 'border-transparent text-red-200 hover:text-white'
            }`}
          >
            {t.header.allLeadsTab}
          </button>
          <button
            type="button"
            onClick={() => onSelectAdminTab('team')}
            className={`py-2 px-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeAdminTab === 'team'
                ? 'border-amber-400 text-white bg-red-700/50 rounded-t-lg'
                : 'border-transparent text-red-200 hover:text-white'
            }`}
          >
            {t.header.teamTab}
          </button>
          <button
            type="button"
            onClick={() => onSelectAdminTab('analytics')}
            className={`py-2 px-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeAdminTab === 'analytics'
                ? 'border-amber-400 text-white bg-red-700/50 rounded-t-lg'
                : 'border-transparent text-red-200 hover:text-white'
            }`}
          >
            {t.header.analyticsTab}
          </button>
        </div>
      )}
    </header>
  );
};

