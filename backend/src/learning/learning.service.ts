import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.js';
import {
  type ContentLanguage,
  ContentTranslationService,
  type TextRef,
  type Translations,
} from '../translation/content-translation.service.js';
import {
  ContentRepository,
  type CourseRow,
  type LessonRow,
  type LessonSummaryRow,
  type ModuleRow,
  type SkillRow,
} from './content.repository.js';
import {
  ContinueDto,
  CourseDetailDto,
  CoursePageDto,
  CourseSummaryDto,
  LessonDto,
  LessonProgressDto,
  type PageSize,
  SkillDto,
  UpdateLessonProgressDto,
} from './dto/learning.dto.js';
import {
  LessonProgressRepository,
  type LessonProgressRow,
} from './lesson-progress.repository.js';
import {
  buildOutlines,
  chooseContinue,
  type CourseOutline,
  neighbours,
  nextLesson,
  nextProgress,
  pageOf,
  type ProgressByLesson,
  sortByCatalogueOrder,
  sortCoursesByCatalogue,
  summarizeProgress,
} from './outline.js';

function toSkillDto(row: SkillRow): SkillDto {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    orderIndex: row.order_index,
  };
}

function toProgressDto(row: LessonProgressRow | undefined): LessonProgressDto {
  return {
    status: row?.status ?? 'not_started',
    progressPercent: row?.progress_percent ?? 0,
    startedAt: row?.started_at ?? null,
    completedAt: row?.completed_at ?? null,
    lastAccessedAt: row?.last_accessed_at ?? null,
  };
}

// Text refs: every content string a response shows, so it can be translated.

const courseText = (course: CourseRow, field: 'title' | 'description') => ({
  type: 'course' as const,
  id: course.id,
  field,
  text: course[field],
});

const moduleText = (module: ModuleRow, field: 'title' | 'description') => ({
  type: 'module' as const,
  id: module.id,
  field,
  text: module[field],
});

const lessonTitle = (lesson: LessonSummaryRow) => ({
  type: 'lesson' as const,
  id: lesson.id,
  field: 'title' as const,
  text: lesson.title,
});

function outlineRefs(outline: CourseOutline, withLessons: boolean): TextRef[] {
  const refs: TextRef[] = [
    courseText(outline.course, 'title'),
    courseText(outline.course, 'description'),
  ];
  if (withLessons) {
    for (const { module, lessons } of outline.modules) {
      refs.push(moduleText(module, 'title'), moduleText(module, 'description'));
      refs.push(...lessons.map(lessonTitle));
    }
  }
  return refs;
}

function toCourseSummary(
  outline: CourseOutline,
  progress: ProgressByLesson,
  tr: Translations,
): CourseSummaryDto {
  const { course, skill } = outline;
  return {
    id: course.id,
    slug: course.slug,
    title: tr.get(courseText(course, 'title')),
    description: tr.get(courseText(course, 'description')),
    skill: { code: skill?.code ?? '', name: skill?.name ?? '' },
    orderIndex: course.order_index,
    estimatedMinutes: outline.lessons.reduce(
      (sum, lesson) => sum + lesson.estimated_minutes,
      0,
    ),
    progress: summarizeProgress(outline, progress),
  };
}

function lessonRef(lesson: LessonSummaryRow | null, tr: Translations) {
  return lesson ? { id: lesson.id, title: tr.get(lessonTitle(lesson)) } : null;
}

function courseRef(course: CourseRow, tr: Translations) {
  return {
    id: course.id,
    slug: course.slug,
    title: tr.get(courseText(course, 'title')),
  };
}

export interface ListCoursesOptions {
  skill?: string;
  page: number;
  pageSize: PageSize;
  lang: ContentLanguage;
}

/**
 * Learner side of the catalogue: skills, courses, lessons and progress.
 * Content text is served in the language asked for (machine-translated and
 * cached when it is not English).
 */
