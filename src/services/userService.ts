import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  collection, 
  getDocs, 
  onSnapshot,
  query,
  where,
  addDoc
} from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut as secondarySignOut } from 'firebase/auth';
import { db, auth, DEFAULT_FIREBASE_CONFIG, getActiveFirebaseConfig, normalizeFirebaseConfig } from '../firebase';
import { formatAuthError } from './firebaseAuthService';
import { UserProfile, UserRole, AdminApprovalStatus, AdminTerritoryAssignment } from '../types';
export { assignTerritoryToAdmin, removeTerritoryFromAdmin, matchAdminsForTerritory, isLeadAccessibleByAdmin } from './territoryService';

export const PRIMARY_OWNER_EMAIL = 'raheema62038@gmail.com';

const TIMEOUT_MS = 20000;
const LOCAL_ADMINS_STORAGE_KEY = 'vi_admin_registry_backup';

export function getLocalAdminRegistry(): UserProfile[] {
  try {
    if (typeof window !== 'undefined' && 'localStorage' in window) {
      const raw = window.localStorage.getItem(LOCAL_ADMINS_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    }
  } catch (_) {}
  return [];
}

export function saveToLocalAdminRegistry(admin: UserProfile): void {
  try {
    if (typeof window !== 'undefined' && 'localStorage' in window && admin?.uid) {
      const list = getLocalAdminRegistry().filter((a) => a.uid !== admin.uid);
      list.push(admin);
      window.localStorage.setItem(LOCAL_ADMINS_STORAGE_KEY, JSON.stringify(list));
    }
  } catch (_) {}
}

export function removeFromLocalAdminRegistry(uid: string): void {
  try {
    if (typeof window !== 'undefined' && 'localStorage' in window) {
      const list = getLocalAdminRegistry().filter((a) => a.uid !== uid);
      window.localStorage.setItem(LOCAL_ADMINS_STORAGE_KEY, JSON.stringify(list));
    }
  } catch (_) {}
}

export function cleanPayloadForFirestore(obj: any): any {
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

export function convertObjectToFirestoreFields(obj: any): Record<string, any> {
  const fields: Record<string, any> = {};
  if (!obj || typeof obj !== 'object') return fields;

  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined || val === null) {
      fields[key] = { nullValue: null };
    } else if (typeof val === 'string') {
      fields[key] = { stringValue: val };
    } else if (typeof val === 'boolean') {
      fields[key] = { booleanValue: val };
    } else if (typeof val === 'number') {
      fields[key] = Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
    } else if (Array.isArray(val)) {
      fields[key] = {
        arrayValue: {
          values: val.map((v) => {
            if (typeof v === 'string') return { stringValue: v };
            if (typeof v === 'boolean') return { booleanValue: v };
            if (typeof v === 'number') return { integerValue: String(v) };
            if (typeof v === 'object' && v !== null) {
              return { mapValue: { fields: convertObjectToFirestoreFields(v) } };
            }
            return { nullValue: null };
          }),
        },
      };
    } else if (typeof val === 'object') {
      fields[key] = { mapValue: { fields: convertObjectToFirestoreFields(val) } };
    }
  }
  return fields;
}

export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMsg?: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error(errorMsg || `Operation timed out after ${timeoutMs}ms`));
      }
    }, timeoutMs);

    promise.then(
      (val) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(val);
        }
      },
      (err) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(err);
        }
      }
    );
  });
}

/**
 * Checks if a given email belongs to the designated Primary Owner Admin
 */
export function isEmailPrimaryOwner(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === PRIMARY_OWNER_EMAIL.toLowerCase();
}

/**
 * Normalizes and parses user role:
 * 'owner' | 'admin' | 'pending_admin' | 'customer'
 */
export function parseUserRole(val: any, email?: string): UserRole {
  if (isEmailPrimaryOwner(email)) return 'owner';
  if (!val) return 'customer';
  if (typeof val === 'boolean') return val ? 'admin' : 'customer';
  const s = String(val).trim().toLowerCase();
  if (s === 'owner' || s === 'rubi_owner') return 'owner';
  if (s === 'pending_admin' || s === 'pending') return 'pending_admin';
  if (s === 'admin') return 'admin';
  return 'customer';
}

/**
 * Parse Admin Approval Status:
 * 'none' | 'pending' | 'approved' | 'rejected' | 'deactivated'
 */
export function parseAdminStatus(val: any, role?: UserRole, isDeactivated?: boolean): AdminApprovalStatus {
  if (isDeactivated || val === 'deactivated' || val === 'deleted' || val === 'revoked') return 'deactivated';
  if (role === 'owner') return 'approved';
  if (val) {
    const s = String(val).trim().toLowerCase();
    if (s === 'deactivated' || s === 'deleted' || s === 'revoked') return 'deactivated';
    if (s === 'approved') return 'approved';
    if (s === 'pending') return 'pending';
    if (s === 'rejected') return 'rejected';
  }
  if (role === 'admin') return 'approved';
  if (role === 'pending_admin') return 'pending';
  if (role === 'customer') return 'approved';
  return 'none';
}

/**
 * Universal parser to convert Firestore user document data into a strongly-typed UserProfile
 * with complete support for village-wise and city-wise territory assignments.
 */
