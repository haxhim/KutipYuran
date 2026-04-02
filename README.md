# KutipYuran

Production-minded MVP SaaS for Malaysian fee collection automation with WhatsApp reminders, billing, wallet-ledger accounting, and payouts.

## Architecture Summary

- `Next.js App Router` for public site, tenant dashboard, and superadmin UI
- `PostgreSQL + Prisma` for multi-tenant core data, billing, payments, wallet, and audit
- `Redis + BullMQ` for reminder blasts, imports, webhook processing, and billing jobs
- `whatsapp-web.js` for QR-linked tenant sessions with persistent local auth storage
- `Docker Compose + Dokploy` for local and production-style deployment

## Key Modules

- `src/modules/auth`: registration and session auth
- `src/modules/tenant`: tenant context enforcement
- `src/modules/billing`: billing generation and dashboard metrics
- `src/modules/payments`: provider abstraction and checkout creation
- `src/modules/wallet`: append-only ledger-driven wallet updates and payouts
- `src/modules/imports`: CSV preview and plan mapping
- `src/modules/campaigns`: campaign lifecycle
- `src/modules/whatsapp`: QR session and send service
- `worker`: BullMQ consumers

## Roles

- Platform superadmin: separate internal platform access via `isPlatformAdmin`
- Organization roles: `ADMIN` and `USER`
- `ADMIN` can manage pricing, plans, limits, billing, campaigns, integrations, team, settings, and wallet actions
- `USER` is limited to day-to-day operational actions

## Local Setup

1. Copy `.env.example` to `.env`.
2. Run `docker compose up --build -d postgres redis`.
3. Run `npm install`.
4. Run `npx prisma migrate dev --name init`.
5. Run `npm run db:seed`.
6. Run `npm run dev` and `npm run worker:dev`.

## Docker Setup

1. Copy `.env.example` to `.env` and update secrets.
2. Run `docker compose up --build`.
3. The app and worker containers now run `npx prisma migrate deploy` automatically before startup.
4. Seed once after the first successful boot:

```bash
docker compose exec app npm run db:seed
```

## Demo Accounts

- Owner: `owner@kutipyuran.demo` / `Password123!`
- Superadmin: `admin@kutipyuran.local` / `Password123!`

## Deployment Notes For Dokploy

- Mount persistent volumes for `/app/storage` and `/app/uploads`.
- Ensure public `APP_URL` is set to your deployed domain.
- Use Dokploy environment injection for CHIP and ToyyibPay secrets.
- Rebuild and redeploy both app and worker whenever new Prisma migrations are added.
- Keep app and worker services sharing the same storage volume for WhatsApp session persistence.
