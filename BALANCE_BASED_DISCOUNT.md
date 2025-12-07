# Balance-Based Discount System

## Overview

O'quvchilarga maxsus chegirma berish tizimi balance-based yondashuv asosida ishlaydi. Bu o'quvchining avvalgi to'lovlari saqlanadi va yangi narx keyingi darslar uchun qo'llaniladi.

## Ishlash Prinsipi

### Misol: Aktiv O'quvchiga Chegirma Berish

**Boshlang'ich holat:**

- Guruh narxi: 300,000 so'm/oy
- Oylik darslar soni: 12 ta (haftada 3 marta)
- Bir dars narxi: 25,000 so'm
- O'quvchi to'ladi: 300,000 so'm
- O'tgan darslar: 4 ta
- Qolgan balance: 200,000 so'm (8 darsga yetadi)

**Admin chegirma beradi:**

- Yangi narx: 200,000 so'm/oy
- Yangi dars narxi: 16,667 so'm

**Natija:**

- O'quvchining 200,000 so'm balansi saqlanadi
- Yangi narx bilan 200,000 so'm = 12 dars (16,667 × 12)
- O'quvchi qo'shimcha to'lov qilmaydi
- Keyingi to'lov: 200,000 so'm

## API Endpoint

```http
PATCH /enrollments/:id/discount
Authorization: Bearer <token>

{
  "customMonthlyPrice": 200000,
  "discountStartDate": "2024-12-07",
  "discountEndDate": "2025-06-07",
  "discountReason": "Yaxshi o'quvchi"
}
```

## Response Format

```json
{
  "success": true,
  "code": 0,
  "data": {
    "id": 1,
    "customMonthlyPrice": 200000,
    "perLessonPrice": 16667,
    "balance": 200000,
    "status": "ACTIVE"
  },
  "message": "Custom price assigned successfully",
  "shouldNotifyStudent": true,
  "isFreeEnrollment": false,
  "balanceInfo": {
    "oldLessonPrice": 25000,
    "newLessonPrice": 16667,
    "priceDifference": 8333,
    "currentBalance": 200000,
    "message": "Discount applied. Lesson price reduced from 25000 to 16667. Student's existing balance (200000) remains valid and will cover more lessons."
  }
}
```

## Telegram Xabarlari

### 1. Tekin Kurs (customMonthlyPrice = 0)

```
🎉 Tabriklaymiz!

Siz "Guruh nomi" guruhiga qo'shildingiz!

Darslar bepul taqdim etiladi. Omad tilaymiz! 🎓
```

### 2. Chegirmali Kurs (LEAD/TRIAL status)

```
💰 Maxsus narx belgilandi

📚 Guruh: Guruh nomi
💵 Siz uchun kurs to'lovi 200 000 so'm etib belgilandi.

To'lash uchun pastdagi tugmani bosing 👇
[💳 200 000 so'm to'lash]
```

### 3. Chegirmali Kurs (ACTIVE, musbat balance)

```
💰 Maxsus narx belgilandi

📚 Guruh: Guruh nomi
💵 Siz uchun kurs to'lovi 200 000 so'm etib belgilandi.

✅ Sizning hisobingizda 200 000 so'm mavjud.
Bu mablag' yangi narx bo'yicha darslaringizni qoplash uchun ishlatiladi.

🎓 Darslaringiz davom etaveradi!
```

### 4. Chegirmali Kurs (ACTIVE, manfiy balance/qarz)

```
💰 Maxsus narx belgilandi

📚 Guruh: Guruh nomi
💵 Siz uchun kurs to'lovi 200 000 so'm etib belgilandi.

⚠️ Hozirgi qarzingiz: 50 000 so'm
Yangi narx: 200 000 so'm/oy

To'lash uchun pastdagi tugmani bosing 👇
[💳 200 000 so'm to'lash]
```

## Afzalliklari

1. ✅ **Oddiy va tushunarli** - O'quvchi va admin uchun
2. ✅ **Adolatli** - Hech kim pul yo'qotmaydi
3. ✅ **Avtomatik** - Qo'shimcha hisob-kitob kerak emas
4. ✅ **Moslashuvchan** - Har qanday vaqtda chegirma berish mumkin
5. ✅ **Shaffof** - Balance har doim to'g'ri

## Texnik Detalllar

### Balance Hisoblash

- Balance = To'langan summa - Ishlatilgan summa
- Har darsdan keyin: `balance -= perLessonPrice`
- To'lovdan keyin: `balance += payment.amount`

### Chegirma Qo'llash

1. Yangi dars narxini hisoblash
2. `perLessonPrice` ni yangilash
3. Balance o'zgarmaydi
4. Keyingi darslar yangi narx bilan hisoblanadi

### Keyingi To'lov

- Keyingi to'lov yangi narx bilan yaratiladi
- Balance manfiy bo'lsa (qarz), to'lov talab qilinadi
- Balance musbat bo'lsa, darslar davom etadi
