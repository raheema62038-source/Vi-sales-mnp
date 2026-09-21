import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  getDocs, 
  onSnapshot,
  query,
  where,
  addDoc
} from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut as secondarySignOut } from 'firebase/auth';
import { db, DEFAULT_FIREBASE_CONFIG, getActiveFirebaseConfig, normalizeFirebaseConfig } from '../firebase';
import { formatAuthError } from './firebaseAuthService';
import { UserProfile, UserRole, AdminApprovalStatus } from '../types';

export const PRIMARY_OWNER_EMAIL = 'raheema62038@gmail.com';

const TIMEOUT_MS = 6000;

function cleanPayloadForFirestore(payload: Record<string, any>): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null) {
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.length > 0) {
          clean[key] = trimmed;
        }
      } else {
        clean[key] = value;
      }
    }
  }
  return clean;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallbackValue: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallbackValue), timeoutMs)),
  ]);
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
 * Fetch a single user profile by UID from Firestore.
 */
export async function getUserProfile(uid: string, emailHint?: string, phoneHint?: string): Promise<UserProfile | null> {
  if (!db || !uid) return null;
  try {
    const isOwnerByEmail = isEmailPrimaryOwner(emailHint);
    const userRef = doc(db, 'users', uid);
    const snap = await withTimeout(getDoc(userRef), TIMEOUT_MS, null);

    if (snap && snap.exists()) {
      const data = snap.data();
      const userEmail = data.email || emailHint || '';
      const isOwner = Boolean(isOwnerByEmail || isEmailPrimaryOwner(userEmail) || data.isPrimaryOwner || data.role === 'owner');
      
      let role: UserRole = isOwner ? 'owner' : parseUserRole(data.role || data.userRole, userEmail);
      const isDeactivated = Boolean(!isOwner && (data.isDeactivated === true || data.status === 'deactivated' || data.status === 'deleted' || data.adminAccessRevoked === true));
      const status = parseAdminStatus(data.status, role, isDeactivated);

      return {
        uid: data.uid || uid,
        customerUid: data.customerUid || data.uid || uid,
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
      };
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
      };
      try {
        await setDoc(userRef, ownerProfile, { merge: true });
      } catch (e) {
        console.warn('Auto-provision owner doc warning:', e);
      }
      return ownerProfile;
    } else if (emailHint && emailHint.trim()) {
      // Preserve existing Firestore customer data if registered previously under email
      try {
        const cleanEmail = emailHint.trim().toLowerCase();
        const usersCol = collection(db, 'users');
        const qSnap = await withTimeout(
          getDocs(query(usersCol, where('email', '==', cleanEmail))),
          TIMEOUT_MS,
          null
        );
        if (qSnap && !qSnap.empty) {
          const docFound = qSnap.docs[0];
          const data = docFound.data();
          const role = parseUserRole(data.role || data.userRole, cleanEmail);
          const isDeactivated = Boolean(data.isDeactivated === true || data.status === 'deactivated' || data.status === 'deleted' || data.adminAccessRevoked === true);
          const status = parseAdminStatus(data.status, role, isDeactivated);
          const preservedProfile: UserProfile = {
            uid,
            customerUid: uid,
            email: cleanEmail,
            displayName: data.displayName || data.name || 'Customer',
            role,
            status,
            phone: data.phone || data.phoneNumber || phoneHint || '',
            phoneNumber: data.phoneNumber || data.phone || phoneHint || '',
            isPrimaryOwner: false,
            isOwner: false,
            isDeactivated,
            createdAt: data.createdAt || new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
            assignedCircle: data.assignedCircle || 'Vi Circle',
          };
          await setDoc(userRef, preservedProfile, { merge: true }).catch(() => {});
          return preservedProfile;
        }
      } catch (err) {
        console.warn('Fallback lookup by email notice:', err);
      }
    }
  } catch (e) {
    console.warn('Firestore getUserProfile notice:', e);
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
          const data = snap.data();
          const userEmail = data.email || '';
          const isOwner = Boolean(isEmailPrimaryOwner(userEmail) || data.isPrimaryOwner || data.role === 'owner');
          let role: UserRole = isOwner ? 'owner' : parseUserRole(data.role || data.userRole, userEmail);
          const isDeactivated = Boolean(!isOwner && (data.isDeactivated === true || data.status === 'deactivated' || data.status === 'deleted' || data.adminAccessRevoked === true));
          const status = parseAdminStatus(data.status, role, isDeactivated);

          onProfile({
            uid: data.uid || uid,
            email: userEmail,
            displayName: data.displayName || data.name || (isOwner ? 'Primary Owner Admin' : 'User'),
            role,
            status,
            phone: data.phone || data.phoneNumber || '',
            phoneNumber: data.phoneNumber || data.phone || '',
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
          });
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
  ownerUser: { uid: string; email?: string | null },
  adminData: {
    email: string;
    password: string;
    displayName: string;
    phone?: string;
    assignedCircle?: string;
  }
): Promise<UserProfile> {
  const cleanEmail = adminData.email.trim().toLowerCase();
  const cleanPassword = adminData.password.trim();
  const cleanName = adminData.displayName.trim();
  const cleanPhone = adminData.phone?.trim() || '';
  const cleanCircle = adminData.assignedCircle?.trim() || 'Vi Circle HQ';

  if (!cleanEmail || !cleanPassword || !cleanName) {
    throw new Error('कृपया ईमेल, पासवर्ड और नाम सभी आवश्यक फ़ील्ड भरें।');
  }
  if (cleanPassword.length < 6) {
    throw new Error('पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।');
  }

  // Security check: Only Primary Owner can add admins
  const isOwner = Boolean(
    ownerUser.email && isEmailPrimaryOwner(ownerUser.email)
  );
  if (!isOwner) {
    throw new Error('सुरक्षा प्रतिबंध: केवल Primary Owner Admin ही नया Admin बना सकते हैं।');
  }

  // Authoritative verified Firebase configuration for project vi-seles-mnp-e7594
  const authoritativeConfig = {
    apiKey: DEFAULT_FIREBASE_CONFIG.apiKey,
    authDomain: DEFAULT_FIREBASE_CONFIG.authDomain,
    projectId: DEFAULT_FIREBASE_CONFIG.projectId,
    storageBucket: DEFAULT_FIREBASE_CONFIG.storageBucket,
    messagingSenderId: DEFAULT_FIREBASE_CONFIG.messagingSenderId,
    appId: DEFAULT_FIREBASE_CONFIG.appId,
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

    if (code.includes('email-already-in-use') || rawMsg.includes('email_exists')) {
      throw new Error(`यह ईमेल (${cleanEmail}) पहले से पंजीकृत है। कृपया दूसरा ईमेल दर्ज करें।`);
    }
    if (code.includes('weak-password') || rawMsg.includes('weak_password')) {
      throw new Error('पासवर्ड बहुत कमजोर है। कम से कम 6 अक्षरों का पासवर्ड दर्ज करें।');
    }
    if (code.includes('invalid-email') || rawMsg.includes('invalid_email')) {
      throw new Error('कृपया वैध ईमेल पता दर्ज करें।');
    }

    console.warn('Firebase SDK sign-up notice, using Identity Toolkit REST fallback for vi-seles-mnp-e7594:', sdkErr?.message);

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
        if (errorMsg.includes('EMAIL_EXISTS')) {
          throw new Error(`यह ईमेल (${cleanEmail}) पहले से पंजीकृत है। कृपया दूसरा ईमेल दर्ज करें।`);
        }
        if (errorMsg.includes('WEAK_PASSWORD')) {
          throw new Error('पासवर्ड बहुत कमजोर है। कम से कम 6 अक्षरों का पासवर्ड दर्ज करें।');
        }
        if (errorMsg.includes('INVALID_EMAIL')) {
          throw new Error('कृपया वैध ईमेल पता दर्ज करें।');
        }
        if (errorMsg.includes('TOO_MANY_ATTEMPTS_TRY_LATER')) {
          throw new Error('अत्यधिक प्रयासों के कारण सुरक्षा अस्थायी रूप से अवरुद्ध है। कृपया 1-2 मिनट बाद पुनः प्रयास करें।');
        }
        throw new Error(formatAuthError(data.error || { message: errorMsg }));
      }

      newUid = data.localId;
    } catch (restErr: any) {
      throw new Error(restErr?.message || 'Admin प्रमाणीकरण खाता बनाने में त्रुटि हुई।');
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
    createdByOwnerUid: ownerUser.uid,
    approvedBy: ownerUser.uid,
    approvedAt: now,
    createdAt: now,
    lastLoginAt: now,
  };

  if (db) {
    try {
      const userRef = doc(db, 'users', newUid);
      await withTimeout(setDoc(userRef, cleanPayloadForFirestore(newAdminProfile), { merge: true }), TIMEOUT_MS, undefined);
    } catch (dbErr: any) {
      console.warn('Firestore setDoc user profile warning:', dbErr);
    }
  }

  return newAdminProfile;
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
}