@Injectable()
export class LearningService {
  constructor(
    private readonly content: ContentRepository,
    private readonly progress: LessonProgressRepository,
    private readonly translations: ContentTranslationService,
  ) {}

  async listSkills(user: AuthUser): Promise<SkillDto[]> {
    const skills = await this.content.listSkills(user.accessToken);
    return skills.map(toSkillDto);
  }

  async listCourses(
    user: AuthUser,
    { skill, page, pageSize, lang }: ListCoursesOptions,
  ): Promise<CoursePageDto> {
    const skills = await this.content.listSkills(user.accessToken);
    const skillId = skill
      ? skills.find((entry) => entry.code === skill)?.id
      : undefined;
    const courses =
      skill && !skillId
        ? []
        : await this.content.listCourses(user.accessToken, { skillId });

    // Order and slice the bare rows; load modules, lessons and progress only
    // for the courses on this page.
    const ordered = sortCoursesByCatalogue(courses, skills);
    const outlines = sortByCatalogueOrder(
      await this.loadOutlines(
        user,
        pageOf(ordered, { page, pageSize }),
        skills,
      ),
    );
    const [progress, tr] = await Promise.all([
      this.progressFor(user, outlines),
      this.translations.translate(
        user,
        outlines.flatMap((outline) => outlineRefs(outline, false)),
        lang,
      ),
    ]);
    return {
      items: outlines.map((outline) => toCourseSummary(outline, progress, tr)),
      total: ordered.length,
      page,
      pageSize,
      language: lang,
      translation: tr.status,
    };
  }

  async getCourse(
    user: AuthUser,
    slug: string,
    lang: ContentLanguage,
  ): Promise<CourseDetailDto> {
    const [course] = await this.content.listCourses(user.accessToken, {
      slug,
    });
    if (!course) throw new NotFoundException('Course not found');

    const [outline] = await this.loadOutlines(user, [course]);
    const [progress, tr] = await Promise.all([
      this.progressFor(user, [outline]),
      this.translations.translate(user, outlineRefs(outline, true), lang),
    ]);
    return {
      ...toCourseSummary(outline, progress, tr),
      modules: outline.modules.map(({ module, lessons }) => ({
        id: module.id,
        title: tr.get(moduleText(module, 'title')),
        description: tr.get(moduleText(module, 'description')),
        lessons: lessons.map((lesson) => ({
          id: lesson.id,
          slug: lesson.slug,
          title: tr.get(lessonTitle(lesson)),
          estimatedMinutes: lesson.estimated_minutes,
          progress: toProgressDto(progress.get(lesson.id)),
        })),
      })),
      nextLessonId: nextLesson(outline, progress)?.id ?? null,
      language: lang,
      translation: tr.status,
    };
  }

  async getLesson(
    user: AuthUser,
    lessonId: string,
    lang: ContentLanguage,
  ): Promise<LessonDto> {
    const { lesson, module, outline } = await this.findVisibleLesson(
      user,
      lessonId,
    );
    const { previous, next } = neighbours(outline, lesson.id);
    const content: TextRef = {
      type: 'lesson',
      id: lesson.id,
      field: 'content_md',
      text: lesson.content_md,
    };
    const [row, tr] = await Promise.all([
      this.progress.find(user.accessToken, user.id, lesson.id),
      this.translations.translate(
        user,
        [
          lessonTitle(lesson),
          content,
          courseText(outline.course, 'title'),
          moduleText(module, 'title'),
          ...[previous, next].filter((l) => l !== null).map(lessonTitle),
        ],
        lang,
      ),
    ]);
    return {
      id: lesson.id,
      slug: lesson.slug,
      title: tr.get(lessonTitle(lesson)),
      contentMd: tr.get(content),
      estimatedMinutes: lesson.estimated_minutes,
      course: courseRef(outline.course, tr),
      module: { id: module.id, title: tr.get(moduleText(module, 'title')) },
      previousLesson: lessonRef(previous, tr),
      nextLesson: lessonRef(next, tr),
      progress: toProgressDto(row ?? undefined),
      language: lang,
      translation: tr.status,
    };
  }