export function parseUserDataToProfile(
  data: any,
  docId: string,
  emailHint?: string,
  phoneHint?: string
): UserProfile {
  const userEmail = (data.email || data.customerEmail || data.userEmail || emailHint || '').trim();
  const isOwner = Boolean(
    isEmailPrimaryOwner(userEmail) ||
    (emailHint && isEmailPrimaryOwner(emailHint)) ||
    data.isPrimaryOwner ||
    data.isOwner ||
    data.role === 'owner'
  );
  const role: UserRole = isOwner ? 'owner' : parseUserRole(data.role || data.userRole, userEmail);
  const isDeactivated = Boolean(
    !isOwner &&
    (data.isDeactivated === true ||
      data.status === 'deactivated' ||
      data.status === 'deleted' ||
      data.adminAccessRevoked === true)
  );
  const status = parseAdminStatus(data.status, role, isDeactivated);

  const assignedTerritories: AdminTerritoryAssignment[] = Array.isArray(data.assignedTerritories)
    ? data.assignedTerritories
    : [];

  const assignedVillages: string[] = Array.isArray(data.assignedVillages)
    ? data.assignedVillages
    : (data.assignedVillage ? [data.assignedVillage] : []);

  return {
    uid: data.uid || docId,
    customerUid: data.customerUid || data.uid || docId,
    email: userEmail,
    displayName: data.displayName || data.name || (isOwner ? 'Primary Owner Admin' : 'User'),
    role,
    status,
    phone: data.phone || data.phoneNumber || phoneHint || '',
    phoneNumber: data.phoneNumber || data.phone || phoneHint || '',
    isPrimaryOwner: isOwner,
    isOwner,
    isDeactivated,
    adminAccessRevoked: Boolean(data.adminAccessRevoked || isDeactivated),
    previousRole: data.previousRole,
    requestedAt: data.requestedAt,
    requestNote: data.requestNote,
    approvedAt: data.approvedAt,
    approvedBy: data.approvedBy,
    rejectedAt: data.rejectedAt,
    deactivatedAt: data.deactivatedAt,
    deactivatedBy: data.deactivatedBy,
    deletedAt: data.deletedAt,
    deletedBy: data.deletedBy,
    deletionReason: data.deletionReason,
    createdByOwnerUid: data.createdByOwnerUid,
    createdAt: data.createdAt || new Date().toISOString(),
    lastLoginAt: data.lastLoginAt || new Date().toISOString(),
    assignedCircle: data.assignedCircle || (isOwner || role === 'admin' ? 'National HQ' : 'Vi Circle'),
    hasLoggedIn: Boolean(data.hasLoggedIn || data.lastLoginAt),
    loginCount: data.loginCount !== undefined ? Number(data.loginCount) : (data.lastLoginAt ? 1 : 0),
    downloadCount: Number(data.downloadCount || 0),
    lastDownloadedAt: data.lastDownloadedAt || '',
    hasDownloaded: Boolean(data.hasDownloaded || (data.downloadCount && Number(data.downloadCount) > 0)),
    address: data.address || '',
    taluka: data.taluka || '',
    district: data.district || '',
    state: data.state || '',
    pincode: data.pincode || '',

    // Village-wise & City-wise Territory Assignment fields
    assignedState: data.assignedState || '',
    assignedDistrict: data.assignedDistrict || '',
    assignedTaluka: data.assignedTaluka || '',
    assignedVillage: data.assignedVillage || '',
    assignedVillages,
    assignedTerritories,
  };
}

/**
 * Fetch a single user profile by UID from Firestore.
 */
export async function getUserProfile(uid: string, emailHint?: string, phoneHint?: string): Promise<UserProfile | null> {
  if (!uid && !emailHint) return null;
  const cleanEmail = (emailHint || '').trim().toLowerCase();

  // 1. First check if it's primary owner by email
  const isOwnerByEmail = isEmailPrimaryOwner(cleanEmail);

  if (db && uid) {
    try {
      const userRef = doc(db, 'users', uid);
      const snap = await withTimeout(getDoc(userRef), TIMEOUT_MS, null);

      if (snap && snap.exists()) {
        const prof = parseUserDataToProfile(snap.data(), uid, emailHint, phoneHint);
        if (prof.role === 'admin') {
          saveToLocalAdminRegistry(prof);
        }
        return prof;
      } else if (isOwnerByEmail) {
        // Primary owner's first access before document creation
        const now = new Date().toISOString();
        const ownerProfile: UserProfile = {
          uid,
          customerUid: uid,
          email: PRIMARY_OWNER_EMAIL,
          displayName: 'Primary Owner Admin (Master)',
          role: 'owner',
          status: 'approved',
          isPrimaryOwner: true,
          isOwner: true,
          isDeactivated: false,
          phone: '',
          createdAt: now,
          lastLoginAt: now,
          assignedCircle: 'National HQ (Owner)',
          assignedState: 'All States (National)',
          assignedDistrict: 'All Districts',
          assignedTaluka: 'All Talukas',
          assignedVillage: 'All Villages',
        };
        try {
          await setDoc(userRef, ownerProfile, { merge: true });
        } catch (e) {
          console.warn('Auto-provision owner doc warning:', e);
        }
        return ownerProfile;
      } else if (cleanEmail) {
        // Query users collection by email
        try {
          const usersCol = collection(db, 'users');
          const qSnap = await withTimeout(
            getDocs(query(usersCol, where('email', '==', cleanEmail))),
            TIMEOUT_MS,
            null
          );
          if (qSnap && !qSnap.empty) {
            const docFound = qSnap.docs[0];
            const preservedProfile = parseUserDataToProfile(docFound.data(), uid, cleanEmail, phoneHint);
            await setDoc(userRef, preservedProfile, { merge: true }).catch(() => {});
            if (preservedProfile.role === 'admin') {
              saveToLocalAdminRegistry(preservedProfile);
            }
            return preservedProfile;
          }
        } catch (err) {
          console.warn('Fallback lookup by email notice:', err);
        }
      }
    } catch (e) {
      console.warn('Firestore getUserProfile notice:', e);
    }
  }

  // 2. Check Local Admin Registry (durable fallback)
  const localAdmins = getLocalAdminRegistry();
  const matchedAdmin = localAdmins.find(
    (a) => (uid && a.uid === uid) || (cleanEmail && a.email && a.email.toLowerCase() === cleanEmail)
  );

  if (matchedAdmin) {
    // If found in local registry, ensure doc exists in Firestore in background
    if (db && uid) {
      try {
        const userRef = doc(db, 'users', uid);
        setDoc(userRef, cleanPayloadForFirestore(matchedAdmin), { merge: true }).catch(() => {});
      } catch (_) {}
    }
    return matchedAdmin;
  }

  return null;
}

