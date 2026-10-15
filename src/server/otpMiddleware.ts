import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { IncomingMessage, ServerResponse } from 'http';

const FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY || 'AIzaSyBMOEFTcBLVo-azih7gK-KGimcvS-oKfHo';
const FIREBASE_PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || 'vi-seles-mnp-e7594';
const IDENTITY_TOOLKIT_BASE = 'https://identitytoolkit.googleapis.com/v1';
const FIRESTORE_REST_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

const PRIMARY_OWNER_PHONE = '9175601497';
const PRIMARY_OWNER_EMAIL = 'raheema62038@gmail.com';

interface OtpSession {
  sessionId: string;
  phone: string;
  formattedPhone: string;
  otpCode: string;
  createdAt: number;
  expiresAt: number;
  attempts: number;
  verified: boolean;
  portal: 'customer' | 'admin';
  customerName?: string;
  customerEmail?: string;
  smsDelivered: boolean;
  providerStatus: string;
}

interface RegisteredPhoneRecord {
  phone: string;
  name?: string;
  email?: string;
  circle?: string;
  role?: 'customer' | 'admin' | 'owner';
  registeredAt: string;
}

// In-memory OTP sessions store (keyed by 10-digit phone number)
const otpSessions = new Map<string, OtpSession>();

// Persistent registered phones file path
const DATA_DIR = path.resolve(process.cwd(), '.data');
const REGISTERED_PHONES_FILE = path.join(DATA_DIR, 'registered_phones.json');

function loadRegisteredPhones(): Map<string, RegisteredPhoneRecord> {
  const map = new Map<string, RegisteredPhoneRecord>();
  // Pre-seed known primary owner & existing verified numbers
  map.set(PRIMARY_OWNER_PHONE, {
    phone: PRIMARY_OWNER_PHONE,
    name: 'Primary Owner Admin',
    email: PRIMARY_OWNER_EMAIL,
    circle: 'Maharashtra & Goa',
    role: 'owner',
    registeredAt: new Date().toISOString(),
  });
  map.set('7709229567', {
    phone: '7709229567',
    name: 'isaqureshinew',
    email: 'isaqureshinew@gmail.com',
    circle: 'Maharashtra & Goa',
    role: 'customer',
    registeredAt: new Date().toISOString(),
  });
  map.set('9876543210', {
    phone: '9876543210',
    name: 'Vi Customer',
    email: 'cust_9876543210@vi-telecom-auth.internal',
    circle: 'Maharashtra & Goa',
    role: 'customer',
    registeredAt: new Date().toISOString(),
  });

  try {
    if (fs.existsSync(REGISTERED_PHONES_FILE)) {
      const raw = fs.readFileSync(REGISTERED_PHONES_FILE, 'utf8');
      const parsed: RegisteredPhoneRecord[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && item.phone) {
            map.set(item.phone, item);
          }
        }
      }
    }
  } catch (err) {
    console.warn('Notice reading registered_phones.json:', err);
  }
  return map;
}

function saveRegisteredPhone(record: RegisteredPhoneRecord): void {
  try {
    const map = loadRegisteredPhones();
    const existing = map.get(record.phone);
    map.set(record.phone, {
      ...existing,
      ...record,
      registeredAt: existing?.registeredAt || record.registeredAt || new Date().toISOString(),
    });
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(REGISTERED_PHONES_FILE, JSON.stringify(Array.from(map.values()), null, 2), 'utf8');
  } catch (err) {
    console.warn('Notice saving registered_phones.json:', err);
  }
}

/**
 * Strictly validates a 10-digit Indian mobile number according to TRAI/DoT numbering plan.
 */
export function validateIndianMobile(rawInput: string): {
  isValid: boolean;
  cleanPhone: string;
  formattedPhone: string;
  errorHi?: string;
  errorEn?: string;
} {
  const raw = String(rawInput || '').trim();
  const digitsOnly = raw.replace(/\D/g, '');

  let clean = digitsOnly;
  if (clean.length === 12 && clean.startsWith('91')) {
    clean = clean.slice(2);
  } else if (clean.length === 11 && clean.startsWith('0')) {
    clean = clean.slice(1);
  }

  if (clean.length !== 10) {
    return {
      isValid: false,
      cleanPhone: clean,
      formattedPhone: `+91${clean}`,
      errorHi: 'कृपया ठीक 10 अंकों का मान्य भारतीय मोबाइल नंबर दर्ज करें।',
      errorEn: 'Please enter an exact 10-digit valid Indian mobile number.',
    };
  }

  if (!/^[6-9]\d{9}$/.test(clean)) {
    return {
      isValid: false,
      cleanPhone: clean,
      formattedPhone: `+91${clean}`,
      errorHi: 'अमान्य मोबाइल नंबर। भारतीय मोबाइल नंबर केवल 6, 7, 8 या 9 से शुरू होना चाहिए।',
      errorEn: 'Invalid mobile number. Indian mobile numbers must start with 6, 7, 8, or 9.',
    };
  }

  // Reject invalid repeated sequences like 6666666666, 7777777777, 8888888888, 0000000000
  if (/^(\d)\1{9}$/.test(clean) && clean !== '9999999999') {
    return {
      isValid: false,
      cleanPhone: clean,
      formattedPhone: `+91${clean}`,
      errorHi: 'यह एक अमान्य या डमी मोबाइल नंबर है। कृपया अपना सही 10-अंकों का सक्रिय मोबाइल नंबर दर्ज करें।',
      errorEn: 'This is an invalid or dummy mobile number. Please enter a valid active 10-digit mobile number.',
    };
  }

  // Reject numbers with 8 or more identical consecutive digits (e.g., 9000000000)
  if (/(\d)\1{7,}/.test(clean) && clean !== '9999999999') {
    return {
      isValid: false,
      cleanPhone: clean,
      formattedPhone: `+91${clean}`,
      errorHi: 'कृपया एक मान्य और पंजीकृत 10-अंकों का भारतीय मोबाइल नंबर दर्ज करें।',
      errorEn: 'Please enter a valid and registered 10-digit Indian mobile number.',
    };
  }

  return {
    isValid: true,
    cleanPhone: clean,
    formattedPhone: `+91${clean}`,
  };
}

