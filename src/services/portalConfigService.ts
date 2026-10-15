import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
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
  territoryRules: {
    multiAdminMode: 'shared_pool',
    updatedAt: new Date().toISOString()
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
    if (typeof window !== 'undefined' && 'localStorage' in window) {
      const raw = window.localStorage.getItem(CACHE_STORAGE_KEY);
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
    if (typeof window !== 'undefined' && 'localStorage' in window) {
      window.localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(config));
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('vi-portal-config-updated', { detail: config }));
    }
  } catch (e) {
    console.warn('Failed to cache portal config:', e);
  }
}

const SYSTEM_PORTAL_SYNC_DOC = 'system_portal_sync_config';

function mergePortalConfig(data: Partial<PortalConfig> | null | undefined): PortalConfig {
  const safeData = data || {};
  const mergedAdminHelp = {
    ...DEFAULT_PORTAL_CONFIG.adminHelp,
    ...(safeData.adminHelp || {}),
  };
  const rawAny = safeData as any;
  if (rawAny.helpNumber && !safeData.adminHelp?.callNumber) {
    mergedAdminHelp.callNumber = rawAny.helpNumber;
  }
  if (rawAny.whatsappNumber && !safeData.adminHelp?.whatsappNumber) {
    mergedAdminHelp.whatsappNumber = rawAny.whatsappNumber;
  }

  return {
    ...DEFAULT_PORTAL_CONFIG,
    ...safeData,
    logo: { ...DEFAULT_PORTAL_CONFIG.logo, ...(safeData.logo || {}) },
    adminHelp: mergedAdminHelp,
    texts: { ...DEFAULT_PORTAL_CONFIG.texts, ...(safeData.texts || {}) },
    territoryRules: { ...DEFAULT_PORTAL_CONFIG.territoryRules, ...(safeData.territoryRules || {}) },
    appUpdate: { ...DEFAULT_APP_UPDATE_CONFIG, ...(safeData.appUpdate || {}) },
    banners: Array.isArray(safeData.banners) && safeData.banners.length > 0 ? safeData.banners : DEFAULT_PORTAL_CONFIG.banners,
    offers: Array.isArray(safeData.offers) && safeData.offers.length > 0 ? safeData.offers : DEFAULT_PORTAL_CONFIG.offers,
  };
}

function parseSystemSyncDoc(docData: any): PortalConfig | null {
  if (!docData) return null;
  if (typeof docData.configJson === 'string') {
    try {
      const parsed = JSON.parse(docData.configJson);
      return mergePortalConfig(parsed);
    } catch (_) {}
  }
  if (docData.logo || docData.banners || docData.offers || docData.adminHelp) {
    return mergePortalConfig(docData);
  }
  return null;
}

/**
 * Fetch portal configuration from Firestore and backend sync API with local fallback
 */
export async function getPortalConfig(): Promise<PortalConfig> {
  if (db) {
    try {
      const syncRef = doc(db, 'leads', SYSTEM_PORTAL_SYNC_DOC);
      const syncSnap = await getDoc(syncRef);
      if (syncSnap.exists()) {
        const parsed = parseSystemSyncDoc(syncSnap.data());
        if (parsed) {
          setCachedConfig(parsed);
          return parsed;
        }
      }
    } catch (_) {}

    try {
      const docRef = doc(db, SETTINGS_COLLECTION, MAIN_CONFIG_DOC);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const merged = mergePortalConfig(snap.data() as Partial<PortalConfig>);
        setCachedConfig(merged);
        return merged;
      }
    } catch (_) {}
  }

  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/portal-sync', { cache: 'no-store' });
      if (res.ok) {
        const payload = await res.json();
        if (payload?.portalConfig) {
          const merged = mergePortalConfig(payload.portalConfig);
          setCachedConfig(merged);
          return merged;
        }
      }
    } catch (_) {}
  }

  return getCachedConfig();
}

/**
 * Real-time subscription to portal configuration updates across Firestore, SSE, and tabs
 */
