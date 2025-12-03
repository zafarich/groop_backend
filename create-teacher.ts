import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1. Find default center
  const center = await prisma.center.findFirst({
    where: { slug: 'default-center' },
  });

  if (!center) {
    console.error('❌ Default center not found');
    return;
  }

  // 2. Create a user for the teacher
  const teacherUser = await prisma.user.upsert({
    where: { phoneNumber: '998900000001' },
    update: {},
    create: {
      phoneNumber: '998900000001',
      username: 'teacher1',
      password: 'password123', // Should be hashed but for now...
      firstName: 'Teacher',
      lastName: 'One',
      isActive: true,
      centerId: center.id,
    },
  });

  // 3. Create teacher profile
  const teacher = await prisma.teacher.upsert({
    where: { userId: teacherUser.id },
    update: {},
    create: {
      userId: teacherUser.id,
      centerId: center.id,
      specialization: 'Backend',
      experienceYears: 5,
    },
  });

  console.log('✅ Created teacher:', teacher.id);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