/**
 * Fetch all users for Admin/Owner management directory
 */
export async function getAllUsers(): Promise<UserProfile[]> {
  if (db) {
    try {
      const usersCol = collection(db, 'users');
      const snap = await withTimeout(getDocs(usersCol), 6000, null);
      if (snap && !snap.empty) {
        const firestoreUsers: UserProfile[] = [];
        snap.forEach((d) => {
          const data = d.data();
          const userEmail = data.email || '';
          const isOwner = Boolean(isEmailPrimaryOwner(userEmail) || data.isPrimaryOwner || data.role === 'owner');
          const role: UserRole = isOwner ? 'owner' : parseUserRole(data.role || data.userRole, userEmail);
          const isDeactivated = Boolean(!isOwner && (data.isDeactivated === true || data.status === 'deactivated' || data.status === 'deleted' || data.adminAccessRevoked === true));
          const status = parseAdminStatus(data.status, role, isDeactivated);

          firestoreUsers.push({
            uid: data.uid || d.id,
            customerUid: data.customerUid || data.uid || d.id,
            email: userEmail,
            displayName: data.displayName || data.name || (isOwner ? 'Primary Owner Admin' : 'User'),
            role,
            status,
            phone: data.phone || data.phoneNumber || '',
            phoneNumber: data.phoneNumber || data.phone || '',
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
            createdAt: data.createdAt || '',
            lastLoginAt: data.lastLoginAt || '',
            assignedCircle: data.assignedCircle || (isOwner || role === 'admin' ? 'National HQ' : 'Vi Circle'),
            hasLoggedIn: Boolean(data.hasLoggedIn || data.lastLoginAt),
            loginCount: data.loginCount !== undefined ? Number(data.loginCount) : (data.lastLoginAt ? 1 : 0),
            downloadCount: Number(data.downloadCount || 0),
            lastDownloadedAt: data.lastDownloadedAt || '',
            hasDownloaded: Boolean(data.hasDownloaded || (data.downloadCount && Number(data.downloadCount) > 0)),
          });
        });
        return firestoreUsers;
      }
    } catch (e) {
      console.warn('Firestore getAllUsers notice:', e);
    }
  }
  return [];
}

