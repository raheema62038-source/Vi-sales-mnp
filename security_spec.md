# Vi Sales MNP - Security Specification & Access Control Matrix

## Role-Based Access Control (RBAC) Architecture

### Roles
1. **Admin (`role: 'admin'`)**:
   - Access to all users (`/users/{userId}`) including user lists and role assignment.
   - Complete visibility and editing rights over all customer porting records across the organization.
   - Comprehensive analytical reports, leaderboard, and team-level metrics.
2. **Salesperson (`role: 'salesperson'`)**:
   - Strictly limited to their own profile (`/users/{auth.uid}`).
   - Forbidden from querying or listing the `/users` collection.
   - Can ONLY view, create, edit, and manage leads where `createdByUid == auth.uid`.
   - Never sees other sales executives' leads, numbers, or unassigned customer data.
3. **Customer (`role: 'customer'`)**:
   - Strictly limited to their own profile (`/users/{auth.uid}`).
   - Forbidden from querying or listing the `/users` collection.
   - STRICT CUSTOMER-LEVEL DATA ISOLATION: Can ONLY view, create, and edit their OWN submitted details where `customerUid == auth.uid` (or `createdByUid == auth.uid`).
   - Never query, search, autocomplete, export, display, or expose another customer's personal details.
   - Cannot elevate permissions or tamper with `customerUid`.

---

## Security Invariants

| Action | Collection | Customer | Salesperson | Admin | Security Rule Condition |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Get Profile** | `/users/{userId}` | Own profile only (`userId == auth.uid`) | Own profile only (`userId == auth.uid`) | Any user | `isOwner(userId) \|\| isAdmin()` |
| **List Users** | `/users` | ❌ Denied | ❌ Denied |  Full Access | `isAdmin()` |
| **Update User Role** | `/users/{userId}` | ❌ Denied | ❌ Denied |  Full Access | `isAdmin()` |
| **Get Lead** | `/leads/{leadId}` | Own record only (`customerUid == auth.uid`) | Own lead only (`createdByUid == auth.uid`) | Any lead | `isAdmin() \|\| (resource.data.customerUid == auth.uid) \|\| resource.data.createdByUid == auth.uid` |
| **List Leads** | `/leads` | Filtered: `where("customerUid", "==", auth.uid)` | Filtered: `where("createdByUid", "==", auth.uid)` | All records | `isAdmin() \|\| (resource.data.customerUid == auth.uid) \|\| resource.data.createdByUid == auth.uid` |
| **Create Lead** | `/leads` | Must stamp `customerUid == auth.uid` | Must stamp `createdByUid == auth.uid` |  Allowed | `isAdmin() \|\| (request.resource.data.customerUid == auth.uid) \|\| request.resource.data.createdByUid == auth.uid` |
| **Update Lead** | `/leads/{leadId}` | Own record only; cannot change `customerUid` | Own lead only (`createdByUid == auth.uid`) | Any lead | `isAdmin() \|\| (((resource.data.customerUid == auth.uid) \|\| resource.data.createdByUid == auth.uid) && request.resource.data.customerUid == resource.data.customerUid)` |
| **Delete Lead** | `/leads/{leadId}` | Own record only | Own lead only | Any lead | `isAdmin() \|\| (resource.data.customerUid == auth.uid) \|\| resource.data.createdByUid == auth.uid` |

---

## Dirty Dozen Payloads & Guard Results

1. **Customer querying all leads without `customerUid` filter**: `PERMISSION_DENIED`
2. **Customer reading `/leads/{leadId}` of another customer**: `PERMISSION_DENIED`
3. **Customer modifying `/leads/{leadId}` of another customer**: `PERMISSION_DENIED`
4. **Customer creating a record with another user's `customerUid`**: `PERMISSION_DENIED`
5. **Customer updating a record to change `customerUid`**: `PERMISSION_DENIED`
6. **Customer attempting to list `/users` collection**: `PERMISSION_DENIED`
7. **Customer attempting to read another user's profile document**: `PERMISSION_DENIED`
8. **Salesperson querying leads without `createdByUid` filter**: `PERMISSION_DENIED`
9. **Salesperson reading `/leads/{leadId}` created by another salesperson**: `PERMISSION_DENIED`
10. **Unauthenticated user accessing any user doc or lead**: `PERMISSION_DENIED`
11. **Admin listing all leads and customer records**: `ALLOWED`
12. **Customer querying own records with `where('customerUid', '==', auth.uid)`**: `ALLOWED`

