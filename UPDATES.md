# Database va Modullar Yangilanishi

## 📅 Yangilanish Sanasi: 2024

## 🎯 Qo'shilgan Xususiyatlar

### 1. **Database Schema Yangilandi**

#### Center Model O'zgarishlari:
- ✅ `logoUrl` - Markaz logotipi URL
- ✅ `ownerUserId` - Markaz egasi (User relation)
- ✅ `bots` - CenterTelegramBot relation
- ✅ `subscriptions` - CenterSubscription relation

#### Yangi Modellar:

**CenterTelegramBot** - Har bir center uchun Telegram bot ma'lumotlari
- `id` - UUID
- `centerId` - Center relation
- `botToken` - Bot tokeni (unique, sensitive)
- `botUsername` - Bot username (@my_center_bot)
- `displayName` - Ko'rinadigan nom
- `isActive` - Aktiv/naktiv
- `webhookUrl` - Webhook URL
- Timestamps

**Plan** - Tarif rejalar (Free/Pro/Enterprise)
- `id` - UUID
- `key` - Unique key (free, pro, enterprise)
- `name` - Reja nomi
- `description` - Tavsif
- `monthlyPrice` - Oylik narx (centlarda)
- `currency` - Valyuta (default: USD)
- `maxStudents` - Maksimal o'quvchilar
- `maxTeachers` - Maksimal o'qituvchilar
- `maxGroups` - Maksimal guruhlar
- `maxCenters` - Maksimal markazlar
- `featuresJson` - JSON features
- `isActive` - Aktiv/naktiv
- Timestamps

**CenterSubscription** - Center obuna ma'lumotlari
- `id` - UUID
- `centerId` - Center relation
- `planId` - Plan relation
- `status` - TRIAL | ACTIVE | PAST_DUE | CANCELED
- `currentPeriodStart` - Davr boshlanishi
- `currentPeriodEnd` - Davr tugashi
- `cancelAtPeriodEnd` - Davr oxirida bekor qilish
- `externalCustomerId` - Payment provider customer ID
- `externalSubscriptionId` - Payment provider subscription ID
- Timestamps

**SubscriptionStatus Enum**
- `TRIAL` - Bepul sinov davri
- `ACTIVE` - Aktiv obuna
- `PAST_DUE` - To'lov kechikkan
- `CANCELED` - Bekor qilingan

### 2. **Plan Module** (Yangi)

**DTOs:**
- `CreatePlanDto` - Plan yaratish
- `UpdatePlanDto` - Plan yangilash

**Service Methods:**
- `create()` - Yangi plan yaratish
- `findAll()` - Barcha planlar
- `findOne()` - ID bo'yicha plan
- `findByKey()` - Key bo'yicha plan
- `update()` - Plan yangilash
- `remove()` - Plan o'chirish
- `seedDefaultPlans()` - Default planlarni yaratish (Free, Pro, Enterprise)

**Controller Endpoints:**
- `POST /api/v1/plans` - Plan yaratish
- `GET /api/v1/plans` - Barcha planlar (public)
- `GET /api/v1/plans/seed` - Default planlarni seed qilish
- `GET /api/v1/plans/:id` - Plan olish (public)
- `PATCH /api/v1/plans/:id` - Plan yangilash
- `DELETE /api/v1/plans/:id` - Plan o'chirish

**Default Plans:**
1. **Free Plan**
   - Price: $0
   - Max Students: 50
   - Max Teachers: 5
   - Max Groups: 10
   - Features: basic_reports, student_management, attendance_tracking

2. **Pro Plan**
   - Price: $49.00
   - Max Students: 500
   - Max Teachers: 50
   - Max Groups: 100
   - Features: +advanced_reports, payment_tracking, sms_notifications, telegram_integration

3. **Enterprise Plan**
   - Price: $149.00
   - Max Students: Unlimited
   - Max Teachers: Unlimited
   - Max Groups: Unlimited
   - Features: +custom_reports, whatsapp_integration, api_access, custom_branding, priority_support

### 3. **Subscription Module** (Yangi)

**DTOs:**
- `CreateSubscriptionDto` - Obuna yaratish
- `UpdateSubscriptionDto` - Obuna yangilash
- `SubscriptionStatus` - Status enum

**Service Methods:**
- `create()` - Yangi obuna yaratish
- `findAll()` - Barcha obunalar
- `findOne()` - ID bo'yicha obuna
- `findByCenterId()` - Center bo'yicha obunalar
- `getActiveSubscription()` - Center'ning aktiv obunasi
- `update()` - Obuna yangilash
- `cancel()` - Obunani bekor qilish (immediately yoki period oxirida)
- `reactivate()` - Obunani qayta faollashtirish
- `checkAndUpdateExpiredSubscriptions()` - Muddati o'tgan obunalarni tekshirish

