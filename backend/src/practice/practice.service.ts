import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.js';
import {
  ContentRepository,
  type CourseRow,
  type LessonSummaryRow,
  type SkillRow,
} from '../learning/content.repository.js';
import type { PageSize } from '../learning/dto/learning.dto.js';
import {
  buildOutlines,
  pageOf,
  sortByCatalogueOrder,
} from '../learning/outline.js';
import {
  type ContentLanguage,
  ContentTranslationService,
  type TextRef,
  type Translations,
} from '../translation/content-translation.service.js';
import {
  type AttemptRow,
  AttemptsRepository,
  type AttemptScoreRow,
} from './attempts.repository.js';
import {
  AttemptDto,
  AttemptPageDto,
  AttemptResultDto,
  ExerciseDto,
  ExercisePageDto,
  ExercisePromptDto,
  ExerciseStatsDto,
  ExerciseSummaryDto,
  ListExercisesQueryDto,
  ReviewDto,
  SaveSelfAssessmentDto,
  SubmitAttemptDto,
} from './dto/practice.dto.js';
import {
  type ExerciseAnswerRow,
  ExerciseAnswersRepository,
} from './exercise-answers.repository.js';
import {
  type AnswerKeyByType,
  type ExerciseType,
  isFreeText,
  type Label,
  parseAnswer,
  parseAnswerKey,
  parsePrompt,
  parseSelfAssessment,
  type PromptByType,
} from './exercise-schema.js';
import {
  type ExerciseRow,
  ExercisesRepository,
} from './exercises.repository.js';
import { grade } from './grading.js';

/** Where an exercise sits: its lesson and that lesson's course and skill. */
interface Placement {
  lesson: LessonSummaryRow;
  course: CourseRow;
  skill: SkillRow | undefined;
}

interface VisibleExercise extends Placement {
  exercise: ExerciseRow;
  prompt: PromptByType[ExerciseType];
}

// Text refs -----------------------------------------------------------------

const exerciseText = (
  exercise: ExerciseRow,
  field: TextRef['field'],
  text: string,
): TextRef => ({ type: 'exercise', id: exercise.id, field, text });

const questionRef = (exercise: ExerciseRow) =>
  exerciseText(exercise, 'question', exercise.question);

const labelRefs = (
  exercise: ExerciseRow,
  kind: 'option' | 'item' | 'category' | 'rubric',
  labels: Label[],
) =>
  labels.map((label) =>
    exerciseText(exercise, `${kind}.${label.id}`, label.text),
  );

function promptRefs(exercise: ExerciseRow, prompt: VisibleExercise['prompt']) {
  const refs = [questionRef(exercise)];
  if ('options' in prompt)
    refs.push(...labelRefs(exercise, 'option', prompt.options));
  if ('items' in prompt) {
    refs.push(
      ...labelRefs(exercise, 'category', prompt.categories),
      ...labelRefs(exercise, 'item', prompt.items),
    );
  }
  return refs;
}

const placementRefs = ({ lesson, course }: Placement): TextRef[] => [
  { type: 'lesson', id: lesson.id, field: 'title', text: lesson.title },
  { type: 'course', id: course.id, field: 'title', text: course.title },
];

// Mapping -------------------------------------------------------------------

function toStats(rows: AttemptScoreRow[]): ExerciseStatsDto {
  // Rows are newest first.
  return {
    attemptCount: rows.length,
    bestScore: rows.length ? Math.max(...rows.map((row) => row.score)) : null,
    lastScore: rows[0]?.score ?? null,
    lastAttemptedAt: rows[0]?.attempted_at ?? null,
    passed: rows.some((row) => row.is_correct),
  };
}

function toAttemptDto(row: AttemptRow): AttemptDto {
  return {
    id: row.id,
    exerciseId: row.exercise_id,
    score: row.score,
    isCorrect: row.is_correct,
    answer: row.answer as Record<string, unknown>,
    feedback: row.feedback as unknown as Record<string, unknown>,
    selfAssessment: row.self_assessment,
    attemptedAt: row.attempted_at,
  };
}