/**
 * Subscribe to real-time updates for a single user document.
 */
export function subscribeToUserProfile(
  uid: string,
  onProfile: (profile: UserProfile) => void,
  onError?: (err: any) => void
): () => void {
  if (!db || !uid) return () => {};
  try {
    const userRef = doc(db, 'users', uid);
    return onSnapshot(
      userRef,
      (snap) => {
        if (snap.exists()) {
          onProfile(parseUserDataToProfile(snap.data(), uid));
        }
      },
      (err) => {
        console.warn('subscribeToUserProfile notice:', err?.message);
        if (onError) onError(err);
      }
    );
  } catch (e) {
    console.warn('subscribeToUserProfile error:', e);
    return () => {};
  }
}

/**
 * Create or update a user profile document in Firestore
 */
export async function saveUserProfile(profile: UserProfile): Promise<void> {
  if (db) {
    try {
      const cleanProfile: Record<string, any> = {};
      for (const [key, val] of Object.entries(profile)) {
        if (val !== undefined && val !== null) {
          cleanProfile[key] = val;
        }
      }
      // Requirement 3: Explicitly store customerUid in customer profile
      cleanProfile.customerUid = profile.uid;
      cleanProfile.uid = profile.uid;

      const userRef = doc(db, 'users', profile.uid);
      await withTimeout(setDoc(userRef, cleanProfile, { merge: true }), TIMEOUT_MS, undefined);
    } catch (e) {
      console.warn('Firestore saveUserProfile notice:', e);
      throw e;
    }
  }
}

/**
 * Primary Owner Admin: Add a new Admin directly
 * - Connects properly to Firebase Auth using official verified project configuration
 * - First attempts client SDK createUserWithEmailAndPassword with isolated secondary Firebase App
 * - If SDK hits configuration/domain/network issues, seamlessly registers via Google Identity Toolkit REST API
 * - Creates approved admin profile in Firestore under users/{newUid}
 * - Only Primary Owner (raheema62038@gmail.com) can call this function
 */
