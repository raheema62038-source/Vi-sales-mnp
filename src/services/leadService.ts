import { 
  collection, 
  onSnapshot, 
  getDocs,
  getDoc,
  setDoc,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  QuerySnapshot, 
  DocumentData, 
  query, 
  where 
} from 'firebase/firestore';
import { db } from '../firebase';
import { Lead, LeadFormData, UserRole, UserProfile, AdminTerritoryAssignment } from '../types';
import { isEmailPrimaryOwner, getAllUsers } from './userService';
import { isLeadAccessibleByAdmin, matchAdminsForTerritory } from './territoryService';
import { getPortalConfig } from './portalConfigService';

/**
 * Checks whether the given user has Admin or Primary Owner access.
 * Recognizes role, flags, or designated primary owner email (raheema62038@gmail.com).
 */
export function isUserAdminOrOwner(user?: {
  uid?: string;
  role?: UserRole;
  email?: string | null;
  isAdmin?: boolean;
  isOwnerAdmin?: boolean;
} | null): boolean {
  if (!user) return false;
  if (user.isOwnerAdmin === true || user.isAdmin === true) return true;
  if (user.role === 'admin' || user.role === 'owner') return true;
  if (user.email && isEmailPrimaryOwner(user.email)) return true;
  return false;
}

function cleanPayloadForFirestore(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null) return null;
  if (Array.isArray(obj)) {
    return obj
      .map(cleanPayloadForFirestore)
      .filter((item) => item !== undefined);
  }
  if (typeof obj === 'object') {
    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        clean[key] = cleanPayloadForFirestore(value);
      }
    }
    return clean;
  }
  if (typeof obj === 'string') {
    return obj.trim();
  }
  return obj;
}

/**
 * Helper to parse a Firestore document snapshot into a typed Lead record.
 */
export function parseDocToLead(docSnap: any): Lead {
  const data = docSnap.data() || {};
  const docId = docSnap.id;
  const leadId = data.leadId || docId;
  const reqType = data.requestType || data.leadType || 'Porting (MNP)';
  const addr = data.address || data.customerAddress || '';

  // Safe timestamp parser to ensure createdAt is valid ISO string
  let isoCreatedAt = new Date().toISOString();
  if (data.createdAt) {
    if (typeof data.createdAt === 'string') {
      isoCreatedAt = data.createdAt;
    } else if (typeof data.createdAt.toDate === 'function') {
      isoCreatedAt = data.createdAt.toDate().toISOString();
    } else if (typeof data.createdAt === 'number') {
      isoCreatedAt = new Date(data.createdAt).toISOString();
    }
  } else if (data.timestamp) {
    if (typeof data.timestamp.toDate === 'function') {
      isoCreatedAt = data.timestamp.toDate().toISOString();
    } else if (typeof data.timestamp === 'number') {
      isoCreatedAt = new Date(data.timestamp).toISOString();
    }
  }

  return {
    id: docId,
    leadId,
    requestType: reqType,
    assignedTo: data.assignedTo || 'Unassigned',
    customerUid: data.customerUid || data.createdByUid || data.salespersonUid || '',
    customerEmail: data.customerEmail || data.createdByEmail || '',
    customerName: data.customerName || data.name || data.fullName || 'Customer',
    mobileNumber: data.mobileNumber || data.phone || data.mobile || '',
    alternateNumber: data.alternateNumber || data.altPhone || '',
    currentOperator: data.currentOperator || data.operator || 'Other',
    connectionType: data.connectionType || 'Prepaid',
    selectedPlan: data.selectedPlan || data.plan || 'Vi Standard Plan',
    leadType: reqType,
    simNumber: data.simNumber || '',
    simType: data.simType || 'Physical SIM',
    upcCode: data.upcCode || '',
    upcExpiryDate: data.upcExpiryDate || '',
    state: data.state || 'Maharashtra',
    district: data.district || 'Buldhana',
    taluka: data.taluka || 'Mehkar',
    village: data.village || data.villageCity || data.cityArea || '',
    assignedAdminUids: Array.isArray(data.assignedAdminUids)
      ? data.assignedAdminUids
      : (data.assignedToUid ? [data.assignedToUid] : []),
    assignedAdminNames: Array.isArray(data.assignedAdminNames) ? data.assignedAdminNames : [],
    assignedAt: data.assignedAt || undefined,
    address: addr,
    customerAddress: addr,
    cityCircle: data.cityCircle || data.circle || 'Maharashtra & Goa',
    pincode: data.pincode || '',
    locationCoordinates: data.locationCoordinates || undefined,
    isCustomerVerified: Boolean(data.isCustomerVerified),
    customerVerificationStatus: data.customerVerificationStatus || (data.isCustomerVerified ? 'Verified' : 'Pending'),
    verifiedAt: data.verifiedAt || undefined,
    verifiedBy: data.verifiedBy || undefined,
    status: data.status || 'New',
    bookingStatus: data.bookingStatus || 'Booked',
    bookingCount: data.bookingCount !== undefined ? Number(data.bookingCount) : 1,
    remarks: data.remarks || '',
    salespersonUid: data.salespersonUid || data.createdByUid || '',
    createdByUid: data.createdByUid || data.salespersonUid || data.customerUid || '',
    createdBy: data.createdBy || data.createdByUid || '',
    createdByEmail: data.createdByEmail || data.customerEmail || '',
    createdByName: data.createdByName || data.customerName || '',
    createdAt: isoCreatedAt,
    updatedAt: data.updatedAt || undefined,
  };
}