export function subscribeToPortalConfig(
  callback: (config: PortalConfig) => void
): () => void {
  let lastSerialized = '';
  const emitIfChanged = (cfg: PortalConfig) => {
    const merged = mergePortalConfig(cfg);
    const serialized = JSON.stringify(merged);
    if (serialized !== lastSerialized) {
      lastSerialized = serialized;
      callback(merged);
    }
  };

  // 1. Immediately emit cached/default data so UI is instantly responsive
  emitIfChanged(getCachedConfig());

  // 2. Listen to local update events & cross-tab storage changes
  const handleLocalUpdate = (e: Event) => {
    try {
      const customEvent = e as CustomEvent<PortalConfig>;
      if (customEvent.detail) {
        emitIfChanged(customEvent.detail);
      }
    } catch (_) {}
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === CACHE_STORAGE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        emitIfChanged(parsed);
      } catch (_) {}
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('vi-portal-config-updated', handleLocalUpdate);
    window.addEventListener('storage', handleStorageEvent);
  }

  // 3. Subscribe to Firestore onSnapshot (re-attaching automatically when auth state changes)
  let unsubscribeSyncDoc: () => void = () => {};
  let unsubscribeSettingsDoc: () => void = () => {};

  const attachFirestoreListeners = () => {
    unsubscribeSyncDoc();
    unsubscribeSettingsDoc();
    if (!db) return;

    try {
      const syncRef = doc(db, 'leads', SYSTEM_PORTAL_SYNC_DOC);
      unsubscribeSyncDoc = onSnapshot(
        syncRef,
        (snap) => {
          if (snap.exists()) {
            const parsed = parseSystemSyncDoc(snap.data());
            if (parsed) {
              setCachedConfig(parsed);
              emitIfChanged(parsed);
            }
          }
        },
        () => {}
      );
    } catch (_) {}

    try {
      const docRef = doc(db, SETTINGS_COLLECTION, MAIN_CONFIG_DOC);
      unsubscribeSettingsDoc = onSnapshot(
        docRef,
        (snap) => {
          if (snap.exists()) {
            const merged = mergePortalConfig(snap.data() as Partial<PortalConfig>);
            setCachedConfig(merged);
            emitIfChanged(merged);
          }
        },
        () => {}
      );
    } catch (_) {}
  };

  attachFirestoreListeners();

  let unsubscribeAuth: () => void = () => {};
  if (auth) {
    unsubscribeAuth = onAuthStateChanged(auth, () => {
      attachFirestoreListeners();
    });
  }

  // 4. Connect to backend SSE stream (/api/portal-sync/stream) + initial fetch & periodic sync
  let eventSource: EventSource | null = null;
  let pollInterval: ReturnType<typeof setInterval> | null = null;

  const pullFromBackend = async () => {
    try {
      const res = await fetch('/api/portal-sync', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data?.portalConfig) {
          const merged = mergePortalConfig(data.portalConfig);
          setCachedConfig(merged);
          emitIfChanged(merged);
        }
      }
    } catch (_) {}
  };

  if (typeof window !== 'undefined') {
    pullFromBackend();

    if (typeof EventSource !== 'undefined') {
      try {
        eventSource = new EventSource('/api/portal-sync/stream');
        eventSource.onmessage = (ev) => {
          try {
            const data = JSON.parse(ev.data);
            if (data?.portalConfig) {
              const merged = mergePortalConfig(data.portalConfig);
              setCachedConfig(merged);
              emitIfChanged(merged);
            }
          } catch (_) {}
        };
      } catch (_) {}
    }

    pollInterval = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        pullFromBackend();
      }
    }, 5000);
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('vi-portal-config-updated', handleLocalUpdate);
      window.removeEventListener('storage', handleStorageEvent);
    }
    unsubscribeSyncDoc();
    unsubscribeSettingsDoc();
    unsubscribeAuth();
    if (eventSource) {
      try {
        eventSource.close();
      } catch (_) {}
    }
    if (pollInterval) {
      clearInterval(pollInterval);
    }
  };
}

/**
 * Save complete portal configuration (Admin only) and broadcast to all connected Customer Apps
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

  const updated: PortalConfig = mergePortalConfig({
    ...current,
    ...sanitizedUpdates,
    updatedAt: new Date().toISOString(),
    updatedBy: effectiveUid,
    updatedByEmail: effectiveEmail
  });

  setCachedConfig(updated);

  // 1. Sync to shared online Firestore (leads/system_portal_sync_config)
  if (db) {
    try {
      const syncRef = doc(db, 'leads', SYSTEM_PORTAL_SYNC_DOC);
      await setDoc(
        syncRef,
        {
          isSystemConfig: true,
          configType: 'portal_config',
          configJson: JSON.stringify(cleanPayloadForFirestore(updated)),
          updatedAt: updated.updatedAt,
          updatedBy: effectiveEmail,
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Firestore leads sync notice:', err);
    }

    try {
      const docRef = doc(db, SETTINGS_COLLECTION, MAIN_CONFIG_DOC);
      const cleanData = cleanPayloadForFirestore(updated);
      await setDoc(docRef, cleanData, { merge: true });
    } catch (_) {}
  }

  // 2. Sync to backend /api/portal-sync for instant SSE broadcast & unauthenticated client sync
  if (typeof window !== 'undefined') {
    try {
      await fetch('/api/portal-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portalConfig: updated }),
      });
    } catch (_) {}
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
