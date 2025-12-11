# Group Teachers, Schedules & Discounts Management API

> [!WARNING]
> **Backend Implementation Required**: Bu dokumentatsiyada tavsiflangan endpointlar hozircha backend da mavjud emas. Ular yaratilishi kerak.

## Current State

Hozirda teachers, lesson schedules va discounts faqat **guruh yaratish** vaqtida qo'shiladi (`POST /groups`). Ularni alohida o'zgartirish uchun endpointlar yo'q.

## Recommended Implementation

Quyida tavsiya etiladigan API endpointlar va ularning implementatsiyasi keltirilgan.

---

## 1. Manage Group Teachers

### 1.1 Get Group Teachers

```
GET /api/v1/groups/:groupId/teachers
```

**Response:**

```json
{
  "success": true,
  "code": 0,
  "data": [
    {
      "id": 1,
      "groupId": 15,
      "teacherId": 5,
      "isPrimary": true,
      "teacher": {
        "id": 5,
        "firstName": "John",
        "lastName": "Doe",
        "specialty": "Backend Development",
        "user": {
          "id": 10,
          "firstName": "John",
          "lastName": "Doe"
        }
      }
    }
  ],
  "message": "Teachers retrieved successfully"
}
```

### 1.2 Update Group Teachers (Replace All)

```
PUT /api/v1/groups/:groupId/teachers
```

**Request Body:**

```typescript
{
  teachers: Array<{
    teacherId: number;
    isPrimary?: boolean; // Default: false
  }>;
}
```

**Example:**

```bash
curl -X PUT http://localhost:3000/api/v1/groups/15/teachers \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "teachers": [
      { "teacherId": 5, "isPrimary": true },
      { "teacherId": 8, "isPrimary": false }
    ]
  }'
```

**Validation Rules:**

- ✅ Kamida 1 ta o'qituvchi bo'lishi kerak
- ✅ Faqat 1 ta o'qituvchi `isPrimary: true` bo'lishi mumkin
- ✅ Barcha teacherId lar mavjud va shu centerga tegishli bo'lishi kerak
- ✅ Duplicate teacherId bo'lmasligi kerak

**Response:**

```json
{
  "success": true,
  "code": 0,
  "data": {
    "groupId": 15,
    "teachers": [
      {
        "id": 1,
        "teacherId": 5,
        "isPrimary": true,
        "teacher": { "id": 5, "firstName": "John", "lastName": "Doe" }
      },
      {
        "id": 2,
        "teacherId": 8,
        "isPrimary": false,
        "teacher": { "id": 8, "firstName": "Jane", "lastName": "Smith" }
      }
    ]
  },
  "message": "Teachers updated successfully"
}
```

---

## 2. Manage Lesson Schedules

### 2.1 Get Lesson Schedules

```
GET /api/v1/groups/:groupId/schedules
```

**Response:**

```json
{
  "success": true,
  "code": 0,
  "data": [
    {
      "id": 1,
      "groupId": 15,
      "dayOfWeek": 1,
      "startTime": "18:00",
      "endTime": "20:00"
    },
    {
      "id": 2,
      "groupId": 15,
      "dayOfWeek": 3,
      "startTime": "18:00",
      "endTime": "20:00"
    }
  ],
  "message": "Schedules retrieved successfully"
}
```

### 2.2 Update Lesson Schedules (Replace All)

```
PUT /api/v1/groups/:groupId/schedules
```

**Request Body:**

```typescript
{
  schedules: Array<{
    dayOfWeek: number; // 1-7 (Monday-Sunday)
    startTime: string; // HH:MM format
    endTime: string; // HH:MM format
  }>;
}
```

**Example:**

```bash
curl -X PUT http://localhost:3000/api/v1/groups/15/schedules \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "schedules": [
      { "dayOfWeek": 1, "startTime": "18:00", "endTime": "20:00" },
      { "dayOfWeek": 3, "startTime": "18:00", "endTime": "20:00" },
      { "dayOfWeek": 5, "startTime": "18:00", "endTime": "20:00" }
    ]
  }'
```

