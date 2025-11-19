import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreatePermissionDto, UpdatePermissionDto } from './dto';

@Injectable()
export class PermissionService {
  constructor(private prisma: PrismaService) {}

  async create(createPermissionDto: CreatePermissionDto) {
    const { slug, ...rest } = createPermissionDto;

    // Check if permission with same slug exists
    const existingPermission = await this.prisma.permission.findUnique({
      where: { slug },
    });

    if (existingPermission) {
      throw new ConflictException('Permission with this slug already exists');
    }

    return this.prisma.permission.create({
      data: {
        slug,
        ...rest,
      },
    });
  }

  async findAll(module?: string) {
    const where = module ? { module } : {};

    return this.prisma.permission.findMany({
      where,
      include: {
        _count: {
          select: {
            rolePermissions: true,
          },
        },
      },
      orderBy: [
        {
          module: 'asc',
        },
        {
          action: 'asc',
        },
      ],
    });
  }

  async findOne(id: string) {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                slug: true,
                centerId: true,
              },
            },
          },
        },
      },
    });

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    return permission;
  }

  async findBySlug(slug: string) {
    const permission = await this.prisma.permission.findUnique({
      where: { slug },
    });

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    return permission;
  }

  async update(id: string, updatePermissionDto: UpdatePermissionDto) {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
    });

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    // Check if slug is being updated and if it conflicts
    if (updatePermissionDto.slug && updatePermissionDto.slug !== permission.slug) {
      const existingPermission = await this.prisma.permission.findUnique({
        where: { slug: updatePermissionDto.slug },
      });

      if (existingPermission) {
        throw new ConflictException('Permission with this slug already exists');
      }
    }

    return this.prisma.permission.update({
      where: { id },
      data: updatePermissionDto,
    });
  }

  async remove(id: string) {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
    });

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    await this.prisma.permission.delete({
      where: { id },
    });

    return { message: 'Permission deleted successfully' };
  }

  async getPermissionsByModule(module: string) {
    return this.findAll(module);
  }

  async seedDefaultPermissions() {
    const defaultPermissions = [
      // User permissions
      { name: 'Create User', slug: 'user.create', module: 'user', action: 'create', description: 'Create new users' },
      { name: 'Read User', slug: 'user.read', module: 'user', action: 'read', description: 'View user details' },
      { name: 'Update User', slug: 'user.update', module: 'user', action: 'update', description: 'Update user information' },
      { name: 'Delete User', slug: 'user.delete', module: 'user', action: 'delete', description: 'Delete users' },
      { name: 'Assign Role', slug: 'user.assign-role', module: 'user', action: 'assign-role', description: 'Assign roles to users' },
      { name: 'Remove Role', slug: 'user.remove-role', module: 'user', action: 'remove-role', description: 'Remove roles from users' },

      // Role permissions
      { name: 'Create Role', slug: 'role.create', module: 'role', action: 'create', description: 'Create new roles' },
      { name: 'Read Role', slug: 'role.read', module: 'role', action: 'read', description: 'View role details' },
      { name: 'Update Role', slug: 'role.update', module: 'role', action: 'update', description: 'Update role information' },
      { name: 'Delete Role', slug: 'role.delete', module: 'role', action: 'delete', description: 'Delete roles' },
      { name: 'Assign Permission', slug: 'role.assign-permission', module: 'role', action: 'assign-permission', description: 'Assign permissions to roles' },
      { name: 'Remove Permission', slug: 'role.remove-permission', module: 'role', action: 'remove-permission', description: 'Remove permissions from roles' },

      // Permission permissions
      { name: 'Create Permission', slug: 'permission.create', module: 'permission', action: 'create', description: 'Create new permissions' },
      { name: 'Read Permission', slug: 'permission.read', module: 'permission', action: 'read', description: 'View permission details' },
      { name: 'Update Permission', slug: 'permission.update', module: 'permission', action: 'update', description: 'Update permission information' },
      { name: 'Delete Permission', slug: 'permission.delete', module: 'permission', action: 'delete', description: 'Delete permissions' },

      // Center permissions
      { name: 'Create Center', slug: 'center.create', module: 'center', action: 'create', description: 'Create new centers' },
      { name: 'Read Center', slug: 'center.read', module: 'center', action: 'read', description: 'View center details' },
      { name: 'Update Center', slug: 'center.update', module: 'center', action: 'update', description: 'Update center information' },
      { name: 'Delete Center', slug: 'center.delete', module: 'center', action: 'delete', description: 'Delete centers' },

      // Telegram permissions
      { name: 'Manage Telegram', slug: 'telegram.manage', module: 'telegram', action: 'manage', description: 'Manage Telegram integrations' },
      { name: 'Send Messages', slug: 'telegram.send', module: 'telegram', action: 'send', description: 'Send Telegram messages' },
    ];

    const createdPermissions: any[] = [];

    for (const permission of defaultPermissions) {
      const existing = await this.prisma.permission.findUnique({
        where: { slug: permission.slug },
      });

      if (!existing) {
        const created = await this.prisma.permission.create({
          data: permission,
        });
        createdPermissions.push(created);
      }
    }

    return {
      message: 'Default permissions seeded successfully',
      count: createdPermissions.length,
      permissions: createdPermissions,
    };
  }
}

