import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { 
  PortalConfig, 
  PortalBanner, 
  PortalOfferItem, 
  PortalLogoConfig, 
  PortalAdminHelp, 
  PortalTexts,
  AppUpdateConfig
} from '../types';
import { DEFAULT_APP_UPDATE_CONFIG } from './appUpdateService';

/**
 * Recursively removes undefined values to ensure Firestore payloads are clean and valid
 */
function cleanPayloadForFirestore(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj.map(cleanPayloadForFirestore).filter((item) => item !== undefined);
  }
  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = cleanPayloadForFirestore(value);
      }
    }
    return cleaned;
  }
  return obj;
}

export const DEFAULT_PORTAL_CONFIG: PortalConfig = {
  logo: {
    type: 'symbol',
    text: 'Vi',
    subtext: '4G / 5G Plus • Mehkar Doorstep Service',
    symbol: 'V!'
  },
  banners: [
    {
      id: 'banner_primary',
      title: 'VI 5G READY MEHKAR',
      subtitle: 'Airtel / Jio / BSNL to Vi Porting - Free Doorstep Delivery & Instant KYC in Mehkar',
      badge: 'PROMOTIONAL OFFER',
      imageUrl: '',
      bgGradient: 'from-red-600 via-red-700 to-red-800',
      ctaText: 'Open Porting Booking Form',
      ctaAction: 'book_porting',
      enabled: true,
      order: 1
    }
  ],
  offers: [
    {
      id: 'offer_primary',
      heading: 'VI 5G READY MEHKAR',
      badge: 'PROMOTIONAL OFFER',
      price: '₹398 FREE',
      validity: '28 DAYS',
      items: [
        'VI PORT FREE FREE',
        'AIRTEL / JIO / BSNL TO VI TRANSFER',
        '₹398 KA RECHARGE FREE FREE',
        'UNLIMITED DATA',
        'UNLIMITED CALL',
        '28 DIN TAK VALIDITY',
        'FREE PORTING - AASAN PORT',
        'DOCUMENT ONLY AADHAAR CARD',
        '16 SAAL COMPLETE'
      ],
      disclaimer: 'Admin-configured promotional information (Doorstep MNP Mehkar). Terms and KYC verification apply.',
      enabled: true,
      order: 1
    }
  ],
  adminHelp: {
    helpNumber: '9175601497',
    callNumber: '9175601497',
    whatsappNumber: '9175601497',
    supportTitle: 'VI Porting / Home Service Contact',
    supportHours: '8:00 AM - 9:00 PM (Daily)',
    fixedServiceArea: 'Mehkar Taluka, Buldhana, Maharashtra - 443301',
    emergencyNotice: 'Doorstep SIM Delivery available across all villages of Mehkar taluka.'
  },
  texts: {
    heroHeading: 'VI 5G READY MEHKAR',
    heroSubheading: 'Special Doorstep MNP Offer for Mehkar Taluka customers',
    serviceAreaNotice: 'Fixed Service Area: Maharashtra → Buldhana → Mehkar → 443301',
    announcement: 'Special Doorstep MNP Offer: Port to Vi and get 28 Days Unlimited Recharge Free!'
  },
  appUpdate: DEFAULT_APP_UPDATE_CONFIG,
  updatedAt: new Date().toISOString()
};

const SETTINGS_COLLECTION = 'portal_settings';
const MAIN_CONFIG_DOC = 'main_config';
const CACHE_STORAGE_KEY = 'vi_portal_config_cache_v2';

/**
 * Read cached configuration from localStorage
 */
function getCachedConfig(): PortalConfig {
  try {
    const raw = localStorage.getItem(CACHE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_PORTAL_CONFIG,
        ...parsed,
        logo: { ...DEFAULT_PORTAL_CONFIG.logo, ...(parsed.logo || {}) },
        adminHelp: { ...DEFAULT_PORTAL_CONFIG.adminHelp, ...(parsed.adminHelp || {}) },
        texts: { ...DEFAULT_PORTAL_CONFIG.texts, ...(parsed.texts || {}) },
        appUpdate: { ...DEFAULT_APP_UPDATE_CONFIG, ...(parsed.appUpdate || {}) },
        banners: Array.isArray(parsed.banners) && parsed.banners.length > 0 ? parsed.banners : DEFAULT_PORTAL_CONFIG.banners,
        offers: Array.isArray(parsed.offers) && parsed.offers.length > 0 ? parsed.offers : DEFAULT_PORTAL_CONFIG.offers,
      };
    }
  } catch (e) {
    console.warn('Failed to read portal config from cache:', e);
  }
  return DEFAULT_PORTAL_CONFIG;
}

