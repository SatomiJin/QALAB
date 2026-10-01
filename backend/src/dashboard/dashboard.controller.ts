import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { ErrorResponseDto } from '../common/errors/error-response.dto.js';
import { DashboardService } from './dashboard.service.js';
import {
  DashboardDto,
  DashboardQueryDto,
  ProgressPageDto,
  ProgressQueryDto,
} from './dto/dashboard.dto.js';
import { ProgressService } from './progress.service.js';

@ApiTags('dashboard')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiBadRequestResponse({ type: ErrorResponseDto })
@Controller()
export class DashboardController {
  constructor(
    private readonly dashboard: DashboardService,
    private readonly progress: ProgressService,
  ) {}

  @Get('dashboard')
  @ApiOkResponse({
    type: DashboardDto,
    description:
      'Your progress, streak, next lesson, skill progress, weak areas and recent activity; all derived on read',
  })
  getDashboard(
    @CurrentUser() user: AuthUser,
    @Query() query: DashboardQueryDto,
  ): Promise<DashboardDto> {
    return this.dashboard.getDashboard(user, query);
  }

  @Get('progress')
  @ApiOkResponse({
    type: ProgressPageDto,
    description:
      'Published courses in catalogue order, one page, with every lesson and exercise and your results',
  })
  getProgress(
    @CurrentUser() user: AuthUser,
    @Query() query: ProgressQueryDto,
  ): Promise<ProgressPageDto> {
    return this.progress.getProgress(user, query);
  }
}
