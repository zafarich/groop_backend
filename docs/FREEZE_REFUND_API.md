# Freeze va Refund API Hujjatlari

## Freeze (Muzlatish) API

### 1. Muzlatish yaratish

**POST** `/freeze`

O'quvchini guruhda vaqtincha muzlatish.

**Request Body:**

```json
{
  "enrollmentId": 1,
  "reason": "Kasallik tufayli",
  "freezeStartDate": "2024-12-15",
  "freezeEndDate": "2025-01-15" // Optional - null bo'lsa cheksiz
}
```

**Response:**

```json
{
  "success": true,
  "code": 0,
  "data": {
    "freeze": {
      "id": 1,
      "enrollmentId": 1,
      "studentId": 5,
      "reason": "Kasallik tufayli",
      "freezeStartDate": "2024-12-15T00:00:00.000Z",
      "freezeEndDate": "2025-01-15T00:00:00.000Z",
      "status": "ACTIVE",
      "actualEndDate": null,
      "endedBy": null,
      "createdAt": "2024-12-08T10:00:00.000Z",
      "updatedAt": "2024-12-08T10:00:00.000Z"
    },
    "enrollment": {
      "id": 1,
      "status": "FROZEN",
      "balance": "500000.00"
      // ... other fields
    }
  },
  "message": "Freeze created successfully"
}
```

**Telegram Notification:**

```
❄️ Darslar muzlatildi

📚 Guruh: Python Bootcamp
📅 Boshlanish: 15 dekabr 2024
📅 Tugash: 15 yanvar 2025

💡 Muzlatish davomida to'lov talab qilinmaydi.
```

---

### 2. Muzlatishni tugatish

**PATCH** `/freeze/:id/end`

Aktiv muzlatishni tugatish va o'quvchini qayta faollashtirish.

**Request Body:**

```json
{
  "endReason": "Sog'aydi" // Optional
}
```

**Response:**

```json
{
  "success": true,
  "code": 0,
  "data": {
    "freeze": {
      "id": 1,
      "status": "ENDED",
      "actualEndDate": "2024-12-20T10:00:00.000Z",
      "endedBy": "ADMIN"
    },
    "enrollment": {
      "id": 1,
      "status": "ACTIVE",
      "balance": "500000.00"
    }
  },
  "message": "Freeze ended successfully"
}
```

**Telegram Notification:**

```
✅ Muzlatish tugadi

📚 Guruh: Python Bootcamp
🎓 Darslaringiz davom etadi!

Omad tilaymiz!
```

---

### 3. Muzlatishni bekor qilish

**DELETE** `/freeze/:id`

Muzlatishni bekor qilish (boshlangunga qadar yoki davomida).

**Response:**

```json
{
  "success": true,
  "code": 0,
  "data": {
    "freeze": {
      "id": 1,
      "status": "CANCELLED",
      "actualEndDate": "2024-12-20T10:00:00.000Z",
      "endedBy": "ADMIN"
    },
    "enrollment": {
      "id": 1,
      "status": "ACTIVE"
    }
  },
  "message": "Freeze cancelled successfully"
}
```

**Telegram Notification:**

```
🚫 Muzlatish bekor qilindi

📚 Guruh: Python Bootcamp
🎓 Darslaringiz davom etadi!
```

---

### 4. Enrollment bo'yicha muzlatishlar ro'yxati

**GET** `/freeze/enrollment/:enrollmentId`

Ma'lum bir enrollment uchun barcha muzlatishlarni olish.

**Response:**

```json
{
  "success": true,
  "code": 0,
  "data": [
    {
      "id": 1,
      "enrollmentId": 1,
      "studentId": 5,
      "reason": "Kasallik tufayli",
      "freezeStartDate": "2024-12-15T00:00:00.000Z",
      "freezeEndDate": "2025-01-15T00:00:00.000Z",
      "status": "ENDED",
      "actualEndDate": "2024-12-20T10:00:00.000Z",
      "endedBy": "ADMIN",
      "createdAt": "2024-12-08T10:00:00.000Z",
      "updatedAt": "2024-12-20T10:00:00.000Z"
    }
  ],
  "message": "Freezes retrieved successfully"
}
```

---

## Refund (Qaytarish) API

### 1. Qaytarish so'rovini yaratish

**POST** `/refunds`

O'quvchi uchun pul qaytarish so'rovini yaratish.

**Request Body:**

```json
{
  "enrollmentId": 1,
  "requestReason": "Boshqa shahrga ko'chib ketdim"
}
```

**Response:**