function toSummary(
  exercise: ExerciseRow,
  placement: Placement,
  stats: ExerciseStatsDto,
  tr: Translations,
): ExerciseSummaryDto {
  const [lessonTitle, courseTitle] = placementRefs(placement);
  return {
    id: exercise.id,
    type: exercise.type,
    difficulty: exercise.difficulty,
    question: tr.get(questionRef(exercise)),
    lesson: { id: placement.lesson.id, title: tr.get(lessonTitle) },
    course: {
      id: placement.course.id,
      slug: placement.course.slug,
      title: tr.get(courseTitle),
    },
    skill: {
      code: placement.skill?.code ?? '',
      name: placement.skill?.name ?? '',
    },
    stats,
  };
}

function toPromptDto(
  exercise: ExerciseRow,
  prompt: VisibleExercise['prompt'],
  tr: Translations,
): ExercisePromptDto {
  const translate = (kind: 'option' | 'item' | 'category', labels: Label[]) =>
    labels.map((label) => ({
      id: label.id,
      text: tr.get(exerciseText(exercise, `${kind}.${label.id}`, label.text)),
    }));
  if ('options' in prompt) {
    return {
      options: translate('option', prompt.options),
      multiple: prompt.multiple,
    };
  }
  if ('items' in prompt) {
    return {
      categories: translate('category', prompt.categories),
      items: translate('item', prompt.items),
    };
  }
  return {};
}

/** Review texts from the answer key (explanation, model answer, rubric). */
function reviewParts(
  exercise: ExerciseRow,
  answers: ExerciseAnswerRow,
  key: unknown,
) {
  const free = isFreeText(exercise.type)
    ? (key as AnswerKeyByType['scenario'])
    : null;
  const refs: TextRef[] = [
    exerciseText(exercise, 'explanation', answers.explanation),
  ];
  if (free) {
    refs.push(
      exerciseText(exercise, 'model_answer', free.modelAnswer),
      ...labelRefs(exercise, 'rubric', free.rubric),
    );
  }
  const build = (tr: Translations): ReviewDto => ({
    explanation: tr.get(refs[0]),
    modelAnswer: free ? tr.get(refs[1]) : null,
    rubric: free
      ? free.rubric.map((label) => ({
          id: label.id,
          text: tr.get(
            exerciseText(exercise, `rubric.${label.id}`, label.text),
          ),
        }))
      : [],
  });
  return { refs, build };
}

/**
 * Practice: exercises (published, in visible lessons), graded attempts and
 * attempt history. Answer keys are read with the service role only to grade
 * and to build the review of the user's own attempt; they never leave this
 * service.
 */
@Injectable()
export class PracticeService {
  constructor(
    private readonly content: ContentRepository,
    private readonly exercises: ExercisesRepository,
    private readonly answers: ExerciseAnswersRepository,
    private readonly attempts: AttemptsRepository,
    private readonly translations: ContentTranslationService,
  ) {}

  async listExercises(
    user: AuthUser,
    query: ListExercisesQueryDto,
  ): Promise<ExercisePageDto> {
    const { page, pageSize, lang } = query;
    const placements = await this.visibleLessons(user, query);
    const rows = await this.exercises.listForLessons(
      user.accessToken,
      [...placements.keys()],
      { types: query.type, difficulty: query.difficulty },
    );

    // Catalogue order: by lesson position, then the exercise's own order.
    const position = new Map(
      [...placements.keys()].map((id, index) => [id, index]),
    );
    const ordered = [...rows].sort(
      (a, b) =>
        position.get(a.lesson_id)! - position.get(b.lesson_id)! ||
        a.order_index - b.order_index ||
        a.id.localeCompare(b.id),
    );
    const pageRows = pageOf(ordered, { page, pageSize });

    const [scores, tr] = await Promise.all([
      this.attempts.listScores(
        user.accessToken,
        user.id,
        pageRows.map((row) => row.id),
      ),
      this.translations.translate(
        user,
        pageRows.flatMap((row) => [
          questionRef(row),
          ...placementRefs(placements.get(row.lesson_id)!),
        ]),
        lang,
      ),
    ]);
    return {
      items: pageRows.map((row) =>
        toSummary(
          row,
          placements.get(row.lesson_id)!,
          toStats(scores.filter((score) => score.exercise_id === row.id)),
          tr,
        ),
      ),
      total: ordered.length,
      page,
      pageSize: pageSize as PageSize,
      language: lang,
      translation: tr.status,
    };
  }

