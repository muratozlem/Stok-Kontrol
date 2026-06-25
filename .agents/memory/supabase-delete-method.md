---
name: Supabase data deletion and verification
description: How to reliably delete and verify data in Supabase from the Replit shell
---

# Reliable Supabase data deletion

## The rule
Use the **REST API with service role key** (`$SUPABASE_SERVICE_ROLE_KEY`) to delete or verify data.
The Management API `/database/query` endpoint returns incorrect results when RLS policies are active — it shows 0 rows even when data exists.

## Why
Management API queries run under a restricted user affected by RLS. Service role key bypasses RLS entirely.

## How to apply

### Delete all rows from a table:
```bash
curl -s -X DELETE "https://<ref>.supabase.co/rest/v1/<table>?id=neq.00000000-0000-0000-0000-000000000000" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Prefer: return=minimal"
```

### Verify row count:
```bash
curl -s "https://<ref>.supabase.co/rest/v1/<table>?select=id&limit=100" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" | python3 -c "import json,sys; print(len(json.load(sys.stdin)))"
```

### List/delete auth users (admin API):
```bash
curl -s "https://<ref>.supabase.co/auth/v1/admin/users" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```
