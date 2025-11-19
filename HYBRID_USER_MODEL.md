# Hybrid User Model - User va TelegramUser Integration

## 📋 Umumiy Ma'lumot

Tizimda **Hybrid Approach** implement qilindi. User va TelegramUser modellari alohida, lekin bir-biriga bog'langan.

## 🎯 Maqsad

- **Admins/Teachers**: Email + Password bilan kirish
- **Students (Telegram)**: Telegram orqali automatic registration
- **Students (Web)**: Email + Password bilan kirish
- **Students (Both)**: Telegram ↔ User linking

## 🗄️ Database Schema

### User Model (Asosiy Entity)

```prisma
model User {
  id            String    @id @default(uuid())
  email         String?   @unique      // Optional for Telegram-only
  username      String?   @unique
  password      String?                // Optional for Telegram-only
  firstName     String?
  lastName      String?
  phoneNumber   String?
  
  // User type
  userType      UserType  @default(STUDENT)  // ADMIN, TEACHER, STUDENT
  authProvider  String    @default("local")  // local, telegram, google
  
  // Status
  isActive      Boolean   @default(true)
  emailVerified Boolean   @default(false)
  
  // Multi-tenant
  centerId      String
  
  // Telegram link (optional)
  telegramUserId String?   @unique
  
  // Relations
  center         Center
  telegramUser   TelegramUser?  // 1:1 relation
  userRoles      UserRole[]
  refreshTokens  RefreshToken[]
}

enum UserType {
  ADMIN      // System admin
  TEACHER    // O'qituvchi
  STUDENT    // O'quvchi
  PARENT     // Ota-ona
}
```

### TelegramUser Model (Telegram-specific Data)

```prisma
model TelegramUser {
  id           String   @id @default(uuid())
  telegramId   String   @unique    // Telegram user ID (globally unique)
  centerId     String?
  
  // Telegram fields
  username     String?
  firstName    String?
  lastName     String?
  chatId       String?
  phoneNumber  String?
  languageCode String?
  isBot        Boolean  @default(false)
  
  // Status
  isActive     Boolean  @default(true)
  status       String?  @default("active")
  metadata     Json?
  
  // Relation
  user         User?    // Link to main User entity
}
```

## 🔄 Use Cases

### Case 1: Student Telegram Orqali Ro'yxatdan O'tadi

```
1. O'quvchi /start yuboradi
   ↓
2. TelegramUser yaratiladi (globally unique by telegramId)
   ↓
3. User yaratiladi:
   - userType: STUDENT
   - authProvider: telegram
   - telegramUserId: <telegram_user_id>
   - email: null
   - password: null
   ↓
4. Link: TelegramUser ↔ User
```

**Code:**
```typescript
// TelegramService.handleMessage()
const telegramUser = await prisma.telegramUser.create({
  data: {
    telegramId: message.from.id,
    username: message.from.username,
    firstName: message.from.first_name,
    centerId: bot.centerId,
  },
});

const linkedUser = await prisma.user.create({
  data: {
    firstName: telegramUser.firstName,
    username: telegramUser.username,
    centerId: bot.centerId,
    userType: 'STUDENT',
    authProvider: 'telegram',
    telegramUserId: telegramUser.id,
    // email va password yo'q
  },
});
```

### Case 2: Student Web Orqali Ro'yxatdan O'tadi

```
1. Registration form:
   - email: john@example.com
   - password: ****
   ↓
2. User yaratiladi:
   - email: john@example.com
   - password: hashed
   - userType: STUDENT
   - authProvider: local
   - telegramUserId: null
```

**Code:**
```typescript
const user = await prisma.user.create({
  data: {
    email: 'john@example.com',
    password: await bcrypt.hash('password', 10),
    userType: 'STUDENT',
    authProvider: 'local',
    centerId: 'center-id',
  },
});
```

### Case 3: Telegram Student Keyinchalik Web'ga Kirmoqchi

```
1. User allaqachon mavjud (Telegram orqali yaratilgan)
   ↓
2. "Set Password" feature:
   - User email va password qo'shadi
   ↓
3. Update User:
   - email: john@example.com
   - password: hashed
   - authProvider: "telegram,local"
   ↓
4. Endi ikkalasidan ham kira oladi:
   - Telegram bot: /start
   - Web: email + password
```

**Code:**
```typescript
// Update existing Telegram user with email/password
await prisma.user.update({
  where: { id: user.id },
  data: {
    email: 'john@example.com',
    password: await bcrypt.hash('newPassword', 10),
    emailVerified: true,
    authProvider: 'telegram,local',
  },
});
```

### Case 4: Web Student Telegram'ni Ulaydi

```
1. User allaqachon mavjud (Web orqali yaratilgan)
   ↓
2. Telegram bot'ga /start yuboradi
   ↓
3. TelegramUser yaratiladi
   ↓
4. Link qilish (manual or automatic):
   - Admin: "Link to existing user"
   - Auto: phoneNumber, email match
   ↓
5. Update User:
   - telegramUserId: <telegram_user_id>
```