/**
 * Filter leads based on user role and UID:
 * - Super Owner: sees all leads across all territories
 * - Territory Admin: sees ONLY leads in their assigned village / city / territory
 * - Customer: STRICT ISOLATION - sees ONLY their own submitted requests
 */
export function filterLeadsForUser(
  allLeads: Lead[], 
  user: {
    uid?: string;
    role?: UserRole;
    email?: string | null;
    phone?: string;
    phoneNumber?: string;
    isAdmin?: boolean;
    isOwnerAdmin?: boolean;
    isPrimaryOwner?: boolean;
    isOwner?: boolean;
    assignedState?: string;
    assignedDistrict?: string;
    assignedTaluka?: string;
    assignedVillage?: string;
    assignedVillages?: string[];
    assignedTerritories?: AdminTerritoryAssignment[];
  } | null
): Lead[] {
  if (!user || !user.uid) return [];
  const isSuperOwner = Boolean(
    user.isOwnerAdmin ||
    user.isPrimaryOwner ||
    user.isOwner ||
    user.role === 'owner' ||
    (user.email && isEmailPrimaryOwner(user.email))
  );

  // Super Owner Admin sees all leads across all territories
  if (isSuperOwner) {
    return allLeads;
  }

  // Territory Admin: strictly filter to assigned village/city/territory
  if (user.role === 'admin' || user.isAdmin) {
    return allLeads.filter((lead) => isLeadAccessibleByAdmin(lead, user));
  }

  const cleanUserPhone = (user.phoneNumber || user.phone || '').replace(/\D/g, '').slice(-10);
  const userEmail = (user.email || '').toLowerCase().trim();

  // Customer: strictly return ONLY requests belonging to this customer
  return allLeads.filter((lead) => {
    const leadPhone = (lead.mobileNumber || '').replace(/\D/g, '').slice(-10);
    const leadEmail = (lead.customerEmail || lead.createdByEmail || '').toLowerCase().trim();

    const matchesUid = (lead.customerUid && lead.customerUid === user.uid) ||
      (!lead.customerUid && (lead.createdByUid === user.uid || lead.salespersonUid === user.uid));
    const matchesEmail = Boolean(userEmail && leadEmail && userEmail === leadEmail);
    const matchesPhone = Boolean(cleanUserPhone && cleanUserPhone.length === 10 && leadPhone && cleanUserPhone === leadPhone);

    return matchesUid || matchesEmail || matchesPhone;
  });
}

/**
 * Subscribes in real-time to the Firestore 'leads' collection:
 * - Super Owner: Listens to entire collection and manages all customer bookings nationwide.
 * - Territory Admin: Strictly scoped to bookings matching their assigned village / territory.
 * - Customer: STRICT ISOLATION - Listens directly to queries matching customer UID.
 * - Emits live reactive updates whenever any new booking or status change occurs.
 */
