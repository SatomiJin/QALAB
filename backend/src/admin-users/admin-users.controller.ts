import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { ErrorResponseDto } from '../common/errors/error-response.dto.js';
import { AdminUsersService } from './admin-users.service.js';
import {
  AdminUserDto,
  AdminUserPageDto,
  ChangeRoleDto,
  ListAdminUsersQueryDto,
} from './dto/admin-users.dto.js';

const uuid = new ParseUUIDPipe();

/** User management for admins: list, details, role and account status. */
@ApiTags('admin')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiForbiddenResponse({ type: ErrorResponseDto, description: 'Not an admin' })
@Roles('admin')
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly users: AdminUsersService) {}

  @Get()
  @ApiOkResponse({ type: AdminUserPageDto, description: 'Newest first' })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: ListAdminUsersQueryDto,
  ): Promise<AdminUserPageDto> {
    return this.users.list(user, query);
  }

  @Get(':id')
  @ApiOkResponse({ type: AdminUserDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  get(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
  ): Promise<AdminUserDto> {
    return this.users.get(user, id);
  }

  @Patch(':id/role')
  @ApiOkResponse({
    type: AdminUserDto,
    description: 'The same role changes nothing (no audit entry)',
  })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'Your own role, or promoting a disabled account',
  })
  changeRole(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Body() dto: ChangeRoleDto,
  ): Promise<AdminUserDto> {
    return this.users.changeRole(user, id, dto.role);
  }

  @Post(':id/disable')
  @HttpCode(200)
  @ApiOkResponse({
    type: AdminUserDto,
    description:
      'Banned in Supabase Auth: no sign-in or refresh. Issued access tokens expire within the hour.',
  })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'Yourself, or an admin (demote first)',
  })
  @ApiServiceUnavailableResponse({ type: ErrorResponseDto })
  disable(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
  ): Promise<AdminUserDto> {
    return this.users.setDisabled(user, id, true);
  }

  @Post(':id/enable')
  @HttpCode(200)
  @ApiOkResponse({ type: AdminUserDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto, description: 'Yourself' })
  @ApiServiceUnavailableResponse({ type: ErrorResponseDto })
  enable(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
  ): Promise<AdminUserDto> {
    return this.users.setDisabled(user, id, false);
  }
}
