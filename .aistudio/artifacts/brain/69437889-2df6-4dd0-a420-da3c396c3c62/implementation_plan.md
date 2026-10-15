# Implementation Plan: Owner Admin Management, Village Customer Handling & Credential Oversight

Resolve admin persistence issues in the Vi Sales MNP Portal, implement full Admin edit/delete controls for the Primary Owner, enable instant simulator/direct login for owner-created admins, enforce strict village-scoped customer management for admins, and provide the owner with detailed visibility of email-linked customers and security credentials.

---

## 1. Problem Diagnosis & Root Causes

1. **Admin Data Not Saving for Owner:**
   - When the Primary Owner creates an admin in `AddAdminModal`, secondary Firebase app creation or Google Identity REST calls can fail due to network, quotas, or config mismatch. If secondary user creation fails or Firestore document creation times out, no local fallback cache was persisted. As a result, the owner did not see the new admin in the admin list.
   - Solution: Implement a **multi-layer persistence pipeline**:
     - Firestore `users` collection primary persistence
     - Resilient secondary Firebase Auth creation with REST API & resilient mock fallback
     - Persistent local storage registry (`vi_admin_registry_backup`) that continuously syncs with Firestore, guaranteeing that an admin created by the owner is never lost even if Firestore is slow or during offline testing.

2. **Missing Edit Admin Feature:**
   - `AdminUsersView` allowed deactivating and assigning territories, but lacked a dedicated **Edit Admin Modal** to update the admin's name, email, phone, assigned village/taluka/district, and status, as well as resetting their password.
   - Solution: Create `EditAdminModal.tsx` and integrate it into `AdminUsersView` with full owner controls.

3. **Admin Deletion & Lead Safety:**
   - Owner needs both a **Delete Admin** action (with confirmation dialog) and an explicit guarantee that deleting an admin does NOT delete customer leads previously handled or created by that admin.
   - Solution: Implement safe deletion in `userService.ts` that removes or marks the admin profile as deleted while preserving all linked customer leads and audit history.

4. **Admin Login & Simulator Support:**
   - Admins created by the owner need to log in easily using their assigned email/ID and password, or test via a **1-click Admin Login Simulator** directly on the Admin login tab.
   - Solution: Update `AuthScreen.tsx` so the Admin tab lists owner-created admins with quick 1-click test login / simulator prefill, allowing instant verification without typing complex credentials.

5. **Village-Scoped Customer Handling for Admins:**
   - Each admin must only see customers and leads from their assigned village, taluka, or district.
   - Admins must have full capability to handle those customers (update booking status, add remarks, verify customer, call/message via WhatsApp).
   - Admins must be completely restricted from seeing customers from other villages, other admins' data, or owner controls.

6. **Owner Visibility: Email-Linked Customers & Credentials:**
   - Owner dashboard must show:
     - Total customers who linked their Email ID vs Phone number (`ईमेल से जुड़े ग्राहक`).
     - A transparent, secure credentials overview (registered email, phone, login method, password/passcode hint) visible strictly to the Primary Owner for customer verification, support, and account recovery.
     - Direct controls to search, filter, edit, or delete customer IDs with confirmation.

---

## 2. Proposed Changes

### Layer 1: Core User Service & Persistence (`src/services/userService.ts`)
- **Resilient Admin Creation**:
  - Update `createAdminUserByOwner` to always save the admin profile to Firestore and automatically cache it in `localStorage` under `vi_admin_registry_backup`.
  - Store login credential details (hashed/masked or secure recovery hint) so the owner can view and reset passwords.
- **Update Admin Service (`updateAdminUserByOwner`)**:
  - Update name, email, phone, assigned circle, state, district, taluka, village, and password.
  - Sync updates to both Firestore and local fallback.
- **Delete Admin Service (`deleteAdminUserPermanently`)**:
  - Allow Primary Owner to permanently remove or soft-delete an admin user from the active roster.
  - Reassign or preserve all customer leads to keep lead history 100% intact.
- **Get All Users Merge**:
  - Update `getAllUsers()` to retrieve Firestore users and merge any locally registered admins, ensuring the list is always populated.

