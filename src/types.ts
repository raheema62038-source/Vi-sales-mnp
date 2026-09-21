export type MnpStatus = 
  | 'New'
  | 'UPC Generated'
  | 'SIM Allocated'
  | 'E-KYC Done'
  | 'Ported'
  | 'Cancelled';

export type CurrentOperator = 'Airtel' | 'Jio' | 'BSNL' | 'MTNL' | 'Other';

export type Language = 'hi' | 'en';

export type ConnectionType = 'Prepaid' | 'Postpaid' | 'Corporate';

export type UserRole = 'customer' | 'admin' | 'owner' | 'pending_admin';

export type AdminApprovalStatus = 'none' | 'pending' | 'approved' | 'rejected' | 'deactivated' | 'deleted';

export interface UserProfile {
  uid: string;
  customerUid?: string; // Authenticated Firebase UID for customer profile
  email?: string;
  displayName: string;
  role: UserRole;
  status?: AdminApprovalStatus;
  phone?: string;
  phoneNumber?: string;
  isPrimaryOwner?: boolean;
  isOwner?: boolean;
  isDeactivated?: boolean;
  adminAccessRevoked?: boolean;
  previousRole?: UserRole;
  requestedAt?: string;
  requestNote?: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  deactivatedAt?: string;
  deactivatedBy?: string;
  deletedAt?: string;
  deletedBy?: string;
  deletionReason?: string;
  createdByOwnerUid?: string;
  createdAt: string;
  lastLoginAt?: string;
  assignedCircle?: string;
  hasLoggedIn?: boolean;
  loginCount?: number;
  downloadCount?: number;
  lastDownloadedAt?: string;
  hasDownloaded?: boolean;
  address?: string;
  taluka?: string;
  district?: string;
  state?: string;
  pincode?: string;
}

export type LeadType = 
  | 'Porting (MNP)'
  | 'New SIM Connection'
  | 'Postpaid Upgrade'
  | 'Postpaid Migration'
  | 'Corporate Connection'
  | 'Corporate Port';

export type BookingStatus = 
  | 'Lead Received'
  | 'Pending'
  | 'Verified'
  | 'Booked'
  | 'In Process'
  | 'Pending Confirmation'
  | 'SIM Dispatched'
  | 'Appointment Scheduled'
  | 'Delivered'
  | 'Completed'
  | 'Cancelled';

export interface CustomerLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  sharedAt: string;
  address?: string;
  notes?: string;
}

export interface Lead {
  id: string;
  leadId?: string;
  requestType?: string;
  assignedTo?: string;
  customerUid?: string; // Authenticated customer Firebase Auth UID
  customerEmail?: string;
  customerName: string;
  mobileNumber: string;
  alternateNumber?: string;
  
  // Operator & Plan
  currentOperator: CurrentOperator;
  connectionType: ConnectionType;
  selectedPlan: string;
  
  // SIM / Porting Details
  leadType: LeadType;
  simNumber?: string;
  simType?: 'Physical SIM' | 'eSIM';
  upcCode?: string;
  upcExpiryDate?: string;
  
  // Customer Address & Service Area
  state?: string;
  district?: string;
  taluka?: string;
  address?: string;
  customerAddress?: string;
  cityCircle?: string;
  pincode?: string;

  // Customer Location (Opt-in GPS coordinates shared during booking)
  locationCoordinates?: CustomerLocation;

  // Customer Verification
  isCustomerVerified?: boolean;
  customerVerificationStatus?: 'Pending' | 'Verified' | 'Unverified';
  verifiedAt?: string;
  verifiedBy?: string;
  
  // Status & Bookings
  status: MnpStatus;
  bookingStatus: BookingStatus;
  bookingCount: number;
  
  remarks?: string;
  
  // Attribution & Ownership
  createdByUid: string;   // Creator Firebase Auth UID
  salespersonUid?: string; // Kept as optional for backwards compatibility
  createdBy: string;      // Creator identifier
  createdByEmail: string;
  createdByName?: string;
  
  createdAt: string;
  updatedAt?: string;
}

export type LeadFormData = Omit<
  Lead, 
  'id' | 'createdAt' | 'updatedAt' | 'createdByUid' | 'salespersonUid' | 'createdBy' | 'createdByEmail' | 'createdByName'
>;

export interface FirebaseConfigOptions {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
}

export interface PromotionalOffer {
  id?: string;
  heading: string;
  badge?: string;
  items: string[];
  disclaimer?: string;
  updatedAt?: string;
  updatedBy?: string;
  updatedByEmail?: string;
}

// ==========================================
// Customer Portal Configuration Types (Admin Managed)
// ==========================================

export interface PortalBanner {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  imageUrl?: string;
  bgGradient?: string;
  ctaText?: string;
  ctaAction?: 'book_porting' | 'whatsapp' | 'call' | 'url';
  ctaUrl?: string;
  enabled: boolean;
  order: number;
}

export interface PortalLogoConfig {
  type: 'symbol' | 'image';
  text: string;
  subtext: string;
  symbol: string;
  imageUrl?: string;
}

export interface PortalOfferItem {
  id: string;
  heading: string;
  badge: string;
  price: string;
  validity: string;
  items: string[];
  disclaimer: string;
  enabled: boolean;
  order: number;
}

export interface PortalAdminHelp {
  helpNumber: string;
  callNumber: string;
  whatsappNumber: string;
  supportTitle: string;
  supportHours: string;
  fixedServiceArea: string;
  emergencyNotice?: string;
}

export interface PortalTexts {
  heroHeading: string;
  heroSubheading: string;
  serviceAreaNotice: string;
  announcement?: string;
}

export interface PortalConfig {
  banners: PortalBanner[];
  logo: PortalLogoConfig;
  offers: PortalOfferItem[];
  adminHelp: PortalAdminHelp;
  texts: PortalTexts;
  updatedAt?: string;
  updatedBy?: string;
  updatedByEmail?: string;
}

export type AdminSection = 
  | 'dashboard'
  | 'bookings'
  | 'customers'
  | 'offers'
  | 'banners'
  | 'logo'
  | 'admin-help'
  | 'locations'
  | 'settings';