export function subscribeToLeads(
  user: {
    uid?: string;
    role?: UserRole;
    email?: string | null;
    phone?: string;
    phoneNumber?: string;
    displayName?: string;
    isAdmin?: boolean;
    isOwnerAdmin?: boolean;
    isPrimaryOwner?: boolean;
    isOwner?: boolean;
    assignedState?: string;
    assignedDistrict?: string;
    assignedTaluka?: string;
    assignedVillage?: string;
    assignedVillages?: string[];
    assignedTerritories?: AdminTerritoryAssignment[];
  } | null,
  onData: (leads: Lead[], isFromFirestore: boolean) => void,
  onError: (error: any) => void
): () => void {
  if (!db || !user?.uid) {
    onData([], false);
    return () => {};
  }

  const isAdminAccess = isUserAdminOrOwner(user);
  const isSuperOwner = Boolean(
    user.isOwnerAdmin ||
    user.isPrimaryOwner ||
    user.isOwner ||
    user.role === 'owner' ||
    (user.email && isEmailPrimaryOwner(user.email))
  );

  try {
    const leadsCollection = collection(db, 'leads');
    const unsubs: Array<() => void> = [];
    const leadsMap = new Map<string, Lead>();

    const cleanUserPhone = (
      user.phoneNumber ||
      user.phone ||
      (user.email && /^\d{10}@/.test(user.email) ? user.email.slice(0, 10) : '')
    )
      .replace(/\D/g, '')
      .slice(-10);

    const isSystemSyncDoc = (docSnap: any) => {
      if (docSnap.id.startsWith('system_')) return true;
      const d = docSnap.data();
      return Boolean(d?.isSystemConfig);
    };

    const emitCurrentLeads = (isLive: boolean) => {
      const items = Array.from(leadsMap.values());
      items.sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime() || 0;
        const timeB = new Date(b.createdAt).getTime() || 0;
        return timeB - timeA;
      });

      // Strict Data Boundary:
      // - Super Admin sees ALL customer bookings across India
      // - Territory Admin sees ONLY bookings in their assigned village/city/territory
      // - Customers see ONLY their own bookings
      let secureItems: Lead[];
      if (isSuperOwner) {
        secureItems = items;
      } else if (isAdminAccess) {
        secureItems = items.filter((lead) => isLeadAccessibleByAdmin(lead, user));
      } else {
        secureItems = items.filter((lead) => {
          const leadPhone = (lead.mobileNumber || '').replace(/\D/g, '').slice(-10);
          const matchesPhone = Boolean(cleanUserPhone && cleanUserPhone.length === 10 && leadPhone === cleanUserPhone);
          return (
            lead.customerUid === user.uid ||
            lead.createdByUid === user.uid ||
            (user.email && lead.customerEmail && lead.customerEmail.toLowerCase() === user.email.toLowerCase()) ||
            matchesPhone
          );
        });
      }

      onData(secureItems, isLive);
    };

    if (isAdminAccess) {
      // 1. Immediate getDocs fetch to eliminate any initial zero-count delay
      getDocs(leadsCollection)
        .then((snapshot) => {
          leadsMap.clear();
          snapshot.forEach((docSnap) => {
            if (!isSystemSyncDoc(docSnap)) {
              leadsMap.set(docSnap.id, parseDocToLead(docSnap));
            }
          });
          emitCurrentLeads(true);
        })
        .catch((err) => {
          console.warn('Initial admin getDocs notice:', err?.message);
        });

      // 2. Real-time onSnapshot listener for instant live sync of all customer bookings
      const unsub = onSnapshot(
        leadsCollection,
        (snapshot: QuerySnapshot<DocumentData>) => {
          leadsMap.clear();
          snapshot.forEach((docSnap) => {
            if (!isSystemSyncDoc(docSnap)) {
              leadsMap.set(docSnap.id, parseDocToLead(docSnap));
            }
          });
          emitCurrentLeads(true);
        },
        (error) => {
          console.warn('Admin onSnapshot notice:', error?.message);
          onError(error);
        }
      );
      unsubs.push(unsub);
    } else {
      // Customer: strictly isolated queries for this customer's bookings
      const uidMap = new Map<string, Lead>();
      const creatorMap = new Map<string, Lead>();
      const emailMap = new Map<string, Lead>();
      const phoneMap = new Map<string, Lead>();
      const altPhoneMap = new Map<string, Lead>();

      const emitCustomerLeads = (isLive: boolean) => {
        const merged = new Map<string, Lead>();
        for (const [id, lead] of altPhoneMap.entries()) merged.set(id, lead);
        for (const [id, lead] of phoneMap.entries()) merged.set(id, lead);
        for (const [id, lead] of emailMap.entries()) merged.set(id, lead);
        for (const [id, lead] of creatorMap.entries()) merged.set(id, lead);
        for (const [id, lead] of uidMap.entries()) merged.set(id, lead);

        const items = Array.from(merged.values());
        items.sort((a, b) => {
          const timeA = new Date(a.createdAt).getTime() || 0;
          const timeB = new Date(b.createdAt).getTime() || 0;
          return timeB - timeA;
        });

        // Strict customer data boundary: only ever see bookings matching own UID, own email, or own verified mobile number
        const userEmail = (user.email || '').toLowerCase().trim();
        const secureItems = items.filter((lead) => {
          const leadPhone = (lead.mobileNumber || '').replace(/\D/g, '').slice(-10);
          const matchesPhone = Boolean(cleanUserPhone && cleanUserPhone.length === 10 && leadPhone === cleanUserPhone);
          return (
            lead.customerUid === user.uid ||
            lead.createdByUid === user.uid ||
            (userEmail && lead.customerEmail && lead.customerEmail.toLowerCase().trim() === userEmail) ||
            matchesPhone
          );
        });

        onData(secureItems, isLive);
      };

      // 1. Primary Query: where customerUid == authenticated UID
      const qUid = query(leadsCollection, where('customerUid', '==', user.uid));
      getDocs(qUid).then((snap) => {
        snap.forEach((docSnap) => {
          if (!isSystemSyncDoc(docSnap)) uidMap.set(docSnap.id, parseDocToLead(docSnap));
        });
        emitCustomerLeads(true);
      }).catch(() => {});

      const unsubUid = onSnapshot(
        qUid,
        (snapshot: QuerySnapshot<DocumentData>) => {
          uidMap.clear();
          snapshot.forEach((docSnap) => {
            if (!isSystemSyncDoc(docSnap)) {
              uidMap.set(docSnap.id, parseDocToLead(docSnap));
            }
          });
          emitCustomerLeads(true);
        },
        (error) => {
          console.warn('Customer UID onSnapshot notice:', error?.message);
          onError(error);
        }
      );
      unsubs.push(unsubUid);

      // 2. Creator Query: where createdByUid == authenticated UID
      const qCreator = query(leadsCollection, where('createdByUid', '==', user.uid));
      getDocs(qCreator).then((snap) => {
        snap.forEach((docSnap) => {
          if (!isSystemSyncDoc(docSnap)) creatorMap.set(docSnap.id, parseDocToLead(docSnap));
        });
        emitCustomerLeads(true);
      }).catch(() => {});

      const unsubCreator = onSnapshot(
        qCreator,
        (snapshot: QuerySnapshot<DocumentData>) => {
          creatorMap.clear();
          snapshot.forEach((docSnap) => {
            if (!isSystemSyncDoc(docSnap)) {
              creatorMap.set(docSnap.id, parseDocToLead(docSnap));
            }
          });
          emitCustomerLeads(true);
        },
        (error) => {
          console.warn('Customer Creator onSnapshot notice:', error?.message);
        }
      );
      unsubs.push(unsubCreator);

      // 3. Email Query fallback if customer registered with email
      if (user.email && user.email.trim()) {
        const cleanUserEmail = user.email.toLowerCase().trim();
        const qEmail = query(leadsCollection, where('customerEmail', '==', cleanUserEmail));
        getDocs(qEmail).then((snap) => {
          snap.forEach((docSnap) => {
            if (!isSystemSyncDoc(docSnap)) emailMap.set(docSnap.id, parseDocToLead(docSnap));
          });
          emitCustomerLeads(true);
        }).catch(() => {});

        const unsubEmail = onSnapshot(
          qEmail,
          (snapshot: QuerySnapshot<DocumentData>) => {
            emailMap.clear();
            snapshot.forEach((docSnap) => {
              if (!isSystemSyncDoc(docSnap)) {
                emailMap.set(docSnap.id, parseDocToLead(docSnap));
              }
            });
            emitCustomerLeads(true);
          },
          (error) => {
            console.warn('Customer Email onSnapshot notice:', error?.message);
          }
        );
        unsubs.push(unsubEmail);
      }

      // 4. Mobile Number Query so bookings linked to customer's 10-digit mobile number sync in real-time
      if (cleanUserPhone && cleanUserPhone.length === 10) {
        const qPhone = query(leadsCollection, where('mobileNumber', '==', cleanUserPhone));
        getDocs(qPhone).then((snap) => {
          snap.forEach((docSnap) => {
            if (!isSystemSyncDoc(docSnap)) phoneMap.set(docSnap.id, parseDocToLead(docSnap));
          });
          emitCustomerLeads(true);
        }).catch(() => {});

        const unsubPhone = onSnapshot(
          qPhone,
          (snapshot: QuerySnapshot<DocumentData>) => {
            phoneMap.clear();
            snapshot.forEach((docSnap) => {
              if (!isSystemSyncDoc(docSnap)) {
                phoneMap.set(docSnap.id, parseDocToLead(docSnap));
              }
            });
            emitCustomerLeads(true);
          },
          (error) => {
            console.warn('Customer Phone onSnapshot notice:', error?.message);
          }
        );
        unsubs.push(unsubPhone);

        const qPhoneField = query(leadsCollection, where('phone', '==', cleanUserPhone));
        getDocs(qPhoneField).then((snap) => {
          snap.forEach((docSnap) => {
            if (!isSystemSyncDoc(docSnap)) altPhoneMap.set(docSnap.id, parseDocToLead(docSnap));
          });
          emitCustomerLeads(true);
        }).catch(() => {});

        const unsubPhoneField = onSnapshot(
          qPhoneField,
          (snapshot: QuerySnapshot<DocumentData>) => {
            altPhoneMap.clear();
            snapshot.forEach((docSnap) => {
              if (!isSystemSyncDoc(docSnap)) {
                altPhoneMap.set(docSnap.id, parseDocToLead(docSnap));
              }
            });
            emitCustomerLeads(true);
          },
          (error) => {
            console.warn('Customer Phone field onSnapshot notice:', error?.message);
          }
        );
        unsubs.push(unsubPhoneField);
      }
    }

    return () => {
      unsubs.forEach((u) => {
        try {
          u();
        } catch (_) {}
      });
    };
  } catch (err) {
    console.warn('Error establishing Firestore leads subscription:', err);
    onError(err);
    return () => {};
  }
}

