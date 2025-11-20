import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateUserDto, UpdateUserDto, AssignRoleDto } from './dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const { password, username, centerId, ...rest } = createUserDto;

    // Check if center exists
    const center = await this.prisma.center.findUnique({
      where: { id: centerId },
    });

    if (!center) {
      throw new BadRequestException('Center not found');
    }

    // Hash password if provided
    let hashedPassword: string | undefined;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Create user
    const user = await this.prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        centerId,
        ...rest,
      },
      include: {
        center: true,
        userRoles: {
          include: {
            role: true,
          },
        },
        telegramUser: true,
      },
    });

    return this.sanitizeUser(user);
  }

  async findAll(centerId?: number) {
    const where = centerId ? { centerId } : {};

    const users = await this.prisma.user.findMany({
      where,
      include: {
        center: true,
        userRoles: {
          include: {
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return users.map((user) => this.sanitizeUser(user));
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        center: true,
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.sanitizeUser(user);
  }



  async update(id: number, updateUserDto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateUserDto,
      include: {
        center: true,
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    return this.sanitizeUser(updatedUser);
  }

  async remove(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.delete({
      where: { id },
    });

    return { message: 'User deleted successfully' };
  }

  async assignRole(userId: number, assignRoleDto: AssignRoleDto) {
    const { roleId } = assignRoleDto;

    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if role exists
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Check if user already has this role
    const existingUserRole = await this.prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
    });

    if (existingUserRole) {
      throw new ConflictException('User already has this role');
    }

    // Assign role to user
    await this.prisma.userRole.create({
      data: {
        userId,
        roleId,
      },
    });

    return this.findOne(userId);
  }

  async removeRole(userId: number, roleId: number) {
    const userRole = await this.prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
    });

    if (!userRole) {
      throw new NotFoundException('User does not have this role');
    }

    await this.prisma.userRole.delete({
      where: {
        id: userRole.id,
      },
    });

    return { message: 'Role removed from user successfully' };
  }

  async getUsersByCenter(centerId: number) {
    return this.findAll(centerId);
  }

  private sanitizeUser(user: any) {
    const { password, ...sanitized } = user;
    return sanitized;
  }
}

