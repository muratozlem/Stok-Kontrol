# Threat Model

## Project Overview

Stok Kontrol is a public internet-facing inventory management application with two production clients: an Expo/React Native app in `expo/` and a Next.js dashboard in `dashboard/`. Both clients use Supabase for authentication and most data access. Privileged operations run through Supabase Edge Functions in `supabase/functions/`, and the dashboard also has a server-side Supabase service-role client. Production assumptions for this scan: deployed traffic is TLS-terminated by the platform, `NODE_ENV=production`, and the public deployment at `https://stokkontrol.tr` is reachable from the internet.

## Assets

- **User accounts and roles** — Supabase Auth identities plus `profiles` rows containing email, role, status, and location assignment. Compromise allows impersonation or privilege escalation.
- **Inventory and warehouse data** — products, warehouses, stock levels, and transaction history. Tampering directly affects business operations.
- **Administrative workflows** — user approval, role changes, account deletion, password resets, and data-clearing actions. Abuse can lock out users or grant unauthorized access.
- **Application secrets** — Supabase service-role keys and Resend API keys used by Edge Functions and dashboard server code. Leakage would bypass normal authorization.
- **Operational notifications** — password reset flows and critical stock alert emails. Abuse can create spam, confusion, or social-engineering leverage.

## Trust Boundaries

- **Client ↔ Supabase boundary** — both the Expo app and the dashboard browser client send untrusted requests directly to Supabase. Database RLS and Edge Function auth must enforce server-side authorization.
- **Dashboard server ↔ Supabase boundary** — Next.js server components in `dashboard/` use a service-role client that bypasses RLS. Route protection and per-request authorization must therefore be explicit in server code.
- **Edge Function ↔ Supabase boundary** — functions in `supabase/functions/` use service-role keys for privileged operations. Any logic bug in these handlers becomes a full authorization bypass.
- **Authenticated ↔ privileged-role boundary** — the app distinguishes `super_admin`, `admin`, `chef`, and `staff`, and also uses location assignment. Those restrictions must be enforced server-side, not only in UI filtering.
- **Public ↔ authenticated boundary** — registration and password-reset request flows are reachable without an existing session and must resist abuse, spam, and bootstrap attacks.

## Scan Anchors

- **Production entry points**: `expo/app/_layout.tsx`, `dashboard/middleware.ts`, `dashboard/app/**`, `supabase/functions/**`.
- **Highest-risk code areas**: `supabase/apply_schema.sql`, `supabase/apply_schema_v2.sql`, `dashboard/lib/supabase-server.ts`, `expo/providers/AuthProvider.tsx`, `expo/providers/DataProvider.tsx`.
- **Public surfaces**: mobile/web registration, forgot-password, and any direct Edge Function invocation from unauthenticated users.
- **Authenticated/admin surfaces**: dashboard `/dashboard/*`, Expo `admin.tsx`, direct client-side writes to Supabase tables, all service-role Edge Functions.
- **Usually ignore as dev-only**: `node_modules/`, build output such as `dashboard/.next/` and `expo/dist/`, unless production reachability is demonstrated.

## Threat Categories

### Spoofing

Authentication is delegated to Supabase Auth, but every protected operation still has to validate the caller’s session and role server-side. Public bootstrap or account-management flows must not let an unauthenticated user become the first privileged user or impersonate another account through weak approval or reset logic.

### Tampering

Inventory, warehouse, and role-management actions are business-critical. The system must ensure product edits, stock movements, location changes, approvals, and destructive actions are authorized by role and location on the server side. Client-side filtering or hidden buttons are not sufficient.

### Information Disclosure

Profiles contain organization user lists, email addresses, approval status, and role assignments. Inventory and transaction data are also sensitive across locations. Queries and server-rendered pages must be scoped to the authenticated user’s permitted role and location; service-role server code must not return global data to lower-privileged admins.

### Denial of Service

Public registration and password-reset request endpoints can be abused for spam, queue flooding, or operational disruption. These flows must rate limit unauthenticated callers and avoid allowing attackers to create unlimited pending work for administrators.

### Elevation of Privilege

The most important guarantee is that only `super_admin` users can exercise global privileges, while `admin`, `chef`, and `staff` remain constrained to their intended capabilities and locations. RLS policies, dashboard server queries, and Edge Functions must consistently enforce those constraints even when a caller bypasses the UI and talks directly to Supabase APIs.