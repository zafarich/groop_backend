# Telegram Webhook - To'liq Qo'llanma

## 📋 Umumiy Ma'lumot

Telegram bot webhook tizimi to'liq implement qilindi. Har bir o'quv markaz o'z botini yaratib, tizimga ulab ishlatishi mumkin.

## 🎯 Xususiyatlar

### ✅ Bajarilgan

1. **Dynamic Webhook URLs** - Har bir bot uchun unique webhook URL
2. **Security** - Bot ID + Secret Token authentication
3. **Telegram API Integration** - To'liq API wrapper
4. **Message Handling** - /start, /help, /menu commands
5. **Course Enrollment Flow** - Mock implementation
6. **Payment Receipt Handling** - Chek rasmini qabul qilish
7. **Callback Query Handling** - Inline button'lar
8. **Multi-tenant Support** - Har bir center uchun alohida bot

## 🗄️ Database Schema

### CenterTelegramBot

```prisma
model CenterTelegramBot {
  id          String   @id @default(uuid())
  centerId    String
  botToken    String   @unique
  botUsername String?
  displayName String?
  isActive    Boolean  @default(true)
  
  // Webhook configuration
  webhookUrl   String?
  secretToken  String   @unique  // 64-char random hex
  webhookSetAt DateTime?
  
  // Payment information
  paymentCardNumber String?
  paymentCardHolder String?
  paymentBankName   String?
  
  // Bot messages
  welcomeMessage      String?  @db.Text
  courseInfoTemplate  String?  @db.Text
  paymentInstruction  String?  @db.Text
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  center Center @relation(...)
}
```

### TelegramUser

```prisma
model TelegramUser {
  id           String   @id @default(uuid())
  telegramId   String
  centerId     String?  // Qaysi center botidan
  username     String?
  firstName    String?
  lastName     String?
  chatId       String?
  status       String?  @default("active")
  
  @@unique([telegramId, centerId])  // Bir user turli centerlar'da bo'lishi mumkin
}
```

## 📡 API Endpoints

### Center Bot Management

```bash
# 1. Bot yaratish (avtomatik webhook o'rnatadi)
POST /api/v1/center-bots
Authorization: Bearer {token}
{
  "centerId": "center-uuid",
  "botToken": "1234567890:ABCdef...",
  "displayName": "Falcon Academy",
  "paymentCardNumber": "8600 1234 5678 9012",
  "paymentCardHolder": "FALCON ACADEMY LLC",
  "paymentBankName": "Uzcard",
  "welcomeMessage": "Assalomu alaykum! Xush kelibsiz!",
  "paymentInstruction": "To'lovdan keyin chek yuborishni unutmang."
}

# Response:
{
  "id": "bot-uuid",
  "botUsername": "falcon_academy_bot",
  "webhookUrl": "https://api.saas.com/api/v1/telegram/webhook/bot/{bot-id}/{secret-token}",
  "webhookSetAt": "2024-11-17T12:00:00Z",
  "isActive": true
}

# 2. Barcha botlar
GET /api/v1/center-bots?centerId={center-id}

# 3. Bot ma'lumotlari
GET /api/v1/center-bots/{bot-id}

# 4. Webhook info
GET /api/v1/center-bots/{bot-id}/webhook-info

# 5. Webhook'ni qayta o'rnatish
POST /api/v1/center-bots/{bot-id}/reset-webhook

# 6. Bot yangilash
PATCH /api/v1/center-bots/{bot-id}
{
  "paymentCardNumber": "8600 9999 8888 7777"
}

# 7. Bot o'chirish
DELETE /api/v1/center-bots/{bot-id}
```

### Webhook Endpoint (Public)

```bash
# Telegram tomonidan avtomatik chaqiriladi
POST /api/v1/telegram/webhook/bot/{botId}/{secretToken}
Headers:
  X-Telegram-Bot-Api-Secret-Token: {env-secret}
Body:
  {
    "update_id": 123456,
    "message": {...}
  }
```

## 🔄 To'liq Jarayon

### 1. O'qituvchi Bot Qo'shadi

