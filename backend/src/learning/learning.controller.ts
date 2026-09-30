import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { ErrorResponseDto } from '../common/errors/error-response.dto.js';
import {
  ContinueDto,
  CourseDetailDto,
  CoursePageDto,
  LanguageQueryDto,
  LessonDto,
  LessonProgressDto,
  ListCoursesQueryDto,
  SkillDto,
  UpdateLessonProgressDto,
} from './dto/learning.dto.js';
import { LearningService } from './learning.service.js';

const uuid = new ParseUUIDPipe();

@ApiTags('learning')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@Controller()
export class LearningController {
  constructor(private readonly learning: LearningService) {}

  @Get('skills')
  @ApiOkResponse({ type: [SkillDto] })
  listSkills(@CurrentUser() user: AuthUser): Promise<SkillDto[]> {
    return this.learning.listSkills(user);
  }

  @Get('courses')
  @ApiOkResponse({
    type: CoursePageDto,
    description:
      'Published courses in catalogue order (skill order, then course order), one page, with your progress',
  })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  listCourses(
    @CurrentUser() user: AuthUser,
    @Query() query: ListCoursesQueryDto,
  ): Promise<CoursePageDto> {
    return this.learning.listCourses(user, query);
  }

  @Get('courses/:slug')
  @ApiOkResponse({ type: CourseDetailDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  getCourse(
    @CurrentUser() user: AuthUser,
    @Param('slug') slug: string,
    @Query() query: LanguageQueryDto,
  ): Promise<CourseDetailDto> {
    return this.learning.getCourse(user, slug, query.lang);
  }

  @Get('lessons/:id')
  @ApiOkResponse({ type: LessonDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Invalid id' })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  getLesson(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Query() query: LanguageQueryDto,
  ): Promise<LessonDto> {
    return this.learning.getLesson(user, id, query.lang);
  }

  @Post('lessons/:id/progress')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: LessonProgressDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  recordProgress(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Body() dto: UpdateLessonProgressDto,
  ): Promise<LessonProgressDto> {
    return this.learning.recordProgress(user, id, dto);
  }

  @Get('continue')
  @ApiOkResponse({
    type: ContinueDto,
    description: 'The lesson to resume or start next',
  })
  getContinue(
    @CurrentUser() user: AuthUser,
    @Query() query: LanguageQueryDto,
  ): Promise<ContinueDto> {
    return this.learning.getContinue(user, query.lang);
  }
}
