import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding group permissions...');

  const permissions = [
    {
      name: 'Read Enrollment',
      slug: 'enrollment.read',
      description: 'Read enrollments',
      module: 'enrollment',
      action: 'read',
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
  const allGroupPermissions = await prisma.permission.findMany({
    where: {
      slug: {
        in: permissions.map((p) => p.slug),
      },
    },
  });

  for (const role of adminRoles) {
    for (const perm of allGroupPermissions) {
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
