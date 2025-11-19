# Multi-Tenant SaaS Platform - NestJS Backend

Bu loyiha NestJS framework yordamida yaratilgan to'liq funksional multi-tenant SaaS platformasi backend qismidir. PostgreSQL va Prisma ORM ishlatilgan.

## 🚀 Xususiyatlar

- ✅ **JWT Authentication** - Passport-JWT yordamida autentifikatsiya
- ✅ **RBAC (Role-Based Access Control)** - Rol va ruxsatlar tizimi
- ✅ **Multi-Tenant Architecture** - Ko'p ijarachi arxitekturasi (Center)
- ✅ **PostgreSQL + Prisma ORM** - Zamonaviy database boshqaruvi
- ✅ **Modular Architecture** - NestJS modular tuzilishi
- ✅ **Validation** - Class-validator yordamida validatsiya
- ✅ **Guards & Decorators** - Himoya va dekoratorlar
- ✅ **Telegram Bot Integration** - To'liq Telegram bot webhook tizimi
- ✅ **Subscription Management** - Tarif rejalar va obunalar
- ✅ **Dynamic Bot Management** - Har bir center uchun alohida bot
- ✅ **Payment Cards Management** - To'lov kartalarini boshqarish tizimi

## 📁 Loyiha Strukturasi

```
backend-nestjs/
├── prisma/
│   └── schema.prisma              # Prisma schema (Database models)
├── src/
│   ├── common/
│   │   ├── decorators/            # Custom decorators
│   │   │   ├── current-user.decorator.ts
│   │   │   ├── permissions.decorator.ts
│   │   │   ├── public.decorator.ts
│   │   │   ├── roles.decorator.ts
│   │   │   └── index.ts
│   │   ├── guards/                # Guards
│   │   │   ├── jwt-auth.guard.ts
│   │   │   ├── permissions.guard.ts
│   │   │   └── roles.guard.ts
│   │   └── prisma/                # Prisma service
│   │       ├── prisma.module.ts
│   │       └── prisma.service.ts
│   ├── modules/
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
│   │   ├── user/                  # User module
│   │   │   ├── dto/
│   │   │   │   ├── create-user.dto.ts
│   │   │   │   ├── update-user.dto.ts
│   │   │   │   ├── assign-role.dto.ts
│   │   │   │   └── index.ts
│   │   │   ├── user.controller.ts
│   │   │   ├── user.module.ts
│   │   │   └── user.service.ts
│   │   ├── role/                  # Role module
│   │   │   ├── dto/
│   │   │   │   ├── create-role.dto.ts
│   │   │   │   ├── update-role.dto.ts
│   │   │   │   ├── assign-permission.dto.ts
│   │   │   │   └── index.ts
│   │   │   ├── role.controller.ts
│   │   │   ├── role.module.ts
│   │   │   └── role.service.ts
│   │   ├── permission/            # Permission module
│   │   │   ├── dto/
│   │   │   │   ├── create-permission.dto.ts
│   │   │   │   ├── update-permission.dto.ts
│   │   │   │   └── index.ts
│   │   │   ├── permission.controller.ts
│   │   │   ├── permission.module.ts
│   │   │   └── permission.service.ts
│   │   ├── center/                # Center (Tenant) module
│   │   │   ├── dto/
│   │   │   │   ├── create-center.dto.ts
│   │   │   │   ├── update-center.dto.ts
│   │   │   │   └── index.ts
│   │   │   ├── center.controller.ts
│   │   │   ├── center.module.ts
│   │   │   └── center.service.ts
│   │   ├── telegram/              # Telegram webhook module
│   │   │   ├── dto/
│   │   │   │   ├── create-telegram-user.dto.ts
│   │   │   │   ├── update-telegram-user.dto.ts
│   │   │   │   ├── webhook-update.dto.ts
│   │   │   │   └── index.ts
│   │   │   ├── telegram.controller.ts
│   │   │   ├── telegram.module.ts
│   │   │   └── telegram.service.ts
│   │   ├── center-bot/            # Telegram bot management
│   │   │   ├── dto/
│   │   │   │   ├── create-center-bot.dto.ts
│   │   │   │   ├── update-center-bot.dto.ts
│   │   │   │   └── index.ts
│   │   │   ├── telegram-api.service.ts
│   │   │   ├── center-bot.controller.ts
│   │   │   ├── center-bot.module.ts
│   │   │   └── center-bot.service.ts
│   │   ├── plan/                  # Subscription plans
│   │   │   ├── dto/
│   │   │   ├── plan.controller.ts
│   │   │   ├── plan.module.ts
│   │   │   └── plan.service.ts
│   │   ├── subscription/          # Center subscriptions
│   │   │   ├── dto/
│   │   │   ├── subscription.controller.ts
│   │   │   ├── subscription.module.ts
│   │   │   └── subscription.service.ts
│   │   └── payment-card/          # Payment cards management
│   │       ├── dto/
│   │       ├── payment-card.controller.ts
│   │       ├── payment-card.module.ts
│   │       └── payment-card.service.ts
│   ├── app.controller.ts
│   ├── app.module.ts
│   ├── app.service.ts
│   └── main.ts
├── .env.example                   # Environment variables example
├── .gitignore
├── nest-cli.json
├── package.json
├── tsconfig.json
└── README.md
```

