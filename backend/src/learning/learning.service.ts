import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.js';
import {
  type ContentLanguage,
  ContentTranslationService,
  type TextRef,
} from '../translation/content-translation.service.js';
import {
  ContentRepository,
  type CourseRow,
  type LessonRow,
  type ModuleRow,
  type SkillRow,
} from './content.repository.js';
import {
  ContinueDto,
  CourseDetailDto,
  CoursePageDto,
  LessonDto,
  LessonProgressDto,
  type PageSize,
  SkillDto,
  UpdateLessonProgressDto,
} from './dto/learning.dto.js';
import { LessonProgressRepository } from './lesson-progress.repository.js';
import {
  continueRefs,
  courseRef,
  courseText,
  lessonRef,
  lessonTitle,
  moduleText,
  outlineRefs,
  toContinueItem,
  toCourseSummary,
  toProgressDto,
} from './mapping.js';
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
    const { outlines, total } = await this.loadCoursePage(user, {
      skill,
      page,
      pageSize,
    });
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
      total,
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
    const outlines = await this.loadCatalogue(user);
    const recent = await this.progress.listForUser(user.accessToken, user.id);
    const choice = chooseContinue(outlines, recent);
    if (!choice) return { item: null, language: lang, translation: 'none' };

    const tr = await this.translations.translate(
      user,
      continueRefs(choice),
      lang,
    );
    return {
      item: toContinueItem(choice, recent, tr),
      language: lang,
      translation: tr.status,
    };
  }

  /**
   * One page of published courses in catalogue order, with their modules and
   * lessons, and the number of courses matching the filter. An unknown skill
   * code gives an empty page.
   */
  async loadCoursePage(
    user: AuthUser,
    {
      skill,
      page,
      pageSize,
    }: { skill?: string; page: number; pageSize: number },
  ): Promise<{ outlines: CourseOutline[]; total: number }> {
    const skills = await this.content.listSkills(user.accessToken);
    const skillId = skill
      ? skills.find((entry) => entry.code === skill)?.id
      : undefined;
    const courses =
      skill && !skillId
        ? []
        : await this.content.listCourses(user.accessToken, { skillId });

    // Order and slice the bare rows; load modules and lessons only for the
    // courses on this page.
    const ordered = sortCoursesByCatalogue(courses, skills);
    const outlines = sortByCatalogueOrder(
      await this.loadOutlines(
        user,
        pageOf(ordered, { page, pageSize }),
        skills,
      ),
    );
    return { outlines, total: ordered.length };
  }

  /** Every published course with its modules and lessons, in catalogue order. */
  async loadCatalogue(user: AuthUser): Promise<CourseOutline[]> {
    const courses = await this.content.listCourses(user.accessToken);
    return sortByCatalogueOrder(await this.loadOutlines(user, courses));
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
