# Student Custom Discount API - Frontend Documentation

## Overview

Bu API orqali guruhdagi alohida o'quvchiga maxsus narx (chegirma) belgilash mumkin. O'quvchi uchun guruh narxidan farqli narx o'rnatiladi.

## Endpoint

```
PATCH /api/v1/enrollments/:enrollmentId/discount
```

## Authentication

Required: `Bearer Token` in Authorization header

## Use Cases

1. **Chegirma berish**: O'quvchiga guruh narxidan arzonroq narx berish
2. **Qo'shimcha to'lov**: Maxsus xizmatlar uchun qo'shimcha to'lov
3. **Bepul o'qitish**: `customMonthlyPrice: 0` - to'liq bepul
4. **Vaqtinchalik chegirma**: Muayyan muddat uchun chegirma

## Request Body

```typescript
{
  customMonthlyPrice: number;      // O'quvchi to'laydigan oylik narx (0 = bepul)
  discountStartDate?: string;      // Chegirma boshlanish sanasi (YYYY-MM-DD)
  discountEndDate?: string;        // Chegirma tugash sanasi (YYYY-MM-DD)
  discountReason?: string;         // Chegirma sababi (admin uchun eslatma)
}
```

### Field Details

| Field                | Type   | Required | Description                                                          |
| -------------------- | ------ | -------- | -------------------------------------------------------------------- |
| `customMonthlyPrice` | number | ✅ Yes   | O'quvchi to'laydigan oylik narx. 0 = bepul, musbat son = maxsus narx |
| `discountStartDate`  | string | ❌ No    | Chegirma qachon boshlanadi (default: hozir)                          |
| `discountEndDate`    | string | ❌ No    | Chegirma qachon tugaydi (default: cheksiz)                           |
| `discountReason`     | string | ❌ No    | Chegirma sababi (masalan: "Ota-onasi o'qituvchi")                    |

## Validation Rules

- ✅ `customMonthlyPrice`: 0 yoki musbat son bo'lishi kerak
- ✅ `discountStartDate` va `discountEndDate` YYYY-MM-DD formatida
- ✅ Agar `customMonthlyPrice = 0` bo'lsa, o'quvchi avtomatik ACTIVE statusga o'tadi

## Example Requests

### 1. 50% Chegirma Berish

Guruh narxi: 1,200,000 so'm → O'quvchi to'laydi: 600,000 so'm

```bash
curl -X PATCH http://localhost:3000/api/v1/enrollments/25/discount \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customMonthlyPrice": 600000,
    "discountReason": "Ota-onasi o'\''qituvchi"
  }'
```

### 2. Vaqtinchalik Chegirma (3 oy)

```bash
curl -X PATCH http://localhost:3000/api/v1/enrollments/25/discount \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customMonthlyPrice": 800000,
    "discountStartDate": "2024-01-15",
    "discountEndDate": "2024-04-15",
    "discountReason": "Birinchi 3 oy uchun chegirma"
  }'
```

### 3. Bepul O'qitish

```bash
curl -X PATCH http://localhost:3000/api/v1/enrollments/25/discount \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customMonthlyPrice": 0,
    "discountReason": "Nafaqadagi oila a'\''zosi"
  }'
```

### 4. Chegirmani Bekor Qilish

Guruh narxiga qaytarish uchun guruh narxini yuboring:

```bash
curl -X PATCH http://localhost:3000/api/v1/enrollments/25/discount \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customMonthlyPrice": 1200000
  }'
```

## Success Response

```json
{
  "success": true,
  "code": 0,
  "data": {
    "id": 25,
    "groupId": 15,
    "studentId": 10,
    "status": "ACTIVE",
    "customMonthlyPrice": "600000.00",
    "discountStartDate": "2024-01-15T00:00:00.000Z",
    "discountEndDate": "2024-04-15T00:00:00.000Z",
    "discountReason": "Ota-onasi o'qituvchi",
    "isFreeEnrollment": false,
    "perLessonPrice": "150000.00",
    "baseLessonPrice": "300000.00",
    "balance": "0.00",
    "group": {
      "id": 15,
      "name": "NodeJS Backend Course",
      "monthlyPrice": "1200000.00"
    },
    "student": {
      "id": 10,
      "firstName": "Ali",
      "lastName": "Valiyev",
      "user": {
        "id": 20,
        "firstName": "Ali",
        "lastName": "Valiyev",
        "phoneNumber": "+998901234567",
        "telegramUserId": 5
      }
    }
  },
  "message": "Custom price assigned successfully",
  "shouldNotifyStudent": true,
  "isFreeEnrollment": false,
  "balanceInfo": {
    "oldLessonPrice": 300000,
    "newLessonPrice": 150000,
    "priceDifference": 150000,
    "currentBalance": 0,
    "message": "Discount applied. Lesson price reduced from 300000 to 150000. Student's existing balance (0) remains valid and will cover more lessons."
  }
}
```

### Response Fields Explanation

