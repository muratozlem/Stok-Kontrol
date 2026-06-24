---
name: Role System
description: 4-tier role hierarchy with location scoping — super_admin, admin, chef, staff
---

# Role System

## Roles
- `super_admin` — All Turkey, unlimited. Create/delete locations and warehouses, all stock ops, reports, assign any role. status=approved on first registration.
- `admin` (İdari İşler) — Own location. Warehouse CRUD, IN+OUT stock, reports, assign chef/staff.
- `chef` (Şef) — Own location. IN+OUT stock, reports, assign staff only.
- `staff` (Personel) — Own location. OUT stock only, no reports, no user management.

## DB Changes
- `locations` table: UUID PK, name, city, description
- `warehouses.location_id` UUID FK → locations.id (nullable)
- `profiles.location_id` UUID FK → locations.id (nullable — super_admin has null)
- role CHECK: `('super_admin', 'admin', 'chef', 'staff')`

## Helper Functions
- `is_super_admin()` — checks role = 'super_admin'
- `is_admin()` — checks role IN ('super_admin', 'admin')
- `is_approved_user()` — status='approved' OR role='super_admin'
- `get_user_location_id()` — returns current user's location_id

## Edge Functions
- `register-user`: first user → super_admin/approved; others → staff/pending
- `update-user-role`: validates caller role and location scope before updating role+location+status

## AuthProvider Fields
- `isSuperAdmin`, `isAdmin`, `isChef`, `isStaff`, `canManageUsers`
- `canManageUsers` = super_admin OR admin OR chef (shows admin panel link)

## DataProvider Location Filtering
- Warehouses: super_admin sees all; others see only location_id matching their own
- Transactions: filtered via warehouseIds set (location-scoped)
- Products: global, no location filter

**Why:** Multi-branch restaurant/warehouse use case with hierarchical access control.
**How to apply:** Always use `isSuperAdmin` for truly global ops; use `canManageUsers` for admin panel visibility; use `isAdmin` for warehouse/user CRUD.
