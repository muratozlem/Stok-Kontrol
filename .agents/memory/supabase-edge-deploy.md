---
name: Supabase Edge Function Deployment via Management API
description: How to correctly deploy edge functions using the Management API (no Supabase CLI) — import format and body truncation workaround
---

## Rule

When deploying Supabase edge functions via `PATCH /v1/projects/{ref}/functions/{slug}` (Management API), always:
1. Use `npm:@supabase/supabase-js@2` import specifier (NOT `https://esm.sh/...` — causes BOOT_ERROR)
2. Prepend `/**/` (4 bytes) to the TypeScript source before sending, to compensate for the API stripping the first 4 bytes from the `body` field

**Why:** The Management API consistently strips the first 4 bytes of the `body` string field. Using `esm.sh` URLs causes BOOT_ERROR at Deno runtime even when the stored body looks correct. The `npm:` specifier resolves correctly.

**How to apply:**
```bash
echo -n "/**/" > /tmp/pfx.txt
cat /tmp/pfx.txt supabase/functions/<slug>/index.ts > /tmp/<slug>-padded.ts
PAYLOAD=$(jq -n --arg slug "<slug>" --rawfile body /tmp/<slug>-padded.ts \
  '{"slug":$slug,"name":$slug,"body":$body,"verify_jwt":false}')
curl -s -X PATCH \
  "https://api.supabase.com/v1/projects/{ref}/functions/<slug>" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD"
```

**Verification:** The `/body` endpoint returns raw stored content (NOT base64). Check it starts with `import` not `ort`/`rt`.