  async recordProgress(
    user: AuthUser,
    lessonId: string,
    dto: UpdateLessonProgressDto,
  ): Promise<LessonProgressDto> {
    // 404 for lessons the learner cannot see (draft, archived, unknown).
    await this.findVisibleLesson(user, lessonId);
    const existing = await this.progress.find(
      user.accessToken,
      user.id,
      lessonId,
    );
    const next = nextProgress(
      existing,
      dto,
      lessonId,
      new Date().toISOString(),
    );
    const saved = await this.progress.upsert(user.accessToken, {
      ...next,
      user_id: user.id,
    });
    return toProgressDto(saved);
  }

  async getContinue(
    user: AuthUser,
    lang: ContentLanguage,
  ): Promise<ContinueDto> {
    const courses = await this.content.listCourses(user.accessToken);
    const outlines = sortByCatalogueOrder(
      await this.loadOutlines(user, courses),
    );
    const recent = await this.progress.listForUser(user.accessToken, user.id);
    const choice = chooseContinue(outlines, recent);
    if (!choice) return { item: null, language: lang, translation: 'none' };

    const { outline, lesson, reason } = choice;
    const module = outline.modules.find(
      (entry) => entry.module.id === lesson.module_id,
    )!.module;
    const tr = await this.translations.translate(
      user,
      [
        lessonTitle(lesson),
        courseText(outline.course, 'title'),
        moduleText(module, 'title'),
      ],
      lang,
    );
    return {
      item: {
        reason,
        lessonId: lesson.id,
        lessonTitle: tr.get(lessonTitle(lesson)),
        estimatedMinutes: lesson.estimated_minutes,
        course: courseRef(outline.course, tr),
        module: { id: module.id, title: tr.get(moduleText(module, 'title')) },
        progress: toProgressDto(
          recent.find((row) => row.lesson_id === lesson.id),
        ),
      },
      language: lang,
      translation: tr.status,
    };
  }

  /**
   * A lesson a learner may see: the lesson, its module and its course are
   * all published. Anything else is a 404, whatever the reason.
   */
  private async findVisibleLesson(
    user: AuthUser,
    lessonId: string,
  ): Promise<{ lesson: LessonRow; module: ModuleRow; outline: CourseOutline }> {
    const lesson = await this.content.findLesson(user.accessToken, lessonId);
    const module =
      lesson &&
      (await this.content.findModule(user.accessToken, lesson.module_id));
    const [course] = module
      ? await this.content.listCourses(user.accessToken, {
          ids: [module.course_id],
        })
      : [];
    if (!lesson || !module || !course) {
      throw new NotFoundException('Lesson not found');
    }
    const [outline] = await this.loadOutlines(user, [course]);
    return { lesson, module, outline };
  }

  private async loadOutlines(
    user: AuthUser,
    courses: CourseRow[],
    skills?: SkillRow[],
  ): Promise<CourseOutline[]> {
    if (courses.length === 0) return [];
    const [modules, allSkills] = await Promise.all([
      this.content.listModules(
        user.accessToken,
        courses.map((course) => course.id),
      ),
      skills ?? this.content.listSkills(user.accessToken),
    ]);
    const lessons = await this.content.listLessons(
      user.accessToken,
      modules.map((module) => module.id),
    );
    return buildOutlines(courses, modules, lessons, allSkills);
  }

  private async progressFor(
    user: AuthUser,
    outlines: CourseOutline[],
  ): Promise<ProgressByLesson> {
    const lessonIds = outlines.flatMap((outline) =>
      outline.lessons.map((lesson) => lesson.id),
    );
    const rows = await this.progress.listForUser(
      user.accessToken,
      user.id,
      lessonIds,
    );
    return new Map(rows.map((row) => [row.lesson_id, row]));
  }
}
