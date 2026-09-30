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
  Query,
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
import { AdminService } from './admin.service.js';
import {
  AdminCourseDto,
  AdminCoursePageDto,
  AdminModuleDto,
  CreateCourseDto,
  CreateModuleDto,
  ListAdminCoursesQueryDto,
  ReorderCoursesDto,
  ReorderDto,
  UpdateCourseDto,
  UpdateModuleDto,
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
export class AdminCoursesController {
  constructor(private readonly admin: AdminService) {}

  // Courses -----------------------------------------------------------------

  @Get('courses')
  @ApiOkResponse({
    type: AdminCoursePageDto,
    description: 'Every status, in catalogue order (skill, then course order)',
  })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  listCourses(
    @CurrentUser() user: AuthUser,
    @Query() query: ListAdminCoursesQueryDto,
  ): Promise<AdminCoursePageDto> {
    return this.admin.listCourses(user, query);
  }

  @Post('courses')
  @ApiCreatedResponse({ type: AdminCourseDto, description: 'Created as draft' })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto, description: 'Slug used' })
  createCourse(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateCourseDto,
  ): Promise<AdminCourseDto> {
    return this.admin.createCourse(user, dto);
  }

  // Declared before `courses/:id` so "reorder" is not taken for an id.
  @Patch('courses/reorder')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Courses of the skill reordered' })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Not every course of the skill exactly once',
  })
  reorderCourses(
    @CurrentUser() user: AuthUser,
    @Body() dto: ReorderCoursesDto,
  ): Promise<void> {
    return this.admin.reorderCourses(user, dto);
  }

  @Get('courses/:id')
  @ApiOkResponse({
    type: AdminCourseDto,
    description: 'With the full tree: modules, lessons, exercises',
  })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Invalid id' })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  getCourse(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
  ): Promise<AdminCourseDto> {
    return this.admin.getCourse(user, id);
  }

  @Patch('courses/:id')
  @ApiOkResponse({ type: AdminCourseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto, description: 'Slug used' })
  updateCourse(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Body() dto: UpdateCourseDto,
  ): Promise<AdminCourseDto> {
    return this.admin.updateCourse(user, id, dto);
  }

  @Post('courses/:id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AdminCourseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'No published lesson in a published module yet',
  })
  publishCourse(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
  ): Promise<AdminCourseDto> {
    return this.admin.setCourseStatus(user, id, 'published');
  }

  @Post('courses/:id/unpublish')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: AdminCourseDto,
    description: 'Back to draft (also restores an archived course)',
  })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  unpublishCourse(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
  ): Promise<AdminCourseDto> {
    return this.admin.setCourseStatus(user, id, 'draft');
  }

  @Post('courses/:id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AdminCourseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  archiveCourse(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
  ): Promise<AdminCourseDto> {
    return this.admin.setCourseStatus(user, id, 'archived');
  }

  @Delete('courses/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Deleted with everything under it' })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto, description: IN_USE })
  deleteCourse(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
  ): Promise<void> {
    return this.admin.deleteCourse(user, id);
  }

  // Modules -----------------------------------------------------------------

  @Post('courses/:id/modules')
  @ApiCreatedResponse({ type: AdminModuleDto, description: 'Added at the end' })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  createModule(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) courseId: string,
    @Body() dto: CreateModuleDto,
  ): Promise<AdminModuleDto> {
    return this.admin.createModule(user, courseId, dto);
  }

  @Patch('courses/:id/modules/reorder')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Not every module of the course exactly once',
  })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  reorderModules(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) courseId: string,
    @Body() dto: ReorderDto,
  ): Promise<void> {
    return this.admin.reorderModules(user, courseId, dto);
  }

  @Patch('modules/:id')
  @ApiOkResponse({ type: AdminModuleDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  updateModule(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Body() dto: UpdateModuleDto,
  ): Promise<AdminModuleDto> {
    return this.admin.updateModule(user, id, dto);
  }

  @Delete('modules/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Deleted with its lessons' })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto, description: IN_USE })
  deleteModule(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
  ): Promise<void> {
    return this.admin.deleteModule(user, id);
  }
}