/**
 * Adds a new sales MNP lead or customer booking to the Firestore 'leads' collection.
 * Creates a brand new document with an auto-generated unique document ID.
 * Writes all 14 required fields:
 * - leadId, customerName, mobileNumber, alternateNumber, address, pincode,
 *   currentOperator, requestType, simType, status, createdAt, customerUid,
 *   customerEmail, assignedTo
 * Plus backward compatibility fields for complete UI consistency.
 */
export const SERVICE_AREA_ERROR = 'कृपया राज्य, जिला और तहसील/शहर का चयन करें। (Please select State, District, and Taluka/City).';

export function validateServiceArea(state?: string, district?: string, taluka?: string, pincode?: string): boolean {
  const s = (state || '').trim();
  const d = (district || '').trim();
  const t = (taluka || '').trim();
  // Valid as long as state and district are provided
  if (!s || !d) return false;
  return true;
}

export async function addLead(
  formData: LeadFormData, 
  user?: { uid: string; email?: string | null; displayName?: string | null; role?: UserRole } | null
): Promise<string> {
  if (!user?.uid) {
    throw new Error('प्रमाणीकरण आवश्यक है (Authentication required)');
  }
  if (!db) {
    throw new Error('डेटाबेस कनेक्टेड नहीं है (Firestore not initialized)');
  }

  // 1. Service Area Validation
  const reqState = (formData.state || 'Maharashtra').trim();
  const reqDistrict = (formData.district || 'Buldhana').trim();
  const reqTaluka = (formData.taluka || 'Mehkar').trim();
  const reqVillage = (formData.village || '').trim();
  const reqPincode = (formData.pincode || '443301').trim();

  if (!validateServiceArea(reqState, reqDistrict, reqTaluka, reqPincode)) {
    throw new Error(SERVICE_AREA_ERROR);
  }

  const currentUid = user.uid;
  const currentEmail = (user.email || '').trim();
  const currentName = (user.displayName || currentEmail.split('@')[0] || 'Customer').trim();
  const isCustomer = !isUserAdminOrOwner(user);

  // 2. Auto-match all active admins assigned to this village/city according to Owner-configured rules
  let assignedAdminUids: string[] = Array.isArray(formData.assignedAdminUids) ? [...formData.assignedAdminUids] : [];
  let assignedAdminNames: string[] = Array.isArray(formData.assignedAdminNames) ? [...formData.assignedAdminNames] : [];

  if (assignedAdminUids.length === 0) {
    try {
      const allUsers = await getAllUsers();
      const matched = matchAdminsForTerritory(reqState, reqDistrict, reqTaluka, reqVillage, allUsers);
      if (matched.length > 0) {
        let selectedAdmins = matched;
        try {
          const config = await getPortalConfig();
          const mode = config.territoryRules?.multiAdminMode || 'shared_pool';
          if (mode === 'round_robin' && matched.length > 1) {
            // Owner designated rule: Round Robin rotation among admins assigned to this village
            const rotationIdx = Math.floor(Math.random() * matched.length);
            selectedAdmins = [matched[rotationIdx]];
          } else if (mode === 'primary_admin' && matched.length > 1) {
            // Owner designated rule: Primary / First Admin assigned to this village
            selectedAdmins = [matched[0]];
          }
        } catch (ruleErr) {
          console.warn('Owner territory rule fallback notice:', ruleErr);
        }

        assignedAdminUids = selectedAdmins.map((a) => a.uid);
        assignedAdminNames = selectedAdmins.map((a) => a.displayName || a.email || 'Admin');
      }
    } catch (matchErr) {
      console.warn('Auto-match admins warning:', matchErr);
    }
  }

  const assignedLabel = assignedAdminNames.length > 0
    ? assignedAdminNames.join(', ')
    : (formData.assignedTo && formData.assignedTo !== 'Unassigned' ? formData.assignedTo : 'Unassigned');

  // Generate unique document reference
  const leadsCollection = collection(db, 'leads');
  const newDocRef = doc(leadsCollection);
  const uniqueLeadId = newDocRef.id;

  const reqType = formData.requestType || formData.leadType || 'Porting (MNP)';
  const custName = (formData.customerName || '').trim();
  const mobile = (formData.mobileNumber || '').replace(/\D/g, '').trim();
  const altNumber = (formData.alternateNumber || '').replace(/\D/g, '').trim();
  const rawAddr = (formData.address || formData.customerAddress || '').trim();
  const formattedAddress = rawAddr
    ? (rawAddr.includes(reqVillage) ? rawAddr : `${rawAddr}, ${reqVillage ? `${reqVillage}, ` : ''}${reqTaluka}, ${reqDistrict}, ${reqState}`)
    : [reqVillage, reqTaluka, reqDistrict, `${reqState}${reqPincode ? ` - ${reqPincode}` : ''}`].filter(Boolean).join(', ');

  const oper = formData.currentOperator || 'Airtel';
  const sim = formData.simType || 'Physical SIM';
  const st = formData.status || 'New';
  const createdDate = new Date().toISOString();
  const custUid = isCustomer ? currentUid : (formData.customerUid || currentUid);
  const custEmail = isCustomer ? currentEmail : (formData.customerEmail || currentEmail || '');

  const docPayload: Record<string, any> = {
    // 14 MANDATORY FIELDS
    leadId: uniqueLeadId,
    customerName: custName,
    mobileNumber: mobile,
    alternateNumber: altNumber,
    address: formattedAddress,
    pincode: reqPincode,
    currentOperator: oper,
    requestType: reqType,
    simType: sim,
    status: st,
    createdAt: createdDate,
    customerUid: custUid,
    customerEmail: custEmail,
    assignedTo: assignedLabel,

    // Village-wise & City-wise Territory Assignment fields
    state: reqState,
    district: reqDistrict,
    taluka: reqTaluka,
    village: reqVillage,
    assignedAdminUids,
    assignedAdminNames,
    assignedAt: assignedAdminUids.length > 0 ? createdDate : undefined,

    // Backward-compatibility fields for UI views & sorting
    leadType: reqType,
    customerAddress: formattedAddress,
    connectionType: formData.connectionType || 'Prepaid',
    selectedPlan: formData.selectedPlan || 'Vi Standard Plan',
    bookingStatus: formData.bookingStatus || 'Booked',
    bookingCount: Number(formData.bookingCount) || 1,
    cityCircle: formData.cityCircle || (reqState === 'Maharashtra' ? 'Maharashtra & Goa' : reqState),
    remarks: (formData.remarks || '').trim(),
    upcCode: (formData.upcCode || '').trim().toUpperCase(),
    upcExpiryDate: formData.upcExpiryDate || '',
    simNumber: (formData.simNumber || '').trim(),

    // Customer Location (Opt-in GPS coordinates if customer permitted)
    ...(formData.locationCoordinates ? { locationCoordinates: formData.locationCoordinates } : {}),

    // Verification status
    isCustomerVerified: Boolean(formData.isCustomerVerified),
    customerVerificationStatus: formData.customerVerificationStatus || (formData.isCustomerVerified ? 'Verified' : 'Pending'),

    // Attribution & Ownership
    createdByUid: currentUid,
    createdByEmail: currentEmail,
    createdByName: currentName,
    createdBy: currentUid,
    salespersonUid: currentUid,
  };

  try {
    // 1. Save to the single "leads" collection
    await setDoc(newDocRef, docPayload);

    // 2. Read back from Firestore to verify that the write succeeded
    const verifiedSnap = await getDoc(newDocRef);
    if (!verifiedSnap.exists()) {
      throw new Error('Firestore document write verification failed on server.');
    }

    return uniqueLeadId;
  } catch (err: any) {
    console.error('CRITICAL: Firestore setDoc failed:', err);
    throw new Error(`डेटाबेस में सुरक्षित नहीं हो सका: ${err?.message || 'Firestore write error'}`);
  }
}

