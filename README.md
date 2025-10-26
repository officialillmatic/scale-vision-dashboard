# Scale Vision Dashboard

Production-ready setup and deployment checklist for Dr Scale AI dashboards.

## Quickstart

```bash
# 1) Install deps
pnpm i || npm i

# 2) Create .env from env.example and fill values
cp env.example .env

# 3) Dev
pnpm dev || npm run dev

# 4) Build
pnpm build || npm run build
```

## Required environment variables
See `env.example`. Secrets must not be committed to git. Use Vercel/Render/Supabase project settings.

## Security
- RLS enforced on all tables.
- Only public anon key in browser; service role is server-only.
- Webhooks signed (HMAC) and validated.
- No PII in client logs.

## CI
- Typecheck, Lint, Build on PRs.
- Secret/keys leak scanner.