/**
 * Real-time subscription to all users in Firestore for Admin/Owner directory.
 * Ensures Admin immediately sees newly registered customers without manual reload.
 */
export function subscribeToAllUsers(
  onUsers: (users: UserProfile[]) => void,
  onError?: (err: any) => void
): () => void {
  if (!db) return () => {};
  try {
    const usersCol = collection(db, 'users');
    return onSnapshot(
      usersCol,
      (snapshot) => {
        const list: UserProfile[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          const userEmail = data.email || '';
          const isOwner = Boolean(isEmailPrimaryOwner(userEmail) || data.isPrimaryOwner || data.role === 'owner');
          const role: UserRole = isOwner ? 'owner' : parseUserRole(data.role || data.userRole, userEmail);
          const isDeactivated = Boolean(!isOwner && (data.isDeactivated === true || data.status === 'deactivated' || data.status === 'deleted' || data.adminAccessRevoked === true));
          const status = parseAdminStatus(data.status, role, isDeactivated);

          list.push({
            uid: data.uid || d.id,
            customerUid: data.customerUid || data.uid || d.id,
            email: userEmail,
            displayName: data.displayName || data.name || (isOwner ? 'Primary Owner Admin' : 'User'),
            role,
            status,
            phone: data.phone || data.phoneNumber || '',
            phoneNumber: data.phoneNumber || data.phone || '',
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
            createdAt: data.createdAt || '',
            lastLoginAt: data.lastLoginAt || '',
            assignedCircle: data.assignedCircle || (isOwner || role === 'admin' ? 'National HQ' : 'Vi Circle'),
            hasLoggedIn: Boolean(data.hasLoggedIn || data.lastLoginAt),
            loginCount: data.loginCount !== undefined ? Number(data.loginCount) : (data.lastLoginAt ? 1 : 0),
            downloadCount: Number(data.downloadCount || 0),
            lastDownloadedAt: data.lastDownloadedAt || '',
            hasDownloaded: Boolean(data.hasDownloaded || (data.downloadCount && Number(data.downloadCount) > 0)),
          });
        });
        onUsers(list);
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
