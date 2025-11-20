# Soft Delete Implementation Guide

## 📋 Umumiy Ma'lumot

Barcha asosiy tablelarga **Soft Delete** qo'shildi. Bu ma'lumotlarni database'dan butunlay o'chirmasdan, faqat "o'chirilgan" deb belgilash imkonini beradi.

## 🎯 Nima Uchun Soft Delete?

### ✅ Advantages:
1. **Data Recovery** - Xatolikda o'chirilgan ma'lumotni qaytarish
2. **Audit Trail** - Kim, qachon o'chirganligi haqida ma'lumot
3. **Referential Integrity** - Boshqa jadvallar bilan bog'lanishlar buzilmaydi
4. **Analytics** - O'chirilgan ma'lumotlar tarixini tahlil qilish
5. **Legal Compliance** - Ba'zi qonunlar ma'lumotni saqlashni talab qiladi

### ❌ Disadvantages:
1. **Storage** - Ko'proq disk joy kerak
2. **Performance** - Query'larda `isDeleted = false` filter kerak
3. **Complexity** - Unique constraints muammosi (o'chirilgan + yangi)

## 🗄️ Schema Structure

### Barcha Tablelarda:

```prisma
model Example {
  id        String    @id @default(uuid())
  // ... other fields ...
  
  // Soft delete
  isDeleted Boolean   @default(false)
  deletedAt DateTime?
  
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  
  @@index([isDeleted])  // Performance optimization
}
```

### Qo'shilgan Jadvallar:

✅ **Center** - O'quv markazlar  
✅ **User** - Barcha foydalanuvchilar  
✅ **Role** - Rollar  
✅ **Permission** - Ruxsatlar  
✅ **TelegramUser** - Telegram foydalanuvchilari  
✅ **CenterTelegramBot** - Telegram botlar  
✅ **CenterPaymentCard** - To'lov kartalari  
✅ **Plan** - Tarif rejalar  
✅ **CenterSubscription** - Obunalar  

❌ **Junction Tables** (UserRole, RolePermission, RefreshToken) - Hard delete (kerak emas)

## 💻 Implementation

### 1. Service Layer - Soft Delete Method

```typescript
// Example: UserService
async softDelete(id: string) {
  const user = await this.prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    throw new NotFoundException('User not found');
  }

  if (user.isDeleted) {
    throw new BadRequestException('User already deleted');
  }

  return this.prisma.user.update({
    where: { id },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      isActive: false,  // Optional: deactivate too
    },
  });
}
```

### 2. Service Layer - Hard Delete Method

```typescript
async remove(id: string) {
  const user = await this.prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    throw new NotFoundException('User not found');
  }

  // Hard delete - butunlay o'chirish
  return this.prisma.user.delete({
    where: { id },
  });
}
```

### 3. Service Layer - Restore Method

```typescript
async restore(id: string) {
  const user = await this.prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    throw new NotFoundException('User not found');
  }

  if (!user.isDeleted) {
    throw new BadRequestException('User is not deleted');
  }

  return this.prisma.user.update({
    where: { id },
    data: {
      isDeleted: false,
      deletedAt: null,
      isActive: true,  // Optional: reactivate
    },
  });
}
```

### 4. Query Methods - Exclude Deleted

```typescript
// Find all (excluding deleted)
async findAll(centerId?: number) {
  const where: any = {
    isDeleted: false,  // ✅ Har doim qo'shing
  };

  if (centerId) {
    where.centerId = centerId;
  }

  return this.prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
}

// Find one (excluding deleted)
async findOne(id: string) {
  const user = await this.prisma.user.findUnique({
    where: { id },
  });

  if (!user || user.isDeleted) {
    throw new NotFoundException('User not found');
  }

  return user;
}
```

### 5. Query Methods - Include Deleted (Admin Only)

```typescript
async findAllWithDeleted(centerId?: number) {
  const where: any = {};

  if (centerId) {
    where.centerId = centerId;
  }

  // isDeleted filter yo'q - barcha recordlar
  return this.prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
}

async findDeleted(centerId?: number) {
  const where: any = {
    isDeleted: true,  // Faqat o'chirilganlar
  };

  if (centerId) {
    where.centerId = centerId;
  }

  return this.prisma.user.findMany({
    where,
    orderBy: { deletedAt: 'desc' },
  });
}
```

## 🎨 Controller Implementation

### Standard CRUD + Soft Delete

```typescript
@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  // GET /users - Active users only
  @Get()
  @RequirePermissions('user.read')
  findAll(@Query('centerId') centerId?: number) {
    return this.userService.findAll(centerId);
  }

  // GET /users/deleted - Deleted users (admin only)
  @Get('deleted')
  @RequirePermissions('user.manage')
  findDeleted(@Query('centerId') centerId?: number) {
    return this.userService.findDeleted(centerId);
  }

  // GET /users/:id
  @Get(':id')
  @RequirePermissions('user.read')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  // DELETE /users/:id/soft - Soft delete
  @Delete(':id/soft')
  @RequirePermissions('user.delete')
  @HttpCode(HttpStatus.OK)
  softDelete(@Param('id') id: string) {
    return this.userService.softDelete(id);
  }

  // POST /users/:id/restore - Restore deleted
  @Post(':id/restore')
  @RequirePermissions('user.manage')
  @HttpCode(HttpStatus.OK)
  restore(@Param('id') id: string) {
    return this.userService.restore(id);
  }

  // DELETE /users/:id - Hard delete (admin only)
  @Delete(':id')
  @RequirePermissions('user.manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
```

## 🔍 API Examples

### 1. Soft Delete User

```bash
DELETE /api/v1/users/{user-id}/soft
Authorization: Bearer {token}

# Response:
{
  "id": "user-id",
  "email": "john@example.com",
  "isDeleted": true,
  "deletedAt": "2024-11-17T12:00:00Z",
  "isActive": false
}
```

### 2. Get Active Users (Default)

```bash
GET /api/v1/users
Authorization: Bearer {token}

# Response: Only active users (isDeleted = false)
[
  {
    "id": "user-1",
    "email": "active@example.com",
    "isDeleted": false
  }
]
```

### 3. Get Deleted Users (Admin)

```bash
GET /api/v1/users/deleted
Authorization: Bearer {token}

# Response: Only deleted users (isDeleted = true)
[
  {
    "id": "user-2",
    "email": "deleted@example.com",
    "isDeleted": true,
    "deletedAt": "2024-11-17T12:00:00Z"
  }
]
```

### 4. Restore Deleted User

```bash
POST /api/v1/users/{user-id}/restore
Authorization: Bearer {token}

# Response:
{
  "id": "user-id",
  "email": "john@example.com",
  "isDeleted": false,
  "deletedAt": null,
  "isActive": true
}
```

### 5. Hard Delete (Permanent)

```bash
DELETE /api/v1/users/{user-id}
Authorization: Bearer {token}

# Response: 204 No Content
# User butunlay database'dan o'chirildi
```

## 🎯 Best Practices

### 1. Always Filter by isDeleted

```typescript
// ✅ Good
const users = await prisma.user.findMany({
  where: {
    isDeleted: false,
    centerId: 'center-id',
  },
});

// ❌ Bad - o'chirilganlar ham qaytadi
const users = await prisma.user.findMany({
  where: {
    centerId: 'center-id',
  },
});
```

### 2. Unique Constraints with Soft Delete

```typescript
// Problem: Email unique, lekin soft delete qilingan user bilan conflict
// Solution: Conditional unique constraint

// Option 1: Delete email when soft deleting
async softDelete(id: string) {
  return this.prisma.user.update({
    where: { id },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      email: null,  // Remove email
    },
  });
}

// Option 2: Add suffix to email
async softDelete(id: string) {
  const user = await this.prisma.user.findUnique({ where: { id } });
  
  return this.prisma.user.update({
    where: { id },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      email: `${user.email}_deleted_${Date.now()}`,
    },
  });
}
```

### 3. Cascade Soft Delete

```typescript
// Center o'chirilganda uning barcha foydalanuvchilarini ham o'chirish
async softDelete(centerId: number) {
  // Soft delete center
  await this.prisma.center.update({
    where: { id: centerId },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
    },
  });

  // Soft delete all users in this center
  await this.prisma.user.updateMany({
    where: { centerId },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
    },
  });
}
```

### 4. Middleware for Auto-filtering

```typescript
// Prisma middleware - avtomatik isDeleted filter
prisma.$use(async (params, next) => {
  // Faqat read operatsiyalar uchun
  if (params.action === 'findMany' || params.action === 'findFirst') {
    if (!params.args) {
      params.args = {};
    }
    if (!params.args.where) {
      params.args.where = {};
    }
    
    // isDeleted = false qo'shish (agar mavjud bo'lmasa)
    if (params.args.where.isDeleted === undefined) {
      params.args.where.isDeleted = false;
    }
  }

  return next(params);
});
```

## 📊 Database Queries

### Count Active vs Deleted

```typescript
const stats = await prisma.user.groupBy({
  by: ['isDeleted'],
  _count: true,
});

// Result:
// [
//   { isDeleted: false, _count: 150 },  // Active
//   { isDeleted: true, _count: 25 }     // Deleted
// ]
```

### Recently Deleted

```typescript
const recentlyDeleted = await prisma.user.findMany({
  where: {
    isDeleted: true,
    deletedAt: {
      gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
    },
  },
  orderBy: { deletedAt: 'desc' },
});
```

### Auto-purge Old Deleted Records (Optional)

```typescript
// Cron job: 30 kundan eski o'chirilgan recordlarni hard delete qilish
async purgeOldDeleted() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const result = await prisma.user.deleteMany({
    where: {
      isDeleted: true,
      deletedAt: {
        lte: thirtyDaysAgo,
      },
    },
  });

  console.log(`Purged ${result.count} old deleted users`);
}
```

## 🔧 Migration

```bash
# Prisma client generatsiya
npx prisma generate

# Migration yaratish
npx prisma migrate dev --name add_soft_delete

# Migration'ni production'da ishga tushirish
npx prisma migrate deploy
```

## ⚠️ Important Notes

### 1. Foreign Key Constraints

Agar `onDelete: Cascade` bo'lsa, parent o'chirilganda child'lar avtomatik hard delete bo'ladi. Soft delete uchun:

```prisma
model User {
  centerId String
  center   Center @relation(fields: [centerId], references: [id], onDelete: NoAction)
}
```

### 2. Performance

`isDeleted` ga index qo'shilgan, lekin ko'p o'chirilgan recordlar bo'lsa performance muammosi bo'lishi mumkin. Solution:
- Partition by `isDeleted`
- Archive old deleted records to separate table

### 3. GDPR Compliance

Ba'zi hollarda ma'lumotni **hard delete** qilish shart (GDPR right to be forgotten). Bunday holda:
- Soft delete → temporary
- Hard delete → permanent (user request)

## ✅ Summary

- ✅ **8 ta table** ga soft delete qo'shildi
- ✅ **isDeleted** + **deletedAt** fields
- ✅ **Index** on isDeleted (performance)
- ✅ **Service methods**: softDelete, restore, remove
- ✅ **Controller endpoints**: DELETE /soft, POST /restore
- ✅ **Query filtering**: isDeleted = false by default

Endi barcha asosiy operatsiyalarda soft delete qo'llab-quvvatlanadi! 🚀

