import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { 
  PortalConfig, 
  PortalBanner, 
  PortalOfferItem, 
  PortalLogoConfig, 
  PortalAdminHelp, 
  PortalTexts 
} from '../types';

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
 * Save configuration to localStorage cache
 */
function setCachedConfig(config: PortalConfig) {
  try {
    localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(config));
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

  if (!db) {
    return () => {};
  }

  try {
    const docRef = doc(db, SETTINGS_COLLECTION, MAIN_CONFIG_DOC);
    const unsubscribe = onSnapshot(
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
    return unsubscribe;
  } catch (err) {
    console.warn('Failed to subscribe to portal config:', err);
    return () => {};
  }
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

  const updated: PortalConfig = {
    ...current,
    ...configUpdates,
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
    } catch (err) {
      console.error('Error saving portal config to Firestore:', err);
      throw err;
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