```json
{
  "success": true,
  "code": 0,
  "data": {
    "id": 1,
    "centerId": 1,
    "studentId": 5,
    "groupId": 3,
    "requestReason": "Boshqa shahrga ko'chib ketdim",
    "totalPaid": "1200000.00",
    "lessonsAttended": 8,
    "totalLessons": 24,
    "refundAmount": "800000.00",
    "status": "PENDING",
    "processedBy": null,
    "processedAt": null,
    "processingNotes": null,
    "completedAt": null,
    "createdAt": "2024-12-08T10:00:00.000Z",
    "student": {
      "id": 5,
      "user": {
        "firstName": "Ali",
        "lastName": "Valiyev"
      }
    }
  },
  "message": "Refund request created successfully"
}
```

**Hisob-kitob:**

- Jami to'langan: 1,200,000 so'm
- Jami darslar: 24
- Qatnashgan darslar: 8
- Dars narxi: 1,200,000 / 24 = 50,000 so'm
- Qaytariladigan summa: 1,200,000 - (8 × 50,000) = 800,000 so'm

**Telegram Notification:**

```
📝 Qaytarish so'rovi qabul qilindi

💰 Qaytariladigan summa: 800 000 so'm
📊 Jami to'langan: 1 200 000 so'm
📚 Qatnashgan darslar: 8 / 24

⏳ So'rovingiz ko'rib chiqilmoqda...
```

---

### 2. Qaytarish so'rovini ko'rib chiqish

**PATCH** `/refunds/:id/process`

Admin tomonidan qaytarish so'rovini tasdiqlash yoki rad etish.

**Request Body (Tasdiqlash):**

```json
{
  "decision": "APPROVED",
  "processingNotes": "Qaytarish tasdiqlandi"
}
```

**Request Body (Rad etish):**

```json
{
  "decision": "REJECTED",
  "processingNotes": "Kurs shartnomasiga ko'ra qaytarish mumkin emas"
}
```

**Response:**

```json
{
  "success": true,
  "code": 0,
  "data": {
    "id": 1,
    "status": "APPROVED",
    "processedBy": 2,
    "processedAt": "2024-12-08T12:00:00.000Z",
    "processingNotes": "Qaytarish tasdiqlandi",
    "completedAt": "2024-12-08T12:00:00.000Z",
    "refundAmount": "800000.00",
    "student": {
      "user": {
        "firstName": "Ali",
        "lastName": "Valiyev"
      }
    }
  },
  "message": "Refund approved successfully"
}
```

**Telegram Notification (Tasdiqlangan):**

```
✅ Qaytarish so'rovi tasdiqlandi

💰 Qaytariladigan summa: 800 000 so'm

Pul yaqin kunlarda hisobingizga qaytariladi.
Bizning xizmatlarimizdan foydalanganingiz uchun rahmat! 🙏
```

**Telegram Notification (Rad etilgan):**

```
❌ Qaytarish so'rovi rad etildi

📝 Sabab: Kurs shartnomasiga ko'ra qaytarish mumkin emas

Agar savollaringiz bo'lsa, administrator bilan bog'laning.
```

**Avtomatik o'zgarishlar (Tasdiqlanganda):**

- Enrollment statusi `DROPPED` ga o'zgaradi
- `removedAt` va `removalReason` yangilanadi

---

### 3. Qaytarish so'rovlari ro'yxati

**GET** `/refunds?status=PENDING`

Center uchun barcha qaytarish so'rovlarini olish.

**Query Parameters:**

- `status` (optional): `PENDING`, `APPROVED`, `REJECTED`, `COMPLETED`

**Response:**

```json
{
  "success": true,
  "code": 0,
  "data": [
    {
      "id": 1,
      "centerId": 1,
      "studentId": 5,
      "groupId": 3,
      "requestReason": "Boshqa shahrga ko'chib ketdim",
      "totalPaid": "1200000.00",
      "lessonsAttended": 8,
      "totalLessons": 24,
      "refundAmount": "800000.00",
      "status": "PENDING",
      "createdAt": "2024-12-08T10:00:00.000Z",
      "student": {
        "user": {
          "firstName": "Ali",
          "lastName": "Valiyev",
          "phoneNumber": "+998901234567"
        }
      }
    }
  ],
  "message": "Refund requests retrieved successfully"
}
```

---

### 4. Bitta qaytarish so'rovini olish

**GET** `/refunds/:id`

Ma'lum bir qaytarish so'rovining to'liq ma'lumotlarini olish.

**Response:**