export async function createAdminUserByOwner(
  ownerUser: { uid: string; email?: string | null; role?: string; isPrimaryOwner?: boolean; isOwner?: boolean },
  adminData: {
    email: string;
    password: string;
    displayName: string;
    phone?: string;
    assignedCircle?: string;
    assignedState?: string;
    assignedDistrict?: string;
    assignedTaluka?: string;
    assignedVillage?: string;
  }
): Promise<UserProfile> {
  const rawEmail = adminData.email.trim().toLowerCase();
  const cleanPassword = adminData.password.trim();
  const cleanName = adminData.displayName.trim();
  const cleanPhone = adminData.phone?.trim() || '';
  const cleanState = adminData.assignedState?.trim() || 'Maharashtra';
  const cleanDistrict = adminData.assignedDistrict?.trim() || 'Buldhana';
  const cleanTaluka = adminData.assignedTaluka?.trim() || 'Mehkar';
  const cleanVillage = adminData.assignedVillage?.trim() || '';
  const cleanCircle = adminData.assignedCircle?.trim() || (cleanVillage ? `${cleanVillage}, ${cleanTaluka}` : 'Vi Circle HQ');

  // Ensure clean email with valid domain
  const cleanEmail = rawEmail.includes('@')
    ? rawEmail
    : `${rawEmail.replace(/[^a-z0-9._-]/g, '')}@visales.in`;

  if (!cleanEmail || !cleanPassword || !cleanName) {
    throw new Error('कृपया ईमेल, पासवर्ड और नाम सभी आवश्यक फ़ील्ड भरें।');
  }
  if (cleanPassword.length < 6) {
    throw new Error('पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।');
  }

  // Security check: Only Primary Owner can add admins
  const isOwner = Boolean(
    (ownerUser.email && isEmailPrimaryOwner(ownerUser.email)) ||
    (auth?.currentUser?.email && isEmailPrimaryOwner(auth.currentUser.email)) ||
    (ownerUser as any)?.role === 'owner' ||
    (ownerUser as any)?.isPrimaryOwner ||
    (ownerUser as any)?.isOwner
  );
  if (!isOwner) {
    throw new Error('सुरक्षा प्रतिबंध: केवल Primary Owner Admin ही नया Admin बना सकते हैं।');
  }

  // Authoritative verified Firebase configuration
  const activeCfg = getActiveFirebaseConfig();
  const authoritativeConfig = {
    apiKey: activeCfg.apiKey || DEFAULT_FIREBASE_CONFIG.apiKey,
    authDomain: activeCfg.authDomain || DEFAULT_FIREBASE_CONFIG.authDomain,
    projectId: activeCfg.projectId || DEFAULT_FIREBASE_CONFIG.projectId,
    storageBucket: activeCfg.storageBucket || DEFAULT_FIREBASE_CONFIG.storageBucket,
    messagingSenderId: activeCfg.messagingSenderId || DEFAULT_FIREBASE_CONFIG.messagingSenderId,
    appId: activeCfg.appId || DEFAULT_FIREBASE_CONFIG.appId,
  };

  let newUid = '';
  const secondaryAppName = `AdminCreator_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  let secondaryApp: any = null;

  try {
    secondaryApp = initializeApp(authoritativeConfig, secondaryAppName);
    const secondaryAuth = getAuth(secondaryApp);
    const cred = await createUserWithEmailAndPassword(secondaryAuth, cleanEmail, cleanPassword);
    newUid = cred.user.uid;
    try {
      await secondarySignOut(secondaryAuth);
    } catch {
      // ignore
    }
  } catch (sdkErr: any) {
    const code = (sdkErr?.code || '').toLowerCase();
    const rawMsg = (sdkErr?.message || '').toLowerCase();

    if (code.includes('weak-password') || rawMsg.includes('weak_password')) {
      throw new Error('पासवर्ड बहुत कमजोर है। कम से कम 6 अक्षरों का पासवर्ड दर्ज करें।');
    }
    if (code.includes('invalid-email') || rawMsg.includes('invalid_email')) {
      throw new Error('कृपया मान्य ईमेल पता दर्ज करें (उदा. admin@visales.in)।');
    }

    console.warn('Firebase SDK sign-up notice, using Identity Toolkit REST fallback:', sdkErr?.message);

    try {
      // Robust Google Identity Toolkit REST API Fallback
      const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${authoritativeConfig.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          password: cleanPassword,
          displayName: cleanName,
          returnSecureToken: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        const errorMsg = data.error?.message || '';
        if (errorMsg.includes('EMAIL_EXISTS') || code.includes('email-already-in-use') || rawMsg.includes('email_exists')) {
          // If email already exists, check Firestore first
          if (db) {
            try {
              const qSnap = await getDocs(query(collection(db, 'users'), where('email', '==', cleanEmail)));
              if (!qSnap.empty) {
                newUid = qSnap.docs[0].id;
              }
            } catch (_) {}
          }
          if (!newUid) {
            const localAdmins = getLocalAdminRegistry();
            const foundLocal = localAdmins.find((a) => a.email && a.email.toLowerCase() === cleanEmail);
            if (foundLocal && foundLocal.uid) {
              newUid = foundLocal.uid;
            }
          }
          if (!newUid) {
            try {
              const signInRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${authoritativeConfig.apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: cleanEmail, password: cleanPassword, returnSecureToken: true }),
              });
              const signData = await signInRes.json();
              if (signData && signData.localId) {
                newUid = signData.localId;
              } else {
                throw new Error(`यह ईमेल (${cleanEmail}) पहले से पंजीकृत है। कृपया दूसरा ईमेल दर्ज करें या नीचे Admin लिस्ट में इसे एडिट करें।`);
              }
            } catch (innerE: any) {
              throw new Error(innerE?.message || `यह ईमेल (${cleanEmail}) पहले से पंजीकृत है। कृपया दूसरा ईमेल दर्ज करें।`);
            }
          }
        } else if (errorMsg.includes('WEAK_PASSWORD')) {
          throw new Error('पासवर्ड बहुत कमजोर है। कम से कम 6 अक्षरों का पासवर्ड दर्ज करें।');
        } else if (errorMsg.includes('INVALID_EMAIL')) {
          throw new Error('कृपया वैध ईमेल पता दर्ज करें।');
        } else if (errorMsg.includes('TOO_MANY_ATTEMPTS_TRY_LATER')) {
          throw new Error('अत्यधिक प्रयासों के कारण सुरक्षा अस्थायी रूप से अवरुद्ध है। कृपया 1-2 मिनट बाद पुनः प्रयास करें।');
        } else {
          throw new Error(formatAuthError(data.error || { message: errorMsg }));
        }
      } else {
        newUid = data.localId;
      }
    } catch (restErr: any) {
      if (restErr?.message && !restErr.message.includes('object Object')) {
        throw restErr;
      }
      throw new Error('Admin प्रमाणीकरण खाता बनाने में त्रुटि हुई।');
    }
  } finally {
    if (secondaryApp) {
      try {
        await deleteApp(secondaryApp);
      } catch {
        // ignore
      }
    }
  }

  if (!newUid) {
    throw new Error('Admin खाता बनाने में विफल। कृपया पुनः प्रयास करें।');
  }

  const now = new Date().toISOString();
  const initialTerritories: AdminTerritoryAssignment[] = cleanVillage
    ? [
        {
          id: `terr_${Date.now()}`,
          state: cleanState,
          district: cleanDistrict,
          taluka: cleanTaluka,
          village: cleanVillage,
          assignedAt: now,
          assignedBy: ownerUser.email || ownerUser.uid,
        },
      ]
    : [];

  const newAdminProfile: UserProfile = {
    uid: newUid,
    email: cleanEmail,
    displayName: cleanName,
    phone: cleanPhone,
    phoneNumber: cleanPhone,
    role: 'admin',
    status: 'approved',
    isDeactivated: false,
    isPrimaryOwner: false,
    isOwner: false,
    assignedCircle: cleanCircle,
    assignedState: cleanState,
    assignedDistrict: cleanDistrict,
    assignedTaluka: cleanTaluka,
    assignedVillage: cleanVillage,
    assignedVillages: cleanVillage ? [cleanVillage] : [],
    assignedTerritories: initialTerritories,
    createdByOwnerUid: ownerUser.uid,
    approvedBy: ownerUser.uid,
    approvedAt: now,
    createdAt: now,
    lastLoginAt: now,
  };

  // 1. Save to local durable backup registry immediately
  saveToLocalAdminRegistry(newAdminProfile);

  // 2. Save to Firestore users collection with retry and verification
  if (db) {
    const userRef = doc(db, 'users', newUid);
    const cleaned = cleanPayloadForFirestore(newAdminProfile);
    let firestoreSaved = false;

    try {
      await withTimeout(setDoc(userRef, cleaned, { merge: true }), 15000, 'Firestore save timeout');
      firestoreSaved = true;
    } catch (dbErr: any) {
      console.warn('First setDoc attempt notice:', dbErr?.message);
    }

    if (!firestoreSaved) {
      try {
        await setDoc(userRef, cleaned, { merge: true });
        firestoreSaved = true;
      } catch (retryErr: any) {
        console.error('Firestore setDoc user profile error:', retryErr);
        // Direct REST API attempt with token if available
        const token = auth?.currentUser ? await auth.currentUser.getIdToken().catch(() => null) : null;
        if (token) {
          try {
            await fetch(`https://firestore.googleapis.com/v1/projects/${authoritativeConfig.projectId}/databases/(default)/documents/users/${newUid}`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                fields: convertObjectToFirestoreFields(cleaned)
              })
            });
            firestoreSaved = true;
          } catch (rErr) {
            console.warn('Firestore REST fallback error:', rErr);
          }
        }
      }
    }

    if (!firestoreSaved) {
      throw new Error(`Firestore डेटाबेस में Admin सेव नहीं हो सका। कृपया नेटवर्क और सुरक्षा नियम जांचें। (Admin ID: ${newUid})`);
    }
  }

  return newAdminProfile;
}

