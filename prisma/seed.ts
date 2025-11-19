import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create default center
  const center = await prisma.center.upsert({
    where: { slug: 'default-center' },
    update: {},
    create: {
      name: 'Default Center',
      slug: 'default-center',
      description: 'Default center for testing',
      isActive: true,
    },
  });

  console.log('✅ Created default center:', center.name);

  // Create default permissions
  const permissions = [
    // User permissions
    {
      name: 'Create User',
      slug: 'user.create',
      module: 'user',
      action: 'create',
      description: 'Create new users',
    },
    {
      name: 'Read User',
      slug: 'user.read',
      module: 'user',
      action: 'read',
      description: 'View user details',
    },
    {
      name: 'Update User',
      slug: 'user.update',
      module: 'user',
      action: 'update',
      description: 'Update user information',
    },
    {
      name: 'Delete User',
      slug: 'user.delete',
      module: 'user',
      action: 'delete',
      description: 'Delete users',
    },
    {
      name: 'Assign Role',
      slug: 'user.assign-role',
      module: 'user',
      action: 'assign-role',
      description: 'Assign roles to users',
    },
    {
      name: 'Remove Role',
      slug: 'user.remove-role',
      module: 'user',
      action: 'remove-role',
      description: 'Remove roles from users',
    },

    // Role permissions
    {
      name: 'Create Role',
      slug: 'role.create',
      module: 'role',
      action: 'create',
      description: 'Create new roles',
    },
    {
      name: 'Read Role',
      slug: 'role.read',
      module: 'role',
      action: 'read',
      description: 'View role details',
    },
    {
      name: 'Update Role',
      slug: 'role.update',
      module: 'role',
      action: 'update',
      description: 'Update role information',
    },
    {
      name: 'Delete Role',
      slug: 'role.delete',
      module: 'role',
      action: 'delete',
      description: 'Delete roles',
    },
    {
      name: 'Assign Permission',
      slug: 'role.assign-permission',
      module: 'role',
      action: 'assign-permission',
      description: 'Assign permissions to roles',
    },
    {
      name: 'Remove Permission',
      slug: 'role.remove-permission',
      module: 'role',
      action: 'remove-permission',
      description: 'Remove permissions from roles',
    },

    // Permission permissions
    {
      name: 'Create Permission',
      slug: 'permission.create',
      module: 'permission',
      action: 'create',
      description: 'Create new permissions',
    },
    {
      name: 'Read Permission',
      slug: 'permission.read',
      module: 'permission',
      action: 'read',
      description: 'View permission details',
    },
    {
      name: 'Update Permission',
      slug: 'permission.update',
      module: 'permission',
      action: 'update',
      description: 'Update permission information',
    },
    {
      name: 'Delete Permission',
      slug: 'permission.delete',
      module: 'permission',
      action: 'delete',
      description: 'Delete permissions',
    },

    // Center permissions
    {
      name: 'Create Center',
      slug: 'center.create',
      module: 'center',
      action: 'create',
      description: 'Create new centers',
    },
    {
      name: 'Read Center',
      slug: 'center.read',
      module: 'center',
      action: 'read',
      description: 'View center details',
    },
    {
      name: 'Update Center',
      slug: 'center.update',
      module: 'center',
      action: 'update',
      description: 'Update center information',
    },
    {
      name: 'Delete Center',
      slug: 'center.delete',
      module: 'center',
      action: 'delete',
      description: 'Delete centers',
    },

    // Telegram permissions
    {
      name: 'Manage Telegram',
      slug: 'telegram.manage',
      module: 'telegram',
      action: 'manage',
      description: 'Manage Telegram integrations',
    },
    {
      name: 'Send Messages',
      slug: 'telegram.send',
      module: 'telegram',
      action: 'send',
      description: 'Send Telegram messages',
    },

    // Plan permissions
    {
      name: 'Create Plan',
      slug: 'plan.create',
      module: 'plan',
      action: 'create',
      description: 'Create new plans',
    },
    {
      name: 'Read Plan',
      slug: 'plan.read',
      module: 'plan',
      action: 'read',
      description: 'View plan details',
    },
    {
      name: 'Update Plan',
      slug: 'plan.update',
      module: 'plan',
      action: 'update',
      description: 'Update plan information',
    },
    {
      name: 'Delete Plan',
      slug: 'plan.delete',
      module: 'plan',
      action: 'delete',
      description: 'Delete plans',
    },

    // Subscription permissions
    {
      name: 'Create Subscription',
      slug: 'subscription.create',
      module: 'subscription',
      action: 'create',
      description: 'Create new subscriptions',
    },
    {
      name: 'Read Subscription',
      slug: 'subscription.read',
      module: 'subscription',
      action: 'read',
      description: 'View subscription details',
    },
    {
      name: 'Update Subscription',
      slug: 'subscription.update',
      module: 'subscription',
      action: 'update',
      description: 'Update subscription information',
    },
    {
      name: 'Cancel Subscription',
      slug: 'subscription.cancel',
      module: 'subscription',
      action: 'cancel',
      description: 'Cancel subscriptions',
    },
    {
      name: 'Manage Subscription',
      slug: 'subscription.manage',
      module: 'subscription',
      action: 'manage',
      description: 'Full subscription management',
    },

    // Payment Card permissions
    {
      name: 'Create Payment Card',
      slug: 'payment-card.create',
      module: 'payment-card',
      action: 'create',
      description: 'Add new payment cards',
    },
    {
      name: 'Read Payment Card',
      slug: 'payment-card.read',
      module: 'payment-card',
      action: 'read',
      description: 'View payment card details',
    },
    {
      name: 'Update Payment Card',
      slug: 'payment-card.update',
      module: 'payment-card',
      action: 'update',
      description: 'Update payment card information',
    },
    {
      name: 'Delete Payment Card',
      slug: 'payment-card.delete',
      module: 'payment-card',
      action: 'delete',
      description: 'Delete payment cards',
    },
    {
      name: 'Manage Payment Card',
      slug: 'payment-card.manage',
      module: 'payment-card',
      action: 'manage',
      description: 'Manage payment cards (set primary, toggle visibility)',
    },
  ];

  const createdPermissions: any[] = [];
  for (const permission of permissions) {
    const created = await prisma.permission.upsert({
      where: { slug: permission.slug },
      update: {},
      create: permission,
    });
    createdPermissions.push(created);
  }

  console.log(`✅ Created ${createdPermissions.length} permissions`);

  // Create admin role
  const adminRole = await prisma.role.upsert({
    where: {
      slug_centerId: {
        slug: 'admin',
        centerId: center.id,
      },
    },
    update: {},
    create: {
      name: 'Admin',
      slug: 'admin',
      description: 'Administrator with full access',
      isSystem: true,
      centerId: center.id,
    },
  });

  console.log('✅ Created admin role:', adminRole.name);

  // Assign all permissions to admin role
  for (const permission of createdPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: adminRole.id,
        permissionId: permission.id,
      },
    });
  }

  console.log('✅ Assigned all permissions to admin role');

  // Create user role
  const userRole = await prisma.role.upsert({
    where: {
      slug_centerId: {
        slug: 'user',
        centerId: center.id,
      },
    },
    update: {},
    create: {
      name: 'User',
      slug: 'user',
      description: 'Regular user with limited access',
      isSystem: true,
      centerId: center.id,
    },
  });

  console.log('✅ Created user role:', userRole.name);

  // Assign basic permissions to user role
  const userPermissions = createdPermissions.filter(
    (p) => p.slug === 'user.read' || p.slug === 'center.read',
  );

  for (const permission of userPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: userRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: userRole.id,
        permissionId: permission.id,
      },
    });
  }

  console.log('✅ Assigned basic permissions to user role');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      username: 'admin',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      isActive: true,
      emailVerified: true,
      centerId: center.id,
    },
  });

  console.log('✅ Created admin user:', adminUser.email);

  // Assign admin role to admin user
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: adminRole.id,
    },
  });

  console.log('✅ Assigned admin role to admin user');

  console.log('\n🎉 Seeding completed successfully!');
  console.log('\n📝 Default credentials:');
  console.log('   Email: admin@example.com');
  console.log('   Password: admin123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
