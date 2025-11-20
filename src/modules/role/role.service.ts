import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateRoleDto, UpdateRoleDto, AssignPermissionDto } from './dto';

@Injectable()
export class RoleService {
  constructor(private prisma: PrismaService) {}

  async create(createRoleDto: CreateRoleDto) {
    const { slug, centerId, ...rest } = createRoleDto;

    // Check if center exists
    const center = await this.prisma.center.findUnique({
      where: { id: centerId },
    });

    if (!center) {
      throw new BadRequestException('Center not found');
    }

    // Check if role with same slug exists in this center
    const existingRole = await this.prisma.role.findUnique({
      where: {
        slug_centerId: {
          slug,
          centerId,
        },
      },
    });

    if (existingRole) {
      throw new ConflictException('Role with this slug already exists in this center');
    }

    const role = await this.prisma.role.create({
      data: {
        slug,
        centerId,
        ...rest,
      },
      include: {
        center: true,
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    return role;
  }

  async findAll(centerId?: number) {
    const where = centerId ? { centerId } : {};

    return this.prisma.role.findMany({
      where,
      include: {
        center: true,
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            userRoles: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: number) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        center: true,
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        userRoles: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role;
  }

  async update(id: number, updateRoleDto: UpdateRoleDto) {
    const role = await this.prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Check if slug is being updated and if it conflicts
    if (updateRoleDto.slug && updateRoleDto.slug !== role.slug) {
      const existingRole = await this.prisma.role.findUnique({
        where: {
          slug_centerId: {
            slug: updateRoleDto.slug,
            centerId: role.centerId,
          },
        },
      });

      if (existingRole) {
        throw new ConflictException('Role with this slug already exists in this center');
      }
    }

    return this.prisma.role.update({
      where: { id },
      data: updateRoleDto,
      include: {
        center: true,
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  async remove(id: number) {
    const role = await this.prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.isSystem) {
      throw new BadRequestException('Cannot delete system role');
    }

    await this.prisma.role.delete({
      where: { id },
    });

    return { message: 'Role deleted successfully' };
  }

  async assignPermission(roleId: number, assignPermissionDto: AssignPermissionDto) {
    const { permissionId } = assignPermissionDto;

    // Check if role exists
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Check if permission exists
    const permission = await this.prisma.permission.findUnique({
      where: { id: permissionId },
    });

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    // Check if role already has this permission
    const existingRolePermission = await this.prisma.rolePermission.findUnique({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId,
        },
      },
    });

    if (existingRolePermission) {
      throw new ConflictException('Role already has this permission');
    }

    // Assign permission to role
    await this.prisma.rolePermission.create({
      data: {
        roleId,
        permissionId,
      },
    });

    return this.findOne(roleId);
  }

  async removePermission(roleId: number, permissionId: number) {
    const rolePermission = await this.prisma.rolePermission.findUnique({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId,
        },
      },
    });

    if (!rolePermission) {
      throw new NotFoundException('Role does not have this permission');
    }

    await this.prisma.rolePermission.delete({
      where: {
        id: rolePermission.id,
      },
    });

    return { message: 'Permission removed from role successfully' };
  }

  async getRolesByCenter(centerId: number) {
    return this.findAll(centerId);
  }
}

