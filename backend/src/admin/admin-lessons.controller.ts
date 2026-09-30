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
import { AdminExercisesService } from './admin-exercises.service.js';
import { AdminService } from './admin.service.js';
import {
  AdminExerciseDto,
  AdminLessonDto,
  CreateExerciseDto,
  CreateLessonDto,
  ReorderDto,
  UpdateExerciseDto,
  UpdateLessonDto,
} from './dto/admin.dto.js';

const uuid = new ParseUUIDPipe();
const IN_USE =
  'Learner progress or attempts exist: archive instead of deleting';

@ApiTags('admin')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiForbiddenResponse({ type: ErrorResponseDto, description: 'Not an admin' })
@Roles('admin')
@Controller('admin')
export class AdminLessonsController {
  constructor(
    private readonly admin: AdminService,
    private readonly exercises: AdminExercisesService,
  ) {}

  // Lessons -----------------------------------------------------------------

  @Post('modules/:id/lessons')
  @ApiCreatedResponse({ type: AdminLessonDto, description: 'Added at the end' })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'Slug used in this module',
  })
  createLesson(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) moduleId: string,
    @Body() dto: CreateLessonDto,
  ): Promise<AdminLessonDto> {
    return this.admin.createLesson(user, moduleId, dto);
  }

  @Patch('modules/:id/lessons/reorder')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Not every lesson of the module exactly once',
  })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  reorderLessons(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) moduleId: string,
    @Body() dto: ReorderDto,
  ): Promise<void> {
    return this.admin.reorderLessons(user, moduleId, dto);
  }

  @Get('lessons/:id')
  @ApiOkResponse({
    type: AdminLessonDto,
    description: 'Any status, with its exercises',
  })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Invalid id' })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  getLesson(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
  ): Promise<AdminLessonDto> {
    return this.admin.getLesson(user, id);
  }

  @Patch('lessons/:id')
  @ApiOkResponse({ type: AdminLessonDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'Slug used in this module',
  })
  updateLesson(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Body() dto: UpdateLessonDto,
  ): Promise<AdminLessonDto> {
    return this.admin.updateLesson(user, id, dto);
  }

  @Delete('lessons/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Deleted with its exercises' })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto, description: IN_USE })
  deleteLesson(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
  ): Promise<void> {
    return this.admin.deleteLesson(user, id);
  }

  // Exercises ---------------------------------------------------------------

  @Post('lessons/:id/exercises')
  @ApiCreatedResponse({
    type: AdminExerciseDto,
    description: 'Exercise and answer key, added at the end',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description:
      'Invalid fields, prompt data or answer key (`details`, e.g. `answerData.correct`)',
  })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  createExercise(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) lessonId: string,
    @Body() dto: CreateExerciseDto,
  ): Promise<AdminExerciseDto> {
    return this.exercises.createExercise(user, lessonId, dto);
  }

  @Patch('lessons/:id/exercises/reorder')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Not every exercise of the lesson exactly once',
  })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  reorderExercises(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) lessonId: string,
    @Body() dto: ReorderDto,
  ): Promise<void> {
    return this.exercises.reorderExercises(user, lessonId, dto);
  }

  @Get('exercises/:id')
  @ApiOkResponse({
    type: AdminExerciseDto,
    description: 'Any status, with the answer key and explanation',
  })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Invalid id' })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  getExercise(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
  ): Promise<AdminExerciseDto> {
    return this.exercises.getExercise(user, id);
  }

  @Patch('exercises/:id')
  @ApiOkResponse({ type: AdminExerciseDto })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description:
      'Invalid fields, prompt data or answer key; changed ids after attempts',
  })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  updateExercise(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Body() dto: UpdateExerciseDto,
  ): Promise<AdminExerciseDto> {
    return this.exercises.updateExercise(user, id, dto);
  }

  @Delete('exercises/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Deleted with its answer key' })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto, description: IN_USE })
  deleteExercise(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
  ): Promise<void> {
    return this.exercises.deleteExercise(user, id);
  }
}
