import { doc, getDoc, updateDoc, collection, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Lead, AdminTerritoryAssignment } from '../types';

// =========================================================================
// STANDARD PRE-LOADED TERRITORY DIRECTORY
// Focused on Maharashtra & Buldhana / Mehkar region with full expansion capability
// =========================================================================

export interface TerritoryHierarchy {
  [state: string]: {
    [district: string]: {
      [taluka: string]: string[]; // list of villages/areas
    };
  };
}

export const DEFAULT_TERRITORIES: TerritoryHierarchy = {
  'Maharashtra': {
    'Buldhana': {
      'Mehkar': [
        'Mehkar City',
        'Dongaon',
        'Janephal',
        'Sultanpur',
        'Hiwarkhed',
        'Anjani',
        'Deulgaon Mali',
        'Shelgaon Deshmukh',
        'Sonati',
        'Brahmangaon',
        'Gomewadi',
        'Hekadwadi',
        'Kalyana',
        'Loni Gawali',
        'Mousam',
        'Pangri',
        'Titwi',
        'Ukali',
        'Varwand',
        'Wadgaon'
      ],
      'Chikhli': [
        'Chikhli City',
        'Amrapur',
        'Andhera',
        'Eklara',
        'Kawhala',
        'Malkapur Pangra',
        'Undri',
        'Khamgaon Road'
      ],
      'Lonar': [
        'Lonar City',
        'Bibi',
        'Sulala',
        'Titawi',
        'Wadhaw',
        'Chunhala'
      ],
      'Sindkhed Raja': [
        'Sindkhed Raja City',
        'Duski',
        'Kingaon Raja',
        'Malkapur Pangra',
        'Sakhar Kherda',
        'Shirasgaon'
      ],
      'Khamgaon': [
        'Khamgaon City',
        'Ganeshpur',
        'Ghatpuri',
        'Hingana',
        'Kundalgaon',
        'Pahurjira',
        'Rohinkhed'
      ],
      'Shegaon': [
        'Shegaon City',
        'Alasna',
        'Jalamb',
        'Manasgaon',
        'Nagzari',
        'Takali'
      ],
      'Malkapur': [
        'Malkapur City',
        'Datala',
        'Dharangaon',
        'Wadoda',
        'Zirphi'
      ],
      'Deulgaon Raja': [
        'Deulgaon Raja City',
        'Deulgaon Mahi',
        'Singaon Jahangir',
        'Umarad'
      ],
      'Nandura': [
        'Nandura City',
        'Alampur',
        'Khadak Purna',
        'Nimgaon'
      ],
      'Sangrampur': [
        'Sangrampur City',
        'Banoda',
        'Kakanwada',
        'Warwat Khanderao'
      ],
      'Motala': [
        'Motala City',
        'Dhamangaon',
        'Kothali',
        'Pimpri Gawali'
      ],
      'Jalgaon Jamod': [
        'Jalgaon Jamod City',
        'Asalgaon',
        'Khandvi',
        'Madakhed'
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

/**
 * Returns available states
 */
export function getAvailableStates(): string[] {
  return Object.keys(DEFAULT_TERRITORIES);
}

/**
 * Returns available districts for a state
 */
export function getAvailableDistricts(state: string): string[] {
  if (!state || !DEFAULT_TERRITORIES[state]) {
    return DEFAULT_TERRITORIES['Maharashtra'] ? Object.keys(DEFAULT_TERRITORIES['Maharashtra']) : [];
  }
  return Object.keys(DEFAULT_TERRITORIES[state]);
}

/**
 * Returns available talukas/cities for a district
 */
export function getAvailableTalukas(state: string, district: string): string[] {
  if (!state || !district || !DEFAULT_TERRITORIES[state]?.[district]) {
    if (district === 'Buldhana') {
      return Object.keys(DEFAULT_TERRITORIES['Maharashtra']['Buldhana']);
    }
    return ['City Center / Taluka HQ'];
  }
  return Object.keys(DEFAULT_TERRITORIES[state][district]);
}

/**
 * Returns available villages/areas for a taluka
 */
export function getAvailableVillages(state: string, district: string, taluka: string): string[] {
  if (!state || !district || !taluka || !DEFAULT_TERRITORIES[state]?.[district]?.[taluka]) {
    return ['Main Town / Village HQ'];
  }
  return DEFAULT_TERRITORIES[state][district][taluka];
}

/**
 * Strips formatting, whitespace, and special characters for matching
 */
export function normalizeTerritoryString(val?: string): string {
  if (!val) return '';
  return val.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Finds all active admins assigned to a given village / territory.
 * Allows multiple admins to be assigned to the same village!
 */
export function matchAdminsForTerritory(
  state: string,
  district: string,
  taluka: string,
  village: string,
  allUsers: UserProfile[]
): UserProfile[] {
  const normState = normalizeTerritoryString(state);
  const normDistrict = normalizeTerritoryString(district);
  const normTaluka = normalizeTerritoryString(taluka);
  const normVillage = normalizeTerritoryString(village);

  // Filter only active, approved admins (excluding deactivated)
  const activeAdmins = allUsers.filter(
    (u) =>
      u.role === 'admin' &&
      !u.isDeactivated &&
      u.status !== 'deactivated' &&
      u.status !== 'deleted'
  );

  return activeAdmins.filter((admin) => {
    // 1. Check array of structured assignments
    if (Array.isArray(admin.assignedTerritories) && admin.assignedTerritories.length > 0) {
      const matchInArray = admin.assignedTerritories.some((t) => {
        const tVillage = normalizeTerritoryString(t.village);
        const tTaluka = normalizeTerritoryString(t.taluka);
        const tDistrict = normalizeTerritoryString(t.district);
        const tState = normalizeTerritoryString(t.state);

        // Exact village match if territory specifies village
        if (tVillage && normVillage && (tVillage === normVillage || normVillage.includes(tVillage) || tVillage.includes(normVillage))) {
          return true;
        }
        // Taluka level match if village is generic or not set
        if (!tVillage && tTaluka && tTaluka === normTaluka) {
          return true;
        }
        return false;
      });
      if (matchInArray) return true;
    }

    // 2. Check assignedVillages array
    if (Array.isArray(admin.assignedVillages) && admin.assignedVillages.length > 0) {
      const matchesVillageArray = admin.assignedVillages.some((v) => {
        const nv = normalizeTerritoryString(v);
        return nv === normVillage || normVillage.includes(nv) || nv.includes(normVillage);
      });
      if (matchesVillageArray) return true;
    }

    // 3. Check individual fields
    const adminVillage = normalizeTerritoryString(admin.assignedVillage);
    const adminTaluka = normalizeTerritoryString(admin.assignedTaluka);
    const adminDistrict = normalizeTerritoryString(admin.assignedDistrict);

    if (adminVillage && normVillage && (adminVillage === normVillage || normVillage.includes(adminVillage) || adminVillage.includes(normVillage))) {
      return true;
    }

    // If admin is assigned to entire taluka / city and no village is restricted
    if (!adminVillage && adminTaluka && adminTaluka === normTaluka) {
      return true;
    }

    return false;
  });
}

/**
 * Checks whether a given lead is accessible by the specified user.
 * - Primary Owner / Super Admin: Full access to all territories.
 * - Customer: Only their own requests.
 * - Territory Admin: Only leads matching their assigned territories or explicitly assigned to them.
 */
export function isLeadAccessibleByAdmin(
  lead: Lead,
  adminUser: {
    uid?: string;
    role?: string;
    isPrimaryOwner?: boolean;
    isOwner?: boolean;
    isOwnerAdmin?: boolean;
    email?: string | null;
    assignedState?: string;
    assignedDistrict?: string;
    assignedTaluka?: string;
    assignedVillage?: string;
    assignedVillages?: string[];
    assignedTerritories?: AdminTerritoryAssignment[];
  } | null
): boolean {
  if (!adminUser || !adminUser.uid) return false;

  // 1. Super Admin / Primary Owner check: Full access across India
  if (
    adminUser.isPrimaryOwner ||
    adminUser.isOwner ||
    adminUser.isOwnerAdmin ||
    adminUser.role === 'owner' ||
    (adminUser.email && adminUser.email.toLowerCase() === 'raheema62038@gmail.com')
  ) {
    return true;
  }

  // If user is not an admin, deny admin-level access
  if (adminUser.role !== 'admin') {
    return false;
  }

  // 2. Direct assignment check (by UID)
  if (Array.isArray(lead.assignedAdminUids) && lead.assignedAdminUids.length > 0) {
    if (lead.assignedAdminUids.includes(adminUser.uid)) {
      return true;
    }
    // When a booking is explicitly assigned to specific admin(s), other admins cannot access it
    return false;
  }
  if (lead.assignedTo && lead.assignedTo !== 'Unassigned') {
    if (lead.assignedTo === adminUser.uid) {
      return true;
    }
    return false;
  }

  // 3. Lead territory extraction
  const leadState = normalizeTerritoryString(lead.state);
  const leadDistrict = normalizeTerritoryString(lead.district);
  const leadTaluka = normalizeTerritoryString(lead.taluka);
  const leadVillage = normalizeTerritoryString(lead.village || lead.address || lead.customerAddress);

  // 4. Check assigned territories array on admin profile
  if (Array.isArray(adminUser.assignedTerritories) && adminUser.assignedTerritories.length > 0) {
    const matchesTerritory = adminUser.assignedTerritories.some((t) => {
      const tVillage = normalizeTerritoryString(t.village);
      const tTaluka = normalizeTerritoryString(t.taluka);
      const tDistrict = normalizeTerritoryString(t.district);

      // Match village if specified
      if (tVillage && leadVillage && (tVillage === leadVillage || leadVillage.includes(tVillage) || tVillage.includes(leadVillage))) {
        return true;
      }
      // Match taluka/city if village not restricted
      if (!tVillage && tTaluka && tTaluka === leadTaluka) {
        return true;
      }
      return false;
    });
    if (matchesTerritory) return true;
  }

  // 5. Check assignedVillages list
  if (Array.isArray(adminUser.assignedVillages) && adminUser.assignedVillages.length > 0) {
    const matchesVillage = adminUser.assignedVillages.some((v) => {
      const nv = normalizeTerritoryString(v);
      return nv === leadVillage || leadVillage.includes(nv) || nv.includes(leadVillage);
    });
    if (matchesVillage) return true;
  }

  // 6. Check single assignedVillage / assignedTaluka
  const adminVillage = normalizeTerritoryString(adminUser.assignedVillage);
  const adminTaluka = normalizeTerritoryString(adminUser.assignedTaluka);
  const adminDistrict = normalizeTerritoryString(adminUser.assignedDistrict);

  if (adminVillage && leadVillage && (adminVillage === leadVillage || leadVillage.includes(adminVillage) || adminVillage.includes(leadVillage))) {
    return true;
  }

  if (!adminVillage && adminTaluka && adminTaluka === leadTaluka) {
    return true;
  }

  return false;
}

/**
 * Assigns one or more territories (State, District, Taluka/City, Village) to an Admin user in Firestore.
 * Supports multiple admins per village and multiple villages per admin!
 */
export async function assignTerritoryToAdmin(
  adminUid: string,
  newAssignment: {
    state: string;
    district: string;
    taluka: string;
    village: string;
  },
  assignedByUid: string,
  assignedByEmail?: string
): Promise<AdminTerritoryAssignment[]> {
  if (!db) throw new Error('Firestore is not initialized');
  if (!adminUid) throw new Error('Admin UID is required');

  const userRef = doc(db, 'users', adminUid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    throw new Error('Admin profile not found in database');
  }

  const data = snap.data() || {};
  const currentTerritories: AdminTerritoryAssignment[] = Array.isArray(data.assignedTerritories)
    ? [...data.assignedTerritories]
    : [];

  const assignmentId = `terr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const assignmentRecord: AdminTerritoryAssignment = {
    id: assignmentId,
    state: newAssignment.state.trim(),
    district: newAssignment.district.trim(),
    taluka: newAssignment.taluka.trim(),
    village: newAssignment.village.trim(),
    assignedAt: new Date().toISOString(),
    assignedBy: assignedByEmail || assignedByUid,
  };

  // Check if identical territory already exists
  const exists = currentTerritories.some(
    (t) =>
      t.state.toLowerCase() === assignmentRecord.state.toLowerCase() &&
      t.district.toLowerCase() === assignmentRecord.district.toLowerCase() &&
      t.taluka.toLowerCase() === assignmentRecord.taluka.toLowerCase() &&
      t.village.toLowerCase() === assignmentRecord.village.toLowerCase()
  );

  const updatedTerritories = exists ? currentTerritories : [...currentTerritories, assignmentRecord];

  // Also maintain flattened fields for convenient fast queries
  const allVillages = Array.from(new Set(updatedTerritories.map((t) => t.village).filter(Boolean)));

  await updateDoc(userRef, {
    assignedTerritories: updatedTerritories,
    assignedState: assignmentRecord.state,
    assignedDistrict: assignmentRecord.district,
    assignedTaluka: assignmentRecord.taluka,
    assignedVillage: assignmentRecord.village,
    assignedVillages: allVillages,
    assignedCircle: `${assignmentRecord.taluka}, ${assignmentRecord.district}`,
    updatedAt: new Date().toISOString(),
  });

  return updatedTerritories;
}

/**
 * Removes a territory assignment from an Admin user in Firestore.
 */
export async function removeTerritoryFromAdmin(
  adminUid: string,
  territoryId: string
): Promise<AdminTerritoryAssignment[]> {
  if (!db) throw new Error('Firestore is not initialized');
  const userRef = doc(db, 'users', adminUid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) throw new Error('Admin profile not found');

  const data = snap.data() || {};
  const currentTerritories: AdminTerritoryAssignment[] = Array.isArray(data.assignedTerritories)
    ? [...data.assignedTerritories]
    : [];

  const updatedTerritories = currentTerritories.filter((t) => t.id !== territoryId);
  const allVillages = Array.from(new Set(updatedTerritories.map((t) => t.village).filter(Boolean)));
  const latest = updatedTerritories[updatedTerritories.length - 1];

  await updateDoc(userRef, {
    assignedTerritories: updatedTerritories,
    assignedState: latest ? latest.state : '',
    assignedDistrict: latest ? latest.district : '',
    assignedTaluka: latest ? latest.taluka : '',
    assignedVillage: latest ? latest.village : '',
    assignedVillages: allVillages,
    updatedAt: new Date().toISOString(),
  });

  return updatedTerritories;
}
