# Backend NestJS - Folder Structure

Bu fayl loyihaning to'liq papka strukturasini ko'rsatadi.

```
backend-nestjs/
│
├── prisma/
│   ├── schema.prisma              # Prisma database schema
│   └── migrations/                # Database migrations (auto-generated)
│
├── src/
│   ├── common/                    # Umumiy modullar va utillar
│   │   ├── decorators/            # Custom decorators
│   │   │   ├── current-user.decorator.ts
│   │   │   ├── permissions.decorator.ts
│   │   │   ├── public.decorator.ts
│   │   │   ├── roles.decorator.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── guards/                # Authentication va authorization guards
│   │   │   ├── jwt-auth.guard.ts
│   │   │   ├── permissions.guard.ts
│   │   │   └── roles.guard.ts
│   │   │
│   │   ├── filters/               # Exception filters
│   │   │   └── http-exception.filter.ts
│   │   │
│   │   ├── interfaces/            # TypeScript interfaces
│   │   │   └── user.interface.ts
│   │   │
│   │   └── prisma/                # Prisma service
│   │       ├── prisma.module.ts
│   │       └── prisma.service.ts
│   │
│   ├── modules/                   # Feature modules
│   │   │
│   │   ├── auth/                  # Authentication module
│   │   │   ├── dto/
│   │   │   │   ├── login.dto.ts
│   │   │   │   ├── register.dto.ts
│   │   │   │   ├── refresh-token.dto.ts
│   │   │   │   └── index.ts
│   │   │   ├── strategies/
│   │   │   │   └── jwt.strategy.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.module.ts
│   │   │   └── auth.service.ts
│   │   │
│   │   ├── user/                  # User management module
│   │   │   ├── dto/
│   │   │   │   ├── create-user.dto.ts
│   │   │   │   ├── update-user.dto.ts
│   │   │   │   ├── assign-role.dto.ts
│   │   │   │   └── index.ts
│   │   │   ├── user.controller.ts
│   │   │   ├── user.module.ts
│   │   │   └── user.service.ts
│   │   │
│   │   ├── role/                  # Role management module
│   │   │   ├── dto/
│   │   │   │   ├── create-role.dto.ts
│   │   │   │   ├── update-role.dto.ts
│   │   │   │   ├── assign-permission.dto.ts
│   │   │   │   └── index.ts
│   │   │   ├── role.controller.ts
│   │   │   ├── role.module.ts
│   │   │   └── role.service.ts
│   │   │
│   │   ├── permission/            # Permission management module
│   │   │   ├── dto/
│   │   │   │   ├── create-permission.dto.ts
│   │   │   │   ├── update-permission.dto.ts
│   │   │   │   └── index.ts
│   │   │   ├── permission.controller.ts
│   │   │   ├── permission.module.ts
│   │   │   └── permission.service.ts
│   │   │
│   │   ├── center/                # Center (Tenant) management module
│   │   │   ├── dto/
│   │   │   │   ├── create-center.dto.ts
│   │   │   │   ├── update-center.dto.ts
│   │   │   │   └── index.ts
│   │   │   ├── center.controller.ts
│   │   │   ├── center.module.ts
│   │   │   └── center.service.ts
│   │   │
│   │   └── telegram/              # Telegram integration module
│   │       ├── dto/
│   │       │   ├── create-telegram-user.dto.ts
│   │       │   ├── update-telegram-user.dto.ts
│   │       │   ├── webhook-update.dto.ts
│   │       │   └── index.ts
│   │       ├── telegram.controller.ts
│   │       ├── telegram.module.ts
│   │       └── telegram.service.ts
│   │
│   ├── app.controller.spec.ts     # App controller tests
│   ├── app.controller.ts          # App controller
│   ├── app.module.ts              # Root module
│   ├── app.service.ts             # App service
│   └── main.ts                    # Application entry point
│
├── test/                          # E2E tests
│   ├── app.e2e-spec.ts
│   └── jest-e2e.json
│
├── .env                           # Environment variables (not in git)
├── .env.example                   # Environment variables example
├── .gitignore                     # Git ignore file
├── .prettierrc                    # Prettier configuration
├── eslint.config.mjs              # ESLint configuration
├── nest-cli.json                  # NestJS CLI configuration
├── package.json                   # NPM dependencies
├── tsconfig.json                  # TypeScript configuration
├── tsconfig.build.json            # TypeScript build configuration
├── yarn.lock                      # Yarn lock file
├── README.md                      # Project documentation
└── FOLDER_STRUCTURE.md            # This file
```

## Module Pattern

Har bir modul quyidagi strukturaga ega:

```
module-name/
├── dto/                           # Data Transfer Objects
│   ├── create-module.dto.ts       # Create DTO
│   ├── update-module.dto.ts       # Update DTO
│   └── index.ts                   # Barrel export
├── module.controller.ts           # HTTP endpoints
├── module.service.ts              # Business logic
└── module.module.ts               # Module definition
```

## Common Pattern

`common/` papkasi barcha modullar tomonidan ishlatiladigan umumiy komponentlarni o'z ichiga oladi:

- **decorators/** - Custom decorators (@Public, @RequirePermissions, etc.)
- **guards/** - Route guards (JwtAuthGuard, PermissionsGuard, etc.)
- **filters/** - Exception filters
- **interfaces/** - TypeScript interfaces
- **prisma/** - Database service

## Best Practices

1. **Modular Architecture** - Har bir feature alohida modulda
2. **DTOs** - Barcha input/output uchun DTOs ishlatish
3. **Validation** - class-validator yordamida validatsiya
4. **Guards** - Route himoyasi uchun guards
5. **Decorators** - Kodni soddalashtiradigan custom decorators
6. **Services** - Business logic service layerda
7. **Controllers** - Faqat HTTP handling

## AI-Agent Friendly

Bu struktura AI agentlar tomonidan avtomatik kod generatsiya qilish uchun optimallashtirilgan:

- Aniq va tushunarli papka nomlari
- Consistent naming conventions
- Modullar o'rtasida aniq ajratish
- Har bir fayl bitta mas'uliyatga ega (Single Responsibility)
- DTOs va interfacelar alohida faylarda

