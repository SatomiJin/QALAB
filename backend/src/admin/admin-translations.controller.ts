import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { ErrorResponseDto } from '../common/errors/error-response.dto.js';
import { AdminTranslationsService } from './admin-translations.service.js';
import {
  AdminTranslationsDto,
  SaveTranslationsDto,
} from './dto/admin-translations.dto.js';

const uuid = new ParseUUIDPipe();
const CHANGED =
  'The English text changed since it was loaded (details name the fields)';
const INVALID =
  'Unknown or repeated field, empty or too long text, Markdown headings / code blocks differ from English';

/**
 * Manual Vietnamese translations of every content kind: one GET and one PUT
 * per kind, on the content's own path.
 */
@ApiTags('admin')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiForbiddenResponse({ type: ErrorResponseDto, description: 'Not an admin' })
@Roles('admin')
@Controller('admin')
export class AdminTranslationsController {
  constructor(private readonly translations: AdminTranslationsService) {}

  @Get('courses/:id/translations')
  @ApiOkResponse({ type: AdminTranslationsDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  getCourse(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
  ): Promise<AdminTranslationsDto> {
    return this.translations.get(user, 'course', id);
  }

  @Put('courses/:id/translations')
  @ApiOkResponse({ type: AdminTranslationsDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: INVALID })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto, description: CHANGED })
  saveCourse(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Body() dto: SaveTranslationsDto,
  ): Promise<AdminTranslationsDto> {
    return this.translations.save(user, 'course', id, dto);
  }

  @Get('modules/:id/translations')
  @ApiOkResponse({ type: AdminTranslationsDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  getModule(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
  ): Promise<AdminTranslationsDto> {
    return this.translations.get(user, 'module', id);
  }

  @Put('modules/:id/translations')
  @ApiOkResponse({ type: AdminTranslationsDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: INVALID })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto, description: CHANGED })
  saveModule(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Body() dto: SaveTranslationsDto,
  ): Promise<AdminTranslationsDto> {
    return this.translations.save(user, 'module', id, dto);
  }

  @Get('lessons/:id/translations')
  @ApiOkResponse({ type: AdminTranslationsDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  getLesson(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
  ): Promise<AdminTranslationsDto> {
    return this.translations.get(user, 'lesson', id);
  }

  @Put('lessons/:id/translations')
  @ApiOkResponse({ type: AdminTranslationsDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: INVALID })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto, description: CHANGED })
  saveLesson(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Body() dto: SaveTranslationsDto,
  ): Promise<AdminTranslationsDto> {
    return this.translations.save(user, 'lesson', id, dto);
  }

  @Get('exercises/:id/translations')
  @ApiOkResponse({
    type: AdminTranslationsDto,
    description:
      'Includes the review texts (explanation, model answer, rubric)',
  })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  getExercise(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
  ): Promise<AdminTranslationsDto> {
    return this.translations.get(user, 'exercise', id);
  }

  @Put('exercises/:id/translations')
  @ApiOkResponse({ type: AdminTranslationsDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: INVALID })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto, description: CHANGED })
  saveExercise(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Body() dto: SaveTranslationsDto,
  ): Promise<AdminTranslationsDto> {
    return this.translations.save(user, 'exercise', id, dto);
  }
}
