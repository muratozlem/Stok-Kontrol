---
name: RLS Role-Write Boundary
description: How write access to inventory tables is gated by role, and how is_admin() was hardened to require approved status.
---

## Rule
Product, warehouse, and transaction DELETE/UPDATE policies require `is_admin_or_chef()` (super_admin, admin, chef — all must be approved). Staff users are blocked from these mutations at the database level.

Transaction INSERT allows approved users BUT adds the gate `is_admin_or_chef() OR type = 'OUT'` — staff can only create OUT-type stock transactions.

Inventory INSERT/UPDATE remain open to `is_approved_user()` so the stock-transaction flow (which upserts inventory after inserting a transaction) works for staff doing OUT transactions.

Inventory DELETE requires `is_admin_or_chef()` to prevent staff from wiping inventory via the clearAllData sequence.

`is_admin()` was updated to require `status = 'approved' OR role = 'super_admin'`, preventing revoked/pending admins from satisfying policies and self-reactivating via a direct profile update.

`profiles_update_admin` WITH CHECK restricts role assignment by admins to only `role IN ('chef', 'staff')` — admins cannot promote peers to admin via direct API calls (matching the update-user-role edge function hierarchy).

**Why:** UI-only gates are not security. Staff users had a direct Supabase API path to forge IN transactions, create products/warehouses, delete inventory, and wipe branch data. Revoked admins with stale sessions could restore their own access.

**How to apply:** When adding new write policies to inventory-adjacent tables, use `is_admin_or_chef()` for destructive/mutating ops unless the table is specifically designed for staff input (like the stock transaction OUT flow).