| Field                 | Description                                                             |
| --------------------- | ----------------------------------------------------------------------- |
| `customMonthlyPrice`  | O'quvchi uchun belgilangan oylik narx                                   |
| `perLessonPrice`      | Yangi dars narxi (chegirma qo'llanilgandan keyin)                       |
| `baseLessonPrice`     | Guruhning asl dars narxi                                                |
| `isFreeEnrollment`    | `true` agar `customMonthlyPrice = 0`                                    |
| `balanceInfo`         | Mavjud balansga ta'sir haqida ma'lumot (faqat ACTIVE o'quvchilar uchun) |
| `shouldNotifyStudent` | `true` - o'quvchiga Telegram orqali xabar yuboriladi                    |

## Error Responses

### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": ["customMonthlyPrice must be a positive number"],
  "error": "Bad Request"
}
```

### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "Enrollment not found",
  "error": "Not Found"
}
```

## Frontend Integration Example (Vue/Nuxt)

### Composable

```typescript
// composables/useEnrollments.ts
export const useEnrollments = () => {
  const config = useRuntimeConfig();
  const { token } = useAuth();

  const assignDiscount = async (
    enrollmentId: number,
    discount: AssignDiscountDto,
  ) => {
    return await $fetch(
      `${config.public.apiBase}/enrollments/${enrollmentId}/discount`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token.value}` },
        body: discount,
      },
    );
  };

  return { assignDiscount };
};
```

### Discount Modal Component

```vue
<script setup lang="ts">
const props = defineProps<{
  enrollment: Enrollment;
  groupPrice: number;
}>();

const emit = defineEmits<{
  close: [];
  saved: [];
}>();

const { assignDiscount } = useEnrollments();

// Form state
const form = ref({
  customMonthlyPrice: props.groupPrice,
  discountStartDate: '',
  discountEndDate: '',
  discountReason: '',
});

// Initialize with current values if exists
if (props.enrollment.customMonthlyPrice) {
  form.value.customMonthlyPrice = Number(props.enrollment.customMonthlyPrice);
  form.value.discountStartDate =
    props.enrollment.discountStartDate?.split('T')[0] || '';
  form.value.discountEndDate =
    props.enrollment.discountEndDate?.split('T')[0] || '';
  form.value.discountReason = props.enrollment.discountReason || '';
}

// Computed
const discountPercentage = computed(() => {
  if (form.value.customMonthlyPrice === 0) return 100;
  const discount = props.groupPrice - form.value.customMonthlyPrice;
  return Math.round((discount / props.groupPrice) * 100);
});

const discountAmount = computed(() => {
  return props.groupPrice - form.value.customMonthlyPrice;
});

const isFree = computed(() => form.value.customMonthlyPrice === 0);

