import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  RegisterCenterDto,
  VerifySmsDto,
} from './dto';
import * as bcrypt from 'bcrypt';
import { UserType } from '@prisma/client';
import { EskizService } from '../eskiz/eskiz.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private eskizService: EskizService,
  ) {}

  async registerCenterInit(registerCenterDto: RegisterCenterDto) {
    const { phoneNumber } = registerCenterDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { phoneNumber },
    });

    if (existingUser) {
      throw new ConflictException('User with this phone number already exists');
    }

    // Generate SMS code (fixed 111111 for testing or random)
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Send SMS via Eskiz
    try {
      await this.eskizService.sendSms(
        phoneNumber,
        `Kodni hech kimga bermang! Groop tizimiga kirish uchun tasdiqlash kodi: ${code}`,
      );
    } catch (error) {
      // Fallback to console log if SMS fails (for dev environment without creds)
      console.error('Failed to send SMS via Eskiz:', error.message);
      console.log(`SMS Code for ${phoneNumber}: ${code}`);
    }

    // Save verification data
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5); // 5 minutes expiration

    await this.prisma.smsVerification.upsert({
      where: { phoneNumber },
      update: {
        code,
        payload: JSON.parse(JSON.stringify(registerCenterDto)),
        expiresAt,
        attempts: 0,
      },
      create: {
        phoneNumber,
        code,
        payload: JSON.parse(JSON.stringify(registerCenterDto)),
        expiresAt,
      },
    });

    return {
      message: 'SMS code sent',
      phoneNumber,
    };
  }

  async registerCenterVerify(verifySmsDto: VerifySmsDto) {
    const { phoneNumber, code } = verifySmsDto;

    // Find verification record
    const verification = await this.prisma.smsVerification.findUnique({
      where: { phoneNumber },
    });

    if (!verification) {
      throw new NotFoundException('Verification session not found');
    }

    if (verification.code !== code) {
      // Increment attempts
      await this.prisma.smsVerification.update({
        where: { id: verification.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Invalid SMS code');
    }

    if (new Date() > verification.expiresAt) {
      throw new BadRequestException('SMS code expired');
    }

    const payload = verification.payload as unknown as RegisterCenterDto;

    // Create Center and User transactionally
    const result = await this.prisma.$transaction(async (prisma) => {
      // 1. Create Center
      // Generate slug from name
      const slug =
        payload.centerName.toLowerCase().replace(/[^a-z0-9]/g, '-') +
        '-' +
        Math.floor(Math.random() * 1000);

      const center = await prisma.center.create({
        data: {
          name: payload.centerName,
          slug,
        },
      });

      // 2. Create User (Owner)
      const hashedPassword = await bcrypt.hash(payload.password, 10);

      const user = await prisma.user.create({
        data: {
          phoneNumber: payload.phoneNumber,
          firstName: payload.firstName,
          lastName: payload.lastName,
          password: hashedPassword,
          centerId: center.id,
          userType: UserType.ADMIN,
        },
      });

      // 3. Update Center owner
      await prisma.center.update({
        where: { id: center.id },
        data: { ownerUserId: user.id },
      });

      return { center, user };
    });

    // Delete verification record
    await this.prisma.smsVerification.delete({
      where: { id: verification.id },
    });

    // Generate tokens
    const tokens = await this.generateTokens(
      result.user.id,
      result.user.phoneNumber,
      result.user.centerId,
    );

    // Save refresh token
    await this.saveRefreshToken(result.user.id, tokens.refreshToken);

    return {
      user: this.sanitizeUser(result.user),
      center: result.center,
      ...tokens,
    };
  }

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

  private async generateTokens(
    userId: number,
    phoneNumber: string,
    centerId: number,
  ) {
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
