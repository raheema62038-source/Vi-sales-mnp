import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../firebase';
import { PromotionalOffer } from '../types';

export const DEFAULT_PROMOTIONAL_OFFER: PromotionalOffer = {
  id: 'current_offer',
  heading: 'VI 5G READY MEHKAR',
  badge: 'PROMOTIONAL OFFER',
  items: [
    'VI PORT FREE FREE',
    'AIRTEL / JIO / BSNL TO VI TRANSFER',
    '₹398 KA RECHARGE FREE FREE',
    'UNLIMITED DATA',
    'UNLIMITED CALL',
    '28 DIN TAK VALIDITY',
    'FREE PORTING - AASAN PORT PORTING',
    'DOCUMENT ONLY AADHAAR CARD',
    '16 SAAL COMPLETE'
  ],
  disclaimer: 'Admin-configured promotional information (Doorstep MNP Mehkar). Terms and KYC verification apply.',
  updatedAt: new Date().toISOString()
};

const OFFER_DOC_REF = 'offers';
const OFFER_DOC_ID = 'current_offer';
const SYSTEM_OFFER_SYNC_DOC = 'system_offer_sync_config';
const OFFER_CACHE_KEY = 'vi_sales_mnp_promo_offer_cache_v1';

function getCachedOffer(): PromotionalOffer {
  try {
    if (typeof window !== 'undefined' && 'localStorage' in window) {
      const raw = window.localStorage.getItem(OFFER_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return {
            ...DEFAULT_PROMOTIONAL_OFFER,
            ...parsed,
            id: OFFER_DOC_ID,
          };
        }
      }
    }
  } catch (_) {}
  return DEFAULT_PROMOTIONAL_OFFER;
}

function setCachedOffer(offer: PromotionalOffer) {
  try {
    if (typeof window !== 'undefined' && 'localStorage' in window) {
      window.localStorage.setItem(OFFER_CACHE_KEY, JSON.stringify(offer));
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('vi-offer-config-updated', { detail: offer }));
    }
  } catch (_) {}
}

function parseSystemOfferDoc(docData: any): PromotionalOffer | null {
  if (!docData) return null;
  if (typeof docData.configJson === 'string') {
    try {
      const parsed = JSON.parse(docData.configJson);
      if (parsed && typeof parsed === 'object') {
        return {
          ...DEFAULT_PROMOTIONAL_OFFER,
          ...parsed,
          id: OFFER_DOC_ID,
        };
      }
    } catch (_) {}
  }
  if (docData.heading || Array.isArray(docData.items)) {
    return {
      ...DEFAULT_PROMOTIONAL_OFFER,
      ...docData,
      id: OFFER_DOC_ID,
    };
  }
  return null;
}

/**
 * Fetch the current promotional offer from Firestore and backend sync API with fallback to cache/default
 */
export async function getPromotionalOffer(): Promise<PromotionalOffer> {
  if (db) {
    try {
      const syncRef = doc(db, 'leads', SYSTEM_OFFER_SYNC_DOC);
      const syncSnap = await getDoc(syncRef);
      if (syncSnap.exists()) {
        const parsed = parseSystemOfferDoc(syncSnap.data());
        if (parsed) {
          setCachedOffer(parsed);
          return parsed;
        }
      }
    } catch (_) {}

    try {
      const docRef = doc(db, OFFER_DOC_REF, OFFER_DOC_ID);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as PromotionalOffer;
        const merged = {
          ...DEFAULT_PROMOTIONAL_OFFER,
          ...data,
          id: OFFER_DOC_ID
        };
        setCachedOffer(merged);
        return merged;
      }
    } catch (_) {}
  }

  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/portal-sync', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data?.offerConfig) {
          const merged = {
            ...DEFAULT_PROMOTIONAL_OFFER,
            ...data.offerConfig,
            id: OFFER_DOC_ID,
          };
          setCachedOffer(merged);
          return merged;
        }
      }
    } catch (_) {}
  }

  return getCachedOffer();
}

/**
 * Subscribe to real-time updates for promotional offer across Firestore, SSE, and tabs
 */