**Validation Rules:**

- ✅ Kamida 1 ta jadval bo'lishi kerak
- ✅ `dayOfWeek`: 1-7 oralig'ida (1=Dushanba, 7=Yakshanba)
- ✅ `startTime` va `endTime`: HH:MM formatida (24-soatlik)
- ✅ `endTime` > `startTime` bo'lishi kerak
- ✅ Bir xil `dayOfWeek` ikki marta bo'lmasligi kerak

**Response:**

```json
{
  "success": true,
  "code": 0,
  "data": {
    "groupId": 15,
    "schedules": [
      { "id": 1, "dayOfWeek": 1, "startTime": "18:00", "endTime": "20:00" },
      { "id": 2, "dayOfWeek": 3, "startTime": "18:00", "endTime": "20:00" },
      { "id": 3, "dayOfWeek": 5, "startTime": "18:00", "endTime": "20:00" }
    ]
  },
  "message": "Schedules updated successfully"
}
```

---

## 3. Manage Group Discounts

### 3.1 Get Group Discounts

```
GET /api/v1/groups/:groupId/discounts
```

**Response:**

```json
{
  "success": true,
  "code": 0,
  "data": [
    {
      "id": 1,
      "groupId": 15,
      "months": 3,
      "discountAmount": "200000.00"
    },
    {
      "id": 2,
      "groupId": 15,
      "months": 6,
      "discountAmount": "500000.00"
    }
  ],
  "message": "Discounts retrieved successfully"
}
```

### 3.2 Update Group Discounts (Replace All)

```
PUT /api/v1/groups/:groupId/discounts
```

**Request Body:**

```typescript
{
  discounts: Array<{
    months: number; // Minimum 2
    discountAmount: number; // Minimum 0
  }>;
}
```

**Example:**

```bash
curl -X PUT http://localhost:3000/api/v1/groups/15/discounts \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "discounts": [
      { "months": 3, "discountAmount": 200000 },
      { "months": 6, "discountAmount": 500000 },
      { "months": 12, "discountAmount": 1200000 }
    ]
  }'
```

**Validation Rules:**

- ✅ `months`: Minimum 2 bo'lishi kerak
- ✅ `discountAmount`: 0 yoki musbat son
- ✅ Bir xil `months` ikki marta bo'lmasligi kerak
- ⚠️ Bo'sh array yuborish mumkin (chegirmalarni o'chirish uchun)

**Response:**

```json
{
  "success": true,
  "code": 0,
  "data": {
    "groupId": 15,
    "discounts": [
      { "id": 1, "months": 3, "discountAmount": "200000.00" },
      { "id": 2, "months": 6, "discountAmount": "500000.00" },
      { "id": 3, "months": 12, "discountAmount": "1200000.00" }
    ]
  },
  "message": "Discounts updated successfully"
}
```

---

## Frontend Integration Example (Vue/Nuxt)

### Composable

```typescript
// composables/useGroupManagement.ts
export const useGroupManagement = () => {
  const config = useRuntimeConfig();
  const { token } = useAuth();

  const updateTeachers = async (
    groupId: number,
    teachers: TeacherAssignment[],
  ) => {
    return await $fetch(`${config.public.apiBase}/groups/${groupId}/teachers`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token.value}` },
      body: { teachers },
    });
  };

  const updateSchedules = async (
    groupId: number,
    schedules: LessonSchedule[],
  ) => {
    return await $fetch(
      `${config.public.apiBase}/groups/${groupId}/schedules`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token.value}` },
        body: { schedules },
      },
    );
  };

  const updateDiscounts = async (
    groupId: number,
    discounts: GroupDiscount[],
  ) => {
    return await $fetch(
      `${config.public.apiBase}/groups/${groupId}/discounts`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token.value}` },
        body: { discounts },
      },
    );
  };

  return { updateTeachers, updateSchedules, updateDiscounts };
};
```

### Teachers Management Component

```vue
<script setup lang="ts">
const props = defineProps<{ groupId: number }>();
const { updateTeachers } = useGroupManagement();

