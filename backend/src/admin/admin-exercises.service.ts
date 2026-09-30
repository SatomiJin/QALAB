import { BadRequestException, Injectable } from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.js';
import {
  type ExerciseType,
  type FieldError,
  parseAnswerKey,
  parsePrompt,
  type PromptByType,
} from '../practice/exercise-schema.js';
import {
  AdminContentRepository,
  type AdminExerciseRow,
} from './admin-content.repository.js';
import {
  AdminService,
  definedOnly,
  toExerciseSummary,
} from './admin.service.js';
import { lockedPromptErrors, nextOrderIndex } from './content-rules.js';
import type {
  AdminExerciseDto,
  CreateExerciseDto,
  ReorderDto,
  UpdateExerciseDto,
} from './dto/admin.dto.js';

function invalid(errors: FieldError[]): BadRequestException {
  return new BadRequestException({
    message: 'Validation failed',
    details: errors,
  });
}

/**
 * Checks prompt data and answer key together, per type (the same parsers
 * the grader uses), and returns them normalised (trimmed).
 */
function validateExercise(
  type: ExerciseType,
  promptData: unknown,
  answerData: unknown,
): { prompt: PromptByType[ExerciseType]; key: unknown } {
  const prompt = parsePrompt(type, promptData);
  if (!prompt.ok) throw invalid(prompt.errors);
  const key = parseAnswerKey(type, prompt.value, answerData);
  if (!key.ok) throw invalid(key.errors);
  return { prompt: prompt.value, key: key.value };
}

/** Admin CMS for exercises and their answer keys. */
@Injectable()
export class AdminExercisesService {
  constructor(
    private readonly repo: AdminContentRepository,
    private readonly admin: AdminService,
  ) {}

  async getExercise(user: AuthUser, id: string): Promise<AdminExerciseDto> {
    const exercise = await this.admin.findOr404(user, 'exercise', id);
    return this.toDto(user, exercise);
  }

  async createExercise(
    user: AuthUser,
    lessonId: string,
    dto: CreateExerciseDto,
  ): Promise<AdminExerciseDto> {
    await this.admin.findOr404(user, 'lesson', lessonId);
    const { prompt, key } = validateExercise(
      dto.type,
      dto.promptData,
      dto.answerData,
    );
    const siblings = await this.repo.listExercises(user.accessToken, [
      lessonId,
    ]);
    const row = await this.repo.insert(user.accessToken, 'exercise', {
      lesson_id: lessonId,
      type: dto.type,
      question: dto.question,
      prompt_data: prompt,
      difficulty: dto.difficulty ?? 'easy',
      status: dto.status ?? 'draft',
      order_index: nextOrderIndex(siblings),
    });
    try {
      await this.repo.saveAnswer(user.accessToken, row.id, {
        answer_data: key,
        explanation: dto.explanation ?? '',
      });
    } catch (error) {
      // Never leave an exercise without its answer key.
      await this.repo.remove(user.accessToken, 'exercise', row.id);
      throw error;
    }
    return this.toDto(user, row);
  }

  async updateExercise(
    user: AuthUser,
    id: string,
    dto: UpdateExerciseDto,
  ): Promise<AdminExerciseDto> {
    const exercise = await this.admin.findOr404(user, 'exercise', id);
    const answer = await this.repo.findAnswer(user.accessToken, id);
    const keyChanged =
      dto.promptData !== undefined ||
      dto.answerData !== undefined ||
      dto.explanation !== undefined;

    let prompt: unknown = exercise.prompt_data;
    let key: unknown = answer?.answer_data;
    if (dto.promptData !== undefined || dto.answerData !== undefined) {
      const checked = validateExercise(
        exercise.type,
        dto.promptData ?? exercise.prompt_data,
        dto.answerData ?? answer?.answer_data,
      );
      if (dto.promptData !== undefined) {
        await this.checkLockedIds(user, exercise, checked.prompt);
      }
      prompt = checked.prompt;
      key = checked.key;
    }

    const patch = definedOnly({
      question: dto.question,
      prompt_data: dto.promptData === undefined ? undefined : prompt,
      difficulty: dto.difficulty,
      status: dto.status,
    });
    const updated = Object.keys(patch).length
      ? await this.repo.update(user.accessToken, 'exercise', id, patch)
      : exercise;
    if (keyChanged) {
      if (key === undefined) {
        throw invalid([
          { field: 'answerData', message: 'answerData is required' },
        ]);
      }
      await this.repo.saveAnswer(user.accessToken, id, {
        answer_data: key,
        explanation: dto.explanation ?? answer?.explanation ?? '',
      });
    }
    return this.toDto(user, updated ?? exercise);
  }

  async deleteExercise(user: AuthUser, id: string): Promise<void> {
    await this.admin.findOr404(user, 'exercise', id);
    const usage = await this.repo.usage(user.accessToken, [], [id]);
    await this.admin.removeUnused(
      user,
      'exercise',
      id,
      usage.exercises.has(id),
    );
  }

  async reorderExercises(
    user: AuthUser,
    lessonId: string,
    dto: ReorderDto,
  ): Promise<void> {
    await this.admin.findOr404(user, 'lesson', lessonId);
    const siblings = await this.repo.listExercises(user.accessToken, [
      lessonId,
    ]);
    await this.admin.reorder(user, 'exercise', lessonId, siblings, dto);
  }

  /** Once attempted, option / item / category ids stay as they are. */
  private async checkLockedIds(
    user: AuthUser,
    exercise: AdminExerciseRow,
    next: PromptByType[ExerciseType],
  ): Promise<void> {
    const usage = await this.repo.usage(user.accessToken, [], [exercise.id]);
    if (!usage.exercises.has(exercise.id)) return;
    const before = parsePrompt(exercise.type, exercise.prompt_data);
    if (!before.ok) return; // A broken stored prompt may be replaced.
    const errors = lockedPromptErrors(exercise.type, before.value, next);
    if (errors.length) throw invalid(errors);
  }

  private async toDto(
    user: AuthUser,
    exercise: AdminExerciseRow,
  ): Promise<AdminExerciseDto> {
    const lesson = await this.admin.findOr404(
      user,
      'lesson',
      exercise.lesson_id,
    );
    const module = await this.admin.findOr404(user, 'module', lesson.module_id);
    const course = await this.admin.findOr404(user, 'course', module.course_id);
    const answer = await this.repo.findAnswer(user.accessToken, exercise.id);
    const usage = await this.repo.usage(user.accessToken, [], [exercise.id]);
    return {
      ...toExerciseSummary(exercise, usage.exercises),
      answerData: (answer?.answer_data as Record<string, unknown>) ?? null,
      explanation: answer?.explanation ?? '',
      visibleToLearners: [exercise, lesson, module, course].every(
        (row) => row.status === 'published',
      ),
      lesson: { id: lesson.id, title: lesson.title, status: lesson.status },
      module: { id: module.id, title: module.title, status: module.status },
      course: {
        id: course.id,
        slug: course.slug,
        title: course.title,
        status: course.status,
      },
      createdAt: exercise.created_at,
      updatedAt: exercise.updated_at,
    };
  }
}
