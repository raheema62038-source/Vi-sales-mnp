import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  signOut,
  User,
  UserCredential
} from 'firebase/auth';
import { auth, DEFAULT_FIREBASE_CONFIG } from '../firebase';

export interface FirebaseAuthResult {
  uid: string;
  email: string;
  displayName?: string;
  idToken?: string;
  user?: User;
}

export interface RestAuthResponse {
  localId?: string;
  email?: string;
  displayName?: string;
  idToken?: string;
  refreshToken?: string;
  expiresIn?: string;
  error?: {
    code: number;
    message: string;
    errors?: Array<{ message: string; reason: string }>;
  };
}

const IDENTITY_TOOLKIT_BASE = 'https://identitytoolkit.googleapis.com/v1';

/**
 * Maps raw error codes/strings to clear, user-friendly messages.
 */
export function formatAuthError(err: any): string {
  const code = (err?.code || '').toLowerCase();
  const rawMsg = (err?.message || '').toLowerCase();

  if (
    code.includes('invalid-credential') ||
    code.includes('invalid-login-credentials') ||
    code.includes('wrong-password') ||
    code.includes('user-not-found') ||
    rawMsg.includes('invalid_login_credentials') ||
    rawMsg.includes('email_not_found') ||
    rawMsg.includes('invalid_password')
  ) {
    return 'अमान्य ईमेल या पासवर्ड (Invalid email or password)। कृपया सही ईमेल और पासवर्ड दर्ज करें।';
  }

  if (code.includes('email-already-in-use') || rawMsg.includes('email_exists')) {
    return 'यह ईमेल पहले से पंजीकृत है (Email already in use)। कृपया लॉगिन टैब से प्रवेश करें या पासवर्ड रीसेट करें।';
  }

  if (code.includes('weak-password') || rawMsg.includes('weak_password')) {
    return 'पासवर्ड कमजोर है (Weak password)। कृपया कम से कम 6 अक्षरों का सुरक्षित पासवर्ड दर्ज करें।';
  }

  if (code.includes('invalid-email') || rawMsg.includes('invalid_email')) {
    return 'कृपया सही ईमेल पता दर्ज करें (Invalid email format)।';
  }

  if (code.includes('too-many-requests') || rawMsg.includes('too_many_attempts')) {
    return 'अत्यधिक प्रयासों के कारण सुरक्षा अस्थायी रूप से अवरुद्ध है। कृपया 1-2 मिनट बाद पुनः प्रयास करें।';
  }

  if (code.includes('user-disabled') || rawMsg.includes('user_disabled')) {
    return 'यह खाता अक्षम (Disabled) कर दिया गया है। कृपया सहायता से संपर्क करें।';
  }

  if (code.includes('network-request-failed')) {
    return 'नेटवर्क त्रुटि (Network error)। कृपया अपने इंटरनेट कनेक्शन की जांच करें।';
  }

  if (code.includes('configuration-not-found') || rawMsg.includes('configuration_not_found')) {
    return 'Firebase प्रमाणीकरण कॉन्फ़िगरेशन नहीं मिला। कृपया पुनः प्रयास करें।';
  }

  return err?.message || 'प्रमाणीकरण में त्रुटि हुई (Authentication error)।';
}

function promiseWithTimeout<T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error(errorMsg)), ms);
  });
  return Promise.race([
    promise.then((res) => {
      clearTimeout(timer);
      return res;
    }),
    timeoutPromise,
  ]);
}

/**
 * Authenticates user using Firebase Authentication.
 * Uses Firebase Web SDK signInWithEmailAndPassword to ensure auth.currentUser is set
 * and securely persisted in browser IndexedDB across sessions and page refreshes.
 */
