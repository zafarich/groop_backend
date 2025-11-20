import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateCenterDto, UpdateCenterDto } from './dto';

@Injectable()
export class CenterService {
  constructor(private prisma: PrismaService) {}

  async create(createCenterDto: CreateCenterDto) {
    const { slug, ...rest } = createCenterDto;

    // Check if center with same slug exists
    const existingCenter = await this.prisma.center.findUnique({
      where: { slug },
    });

    if (existingCenter) {
      throw new ConflictException('Center with this slug already exists');
    }

    return this.prisma.center.create({
      data: {
        slug,
        ...rest,
      },
    });
  }

  async findAll() {
    return this.prisma.center.findMany({
      include: {
        _count: {
          select: {
            users: true,
            roles: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: number) {
    const center = await this.prisma.center.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            isActive: true,
          },
          take: 10,
        },
        roles: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            users: true,
            roles: true,
          },
        },
      },
    });

    if (!center) {
      throw new NotFoundException('Center not found');
    }

    return center;
  }

  async findBySlug(slug: string) {
    const center = await this.prisma.center.findUnique({
      where: { slug },
    });

    if (!center) {
      throw new NotFoundException('Center not found');
    }

    return center;
  }

  async update(id: number, updateCenterDto: UpdateCenterDto) {
    const center = await this.prisma.center.findUnique({
      where: { id },
    });

    if (!center) {
      throw new NotFoundException('Center not found');
    }

    // Check if slug is being updated and if it conflicts
    if (updateCenterDto.slug && updateCenterDto.slug !== center.slug) {
      const existingCenter = await this.prisma.center.findUnique({
        where: { slug: updateCenterDto.slug },
      });

      if (existingCenter) {
        throw new ConflictException('Center with this slug already exists');
      }
    }

    return this.prisma.center.update({
      where: { id },
      data: {
        ...updateCenterDto,
      },
    });
  }

  async remove(id: number) {
    const center = await this.prisma.center.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!center) {
      throw new NotFoundException('Center not found');
    }

    if (center._count.users > 0) {
      throw new ConflictException('Cannot delete center with existing users');
    }

    await this.prisma.center.delete({
      where: { id },
    });

    return { message: 'Center deleted successfully' };
  }

  async getCenterStats(id: number) {
    const center = await this.prisma.center.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            roles: true,
          },
        },
      },
    });

    if (!center) {
      throw new NotFoundException('Center not found');
    }

    const activeUsers = await this.prisma.user.count({
      where: {
        centerId: id,
        isActive: true,
      },
    });

    return {
      center: {
        id: center.id,
        name: center.name,
        slug: center.slug,
      },
      stats: {
        totalUsers: center._count.users,
        activeUsers,
        totalRoles: center._count.roles,
      },
    };
  }
}
