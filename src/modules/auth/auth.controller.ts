import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Get,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  RegisterCenterDto,
  VerifySmsDto,
  ForgotPasswordInitDto,
  ForgotPasswordVerifyDto,
  ResetPasswordDto,
  SetActiveCenterDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register-center')
  async registerCenterInit(@Body() registerCenterDto: RegisterCenterDto) {
    return this.authService.registerCenterInit(registerCenterDto);
  }

  @Public()
  @Post('verify-center')
  @HttpCode(HttpStatus.OK)
  async registerCenterVerify(@Body() verifySmsDto: VerifySmsDto) {
    return this.authService.registerCenterVerify(verifySmsDto);
  }

  @Public()
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Request() req, @Body() body: { refreshToken: string }) {
    return this.authService.logout(req.user.id, body.refreshToken);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPasswordInit(
    @Body() forgotPasswordInitDto: ForgotPasswordInitDto,
  ) {
    return this.authService.forgotPasswordInit(forgotPasswordInitDto);
  }

  @Public()
  @Post('forgot-password/resend')
  @HttpCode(HttpStatus.OK)
  async resendForgotPasswordSms(
    @Body() forgotPasswordInitDto: ForgotPasswordInitDto,
  ) {
    return this.authService.resendForgotPasswordSms(forgotPasswordInitDto);
  }

  @Public()
  @Post('verify-forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPasswordVerify(
    @Body() forgotPasswordVerifyDto: ForgotPasswordVerifyDto,
  ) {
    return this.authService.forgotPasswordVerify(forgotPasswordVerifyDto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me')
  @HttpCode(HttpStatus.OK)
  async getProfile(@Request() req) {
    // User already includes roles and permissions from validateUser in JWT strategy
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Post('set-active-center')
  @HttpCode(HttpStatus.OK)
  async setActiveCenter(
    @Request() req,
    @Body() setActiveCenterDto: SetActiveCenterDto,
  ) {
    return this.authService.setActiveCenter(
      req.user.id,
      setActiveCenterDto.centerId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-centers')
  @HttpCode(HttpStatus.OK)
  async getUserCenters(@Request() req) {
    return this.authService.getUserCenters(req.user.id);
  }
}