```json
{
  "success": true,
  "code": 0,
  "data": {
    "id": 1,
    "centerId": 1,
    "studentId": 5,
    "groupId": 3,
    "requestReason": "Boshqa shahrga ko'chib ketdim",
    "totalPaid": "1200000.00",
    "lessonsAttended": 8,
    "totalLessons": 24,
    "refundAmount": "800000.00",
    "status": "APPROVED",
    "processedBy": 2,
    "processedAt": "2024-12-08T12:00:00.000Z",
    "processingNotes": "Qaytarish tasdiqlandi",
    "completedAt": "2024-12-08T12:00:00.000Z",
    "createdAt": "2024-12-08T10:00:00.000Z",
    "student": {
      "user": {
        "firstName": "Ali",
        "lastName": "Valiyev",
        "phoneNumber": "+998901234567",
        "telegramUserId": 123
      },
      "payments": [
        {
          "id": 1,
          "amount": "400000.00",
          "paidAt": "2024-11-01T10:00:00.000Z",
          "status": "PAID"
        },
        {
          "id": 2,
          "amount": "400000.00",
          "paidAt": "2024-11-15T10:00:00.000Z",
          "status": "PAID"
        },
        {
          "id": 3,
          "amount": "400000.00",
          "paidAt": "2024-12-01T10:00:00.000Z",
          "status": "PAID"
        }
      ]
    }
  },
  "message": "Refund request retrieved successfully"
}
```

---

## Permissions

### Freeze API

- `POST /freeze` - `enrollment.update`
- `PATCH /freeze/:id/end` - `enrollment.update`
- `DELETE /freeze/:id` - `enrollment.update`
- `GET /freeze/enrollment/:enrollmentId` - `enrollment.read`

### Refund API

- `POST /refunds` - `enrollment.update`
- `PATCH /refunds/:id/process` - `enrollment.manage`
- `GET /refunds` - `enrollment.read`
- `GET /refunds/:id` - `enrollment.read`

---

## Status Enum'lari

### FreezeStatus

- `ACTIVE` - Aktiv muzlatish
- `ENDED` - Tugatilgan
- `CANCELLED` - Bekor qilingan

### RefundStatus

- `PENDING` - Kutilmoqda
- `APPROVED` - Tasdiqlangan
- `REJECTED` - Rad etilgan
- `COMPLETED` - Yakunlangan

### EnrollmentStatus (Freeze/Refund ta'siri)

- `FROZEN` - Muzlatilgan (freeze yaratilganda)
- `ACTIVE` - Aktiv (freeze tugaganda)
- `DROPPED` - Tashlab ketgan (refund tasdiqlanganda)

---

## Muhim Eslatmalar

### Freeze

1. Faqat `ACTIVE` statusdagi enrollmentlarni muzlatish mumkin
2. Bir vaqtning o'zida bitta aktiv muzlatish bo'lishi mumkin
3. Muzlatish davomida balance o'zgarmaydi - o'quvchi kreditini saqlaydi
4. Muzlatish tugaganda o'quvchi avtomatik `ACTIVE` holatga qaytadi
5. `freezeEndDate` null bo'lsa - cheksiz muzlatish (admin qo'lda tugatadi)

### Refund

1. `ACTIVE`, `FROZEN`, `DROPPED` statusdagi enrollmentlar uchun so'rov qilish mumkin
2. Bir guruh uchun bir vaqtning o'zida bitta `PENDING` so'rov bo'lishi mumkin
3. Qaytarish summasi avtomatik hisoblanadi (qatnashgan darslar asosida)
4. Refund tasdiqlanganda enrollment avtomatik `DROPPED` holatga o'tadi
5. Haqiqiy attendance tracking bo'lmasa, barcha o'tgan darslar "qatnashgan" deb hisoblanadi

### Telegram Notifications

1. Barcha freeze/refund operatsiyalari uchun avtomatik xabarnomalar yuboriladi
2. O'quvchining Telegram akkaunt ulangan bo'lishi kerak
3. Center uchun aktiv bot bo'lishi kerak
4. Xabarnomalar yuborilmasa, log'da warning yoziladi (operatsiya davom etadi)

---

## Xatoliklar

### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "Enrollment not found",
  "error": "Not Found"
}
```

### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": "Cannot freeze enrollment with status LEAD. Only ACTIVE enrollments can be frozen.",
  "error": "Bad Request"
}
```

### 409 Conflict

```json
{
  "statusCode": 409,
  "message": "Student already has an active freeze request",
  "error": "Conflict"
}
```