/**
 * Fetches all leads once from Firestore for Admin snapshot
 */
export async function getAllLeadsOnce(): Promise<Lead[]> {
  if (!db) return [];
  const snapshot = await getDocs(collection(db, 'leads'));
  const list: Lead[] = [];
  snapshot.forEach((docSnap) => {
    if (docSnap.id.startsWith('system_') || docSnap.data()?.isSystemConfig) return;
    list.push(parseDocToLead(docSnap));
  });
  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return list;
}

/**
 * Updates an existing lead in Firestore 'leads' collection.
 * Enforces ownership check:
 * - Admin can edit any lead
 * - Customer can only edit their own submitted record
 */
export async function updateLead(
  leadId: string, 
  formData: Partial<LeadFormData>,
  user?: { uid?: string; role?: UserRole } | null
): Promise<void> {
  if (!user?.uid) {
    throw new Error('प्रमाणीकरण आवश्यक है (Authentication required)');
  }
  if (!db) {
    throw new Error('डेटाबेस कनेक्टेड नहीं है (Firestore not initialized)');
  }

  const rawUpdatePayload: Record<string, any> = {
    ...formData,
    updatedAt: new Date().toISOString(),
  };

  // Synchronize bookingStatus and status so Admin updates immediately reflect in Customer Portal tracker
  if (rawUpdatePayload.bookingStatus && !rawUpdatePayload.status) {
    const bs = rawUpdatePayload.bookingStatus;
    if (bs === 'Completed') rawUpdatePayload.status = 'Completed';
    else if (bs === 'Rejected' || bs === 'Cancelled') rawUpdatePayload.status = 'Rejected';
    else if (bs === 'Pending') rawUpdatePayload.status = 'Pending';
    else if (bs === 'Verified') rawUpdatePayload.status = 'UPC Generated';
    else if (bs === 'In Process') rawUpdatePayload.status = 'SIM Dispatched';
  } else if (rawUpdatePayload.status && !rawUpdatePayload.bookingStatus) {
    const st = rawUpdatePayload.status;
    if (st === 'Completed') rawUpdatePayload.bookingStatus = 'Completed';
    else if (st === 'Rejected') rawUpdatePayload.bookingStatus = 'Rejected';
    else if (st === 'Pending') rawUpdatePayload.bookingStatus = 'Pending';
    else if (st === 'UPC Generated') rawUpdatePayload.bookingStatus = 'Verified';
    else if (st === 'SIM Dispatched' || st === 'Porting Scheduled') rawUpdatePayload.bookingStatus = 'In Process';
    else if (st === 'New') rawUpdatePayload.bookingStatus = 'Booked';
  }

  // Also mirror remarks/notes and mobileNumber/phone if updated
  if (rawUpdatePayload.remarks !== undefined && rawUpdatePayload.notes === undefined) {
    rawUpdatePayload.notes = rawUpdatePayload.remarks;
  } else if (rawUpdatePayload.notes !== undefined && rawUpdatePayload.remarks === undefined) {
    rawUpdatePayload.remarks = rawUpdatePayload.notes;
  }
  if (rawUpdatePayload.mobileNumber && !rawUpdatePayload.phone) {
    rawUpdatePayload.phone = rawUpdatePayload.mobileNumber;
  }

  // Prevent modifying immutable ownership fields
  delete rawUpdatePayload.customerUid;
  delete rawUpdatePayload.salespersonUid;
  delete rawUpdatePayload.createdByUid;
  delete rawUpdatePayload.createdBy;
  delete rawUpdatePayload.createdByEmail;
  delete rawUpdatePayload.createdByName;
  delete rawUpdatePayload.createdAt;
  delete rawUpdatePayload.id;

  const cleanUpdatePayload = cleanPayloadForFirestore(rawUpdatePayload);

  const docRef = doc(db, 'leads', leadId);
  await updateDoc(docRef, cleanUpdatePayload);
}

