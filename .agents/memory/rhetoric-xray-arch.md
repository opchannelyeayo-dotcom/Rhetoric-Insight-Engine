---
name: 話術透視鏡 Architecture Decisions
description: Non-obvious constraints and decisions for the rhetoric-xray full-stack app
---

## Zod v3 / Orval codegen fix
Orval generates `zod.int()` and `zod.looseObject()` (v4-style) but project pins zod@^3. Fix: `scripts/fix-zod-v4.cjs` post-processes `lib/api-zod/src/generated/api.ts` after each codegen run. MUST re-run when codegen is re-run.
**Why:** zod v3 has no `z.int()` or `z.looseObject()` — runtime `TypeError: (void 0) is not a function`.
**How to apply:** `pnpm --filter @workspace/api-spec run codegen` already calls the script; ensure it stays in the postprocess step.

## @workspace/db must be built for TS project references
`lib/db/package.json` has `"build": "tsc -p tsconfig.json"`. Must run `pnpm --filter @workspace/db run build` after schema changes for TypeScript typechecking in dependent packages to work. esbuild (runtime) reads `.ts` directly so runtime is unaffected.
**Why:** `tsconfig.json` uses `composite: true` — project references require compiled `.d.ts` output.

## Multipart uploads NOT in OpenAPI spec
`POST /api/upload-image` and `POST /api/admin/drugs/import` use multer directly in Express routes, bypassing Orval codegen. Frontend calls these with raw `fetch` + `FormData`, not generated hooks.
**Why:** Orval/generated code collides with `Blob`/`File` types and causes TS2308 errors.

## Admin seed credentials
Default admin: username=`123123`, password=`123123`. Seeded at DB init via `executeSql` with a pre-hashed bcrypt string. Override with env vars `ADMIN_USERNAME` / `ADMIN_PASSWORD`.
Bcrypt hash stored in `admin_users.password_hash`. bcrypt rounds=12.

## Session configuration
`connect-pg-simple` stores sessions in `admin_sessions` table (auto-created). Session cookie: httpOnly, 8h maxAge, sameSite=lax(dev)/none(prod). Secret from `SESSION_SECRET` env var.

## DB package exports
`lib/db/package.json` exports point to `.ts` source files directly (no compiled output for runtime). Works with esbuild (direct TS reading). For `tsc` project references, `pnpm --filter @workspace/db run build` must produce `dist/` `.d.ts` files first.

## Admin login password hash issue
The pre-computed bcrypt hash `$2b$12$K.D5TOUmO6dJnS7tsMgxPupqnJ.0mIcNc3jX0GG0GCbE6J3K5K2Oi` seeded for `123123` may fail bcrypt.compare at login. If login returns 401 with correct credentials, re-seed using: `node -e "const b=require('bcryptjs'); b.hash('123123',12).then(h=>console.log(h))"` in `artifacts/api-server/` and update the DB row.
**How to apply:** Check /api/admin/login returns 200 after seeding; if 401, re-hash and UPDATE admin_users SET password_hash=... WHERE username='123123'.
