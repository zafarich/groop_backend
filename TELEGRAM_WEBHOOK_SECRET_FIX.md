# Telegram Webhook Secret Token - Muammo va Yechim

## ❌ Muammo

Telegram Bot API webhook o'rnatishda quyidagi xatolik chiqadi:

```
ERROR [TelegramApiService] Telegram setWebhook failed: Bad Request: secret token
ERROR [CenterBotService] Failed to set webhook for bot X: Bad Request: secret token
```

## 🔍 Sabab

Telegram Bot API `secret_token` parametriga qat'iy talablar qo'yadi:

- **Uzunlik:** 1-256 belgi orasida
- **Ruxsat etilgan belgilar:** Faqat `A-Z`, `a-z`, `0-9`, `_` (underscore), `-` (hyphen)
- **Ruxsat etilmagan:** Bo'sh string `""`, `null`, yoki boshqa maxsus belgilar (`@`, `!`, `#`, `$`, va h.k.)

## ✅ Yechim

### 1. `.env` Faylini To'g'rilash

Serveringizda `.env` faylini tekshiring va `TELEGRAM_WEBHOOK_SECRET` qiymatini to'g'rilang:

```bash
# Serverga kirish
ssh your-server
cd /path/to/backend-nestjs

# .env faylini tahrirlash
nano .env
```

**❌ Noto'g'ri formatlar:**
```env
TELEGRAM_WEBHOOK_SECRET=""                           # Bo'sh
TELEGRAM_WEBHOOK_SECRET=abc                          # Juda qisqa
TELEGRAM_WEBHOOK_SECRET=secret@123!                  # Noto'g'ri belgilar
TELEGRAM_WEBHOOK_SECRET=my secret token              # Probel bor
```

**✅ To'g'ri format:**
```env
TELEGRAM_WEBHOOK_SECRET=secure_telegram_webhook_secret_2024_v1
```

### 2. Kod O'zgarishlari

Quyidagi o'zgarishlar qilindi:

#### `telegram-api.service.ts`
- ✅ Secret token validatsiyasi qo'shildi
- ✅ Invalid token bo'lsa xato beradi
- ✅ Faqat valid token yuboriladi

#### `center-bot.service.ts`
- ✅ `generateSecretToken()` method tuzatildi
- ✅ Endi to'g'ri formatda token yaratadi (A-Za-z0-9_-)
- ✅ Hex string o'rniga alphanumeric ishlatadi

### 3. Serverda Qo'llash

```bash
# 1. Yangi kodni serverga deploy qiling (git pull yoki scp)
git pull origin main

# 2. Dependencies o'rnatish (agar kerak bo'lsa)
yarn install

# 3. Build qilish
yarn build

# 4. .env faylini yangilash
nano .env
# TELEGRAM_WEBHOOK_SECRET ni to'g'ri formatda o'zgartiring

# 5. PM2'ni restart qilish
pm2 restart backend-nestjs

# 6. Log'larni tekshirish
pm2 logs backend-nestjs
```

### 4. Webhook'ni Qayta O'rnatish

Mavjud bot'lar uchun webhook'ni qayta o'rnatish kerak:

#### API orqali (Postman/cURL):

```bash
# JWT token oling
curl -X POST http://your-domain.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }'

# Webhook'ni reset qiling
curl -X POST http://your-domain.com/center-bots/BOT_ID/reset-webhook \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Yoki Database orqali:

```sql
-- PostgreSQL'da kirib, bot'ning secretToken'ini tekshiring
SELECT id, "botUsername", "secretToken", LENGTH("secretToken") as token_length
FROM "center_telegram_bots";

-- Agar noto'g'ri format bo'lsa, yangilash kerak
-- Lekin API orqali reset qilish yaxshiroq (yangi kod bilan)
```

### 5. Tekshirish

Webhook to'g'ri o'rnatilganligini tekshiring:

```bash
# API orqali tekshirish
curl -X GET http://your-domain.com/center-bots/BOT_ID/webhook-info \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Yoki to'g'ridan-to'g'ri Telegram API orqali
curl https://api.telegram.org/botYOUR_BOT_TOKEN/getWebhookInfo
```

Natija:
```json
{
  "ok": true,
  "result": {
    "url": "https://your-domain.com/telegram/webhook/bot/123/...",
    "has_custom_certificate": false,
    "pending_update_count": 0,
    "max_connections": 40
  }
}
```

## 📋 To'g'ri Secret Token Misollari

```env
# ✅ Yaxshi misol
TELEGRAM_WEBHOOK_SECRET=my_secure_webhook_token_2024
TELEGRAM_WEBHOOK_SECRET=SecureWebhookToken123_ABC-xyz
TELEGRAM_WEBHOOK_SECRET=bot_webhook_secret_v1_production
TELEGRAM_WEBHOOK_SECRET=aB3dEf7HiJkL9mN0pQrStUvWxYz_12345-ABCDE

# Uzunlik: 32-64 belgi optimal
# Faqat: A-Z, a-z, 0-9, _, -
```

## 🔐 Xavfsizlik Maslahatlari

1. **Unique Secret:** Har bir environment uchun alohida secret ishlatting
2. **Uzun Token:** Kamida 32 belgi ishlatting (64 optimal)
3. **Random Generation:** Random generator ishlatting:

```bash
# Linux/Mac da random token yaratish
python3 -c "import random, string; print(''.join(random.choices(string.ascii_letters + string.digits + '_-', k=64)))"

# yoki
openssl rand -base64 48 | tr '+/' '_-' | head -c 64
```

4. **Environment Variables:** Secret'larni hardcode qilmang, faqat .env'da saqlang
5. **Git'dan Saqlang:** .env faylini .gitignore'ga qo'shing

## 🎯 Natija

Ushbu o'zgarishlardan keyin:

- ✅ Telegram webhook muvaffaqiyatli o'rnatiladi
- ✅ `Bad Request: secret token` xatosi yo'qoladi
- ✅ Webhook requests xavfsiz verify qilinadi
- ✅ Yangi bot'lar to'g'ri secret token bilan yaratiladi

## 📞 Qo'shimcha Yordam

Agar muammo davom etsa:

1. PM2 log'larni tekshiring: `pm2 logs backend-nestjs --lines 100`
2. Database'da secret token'ni tekshiring
3. .env faylida probel yoki maxsus belgilar yo'qligini tekshiring
4. Serverda PORT'lar ochiqligini tekshiring (443 HTTPS uchun)

---

**Version:** 1.0  
**Sana:** 2024-11-20  
**Muammo Yechildi:** ✅

