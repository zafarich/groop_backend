# Payment Cards - To'lov Kartalari Moduli

## 📋 Umumiy Ma'lumot

O'quv markazlar uchun to'lov kartalarini boshqarish moduli. Har bir markaz bir nechta karta qo'shishi, ularni boshqarishi va kerak bo'lganda yashirishi mumkin.

## 🗄️ Database Schema

### CenterPaymentCard Model

```prisma
model CenterPaymentCard {
  id         String   @id @default(uuid())
  centerId   String
  
  // Karta ma'lumotlari
  cardNumber String   // "8600 1234 5678 9012"
  cardHolder String   // "FALCON ACADEMY LLC"
  bankName   String?  // "Uzcard", "Humo", "Visa"
  cardType   String?  // uzcard, humo, visa, mastercard
  
  // Status va sozlamalar
  isActive   Boolean  @default(true)
  isVisible  Boolean  @default(true)   // Botda ko'rsatish/yashirish
  isPrimary  Boolean  @default(false)  // Asosiy karta
  
  // Qo'shimcha
  description  String?  @db.Text
  displayOrder Int?     @default(0)
  
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  
  center Center @relation(...)
}
```

### Key Features:

1. **isActive** - Karta faolmi (admin tomonidan)
2. **isVisible** - Botda ko'rsatish (soft delete)
3. **isPrimary** - Asosiy karta (⭐ belgisi bilan)
4. **displayOrder** - Kartalar tartibi

## 📡 API Endpoints

### 1. Karta Qo'shish

```bash
POST /api/v1/payment-cards
Authorization: Bearer {token}
Permissions: center.manage

{
  "centerId": "center-uuid",
  "cardNumber": "8600 1234 5678 9012",
  "cardHolder": "FALCON ACADEMY LLC",
  "bankName": "Uzcard",
  "cardType": "uzcard",
  "isPrimary": true,
  "description": "Asosiy karta - Kurs to'lovlari uchun"
}

# Response:
{
  "id": "card-uuid",
  "cardNumber": "8600 1234 5678 9012",
  "cardHolder": "FALCON ACADEMY LLC",
  "isPrimary": true,
  "isVisible": true,
  "isActive": true,
  ...
}
```

### 2. Barcha Kartalar (Admin)

```bash
GET /api/v1/payment-cards?centerId={center-id}&includeHidden=true
Authorization: Bearer {token}
Permissions: center.read

# Response: Array of payment cards
```

### 3. Ko'rinadigan Kartalar (Public)

```bash
# Telegram bot uchun ishlatiladi
GET /api/v1/payment-cards/visible/{centerId}
Public: true

# Response:
[
  {
    "id": "card-1",
    "cardNumber": "8600 1234 5678 9012",
    "cardHolder": "FALCON ACADEMY LLC",
    "bankName": "Uzcard",
    "isPrimary": true,
    ...
  },
  {
    "id": "card-2",
    "cardNumber": "8600 9999 8888 7777",
    "cardHolder": "FALCON ACADEMY",
    "bankName": "Humo",
    "isPrimary": false,
    ...
  }
]
```

### 4. Asosiy Kartani Olish (Public)

```bash
GET /api/v1/payment-cards/primary/{centerId}
Public: true

# Response: Single primary card or first visible card
```

### 5. Karta Yangilash

```bash
PATCH /api/v1/payment-cards/{card-id}
Authorization: Bearer {token}
Permissions: center.manage

{
  "cardNumber": "8600 9999 8888 7777",
  "description": "Yangilangan tavsif"
}
```

### 6. Asosiy Karta Qilish

```bash
PATCH /api/v1/payment-cards/{card-id}/set-primary
Authorization: Bearer {token}
Permissions: center.manage

# Avtomatik boshqa kartalarning isPrimary=false qilinadi
```

### 7. Visibility Toggle

```bash
PATCH /api/v1/payment-cards/{card-id}/toggle-visibility
Authorization: Bearer {token}
Permissions: center.manage

# isVisible ni true/false o'zgartiradi
```

### 8. Soft Delete

```bash
DELETE /api/v1/payment-cards/{card-id}/soft
Authorization: Bearer {token}
Permissions: center.manage

# isVisible=false qiladi (yashiradi)
```

### 9. Hard Delete

```bash
DELETE /api/v1/payment-cards/{card-id}
Authorization: Bearer {token}
Permissions: center.manage

# Database'dan butunlay o'chiradi
```

### 10. Kartalarni Tartiblash

```bash
POST /api/v1/payment-cards/reorder
Authorization: Bearer {token}
Permissions: center.manage

{
  "centerId": "center-id",
  "cardIds": ["card-1", "card-3", "card-2"]  // Yangi tartib
}
```

## 🔄 Telegram Bot Integration

### Kurs Enrollmentda Ko'rsatish

Telegram botda `/start course_ABC` buyrug'i yuborilganda:

```
📚 Python Asoslari kursi

💰 Narx: 500,000 so'm

💳 To'lov uchun kartalar:

⭐ Karta: 8600 1234 5678 9012
FALCON ACADEMY LLC
Bank: Uzcard
Asosiy karta - Kurs to'lovlari uchun

Karta: 8600 9999 8888 7777
FALCON ACADEMY
Bank: Humo

To'lov qilganingizdan keyin chek rasmini yuboring.

[📸 Chek Yuborish] [❌ Bekor qilish]
```