**Code:**
```typescript
// Create TelegramUser
const telegramUser = await prisma.telegramUser.create({...});

// Link to existing User
await prisma.user.update({
  where: { id: existingUser.id },
  data: { telegramUserId: telegramUser.id },
});
```

## 🔍 Query Examples

### Get Student with Telegram Info

```typescript
const student = await prisma.user.findUnique({
  where: { id: 'student-id' },
  include: {
    telegramUser: true,  // Telegram ma'lumotlari
    center: true,
    userRoles: {
      include: { role: true },
    },
  },
});

// student.email → Web login
// student.telegramUser?.telegramId → Telegram ID
// student.telegramUser?.chatId → Send messages
```

### Get All Students (Both Web and Telegram)

```typescript
const students = await prisma.user.findMany({
  where: {
    centerId: 'center-id',
    userType: 'STUDENT',
  },
  include: {
    telegramUser: true,  // null agar faqat web
  },
});

// students[0].telegramUser !== null → Telegram bilan bog'langan
// students[0].email !== null → Web access mavjud
```

### Get Telegram Users Without Linked Account

```typescript
const unlinkedTelegramUsers = await prisma.telegramUser.findMany({
  where: {
    user: null,  // Hali User'ga link qilinmagan
    centerId: 'center-id',
  },
});
```

## 🔐 Authentication

### Web Login (Email + Password)

```typescript
// AuthService.login()
const user = await prisma.user.findUnique({
  where: { email: loginDto.email },
});

// Check password exists
if (!user.password) {
  throw new UnauthorizedException(
    'This account was created via Telegram. Please use Telegram or set a password first.'
  );
}

// Verify password
const isValid = await bcrypt.compare(password, user.password);
```

### Telegram Login (Auto)

```typescript
// TelegramService.handleWebhook()
// Automatic authentication - no password needed
const telegramUser = await prisma.telegramUser.findUnique({
  where: { telegramId: message.from.id },
  include: { user: true },
});

// telegramUser.user → Full user entity
```

## 📊 User Type Hierarchy

```
ADMIN
  ├── Center management
  ├── User management
  └── Full system access

TEACHER
  ├── Course management
  ├── Student management
  └── Center-level access

STUDENT
  ├── Course enrollment
  ├── Payment
  └── Personal profile

PARENT (future)
  ├── View student progress
  └── Payment
```

## 🎨 Frontend Integration

### Check User Type

```typescript
// Get current user
const user = await api.get('/auth/me');

if (user.userType === 'STUDENT') {
  // Show student dashboard
} else if (user.userType === 'TEACHER') {
  // Show teacher dashboard
} else if (user.userType === 'ADMIN') {
  // Show admin panel
}
```

### Check Authentication Method

```typescript
const user = await api.get('/auth/me');

// Check if Telegram linked
if (user.telegramUser) {
  console.log('Telegram linked:', user.telegramUser.username);
  // Show "Send message via Telegram" button
}

// Check if email/password available
if (user.email && user.password) {
  console.log('Web login available');
  // Show "Change password" option
} else {
  // Show "Set password for web access"
}
```

## 🔄 Migration from Old Schema

```sql
-- Add new columns to users table
ALTER TABLE users ADD COLUMN user_type VARCHAR(20) DEFAULT 'STUDENT';
ALTER TABLE users ADD COLUMN auth_provider VARCHAR(50) DEFAULT 'local';
ALTER TABLE users ADD COLUMN telegram_user_id UUID UNIQUE;

-- Make email and password nullable
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE users ALTER COLUMN password DROP NOT NULL;

-- Remove compound unique constraint from telegram_users
ALTER TABLE telegram_users DROP CONSTRAINT telegram_users_telegram_id_center_id_key;

-- Add unique constraint on telegramId only
ALTER TABLE telegram_users ADD CONSTRAINT telegram_users_telegram_id_key UNIQUE (telegram_id);
```

## ✅ Benefits of Hybrid Approach

### 1. **Flexibility**
- Support multiple auth methods
- Easy to add new providers (Google, Facebook)

### 2. **Clean Separation**
- Telegram-specific logic in TelegramUser
- Business logic in User

### 3. **Future-proof**
- WhatsApp integration? → WhatsAppUser + link
- Instagram bot? → InstagramUser + link

### 4. **Data Integrity**
- User always has centerId (required)
- TelegramUser can exist without centerId (optional)

### 5. **Query Efficiency**
- Include telegramUser only when needed
- Avoid nullable fields in User table

## 🚀 Next Steps

1. ✅ **Database migration** - `npx prisma migrate dev --name hybrid_user_model`
2. ✅ **Service updates** - TelegramService, UserService, AuthService
3. ✅ **DTO updates** - CreateUserDto, CreateTelegramUserDto
4. ⏳ **Link existing users** - Manual or automatic matching
5. ⏳ **Frontend updates** - Handle multiple auth methods
6. ⏳ **Add "Set Password" feature** - For Telegram-only users

---

**Eslatma:** Barcha o'zgarishlar backward-compatible. Eski User'lar hali ham ishlaydi (email + password). Yangi Telegram users automatic link qilinadi.

