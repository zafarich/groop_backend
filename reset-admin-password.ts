import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);

  try {
    const user = await prisma.user.update({
      where: { phoneNumber: '998901234567' },
      data: { password: hashedPassword },
    });
    console.log('✅ Password reset for user:', user.phoneNumber);
  } catch (error) {
    console.error('❌ Error resetting password:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