// Load current teachers
const { data: teachersData } = await useFetch(
  `/api/v1/groups/${props.groupId}/teachers`,
);
const teachers = ref(teachersData.value?.data || []);

// Available teachers list
const { data: allTeachers } = await useFetch('/api/v1/teachers');

// Form state
const selectedTeachers = ref<Array<{ teacherId: number; isPrimary: boolean }>>(
  [],
);

// Initialize from current data
if (teachers.value.length > 0) {
  selectedTeachers.value = teachers.value.map((t) => ({
    teacherId: t.teacherId,
    isPrimary: t.isPrimary,
  }));
}

// Add teacher
const addTeacher = () => {
  selectedTeachers.value.push({ teacherId: 0, isPrimary: false });
};

// Remove teacher
const removeTeacher = (index: number) => {
  selectedTeachers.value.splice(index, 1);
};

// Set as primary
const setPrimary = (index: number) => {
  selectedTeachers.value.forEach((t, i) => {
    t.isPrimary = i === index;
  });
};

// Save
const save = async () => {
  try {
    await updateTeachers(props.groupId, selectedTeachers.value);
    useToast().success("O'qituvchilar yangilandi");
  } catch (error: any) {
    useToast().error(error.data?.message || 'Xatolik yuz berdi');
  }
};
</script>

<template>
  <div class="teachers-management">
    <h3>O'qituvchilar</h3>

    <div
      v-for="(teacher, index) in selectedTeachers"
      :key="index"
      class="teacher-row"
    >
      <select v-model.number="teacher.teacherId" required>
        <option value="0" disabled>O'qituvchini tanlang</option>
        <option v-for="t in allTeachers?.data" :key="t.id" :value="t.id">
          {{ t.firstName }} {{ t.lastName }}
        </option>
      </select>

      <label>
        <input
          type="radio"
          :name="`primary-${groupId}`"
          :checked="teacher.isPrimary"
          @change="setPrimary(index)"
        />
        Asosiy
      </label>

      <button type="button" @click="removeTeacher(index)">O'chirish</button>
    </div>

    <button type="button" @click="addTeacher">+ O'qituvchi qo'shish</button>
    <button type="button" @click="save">Saqlash</button>
  </div>
</template>
```

### Schedules Management Component

```vue
<script setup lang="ts">
const props = defineProps<{ groupId: number }>();
const { updateSchedules } = useGroupManagement();

const schedules = ref<
  Array<{ dayOfWeek: number; startTime: string; endTime: string }>
>([]);

// Days of week
const daysOfWeek = [
  { value: 1, label: 'Dushanba' },
  { value: 2, label: 'Seshanba' },
  { value: 3, label: 'Chorshanba' },
  { value: 4, label: 'Payshanba' },
  { value: 5, label: 'Juma' },
  { value: 6, label: 'Shanba' },
  { value: 7, label: 'Yakshanba' },
];

// Add schedule
const addSchedule = () => {
  schedules.value.push({ dayOfWeek: 1, startTime: '18:00', endTime: '20:00' });
};

// Remove schedule
const removeSchedule = (index: number) => {
  schedules.value.splice(index, 1);
};

// Save
const save = async () => {
  try {
    await updateSchedules(props.groupId, schedules.value);
    useToast().success('Dars jadvali yangilandi');
  } catch (error: any) {
    useToast().error(error.data?.message || 'Xatolik yuz berdi');
  }
};
</script>

<template>
  <div class="schedules-management">
    <h3>Dars jadvali</h3>

    <div
      v-for="(schedule, index) in schedules"
      :key="index"
      class="schedule-row"
    >
      <select v-model.number="schedule.dayOfWeek" required>
        <option v-for="day in daysOfWeek" :key="day.value" :value="day.value">
          {{ day.label }}
        </option>
      </select>

      <input v-model="schedule.startTime" type="time" required />
      <span>-</span>
      <input v-model="schedule.endTime" type="time" required />

      <button type="button" @click="removeSchedule(index)">O'chirish</button>
    </div>

    <button type="button" @click="addSchedule">+ Jadval qo'shish</button>
    <button type="button" @click="save">Saqlash</button>
  </div>