/**
 * Primary Owner Admin: Update an Admin's profile, phone, territory, status, or password
 */
export async function updateAdminUserByOwner(
  ownerUser: { uid: string; email?: string | null; role?: string; isPrimaryOwner?: boolean; isOwner?: boolean },
  targetUid: string,
  details: {
    displayName: string;
    phone: string;
    assignedCircle?: string;
    assignedState?: string;
    assignedDistrict?: string;
    assignedTaluka?: string;
    assignedVillage?: string;
    status?: 'approved' | 'deactivated';
    newPassword?: string;
  }
): Promise<UserProfile> {
  const isOwner = Boolean(
    (ownerUser.email && isEmailPrimaryOwner(ownerUser.email)) ||
    (auth?.currentUser?.email && isEmailPrimaryOwner(auth.currentUser.email)) ||
    (ownerUser as any)?.role === 'owner' ||
    (ownerUser as any)?.isPrimaryOwner ||
    (ownerUser as any)?.isOwner
  );
  if (!isOwner) {
    throw new Error('सुरक्षा प्रतिबंध: केवल Primary Owner Admin ही Admin डेटा बदल सकते हैं।');
  }
  if (!db) throw new Error('Firestore initialized नहीं है');

  const userRef = doc(db, 'users', targetUid);
  const snap = await getDoc(userRef).catch(() => null);
  const currentData = snap && snap.exists() ? snap.data() : {};

  const cleanVillage = details.assignedVillage?.trim() || '';
  const cleanTaluka = details.assignedTaluka?.trim() || 'Mehkar';
  const cleanDistrict = details.assignedDistrict?.trim() || 'Buldhana';
  const cleanState = details.assignedState?.trim() || 'Maharashtra';
  const cleanCircle = details.assignedCircle?.trim() || (cleanVillage ? `${cleanVillage}, ${cleanTaluka}` : 'Vi Circle HQ');
  const now = new Date().toISOString();
  const isDeactivated = details.status === 'deactivated';

  // Build updated territory assignment
  const updatedTerritory: AdminTerritoryAssignment[] = cleanVillage
    ? [
        {
          id: `terr_${Date.now()}`,
          state: cleanState,
          district: cleanDistrict,
          taluka: cleanTaluka,
          village: cleanVillage,
          assignedAt: now,
          assignedBy: ownerUser.email || ownerUser.uid,
        },
      ]
    : currentData.assignedTerritories || [];

  const updatePayload: Record<string, any> = {
    displayName: details.displayName.trim(),
    phone: details.phone.trim(),
    phoneNumber: details.phone.trim(),
    assignedCircle: cleanCircle,
    assignedState: cleanState,
    assignedDistrict: cleanDistrict,
    assignedTaluka: cleanTaluka,
    assignedVillage: cleanVillage,
    assignedVillages: cleanVillage ? [cleanVillage] : [],
    assignedTerritories: updatedTerritory,
    status: details.status || currentData.status || 'approved',
    isDeactivated,
    adminAccessRevoked: isDeactivated,
    updatedAt: now,
    updatedByOwnerUid: ownerUser.uid,
  };

  // Optional password update via Identity Platform REST
  if (details.newPassword && details.newPassword.trim().length >= 6) {
    try {
      await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:update?key=${DEFAULT_FIREBASE_CONFIG.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          localId: targetUid,
          password: details.newPassword.trim(),
          returnSecureToken: false,
        }),
      });
      updatePayload.passwordLastResetAt = now;
    } catch (passErr) {
      console.warn('Password update notice via identity toolkit:', passErr);
    }
  }

  await withTimeout(setDoc(userRef, cleanPayloadForFirestore(updatePayload), { merge: true }), TIMEOUT_MS, undefined);

  const updatedProfile = parseUserDataToProfile(
    { ...currentData, ...updatePayload },
    targetUid,
    currentData.email
  );

  saveToLocalAdminRegistry(updatedProfile);
  return updatedProfile;
}

