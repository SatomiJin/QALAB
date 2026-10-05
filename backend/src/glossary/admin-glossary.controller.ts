import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { ErrorResponseDto } from '../common/errors/error-response.dto.js';
import {
  AdminGlossaryListDto,
  AdminGlossaryTermDto,
  CreateGlossaryTermDto,
  UpdateGlossaryTermDto,
} from './dto/glossary.dto.js';
import { GlossaryService } from './glossary.service.js';

const uuid = new ParseUUIDPipe();
const TAKEN = 'Slug or a match phrase used by another term';

@ApiTags('admin')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiForbiddenResponse({ type: ErrorResponseDto, description: 'Not an admin' })
@Roles('admin')
@Controller('admin/glossary')
export class AdminGlossaryController {
  constructor(private readonly glossary: GlossaryService) {}

  @Get()
  @ApiOkResponse({
    type: AdminGlossaryListDto,
    description: 'Every term (all statuses) with its usage in lessons',
  })
  list(@CurrentUser() user: AuthUser): Promise<AdminGlossaryListDto> {
    return this.glossary.adminList(user);
  }

  @Post()
  @ApiCreatedResponse({
    type: AdminGlossaryTermDto,
    description: 'Draft unless a status is given',
  })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto, description: TAKEN })
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateGlossaryTermDto,
  ): Promise<AdminGlossaryTermDto> {
    return this.glossary.create(user, dto);
  }

  @Get(':id')
  @ApiOkResponse({ type: AdminGlossaryTermDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  get(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
  ): Promise<AdminGlossaryTermDto> {
    return this.glossary.adminGet(user, id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: AdminGlossaryTermDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto, description: TAKEN })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Body() dto: UpdateGlossaryTermDto,
  ): Promise<AdminGlossaryTermDto> {
    return this.glossary.update(user, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({
    description: "Deleted; removed from other terms' related lists",
  })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
  ): Promise<void> {
    return this.glossary.remove(user, id);
  }
}
