import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  RegisterCenterDto,
  VerifySmsDto,
  ForgotPasswordInitDto,
  ForgotPasswordVerifyDto,
  ResetPasswordDto,
} from './dto';
import * as bcrypt from 'bcrypt';
import { User, UserType } from '@prisma/client';
import { EskizService } from '../eskiz/eskiz.service';
import {
  PhoneNumberAlreadyExistsException,
  InvalidSmsCodeException,
  ExpiredSmsCodeException,
  VerificationSessionNotFoundException,
  CenterNotFoundException,
  InvalidCredentialsException,
  AccountDeactivatedException,
  TelegramAccountNoPasswordException,
  InvalidTokenException,
  UserNotFoundException,
  SmsRateLimitExceededException,
} from '../../common/exceptions/custom-exceptions';

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
      throw new PhoneNumberAlreadyExistsException();
    }

    // Generate SMS code (fixed 111111 for testing or random)
    const code = Math.floor(1000 + Math.random() * 9000).toString();

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
      throw new VerificationSessionNotFoundException();
    }

    if (verification.code !== code) {
      // Increment attempts
      await this.prisma.smsVerification.update({
        where: { id: verification.id },
        data: { attempts: { increment: 1 } },
      });
      throw new InvalidSmsCodeException();
    }

    if (new Date() > verification.expiresAt) {
      throw new ExpiredSmsCodeException();
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

      // 2. Get all permissions to assign to roles
      const allPermissions = await prisma.permission.findMany({
        where: { isDeleted: false },
      });

      // 3. Create default roles for this center
      const adminRole = await prisma.role.create({
        data: {
          name: 'Admin',
          slug: 'admin',
          description: 'Administrator with full access',
          centerId: center.id,
          isSystem: true,
        },
      });

      const teacherRole = await prisma.role.create({
        data: {
          name: 'Teacher',
          slug: 'teacher',
          description: 'Teacher with limited access',
          centerId: center.id,
          isSystem: true,
        },
      });

      const studentRole = await prisma.role.create({
        data: {
          name: 'Student',
          slug: 'student',
          description: 'Student with basic access',
          centerId: center.id,
          isSystem: true,
        },
      });

      // 4. Assign all permissions to Admin role
      const adminPermissions = allPermissions.map((permission) => ({
        roleId: adminRole.id,
        permissionId: permission.id,
      }));
      await prisma.rolePermission.createMany({
        data: adminPermissions,
      });

      // 5. Assign read permissions to Teacher role (user.read, center.read, etc.)
      const teacherPermissions = allPermissions
        .filter((p) => p.action === 'read' || p.slug.includes('teacher'))
        .map((permission) => ({
          roleId: teacherRole.id,
          permissionId: permission.id,
        }));
      if (teacherPermissions.length > 0) {
        await prisma.rolePermission.createMany({
          data: teacherPermissions,
        });
      }

      // 6. Assign minimal permissions to Student role
      const studentPermissions = allPermissions
        .filter((p) => p.slug.includes('student') || p.slug === 'center.read')
        .map((permission) => ({
          roleId: studentRole.id,
          permissionId: permission.id,
        }));
      if (studentPermissions.length > 0) {
        await prisma.rolePermission.createMany({
          data: studentPermissions,
        });
      }

      // 7. Create User (Owner)
      const hashedPassword = await bcrypt.hash(payload.password, 10);

      const user = await prisma.user.create({
        data: {
          phoneNumber: payload.phoneNumber,
          firstName: payload.firstName,
          lastName: payload.lastName,
          password: hashedPassword,
          centerId: center.id,
          activeCenterId: center.id,
          userType: UserType.ADMIN,
        },
      });

      // 8. Create UserCenter
      await prisma.userCenter.create({
        data: {
          userId: user.id,
          centerId: center.id,
          role: UserType.ADMIN,
        },
      });

      // 9. Assign Admin role to the owner
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: adminRole.id,
        },
      });

      // 10. Update Center owner
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

    // Fetch user with roles and permissions
    const userWithRoles = await this.prisma.user.findUnique({
      where: { id: result.user.id },
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

    // Generate tokens
    const tokens = await this.generateTokens(
      result.user.id,
      result.user.phoneNumber,
      result.user.activeCenterId,
    );

    // Save refresh token
    await this.saveRefreshToken(result.user.id, tokens.refreshToken);

    return {
      user: this.sanitizeUser(userWithRoles),
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
      throw new PhoneNumberAlreadyExistsException();
    }

    // Check if center exists
    const center = await this.prisma.center.findUnique({
      where: { id: centerId },
    });

    if (!center) {
      throw new CenterNotFoundException();
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
        activeCenterId: centerId, // Set active center initially
        ...rest,
        userCenters: {
          create: {
            centerId,
            role: rest?.userType || UserType.STUDENT,
          },
        },
      },
      include: {
        center: true,
      },
    });

    // Generate tokens
    const tokens = await this.generateTokens(
      user.id,
      user.phoneNumber,
      user.activeCenterId,
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
      throw new InvalidCredentialsException();
    }

    // Check if user is active
    if (!user.isActive) {
      throw new AccountDeactivatedException();
    }

    // Check if password exists (Telegram-only users don't have passwords)
    if (!user.password) {
      throw new TelegramAccountNoPasswordException();
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new InvalidCredentialsException();
    }

    // Get user centers
    const userCenters = await this.prisma.userCenter.findMany({
      where: {
        userId: user.id,
        isActive: true,
        isDeleted: false,
      },
      include: {
        center: true,
      },
    });

    // If user has no centers (should not happen for normal users, but maybe for superadmin)
    if (userCenters.length === 0 && user.userType !== UserType.ADMIN) {
      // Fallback to centerId if no userCenters found (migration support)
      if (user.centerId) {
        await this.prisma.userCenter.create({
          data: {
            userId: user.id,
            centerId: user.centerId,
            role: user.userType,
          },
        });
        // Re-fetch
        return this.login(loginDto);
      }
    }

    let activeCenterId = user.activeCenterId;

    // If user has multiple centers and no active center is set, or we want to force selection
    // For now, if activeCenterId is set, we use it. If not, we check count.

    // Logic:
    // 1. If user has > 1 center, we return list of centers and require selection
    // 2. If user has 1 center, we automatically set it as active

    if (userCenters.length > 1) {
      return {
        user: this.sanitizeUser(user),
        requiresCenterSelection: true,
        centers: userCenters.map((uc) => ({
          id: uc.center.id,
          name: uc.center.name,
          role: uc.role,
        })),
        message: 'Please select a center',
      };
    } else if (userCenters.length === 1) {
      // Auto-set active center if not set or different
      const centerId = userCenters[0].centerId;
      if (activeCenterId !== centerId) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { activeCenterId: centerId },
        });
        activeCenterId = centerId;
      }
    }

    // Generate tokens
    const tokens = await this.generateTokens(
      user.id,
      user.phoneNumber,
      activeCenterId || user.centerId, // Fallback to centerId
    );

    // Save refresh token
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        ...this.sanitizeUser(user),
        activeCenterId,
      },
      ...tokens,
    };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    const { refreshToken } = refreshTokenDto;

    try {
      // Check if refresh token exists in database
      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: {
          user: true,
        },
      });

      if (!storedToken) {
        throw new InvalidTokenException('Invalid refresh token');
      }

      // Check if token is expired
      if (new Date() > storedToken.expiresAt) {
        await this.prisma.refreshToken.delete({
          where: { id: storedToken.id },
        });
        throw new InvalidTokenException('Refresh token expired');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(
        storedToken.user.id,
        storedToken.user.phoneNumber,
        storedToken.user.activeCenterId || storedToken.user.centerId,
      );

      // Delete old refresh token
      await this.prisma.refreshToken.delete({
        where: { id: storedToken.id },
      });

      // Save new refresh token
      await this.saveRefreshToken(storedToken.user.id, tokens.refreshToken);

      return tokens;
    } catch {
      throw new InvalidTokenException('Invalid refresh token');
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

  /**
   * Forgot Password Flow - Step 1: Send SMS code
   */
  async forgotPasswordInit(forgotPasswordInitDto: ForgotPasswordInitDto) {
    const { phoneNumber } = forgotPasswordInitDto;

    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { phoneNumber },
    });

    if (!existingUser) {
      throw new UserNotFoundException(
        'Ushbu telefon raqam bilan foydalanuvchi topilmadi',
      );
    }

    // Check if user has password (not Telegram-only account)
    if (!existingUser.password) {
      throw new TelegramAccountNoPasswordException(
        "Bu akkaunt Telegram orqali yaratilgan. Parolni o'zgartirish uchun avval parol o'rnating.",
      );
    }

    // Generate SMS code (4 digits)
    const code = Math.floor(1000 + Math.random() * 9000).toString();

    // Send SMS via Eskiz
    try {
      await this.eskizService.sendSms(
        phoneNumber,
        `Kodni hech kimga bermang! Groop tizimida parolni tiklash uchun tasdiqlash kodi: ${code}`,
      );
    } catch (error) {
      // Fallback to console log if SMS fails (for dev environment)
      console.error('Failed to send SMS via Eskiz:', error?.message);
      console.log(`SMS Code for ${phoneNumber}: ${code}`);
    }

    // Save verification data
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5); // 5 minutes expiration

    await this.prisma.smsVerification.upsert({
      where: { phoneNumber },
      update: {
        code,
        payload: { type: 'forgot-password', phoneNumber },
        expiresAt,
        attempts: 0,
      },
      create: {
        phoneNumber,
        code,
        payload: { type: 'forgot-password', phoneNumber },
        expiresAt,
      },
    });

    return {
      message: 'SMS kod yuborildi',
      phoneNumber,
    };
  }

  /**
   * Forgot Password Flow - Step 1.5: Resend SMS code
   */
  async resendForgotPasswordSms(forgotPasswordInitDto: ForgotPasswordInitDto) {
    const { phoneNumber } = forgotPasswordInitDto;

    // Find verification record
    const verification = await this.prisma.smsVerification.findUnique({
      where: { phoneNumber },
    });

    if (!verification) {
      throw new VerificationSessionNotFoundException(
        "Tasdiqlash sessiyasi topilmadi. Iltimos, qaytadan urinib ko'ring.",
      );
    }

    // Check rate limit (1 minute)
    const now = new Date();
    const lastUpdated = new Date(verification.updatedAt);
    const timeDiff = now.getTime() - lastUpdated.getTime();
    const cooldown = 60 * 1000; // 60 seconds

    if (timeDiff < cooldown) {
      const remainingSeconds = Math.ceil((cooldown - timeDiff) / 1000);
      throw new SmsRateLimitExceededException(
        `Iltimos, ${remainingSeconds} soniyadan so'ng qayta urinib ko'ring`,
      );
    }

    // Generate new SMS code
    const code = Math.floor(1000 + Math.random() * 9000).toString();

    // Send SMS via Eskiz
    try {
      await this.eskizService.sendSms(
        phoneNumber,
        `Kodni hech kimga bermang! Groop tizimida parolni tiklash uchun tasdiqlash kodi: ${code}`,
      );
    } catch (error) {
      console.error('Failed to send SMS via Eskiz:', error.message);
      console.log(`SMS Code for ${phoneNumber}: ${code}`);
    }

    // Update verification record
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    await this.prisma.smsVerification.update({
      where: { id: verification.id },
      data: {
        code,
        expiresAt,
        attempts: 0,
        updatedAt: new Date(),
      },
    });

    return {
      message: 'SMS kod qayta yuborildi',
      phoneNumber,
    };
  }

  /**
   * Forgot Password Flow - Step 2: Verify SMS code
   */
  async forgotPasswordVerify(forgotPasswordVerifyDto: ForgotPasswordVerifyDto) {
    const { phoneNumber, code } = forgotPasswordVerifyDto;

    // Find verification record
    const verification = await this.prisma.smsVerification.findUnique({
      where: { phoneNumber },
    });

    if (!verification) {
      throw new VerificationSessionNotFoundException(
        'Tasdiqlash sessiyasi topilmadi',
      );
    }

    // Check if code matches
    if (verification.code !== code) {
      // Increment attempts
      await this.prisma.smsVerification.update({
        where: { id: verification.id },
        data: { attempts: { increment: 1 } },
      });
      throw new InvalidSmsCodeException("Tasdiqlash kodi noto'g'ri");
    }

    // Check if code is expired
    if (new Date() > verification.expiresAt) {
      throw new ExpiredSmsCodeException('Tasdiqlash kodi muddati tugagan');
    }

    return {
      message: 'Tasdiqlash muvaffaqiyatli',
      phoneNumber,
    };
  }

  /**
   * Forgot Password Flow - Step 3: Reset password
   */
  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { phoneNumber, code, newPassword } = resetPasswordDto;

    // Find verification record
    const verification = await this.prisma.smsVerification.findUnique({
      where: { phoneNumber },
    });

    if (!verification) {
      throw new VerificationSessionNotFoundException(
        'Tasdiqlash sessiyasi topilmadi',
      );
    }

    // Verify code again for security
    if (verification.code !== code) {
      throw new InvalidSmsCodeException("Tasdiqlash kodi noto'g'ri");
    }

    // Check if code is expired
    if (new Date() > verification.expiresAt) {
      throw new ExpiredSmsCodeException('Tasdiqlash kodi muddati tugagan');
    }

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { phoneNumber },
    });

    if (!user) {
      throw new UserNotFoundException('Foydalanuvchi topilmadi');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Delete verification record
    await this.prisma.smsVerification.delete({
      where: { id: verification.id },
    });

    return {
      message: 'Parol muvaffaqiyatli yangilandi',
    };
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

    // Inject permissions based on active center role
    if (user.activeCenterId) {
      const activeUserCenter = await this.prisma.userCenter.findUnique({
        where: {
          userId_centerId: {
            userId: user.id,
            centerId: user.activeCenterId,
          },
        },
      });

      if (
        activeUserCenter &&
        activeUserCenter.isActive &&
        !activeUserCenter.isDeleted
      ) {
        // Map UserType to Role Name
        let roleName = 'User';
        if (activeUserCenter.role === UserType.ADMIN) {
          roleName = 'Admin';
        } else if (activeUserCenter.role === UserType.TEACHER) {
          roleName = 'Teacher'; // Assuming Teacher role exists, fallback to User if not found/handled
        }
      }
    }

    return user;
  }

  async getUserCenters(userId: number) {
    const userCenters = await this.prisma.userCenter.findMany({
      where: {
        userId,
        isActive: true,
        isDeleted: false,
      },
      include: {
        center: true,
      },
    });

    return userCenters.map((uc) => ({
      id: uc.center.id,
      name: uc.center.name,
      slug: uc.center.slug,
      role: uc.role,
      joinedAt: uc.createdAt,
    }));
  }

  async getUserProfile(userId: number) {
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

    if (!user) {
      throw new UserNotFoundException('User not found');
    }

    return this.sanitizeUser(user);
  }

  async setActiveCenter(userId: number, centerId: number) {
    // Verify user belongs to this center
    const userCenter = await this.prisma.userCenter.findUnique({
      where: {
        userId_centerId: {
          userId,
          centerId,
        },
      },
    });

    if (!userCenter || !userCenter.isActive || userCenter.isDeleted) {
      throw new CenterNotFoundException('User does not belong to this center');
    }

    // Update user's active center
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { activeCenterId: centerId },
    });

    // Generate new tokens with updated activeCenterId
    const tokens = await this.generateTokens(
      user.id,
      user.phoneNumber,
      centerId,
    );

    // Save refresh token (optional: invalidate old ones or keep them)
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return {
      message: 'Active center updated',
      user: {
        ...this.sanitizeUser(user),
        activeCenterId: centerId,
      },
      ...tokens,
    };
  }

  private async generateTokens(
    userId: number,
    phoneNumber: string,
    activeCenterId: number | null,
  ) {
    const payload = { sub: userId, phoneNumber, activeCenterId };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_SECRET || 'default-secret-key',
        expiresIn: process.env.JWT_EXPIRES_IN as any,
      }),
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-key',
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN as any,
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
