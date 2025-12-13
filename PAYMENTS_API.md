# Cheklarni Tasdiqlash - Frontend Integration Guide

Bu hujjat admin panelda "Cheklarni tasdiqlash" bo'limini yaratish uchun zarur bo'lgan API ma'lumotlarini o'z ichiga oladi.

## 📋 Umumiy ko'rinish

O'quvchilar Telegram bot orqali to'lov qilganda, ular chek rasmini yuborishadi. Bu cheklar admin panelda tasdiqlash uchun ro'yxatda ko'rinadi.

### Chek Statuslari

| Status      | Tavsif                   | Rang          |
| ----------- | ------------------------ | ------------- |
| `PENDING`   | Tasdiqlanishi kutilmoqda | 🟡 Sariq      |
| `PAID`      | Tasdiqlangan             | 🟢 Yashil     |
| `CANCELLED` | Bekor qilingan           | 🔴 Qizil      |
| `OVERDUE`   | Muddati o'tgan           | 🟠 To'q sariq |
| `REFUNDED`  | Qaytarilgan              | 🔵 Ko'k       |

---

## 🔐 Autentifikatsiya

Barcha so'rovlarda `Authorization` headerida JWT token bo'lishi kerak:

```
Authorization: Bearer <access_token>
```

---

## 📡 API Endpoints

### 1. Barcha Cheklarni Olish

```http
GET /api/v1/payments
```

#### Query Parameters

| Parameter | Type   | Required | Default | Description                                         |
| --------- | ------ | -------- | ------- | --------------------------------------------------- |
| `status`  | string | ❌       | -       | Filter: PENDING, PAID, CANCELLED, OVERDUE, REFUNDED |
| `groupId` | number | ❌       | -       | Guruh ID bo'yicha filter                            |
| `search`  | string | ❌       | -       | O'quvchi ismi yoki telefon raqami bo'yicha qidirish |
| `page`    | number | ❌       | 1       | Sahifa raqami                                       |
| `limit`   | number | ❌       | 10      | Har sahifadagi elementlar soni                      |

#### Misol So'rov

```javascript
// Tasdiqlanishi kutilayotgan cheklar
const response = await fetch(
  '/api/v1/payments?status=PENDING&page=1&limit=10',
  {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  },
);
```

#### Response

```json
{
  "success": true,
  "code": 0,
  "data": [
    {
      "id": 1,
      "centerId": 1,
      "groupId": 5,
      "studentId": 12,
      "enrollmentId": 8,
      "amount": "200000.00",
      "currency": "UZS",
      "periodStart": "2025-12-13T07:15:00.000Z",
      "periodEnd": null,
      "paymentType": null,
      "status": "PENDING",
      "dueDate": null,
      "paidAt": null,
      "paymentMethod": "BANK_TRANSFER",
      "notes": "Months: 1\nCaption: N/A",
      "receiptFileId": "AgACAgIAAxkBAAI...",
      "receiptPath": "uploads/receipts/1/receipt_12_1702456789123.jpg",
      "receiptUrl": "http://localhost:3000/uploads/receipts/1/receipt_12_1702456789123.jpg",
      "createdAt": "2025-12-13T07:15:30.000Z",
      "updatedAt": "2025-12-13T07:15:30.000Z",
      "group": {
        "id": 5,
        "name": "Fizika 2-guruh",
        "monthlyPrice": "350000.00"
      },
      "student": {
        "id": 12,
        "firstName": "Ali",
        "lastName": "Valiyev",
        "user": {
          "id": 25,
          "firstName": "Ali",
          "lastName": "Valiyev",
          "phoneNumber": "+998901234567",
          "telegramUserId": 3
        }
      }
    }
  ],
  "meta": {
    "total": 25,
    "page": 1,
    "limit": 10,
    "totalPages": 3
  },
  "message": "Payments retrieved successfully"
}
```

---

### 2. Cheklar Statistikasi

```http
GET /api/v1/payments/stats
```

#### Response

