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
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { ErrorResponseDto } from '../common/errors/error-response.dto.js';
import { RateLimit } from '../common/rate-limit/rate-limit.guard.js';
import {
  LanguageQueryDto,
  PageQueryDto,
} from '../learning/dto/learning.dto.js';
import {
  AttemptDto,
  AttemptPageDto,
  AttemptResultDto,
  ExerciseDto,
  ExercisePageDto,
  ListExercisesQueryDto,
  SaveSelfAssessmentDto,
  SubmitAttemptDto,
} from './dto/practice.dto.js';
import { PracticeService } from './practice.service.js';

const uuid = new ParseUUIDPipe();

@ApiTags('practice')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@Controller('exercises')
export class PracticeController {
  constructor(private readonly practice: PracticeService) {}

  @Get()
  @ApiOkResponse({
    type: ExercisePageDto,
    description:
      'Published exercises in catalogue order (skill, course, module, lesson, exercise order), one page, with your attempt stats. No answer keys.',
  })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: ListExercisesQueryDto,
  ): Promise<ExercisePageDto> {
    return this.practice.listExercises(user, query);
  }

  @Get(':id')
  @ApiOkResponse({ type: ExerciseDto, description: 'No answer key' })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Invalid id' })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  get(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Query() query: LanguageQueryDto,
  ): Promise<ExerciseDto> {
    return this.practice.getExercise(user, id, query.lang);
  }

  @Post(':id/attempts')
  @RateLimit('attempts')
  @ApiCreatedResponse({
    type: AttemptResultDto,
    description:
      'Graded on the server and stored. Returns the score, feedback and the review (explanation, model answer, rubric).',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description:
      'Invalid id or answer (`details` per field, e.g. `answer.selected`)',
  })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiTooManyRequestsResponse({
    type: ErrorResponseDto,
    description: 'Rate limit per user (`ATTEMPT_RATE_LIMIT`/minute)',
  })
  submit(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Body() dto: SubmitAttemptDto,
    @Query() query: LanguageQueryDto,
  ): Promise<AttemptResultDto> {
    return this.practice.submitAttempt(user, id, dto, query.lang);
  }

  @Get(':id/attempts')
  @ApiOkResponse({ type: AttemptPageDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  listAttempts(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Query() query: PageQueryDto,
  ): Promise<AttemptPageDto> {
    return this.practice.listAttempts(user, id, query);
  }

  @Post(':id/attempts/:attemptId/self-assessment')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: AttemptDto,
    description: 'Free-text types only; saved once per attempt',
  })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto, description: 'Already saved' })
  saveSelfAssessment(
    @CurrentUser() user: AuthUser,
    @Param('id', uuid) id: string,
    @Param('attemptId', uuid) attemptId: string,
    @Body() dto: SaveSelfAssessmentDto,
  ): Promise<AttemptDto> {
    return this.practice.saveSelfAssessment(user, id, attemptId, dto);
  }
}
