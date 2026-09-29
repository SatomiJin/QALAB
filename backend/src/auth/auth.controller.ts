import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ErrorResponseDto } from '../common/errors/error-response.dto.js';
import type { AuthUser } from './auth-user.js';
import { AuthService } from './auth.service.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { Public } from './decorators/public.decorator.js';
import {
  ChangePasswordDto,
  EmailDto,
  LoginDto,
  MessageDto,
  RefreshDto,
  RegisterDto,
  ResetPasswordDto,
  SessionDto,
  VerifyEmailDto,
} from './dto/auth.dto.js';

@ApiTags('auth')
@ApiBadRequestResponse({ type: ErrorResponseDto })
@ApiTooManyRequestsResponse({
  type: ErrorResponseDto,
  description: 'Rate limit per IP and endpoint (`AUTH_RATE_LIMIT`/minute)',
})
@UseGuards(ThrottlerGuard)
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  @ApiCreatedResponse({
    type: MessageDto,
    description:
      'Verification email sent. Same response when the email is already registered.',
  })
  register(@Body() dto: RegisterDto): Promise<MessageDto> {
    return this.auth.register(dto);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: SessionDto })
  verifyEmail(@Body() dto: VerifyEmailDto): Promise<SessionDto> {
    return this.auth.verifyEmail(dto);
  }

  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: MessageDto, description: 'Always 200' })
  resendVerification(@Body() dto: EmailDto): Promise<MessageDto> {
    return this.auth.resendVerification(dto.email);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: SessionDto })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Invalid email or password (generic, no enumeration)',
  })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: 'Correct password, but the email is not verified yet',
  })
  login(@Body() dto: LoginDto): Promise<SessionDto> {
    return this.auth.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: SessionDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  refresh(@Body() dto: RefreshDto): Promise<SessionDto> {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiNoContentResponse({
    description: 'Session revoked; its refresh token no longer works',
  })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  logout(@CurrentUser() user: AuthUser): Promise<void> {
    return this.auth.logout(user);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: MessageDto, description: 'Always 200' })
  forgotPassword(@Body() dto: EmailDto): Promise<MessageDto> {
    return this.auth.forgotPassword(dto.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: MessageDto,
    description: 'Password changed; all sessions are signed out',
  })
  resetPassword(@Body() dto: ResetPasswordDto): Promise<MessageDto> {
    return this.auth.resetPassword(dto);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOkResponse({ type: MessageDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<MessageDto> {
    return this.auth.changePassword(user, dto);
  }
}