export async function executeFirebaseSignIn(
  email: string, 
  pass: string
): Promise<FirebaseAuthResult> {
  const cleanEmail = email.trim().toLowerCase();
  const apiKey = DEFAULT_FIREBASE_CONFIG.apiKey;

  // 1. Try Firebase Web SDK first if auth is initialized with 20s timeout
  if (auth) {
    try {
      const cred: UserCredential = await promiseWithTimeout(
        signInWithEmailAndPassword(auth, cleanEmail, pass),
        20000,
        'SDK_AUTH_TIMEOUT'
      );
      return {
        uid: cred.user.uid,
        email: cred.user.email || cleanEmail,
        displayName: cred.user.displayName || undefined,
        user: cred.user
      };
    } catch (sdkErr: any) {
      const errCode = (sdkErr?.code || '').toLowerCase();
      const errMsg = (sdkErr?.message || '').toLowerCase();

      // If it's standard bad credentials, throw formatted user error immediately
      if (
        errCode.includes('invalid-credential') ||
        errCode.includes('invalid-login-credentials') ||
        errCode.includes('wrong-password') ||
        errCode.includes('user-not-found') ||
        errCode.includes('user-disabled') ||
        errCode.includes('too-many-requests')
      ) {
        throw new Error(formatAuthError(sdkErr));
      }

      console.warn('Firebase SDK sign-in notice, using Identity Toolkit fallback:', errCode || errMsg);
    }
  }

  // 2. Direct Google Identity Platform REST API with 10s timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(`${IDENTITY_TOOLKIT_BASE}/accounts:signInWithPassword?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        email: cleanEmail,
        password: pass,
        returnSecureToken: true
      })
    });

    const data: RestAuthResponse = await res.json();

    if (!res.ok || data.error) {
      const errorMsg = data.error?.message || 'SIGNIN_FAILED';
      throw new Error(formatAuthError({ message: errorMsg }));
    }

    return {
      uid: data.localId || `user_${Date.now()}`,
      email: data.email || cleanEmail,
      displayName: data.displayName || undefined,
      idToken: data.idToken
    };
  } catch (restErr: any) {
    if (restErr?.name === 'AbortError') {
      throw new Error('सर्वर से संपर्क करने में अधिक समय लग रहा है (Network request timeout)। कृपया पुनः प्रयास करें।');
    }
    throw new Error(formatAuthError(restErr));
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Creates a new user in Firebase Authentication.
 * Uses Firebase Web SDK createUserWithEmailAndPassword so auth.currentUser is populated
 * and persisted permanently in browser session.
 */
export async function executeFirebaseSignUp(
  email: string, 
  pass: string, 
  displayName?: string
): Promise<FirebaseAuthResult> {
  const cleanEmail = email.trim().toLowerCase();
  const apiKey = DEFAULT_FIREBASE_CONFIG.apiKey;

  if (auth) {
    try {
      const cred: UserCredential = await promiseWithTimeout(
        createUserWithEmailAndPassword(auth, cleanEmail, pass),
        20000,
        'SDK_SIGNUP_TIMEOUT'
      );
      return {
        uid: cred.user.uid,
        email: cred.user.email || cleanEmail,
        displayName: cred.user.displayName || displayName,
        user: cred.user
      };
    } catch (sdkErr: any) {
      const errCode = (sdkErr?.code || '').toLowerCase();
      if (
        errCode.includes('email-already-in-use') || 
        errCode.includes('weak-password') ||
        errCode.includes('invalid-email')
      ) {
        throw new Error(formatAuthError(sdkErr));
      }
      console.warn('Firebase SDK sign-up notice, using Identity Toolkit fallback:', sdkErr?.message);
    }
  }

  // REST API Fallback
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(`${IDENTITY_TOOLKIT_BASE}/accounts:signUp?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        email: cleanEmail,
        password: pass,
        displayName: displayName || cleanEmail.split('@')[0],
        returnSecureToken: true
      })
    });

    const data: RestAuthResponse = await res.json();

    if (!res.ok || data.error) {
      const errorMsg = data.error?.message || 'SIGNUP_FAILED';
      throw new Error(formatAuthError({ message: errorMsg }));
    }

    return {
      uid: data.localId || `user_${Date.now()}`,
      email: data.email || cleanEmail,
      displayName: data.displayName || displayName,
      idToken: data.idToken
    };
  } catch (restErr: any) {
    if (restErr?.name === 'AbortError') {
      throw new Error('सर्वर से संपर्क करने में अधिक समय लग रहा है (Network request timeout)। कृपया पुनः प्रयास करें।');
    }
    throw new Error(formatAuthError(restErr));
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Sends real Firebase Authentication password reset email.
 */
export async function executeFirebasePasswordReset(email: string): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  const apiKey = DEFAULT_FIREBASE_CONFIG.apiKey;

  if (auth) {
    try {
      await promiseWithTimeout(
        sendPasswordResetEmail(auth, cleanEmail),
        15000,
        'SDK_RESET_TIMEOUT'
      );
      return;
    } catch (sdkErr: any) {
      console.warn('Firebase SDK reset-password notice, using Identity Toolkit REST fallback:', sdkErr?.message);
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(`${IDENTITY_TOOLKIT_BASE}/accounts:sendOobCode?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        requestType: 'PASSWORD_RESET',
        email: cleanEmail
      })
    });

    const data: any = await res.json();
    if (!res.ok || data.error) {
      throw new Error(formatAuthError({ message: data.error?.message || 'RESET_FAILED' }));
    }
  } catch (restErr: any) {
    if (restErr?.name === 'AbortError') {
      throw new Error('सर्वर से संपर्क करने में अधिक समय लग रहा है (Network request timeout)। कृपया पुनः प्रयास करें।');
    }
    throw new Error(formatAuthError(restErr));
  } finally {
    clearTimeout(timeoutId);
  }
}