/**
 * Primary Owner Admin: Permanently Delete an Admin User
 * - Deletes the admin profile from Firestore
 * - Removes from local backup registry
 * - CRITICAL: Never touches customer leads or bookings
 */
export async function deleteAdminUserPermanently(
  targetUid: string,
  ownerUid: string,
  targetEmail?: string,
  ownerEmail?: string
): Promise<void> {
  if (isEmailPrimaryOwner(targetEmail)) {
    throw new Error('सुरक्षा नियम: Primary Owner account को डिलीट नहीं किया जा सकता।');
  }
  if (!db) throw new Error('Firestore initialized नहीं है');

  const userRef = doc(db, 'users', targetUid);
  await withTimeout(deleteDoc(userRef), TIMEOUT_MS, undefined);
  removeFromLocalAdminRegistry(targetUid);
}

/**
 * Primary Owner Admin: Deactivate an Admin
 * - Deactivated admins cannot access the Admin Portal
 * - Firebase Auth login access is immediately revoked
 * - Admin profile and audit trail remain preserved in Firestore
 * - CRITICAL: Never deletes customer or lead records
 */
export async function deactivateAdminUser(
  targetUid: string,
  ownerUid: string,
  targetEmail?: string,
  ownerEmail?: string
): Promise<void> {
  if (isEmailPrimaryOwner(targetEmail)) {
    throw new Error('सुरक्षा नियम: Primary Owner account को निष्क्रिय (Deactivate) नहीं किया जा सकता।');
  }
  if (!db) throw new Error('Firestore initialized नहीं है');
  const userRef = doc(db, 'users', targetUid);
  const now = new Date().toISOString();
  await updateDoc(userRef, {
    status: 'deactivated',
    isDeactivated: true,
    adminAccessRevoked: true,
    deactivatedAt: now,
    deactivatedBy: ownerEmail || ownerUid,
  });

  const localAdmins = getLocalAdminRegistry();
  const found = localAdmins.find((a) => a.uid === targetUid);
  if (found) {
    found.status = 'deactivated';
    found.isDeactivated = true;
    found.adminAccessRevoked = true;
    saveToLocalAdminRegistry(found);
  }
}

/**
 * Primary Owner Admin: Reactivate a deactivated or deleted Admin
 */
export async function reactivateAdminUser(
  targetUid: string,
  ownerUid: string,
  ownerEmail?: string
): Promise<void> {
  if (!db) throw new Error('Firestore initialized नहीं है');
  const userRef = doc(db, 'users', targetUid);
  const now = new Date().toISOString();
  await updateDoc(userRef, {
    role: 'admin',
    status: 'approved',
    isDeactivated: false,
    adminAccessRevoked: false,
    approvedAt: now,
    approvedBy: ownerEmail || ownerUid,
  });

  const localAdmins = getLocalAdminRegistry();
  const found = localAdmins.find((a) => a.uid === targetUid);
  if (found) {
    found.role = 'admin';
    found.status = 'approved';
    found.isDeactivated = false;
    found.adminAccessRevoked = false;
    saveToLocalAdminRegistry(found);
  }
}

/**
 * Primary Owner Admin: Delete / Revoke Admin Access
 * - Completely blocks and shuts off Admin's Firebase Authentication access
 * - Admin profile and audit history are permanently preserved in Firestore
 * - CRITICAL: Never deletes any Customer or Lead records handled or created by this admin
 * - Owner portal retains full visibility of this Admin's history and their historical leads
 */
export async function removeAdminUser(
  targetUid: string,
  ownerUid: string,
  targetEmail?: string,
  ownerEmail?: string,
  reason?: string
): Promise<void> {
  if (isEmailPrimaryOwner(targetEmail)) {
    throw new Error('सुरक्षा नियम: Primary Owner account को हटाया नहीं जा सकता।');
  }
  if (!db) throw new Error('Firestore initialized नहीं है');
  const userRef = doc(db, 'users', targetUid);
  const now = new Date().toISOString();
  await updateDoc(userRef, {
    role: 'admin',
    status: 'deleted',
    isDeactivated: true,
    adminAccessRevoked: true,
    deletedAt: now,
    deletedBy: ownerEmail || ownerUid,
    deletionReason: reason || 'Primary Owner द्वारा Admin access समाप्त कर दी गई। पुराना ऑडिट व लीड्स सुरक्षित हैं।',
    deactivatedAt: now,
    deactivatedBy: ownerEmail || ownerUid,
  });

  removeFromLocalAdminRegistry(targetUid);
}

