# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Commands

### Install & environment
- Install dependencies (Yarn):
  - `yarn install`
- Prisma / database bootstrap:
  - `yarn prisma:generate` – generate Prisma client
  - `yarn prisma:migrate` – create/apply dev migrations
  - `yarn prisma:migrate:prod` – deploy migrations in production
  - `yarn prisma:studio` – open Prisma Studio
  - `yarn prisma:seed` – run DB seed script
  - `yarn db:push` – push Prisma schema without migrations
  - `yarn db:reset` – reset DB (drops data; dev-only)

Environment variables are documented in `README.md` and `.cursor/rules/rules` (see the `Environment Variables` section there). Follow those when adding new configuration.

### Run & build
- Development server (hot reload):
  - `yarn start:dev`
- Regular start (compiled build):
  - `yarn start`
- Production build and run:
  - `yarn build`
  - `yarn start:prod`

### Lint & format
- Lint (ESLint):
  - `yarn lint`
- Format (Prettier):
  - `yarn format`

### Tests
- Unit tests:
  - `yarn test`
- Watch mode (unit):
  - `yarn test:watch`
- Coverage:
  - `yarn test:cov`
- E2E tests:
  - `yarn test:e2e`
- Debug Jest:
  - `yarn test:debug`

To run a single test file, use Jest's path filtering, for example:
- `yarn test src/modules/user/user.service.spec.ts`
- or with watch mode: `yarn test:watch src/modules/user/user.service.spec.ts`

## High-level architecture

### Overview
- Backend for a **multi-tenant SaaS platform** for educational centers.
- Built with **NestJS** (`src/app.module.ts`, `src/main.ts`) and organized in a modular, feature-based structure under `src/modules`.
- Uses **PostgreSQL + Prisma** (`prisma/schema.prisma`) with a strong emphasis on **multi-tenancy**, **RBAC**, **soft delete**, and **Telegram bot integration**.

The README (`README.md`) provides an up-to-date feature list and a high-level API overview; consult it when introducing new modules or endpoints.

### Module layout
- `src/app.module.ts` – root Nest module wiring together feature modules and common providers.
- `src/common` – shared infrastructure:
  - `decorators/` – auth/RBAC helpers (e.g. `@CurrentUser`, `@RequirePermissions`, `@Public`, `@RequireRoles`).
  - `guards/` – `JwtAuthGuard`, `PermissionsGuard`, `RolesGuard` implementing authentication and authorization.
  - `filters/` – HTTP exception filter(s) to normalize error responses.
  - `prisma/` – `PrismaModule` and `PrismaService`, the single entry point to the database.
- `src/modules` – feature modules, each following the same pattern:
  - `*.module.ts` – Nest module definition (imports/providers/controllers export).
  - `*.service.ts` – business logic and DB access.
  - `*.controller.ts` – HTTP routes, guards, decorators, and DTO usage.
  - `dto/` – request/response validation classes (often `CreateXDto`, `UpdateXDto`, and `index.ts` re-export).

Key feature modules (see `src/modules/*` and `README.md` "Loyiha Strukturasi"):
- `auth` – authentication and token handling (JWT, refresh tokens, strategies).
- `user` – user management and linkage to roles/permissions and Telegram users.
- `role`, `permission` – RBAC configuration and permission seeding.
- `center` – tenant (educational center) lifecycle and isolation.
- `center-bot` – Telegram bot management per center, including webhook configuration and API integration.
- `telegram` – webhook endpoint and Telegram user handling.
- `plan`, `subscription` – subscription plans and tenant subscriptions.
- `payment-card` – payment card management, visibility and primary card logic.

When adding new features, follow the established **module/service/controller/dto** structure and keep cross-cutting concerns (guards, decorators, Prisma) in `src/common`.

### Multi-tenancy & RBAC
(From `.cursor/rules/rules` and `README.md`)
- **Tenants (`Center`)**:
  - Most domain models include a `centerId` field; this must be respected in queries to enforce tenant isolation.
  - Centers are isolated; avoid cross-center queries unless explicitly required by the business logic.
- **RBAC model**:
  - `User` → `UserRole` → `Role` → `RolePermission` → `Permission`.
  - Permissions are named as `module.action` (e.g. `user.create`, `center.read`, `payment-card.manage`).
  - Guards:
    - `JwtAuthGuard` – verifies JWT and establishes current user.
    - `PermissionsGuard` – checks that user has the required permissions.
    - `RolesGuard` – checks high-level roles when needed.
  - Decorators:
    - `@Public()` – marks endpoints as unauthenticated (e.g. webhooks).
    - `@RequirePermissions('module.action')` – fine-grained authorization.
    - `@RequireRoles(...)` – role-based checks.
    - `@CurrentUser()` – injects current user entity.