### Logic:

1. `isVisible=true` va `isActive=true` kartalar ko'rsatiladi
2. `isPrimary=true` karta birinchi bo'lib, ⭐ belgisi bilan
3. `displayOrder` bo'yicha tartiblangan
4. `description` mavjud bo'lsa ko'rsatiladi

## 💡 Use Cases

### 1. Bir Nechta Karta

```typescript
// Asosiy karta - Kurs to'lovlari
{
  cardNumber: "8600 1234 5678 9012",
  cardHolder: "FALCON ACADEMY LLC",
  bankName: "Uzcard",
  isPrimary: true,
  description: "Asosiy karta - Kurs to'lovlari uchun"
}

// Qo'shimcha karta - Muddatli to'lovlar
{
  cardNumber: "8600 9999 8888 7777",
  cardHolder: "FALCON ACADEMY",
  bankName: "Humo",
  isPrimary: false,
  description: "Muddatli to'lovlar uchun"
}
```

### 2. Kartani Vaqtincha Yashirish

```bash
# Admin kartani yashirmoqchi bo'lsa (masalan, karta muddati o'tgan)
PATCH /api/v1/payment-cards/{card-id}/toggle-visibility

# Karta isVisible=false bo'ladi
# Telegram botda ko'rinmaydi
# Lekin database'da saqlanadi
# Kerak bo'lsa qayta ko'rsatish mumkin
```

### 3. Yangi Asosiy Karta

```bash
# Yangi karta qo'shish va uni asosiy qilish
POST /api/v1/payment-cards
{
  "centerId": "...",
  "cardNumber": "8600 5555 4444 3333",
  "isPrimary": true
}

# Avtomatik:
# - Eski primary=true kartalar primary=false bo'ladi
# - Yangi karta primary=true va isVisible=true bo'ladi
```

## 🔒 Security & Permissions

### Required Permissions:

- **payment-card.create** - Yangi karta qo'shish
- **payment-card.read** - Kartalarni ko'rish
- **payment-card.update** - Kartani yangilash
- **payment-card.delete** - Kartani o'chirish
- **payment-card.manage** - To'liq boshqarish (primary, visibility)

Yoki:

- **center.manage** - O'quv markaz boshqaruvchisi (barcha operatsiyalar)
- **center.read** - O'quv markaz ma'lumotlarini ko'rish

### Public Endpoints:

- `GET /payment-cards/visible/{centerId}` - Telegram bot uchun
- `GET /payment-cards/primary/{centerId}` - Telegram bot uchun

## 📊 Business Logic

### isPrimary Logic:

```typescript
// Faqat bitta karta primary bo'lishi mumkin
// Yangi kartani primary qilganda:
1. Barcha boshqa kartalar primary=false
2. Yangi karta primary=true

// Primary kartani soft delete qilganda:
1. Karta isVisible=false va isPrimary=false
2. Keyingi visible karta avtomatik primary bo'ladi
```

### Visibility Logic:

```typescript
// isVisible=false qilish (soft delete):
- Telegram botda ko'rinmaydi
- Admin panelda "yashirilgan" deb ko'rsatiladi
- Kerak bo'lsa qayta ko'rsatish mumkin
- Database'da saqlanadi

// Hard delete:
- Database'dan butunlay o'chiriladi
- Qaytarib bo'lmaydi
```

### Display Order:

```typescript
// Telegram botda tartib:
1. isPrimary=true (eng yuqorida, ⭐ bilan)
2. displayOrder (kichikdan kattaga)
3. Bir xil displayOrder bo'lsa - createdAt (eng yangi)
```

## 🧪 Test Qilish

### 1. Karta Qo'shish

```bash
curl -X POST http://localhost:3000/api/v1/payment-cards \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "centerId": "center-id",
    "cardNumber": "8600 1234 5678 9012",
    "cardHolder": "FALCON ACADEMY LLC",
    "bankName": "Uzcard",
    "isPrimary": true
  }'
```

### 2. Ko'rinadigan Kartalarni Olish

```bash
curl http://localhost:3000/api/v1/payment-cards/visible/center-id
```

### 3. Telegram Botda Test

```
1. /start course_TEST yuboring
2. To'lov kartalari ko'rinishi kerak
3. Primary karta ⭐ bilan belgilangan
```

## 📝 Migration

```bash
# 1. Prisma client generatsiya
npx prisma generate

# 2. Migration yaratish
npx prisma migrate dev --name add_payment_cards

# 3. Permissions seed
npx prisma db seed
```

## 🔜 Next Steps

- [ ] Karta validation (Luhn algorithm)
- [ ] Encrypted card storage
- [ ] Auto-expire for old cards
- [ ] Payment analytics per card
- [ ] Multiple currency support

---

**Eslatma:** Kartalar to'liq tayyor va ishlamoqda! Admin panel UI'da kartalarni boshqarish uchun CRUD operatsiyalari implement qilingan.