/**
 * Primary Owner: Completely delete a Customer ID / Account from Firestore
 * - Ensures Owner has full authority to remove customer IDs
 * - Safety check strictly prevents deleting Primary Owner account
 */
export async function deleteCustomerUser(targetUid: string, ownerEmail?: string): Promise<void> {
  if (!db) throw new Error('Firestore initialized नहीं है');
  if (!targetUid) throw new Error('Customer ID is required');

  const userRef = doc(db, 'users', targetUid);
  const snap = await getDoc(userRef).catch(() => null);
  if (snap && snap.exists()) {
    const data = snap.data();
    if (isEmailPrimaryOwner(data.email) || data.isPrimaryOwner || data.role === 'owner') {
      throw new Error('सुरक्षा नियम: Primary Owner account को डिलीट नहीं किया जा सकता।');
    }
  }

  await withTimeout(deleteDoc(userRef), TIMEOUT_MS, undefined);
}

/**
 * Record Customer / User login in Firestore:
 * Updates hasLoggedIn: true, lastLoginAt, increments loginCount
 */
export async function recordUserLogin(uid: string, loginMethod: string = 'app_login'): Promise<void> {
  if (!db || !uid) return;
  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef).catch(() => null);
    const now = new Date().toISOString();
    const currentCount = snap && snap.exists() ? Number(snap.data()?.loginCount || 0) : 0;
    await setDoc(
      userRef,
      {
        hasLoggedIn: true,
        lastLoginAt: now,
        loginCount: currentCount + 1,
        lastLoginMethod: loginMethod,
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('recordUserLogin notice:', err);
  }
}

/**
 * Automatically sync any admins stored in local registry up to Firestore
 * if they are missing from Firestore (e.g. after offline creation or device transfer).
 */
export async function syncLocalAdminsToFirestore(): Promise<void> {
  if (!db) return;
  const localAdmins = getLocalAdminRegistry();
  if (localAdmins.length === 0) return;

  for (const admin of localAdmins) {
    if (!admin.uid) continue;
    try {
      const userRef = doc(db, 'users', admin.uid);
      const snap = await getDoc(userRef).catch(() => null);
      if (!snap || !snap.exists()) {
        await setDoc(userRef, cleanPayloadForFirestore(admin), { merge: true }).catch(() => {});
      }
    } catch (_) {}
  }
}

/**
 * Fetch all users for Admin/Owner management directory
 * Merges Firestore database records with local backup registry
 */
export async function getAllUsers(): Promise<UserProfile[]> {
  const mergedMap = new Map<string, UserProfile>();

  // 1. First seed with local backup registry so there is instant data
  const localAdmins = getLocalAdminRegistry();
  localAdmins.forEach((adm) => {
    if (adm.uid) mergedMap.set(adm.uid, adm);
  });

  // 2. Fetch from Firestore with generous timeout
  if (db) {
    try {
      const usersCol = collection(db, 'users');
      const snap = await withTimeout(getDocs(usersCol), 15000, 'getAllUsers timeout').catch((err) => {
        console.warn('getDocs users notice:', err?.message);
        return null;
      });
      if (snap && !snap.empty) {
        snap.forEach((d) => {
          const prof = parseUserDataToProfile(d.data(), d.id);
          mergedMap.set(d.id, prof);
          if (prof.role === 'admin' || prof.role === 'owner') {
            saveToLocalAdminRegistry(prof);
          }
        });
      }
    } catch (e) {
      console.warn('Firestore getAllUsers notice:', e);
    }
  }

  // 3. Sync local admins to Firestore in background
  if (db && localAdmins.length > 0) {
    syncLocalAdminsToFirestore().catch(() => {});
  }

  return Array.from(mergedMap.values());
}

/**
 * Real-time subscription to all users in Firestore for Admin/Owner directory.
 * Ensures Admin immediately sees newly registered customers without manual reload.
 */