When defining new endpoints:
- Apply `JwtAuthGuard` and `PermissionsGuard` at controller or route level by default.
- Use `@Public()` only for explicitly public endpoints (e.g. Telegram webhook), and implement separate secret/token validation there.

### Soft delete, hybrid user model, and DB patterns
(From `.cursor/rules/rules`)
- **Soft delete pattern**:
  - Main tables include `isDeleted` (boolean) and `deletedAt` (DateTime). New models should follow this pattern.
  - Queries **must** filter with `isDeleted: false` unless explicitly working with deleted records.
  - For CRUD services, there is typically:
    - `softDelete(id)` – sets `isDeleted`/`deletedAt`.
    - `restore(id)` – clears soft delete flags.
    - `remove(id)` – hard delete, reserved for admin-only flows or junction tables.
- **Hybrid user model**:
  - `User` holds primary identity; `TelegramUser` stores Telegram-specific data.
  - `User.telegramUserId` links to `TelegramUser.id`.
  - Some users (e.g. Telegram-only students) may have no email/password; logic must account for that when authenticating.
- **Prisma schema conventions**:
  - `id` as `String @id @default(uuid())`.
  - `centerId` on most models; relations to `Center` with indexes on `centerId` and `isDeleted`.
  - Junction tables (e.g. `UserRole`, `RolePermission`, `RefreshToken`) usually do **not** use soft delete and can be hard-deleted.

When editing `prisma/schema.prisma`, maintain these conventions and remember to:
- Run `yarn prisma:generate` after schema changes.
- Run `yarn prisma:migrate` (or `yarn prisma:migrate:prod` in production contexts) to keep DB in sync.

### Telegram bot & payment flows
(From `README.md` and `.cursor/rules/rules`)
- **Telegram webhook**:
  - Public webhook endpoint is under `/api/v1/telegram/webhook/bot/:botId/:secretToken`.
  - Security:
    - Use the path `:secretToken` and the `X-Telegram-Bot-Api-Secret-Token` header for validation.
    - Endpoints are marked `@Public()` but must manually validate bot identity and secrets.
  - Flow:
    - Telegram `/start` → webhook receives update → `TelegramUser` created/updated → `User` auto-created/linked for students → welcome/next step messages.
- **Payment cards**:
  - Card visibility and ordering are controlled via `isVisible`, `isPrimary`, and ordering fields (e.g. `displayOrder`).
  - For a center, only one card can be primary; when setting a card as primary, clear `isPrimary` on others.
  - "Soft delete" for user-facing card removal often uses flags like `isVisible` and `isDeleted` depending on the context.

### Coding patterns & style
(Based on `.cursor/rules/rules`)
- **Services**:
  - Prefer a standard CRUD shape: `create`, `findAll`, `findOne`, `update`, `softDelete`, `restore`, `remove`.
  - Always:
    - Check entity existence and `isDeleted` before updates.
    - Throw appropriate Nest exceptions (`NotFoundException`, `ConflictException`, `BadRequestException`, `UnauthorizedException`, `ForbiddenException`).
- **DTOs**:
  - Use `class-validator` for all incoming data.
  - For updates, build DTOs via `PartialType(CreateXDto)`.
- **Controllers**:
  - Apply guards and decorators consistently.
  - Follow the standard REST shape:
    - `POST /` → create
    - `GET /` → list
    - `GET /:id` → retrieve
    - `PATCH /:id` → update
    - `DELETE /:id/soft` → soft delete
    - `POST /:id/restore` → restore
    - `DELETE /:id` → hard delete (privileged).

Import order and file naming conventions are documented at the end of `.cursor/rules/rules`; match those when adding new files or imports.

## External docs in this repo

Several feature-specific guides are referenced from `README.md`:
- `TELEGRAM_WEBHOOK_GUIDE.md` – details of Telegram webhook/bot integration.
- `PAYMENT_CARDS_GUIDE.md` – payment card domain and flows.
- `HYBRID_USER_MODEL.md` – how `User` and `TelegramUser` interact.
- `SOFT_DELETE_GUIDE.md` – design and expected behavior of soft delete.

Consult these documents before modifying the corresponding areas to keep behavior aligned with the documented design.