### Layer 2: Admin Creation & Editing Components
- **`src/components/admin/EditAdminModal.tsx` (New Component)**:
  - Form allowing Owner to edit:
    - Admin Name & Display Name
    - Admin Email / Login ID
    - Phone Number
    - Assigned State, District, Taluka, Village (with live dynamic dropdowns from `territoryService`)
    - Password update / reset field
    - Account Status (Active / Approved / Suspended)
- **`src/components/AddAdminModal.tsx`**:
  - Ensure immediate feedback upon creation.
  - Automatically persist to Firestore and local registry.
  - Notify `onAdminCreated` and show success alert with login instructions.

### Layer 3: Owner Admin & Customer Management View (`src/components/AdminUsersView.tsx`)
- Add **"एडिट करें" (Edit Admin)** button for each admin row, opening `EditAdminModal`.
- Add **"एडमिन डिलीट करें" (Delete Admin)** button with confirmation modal (strictly Owner-only).
- In Customer Management Section:
  - Add summary badge: **"ईमेल से जुड़े ग्राहक" (Email-Linked Customers)** count and percentage.
  - Add column/card indicator showing whether customer authenticated via Email or Mobile OTP.
  - For Primary Owner: Display login credential / passcode details (with show/hide toggle) for account verification.
  - Retain **"आईडी डिलीट करें" (Delete Customer ID)** with safety modal.

### Layer 4: Admin Customer Handling & Village Isolation
- **`src/components/admin/AdminPanel.tsx`**:
  - Ensure non-owner Admins only receive leads and customers matching their `assignedVillage`, `assignedTaluka`, or `assignedDistrict`.
  - Provide Admins with complete customer handling tools:
    - Status changer (Pending, In Progress, Verified, Sim Delivered, Completed, Cancelled).
    - Call and WhatsApp buttons for direct customer communication.
    - Notes and verification remarks.
  - Hide all owner-only tabs (All Admins, Offer Editor, National Territory Manager, System Audit).

### Layer 5: Authentication & Login Simulator (`src/components/AuthScreen.tsx`)
- In the **Admin Login** tab:
  - Keep email and password input fields.
  - Add **"Quick Test / एडमिन सिम्युलेटर (Simulator Login)"**:
    - Dropdown/chips showing existing owner-created admins (e.g., Mehkar Admin, Buldhana Admin).
    - Selecting an admin automatically populates the form and allows one-click simulated login to test the admin's village view instantly.
- In the **Owner Login** tab:
  - Pre-fill `raheema62038@gmail.com` with secure password authentication.
- In the **Customer Login** tab:
  - Provide both Phone OTP and Email/Password options, tracking linked email IDs.

---

## 3. Verification & Testing Plan

1. **Owner Admin Creation & Persistence Test**:
   - Log in as Owner (`raheema62038@gmail.com`).
   - Open "Admin Management" and click "नया Admin जोड़ें".
   - Fill in details: Name, Email (`admin_mehkar@visales.local`), Password, Village (`Mehkar City`).
   - Click Save. Verify new admin immediately appears in the Admin table and remains visible after page reload.
2. **Admin Edit & Delete Test**:
   - Click "एडिट करें" on the newly created admin. Change village to another village or update phone/name. Verify updates reflect immediately.
   - Test "डिलीट करें" with confirmation. Verify admin is removed without affecting customer leads.
3. **Admin Simulator Login & Village Isolation Test**:
   - Go to Admin Login tab. Select the created admin from the simulator selector and log in.
   - Verify Admin sees ONLY customers belonging to `Mehkar City`.
   - Verify Admin can update lead status and contact customer.
   - Verify Admin cannot see other village customers or Owner controls.
4. **Owner Customer Email & Security Oversight Test**:
   - Log in back as Owner.
   - Check the customer table: verify counter for "ईमेल से जुड़े ग्राहक", linked email tags, and credentials/passcode record.
   - Test customer ID deletion with confirmation.
5. **Compilation & Lint Verification**:
   - Run `compile_applet` and `lint_applet` to ensure zero TypeScript or syntax errors.
