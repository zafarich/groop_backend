import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding teacher permissions...');

  const permissions = [
    {
      name: 'Create Enrollment',
      slug: 'enrollment.create',
      description: 'Create new enrollment',
      module: 'enrollment',
      action: 'create',
    },
    {
      name: 'Read Enrollment',
      slug: 'enrollment.read',
      description: 'View enrollments',
      module: 'enrollment',
      action: 'read',
    },
    {
      name: 'Update Enrollment',
      slug: 'enrollment.update',
      description: 'Update enrollment details',
      module: 'enrollment',
      action: 'update',
    },
    {
      name: 'Delete Enrollment',
      slug: 'enrollment.delete',
      description: 'Delete enrollment',
      module: 'enrollment',
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