/**
 * Save configuration to localStorage cache and notify local listeners
 */
function setCachedConfig(config: PortalConfig) {
  try {
    localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(config));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('vi-portal-config-updated', { detail: config }));
    }
  } catch (e) {
    console.warn('Failed to cache portal config:', e);
  }
}

/**
 * Fetch portal configuration from Firestore with local fallback
 */
export async function getPortalConfig(): Promise<PortalConfig> {
  if (!db) {
    return getCachedConfig();
  }
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, MAIN_CONFIG_DOC);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as Partial<PortalConfig>;
      const merged: PortalConfig = {
        ...DEFAULT_PORTAL_CONFIG,
        ...data,
        logo: { ...DEFAULT_PORTAL_CONFIG.logo, ...(data.logo || {}) },
        adminHelp: { ...DEFAULT_PORTAL_CONFIG.adminHelp, ...(data.adminHelp || {}) },
        texts: { ...DEFAULT_PORTAL_CONFIG.texts, ...(data.texts || {}) },
        appUpdate: { ...DEFAULT_APP_UPDATE_CONFIG, ...(data.appUpdate || {}) },
        banners: Array.isArray(data.banners) && data.banners.length > 0 ? data.banners : DEFAULT_PORTAL_CONFIG.banners,
        offers: Array.isArray(data.offers) && data.offers.length > 0 ? data.offers : DEFAULT_PORTAL_CONFIG.offers,
      };
      setCachedConfig(merged);
      return merged;
    }
  } catch (err) {
    console.warn('Could not fetch portal config from Firestore:', err);
  }
  return getCachedConfig();
}

/**
 * Real-time subscription to portal configuration updates
 */
export function subscribeToPortalConfig(
  callback: (config: PortalConfig) => void
): () => void {
  // Immediately call with cached/default data so UI is instantly responsive
  callback(getCachedConfig());

  // Listen to local update events (instant reactivity across components in same window)
  const handleLocalUpdate = (e: Event) => {
    try {
      const customEvent = e as CustomEvent<PortalConfig>;
      if (customEvent.detail) {
        callback(customEvent.detail);
      }
    } catch (err) {
      console.warn('Local portal config event error:', err);
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('vi-portal-config-updated', handleLocalUpdate);
  }

  let unsubscribeFirestore: () => void = () => {};

  if (db) {
    try {
      const docRef = doc(db, SETTINGS_COLLECTION, MAIN_CONFIG_DOC);
      unsubscribeFirestore = onSnapshot(
        docRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data() as Partial<PortalConfig>;
            const merged: PortalConfig = {
              ...DEFAULT_PORTAL_CONFIG,
              ...data,
              logo: { ...DEFAULT_PORTAL_CONFIG.logo, ...(data.logo || {}) },
              adminHelp: { ...DEFAULT_PORTAL_CONFIG.adminHelp, ...(data.adminHelp || {}) },
              texts: { ...DEFAULT_PORTAL_CONFIG.texts, ...(data.texts || {}) },
              appUpdate: { ...DEFAULT_APP_UPDATE_CONFIG, ...(data.appUpdate || {}) },
              banners: Array.isArray(data.banners) && data.banners.length > 0 ? data.banners : DEFAULT_PORTAL_CONFIG.banners,
              offers: Array.isArray(data.offers) && data.offers.length > 0 ? data.offers : DEFAULT_PORTAL_CONFIG.offers,
            };
            setCachedConfig(merged);
            callback(merged);
          } else {
            callback(getCachedConfig());
          }
        },
        (err) => {
          console.warn('Real-time portal config subscription notice:', err);
          callback(getCachedConfig());
        }
      );
    } catch (err) {
      console.warn('Failed to subscribe to portal config:', err);
    }
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('vi-portal-config-updated', handleLocalUpdate);
    }
    unsubscribeFirestore();
  };
}

/**
 * Save complete portal configuration (Admin only)
 */