```json
{
  "success": true,
  "code": 0,
  "data": {
    "pending": 5,
    "paid": 120,
    "overdue": 3,
    "cancelled": 2,
    "total": 130
  },
  "message": "Payment statistics retrieved successfully"
}
```

---

### 3. Bitta Chekni Ko'rish

```http
GET /api/v1/payments/:id
```

#### Response

```json
{
  "success": true,
  "code": 0,
  "data": {
    "id": 1,
    "amount": "200000.00",
    "status": "PENDING",
    "receiptUrl": "http://localhost:3000/uploads/receipts/1/receipt_12_1702456789123.jpg",
    "createdAt": "2025-12-13T07:15:30.000Z",
    "group": {
      "id": 5,
      "name": "Fizika 2-guruh",
      "monthlyPrice": "350000.00",
      "courseStartDate": "2025-01-15T00:00:00.000Z",
      "courseEndDate": "2025-06-15T00:00:00.000Z"
    },
    "student": {
      "id": 12,
      "firstName": "Ali",
      "lastName": "Valiyev",
      "user": {
        "phoneNumber": "+998901234567"
      }
    }
  },
  "message": "Payment retrieved successfully"
}
```

---

## 🎨 Frontend Component Strukturasi

### Tavsiya Etiladigan Papka Tuzilmasi

```
src/
├── pages/
│   └── payments/
│       └── index.vue              # Asosiy sahifa
├── components/
│   └── payments/
│       ├── PaymentsList.vue       # Cheklar jadvali
│       ├── PaymentCard.vue        # Bitta chek komponenti
│       ├── PaymentFilters.vue     # Filter va qidirish
│       ├── PaymentStats.vue       # Statistika kartalari
│       └── ReceiptModal.vue       # Chek rasmini ko'rsatish modali
└── composables/
    └── usePayments.ts             # API bilan ishlash uchun composable
```

---

## 💡 UI/UX Tavsiyalari

### 1. Tab Navigation

```vue
<template>
  <div class="tabs">
    <button
      v-for="tab in tabs"
      :key="tab.status"
      :class="{ active: currentStatus === tab.status }"
      @click="setStatus(tab.status)"
    >
      {{ tab.label }}
      <span class="badge">{{ stats[tab.countKey] }}</span>
    </button>
  </div>
</template>

<script setup>
const tabs = [
  { status: null, label: 'Barchasi', countKey: 'total' },
  { status: 'PENDING', label: 'Kutilmoqda', countKey: 'pending' },
  { status: 'PAID', label: 'Tasdiqlangan', countKey: 'paid' },
  { status: 'CANCELLED', label: 'Bekor qilingan', countKey: 'cancelled' },
];
</script>
```

### 2. Chek Kartasi

```vue
<template>
  <div class="payment-card" :class="statusClass">
    <!-- Header -->
    <div class="card-header">
      <div class="student-info">
        <h3>{{ payment.student.firstName }} {{ payment.student.lastName }}</h3>
        <p>{{ payment.student.user.phoneNumber }}</p>
      </div>
      <span class="status-badge">{{ statusLabel }}</span>
    </div>

    <!-- Body -->
    <div class="card-body">
      <div class="info-row">
        <span>Guruh:</span>
        <strong>{{ payment.group.name }}</strong>
      </div>
      <div class="info-row">
        <span>To'lov summasi:</span>
        <strong>{{ formatPrice(payment.amount) }} so'm</strong>
      </div>
      <div class="info-row">
        <span>Guruh narxi:</span>
        <span>{{ formatPrice(payment.group.monthlyPrice) }} so'm</span>
      </div>
      <div class="info-row">
        <span>Yuborilgan vaqt:</span>
        <span>{{ formatDate(payment.createdAt) }}</span>
      </div>
    </div>

    <!-- Receipt Image -->
    <div class="receipt-preview" @click="openReceiptModal">
      <img :src="payment.receiptUrl" alt="Chek rasmi" />
      <span class="overlay">👁 Kattalashtirish</span>
    </div>

    <!-- Actions (for PENDING only) -->
    <div v-if="payment.status === 'PENDING'" class="card-actions">
      <button class="btn-approve" @click="approvePayment">✅ Tasdiqlash</button>
      <button class="btn-reject" @click="rejectPayment">❌ Bekor qilish</button>
    </div>
  </div>
</template>
```

