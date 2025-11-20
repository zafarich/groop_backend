import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RegisterDto, LoginDto, RefreshTokenDto } from './dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { phoneNumber, password, username, centerId, ...rest } = registerDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { phoneNumber },
    });

    if (existingUser) {
      throw new ConflictException('User with this phone number already exists');
    }

    // Check if center exists
    const center = await this.prisma.center.findUnique({
      where: { id: centerId },
    });

    if (!center) {
      throw new BadRequestException('Center not found');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        phoneNumber,
        username,
        password: hashedPassword,
        centerId,
        ...rest,
      },
      include: {
        center: true,
      },
    });

    // Generate tokens
    const tokens = await this.generateTokens(
      user.id,
      user.phoneNumber,
      user.centerId,
    );

    // Save refresh token
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async login(loginDto: LoginDto) {
    const { phoneNumber, password } = loginDto;

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { phoneNumber },
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
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('User account is deactivated');
    }

    // Check if password exists (Telegram-only users don't have passwords)
    if (!user.password) {
      throw new UnauthorizedException(
        'This account was created via Telegram. Please use Telegram to login or set a password first.',
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const tokens = await this.generateTokens(
      user.id,
      user.phoneNumber,
      user.centerId,
    );

    // Save refresh token
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    const { refreshToken } = refreshTokenDto;

    try {
      // Verify refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      // Check if refresh token exists in database
      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: {
          user: true,
        },
      });

      if (!storedToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Check if token is expired
      if (new Date() > storedToken.expiresAt) {
        await this.prisma.refreshToken.delete({
          where: { id: storedToken.id },
        });
        throw new UnauthorizedException('Refresh token expired');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(
        storedToken.user.id,
        storedToken.user.phoneNumber,
        storedToken.user.centerId,
      );

      // Delete old refresh token
      await this.prisma.refreshToken.delete({
        where: { id: storedToken.id },
      });

      // Save new refresh token
      await this.saveRefreshToken(storedToken.user.id, tokens.refreshToken);

      return tokens;
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: number, refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({
      where: {
        userId,
        token: refreshToken,
      },
    });

    return { message: 'Logged out successfully' };
  }

  async validateUser(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
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

    if (!user || !user.isActive) {
      return null;
    }

    return user;
  }

  private async generateTokens(userId: number, phoneNumber: string, centerId: number) {
    const payload = { sub: userId, phoneNumber, centerId };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_SECRET || 'default-secret-key',
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-key',
        expiresIn: '7d',
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  private async saveRefreshToken(userId: number, token: string) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    });
  }

  private sanitizeUser(user: any) {
    const { password, ...sanitized } = user;
    return sanitized;
  }
}