  async getExercise(
    user: AuthUser,
    id: string,
    lang: ContentLanguage,
  ): Promise<ExerciseDto> {
    const visible = await this.findVisible(user, id);
    const { exercise, prompt } = visible;
    const [scores, tr] = await Promise.all([
      this.attempts.listScores(user.accessToken, user.id, [exercise.id]),
      this.translations.translate(
        user,
        [...promptRefs(exercise, prompt), ...placementRefs(visible)],
        lang,
      ),
    ]);
    return {
      ...toSummary(exercise, visible, toStats(scores), tr),
      prompt: toPromptDto(exercise, prompt, tr),
      language: lang,
      translation: tr.status,
    };
  }

  async submitAttempt(
    user: AuthUser,
    id: string,
    dto: SubmitAttemptDto,
    lang: ContentLanguage,
  ): Promise<AttemptResultDto> {
    const { exercise, prompt } = await this.findVisible(user, id);
    const parsed = parseAnswer(exercise.type, prompt, dto.answer);
    if (!parsed.ok) {
      throw new BadRequestException({
        message: 'Validation failed',
        details: parsed.errors,
      });
    }

    const { row: answers, key } = await this.answerKey(exercise, prompt);
    const result = grade(exercise.type, prompt, key, parsed.value);
    // user_id from the verified token; score and feedback from the grader.
    const attempt = await this.attempts.insert({
      user_id: user.id,
      exercise_id: exercise.id,
      answer: parsed.value,
      score: result.score,
      is_correct: result.isCorrect,
      feedback: result.feedback,
    });

    // Translated after the insert: review translations are readable (RLS)
    // only once the user has attempted the exercise.
    const review = reviewParts(exercise, answers, key);
    const tr = await this.translations.translate(user, review.refs, lang);
    return {
      attempt: toAttemptDto(attempt),
      review: review.build(tr),
      language: lang,
      translation: tr.status,
    };
  }

  async listAttempts(
    user: AuthUser,
    id: string,
    {
      page,
      pageSize,
      lang,
    }: { page: number; pageSize: PageSize; lang: ContentLanguage },
  ): Promise<AttemptPageDto> {
    const { exercise, prompt } = await this.findVisible(user, id);
    const { rows, total } = await this.attempts.listForExercise(
      user.accessToken,
      user.id,
      exercise.id,
      { offset: (page - 1) * pageSize, limit: pageSize },
    );
    const base = { items: rows.map(toAttemptDto), total, page, pageSize };
    if (total === 0) {
      return { ...base, review: null, language: lang, translation: 'none' };
    }
    const { row: answers, key } = await this.answerKey(exercise, prompt);
    const review = reviewParts(exercise, answers, key);
    const tr = await this.translations.translate(user, review.refs, lang);
    return {
      ...base,
      review: review.build(tr),
      language: lang,
      translation: tr.status,
    };
  }