### 3. Chek Rasmini Modal'da Ko'rsatish

```vue
<template>
  <Teleport to="body">
    <div v-if="isOpen" class="modal-overlay" @click="close">
      <div class="modal-content" @click.stop>
        <button class="close-btn" @click="close">&times;</button>
        <img :src="receiptUrl" alt="Chek rasmi" />
        <div class="modal-actions">
          <a :href="receiptUrl" download class="btn-download">
            📥 Yuklab olish
          </a>
        </div>
      </div>
    </div>
  </Teleport>
</template>
```

---

## 🔄 Composable Misoli

```typescript
// composables/usePayments.ts
import { ref, computed } from 'vue';

interface PaymentFilters {
  status?: string;
  groupId?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export function usePayments() {
  const payments = ref([]);
  const stats = ref({
    pending: 0,
    paid: 0,
    overdue: 0,
    cancelled: 0,
    total: 0,
  });
  const meta = ref({ total: 0, page: 1, limit: 10, totalPages: 0 });
  const loading = ref(false);
  const error = ref(null);

  const fetchPayments = async (filters: PaymentFilters = {}) => {
    loading.value = true;
    error.value = null;

    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.groupId) params.append('groupId', String(filters.groupId));
      if (filters.search) params.append('search', filters.search);
      if (filters.page) params.append('page', String(filters.page));
      if (filters.limit) params.append('limit', String(filters.limit));

      const response = await $fetch(`/api/v1/payments?${params}`, {
        headers: {
          Authorization: `Bearer ${useAuthStore().accessToken}`,
        },
      });

      payments.value = response.data;
      meta.value = response.meta;
    } catch (err) {
      error.value = err;
    } finally {
      loading.value = false;
    }
  };

  const fetchStats = async () => {
    try {
      const response = await $fetch('/api/v1/payments/stats', {
        headers: {
          Authorization: `Bearer ${useAuthStore().accessToken}`,
        },
      });
      stats.value = response.data;
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  return {
    payments,
    stats,
    meta,
    loading,
    error,
    fetchPayments,
    fetchStats,
  };
}
```

---

## 📱 Responsive Design

```css
/* Mobile-first approach */
.payments-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr;
}

@media (min-width: 768px) {
  .payments-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1200px) {
  .payments-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

---

## ⚠️ Muhim Eslatmalar

1. **Chek rasmi** - `receiptUrl` to'g'ridan-to'g'ri `<img>` tagida ishlatilishi mumkin
2. **Narx formatlash** - Prisma Decimal qaytaradi, Number ga o'girish kerak
3. **Vaqt formatlash** - ISO format keladi, lokalizatsiya qilish kerak
4. **Pagination** - `meta.totalPages` dan foydalaning

### Narx Formatlash Funksiyasi

```typescript
function formatPrice(price: string | number): string {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  return new Intl.NumberFormat('uz-UZ').format(num);
}
// 200000 -> "200 000"
```

### Vaqt Formatlash

```typescript
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('uz-UZ', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
// "2025-12-13T07:15:30.000Z" -> "13-dekabr, 2025 12:15"
```

---

## 🔗 Tegishli API'lar

> **Eslatma:** Chekni Telegram orqali tasdiqlash/bekor qilish hozirda faqat Telegram bot orqali ishlaydi. Admin panel orqali tasdiqlash uchun qo'shimcha API kerak bo'lsa, xabar bering.

---

## 📝 Changelog

| Sana       | O'zgarish                               |
| ---------- | --------------------------------------- |
| 2025-12-13 | Payments API yaratildi                  |
| 2025-12-13 | `receiptPath` va `receiptUrl` qo'shildi |
| 2025-12-13 | Static file serving sozlandi            |
