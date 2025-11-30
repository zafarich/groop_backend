import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Adding center.manage permission...');

  // 1. Create or update the permission
  const permission = await prisma.permission.upsert({
    where: { slug: 'center.manage' },
    update: {},
    create: {
      name: 'Manage Center',
      slug: 'center.manage',
      module: 'center',
      action: 'manage',
      description: 'Manage center settings and configuration',
    },
  });

  console.log('✅ Permission ensured:', permission.slug);

  // 2. Find all roles with slug 'admin'
  const adminRoles = await prisma.role.findMany({
    where: {
      slug: 'admin',
    },
  });

  console.log(`Found ${adminRoles.length} admin roles.`);

  // 3. Assign permission to all admin roles
  let assignedCount = 0;
  for (const role of adminRoles) {
    try {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
      assignedCount++;
    } catch (error) {
      console.error(`Failed to assign permission to role ${role.id}:`, error);
    }
  }

  console.log(`✅ Assigned 'center.manage' to ${assignedCount} admin roles.`);
}

main()
  .catch((e) => {
    console.error('❌ Error running script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
