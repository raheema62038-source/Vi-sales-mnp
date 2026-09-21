import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
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

/**
 * Fetch the current promotional offer from Firestore with fallback to default
 */
export async function getPromotionalOffer(): Promise<PromotionalOffer> {
  if (!db) {
    return DEFAULT_PROMOTIONAL_OFFER;
  }
  try {
    const docRef = doc(db, OFFER_DOC_REF, OFFER_DOC_ID);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as PromotionalOffer;
      return {
        ...DEFAULT_PROMOTIONAL_OFFER,
        ...data,
        id: OFFER_DOC_ID
      };
    }
  } catch (err) {
    console.warn('Could not fetch promotional offer from Firestore, using default:', err);
  }
  return DEFAULT_PROMOTIONAL_OFFER;
}

/**
 * Subscribe to real-time updates for promotional offer
 */
export function subscribeToPromotionalOffer(
  callback: (offer: PromotionalOffer) => void
): () => void {
  if (!db) {
    callback(DEFAULT_PROMOTIONAL_OFFER);
    return () => {};
  }

  try {
    const docRef = doc(db, OFFER_DOC_REF, OFFER_DOC_ID);
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as PromotionalOffer;
          callback({
            ...DEFAULT_PROMOTIONAL_OFFER,
            ...data,
            id: OFFER_DOC_ID
          });
        } else {
          callback(DEFAULT_PROMOTIONAL_OFFER);
        }
      },
      (error) => {
        console.warn('Real-time offer subscription notice:', error);
        callback(DEFAULT_PROMOTIONAL_OFFER);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Failed to subscribe to promotional offer:', err);
    callback(DEFAULT_PROMOTIONAL_OFFER);
    return () => {};
  }
}

/**
 * Save promotional offer (Admin / Owner only)
 */
export async function savePromotionalOffer(
  offer: Partial<PromotionalOffer>,
  adminUser?: { uid: string; email?: string; displayName?: string }
): Promise<PromotionalOffer> {
  if (!db) {
    throw new Error('Firebase Firestore is not initialized.');
  }

  const currentAuthUser = auth?.currentUser;
  const effectiveDisplayName = adminUser?.displayName || currentAuthUser?.displayName || adminUser?.email || currentAuthUser?.email || 'Admin';
  const effectiveEmail = adminUser?.email || currentAuthUser?.email || '';

  const payload: PromotionalOffer = {
    id: OFFER_DOC_ID,
    heading: (offer.heading || DEFAULT_PROMOTIONAL_OFFER.heading).trim(),
    badge: (offer.badge || DEFAULT_PROMOTIONAL_OFFER.badge || 'PROMOTIONAL OFFER').trim(),
    items: Array.isArray(offer.items) && offer.items.length > 0 
      ? offer.items.map(item => item.trim()).filter(Boolean) 
      : DEFAULT_PROMOTIONAL_OFFER.items,
    disclaimer: (offer.disclaimer !== undefined ? offer.disclaimer : DEFAULT_PROMOTIONAL_OFFER.disclaimer)?.trim(),
    updatedAt: new Date().toISOString(),
    updatedBy: effectiveDisplayName,
    updatedByEmail: effectiveEmail
  };

  const docRef = doc(db, OFFER_DOC_REF, OFFER_DOC_ID);
  await setDoc(docRef, payload, { merge: true });
  return payload;
}