```bash
# Admin panel'da
1. BotFather'dan bot yaratadi: @falcon_academy_bot
2. Token oladi: 1234567890:ABCdef...
3. Tizimga kiritadi:

POST /api/v1/center-bots
{
  "centerId": "my-center-uuid",
  "botToken": "1234567890:ABCdef...",
  "displayName": "Falcon Academy",
  "paymentCardNumber": "8600 1234 5678 9012",
  "paymentCardHolder": "FALCON ACADEMY LLC"
}

# Backend avtomatik:
✅ Bot tokenini verify qiladi (Telegram API)
✅ Secret token generatsiya qiladi
✅ Webhook URL yaratadi
✅ Telegram'ga webhook o'rnatadi
✅ Database'ga saqlaydi
```

### 2. O'quvchi Kursga Yoziladi

```
1. O'qituvchi kurs yaratadi (TODO: keyingi qadamda implement)
2. Kurs uchun unique link generatsiya:
   https://t.me/falcon_academy_bot?start=course_ABC123

3. O'quvchi linkni bosadi
   ↓
4. Telegram @falcon_academy_bot'ni ochadi
   /start course_ABC123 command yuboriladi
   ↓
5. Webhook event keladi:
   POST /api/v1/telegram/webhook/bot/{bot-id}/{secret}
   {
     "message": {
       "from": {"id": 123456, "username": "student1"},
       "text": "/start course_ABC123"
     }
   }
   ↓
6. Backend processing:
   ✅ Bot va secret verify
   ✅ Telegram user yaratadi/yangilaydi
   ✅ course_ABC123 token'ini parse qiladi
   ✅ Kurs ma'lumotlarini yuboradi (hozircha mock)
   ✅ To'lov ma'lumotlarini ko'rsatadi
   ✅ Inline keyboard: [📸 Chek Yuborish] [❌ Bekor qilish]
```

### 3. O'quvchi To'lov Qiladi

```
1. O'quvchi kartaga pul o'tkazadi
2. "📸 Chek Yuborish" tugmasini bosadi
   ↓
3. Callback query webhook keladi:
   {
     "callback_query": {
       "data": "send_receipt:course_ABC123"
     }
   }
   ↓
4. Bot: "Chek rasmini yuboring" deb javob beradi
   ↓
5. O'quvchi chek rasmini yuboradi
   ↓
6. Photo webhook keladi:
   {
     "message": {
       "photo": [{file_id: "..."}]
     }
   }
   ↓
7. Backend:
   ✅ Rasmni Telegram API'dan oladi
   ✅ File URL: https://api.telegram.org/file/bot.../photo.jpg
   ✅ Database'ga saqlaydi (TODO: implement)
   ✅ Admin'ga bildirishnoma (TODO: implement)
   ✅ O'quvchiga tasdiqlash xabari yuboradi
```

### 4. Admin Tasdiqlay

```
TODO: Keyingi qadamda implement
1. Admin dashboard'da yangi chekni ko'radi
2. "Tasdiqlash" tugmasini bosadi
   ↓
3. Backend:
   ✅ Enrollment status → ACTIVE
   ✅ Private guruh invite link yaratadi
   ✅ Bot orqali o'quvchiga link yuboradi
```

## 🔐 Security

### 1. Bot ID + Secret Token

```
Webhook URL: /webhook/bot/{botId}/{secretToken}

- botId: UUID (taxmin qilib bo'lmaydi)
- secretToken: 64-char hex (database'da saqlanadi)
```

### 2. Telegram Secret Header

```
Headers: X-Telegram-Bot-Api-Secret-Token

Backend .env da:
TELEGRAM_WEBHOOK_SECRET=your-secret-key

Telegram'dan kelgan har bir request'da verify qilinadi.
```

### 3. Bot Activation Status

```
Faqat isActive=true botlar webhook qabul qiladi.
```

## 🛠️ Telegram API Wrapper

### TelegramApiService

