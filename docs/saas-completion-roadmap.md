# KutipYuran SaaS Completion Roadmap

## Target Shape

- `src/app`
  - App Router pages kept thin and primarily responsible for composition, route guards, and loading states.
- `src/components`
  - Shared presentational UI and dashboard widgets.
- `src/modules`
  - Domain-oriented server code: auth, authz, tenant, customers, fee-plans, billing, payments, imports, campaigns, whatsapp, reports, team, audit, settings, admin.
- `src/lib`
  - Infrastructure and cross-cutting utilities only.
- `worker`
  - Queue consumers, retries, dead-letter handling, job health reporting.

## Delivery Priorities

### P0

- Typed authorization and permission enforcement
- Tenant-safe server actions and API routes
- Audit visibility
- Team visibility and role-aware navigation
- Webhook idempotency and payment integrity hardening
- Campaign state machine and safety controls
- Import job model and history

### P1

- Complete tenant settings, subscription, integrations, reports, profile
- Complete admin diagnostics and queue/worker monitoring
- Complete fee plans CRUD and billing detail flows
- Manual payment proof review and payout workflow polish

### P2

- Analytics depth, charting, advanced export surfaces
- Approval workflows, feature flags UI, system notices
- Richer onboarding and operator guidance

## Guardrails

- Every tenant read/write must flow through tenant-aware services.
- Every privileged operation must enforce permission server-side.
- Every payment, payout, and campaign transition must be auditable.
- Every async workflow must expose status, failure reason, and operator recovery path.
