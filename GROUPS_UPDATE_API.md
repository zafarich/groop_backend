# Groups Update API - Frontend Documentation

## Endpoint

```
PATCH /api/v1/groups/:id
```

## Authentication

Required: `Bearer Token` in Authorization header

## Request Body

Barcha maydonlar **ixtiyoriy** (partial update). Faqat o'zgartirmoqchi bo'lgan maydonlarni yuboring.

```typescript
{
  name?: string;                    // Guruh nomi
  description?: string;             // Guruh tavsifi
  monthlyPrice?: number;            // Oylik to'lov (0 yoki musbat son)
  courseStartDate?: string;         // Kurs boshlanish sanasi (YYYY-MM-DD)
  courseEndDate?: string;           // Kurs tugash sanasi (YYYY-MM-DD)
  paymentType?: "MONTHLY_SAME_DATE" | "START_TO_END_OF_MONTH" | "LESSON_BASED";
  lessonsPerPaymentPeriod?: number; // Faqat LESSON_BASED uchun kerak (minimum 1)
}
```

## Validation Rules

- `monthlyPrice`: 0 yoki musbat son bo'lishi kerak
- `courseStartDate`: `courseEndDate` dan oldin bo'lishi kerak
- `paymentType`: Faqat 3 ta qiymatdan biri
- `lessonsPerPaymentPeriod`:
  - Faqat `paymentType === "LESSON_BASED"` bo'lganda **majburiy**
  - Minimum 1 bo'lishi kerak
  - Boshqa payment type larda yuborilmasligi kerak

## Important Limitations

❌ **Quyidagilarni bu endpoint orqali o'zgartirib bo'lmaydi:**

- Teachers (O'qituvchilar)
- Lesson Schedules (Dars jadvali)
- Discounts (Chegirmalar)

Bu ma'lumotlarni o'zgartirish uchun alohida endpointlar ishlatiladi.

## Example Request

```bash
curl -X PATCH http://localhost:3000/api/v1/groups/15 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Advanced NodeJS Backend Course",
    "description": "Updated course description",
    "monthlyPrice": 1500000,
    "courseStartDate": "2024-01-20",
    "courseEndDate": "2024-05-20",
    "paymentType": "START_TO_END_OF_MONTH"
  }'
```

## Success Response

```json
{
  "success": true,
  "code": 0,
  "data": {
    "id": 15,
    "centerId": 1,
    "name": "Advanced NodeJS Backend Course",
    "description": "Updated course description",
    "monthlyPrice": "1500000.00",
    "courseStartDate": "2024-01-20T00:00:00.000Z",
    "courseEndDate": "2024-05-20T00:00:00.000Z",
    "paymentType": "START_TO_END_OF_MONTH",
    "lessonsPerPaymentPeriod": null,
    "joinLink": "https://t.me/+AbCdEfGhIjKlMnOp",
    "telegramGroupId": "-100123456789",
    "connectToken": null,
    "connectTokenExpires": null,
    "status": "ACTIVE",
    "isActive": true,
    "isDeleted": false,
    "deletedAt": null,
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-16T14:30:00.000Z"
  },
  "message": "Group updated successfully"
}
```

## Error Responses

### 400 Bad Request (Validation Error)

```json
{
  "statusCode": 400,
  "message": [
    "monthlyPrice must be a positive number",
    "courseEndDate must be after courseStartDate",
    "lessonsPerPaymentPeriod is required for LESSON_BASED payment type"
  ],
  "error": "Bad Request"
}
```

### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "Group not found",
  "error": "Not Found"
}
```

### 403 Forbidden (Wrong Center)

```json
{
  "statusCode": 403,
  "message": "Access denied: Resource does not belong to your center",
  "error": "Forbidden"
}
```

## Frontend Integration Example (Vue/Nuxt)

### Composable

```typescript
// composables/useGroups.ts
export const useGroups = () => {
  const config = useRuntimeConfig();
  const { token } = useAuth(); // Your auth composable

  const updateGroup = async (
    groupId: number,
    data: Partial<UpdateGroupDto>,
  ) => {
    // Remove lessonsPerPaymentPeriod if not LESSON_BASED
    const payload = { ...data };
    if (payload.paymentType !== 'LESSON_BASED') {
      delete payload.lessonsPerPaymentPeriod;
    }

    return await $fetch(`${config.public.apiBase}/groups/${groupId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token.value}`,
      },
      body: payload,
    });
  };

  return { updateGroup };
};
```

### Edit Page Component

```vue
<script setup lang="ts">
const route = useRoute();
const router = useRouter();
const { updateGroup } = useGroups();

const groupId = Number(route.params.id);

// Form state
const form = ref({
  name: '',
  description: '',
  monthlyPrice: 0,
  courseStartDate: '',
  courseEndDate: '',
  paymentType: 'MONTHLY_SAME_DATE' as const,
  lessonsPerPaymentPeriod: null as number | null,
});

const loading = ref(false);
const errors = ref<string[]>([]);

