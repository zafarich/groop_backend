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

  // 3. Create teacher profile (find or create since userId is not unique)
  let teacher = await prisma.teacher.findFirst({
    where: { userId: teacherUser.id },
  });

  if (!teacher) {
    teacher = await prisma.teacher.create({
      data: {
        userId: teacherUser.id,
        centerId: center.id,
        firstName: teacherUser.firstName,
        lastName: teacherUser.lastName,
        specialty: 'Backend Development',
        bio: 'Experienced backend developer',
      },
    });
  }

  console.log('✅ Created teacher:', teacher.id);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
