import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSms() {
  try {
    const verifications = await prisma.smsVerification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 1,
    });
    if (verifications.length > 0) {
      console.log('Latest Code:', verifications[0].code);
    } else {
      console.log('No verifications found');
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

checkSms();
