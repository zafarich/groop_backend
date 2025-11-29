import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding teacher permissions...');

  const permissions = [
    {
      name: 'Create Teacher',
      slug: 'teacher.create',
      description: 'Create new teacher',
      module: 'teacher',
      action: 'create',
    },
    {
      name: 'Read Teacher',
      slug: 'teacher.read',
      description: 'View teachers',
      module: 'teacher',
      action: 'read',
    },
    {
      name: 'Update Teacher',
      slug: 'teacher.update',
      description: 'Update teacher details',
      module: 'teacher',
      action: 'update',
    },
    {
      name: 'Delete Teacher',
      slug: 'teacher.delete',
      description: 'Delete teacher',
      module: 'teacher',
      action: 'delete',
    },
  ];

  // 1. Upsert permissions
  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { slug: perm.slug },
      update: perm,
      create: perm,
    });
    console.log(`Upserted permission: ${perm.slug}`);
  }

  // 2. Find all admin roles
  const adminRoles = await prisma.role.findMany({
    where: {
      slug: 'admin',
      isDeleted: false,
    },
  });

  console.log(`Found ${adminRoles.length} admin roles.`);

  // 3. Assign permissions to admin roles
  const allTeacherPermissions = await prisma.permission.findMany({
    where: {
      slug: {
        in: permissions.map((p) => p.slug),
      },
    },
  });

  for (const role of adminRoles) {
    for (const perm of allTeacherPermissions) {
      try {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: perm.id,
            },
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId: perm.id,
          },
        });
        console.log(
          `Assigned ${perm.slug} to role ${role.name} (ID: ${role.id})`,
        );
      } catch (error) {
        console.error(
          `Failed to assign ${perm.slug} to role ${role.id}:`,
          error,
        );
      }
    }
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