</template>
```

---

## Backend Implementation Guide

### Controller (groups.controller.ts)

```typescript
// Add these endpoints to GroupsController

@Put(':id/teachers')
@RequirePermissions('group.update')
@CheckCenterOwnership({ resourceName: 'group' })
updateTeachers(
  @Param('id', ParseIntPipe) id: number,
  @Body() dto: UpdateGroupTeachersDto,
) {
  return this.groupsService.updateTeachers(id, dto);
}

@Put(':id/schedules')
@RequirePermissions('group.update')
@CheckCenterOwnership({ resourceName: 'group' })
updateSchedules(
  @Param('id', ParseIntPipe) id: number,
  @Body() dto: UpdateGroupSchedulesDto,
) {
  return this.groupsService.updateSchedules(id, dto);
}

@Put(':id/discounts')
@RequirePermissions('group.update')
@CheckCenterOwnership({ resourceName: 'group' })
updateDiscounts(
  @Param('id', ParseIntPipe) id: number,
  @Body() dto: UpdateGroupDiscountsDto,
) {
  return this.groupsService.updateDiscounts(id, dto);
}
```

### DTOs

```typescript
// dto/update-group-teachers.dto.ts
export class UpdateGroupTeachersDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TeacherAssignmentDto)
  teachers: TeacherAssignmentDto[];
}

// dto/update-group-schedules.dto.ts
export class UpdateGroupSchedulesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => LessonScheduleDto)
  schedules: LessonScheduleDto[];
}

// dto/update-group-discounts.dto.ts
export class UpdateGroupDiscountsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GroupDiscountDto)
  discounts: GroupDiscountDto[];
}
```

### Service Methods (groups.service.ts)

```typescript
async updateTeachers(groupId: number, dto: UpdateGroupTeachersDto) {
  // 1. Validate group exists
  const group = await this.findOneRaw(groupId);

  // 2. Validate teachers exist and belong to same center
  const teacherIds = dto.teachers.map(t => t.teacherId);
  const teachers = await this.prisma.teacher.findMany({
    where: { id: { in: teacherIds }, centerId: group.centerId, isDeleted: false }
  });

  if (teachers.length !== teacherIds.length) {
    throw new BadRequestException('Some teachers not found or don\'t belong to this center');
  }

  // 3. Validate only one primary
  const primaryCount = dto.teachers.filter(t => t.isPrimary).length;
  if (primaryCount > 1) {
    throw new BadRequestException('Only one teacher can be primary');
  }

  // 4. Replace all teachers in transaction
  return await this.prisma.$transaction(async (tx) => {
    // Delete existing
    await tx.groupTeacher.deleteMany({ where: { groupId } });

    // Create new
    await tx.groupTeacher.createMany({
      data: dto.teachers.map(t => ({
        groupId,
        teacherId: t.teacherId,
        isPrimary: t.isPrimary || false
      }))
    });

    // Return updated group
    return tx.group.findUnique({
      where: { id: groupId },
      include: {
        groupTeachers: { include: { teacher: true } }
      }
    });
  });
}

// Similar implementation for updateSchedules and updateDiscounts
```

---

## Testing Checklist

### Teachers

- [ ] Kamida 1 ta o'qituvchi bo'lishi kerak
- [ ] Faqat 1 ta primary o'qituvchi
- [ ] Mavjud bo'lmagan teacherId ni rad etish
- [ ] Boshqa centerga tegishli teacherId ni rad etish

### Schedules

- [ ] Kamida 1 ta jadval bo'lishi kerak
- [ ] Duplicate dayOfWeek ni rad etish
- [ ] endTime > startTime validatsiyasi
- [ ] Time format validatsiyasi (HH:MM)

### Discounts

- [ ] Bo'sh array qabul qilish (chegirmalarni o'chirish)
- [ ] months minimum 2
- [ ] Duplicate months ni rad etish
- [ ] discountAmount 0 yoki musbat