  async saveSelfAssessment(
    user: AuthUser,
    exerciseId: string,
    attemptId: string,
    dto: SaveSelfAssessmentDto,
  ): Promise<AttemptDto> {
    const { exercise, prompt } = await this.findVisible(user, exerciseId);
    const attempt = await this.attempts.find(
      user.accessToken,
      user.id,
      attemptId,
    );
    if (!attempt || attempt.exercise_id !== exercise.id) {
      throw new NotFoundException('Attempt not found');
    }
    if (!isFreeText(exercise.type)) {
      throw new BadRequestException(
        'This exercise type has no self-assessment',
      );
    }
    if (attempt.self_assessment) {
      throw new ConflictException('The self-assessment is already saved');
    }

    const { key } = await this.answerKey(exercise, prompt);
    const parsed = parseSelfAssessment(
      (key as AnswerKeyByType['scenario']).rubric,
      dto,
    );
    if (!parsed.ok) {
      throw new BadRequestException({
        message: 'Validation failed',
        details: parsed.errors,
      });
    }
    const saved = await this.attempts.saveSelfAssessment(
      user.accessToken,
      user.id,
      attempt.id,
      parsed.value,
    );
    // Saved by a concurrent request in between.
    if (!saved)
      throw new ConflictException('The self-assessment is already saved');
    return toAttemptDto(saved);
  }

  /**
   * Lessons a learner may see, in catalogue order, with their course and
   * skill. Narrowed by skill code or lesson id; unknown values give none.
   */
  private async visibleLessons(
    user: AuthUser,
    filter: { skill?: string; lessonId?: string },
  ): Promise<Map<string, Placement>> {
    const skills = await this.content.listSkills(user.accessToken);
    const placements = new Map<string, Placement>();
    const skillId = filter.skill
      ? skills.find((skill) => skill.code === filter.skill)?.id
      : undefined;
    if (filter.skill && !skillId) return placements;

    const courses = await this.content.listCourses(user.accessToken, {
      skillId,
    });
    const modules = await this.content.listModules(
      user.accessToken,
      courses.map((course) => course.id),
    );
    const lessons = await this.content.listLessons(
      user.accessToken,
      modules.map((module) => module.id),
    );
    const outlines = sortByCatalogueOrder(
      buildOutlines(courses, modules, lessons, skills),
    );
    for (const outline of outlines) {
      for (const lesson of outline.lessons) {
        if (filter.lessonId && lesson.id !== filter.lessonId) continue;
        placements.set(lesson.id, {
          lesson,
          course: outline.course,
          skill: outline.skill,
        });
      }
    }
    return placements;
  }

  /**
   * An exercise a learner may see: it, its lesson, module and course are all
   * published. Anything else is a 404, whatever the reason.
   */
  private async findVisible(
    user: AuthUser,
    id: string,
  ): Promise<VisibleExercise> {
    const exercise = await this.exercises.find(user.accessToken, id);
    const lesson =
      exercise &&
      (await this.content.findLesson(user.accessToken, exercise.lesson_id));
    const module =
      lesson &&
      (await this.content.findModule(user.accessToken, lesson.module_id));
    const [course] = module
      ? await this.content.listCourses(user.accessToken, {
          ids: [module.course_id],
        })
      : [];
    if (!exercise || !lesson || !module || !course) {
      throw new NotFoundException('Exercise not found');
    }
    const skills = await this.content.listSkills(user.accessToken);

    const prompt = parsePrompt(exercise.type, exercise.prompt_data);
    if (!prompt.ok) {
      // A plain Error: logged by the exception filter, a generic 500 for the
      // client.
      throw new Error(
        `Exercise ${exercise.id} has invalid prompt data: ${JSON.stringify(prompt.errors)}`,
      );
    }
    return {
      exercise,
      prompt: prompt.value,
      lesson,
      course,
      skill: skills.find((skill) => skill.id === course.skill_id),
    };
  }

  /** The validated answer key. A missing or broken key is a server error. */
  private async answerKey(
    exercise: ExerciseRow,
    prompt: VisibleExercise['prompt'],
  ): Promise<{ row: ExerciseAnswerRow; key: AnswerKeyByType[ExerciseType] }> {
    const row = await this.answers.find(exercise.id);
    const key = row && parseAnswerKey(exercise.type, prompt, row.answer_data);
    if (!row || !key?.ok) {
      // Field paths only: never log the key itself.
      const problem =
        key && !key.ok
          ? `invalid ${key.errors.map((error) => error.field).join(', ')}`
          : 'no answer key';
      throw new Error(`Exercise ${exercise.id} cannot be graded: ${problem}`);
    }
    return { row, key: key.value };
  }
}