## 🛠️ O'rnatish

### 1. Repository'ni klonlash

```bash
git clone <repository-url>
cd backend-nestjs
```

### 2. Dependencies o'rnatish

```bash
yarn install
```

### 3. Environment o'zgaruvchilarini sozlash

`.env` faylini yarating va quyidagi o'zgaruvchilarni sozlang:

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/saas_platform?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-this-in-production"
JWT_REFRESH_EXPIRES_IN="7d"

# Application
PORT=3000
NODE_ENV=development

# Telegram Webhook
APP_URL="http://localhost:3000"  # Production'da: https://yourdomain.com
TELEGRAM_WEBHOOK_SECRET="your-webhook-secret-key-change-in-production"
```

### 4. Database'ni sozlash

```bash
# Prisma client generatsiya qilish
npx prisma generate

# Database migratsiyasini ishga tushirish
npx prisma migrate dev --name init

# (Ixtiyoriy) Prisma Studio'ni ochish
npx prisma studio
```

## 🚀 Ishga tushirish

### Development rejimida

```bash
yarn start:dev
```

### Production build

```bash
yarn build
yarn start:prod
```

Dastur ishga tushgandan keyin: `http://localhost:3000/api/v1`

## 📚 API Endpoints

### Authentication

- `POST /api/v1/auth/register` - Ro'yxatdan o'tish
- `POST /api/v1/auth/login` - Kirish
- `POST /api/v1/auth/refresh` - Token yangilash
- `POST /api/v1/auth/logout` - Chiqish
- `POST /api/v1/auth/me` - Joriy foydalanuvchi ma'lumotlari

### Users

- `GET /api/v1/users` - Barcha foydalanuvchilar
- `GET /api/v1/users/:id` - Foydalanuvchi ma'lumotlari
- `POST /api/v1/users` - Yangi foydalanuvchi yaratish
- `PATCH /api/v1/users/:id` - Foydalanuvchini yangilash
- `DELETE /api/v1/users/:id` - Foydalanuvchini o'chirish
- `POST /api/v1/users/:id/roles` - Rol biriktirish
- `DELETE /api/v1/users/:id/roles/:roleId` - Rolni olib tashlash

### Roles

- `GET /api/v1/roles` - Barcha rollar
- `GET /api/v1/roles/:id` - Rol ma'lumotlari
- `POST /api/v1/roles` - Yangi rol yaratish
- `PATCH /api/v1/roles/:id` - Rolni yangilash
- `DELETE /api/v1/roles/:id` - Rolni o'chirish
- `POST /api/v1/roles/:id/permissions` - Ruxsat biriktirish
- `DELETE /api/v1/roles/:id/permissions/:permissionId` - Ruxsatni olib tashlash