// Save
const loading = ref(false);
const save = async () => {
  loading.value = true;
  try {
    const payload: any = {
      customMonthlyPrice: form.value.customMonthlyPrice,
    };

    if (form.value.discountStartDate) {
      payload.discountStartDate = form.value.discountStartDate;
    }
    if (form.value.discountEndDate) {
      payload.discountEndDate = form.value.discountEndDate;
    }
    if (form.value.discountReason) {
      payload.discountReason = form.value.discountReason;
    }

    await assignDiscount(props.enrollment.id, payload);

    useToast().success('Chegirma muvaffaqiyatli belgilandi');
    emit('saved');
    emit('close');
  } catch (error: any) {
    useToast().error(error.data?.message || 'Xatolik yuz berdi');
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="discount-modal">
    <div class="modal-header">
      <h3>Maxsus narx belgilash</h3>
      <button @click="emit('close')">×</button>
    </div>

    <div class="modal-body">
      <!-- Student Info -->
      <div class="student-info">
        <p>
          <strong>O'quvchi:</strong> {{ enrollment.student.firstName }}
          {{ enrollment.student.lastName }}
        </p>
        <p>
          <strong>Guruh narxi:</strong>
          {{ groupPrice.toLocaleString() }} so'm/oy
        </p>
      </div>

      <!-- Custom Price -->
      <div class="form-group">
        <label>Maxsus oylik narx *</label>
        <input
          v-model.number="form.customMonthlyPrice"
          type="number"
          min="0"
          :max="groupPrice * 2"
          required
        />

        <!-- Discount Info -->
        <div v-if="discountAmount !== 0" class="discount-info">
          <span v-if="discountAmount > 0" class="discount-positive">
            ✅ Chegirma: {{ discountAmount.toLocaleString() }} so'm ({{
              discountPercentage
            }}%)
          </span>
          <span v-else class="discount-negative">
            ⚠️ Qo'shimcha: {{ Math.abs(discountAmount).toLocaleString() }} so'm
          </span>
        </div>

        <div v-if="isFree" class="free-badge">🎁 Bepul o'qitish</div>
      </div>

      <!-- Date Range -->
      <div class="form-row">
        <div class="form-group">
          <label>Boshlanish sanasi</label>
          <input v-model="form.discountStartDate" type="date" />
          <small>Bo'sh qoldiring = hozirdan boshlanadi</small>
        </div>
        <div class="form-group">
          <label>Tugash sanasi</label>
          <input v-model="form.discountEndDate" type="date" />
          <small>Bo'sh qoldiring = cheksiz</small>
        </div>
      </div>

      <!-- Reason -->
      <div class="form-group">
        <label>Sabab</label>
        <textarea
          v-model="form.discountReason"
          rows="3"
          placeholder="Masalan: Ota-onasi o'qituvchi, Nafaqadagi oila a'zosi"
        ></textarea>
      </div>
    </div>

    <div class="modal-footer">
      <button type="button" @click="emit('close')">Bekor qilish</button>
      <button type="button" @click="save" :disabled="loading">
        {{ loading ? 'Saqlanmoqda...' : 'Saqlash' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.discount-info {
  margin-top: 8px;
  padding: 8px;
  border-radius: 4px;
}

.discount-positive {
  color: green;
  font-weight: bold;
}

.discount-negative {
  color: orange;
  font-weight: bold;
}

.free-badge {
  margin-top: 8px;
  padding: 8px;
  background: #e8f5e9;
  color: #2e7d32;
  border-radius: 4px;
  font-weight: bold;
}
</style>
```

### Usage in Students List

```vue
<script setup lang="ts">
const showDiscountModal = ref(false);
const selectedEnrollment = ref<Enrollment | null>(null);

const openDiscountModal = (enrollment: Enrollment) => {
  selectedEnrollment.value = enrollment;
  showDiscountModal.value = true;
};

const handleDiscountSaved = () => {
  // Refresh students list
  refreshStudents();
};
</script>

<template>
  <div class="students-list">
    <table>
      <thead>
        <tr>
          <th>O'quvchi</th>
          <th>Status</th>
          <th>Oylik to'lov</th>
          <th>Amallar</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="enrollment in students" :key="enrollment.id">
          <td>
            {{ enrollment.student.firstName }} {{ enrollment.student.lastName }}
          </td>
          <td>{{ enrollment.status }}</td>
          <td>
            <span v-if="enrollment.customMonthlyPrice">
              {{ Number(enrollment.customMonthlyPrice).toLocaleString() }} so'm
              <span class="discount-badge">Maxsus narx</span>
            </span>
            <span v-else>
              {{ Number(group.monthlyPrice).toLocaleString() }} so'm
            </span>
          </td>
          <td>
            <button @click="openDiscountModal(enrollment)">
              Chegirma berish
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Discount Modal -->
    <DiscountModal
      v-if="showDiscountModal && selectedEnrollment"
      :enrollment="selectedEnrollment"
      :group-price="Number(group.monthlyPrice)"
      @close="showDiscountModal = false"
      @saved="handleDiscountSaved"
    />
  </div>
</template>
```

## TypeScript Types

```typescript
// types/enrollment.ts
export interface AssignDiscountDto {
  customMonthlyPrice: number;
  discountStartDate?: string;
  discountEndDate?: string;
  discountReason?: string;
}

export interface Enrollment {
  id: number;
  groupId: number;
  studentId: number;
  status:
    | 'LEAD'
    | 'TRIAL'
    | 'ACTIVE'
    | 'FROZEN'
    | 'EXPELLED'
    | 'COMPLETED'
    | 'DROPPED';
  customMonthlyPrice: string | null;
  discountStartDate: string | null;
  discountEndDate: string | null;
  discountReason: string | null;
  isFreeEnrollment: boolean;
  perLessonPrice: string;
  baseLessonPrice: string;
  balance: string;
  student: {
    id: number;
    firstName: string;
    lastName: string;
    user: {
      id: number;
      firstName: string;
      lastName: string;
      phoneNumber: string;
    };
  };
  group: {
    id: number;
    name: string;
    monthlyPrice: string;
  };
}
```

## Important Notes

### Balance Logic

- ✅ **Mavjud balans saqlanadi**: Chegirma berilganda o'quvchining mavjud balansi o'zgarmaydi
- ✅ **Yangi dars narxi**: Keyingi darslar yangi narx bo'yicha hisoblanadi
- ✅ **Ko'proq darslar**: Agar chegirma berilsa, mavjud balans ko'proq darslarni qoplaydi

### Auto-Activation

- ✅ Agar `customMonthlyPrice = 0` (bepul) bo'lsa, LEAD/TRIAL statusdagi o'quvchi avtomatik ACTIVE ga o'tadi

### Telegram Notification

- ✅ O'quvchiga avtomatik Telegram orqali xabar yuboriladi
- ✅ Xabarda chegirma miqdori va sababi ko'rsatiladi

## Testing Checklist

- [ ] Chegirma berish (50%, 30%, etc.)
- [ ] Bepul o'qitish (customMonthlyPrice = 0)
- [ ] Vaqtinchalik chegirma (boshlanish va tugash sanasi)
- [ ] Chegirmani bekor qilish (guruh narxiga qaytarish)
- [ ] Qo'shimcha to'lov (guruh narxidan yuqori)
- [ ] Validation xatolarini ko'rsatish
- [ ] Telegram notification yuborilishini tekshirish
- [ ] Balance info to'g'ri hisoblanishini tekshirish
