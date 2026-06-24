---
name: RLS and Security Policies
description: Row Level Security setup after security migration — no anon access to business data
---

All `anon_all_*` policies (products, warehouses, inventory, transactions, profiles) have been dropped.

**Current policy structure:**
- `profiles`: SELECT for all authenticated, UPDATE/DELETE only via `is_admin()`
- `products/warehouses/inventory/transactions`: ALL for authenticated users where `is_approved_user()` is true
- `password_reset_requests`: INSERT for anon (to submit requests), ALL for authenticated admins via `is_admin()`
- `stock_alerts`: ALL for authenticated admins only

**Helper functions (SECURITY DEFINER, STABLE):**
- `is_admin()` — returns true if `auth.uid()` matches a profile with role='admin'
- `is_approved_user()` — returns true if `auth.uid()` matches a profile with status='approved' OR role='admin'

**Why:** Previous setup gave anon users full read/write/delete to all tables including profiles (exposing emails, hashes, and allowing privilege escalation). Now only authenticated sessions can access business data.

**How to apply:** When adding new tables, always add a policy using `is_approved_user()` or `is_admin()`. Never use `TO anon` for business data.