### Permissions

- `GET /api/v1/permissions` - Barcha ruxsatlar
- `GET /api/v1/permissions/:id` - Ruxsat ma'lumotlari
- `POST /api/v1/permissions` - Yangi ruxsat yaratish
- `GET /api/v1/permissions/seed` - Default ruxsatlarni yaratish
- `PATCH /api/v1/permissions/:id` - Ruxsatni yangilash
- `DELETE /api/v1/permissions/:id` - Ruxsatni o'chirish

### Centers (Tenants)

- `GET /api/v1/centers` - Barcha markazlar
- `GET /api/v1/centers/:id` - Markaz ma'lumotlari
- `GET /api/v1/centers/:id/stats` - Markaz statistikasi
- `POST /api/v1/centers` - Yangi markaz yaratish
- `PATCH /api/v1/centers/:id` - Markazni yangilash
- `DELETE /api/v1/centers/:id` - Markazni o'chirish

### Telegram Bot Management

- `POST /api/v1/center-bots` - Yangi bot yaratish
- `GET /api/v1/center-bots` - Barcha botlar
- `GET /api/v1/center-bots/:id` - Bot ma'lumotlari
- `PATCH /api/v1/center-bots/:id` - Botni yangilash
- `DELETE /api/v1/center-bots/:id` - Botni o'chirish
- `GET /api/v1/center-bots/:id/webhook-info` - Webhook ma'lumotlari
- `POST /api/v1/center-bots/:id/reset-webhook` - Webhook'ni qayta o'rnatish

### Telegram Webhook

- `POST /api/v1/telegram/webhook/bot/:botId/:secretToken` - Telegram webhook (Public)
- `GET /api/v1/telegram/users` - Telegram foydalanuvchilari
- `GET /api/v1/telegram/users/:id` - Telegram foydalanuvchi ma'lumotlari

### Plans & Subscriptions

- `GET /api/v1/plans` - Barcha tarif rejalar
- `POST /api/v1/plans` - Yangi plan yaratish
- `GET /api/v1/subscriptions` - Barcha obunalar
- `POST /api/v1/subscriptions` - Yangi obuna yaratish

### Payment Cards

- `POST /api/v1/payment-cards` - Yangi karta qo'shish
- `GET /api/v1/payment-cards` - Barcha kartalar
- `GET /api/v1/payment-cards/visible/:centerId` - Ko'rinadigan kartalar (Public)
- `GET /api/v1/payment-cards/primary/:centerId` - Asosiy karta (Public)
- `PATCH /api/v1/payment-cards/:id` - Kartani yangilash
- `PATCH /api/v1/payment-cards/:id/set-primary` - Asosiy karta qilish
- `PATCH /api/v1/payment-cards/:id/toggle-visibility` - Ko'rinishni o'zgartirish
- `DELETE /api/v1/payment-cards/:id/soft` - Soft delete (yashirish)
- `DELETE /api/v1/payment-cards/:id` - Hard delete
- `POST /api/v1/payment-cards/reorder` - Kartalarni tartiblash

## 🔐 RBAC (Role-Based Access Control)

### Guards

1. **JwtAuthGuard** - JWT token tekshirish
2. **PermissionsGuard** - Ruxsatlarni tekshirish
3. **RolesGuard** - Rollarni tekshirish

### Decorators

1. **@Public()** - Endpoint'ni ommaviy qilish (autentifikatsiya talab qilinmaydi)
2. **@RequirePermissions(...permissions)** - Ruxsatlar talab qilish
3. **@RequireRoles(...roles)** - Rollar talab qilish
4. **@CurrentUser()** - Joriy foydalanuvchini olish

### Misol

```typescript
@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UserController {
  @Get()
  @RequirePermissions('user.read')
  findAll() {
    return this.userService.findAll();
  }

  @Post()
  @RequirePermissions('user.create')
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }
}
```

## 🗄️ Database Schema

### Asosiy Modellar