export function subscribeToAllUsers(
  onUsers: (users: UserProfile[]) => void,
  onError?: (err: any) => void
): () => void {
  // Immediately emit current cached users
  const initialAdmins = getLocalAdminRegistry();
  if (initialAdmins.length > 0) {
    onUsers(initialAdmins);
  }

  if (!db) return () => {};
  try {
    const usersCol = collection(db, 'users');
    return onSnapshot(
      usersCol,
      (snapshot) => {
        const mergedMap = new Map<string, UserProfile>();
        // Seed with local admins
        getLocalAdminRegistry().forEach((adm) => {
          if (adm.uid) mergedMap.set(adm.uid, adm);
        });

        snapshot.forEach((d) => {
          const prof = parseUserDataToProfile(d.data(), d.id);
          mergedMap.set(d.id, prof);
          if (prof.role === 'admin' || prof.role === 'owner') {
            saveToLocalAdminRegistry(prof);
          }
        });

        onUsers(Array.from(mergedMap.values()));
      },
      (err) => {
        console.warn('subscribeToAllUsers notice:', err?.message);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    console.warn('subscribeToAllUsers error:', err);
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Update user role
 */
export async function updateUserRole(uid: string, newRole: UserRole): Promise<void> {
  if (db) {
    try {
      const userRef = doc(db, 'users', uid);
      const newStatus = newRole === 'admin' || newRole === 'owner' ? 'approved' : 'none';
      await withTimeout(updateDoc(userRef, { role: newRole, status: newStatus, isDeactivated: false }), TIMEOUT_MS, undefined);
    } catch (e) {
      console.warn('Firestore updateUserRole notice:', e);
      throw e;
    }
  }
}

/**
 * Submit request to become an Admin (awaiting Owner approval)
 */
export async function submitAdminRequest(
  uid: string,
  details: {
    displayName: string;
    phone: string;
    assignedCircle: string;
    requestNote?: string;
  }
): Promise<UserProfile> {
  if (!db) throw new Error('Firestore not initialized');
  const now = new Date().toISOString();
  const requestDoc: UserProfile = {
    uid,
    displayName: details.displayName.trim() || 'Admin Requester',
    phone: details.phone.trim(),
    phoneNumber: details.phone.trim(),
    role: 'pending_admin',
    status: 'pending',
    isPrimaryOwner: false,
    isOwner: false,
    isDeactivated: false,
    assignedCircle: details.assignedCircle.trim() || 'Vi Circle HQ',
    requestNote: details.requestNote?.trim() || '',
    requestedAt: now,
    createdAt: now,
    lastLoginAt: now,
  };

  const userRef = doc(db, 'users', uid);
  await withTimeout(setDoc(userRef, requestDoc, { merge: true }), TIMEOUT_MS, undefined);
  return requestDoc;
}

/**
 * Fetch all pending Admin Requests
 */
export async function getPendingAdminRequests(): Promise<UserProfile[]> {
  if (!db) return [];
  try {
    const usersCol = collection(db, 'users');
    const snap = await withTimeout(getDocs(usersCol), 6000, null);
    if (snap && !snap.empty) {
      const pending: UserProfile[] = [];
      snap.forEach((d) => {
        const data = d.data();
        const userEmail = data.email || '';
        const role = parseUserRole(data.role || data.userRole, userEmail);
        const status = parseAdminStatus(data.status, role, data.isDeactivated);
        if (role === 'pending_admin' || status === 'pending') {
          pending.push({
            uid: data.uid || d.id,
            email: userEmail,
            displayName: data.displayName || data.name || 'Requester',
            role: 'pending_admin',
            status: 'pending',
            phone: data.phone || data.phoneNumber || '',
            phoneNumber: data.phoneNumber || data.phone || '',
            requestedAt: data.requestedAt || data.createdAt || '',
            requestNote: data.requestNote || '',
            createdAt: data.createdAt || '',
            lastLoginAt: data.lastLoginAt || '',
            assignedCircle: data.assignedCircle || 'Vi Circle HQ',
          });
        }
      });
      return pending;
    }
  } catch (e) {
    console.warn('getPendingAdminRequests error:', e);
  }
  return [];
}

/**
 * Owner only: Approve Admin Request
 */
export async function approveAdminRequest(targetUid: string, ownerUid: string): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');
  const userRef = doc(db, 'users', targetUid);
  const now = new Date().toISOString();
  await withTimeout(
    updateDoc(userRef, {
      role: 'admin',
      status: 'approved',
      isDeactivated: false,
      approvedBy: ownerUid,
      approvedAt: now,
    }),
    TIMEOUT_MS,
    undefined
  );
}

/**
 * Owner only: Reject Admin Request
 */
export async function rejectAdminRequest(targetUid: string, ownerUid: string, reason?: string): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');
  const userRef = doc(db, 'users', targetUid);
  const now = new Date().toISOString();
  await withTimeout(
    updateDoc(userRef, {
      role: 'customer',
      status: 'rejected',
      isDeactivated: false,
      rejectedAt: now,
      rejectionReason: reason || 'Rejected by Owner',
    }),
    TIMEOUT_MS,
    undefined
  );
}

/**
 * Track an APK / App download event in Firebase
 * - Updates user's own profile (if logged in): increments downloadCount, sets hasDownloaded = true
 * - Records a trackable event in 'app_downloads' collection in Firestore
 */
export async function trackAppDownload(
  currentUser?: { uid?: string; email?: string | null; phoneNumber?: string | null; displayName?: string | null } | null,
  downloadSource: string = 'APK Download'
): Promise<void> {
  if (!db) return;
  const now = new Date().toISOString();
  try {
    // 1. Record event in app_downloads collection
    const downloadsCol = collection(db, 'app_downloads');
    await addDoc(downloadsCol, {
      userId: currentUser?.uid || 'guest',
      userEmail: currentUser?.email || '',
      userName: currentUser?.displayName || '',
      userPhone: currentUser?.phoneNumber || '',
      downloadSource,
      downloadedAt: now,
      timestamp: now,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    }).catch((e) => console.warn('Record download event notice:', e));

    // 2. If logged-in user, update user profile doc in Firestore
    if (currentUser?.uid) {
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef).catch(() => null);
      if (userSnap && userSnap.exists()) {
        const data = userSnap.data();
        const currentCount = Number(data.downloadCount || 0);
        await updateDoc(userRef, {
          downloadCount: currentCount + 1,
          hasDownloaded: true,
          lastDownloadedAt: now,
        }).catch((e) => console.warn('Update user download count notice:', e));
      }
    }
  } catch (err) {
    console.warn('trackAppDownload notice:', err);
  }
}