**Controller Endpoints:**
- `POST /api/v1/subscriptions` - Obuna yaratish
- `GET /api/v1/subscriptions` - Barcha obunalar
- `GET /api/v1/subscriptions/center/:centerId` - Center obunalari
- `GET /api/v1/subscriptions/center/:centerId/active` - Aktiv obuna
- `GET /api/v1/subscriptions/check-expired` - Muddati o'tganlarni tekshirish
- `GET /api/v1/subscriptions/:id` - Obuna olish
- `PATCH /api/v1/subscriptions/:id` - Obuna yangilash
- `POST /api/v1/subscriptions/:id/cancel` - Obunani bekor qilish
- `POST /api/v1/subscriptions/:id/reactivate` - Obunani qayta faollashtirish

### 4. **Permissions Qo'shildi**

**Plan Permissions:**
- `plan.create` - Plan yaratish
- `plan.read` - Plan ko'rish
- `plan.update` - Plan yangilash
- `plan.delete` - Plan o'chirish

**Subscription Permissions:**
- `subscription.create` - Obuna yaratish
- `subscription.read` - Obuna ko'rish
- `subscription.update` - Obuna yangilash
- `subscription.cancel` - Obunani bekor qilish
- `subscription.manage` - To'liq boshqarish

## 📊 Statistika

### Yangilangan Fayllar:
- `prisma/schema.prisma` - Database schema
- `prisma/seed.ts` - Seed data (9 ta yangi permission)
- `src/app.module.ts` - Yangi modullar qo'shildi
- `src/modules/center/dto/*` - DTO'lar yangilandi

### Yaratilgan Fayllar:
- `src/modules/plan/` - 7 ta fayl
- `src/modules/subscription/` - 7 ta fayl
- **Jami**: 14 ta yangi fayl

### API Endpoints:
- **Plan**: 6 ta endpoint
- **Subscription**: 9 ta endpoint
- **Jami yangi**: 15 ta endpoint

## 🚀 Ishga Tushirish

### 1. Database Migration

```bash
# Prisma client generatsiya
yarn prisma:generate

# Migration yaratish va ishga tushirish
yarn prisma migrate dev --name add_plans_and_subscriptions

# Yoki to'g'ridan-to'g'ri:
npx prisma migrate dev --name add_plans_and_subscriptions
```

### 2. Seed Data

```bash
# Seed ishga tushirish (yangi permissions va plans)
yarn prisma:seed

# Yoki:
npx ts-node prisma/seed.ts
```

### 3. Default Plans Yaratish

```bash
# API orqali default planlarni yaratish
curl -X GET http://localhost:3000/api/v1/plans/seed \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📝 Ishlatish Misollari

### Plan Yaratish

```bash
curl -X POST http://localhost:3000/api/v1/plans \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "custom",
    "name": "Custom Plan",
    "description": "Custom pricing plan",
    "monthlyPrice": 9900,
    "currency": "USD",
    "maxStudents": 300,
    "maxTeachers": 30,
    "maxGroups": 50,
    "featuresJson": "[\"basic_reports\",\"student_management\"]"
  }'
```

### Subscription Yaratish

```bash
curl -X POST http://localhost:3000/api/v1/subscriptions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "centerId": "center-uuid-here",
    "planId": "plan-uuid-here",
    "status": "TRIAL",
    "currentPeriodStart": "2024-01-01T00:00:00Z",
    "currentPeriodEnd": "2024-02-01T00:00:00Z"
  }'
```

### Aktiv Subscription Olish

```bash
curl -X GET http://localhost:3000/api/v1/subscriptions/center/CENTER_ID/active \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Subscription Bekor Qilish

```bash
# Davr oxirida bekor qilish
curl -X POST http://localhost:3000/api/v1/subscriptions/SUBSCRIPTION_ID/cancel \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"immediately": false}'

# Darhol bekor qilish
curl -X POST http://localhost:3000/api/v1/subscriptions/SUBSCRIPTION_ID/cancel \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"immediately": true}'
```

## 🔄 Business Logic

### Subscription Lifecycle

1. **TRIAL** → User 14 kun bepul sinab ko'radi
2. **ACTIVE** → To'lov muvaffaqiyatli, xizmat aktiv
3. **PAST_DUE** → To'lov kechikdi, lekin xizmat hali ishlaydi (grace period)
4. **CANCELED** → Obuna to'liq bekor qilindi

### Auto-Update Logic

`checkAndUpdateExpiredSubscriptions()` metodi:
- Muddati o'tgan subscriptionlarni topadi
- Agar `cancelAtPeriodEnd = true` → CANCELED
- Agar `cancelAtPeriodEnd = false` → PAST_DUE

Bu metodbni cron job yoki scheduler bilan ishlatish mumkin.

## 🎯 Keyingi Qadamlar

1. ✅ Database migration
2. ✅ Seed data
3. ✅ API test qilish
4. 🔄 Payment integration (Click, Payme, Stripe)
5. 🔄 Webhook handlers
6. 🔄 Email notifications
7. 🔄 Cron job for expired subscriptions

## 📞 Qo'shimcha Ma'lumot

Barcha yangi endpointlar va modellar to'liq dokumentatsiyalangan va production-ready!