export function subscribeToPromotionalOffer(
  callback: (offer: PromotionalOffer) => void
): () => void {
  let lastSerialized = '';
  const emitIfChanged = (offer: PromotionalOffer) => {
    const merged: PromotionalOffer = {
      ...DEFAULT_PROMOTIONAL_OFFER,
      ...offer,
      id: OFFER_DOC_ID,
    };
    const serialized = JSON.stringify(merged);
    if (serialized !== lastSerialized) {
      lastSerialized = serialized;
      callback(merged);
    }
  };

  // Immediately emit cached/default offer
  emitIfChanged(getCachedOffer());

  const handleLocalUpdate = (e: Event) => {
    try {
      const customEvent = e as CustomEvent<PromotionalOffer>;
      if (customEvent.detail) {
        emitIfChanged(customEvent.detail);
      }
    } catch (_) {}
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === OFFER_CACHE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        emitIfChanged(parsed);
      } catch (_) {}
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('vi-offer-config-updated', handleLocalUpdate);
    window.addEventListener('storage', handleStorageEvent);
  }

  let unsubscribeSyncDoc: () => void = () => {};
  let unsubscribeOfferDoc: () => void = () => {};

  const attachFirestoreListeners = () => {
    unsubscribeSyncDoc();
    unsubscribeOfferDoc();
    if (!db) return;

    try {
      const syncRef = doc(db, 'leads', SYSTEM_OFFER_SYNC_DOC);
      unsubscribeSyncDoc = onSnapshot(
        syncRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const parsed = parseSystemOfferDoc(snapshot.data());
            if (parsed) {
              setCachedOffer(parsed);
              emitIfChanged(parsed);
            }
          }
        },
        () => {}
      );
    } catch (_) {}

    try {
      const docRef = doc(db, OFFER_DOC_REF, OFFER_DOC_ID);
      unsubscribeOfferDoc = onSnapshot(
        docRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as PromotionalOffer;
            const merged = {
              ...DEFAULT_PROMOTIONAL_OFFER,
              ...data,
              id: OFFER_DOC_ID
            };
            setCachedOffer(merged);
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

  let eventSource: EventSource | null = null;
  let pollInterval: ReturnType<typeof setInterval> | null = null;

  const pullFromBackend = async () => {
    try {
      const res = await fetch('/api/portal-sync', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data?.offerConfig) {
          const merged = {
            ...DEFAULT_PROMOTIONAL_OFFER,
            ...data.offerConfig,
            id: OFFER_DOC_ID,
          };
          setCachedOffer(merged);
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
            if (data?.offerConfig) {
              const merged = {
                ...DEFAULT_PROMOTIONAL_OFFER,
                ...data.offerConfig,
                id: OFFER_DOC_ID,
              };
              setCachedOffer(merged);
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
      window.removeEventListener('vi-offer-config-updated', handleLocalUpdate);
      window.removeEventListener('storage', handleStorageEvent);
    }
    unsubscribeSyncDoc();
    unsubscribeOfferDoc();
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
 * Save promotional offer (Admin / Owner only) and broadcast in real time to Customer App
 */
export async function savePromotionalOffer(
  offer: Partial<PromotionalOffer>,
  adminUser?: { uid: string; email?: string; displayName?: string }
): Promise<PromotionalOffer> {
  const current = await getPromotionalOffer();
  const currentAuthUser = auth?.currentUser;
  const effectiveDisplayName = adminUser?.displayName || currentAuthUser?.displayName || adminUser?.email || currentAuthUser?.email || 'Admin';
  const effectiveEmail = adminUser?.email || currentAuthUser?.email || '';

  const payload: PromotionalOffer = {
    id: OFFER_DOC_ID,
    heading: (offer.heading || current.heading || DEFAULT_PROMOTIONAL_OFFER.heading).trim(),
    badge: (offer.badge || current.badge || DEFAULT_PROMOTIONAL_OFFER.badge || 'PROMOTIONAL OFFER').trim(),
    items: Array.isArray(offer.items) && offer.items.length > 0 
      ? offer.items.map(item => item.trim()).filter(Boolean) 
      : current.items || DEFAULT_PROMOTIONAL_OFFER.items,
    disclaimer: (offer.disclaimer !== undefined ? offer.disclaimer : current.disclaimer ?? DEFAULT_PROMOTIONAL_OFFER.disclaimer)?.trim(),
    updatedAt: new Date().toISOString(),
    updatedBy: effectiveDisplayName,
    updatedByEmail: effectiveEmail
  };

  setCachedOffer(payload);

  if (db) {
    try {
      const syncRef = doc(db, 'leads', SYSTEM_OFFER_SYNC_DOC);
      await setDoc(
        syncRef,
        {
          isSystemConfig: true,
          configType: 'offer_config',
          configJson: JSON.stringify(payload),
          updatedAt: payload.updatedAt,
          updatedBy: effectiveEmail || effectiveDisplayName,
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Firestore leads offer sync notice:', err);
    }

    try {
      const docRef = doc(db, OFFER_DOC_REF, OFFER_DOC_ID);
      await setDoc(docRef, payload, { merge: true });
    } catch (_) {}
  }

  if (typeof window !== 'undefined') {
    try {
      await fetch('/api/portal-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerConfig: payload }),
      });
    } catch (_) {}
  }

  return payload;
}