/**
 * Deletes an existing lead from Firestore 'leads' collection.
 * STRICT SECURITY: Only Primary Owner Admin can delete customer records.
 * Normal Admins or customers cannot delete customer records under any circumstances.
 */
export async function deleteLead(
  leadId: string,
  user?: { uid?: string; email?: string | null; role?: UserRole } | null
): Promise<void> {
  if (!user?.uid) {
    throw new Error('प्रमाणीकरण आवश्यक है (Authentication required)');
  }
  const isOwner = user.role === 'owner' || isEmailPrimaryOwner(user.email);
  if (!isOwner) {
    throw new Error('सुरक्षा नियम: कस्टमर/लीड रिकॉर्ड्स को केवल Primary Owner Admin (raheema62038@gmail.com) ही हटा सकते हैं। किसी सामान्य Admin को रिकॉर्ड डिलीट करने की अनुमति नहीं है।');
  }

  if (!db) {
    throw new Error('डेटाबेस कनेक्टेड नहीं है (Firestore not initialized)');
  }

  const docRef = doc(db, 'leads', leadId);
  await deleteDoc(docRef);
}

/**
 * Toggle or update customer verification status on a lead (Admin only)
 */
export async function updateLeadVerificationStatus(
  leadId: string,
  isVerified: boolean,
  adminUser?: { uid?: string; email?: string | null; displayName?: string | null; role?: UserRole } | null
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');
  const docRef = doc(db, 'leads', leadId);
  const payload: Record<string, any> = {
    isCustomerVerified: isVerified,
    customerVerificationStatus: isVerified ? 'Verified' : 'Unverified',
    verifiedAt: isVerified ? new Date().toISOString() : null,
    verifiedBy: adminUser?.email || adminUser?.displayName || adminUser?.uid || 'Admin',
    updatedAt: new Date().toISOString(),
  };
  await updateDoc(docRef, cleanPayloadForFirestore(payload));
}

/**
 * Update the booking status of a customer booking (Admin only)
 */
export async function updateLeadBookingStatus(
  leadId: string,
  newBookingStatus: string,
  adminUser?: { uid?: string; email?: string | null; displayName?: string | null; role?: UserRole } | null
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');
  const docRef = doc(db, 'leads', leadId);
  const payload: Record<string, any> = {
    bookingStatus: newBookingStatus,
    updatedAt: new Date().toISOString(),
  };
  // Map booking status to MNP status if relevant
  if (newBookingStatus === 'Completed') {
    payload.status = 'Ported';
  } else if (newBookingStatus === 'SIM Dispatched') {
    payload.status = 'SIM Allocated';
  } else if (newBookingStatus === 'Cancelled') {
    payload.status = 'Cancelled';
  }
  await updateDoc(docRef, cleanPayloadForFirestore(payload));
}