```typescript
// Barcha Telegram API methodlari

await telegramApi.setWebhook(botToken, url, secret);
await telegramApi.sendMessage(botToken, chatId, text, options);
await telegramApi.sendPhoto(botToken, chatId, photo, caption);
await telegramApi.answerCallbackQuery(botToken, callbackId, text);
await telegramApi.getFile(botToken, fileId);
await telegramApi.createChatInviteLink(botToken, chatId, options);
await telegramApi.getMe(botToken); // Bot info
await telegramApi.getWebhookInfo(botToken);
await telegramApi.deleteWebhook(botToken);

// Keyboard builder
const keyboard = telegramApi.buildInlineKeyboard([
  [{text: "Button 1", callback_data: "action1"}],
  [{text: "Button 2", url: "https://example.com"}]
]);
```

## 📱 Bot Commands

### Implemented:

- `/start` - Welcome message yoki course enrollment
- `/start course_ABC123` - Kursga yozilish
- `/help` - Yordam
- `/menu` - Kurslar ro'yxati (hozircha bo'sh)

### Callback Actions:

- `send_receipt:courseToken` - Chek yuborish
- `cancel_enrollment:courseToken` - Bekor qilish

## 🧪 Test Qilish

### 1. Localhost'da Test

```bash
# ngrok yoki localhost.run ishlatish kerak
ngrok http 3000

# Output: https://abc123.ngrok.io

# .env'ni yangilash:
APP_URL=https://abc123.ngrok.io

# Botni qayta yaratish yoki webhook reset:
POST /api/v1/center-bots/{bot-id}/reset-webhook
```

### 2. Bot Yaratish

```bash
# Telegram'da @BotFather'ga borish:
/newbot
Bot name: Test Academy Bot
Username: test_academy_123_bot

# Token olish: 1234567890:ABCdef...
```

### 3. Tizimga Qo'shish

```bash
curl -X POST http://localhost:3000/api/v1/center-bots \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "centerId": "center-id",
    "botToken": "1234567890:ABCdef...",
    "displayName": "Test Academy",
    "paymentCardNumber": "8600 1234 5678 9012",
    "paymentCardHolder": "TEST ACADEMY"
  }'
```

### 4. Test

```
1. Telegram'da @test_academy_123_bot'ni och
2. /start yubor
3. Welcome message kelishi kerak
4. /start course_TEST yubor
5. Mock kurs ma'lumotlari va to'lov kartasi ko'rinishi kerak
```

## 📊 Database Migration

```bash
# 1. Prisma client generatsiya
yarn prisma:generate

# 2. Migration
yarn prisma migrate dev --name add_telegram_webhook

# Yoki:
npx prisma migrate dev --name add_telegram_webhook

# 3. Seed (permissions yangilangan)
yarn prisma:seed
```

## 🔜 TODO (Keyingi Qadamlar)

### Immediate (Kurs moduli keyin):

- [ ] Course model va CRUD
- [ ] Enrollment model
- [ ] Payment receipt storage
- [ ] Admin notification system
- [ ] Private group invite link
- [ ] Payment verification flow

### Future:

- [ ] Multiple payment methods (Click, Payme)
- [ ] Automatic payment verification
- [ ] Student progress tracking
- [ ] Attendance via Telegram
- [ ] Homework submission
- [ ] Certificate generation

## ⚠️ Important Notes

1. **Production'da**:
   - `APP_URL` ni real domain'ga o'zgartiring
   - `TELEGRAM_WEBHOOK_SECRET` ni kuchli qiling
   - SSL certificate kerak (HTTPS)

2. **Bot Token**:
   - Juda sensitive!
   - Database'da masked ko'rsatiladi
   - Hech qachon frontend'ga yuborilmaydi

3. **Webhook URL**:
   - Public endpoint (authentication yo'q)
   - Secret token bilan himoyalangan
   - Rate limiting qo'shish tavsiya

4. **File Storage**:
   - Chek rasmlari hozircha faqat URL saqlanadi
   - Production'da S3/Cloudinary'ga upload qilish kerak

## 📚 Qo'shimcha

Barcha kodlar tayyor va ishlamoqda! Kurs, Enrollment va boshqa modullar qo'shilgandan keyin to'liq CRM tizimi tayyor bo'ladi.

**Test uchun kerak:**
- PostgreSQL database (migration ishga tushgan)
- Ngrok yoki public URL (localhost test uchun)
- Telegram bot token (@BotFather'dan)