export async function savePortalConfig(
  configUpdates: Partial<PortalConfig>,
  adminUser?: { uid?: string; email?: string; displayName?: string }
): Promise<PortalConfig> {
  const current = await getPortalConfig();
  const currentAuthUser = auth?.currentUser;

  const effectiveUid = adminUser?.uid || currentAuthUser?.uid || 'admin';
  const effectiveEmail = adminUser?.email || currentAuthUser?.email || adminUser?.displayName || 'Admin';

  // Normalize appUpdate if included
  const sanitizedUpdates = { ...configUpdates };
  if (sanitizedUpdates.appUpdate) {
    const existingAppUpdate = current.appUpdate || DEFAULT_APP_UPDATE_CONFIG;
    sanitizedUpdates.appUpdate = {
      ...existingAppUpdate,
      ...sanitizedUpdates.appUpdate,
      latestVersionName: String(sanitizedUpdates.appUpdate.latestVersionName ?? existingAppUpdate.latestVersionName).trim(),
      latestVersionCode: parseInt(String(sanitizedUpdates.appUpdate.latestVersionCode ?? existingAppUpdate.latestVersionCode), 10) || existingAppUpdate.latestVersionCode,
      apkDownloadUrl: String(sanitizedUpdates.appUpdate.apkDownloadUrl ?? existingAppUpdate.apkDownloadUrl).trim(),
      updateMessage: String(sanitizedUpdates.appUpdate.updateMessage ?? existingAppUpdate.updateMessage).trim(),
      releaseNotes: String(sanitizedUpdates.appUpdate.releaseNotes ?? (existingAppUpdate.releaseNotes || '')).trim(),
      forceUpdate: Boolean(sanitizedUpdates.appUpdate.forceUpdate),
      enabled: sanitizedUpdates.appUpdate.enabled !== false,
      releasedAt: sanitizedUpdates.appUpdate.releasedAt || new Date().toISOString()
    };
  }

  const updated: PortalConfig = {
    ...current,
    ...sanitizedUpdates,
    updatedAt: new Date().toISOString(),
    updatedBy: effectiveUid,
    updatedByEmail: effectiveEmail
  };

  setCachedConfig(updated);

  if (db) {
    try {
      const docRef = doc(db, SETTINGS_COLLECTION, MAIN_CONFIG_DOC);
      const cleanData = cleanPayloadForFirestore(updated);
      await setDoc(docRef, cleanData, { merge: true });
    } catch (err: any) {
      console.warn('Notice saving portal config to Firestore (saved in local storage):', err);
      // If error is permission denied or offline, do not crash the admin action
      // Local cache already updated and active for live portal
      if (err?.code === 'permission-denied' || (err?.message && err.message.includes('permission'))) {
        console.warn('Portal config updated in local cache. Ensure you are signed in as Primary Owner (raheema62038@gmail.com) for cloud sync.');
      } else {
        throw err;
      }
    }
  }

  return updated;
}

/**
 * Update Admin Help Numbers
 */
export async function updateAdminHelp(
  adminHelp: Partial<PortalAdminHelp>,
  adminUser?: { uid?: string; email?: string; displayName?: string }
): Promise<PortalConfig> {
  const current = await getPortalConfig();
  return savePortalConfig(
    {
      adminHelp: {
        ...current.adminHelp,
        ...adminHelp
      }
    },
    adminUser
  );
}

/**
 * Update Portal Offers
 */
export async function updatePortalOffers(
  offers: PortalOfferItem[],
  adminUser?: { uid?: string; email?: string; displayName?: string }
): Promise<PortalConfig> {
  return savePortalConfig({ offers }, adminUser);
}

/**
 * Update Portal Banners
 */
export async function updatePortalBanners(
  banners: PortalBanner[],
  adminUser?: { uid?: string; email?: string; displayName?: string }
): Promise<PortalConfig> {
  return savePortalConfig({ banners }, adminUser);
}

/**
 * Update Portal Logo
 */
export async function updatePortalLogo(
  logo: Partial<PortalLogoConfig>,
  adminUser?: { uid?: string; email?: string; displayName?: string }
): Promise<PortalConfig> {
  const current = await getPortalConfig();
  return savePortalConfig(
    {
      logo: {
        ...current.logo,
        ...logo
      }
    },
    adminUser
  );
}

/**
 * Update Portal Texts
 */
export async function updatePortalTexts(
  texts: Partial<PortalTexts>,
  adminUser?: { uid?: string; email?: string; displayName?: string }
): Promise<PortalConfig> {
  const current = await getPortalConfig();
  return savePortalConfig(
    {
      texts: {
        ...current.texts,
        ...texts
      }
    },
    adminUser
  );
}

/**
 * Update App Version & APK Update Settings (Admin only)
 */
export async function updateAppUpdateConfig(
  appUpdate: Partial<AppUpdateConfig>,
  adminUser?: { uid?: string; email?: string; displayName?: string }
): Promise<PortalConfig> {
  const current = await getPortalConfig();
  const existingUpdate = current.appUpdate || DEFAULT_APP_UPDATE_CONFIG;
  return savePortalConfig(
    {
      appUpdate: {
        ...existingUpdate,
        ...appUpdate
      }
    },
    adminUser
  );
}
