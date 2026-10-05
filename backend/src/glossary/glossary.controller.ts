import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { ErrorResponseDto } from '../common/errors/error-response.dto.js';
import { GlossaryListDto } from './dto/glossary.dto.js';
import { GlossaryService } from './glossary.service.js';

@ApiTags('glossary')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@Controller('glossary')
export class GlossaryController {
  constructor(private readonly glossary: GlossaryService) {}

  @Get()
  @ApiOkResponse({
    type: GlossaryListDto,
    description:
      'Every published term, in both languages (the glossary is small and the lesson links need all of it, so it is not paginated)',
  })
  list(@CurrentUser() user: AuthUser): Promise<GlossaryListDto> {
    return this.glossary.list(user);
  }
}