- **Center** - O'quv markaz (Tenant)
- **User** - Foydalanuvchi
- **Role** - Rol
- **Permission** - Ruxsat
- **UserRole** - Foydalanuvchi-Rol bog'lanishi
- **RolePermission** - Rol-Ruxsat bog'lanishi
- **RefreshToken** - JWT refresh tokenlar
- **CenterTelegramBot** - Markazga tegishli botlar
- **CenterPaymentCard** - To'lov kartalari
- **TelegramUser** - Telegram foydalanuvchilari
- **Plan** - Tarif rejalar (Default, Pro, Enterprise)
- **CenterSubscription** - Markaz obunalari

## 🔧 Texnologiyalar

- **NestJS** - Node.js framework
- **TypeScript** - Dasturlash tili
- **PostgreSQL** - Database
- **Prisma** - ORM
- **Passport-JWT** - Authentication
- **Class-validator** - Validation
- **Class-transformer** - Transformation
- **Bcrypt** - Password hashing

## 📝 Default Permissions

Tizimda quyidagi default ruxsatlar mavjud:

### User Module
- `user.create`, `user.read`, `user.update`, `user.delete`
- `user.assign-role`, `user.remove-role`

### Role Module
- `role.create`, `role.read`, `role.update`, `role.delete`
- `role.assign-permission`, `role.remove-permission`

### Permission Module
- `permission.create`, `permission.read`, `permission.update`, `permission.delete`

### Center Module
- `center.create`, `center.read`, `center.update`, `center.delete`

### Telegram Module
- `telegram.manage`, `telegram.send`

### Plan Module
- `plan.create`, `plan.read`, `plan.update`, `plan.delete`

### Subscription Module
- `subscription.create`, `subscription.read`, `subscription.update`, `subscription.delete`

### Payment Card Module
- `payment-card.create`, `payment-card.read`, `payment-card.update`, `payment-card.delete`, `payment-card.manage`

Default ruxsatlarni yaratish uchun:

```bash
curl -X GET http://localhost:3000/api/v1/permissions/seed \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🧪 Testing

```bash
# Unit tests
yarn test

# E2E tests
yarn test:e2e

# Test coverage
yarn test:cov
```

## 📦 Production Deploy

```bash
# Build
yarn build

# Run migrations
npx prisma migrate deploy

# Start
yarn start:prod
```

## 🤝 Contributing

Pull request'lar xush kelibsiz! Katta o'zgarishlar uchun avval issue oching.

## 📄 License

[MIT](LICENSE)

## 👨‍💻 Muallif

Backend NestJS SaaS Platform

---

## 🤖 Telegram Bot Integration

Bu loyiha o'quv markazlar uchun to'liq Telegram bot integratsiyasiga ega. Har bir markaz o'z botini yaratib, CRM tizimiga ulashi mumkin.

### Asosiy Xususiyatlar:

1. **Dynamic Bot Management** - Har bir center uchun alohida bot
2. **Secure Webhooks** - Bot ID + Secret Token authentication
3. **Course Enrollment** - Telegram orqali kurslarga yozilish
4. **Payment Processing** - Chek rasmini qabul qilish va tasdiqlash
5. **Auto Group Invites** - To'lov tasdiqlanganidan keyin avtomatik guruhga qo'shish

### To'liq Qo'llanmalar:

- **Telegram Bot:** [TELEGRAM_WEBHOOK_GUIDE.md](./TELEGRAM_WEBHOOK_GUIDE.md)
- **Payment Cards:** [PAYMENT_CARDS_GUIDE.md](./PAYMENT_CARDS_GUIDE.md)
- **Hybrid User Model:** [HYBRID_USER_MODEL.md](./HYBRID_USER_MODEL.md)
- **Soft Delete:** [SOFT_DELETE_GUIDE.md](./SOFT_DELETE_GUIDE.md)

---

**Eslatma:** Bu loyiha AI-agent friendly qilib yaratilgan va avtomatik generatsiya uchun optimallashtirilgan.
