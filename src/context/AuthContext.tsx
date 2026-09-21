import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  ConfirmationResult
} from 'firebase/auth';
import { auth, isFirebaseConfigured, verifyFirebaseWebConfig } from '../firebase';
import { UserProfile, UserRole, AdminApprovalStatus } from '../types';
import { 
  getUserProfile, 
  saveUserProfile, 
  subscribeToUserProfile, 
  parseUserRole,
  submitAdminRequest as submitAdminRequestService,
  isEmailPrimaryOwner,
  PRIMARY_OWNER_EMAIL
} from '../services/userService';
import { 
  sendFirebasePhoneOtp, 
  verifyFirebasePhoneOtp, 
  normalizePhoneNumber,
  getPhoneAuthErrorMessage,
  CustomConfirmationResult
} from '../services/phoneAuthService';
import { 
  executeFirebaseSignIn, 
  executeFirebaseSignUp, 
  executeFirebasePasswordReset, 
  formatAuthError 
} from '../services/firebaseAuthService';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  role: UserRole;
  isAdmin: boolean;
  isOwnerAdmin: boolean;
  isRubiOwner: boolean;
  isDeactivated: boolean;
  isPendingAdmin: boolean;
  isSalesperson: boolean;
  isCustomer: boolean;
  loading: boolean;
  isConfigured: boolean;
  // Phone Auth for Customer, Admin & Rubi Owner (Firebase Phone Authentication)
  sendPhoneOtp: (phoneNumber: string, containerId?: string) => Promise<ConfirmationResult | CustomConfirmationResult>;
  verifyPhoneOtp: (
    otp: string, 
    confirmationResult?: ConfirmationResult | CustomConfirmationResult,
    targetRole?: UserRole,
    customerDetails?: { displayName?: string; circle?: string }
  ) => Promise<UserProfile>;
  submitAdminRequest: (details: { displayName: string; phone: string; assignedCircle: string; requestNote?: string }) => Promise<void>;
  claimRubiOwner: (passkey: string) => Promise<{ success: boolean; message: string }>;
  refreshProfile: () => Promise<UserProfile | null>;
  // Email Auth for Customer & Salesperson
  signIn: (email: string, pass: string, requestedRole?: UserRole) => Promise<void>;
  signUp: (
    email: string, 
    pass: string, 
    requestedRole?: UserRole, 
    name?: string,
    phone?: string,
    circle?: string
  ) => Promise<void>;
  configureCurrentUserRole: (newRole: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole>('customer');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [configured, setConfigured] = useState<boolean>(isFirebaseConfigured());

  // Strict role and authorization derivation:
  // 1. Primary Owner Admin (raheema62038@gmail.com or role 'owner')
  const isOwnerAdmin = Boolean(
    (user?.email && isEmailPrimaryOwner(user.email)) ||
    (userProfile?.email && isEmailPrimaryOwner(userProfile.email)) ||
    role === 'owner' ||
    userProfile?.role === 'owner' ||
    userProfile?.isPrimaryOwner === true ||
    userProfile?.isOwner === true
  );
  // Alias for backward compatibility
  const isRubiOwner = isOwnerAdmin;

  // 2. Deactivation check: If deactivated or deleted by Owner, all admin access is strictly revoked
  const isDeactivated = Boolean(!isOwnerAdmin && (
    userProfile?.isDeactivated === true ||
    userProfile?.status === 'deactivated' ||
    userProfile?.status === 'deleted' ||
    userProfile?.adminAccessRevoked === true
  ));

  // 3. Admin access: TRUE ONLY if Primary Owner OR approved, non-deactivated Admin
  const isNormalAdmin = Boolean(
    !isOwnerAdmin &&
    !isDeactivated &&
    !userProfile?.adminAccessRevoked &&
    (role === 'admin' || userProfile?.role === 'admin') &&
    userProfile?.status === 'approved'
  );

  const isAdmin = isOwnerAdmin || isNormalAdmin;

  // 4. Pending Admin
  const isPendingAdmin = !isOwnerAdmin && !isAdmin && !isDeactivated && (role === 'pending_admin' || userProfile?.role === 'pending_admin' || userProfile?.status === 'pending');

  // 5. Customer
  const isSalesperson = false;
  const isCustomer = role === 'customer' || (!isAdmin && !isPendingAdmin);

  // Role and profile resolution strictly using authenticated UID and Firestore document
  const syncUserFromFirestore = async (firebaseUser: User): Promise<UserProfile | null> => {
    try {
      const profile = await getUserProfile(firebaseUser.uid, firebaseUser.email || undefined);
      if (profile) {
        setRole(profile.role);
        setUserProfile(profile);
        return profile;
      }

      const isPrimaryOwnerUser = isEmailPrimaryOwner(firebaseUser.email);
      const assignedRole: UserRole = isPrimaryOwnerUser ? 'owner' : 'customer';

      const fallbackProfile: UserProfile = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        phone: firebaseUser.phoneNumber || '',
        phoneNumber: firebaseUser.phoneNumber || '',
        displayName: firebaseUser.displayName || (isPrimaryOwnerUser ? 'Primary Owner Admin' : (firebaseUser.email?.split('@')[0] || 'Customer')),
        role: assignedRole,
        status: isPrimaryOwnerUser ? 'approved' : 'none',
        isPrimaryOwner: isPrimaryOwnerUser,
        isOwner: isPrimaryOwnerUser,
        isDeactivated: false,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        assignedCircle: isPrimaryOwnerUser ? 'National HQ (Owner)' : 'Vi Circle',
      };

      try {
        await saveUserProfile(fallbackProfile);
      } catch (saveErr) {
        console.warn('Persist fallback profile notice:', saveErr);
      }

      setRole(assignedRole);
      setUserProfile(fallbackProfile);
      return fallbackProfile;
    } catch (e) {
      console.warn('Error syncing user profile from Firestore:', e);
      return null;
    }
  };

  useEffect(() => {
    setConfigured(isFirebaseConfigured());

    // Clean up any legacy localStorage session tokens to ensure strict Firebase auth only
    try {
      localStorage.removeItem('vi_sales_mnp_user_session');
      localStorage.removeItem('vi_sales_mnp_active_role');
      const savedConfig = localStorage.getItem('vi_sales_mnp_firebase_config');
      if (savedConfig) {
        try {
          const parsed = JSON.parse(savedConfig);
          if (!verifyFirebaseWebConfig(parsed).isValid) {
            // Clean up stale or invalid keys
            localStorage.removeItem('vi_sales_mnp_firebase_config');
          }
        } catch {
          localStorage.removeItem('vi_sales_mnp_firebase_config');
        }
      }
    } catch (e) {
      // ignore
    }

    if (!auth) {
      setLoading(false);
      return;
    }

    let profileUnsub: (() => void) | null = null;
    let isCancelled = false;

    const safetyTimer = setTimeout(() => {
      if (!isCancelled) {
        setLoading(false);
      }
    }, 5000);

    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        if (profileUnsub) {
          profileUnsub();
          profileUnsub = null;
        }

        if (!currentUser) {
          clearTimeout(safetyTimer);
          setUser(null);
          setUserProfile(null);
          setRole('customer');
          setLoading(false);
          return;
        }

        setUser(currentUser);

        try {
          // Read the authenticated user's REAL role from the Firestore users document
          profileUnsub = subscribeToUserProfile(
            currentUser.uid,
            async (liveProfile) => {
              if (isCancelled) return;
              setUserProfile(liveProfile);
              setRole(liveProfile.role);
              clearTimeout(safetyTimer);
              setLoading(false);

              // If an active session belongs to a deactivated/deleted Admin, revoke and terminate access immediately
              const isOwner = isEmailPrimaryOwner(liveProfile.email) || liveProfile.isPrimaryOwner || liveProfile.role === 'owner';
              if (!isOwner && (liveProfile.isDeactivated || liveProfile.status === 'deactivated' || liveProfile.status === 'deleted' || liveProfile.adminAccessRevoked)) {
                console.warn('Admin access has been deactivated/revoked by Primary Owner. Terminating session.');
                if (auth) {
                  await signOut(auth).catch(() => {});
                }
                setUser(null);
                setRole('customer');
                setError('यह Admin खाता Primary Owner द्वारा Deactivate/Delete कर दिया गया है। एडमिन एक्सेस समाप्त कर दी गई है।');
              }
            },
            (err) => {
              console.warn('Profile listener notice:', err?.message);
            }
          );

          // Direct fetch to resolve role promptly
          const profile = await getUserProfile(currentUser.uid);
          if (isCancelled) return;

          if (profile) {
            setUserProfile(profile);
            setRole(profile.role);

            const isOwner = isEmailPrimaryOwner(profile.email) || profile.isPrimaryOwner || profile.role === 'owner';
            if (!isOwner && (profile.isDeactivated || profile.status === 'deactivated' || profile.status === 'deleted' || profile.adminAccessRevoked)) {
              if (auth) {
                await signOut(auth).catch(() => {});
              }
              setUser(null);
              setRole('customer');
              setError('यह Admin खाता Primary Owner द्वारा Deactivate/Delete कर दिया गया है। एडमिन एक्सेस समाप्त कर दी गई है।');
            }
          } else {
            await syncUserFromFirestore(currentUser);
          }
        } catch (err) {
          console.warn('Error reading user role from Firestore:', err);
        } finally {
          if (!isCancelled) {
            clearTimeout(safetyTimer);
            setLoading(false);
          }
        }
      },
      (err) => {
        clearTimeout(safetyTimer);
        console.error('Auth state change error:', err);
        setUser(null);
        setUserProfile(null);
        setRole('customer');
        setLoading(false);
      }
    );

    return () => {
      isCancelled = true;
      clearTimeout(safetyTimer);
      if (profileUnsub) profileUnsub();
      unsubscribe();
    };
  }, []);

  const clearError = () => setError(null);

  const getFriendlyErrorMessage = (err: any): string => {
    return formatAuthError(err);
  };

  /**
   * Phone Authentication: Send SMS OTP via real Firebase Phone Auth
   */
  const sendPhoneOtp = async (phoneNumber: string, containerId?: string): Promise<ConfirmationResult | CustomConfirmationResult> => {
    setError(null);
    try {
      const cr = await sendFirebasePhoneOtp(phoneNumber, containerId);
      return cr;
    } catch (err: any) {
      const msg = err?.message || getFriendlyErrorMessage(err);
      setError(msg);
      throw new Error(msg);
    }
  };

  /**
   * Phone Authentication: Verify OTP & load/check user profile in Firestore
   * Supports Customer, Admin & Rubi Owner phone verification with auto-registration
   */
  const verifyPhoneOtp = async (
    otp: string, 
    cr?: ConfirmationResult | CustomConfirmationResult,
    targetRole: UserRole = 'customer',
    customerDetails?: { displayName?: string; circle?: string }
  ): Promise<UserProfile> => {
    setError(null);
    try {
      const cred = await verifyFirebasePhoneOtp(otp, cr);
      const authenticatedUser = cred.user;
      setUser(authenticatedUser);

      // Fetch existing user profile from Firestore users/{uid}
      let profile = await getUserProfile(authenticatedUser.uid);

      if (profile) {
        // If an admin attempts phone login and is deactivated/deleted, block access
        const isOwner = isEmailPrimaryOwner(profile.email) || profile.isPrimaryOwner || profile.role === 'owner';
        if (!isOwner && (profile.isDeactivated || profile.status === 'deactivated' || profile.status === 'deleted' || profile.adminAccessRevoked)) {
          if (targetRole === 'admin') {
            if (auth) await signOut(auth).catch(() => {});
            setUser(null);
            setUserProfile(profile);
            setRole('customer');
            const deactMsg = 'यह Admin खाता Primary Owner (raheema62038@gmail.com) द्वारा Deactivate/Delete कर दिया गया है। एडमिन एक्सेस पूरी तरह बंद है।';
            setError(deactMsg);
            throw new Error(deactMsg);
          }
        }

        // PRESERVE EXISTING USER PROFILE & ROLE - Never overwrite an existing user!
        const emailDigits = (authenticatedUser.email?.startsWith('cust_') ? authenticatedUser.email.replace('cust_', '').split('@')[0] : '');
        const rawDigits = (authenticatedUser.phoneNumber || profile.phone || emailDigits || '').replace(/\D/g, '').slice(-10);
        const updatedProfile: UserProfile = {
          ...profile,
          phone: rawDigits || profile.phone || '',
          phoneNumber: authenticatedUser.phoneNumber || (rawDigits ? `+91${rawDigits}` : profile.phoneNumber || ''),
          lastLoginAt: new Date().toISOString(),
          hasLoggedIn: true,
          loginCount: (profile.loginCount || 1) + 1,
        };
        setUserProfile(updatedProfile);
        setRole(profile.role);
        saveUserProfile(updatedProfile).catch(() => {});
        return updatedProfile;
      }

      // If user document doesn't exist yet in Firestore (brand new registration via mobile OTP):
      if (targetRole === 'customer') {
        const emailDigits = (authenticatedUser.email?.startsWith('cust_') ? authenticatedUser.email.replace('cust_', '').split('@')[0] : '');
        const rawDigits = (authenticatedUser.phoneNumber || emailDigits || '').replace(/\D/g, '').slice(-10);
        const newCustomerProfile: UserProfile = {
          uid: authenticatedUser.uid,
          customerUid: authenticatedUser.uid,
          phone: rawDigits || authenticatedUser.phoneNumber || '',
          phoneNumber: authenticatedUser.phoneNumber || (rawDigits ? `+91${rawDigits}` : ''),
          displayName: customerDetails?.displayName?.trim() || (rawDigits ? `Customer (${rawDigits.slice(-4)})` : 'Vi Customer'),
          role: 'customer',
          status: 'approved',
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          hasLoggedIn: true,
          loginCount: 1,
          assignedCircle: customerDetails?.circle?.trim() || 'Maharashtra',
        };
        await saveUserProfile(newCustomerProfile);
        setUserProfile(newCustomerProfile);
        setRole('customer');
        return newCustomerProfile;
      }

      // If Admin flow: create baseline pending_admin profile
      const emailDigits = (authenticatedUser.email?.startsWith('cust_') ? authenticatedUser.email.replace('cust_', '').split('@')[0] : '');
      const rawDigits = (authenticatedUser.phoneNumber || emailDigits || '').replace(/\D/g, '').slice(-10);
      const newPhoneProfile: UserProfile = {
        uid: authenticatedUser.uid,
        phone: rawDigits || authenticatedUser.phoneNumber || '',
        phoneNumber: authenticatedUser.phoneNumber || (rawDigits ? `+91${rawDigits}` : ''),
        displayName: authenticatedUser.phoneNumber || (rawDigits ? `User (${rawDigits.slice(-4)})` : 'Vi User'),
        role: 'pending_admin',
        status: 'pending',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        assignedCircle: 'Vi Circle',
      };

      await saveUserProfile(newPhoneProfile);
      setUserProfile(newPhoneProfile);
      setRole('pending_admin');
      return newPhoneProfile;
    } catch (err: any) {
      const msg = getFriendlyErrorMessage(err);
      setError(msg);
      throw new Error(msg);
    }
  };

  /**
   * Submit Admin Request to Rubi Owner
   */
  const submitAdminRequest = async (details: {
    displayName: string;
    phone: string;
    assignedCircle: string;
    requestNote?: string;
  }) => {
    setError(null);
    if (!user) throw new Error('उपयोगकर्ता प्रमाणीकृत नहीं है।');
    try {
      const submitted = await submitAdminRequestService(user.uid, details);
      setUserProfile(submitted);
      setRole('pending_admin');
    } catch (err: any) {
      const msg = err?.message || 'Admin अनुरोध सबमिट करने में त्रुटि।';
      setError(msg);
      throw new Error(msg);
    }
  };

  /**
   * Discontinued: Owner Passkeys replaced by secure Primary Owner email authentication
   */
  const claimRubiOwner = async (_passkey: string): Promise<{ success: boolean; message: string }> => {
    return { 
      success: false, 
      message: 'Owner Passkey is discontinued. Please log in as Primary Owner Admin using raheema62038@gmail.com' 
    };
  };

  const refreshProfile = async (): Promise<UserProfile | null> => {
    if (!user) return null;
    try {
      const p = await getUserProfile(user.uid);
      if (p) {
        setUserProfile(p);
        setRole(p.role);
      }
      return p;
    } catch {
      return null;
    }
  };

  const signIn = async (
    email: string, 
    pass: string, 
    requestedRole: UserRole = 'customer'
  ) => {
    setError(null);
    setLoading(false);
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !pass) {
      const msg = 'कृपया ईमेल और पासवर्ड दोनों दर्ज करें।';
      setError(msg);
      throw new Error(msg);
    }

    try {
      const isPrimaryOwner = isEmailPrimaryOwner(cleanEmail);

      // Perform real Firebase Authentication with strict timeout
      const authResult = await executeFirebaseSignIn(cleanEmail, pass);
      const uid = authResult.uid;

      // Construct compatible User object
      const userObj: User = authResult.user || ({
        uid,
        email: cleanEmail,
        displayName: authResult.displayName || (isPrimaryOwner ? 'Primary Owner Admin' : 'User'),
        phoneNumber: null,
        photoURL: null,
        providerId: 'firebase',
        emailVerified: true,
        getIdToken: async () => authResult.idToken || '',
      } as unknown as User);

      // Profile lookup directly from Firestore
      let existingProfile: UserProfile | null = null;
      try {
        existingProfile = await getUserProfile(uid, cleanEmail);
      } catch (profileErr) {
        console.warn('Profile read notice:', profileErr);
      }

      // Handle Admin login strictly (Email & Password ONLY - No Passkey/Security Key)
      if (requestedRole === 'admin') {
        const isDeactivatedAccount = !isPrimaryOwner && (
          existingProfile?.isDeactivated === true ||
          existingProfile?.status === 'deactivated' ||
          existingProfile?.status === 'deleted' ||
          existingProfile?.adminAccessRevoked === true
        );

        if (isDeactivatedAccount) {
          if (auth) await signOut(auth).catch(() => {});
          setUser(null);
          setUserProfile(null);
          setRole('customer');
          const deactMsg = 'यह Admin खाता Primary Owner (raheema62038@gmail.com) द्वारा Deactivate/Delete कर दिया गया है। एडमिन एक्सेस पूरी तरह बंद है। केवल Primary Owner ही इसे पुनः सक्रिय कर सकते हैं।';
          setError(deactMsg);
          throw new Error(deactMsg);
        }

        const isAuthorizedAdmin = 
          isPrimaryOwner ||
          (
            existingProfile?.role === 'admin' &&
            existingProfile?.status === 'approved' &&
            !existingProfile?.isDeactivated &&
            !existingProfile?.adminAccessRevoked
          ) ||
          existingProfile?.role === 'owner';

        if (!isAuthorizedAdmin) {
          // Strict rejection: prevent any unauthorized or customer account from accessing the Admin Portal
          if (auth) await signOut(auth).catch(() => {});
          setUser(null);
          setUserProfile(null);
          setRole('customer');
          const deniedMsg = 'अनधिकृत प्रवेश: यह खाता एडमिन पोर्टल के लिए अधिकृत नहीं है। केवल Primary Owner Admin (raheema62038@gmail.com) एवं अधिकृत Admins ही यहाँ लॉगिन कर सकते हैं। कृपया ग्राहक पोर्टल से लॉगिन करें।';
          setError(deniedMsg);
          throw new Error(deniedMsg);
        }

        if (!existingProfile || isPrimaryOwner) {
          const adminProf: UserProfile = {
            uid,
            email: cleanEmail,
            displayName: existingProfile?.displayName || userObj.displayName || (isPrimaryOwner ? 'Primary Owner Admin' : 'Vi Admin'),
            role: isPrimaryOwner ? 'owner' : 'admin',
            status: 'approved',
            isPrimaryOwner,
            isOwner: isPrimaryOwner,
            isDeactivated: false,
            createdAt: existingProfile?.createdAt || new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
            assignedCircle: isPrimaryOwner ? 'National HQ (Owner)' : (existingProfile?.assignedCircle || 'National HQ'),
          };
          try {
            await saveUserProfile(adminProf);
          } catch (e) {
            console.warn('Admin profile save notice:', e);
          }
          existingProfile = adminProf;
        }

        setUser(userObj);
        setRole(isPrimaryOwner ? 'owner' : 'admin');
        setUserProfile(existingProfile);
        setLoading(false);
        return;
      }

      // Customer Sign-in
      if (!existingProfile) {
        // First time customer profile creation in Firestore
        const customerProfile: UserProfile = {
          uid,
          customerUid: uid,
          email: cleanEmail,
          displayName: userObj.displayName || cleanEmail.split('@')[0] || 'Customer',
          role: 'customer',
          status: 'approved',
          phone: '',
          phoneNumber: '',
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          hasLoggedIn: true,
          loginCount: 1,
          assignedCircle: 'Maharashtra',
        };
        try {
          await saveUserProfile(customerProfile);
        } catch (e) {
          console.warn('Customer profile creation notice:', e);
        }
        existingProfile = customerProfile;
      } else {
        // Update last login timestamp in Firestore, preserving all existing user details
        const updatedCustomer: UserProfile = {
          ...existingProfile,
          lastLoginAt: new Date().toISOString(),
          hasLoggedIn: true,
          loginCount: (existingProfile.loginCount || 1) + 1,
        };
        saveUserProfile(updatedCustomer).catch((e) => console.warn('Update last login notice:', e));
        existingProfile = updatedCustomer;
      }

      setUser(userObj);
      // If an existing profile is admin or owner, preserve it; otherwise strictly 'customer'
      const assignedRole: UserRole = (existingProfile.role === 'admin' || existingProfile.role === 'owner') 
        ? existingProfile.role 
        : 'customer';
      setRole(assignedRole);
      setUserProfile(existingProfile);
      setLoading(false);
    } catch (err: any) {
      console.warn('Firebase Auth signIn notice:', err?.code, err?.message);
      const msg = getFriendlyErrorMessage(err);
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (
    email: string, 
    pass: string, 
    requestedRole: UserRole = 'customer', 
    name?: string,
    phone?: string,
    circle?: string
  ) => {
    setError(null);
    setLoading(false);
    const cleanEmail = email.trim().toLowerCase();

    try {
      const authResult = await executeFirebaseSignUp(cleanEmail, pass, name);
      const uid = authResult.uid;

      const userObj: User = authResult.user || ({
        uid,
        email: cleanEmail,
        displayName: name?.trim() || cleanEmail.split('@')[0] || 'Customer',
        phoneNumber: phone?.trim() || null,
        photoURL: null,
        providerId: 'firebase',
        emailVerified: true,
        getIdToken: async () => authResult.idToken || '',
      } as unknown as User);

      const newProfile: UserProfile = {
        uid,
        customerUid: uid,
        email: cleanEmail,
        phone: phone?.trim() || '',
        phoneNumber: phone?.trim() || '',
        displayName: name?.trim() || cleanEmail.split('@')[0] || 'Customer',
        role: 'customer',
        status: 'approved',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        hasLoggedIn: true,
        loginCount: 1,
        assignedCircle: circle?.trim() || 'Maharashtra',
      };
      
      // Save customer profile permanently in Firestore
      try {
        await saveUserProfile(newProfile);
      } catch (e) {
        console.warn('Customer profile save notice:', e);
      }

      setRole('customer');
      setUser(userObj);
      setUserProfile(newProfile);
    } catch (err: any) {
      console.warn('Firebase Auth signUp notice:', err?.code, err?.message);
      const msg = getFriendlyErrorMessage(err);
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const configureCurrentUserRole = async (newRole: UserRole) => {
    if (!user) return;
    try {
      const existing = await getUserProfile(user.uid);
      const safeRole: UserRole = (newRole === 'admin' && existing?.status !== 'approved') ? 'pending_admin' : newRole;
      const updated: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        phone: user.phoneNumber || existing?.phone || '',
        displayName: existing?.displayName || user.displayName || user.email?.split('@')[0] || 'User',
        role: safeRole,
        status: safeRole === 'admin' ? 'approved' : safeRole === 'pending_admin' ? 'pending' : 'approved',
        createdAt: existing?.createdAt || new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        assignedCircle: safeRole === 'admin' ? 'National HQ' : 'Vi Circle',
      };
      await saveUserProfile(updated);
      setRole(safeRole);
      setUserProfile(updated);
    } catch (e) {
      console.warn('Error configuring current user role:', e);
    }
  };

  const logout = async () => {
    setError(null);
    if (auth) {
      try {
        await signOut(auth);
      } catch (err: any) {
        console.warn('Firebase signOut error:', err);
      }
    }
    setUser(null);
    setUserProfile(null);
    setRole('customer');
  };

  const resetPassword = async (email: string) => {
    setError(null);
    const cleanEmail = email.trim().toLowerCase();
    try {
      await executeFirebasePasswordReset(cleanEmail);
    } catch (err: any) {
      const msg = getFriendlyErrorMessage(err);
      setError(msg);
      throw new Error(msg);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        role,
        isAdmin,
        isOwnerAdmin,
        isRubiOwner,
        isDeactivated,
        isPendingAdmin,
        isSalesperson,
        isCustomer,
        loading,
        isConfigured: configured,
        sendPhoneOtp,
        verifyPhoneOtp,
        submitAdminRequest,
        claimRubiOwner,
        refreshProfile,
        signIn,
        signUp,
        configureCurrentUserRole,
        logout,
        resetPassword,
        error,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