/**
 * Checks if a 10-digit Indian mobile number is registered in Firebase Auth, Firestore leads, or local registry,
 * and ensures its deterministic Firebase Auth account is ready.
 */
async function checkAndEnsurePhoneRegistration(cleanPhone: string): Promise<{
  isRegistered: boolean;
  uid?: string;
  customerName?: string;
  customerEmail?: string;
  circle?: string;
  role?: 'customer' | 'admin' | 'owner';
}> {
  const registeredMap = loadRegisteredPhones();
  const localRec = registeredMap.get(cleanPhone);

  const customerEmail = `cust_${cleanPhone}@vi-telecom-auth.internal`;
  const customerPassword = `ViSecureCustomer_${cleanPhone}_Pass!`;

  // 1. Check if deterministic account already exists in Firebase Identity Toolkit
  try {
    const signInRes = await fetch(
      `${IDENTITY_TOOLKIT_BASE}/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: customerEmail,
          password: customerPassword,
          returnSecureToken: true,
        }),
      }
    );

    if (signInRes.ok) {
      const signInData: any = await signInRes.json();
      const record: RegisteredPhoneRecord = {
        phone: cleanPhone,
        name: localRec?.name || signInData.displayName || `Customer (+91 ${cleanPhone})`,
        email: localRec?.email || customerEmail,
        role: cleanPhone === PRIMARY_OWNER_PHONE ? 'owner' : (localRec?.role || 'customer'),
        registeredAt: localRec?.registeredAt || new Date().toISOString(),
      };
      saveRegisteredPhone(record);
      return {
        isRegistered: true,
        uid: signInData.localId,
        customerName: record.name,
        customerEmail: record.email,
        role: record.role,
      };
    }
  } catch (err) {
    console.warn('Identity Toolkit signIn check notice:', err);
  }

  // 2. Check Firestore 'leads' collection for existing customer bookings with this mobile number
  try {
    const ownerRes = await fetch(
      `${IDENTITY_TOOLKIT_BASE}/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `cust_${PRIMARY_OWNER_PHONE}@vi-telecom-auth.internal`,
          password: `ViSecureCustomer_${PRIMARY_OWNER_PHONE}_Pass!`,
          returnSecureToken: true,
        }),
      }
    );

    if (ownerRes.ok) {
      const ownerAuth: any = await ownerRes.json();
      const leadsRes = await fetch(`${FIRESTORE_REST_BASE}/leads`, {
        headers: { Authorization: `Bearer ${ownerAuth.idToken}` },
      });

      if (leadsRes.ok) {
        const leadsData: any = await leadsRes.json();
        const docs = leadsData.documents || [];
        for (const docItem of docs) {
          const f = docItem.fields || {};
          const leadMobile = (f.mobileNumber?.stringValue || '').replace(/\D/g, '').slice(-10);
          const altMobile = (f.alternateNumber?.stringValue || '').replace(/\D/g, '').slice(-10);
          if (leadMobile === cleanPhone || altMobile === cleanPhone) {
            const cName = f.customerName?.stringValue || f.createdByName?.stringValue || `Customer (${cleanPhone.slice(-4)})`;
            const cEmail = f.customerEmail?.stringValue || f.createdByEmail?.stringValue || customerEmail;
            const cCircle = f.cityCircle?.stringValue || 'Maharashtra & Goa';

            // Provision the Firebase Auth account for this registered lead phone
            let uid = '';
            try {
              const signUpRes = await fetch(
                `${IDENTITY_TOOLKIT_BASE}/accounts:signUp?key=${FIREBASE_API_KEY}`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    email: customerEmail,
                    password: customerPassword,
                    displayName: cName,
                    returnSecureToken: true,
                  }),
                }
              );
              if (signUpRes.ok) {
                const signUpData: any = await signUpRes.json();
                uid = signUpData.localId || '';
              }
            } catch (_) {}

            saveRegisteredPhone({
              phone: cleanPhone,
              name: cName,
              email: cEmail,
              circle: cCircle,
              role: 'customer',
              registeredAt: new Date().toISOString(),
            });

            return {
              isRegistered: true,
              uid,
              customerName: cName,
              customerEmail: cEmail,
              circle: cCircle,
              role: 'customer',
            };
          }
        }
      }
    }
  } catch (err) {
    console.warn('Firestore leads phone lookup notice:', err);
  }

  // 3. If it's in localRec, or if it's a valid 10-digit Indian mobile number, provision in Firebase Auth so OTP login works seamlessly
  try {
    const signUpRes = await fetch(
      `${IDENTITY_TOOLKIT_BASE}/accounts:signUp?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: customerEmail,
          password: customerPassword,
          displayName: localRec?.name || `Customer (+91 ${cleanPhone})`,
          returnSecureToken: true,
        }),
      }
    );

    if (signUpRes.ok) {
      const signUpData: any = await signUpRes.json();
      const record: RegisteredPhoneRecord = {
        phone: cleanPhone,
        name: localRec?.name || `Customer (+91 ${cleanPhone})`,
        email: localRec?.email || customerEmail,
        circle: localRec?.circle || 'Maharashtra & Goa',
        role: cleanPhone === PRIMARY_OWNER_PHONE ? 'owner' : 'customer',
        registeredAt: new Date().toISOString(),
      };
      saveRegisteredPhone(record);
      return {
        isRegistered: true,
        uid: signUpData.localId,
        customerName: record.name,
        customerEmail: record.email,
        circle: record.circle,
        role: record.role,
      };
    }
  } catch (err) {
    console.warn('Identity Toolkit auto-register notice:', err);
  }

  return {
    isRegistered: Boolean(localRec),
    customerName: localRec?.name,
    customerEmail: localRec?.email,
    circle: localRec?.circle,
    role: localRec?.role || 'customer',
  };
}

/**
 * Attempts real SMS delivery via configured SMS gateways (Fast2SMS, MSG91, Twilio, Webhook, or Firebase Identity Toolkit).
 */
async function dispatchRealSmsOtp(
  cleanPhone: string,
  otpCode: string,
  recaptchaToken?: string
): Promise<{ delivered: boolean; provider: string; detail?: string }> {
  // 1. Check Fast2SMS API Key
  const fast2smsKey = process.env.FAST2SMS_API_KEY || process.env.VITE_FAST2SMS_API_KEY;
  if (fast2smsKey) {
    try {
      const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          authorization: fast2smsKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          route: 'otp',
          variables_values: otpCode,
          numbers: cleanPhone,
        }),
      });
      const data: any = await res.json();
      if (res.ok && data.return === true) {
        return { delivered: true, provider: 'Fast2SMS' };
      }
    } catch (err: any) {
      console.warn('Fast2SMS dispatch notice:', err?.message);
    }
  }

  // 2. Check MSG91 Auth Key
  const msg91Key = process.env.MSG91_AUTH_KEY || process.env.VITE_MSG91_AUTH_KEY;
  const msg91TemplateId = process.env.MSG91_TEMPLATE_ID || process.env.VITE_MSG91_TEMPLATE_ID;
  if (msg91Key && msg91TemplateId) {
    try {
      const url = `https://control.msg91.com/api/v5/otp?template_id=${encodeURIComponent(msg91TemplateId)}&mobile=91${cleanPhone}&authkey=${encodeURIComponent(msg91Key)}&otp=${encodeURIComponent(otpCode)}`;
      const res = await fetch(url, { method: 'POST' });
      if (res.ok) {
        return { delivered: true, provider: 'MSG91' };
      }
    } catch (err: any) {
      console.warn('MSG91 dispatch notice:', err?.message);
    }
  }

  // 3. Check Custom SMS Webhook
  const webhookUrl = process.env.SMS_WEBHOOK_URL || process.env.VITE_SMS_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: `+91${cleanPhone}`,
          phone: cleanPhone,
          otp: otpCode,
          message: `Your Vi Sales MNP verification OTP is ${otpCode}. Valid for 5 minutes.`,
        }),
      });
      if (res.ok) {
        return { delivered: true, provider: 'Webhook' };
      }
    } catch (err: any) {
      console.warn('SMS Webhook notice:', err?.message);
    }
  }

  // 4. Try Firebase Identity Toolkit sendVerificationCode if reCAPTCHA token was provided
  if (recaptchaToken) {
    try {
      const fbRes = await fetch(
        `${IDENTITY_TOOLKIT_BASE}/accounts:sendVerificationCode?key=${FIREBASE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phoneNumber: `+91${cleanPhone}`,
            recaptchaToken,
          }),
        }
      );
      const fbData: any = await fbRes.json();
      if (fbRes.ok && fbData.sessionInfo) {
        return { delivered: true, provider: 'FirebasePhoneAuth', detail: fbData.sessionInfo };
      }
      const fbErr = fbData?.error?.message || 'FIREBASE_SMS_RESTRICTED';
      return { delivered: false, provider: 'FirebaseIdentityGateway', detail: fbErr };
    } catch (err: any) {
      return { delivered: false, provider: 'FirebaseIdentityGateway', detail: err?.message };
    }
  }

  return {
    delivered: false,
    provider: 'ViTelecomAuthServer',
    detail: 'SERVER_GENERATED_6_DIGIT_OTP',
  };
}

function readJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
      if (body.length > 1e6) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, statusCode: number, payload: Record<string, any>): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.end(JSON.stringify(payload));
}

const PORTAL_SYNC_FILE = path.join(DATA_DIR, 'portal_sync_state.json');

function ensureDataDir(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (_) {}
}

interface PortalSyncState {
  portalConfig?: any;
  offerConfig?: any;
  versionConfig?: any;
  updatedAt: string;
}

const sseClients = new Set<ServerResponse>();

function loadLocalSyncState(): PortalSyncState {
  ensureDataDir();
  try {
    if (fs.existsSync(PORTAL_SYNC_FILE)) {
      const raw = fs.readFileSync(PORTAL_SYNC_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to load portal_sync_state.json:', err);
  }
  return { updatedAt: new Date().toISOString() };
}

function saveLocalSyncState(patch: Partial<PortalSyncState>): PortalSyncState {
  ensureDataDir();
  const current = loadLocalSyncState();
  const next: PortalSyncState = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  try {
    fs.writeFileSync(PORTAL_SYNC_FILE, JSON.stringify(next, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to write portal_sync_state.json:', err);
  }
  return next;
}

function broadcastPortalSync(state: PortalSyncState) {
  const payload = `data: ${JSON.stringify(state)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch (_) {
      sseClients.delete(client);
    }
  }
}

let cachedServerAuthToken: { token: string; expiresAt: number } | null = null;

async function getServerFirebaseToken(): Promise<string | null> {
  if (cachedServerAuthToken && Date.now() < cachedServerAuthToken.expiresAt) {
    return cachedServerAuthToken.token;
  }
  try {
    const email = `9027808694@visales.local`;
    const password = `ViSalesPhoneAuth#9027808694`;
    const res = await fetch(
      `${IDENTITY_TOOLKIT_BASE}/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );
    if (res.ok) {
      const data: any = await res.json();
      if (data.idToken) {
        cachedServerAuthToken = {
          token: data.idToken,
          expiresAt: Date.now() + 45 * 60 * 1000,
        };
        return data.idToken;
      }
    }
  } catch (err) {
    console.warn('Server Firebase token fetch notice:', err);
  }
  return null;
}

async function syncWithFirestoreCloud(patch?: Partial<PortalSyncState>): Promise<PortalSyncState> {
  const localState = patch ? saveLocalSyncState(patch) : loadLocalSyncState();
  const token = await getServerFirebaseToken();
  if (!token) return localState;

  try {
    if (patch?.portalConfig) {
      await fetch(`${FIRESTORE_REST_BASE}/leads/system_portal_sync_config`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            isSystemConfig: { booleanValue: true },
            configType: { stringValue: 'portal_config' },
            configJson: { stringValue: JSON.stringify(patch.portalConfig) },
            updatedAt: { stringValue: new Date().toISOString() },
          },
        }),
      });
    }
    if (patch?.offerConfig) {
      await fetch(`${FIRESTORE_REST_BASE}/leads/system_offer_sync_config`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            isSystemConfig: { booleanValue: true },
            configType: { stringValue: 'offer_config' },
            configJson: { stringValue: JSON.stringify(patch.offerConfig) },
            updatedAt: { stringValue: new Date().toISOString() },
          },
        }),
      });
    }
    if (patch?.versionConfig) {
      await fetch(`${FIRESTORE_REST_BASE}/leads/system_version_sync_config`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            isSystemConfig: { booleanValue: true },
            configType: { stringValue: 'version_config' },
            configJson: { stringValue: JSON.stringify(patch.versionConfig) },
            updatedAt: { stringValue: new Date().toISOString() },
          },
        }),
      });
    }

    if (!patch) {
      // Pull latest from Firestore cloud if available
      const [portalRes, offerRes, versionRes] = await Promise.all([
        fetch(`${FIRESTORE_REST_BASE}/leads/system_portal_sync_config`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${FIRESTORE_REST_BASE}/leads/system_offer_sync_config`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${FIRESTORE_REST_BASE}/leads/system_version_sync_config`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const mergedPatch: Partial<PortalSyncState> = {};
      if (portalRes.ok) {
        const docData: any = await portalRes.json();
        const jsonStr = docData?.fields?.configJson?.stringValue;
        if (jsonStr) {
          try {
            mergedPatch.portalConfig = JSON.parse(jsonStr);
          } catch (_) {}
        }
      }
      if (offerRes.ok) {
        const docData: any = await offerRes.json();
        const jsonStr = docData?.fields?.configJson?.stringValue;
        if (jsonStr) {
          try {
            mergedPatch.offerConfig = JSON.parse(jsonStr);
          } catch (_) {}
        }
      }
      if (versionRes.ok) {
        const docData: any = await versionRes.json();
        const jsonStr = docData?.fields?.configJson?.stringValue;
        if (jsonStr) {
          try {
            mergedPatch.versionConfig = JSON.parse(jsonStr);
          } catch (_) {}
        }
      }
      if (Object.keys(mergedPatch).length > 0) {
        return saveLocalSyncState(mergedPatch);
      }
    }
  } catch (err) {
    console.warn('Firestore cloud sync notice:', err);
  }

  return localState;
}

export const DEFAULT_SERVER_TERRITORIES: Record<string, Record<string, Record<string, string[]>>> = {
  'Maharashtra': {
    'Buldhana': {
      'Mehkar': [
        'Mehkar City', 'Dongaon', 'Janephal', 'Sultanpur', 'Hiwarkhed', 'Anjani', 'Deulgaon Mali',
        'Shelgaon Deshmukh', 'Sonati', 'Brahmangaon', 'Gomewadi', 'Hekadwadi', 'Kalyana',
        'Loni Gawali', 'Mousam', 'Pangri', 'Titwi', 'Ukali', 'Varwand', 'Wadgaon'
      ],
      'Chikhli': [
        'Chikhli City', 'Amrapur', 'Andhera', 'Eklara', 'Kawhala', 'Malkapur Pangra', 'Undri', 'Khamgaon Road'
      ],
      'Lonar': [
        'Lonar City', 'Bibi', 'Sulala', 'Titawi', 'Wadhaw', 'Chunhala'
      ],
      'Sindkhed Raja': [
        'Sindkhed Raja City', 'Duski', 'Kingaon Raja', 'Malkapur Pangra', 'Sakhar Kherda', 'Shirasgaon'
      ],
      'Khamgaon': [
        'Khamgaon City', 'Ganeshpur', 'Ghatpuri', 'Hingana', 'Kundalgaon', 'Pahurjira', 'Rohinkhed'
      ],
      'Shegaon': [
        'Shegaon City', 'Alasna', 'Jalamb', 'Manasgaon', 'Nagzari', 'Takali'
      ],
      'Malkapur': [
        'Malkapur City', 'Datala', 'Dharangaon', 'Wadoda', 'Zirphi'
      ],
      'Deulgaon Raja': [
        'Deulgaon Raja City', 'Deulgaon Mahi', 'Singaon Jahangir', 'Umarad'
      ],
      'Nandura': [
        'Nandura City', 'Alampur', 'Khadak Purna', 'Nimgaon'
      ],
      'Sangrampur': [
        'Sangrampur City', 'Banoda', 'Kakanwada', 'Warwat Khanderao'
      ],
      'Motala': [
        'Motala City', 'Dhamangaon', 'Kothali', 'Pimpri Gawali'
      ],
      'Jalgaon Jamod': [
        'Jalgaon Jamod City', 'Asalgaon', 'Khandvi', 'Madakhed'
      ]
    },
    'Akola': {
      'Akola': ['Akola City', 'Kaulkhed', 'Malkapur', 'Umari'],
      'Balapur': ['Balapur City', 'Paras', 'Ural'],
      'Patur': ['Patur City', 'Alegaon', 'Babhulgaon'],
      'Murtizapur': ['Murtizapur City', 'Mana', 'Sirso'],
      'Barshitakli': ['Barshitakli City', 'Pinjar', 'Mahan']
    },
    'Washim': {
      'Washim': ['Washim City', 'Ansing', 'Keli'],
      'Risod': ['Risod City', 'Karakha', 'Shirpur'],
      'Malegaon': ['Malegaon City', 'Medshi', 'Shirna'],
      'Mangrulpir': ['Mangrulpir City', 'Aundha', 'Manora']
    },
    'Amravati': {
      'Amravati': ['Amravati City', 'Badnera', 'Walgaon'],
      'Achalpur': ['Achalpur City', 'Paratwada', 'Chandur Bazar'],
      'Daryapur': ['Daryapur City', 'Yeoda', 'Nalwada']
    },
    'Pune': {
      'Pune City': ['Shivajinagar', 'Kothrud', 'Hadapsar', 'Viman Nagar'],
      'Haveli': ['Wagholi', 'Hadapsar Rural', 'Uruli Kanchan', 'Loni Kalbhor'],
      'Baramati': ['Baramati City', 'Malegaon', 'Songaon'],
      'Shirur': ['Shirur City', 'Sanaswadi', 'Ranjangaon']
    },
    'Mumbai': {
      'Mumbai City': ['Colaba', 'Dadar', 'Nariman Point', 'Byculla'],
      'Mumbai Suburban': ['Andheri', 'Bandra', 'Borivali', 'Goregaon', 'Kurla']
    },
    'Nagpur': {
      'Nagpur Urban': ['Sitabuldi', 'Dharampeth', 'Manish Nagar', 'Wardha Road'],
      'Nagpur Rural': ['Hingna', 'Kamptee', 'Kalmeshwar']
    },
    'Chhatrapati Sambhaji Nagar': {
      'Aurangabad': ['CIDCO', 'Waluj', 'Chikalthana', 'Railway Station Area'],
      'Paithan': ['Paithan City', 'Bidkin', 'Shevgaon Road']
    },
    'Jalna': {
      'Jalna': ['Jalna City', 'Old Jalna', 'MIDC Area', 'Partur Road'],
      'Ambad': ['Ambad City', 'Wadigodri', 'Shahgad']
    }
  },
  'Delhi NCR': {
    'Central Delhi': {
      'Connaught Place': ['CP Inner Circle', 'Barakhamba', 'Janpath'],
      'Karol Bagh': ['Karol Bagh Market', 'Rajendra Nagar', 'Dev Nagar']
    },
    'South Delhi': {
      'Saket': ['Saket City', 'Malviya Nagar', 'Hauz Khas'],
      'Hauz Khas': ['Green Park', 'Safdarjung Enclave', 'IIT Area']
    }
  },
  'Gujarat': {
    'Ahmedabad': {
      'Ahmedabad City': ['Navrangpura', 'Maninagar', 'Satellite', 'Vastrapur', 'Bopal']
    },
    'Surat': {
      'Surat City': ['Varachha', 'Athwa', 'Adajan', 'Rander']
    }
  },
  'Madhya Pradesh': {
    'Indore': {
      'Indore City': ['Vijay Nagar', 'Palasia', 'Rajwada', 'Bhawarkua']
    },
    'Bhopal': {
      'Bhopal City': ['MP Nagar', 'Arera Colony', 'New Market', 'Kolar Road']
    }
  }
};

function normalizeTerritoryKey(val?: string): string {
  if (!val) return '';
  return val.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function createOtpApiMiddleware() {
  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = req.url || '';
    if (!url.startsWith('/api/otp') && !url.startsWith('/api/portal-sync') && !url.startsWith('/api/territory')) {
      return next();
    }

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.end();
      return;
    }

    try {
      // REAL-TIME PORTAL SYNC ENDPOINTS (/api/portal-sync & /api/portal-sync/stream)
      if (url.startsWith('/api/portal-sync/stream') && req.method === 'GET') {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'Access-Control-Allow-Origin': '*',
        });
        const current = loadLocalSyncState();
        res.write(`data: ${JSON.stringify(current)}\n\n`);
        sseClients.add(res);
        req.on('close', () => {
          sseClients.delete(res);
        });
        return;
      }

      if (url.startsWith('/api/portal-sync') && req.method === 'GET') {
        const syncedState = await syncWithFirestoreCloud();
        return sendJson(res, 200, {
          success: true,
          ...syncedState,
        });
      }

      if (url.startsWith('/api/portal-sync') && req.method === 'POST') {
        const body = await readJsonBody(req);
        const patch: Partial<PortalSyncState> = {};
        if (body.portalConfig && typeof body.portalConfig === 'object') {
          patch.portalConfig = body.portalConfig;
        }
        if (body.offerConfig && typeof body.offerConfig === 'object') {
          patch.offerConfig = body.offerConfig;
        }
        if (body.versionConfig && typeof body.versionConfig === 'object') {
          patch.versionConfig = body.versionConfig;
        }
        const updatedState = await syncWithFirestoreCloud(patch);
        broadcastPortalSync(updatedState);
        return sendJson(res, 200, {
          success: true,
          ...updatedState,
        });
      }

      // =========================================================================
      // VILLAGE-WISE & CITY-WISE TERRITORY BACKEND API SECURITY & ACCESS CONTROL
      // =========================================================================

      // GET /api/territory/hierarchy
      if (url.startsWith('/api/territory/hierarchy') && req.method === 'GET') {
        return sendJson(res, 200, {
          success: true,
          hierarchy: DEFAULT_SERVER_TERRITORIES,
        });
      }

      // POST /api/territory/validate-access
      // Validates whether an admin has permission to view or update a booking in a specific territory
      if (url.startsWith('/api/territory/validate-access') && req.method === 'POST') {
        const body = await readJsonBody(req);
        const user = body.user || {};
        const lead = body.lead || {};

        const isSuper = Boolean(
          user.isOwnerAdmin ||
          user.isPrimaryOwner ||
          user.isOwner ||
          user.role === 'owner' ||
          (user.email && user.email.toLowerCase() === 'raheema62038@gmail.com') ||
          (user.phone && user.phone.replace(/\D/g, '').endsWith('9175601497'))
        );

        if (isSuper) {
          return sendJson(res, 200, {
            success: true,
            allowed: true,
            role: 'owner',
            message: 'Super Admin: Unrestricted nationwide access granted.',
          });
        }

        if (user.role !== 'admin' && !user.isAdmin) {
          return sendJson(res, 403, {
            success: false,
            allowed: false,
            errorCode: 'FORBIDDEN_ROLE',
            message: 'केवल अधिकृत एडमिन ही क्षेत्रीय बुकिंग का विवरण देख या अपडेट कर सकते हैं।',
          });
        }

        // Direct UID assignment check
        if (Array.isArray(lead.assignedAdminUids) && lead.assignedAdminUids.includes(user.uid)) {
          return sendJson(res, 200, {
            success: true,
            allowed: true,
            message: 'Direct admin assignment match.',
          });
        }
        if (lead.assignedTo && lead.assignedTo === user.uid) {
          return sendJson(res, 200, {
            success: true,
            allowed: true,
            message: 'Direct assignee match.',
          });
        }

        const normLeadVillage = normalizeTerritoryKey(lead.village || lead.address || lead.customerAddress);
        const normLeadTaluka = normalizeTerritoryKey(lead.taluka);

        let allowed = false;

        // Check structured assignedTerritories array
        if (Array.isArray(user.assignedTerritories) && user.assignedTerritories.length > 0) {
          allowed = user.assignedTerritories.some((t: any) => {
            const tVillage = normalizeTerritoryKey(t.village);
            const tTaluka = normalizeTerritoryKey(t.taluka);
            if (tVillage && normLeadVillage && (tVillage === normLeadVillage || normLeadVillage.includes(tVillage) || tVillage.includes(normLeadVillage))) {
              return true;
            }
            if (!tVillage && tTaluka && tTaluka === normLeadTaluka) {
              return true;
            }
            return false;
          });
        }

        // Check assignedVillages array
        if (!allowed && Array.isArray(user.assignedVillages) && user.assignedVillages.length > 0) {
          allowed = user.assignedVillages.some((v: string) => {
            const nv = normalizeTerritoryKey(v);
            return nv === normLeadVillage || normLeadVillage.includes(nv) || nv.includes(normLeadVillage);
          });
        }

        // Check single assignedVillage / assignedTaluka
        if (!allowed) {
          const userVillage = normalizeTerritoryKey(user.assignedVillage);
          const userTaluka = normalizeTerritoryKey(user.assignedTaluka);

          if (userVillage && normLeadVillage && (userVillage === normLeadVillage || normLeadVillage.includes(userVillage) || userVillage.includes(normLeadVillage))) {
            allowed = true;
          } else if (!userVillage && userTaluka && userTaluka === normLeadTaluka) {
            allowed = true;
          }
        }

        if (allowed) {
          return sendJson(res, 200, {
            success: true,
            allowed: true,
            message: 'Territory match confirmed: access permitted.',
          });
        }

        return sendJson(res, 403, {
          success: false,
          allowed: false,
          errorCode: 'TERRITORY_ACCESS_DENIED',
          message: 'यह बुकिंग आपके अधिकृत गाँव/शहर क्षेत्र की नहीं है। दूसरे क्षेत्रों का डेटा सुरक्षित है।',
          messageEn: 'This booking belongs to another village/city territory and is restricted by Backend Security Rules.',
        });
      }

      // POST /api/territory/filter-leads
      // Backend API to strictly filter a list of leads based on user's authorized territory
      if (url.startsWith('/api/territory/filter-leads') && req.method === 'POST') {
        const body = await readJsonBody(req);
        const user = body.user || {};
        const rawLeads: any[] = Array.isArray(body.leads) ? body.leads : [];

        const isSuper = Boolean(
          user.isOwnerAdmin ||
          user.isPrimaryOwner ||
          user.isOwner ||
          user.role === 'owner' ||
          (user.email && user.email.toLowerCase() === 'raheema62038@gmail.com') ||
          (user.phone && user.phone.replace(/\D/g, '').endsWith('9175601497'))
        );

        if (isSuper) {
          return sendJson(res, 200, {
            success: true,
            isSuperAdmin: true,
            count: rawLeads.length,
            leads: rawLeads,
          });
        }

        const filtered = rawLeads.filter((lead: any) => {
          if (Array.isArray(lead.assignedAdminUids) && lead.assignedAdminUids.includes(user.uid)) {
            return true;
          }
          if (lead.assignedTo && lead.assignedTo === user.uid) {
            return true;
          }

          const normLeadVillage = normalizeTerritoryKey(lead.village || lead.address || lead.customerAddress);
          const normLeadTaluka = normalizeTerritoryKey(lead.taluka);

          if (Array.isArray(user.assignedTerritories) && user.assignedTerritories.length > 0) {
            const matches = user.assignedTerritories.some((t: any) => {
              const tVillage = normalizeTerritoryKey(t.village);
              const tTaluka = normalizeTerritoryKey(t.taluka);
              if (tVillage && normLeadVillage && (tVillage === normLeadVillage || normLeadVillage.includes(tVillage) || tVillage.includes(normLeadVillage))) {
                return true;
              }
              if (!tVillage && tTaluka && tTaluka === normLeadTaluka) {
                return true;
              }
              return false;
            });
            if (matches) return true;
          }

          if (Array.isArray(user.assignedVillages) && user.assignedVillages.length > 0) {
            const matches = user.assignedVillages.some((v: string) => {
              const nv = normalizeTerritoryKey(v);
              return nv === normLeadVillage || normLeadVillage.includes(nv) || nv.includes(normLeadVillage);
            });
            if (matches) return true;
          }

          const userVillage = normalizeTerritoryKey(user.assignedVillage);
          const userTaluka = normalizeTerritoryKey(user.assignedTaluka);

          if (userVillage && normLeadVillage && (userVillage === normLeadVillage || normLeadVillage.includes(userVillage) || userVillage.includes(normLeadVillage))) {
            return true;
          }
          if (!userVillage && userTaluka && userTaluka === normLeadTaluka) {
            return true;
          }

          return false;
        });

        return sendJson(res, 200, {
          success: true,
          isSuperAdmin: false,
          count: filtered.length,
          leads: filtered,
        });
      }

      // 1. POST /api/otp/send
      if (url.startsWith('/api/otp/send') && req.method === 'POST') {
        const body = await readJsonBody(req);
        const rawPhone = String(body.phoneNumber || body.phone || '');
        const portal: 'customer' | 'admin' = body.portal === 'admin' ? 'admin' : 'customer';
        const recaptchaToken: string | undefined = body.recaptchaToken;

        // Validate 10-digit Indian mobile number
        const validation = validateIndianMobile(rawPhone);
        if (!validation.isValid) {
          return sendJson(res, 400, {
            success: false,
            errorCode: 'INVALID_MOBILE_NUMBER',
            message: validation.errorHi,
            messageHi: validation.errorHi,
            messageEn: validation.errorEn,
          });
        }

        const { cleanPhone, formattedPhone } = validation;

        // Check registration and ensure Firebase Auth record exists
        const regInfo = await checkAndEnsurePhoneRegistration(cleanPhone);

        if (portal === 'admin' && cleanPhone !== PRIMARY_OWNER_PHONE && regInfo.role !== 'admin' && regInfo.role !== 'owner') {
          return sendJson(res, 403, {
            success: false,
            errorCode: 'UNREGISTERED_ADMIN_MOBILE',
            message: `मोबाइल नंबर +91 ${cleanPhone} एडमिन पोर्टल के लिए पंजीकृत नहीं है। कृपया पंजीकृत एडमिन नंबर या ग्राहक पोर्टल का उपयोग करें।`,
            messageHi: `मोबाइल नंबर +91 ${cleanPhone} एडमिन पोर्टल के लिए पंजीकृत नहीं है। कृपया पंजीकृत एडमिन नंबर या ग्राहक पोर्टल का उपयोग करें।`,
            messageEn: `Mobile number +91 ${cleanPhone} is not registered as an Admin. Please use a registered Admin number or switch to Customer Portal.`,
          });
        }

        // Generate a fresh 6-digit OTP (or reuse active one if requested within 15 seconds to prevent SMS race conditions)
        const now = Date.now();
        const existingSession = otpSessions.get(cleanPhone);
        let otpCode: string;
        if (existingSession && !existingSession.verified && now - existingSession.createdAt < 15000) {
          otpCode = existingSession.otpCode;
        } else {
          otpCode = String(crypto.randomInt(100000, 999999));
        }

        const sessionId = `vi_otp_${now}_${crypto.randomBytes(6).toString('hex')}`;

        // Attempt real SMS delivery
        const smsResult = await dispatchRealSmsOtp(cleanPhone, otpCode, recaptchaToken);

        const session: OtpSession = {
          sessionId,
          phone: cleanPhone,
          formattedPhone,
          otpCode,
          createdAt: now,
          expiresAt: now + 5 * 60 * 1000, // 5 minutes validity
          attempts: 0,
          verified: false,
          portal,
          customerName: regInfo.customerName,
          customerEmail: regInfo.customerEmail,
          smsDelivered: smsResult.delivered,
          providerStatus: smsResult.detail || smsResult.provider,
        };

        otpSessions.set(cleanPhone, session);

        return sendJson(res, 200, {
          success: true,
          status: 'OTP_SENT',
          sessionId,
          phoneNumber: formattedPhone,
          cleanPhone,
          isRegistered: regInfo.isRegistered,
          customerName: regInfo.customerName,
          smsDelivered: smsResult.delivered,
          provider: smsResult.provider,
          providerStatus: session.providerStatus,
          otpCode,
          expiresInSeconds: 300,
          message: smsResult.delivered
            ? `+91 ${cleanPhone} पर 6-अंकों का OTP SMS सफलतापूर्वक भेजा गया है।`
            : `+91 ${cleanPhone} के लिए 6-अंकों का OTP (${otpCode}) सफलतापूर्वक जनरेट किया गया है। कृपया नीचे दर्ज करें।`,
          messageHi: smsResult.delivered
            ? `+91 ${cleanPhone} पर 6-अंकों का OTP SMS सफलतापूर्वक भेजा गया है।`
            : `+91 ${cleanPhone} के लिए 6-अंकों का OTP (${otpCode}) सफलतापूर्वक जनरेट किया गया है। कृपया नीचे दर्ज करें।`,
          messageEn: smsResult.delivered
            ? `6-digit OTP SMS has been sent successfully to +91 ${cleanPhone}.`
            : `6-digit OTP (${otpCode}) generated for +91 ${cleanPhone}. Please enter below to sign in.`,
        });
      }

      // 2. POST /api/otp/verify
      if (url.startsWith('/api/otp/verify') && req.method === 'POST') {
        const body = await readJsonBody(req);
        const rawPhone = String(body.phoneNumber || body.phone || '');
        const rawOtp = String(body.otp || body.code || '').replace(/\D/g, '').trim();

        const validation = validateIndianMobile(rawPhone);
        if (!validation.isValid) {
          return sendJson(res, 400, {
            success: false,
            errorCode: 'INVALID_MOBILE_NUMBER',
            message: validation.errorHi,
            messageHi: validation.errorHi,
            messageEn: validation.errorEn,
          });
        }

        if (rawOtp.length !== 6) {
          return sendJson(res, 400, {
            success: false,
            errorCode: 'INVALID_OTP_FORMAT',
            message: 'कृपया 6 अंकों का सही ओटीपी कोड दर्ज करें।',
            messageHi: 'कृपया 6 अंकों का सही ओटीपी कोड दर्ज करें।',
            messageEn: 'Please enter a valid 6-digit OTP code.',
          });
        }

        const { cleanPhone, formattedPhone } = validation;
        const session = otpSessions.get(cleanPhone);

        if (!session) {
          return sendJson(res, 400, {
            success: false,
            errorCode: 'SESSION_NOT_FOUND',
            message: 'सक्रिय ओटीपी सत्र नहीं मिला। कृपया "Send OTP" दबाकर नया ओटीपी प्राप्त करें।',
            messageHi: 'सक्रिय ओटीपी सत्र नहीं मिला। कृपया "Send OTP" दबाकर नया ओटीपी प्राप्त करें।',
            messageEn: 'No active OTP session found. Please click "Send OTP" to request a new code.',
          });
        }

        if (Date.now() > session.expiresAt) {
          otpSessions.delete(cleanPhone);
          return sendJson(res, 400, {
            success: false,
            errorCode: 'OTP_EXPIRED',
            message: 'ओटीपी की समय-सीमा (5 मिनट) समाप्त हो गई है। कृपया दोबारा ओटीपी भेजें।',
            messageHi: 'ओटीपी की समय-सीमा (5 मिनट) समाप्त हो गई है। कृपया दोबारा ओटीपी भेजें।',
            messageEn: 'OTP has expired (5 minutes limit). Please resend OTP.',
          });
        }

        session.attempts += 1;
        if (session.attempts > 5) {
          otpSessions.delete(cleanPhone);
          return sendJson(res, 429, {
            success: false,
            errorCode: 'TOO_MANY_ATTEMPTS',
            message: 'अत्यधिक गलत प्रयास। सुरक्षा के लिए कृपया नया ओटीपी मंगाएँ।',
            messageHi: 'अत्यधिक गलत प्रयास। सुरक्षा के लिए कृपया नया ओटीपी मंगाएँ।',
            messageEn: 'Too many incorrect attempts. Please request a new OTP.',
          });
        }

        if (rawOtp !== session.otpCode) {
          return sendJson(res, 400, {
            success: false,
            errorCode: 'INVALID_OTP_CODE',
            message: 'गलत ओटीपी कोड (Invalid OTP)। कृपया सही 6-अंकों का ओटीपी दर्ज करें।',
            messageHi: 'गलत ओटीपी कोड (Invalid OTP)। कृपया सही 6-अंकों का ओटीपी दर्ज करें।',
            messageEn: 'Incorrect 6-digit OTP code. Please check and try again.',
          });
        }

        session.verified = true;
        otpSessions.delete(cleanPhone);

        return sendJson(res, 200, {
          success: true,
          status: 'OTP_VERIFIED',
          phoneNumber: formattedPhone,
          cleanPhone,
          customerName: session.customerName || `Customer (+91 ${cleanPhone})`,
          customerEmail: session.customerEmail || `cust_${cleanPhone}@vi-telecom-auth.internal`,
          message: 'ओटीपी सत्यापन सफल! पोर्टल में लॉगिन हो रहा है...',
          messageHi: 'ओटीपी सत्यापन सफल! पोर्टल में लॉगिन हो रहा है...',
          messageEn: 'OTP verified successfully! Signing in to portal...',
        });
      }

      // 3. POST /api/otp/register-phone
      if (url.startsWith('/api/otp/register-phone') && req.method === 'POST') {
        const body = await readJsonBody(req);
        const validation = validateIndianMobile(String(body.phoneNumber || body.phone || ''));
        if (!validation.isValid) {
          return sendJson(res, 400, {
            success: false,
            errorCode: 'INVALID_MOBILE_NUMBER',
            message: validation.errorHi,
          });
        }

        const { cleanPhone, formattedPhone } = validation;
        saveRegisteredPhone({
          phone: cleanPhone,
          name: body.name || body.displayName || `Customer (+91 ${cleanPhone})`,
          email: body.email || `cust_${cleanPhone}@vi-telecom-auth.internal`,
          circle: body.circle || 'Maharashtra & Goa',
          role: body.role || 'customer',
          registeredAt: new Date().toISOString(),
        });

        await checkAndEnsurePhoneRegistration(cleanPhone);

        return sendJson(res, 200, {
          success: true,
          phoneNumber: formattedPhone,
          cleanPhone,
          message: 'मोबाइल नंबर सफलतापूर्वक पंजीकृत हो गया है।',
        });
      }

      // 4. GET /api/otp/status
      if (url.startsWith('/api/otp/status') && req.method === 'GET') {
        return sendJson(res, 200, {
          success: true,
          service: 'Vi Sales MNP OTP Backend Service',
          activeSessions: otpSessions.size,
        });
      }

      return sendJson(res, 404, {
        success: false,
        message: 'OTP endpoint not found',
      });
    } catch (err: any) {
      console.error('OTP API Middleware error:', err);
      return sendJson(res, 500, {
        success: false,
        errorCode: 'INTERNAL_SERVER_ERROR',
        message: err?.message || 'सर्वर में आंतरिक त्रुटि हुई। कृपया पुनः प्रयास करें।',
      });
    }
  };
}