// Load existing data
const { data: group } = await useFetch(`/api/v1/groups/${groupId}`);
if (group.value?.data) {
  const g = group.value.data;
  form.value = {
    name: g.name,
    description: g.description || '',
    monthlyPrice: Number(g.monthlyPrice),
    courseStartDate: g.courseStartDate.split('T')[0],
    courseEndDate: g.courseEndDate.split('T')[0],
    paymentType: g.paymentType,
    lessonsPerPaymentPeriod: g.lessonsPerPaymentPeriod,
  };
}

// Computed: Show lessons field only for LESSON_BASED
const showLessonsField = computed(
  () => form.value.paymentType === 'LESSON_BASED',
);

// Submit handler
const handleSubmit = async () => {
  loading.value = true;
  errors.value = [];

  try {
    const result = await updateGroup(groupId, form.value);

    if (result.success) {
      // Success notification
      useToast().success('Guruh muvaffaqiyatli yangilandi');
      router.push('/groups');
    }
  } catch (error: any) {
    // Handle validation errors
    if (error.data?.message) {
      errors.value = Array.isArray(error.data.message)
        ? error.data.message
        : [error.data.message];
    } else {
      errors.value = ['Xatolik yuz berdi'];
    }
  } finally {
    loading.value = false;
  }
};

// Watch payment type changes
watch(
  () => form.value.paymentType,
  (newType) => {
    if (newType !== 'LESSON_BASED') {
      form.value.lessonsPerPaymentPeriod = null;
    }
  },
);
</script>

<template>
  <div class="edit-group-page">
    <h1>Guruhni tahrirlash</h1>

    <!-- Error messages -->
    <div v-if="errors.length" class="errors">
      <p v-for="error in errors" :key="error">{{ error }}</p>
    </div>

    <form @submit.prevent="handleSubmit">
      <!-- Name -->
      <div class="form-group">
        <label>Guruh nomi *</label>
        <input v-model="form.name" type="text" required />
      </div>

      <!-- Description -->
      <div class="form-group">
        <label>Tavsif</label>
        <textarea v-model="form.description" rows="3"></textarea>
      </div>

      <!-- Monthly Price -->
      <div class="form-group">
        <label>Oylik to'lov (UZS) *</label>
        <input
          v-model.number="form.monthlyPrice"
          type="number"
          min="0"
          required
        />
      </div>

      <!-- Course Dates -->
      <div class="form-row">
        <div class="form-group">
          <label>Boshlanish sanasi *</label>
          <input v-model="form.courseStartDate" type="date" required />
        </div>
        <div class="form-group">
          <label>Tugash sanasi *</label>
          <input v-model="form.courseEndDate" type="date" required />
        </div>
      </div>

      <!-- Payment Type -->
      <div class="form-group">
        <label>To'lov turi *</label>
        <select v-model="form.paymentType" required>
          <option value="MONTHLY_SAME_DATE">Oyma-oy (bir xil sana)</option>
          <option value="START_TO_END_OF_MONTH">Oy boshidan oxirigacha</option>
          <option value="LESSON_BASED">Darslar soni asosida</option>
        </select>
      </div>

      <!-- Lessons Per Period (conditional) -->
      <div v-if="showLessonsField" class="form-group">
        <label>Bir davrdagi darslar soni *</label>
        <input
          v-model.number="form.lessonsPerPaymentPeriod"
          type="number"
          min="1"
          :required="showLessonsField"
        />
      </div>

      <!-- Submit -->
      <div class="form-actions">
        <button type="button" @click="router.back()">Bekor qilish</button>
        <button type="submit" :disabled="loading">
          {{ loading ? 'Saqlanmoqda...' : 'Saqlash' }}
        </button>
      </div>
    </form>
  </div>
</template>
```

## TypeScript Types

```typescript
// types/group.ts
export type PaymentType =
  | 'MONTHLY_SAME_DATE'
  | 'START_TO_END_OF_MONTH'
  | 'LESSON_BASED';

export interface UpdateGroupDto {
  name?: string;
  description?: string;
  monthlyPrice?: number;
  courseStartDate?: string;
  courseEndDate?: string;
  paymentType?: PaymentType;
  lessonsPerPaymentPeriod?: number;
}

export interface Group {
  id: number;
  centerId: number;
  name: string;
  description: string | null;
  monthlyPrice: string;
  courseStartDate: string;
  courseEndDate: string;
  paymentType: PaymentType;
  lessonsPerPaymentPeriod: number | null;
  joinLink: string | null;
  telegramGroupId: string | null;
  connectToken: string | null;
  connectTokenExpires: string | null;
  status: 'PENDING' | 'ACTIVE' | 'INACTIVE';
  isActive: boolean;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
```

## Testing Checklist

- [ ] Guruh nomini o'zgartirish
- [ ] Oylik to'lovni o'zgartirish
- [ ] Kurs sanalarini o'zgartirish
- [ ] Payment type ni o'zgartirish
- [ ] LESSON_BASED ga o'zganda lessonsPerPaymentPeriod ni to'ldirish
- [ ] Boshqa payment type ga o'zganda lessonsPerPaymentPeriod ni o'chirish
- [ ] Validation xatolarini ko'rsatish
- [ ] Muvaffaqiyatli yangilanishdan keyin redirect
- [ ] Loading state ni ko'rsatish
