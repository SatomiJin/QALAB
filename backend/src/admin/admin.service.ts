import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.js';
import {
  isPgError,
  PG_FOREIGN_KEY_VIOLATION,
  PG_UNIQUE_VIOLATION,
} from '../common/errors/pg-error.js';
import {
  ContentRepository,
  type SkillRow,
} from '../learning/content.repository.js';
import { pageOf, sortCoursesByCatalogue } from '../learning/outline.js';
import {
  type AdminCourseRow,
  AdminContentRepository,
  type AdminExerciseRow,
  type AdminLessonRow,
  type AdminLessonSummaryRow,
  type AdminModuleRow,
} from './admin-content.repository.js';
import {
  canPublishCourse,
  checkReorder,
  type ContentKind,
  type ContentStatus,
  inUseIds,
  nextOrderIndex,
} from './content-rules.js';
import type {
  AdminCourseDto,
  AdminCoursePageDto,
  AdminCourseSummaryDto,
  AdminExerciseSummaryDto,
  AdminLessonDto,
  AdminLessonSummaryDto,
  AdminModuleDto,
  AdminSkillRefDto,
  CreateCourseDto,
  CreateLessonDto,
  CreateModuleDto,
  ListAdminCoursesQueryDto,
  ReorderCoursesDto,
  ReorderDto,
  UpdateCourseDto,
  UpdateLessonDto,
  UpdateModuleDto,
} from './dto/admin.dto.js';

export const IN_USE_MESSAGE =
  'Learners have progress or attempts here. Archive it instead.';

/** A course with everything under it and which nodes hold learner data. */
interface CourseTree {
  course: AdminCourseRow;
  modules: AdminModuleRow[];
  lessons: AdminLessonSummaryRow[];
  exercises: AdminExerciseRow[];
  used: Set<string>;
}

const hasKeys = (dto: object) =>
  Object.values(dto).some((value) => value !== undefined);

/** Drops undefined fields so a PATCH only writes what was sent. */
export function definedOnly<T extends object>(patch: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

export function toExerciseSummary(
  row: AdminExerciseRow,
  used: ReadonlySet<string>,
): AdminExerciseSummaryDto {
  return {
    id: row.id,
    type: row.type,
    difficulty: row.difficulty,
    question: row.question,
    promptData: row.prompt_data as Record<string, unknown>,
    status: row.status,
    orderIndex: row.order_index,
    inUse: used.has(row.id),
  };
}

function toLessonSummary(
  row: AdminLessonSummaryRow,
  exercises: AdminExerciseRow[],
  used: ReadonlySet<string>,
): AdminLessonSummaryDto {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    estimatedMinutes: row.estimated_minutes,
    status: row.status,
    orderIndex: row.order_index,
    inUse: used.has(row.id),
    exercises: exercises
      .filter((exercise) => exercise.lesson_id === row.id)
      .map((exercise) => toExerciseSummary(exercise, used)),
  };
}

function toModuleDto(
  row: AdminModuleRow,
  tree: Pick<CourseTree, 'lessons' | 'exercises' | 'used'>,
): AdminModuleDto {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    orderIndex: row.order_index,
    inUse: tree.used.has(row.id),
    lessons: tree.lessons
      .filter((lesson) => lesson.module_id === row.id)
      .map((lesson) => toLessonSummary(lesson, tree.exercises, tree.used)),
  };
}

function toSkillRef(skills: SkillRow[], id: string): AdminSkillRefDto {
  const skill = skills.find((entry) => entry.id === id);
  if (!skill) throw new Error(`Course skill ${id} does not exist`);
  return { id: skill.id, code: skill.code, name: skill.name };
}

const slugConflict = (message: string) =>
  new ConflictException({
    message: 'Slug already used',
    details: [{ field: 'slug', message }],
  });

/**
 * Admin CMS for courses, modules and lessons. Everything runs as the admin
 * (RLS `is_admin()`); the controller's `@Roles('admin')` checked first.
 */
@Injectable()
export class AdminService {
  constructor(
    private readonly repo: AdminContentRepository,
    private readonly content: ContentRepository,
  ) {}

  // Courses -----------------------------------------------------------------

  async listCourses(
    user: AuthUser,
    query: ListAdminCoursesQueryDto,
  ): Promise<AdminCoursePageDto> {
    const { page, pageSize } = query;
    const skills = await this.content.listSkills(user.accessToken);
    const skill = query.skill
      ? skills.find((entry) => entry.code === query.skill)
      : undefined;
    if (query.skill && !skill) return { items: [], total: 0, page, pageSize };

    const rows = sortCoursesByCatalogue(
      await this.repo.listCourses(user.accessToken, {
        skillId: skill?.id,
        status: query.status,
      }),
      skills,
    );
    const courses = pageOf(rows, { page, pageSize });
    const modules = await this.repo.listModules(
      user.accessToken,
      courses.map((course) => course.id),
    );
    const lessons = await this.repo.listLessons(
      user.accessToken,
      modules.map((module) => module.id),
    );

    const items = courses.map((course): AdminCourseSummaryDto => {
      const own = modules.filter((module) => module.course_id === course.id);
      const ownLessons = lessons.filter((lesson) =>
        own.some((module) => module.id === lesson.module_id),
      );
      const published = ownLessons.filter(
        (lesson) =>
          lesson.status === 'published' &&
          own.find((module) => module.id === lesson.module_id)?.status ===
            'published',
      );
      return {
        id: course.id,
        slug: course.slug,
        title: course.title,
        description: course.description,
        status: course.status,
        orderIndex: course.order_index,
        skill: toSkillRef(skills, course.skill_id),
        moduleCount: own.length,
        lessonCount: ownLessons.length,
        publishedLessonCount: published.length,
        updatedAt: course.updated_at,
      };
    });
    return { items, total: rows.length, page, pageSize };
  }

  async getCourse(user: AuthUser, id: string): Promise<AdminCourseDto> {
    const course = await this.findOr404(user, 'course', id);
    return this.toCourseDto(user, await this.loadTree(user, course));
  }

  async createCourse(
    user: AuthUser,
    dto: CreateCourseDto,
  ): Promise<AdminCourseDto> {
    await this.requireSkill(user, dto.skillId);
    const siblings = await this.repo.listCourses(user.accessToken, {
      skillId: dto.skillId,
    });
    const row = await this.courseWrite(() =>
      this.repo.insert(user.accessToken, 'course', {
        skill_id: dto.skillId,
        title: dto.title,
        slug: dto.slug,
        description: dto.description ?? '',
        status: 'draft',
        order_index: nextOrderIndex(siblings),
      }),
    );
    return this.getCourse(user, row.id);
  }

  async updateCourse(
    user: AuthUser,
    id: string,
    dto: UpdateCourseDto,
  ): Promise<AdminCourseDto> {
    const course = await this.findOr404(user, 'course', id);
    if (!hasKeys(dto)) return this.getCourse(user, id);

    let order_index: number | undefined;
    if (dto.skillId && dto.skillId !== course.skill_id) {
      await this.requireSkill(user, dto.skillId);
      order_index = nextOrderIndex(
        await this.repo.listCourses(user.accessToken, { skillId: dto.skillId }),
      );
    }
    await this.courseWrite(() =>
      this.repo.update(
        user.accessToken,
        'course',
        id,
        definedOnly({
          skill_id: dto.skillId,
          title: dto.title,
          slug: dto.slug,
          description: dto.description,
          order_index,
        }),
      ),
    );
    return this.getCourse(user, id);
  }

  async setCourseStatus(
    user: AuthUser,
    id: string,
    status: ContentStatus,
  ): Promise<AdminCourseDto> {
    const course = await this.findOr404(user, 'course', id);
    const tree = await this.loadTree(user, course);
    if (status === 'published' && !this.canPublish(tree)) {
      throw new ConflictException(
        'Publish at least one lesson in a published module first',
      );
    }
    if (course.status !== status) {
      await this.repo.update(user.accessToken, 'course', id, { status });
    }
    return this.getCourse(user, id);
  }

  async deleteCourse(user: AuthUser, id: string): Promise<void> {
    const course = await this.findOr404(user, 'course', id);
    const tree = await this.loadTree(user, course);
    const inUse = tree.modules.some((module) => tree.used.has(module.id));
    await this.removeUnused(user, 'course', id, inUse);
  }

  async reorderCourses(user: AuthUser, dto: ReorderCoursesDto): Promise<void> {
    await this.requireSkill(user, dto.skillId);
    const siblings = await this.repo.listCourses(user.accessToken, {
      skillId: dto.skillId,
    });
    await this.reorder(user, 'course', dto.skillId, siblings, dto);
  }

  // Modules -----------------------------------------------------------------

  async createModule(
    user: AuthUser,
    courseId: string,
    dto: CreateModuleDto,
  ): Promise<AdminModuleDto> {
    await this.findOr404(user, 'course', courseId);
    const siblings = await this.repo.listModules(user.accessToken, [courseId]);
    const row = await this.repo.insert(user.accessToken, 'module', {
      course_id: courseId,
      title: dto.title,
      description: dto.description ?? '',
      status: dto.status ?? 'draft',
      order_index: nextOrderIndex(siblings),
    });
    return toModuleDto(row, { lessons: [], exercises: [], used: new Set() });
  }

  async updateModule(
    user: AuthUser,
    id: string,
    dto: UpdateModuleDto,
  ): Promise<AdminModuleDto> {
    const module = await this.findOr404(user, 'module', id);
    const updated = hasKeys(dto)
      ? await this.repo.update(user.accessToken, 'module', id, definedOnly(dto))
      : module;
    if (!updated) throw new NotFoundException('Module not found');
    const tree = await this.loadTreeOf(user, updated.course_id);
    return toModuleDto(updated, tree);
  }

  async deleteModule(user: AuthUser, id: string): Promise<void> {
    const module = await this.findOr404(user, 'module', id);
    const tree = await this.loadTreeOf(user, module.course_id);
    await this.removeUnused(user, 'module', id, tree.used.has(id));
  }

  async reorderModules(
    user: AuthUser,
    courseId: string,
    dto: ReorderDto,
  ): Promise<void> {
    await this.findOr404(user, 'course', courseId);
    const siblings = await this.repo.listModules(user.accessToken, [courseId]);
    await this.reorder(user, 'module', courseId, siblings, dto);
  }

  // Lessons -----------------------------------------------------------------

  async getLesson(user: AuthUser, id: string): Promise<AdminLessonDto> {
    const lesson = await this.findOr404(user, 'lesson', id);
    const module = await this.findOr404(user, 'module', lesson.module_id);
    const course = await this.findOr404(user, 'course', module.course_id);
    const exercises = await this.repo.listExercises(user.accessToken, [id]);
    const usage = await this.repo.usage(
      user.accessToken,
      [id],
      exercises.map((exercise) => exercise.id),
    );
    const used = inUseIds(
      [{ id: module.id, lessons: [{ id, exercises }] }],
      usage,
    );
    return toLessonDto(lesson, module, course, exercises, used);
  }

  async createLesson(
    user: AuthUser,
    moduleId: string,
    dto: CreateLessonDto,
  ): Promise<AdminLessonDto> {
    await this.findOr404(user, 'module', moduleId);
    const siblings = await this.repo.listLessons(user.accessToken, [moduleId]);
    const row = await this.lessonWrite(() =>
      this.repo.insert(user.accessToken, 'lesson', {
        module_id: moduleId,
        title: dto.title,
        slug: dto.slug,
        content_md: dto.contentMd ?? '',
        estimated_minutes: dto.estimatedMinutes ?? 5,
        status: dto.status ?? 'draft',
        order_index: nextOrderIndex(siblings),
      }),
    );
    return this.getLesson(user, row.id);
  }

  async updateLesson(
    user: AuthUser,
    id: string,
    dto: UpdateLessonDto,
  ): Promise<AdminLessonDto> {
    await this.findOr404(user, 'lesson', id);
    if (hasKeys(dto)) {
      await this.lessonWrite(() =>
        this.repo.update(
          user.accessToken,
          'lesson',
          id,
          definedOnly({
            title: dto.title,
            slug: dto.slug,
            content_md: dto.contentMd,
            estimated_minutes: dto.estimatedMinutes,
            status: dto.status,
          }),
        ),
      );
    }
    return this.getLesson(user, id);
  }

  async deleteLesson(user: AuthUser, id: string): Promise<void> {
    const lesson = await this.getLesson(user, id);
    await this.removeUnused(user, 'lesson', id, lesson.inUse);
  }

  async reorderLessons(
    user: AuthUser,
    moduleId: string,
    dto: ReorderDto,
  ): Promise<void> {
    await this.findOr404(user, 'module', moduleId);
    const siblings = await this.repo.listLessons(user.accessToken, [moduleId]);
    await this.reorder(user, 'lesson', moduleId, siblings, dto);
  }

  // Shared ------------------------------------------------------------------

  /** The row, whatever its status; 404 when it does not exist. */
  async findOr404<K extends ContentKind>(user: AuthUser, kind: K, id: string) {
    const row = await this.repo.find(user.accessToken, kind, id);
    if (!row) {
      const name = kind.charAt(0).toUpperCase() + kind.slice(1);
      throw new NotFoundException(`${name} not found`);
    }
    return row;
  }

  /** Checks a complete new order, then writes it in one statement. */
  async reorder(
    user: AuthUser,
    kind: ContentKind,
    parentId: string,
    siblings: { id: string }[],
    dto: ReorderDto,
  ): Promise<void> {
    const errors = checkReorder(
      siblings.map((row) => row.id),
      dto.ids,
    );
    if (errors.length) {
      throw new BadRequestException({
        message: 'Validation failed',
        details: errors,
      });
    }
    await this.repo.reorder(user.accessToken, kind, parentId, dto.ids);
  }

  /**
   * Hard delete, only for content without learner data. The `restrict`
   * foreign keys catch the race where a learner starts in between.
   */
  async removeUnused(
    user: AuthUser,
    kind: ContentKind,
    id: string,
    inUse: boolean,
  ): Promise<void> {
    if (inUse) throw new ConflictException(IN_USE_MESSAGE);
    try {
      await this.repo.remove(user.accessToken, kind, id);
    } catch (error) {
      if (isPgError(error, PG_FOREIGN_KEY_VIOLATION)) {
        throw new ConflictException(IN_USE_MESSAGE);
      }
      throw error;
    }
  }

  private canPublish(tree: CourseTree): boolean {
    return canPublishCourse(
      tree.modules.map((module) => ({
        status: module.status,
        lessons: tree.lessons.filter(
          (lesson) => lesson.module_id === module.id,
        ),
      })),
    );
  }

  private async requireSkill(user: AuthUser, skillId: string): Promise<void> {
    const skills = await this.content.listSkills(user.accessToken);
    if (!skills.some((skill) => skill.id === skillId)) {
      throw new BadRequestException({
        message: 'Validation failed',
        details: [{ field: 'skillId', message: 'skillId is not a skill' }],
      });
    }
  }

  private async loadTreeOf(user: AuthUser, courseId: string) {
    const course = await this.findOr404(user, 'course', courseId);
    return this.loadTree(user, course);
  }

  private async loadTree(
    user: AuthUser,
    course: AdminCourseRow,
  ): Promise<CourseTree> {
    const token = user.accessToken;
    const modules = await this.repo.listModules(token, [course.id]);
    const lessons = await this.repo.listLessons(
      token,
      modules.map((module) => module.id),
    );
    const exercises = await this.repo.listExercises(
      token,
      lessons.map((lesson) => lesson.id),
    );
    const usage = await this.repo.usage(
      token,
      lessons.map((lesson) => lesson.id),
      exercises.map((exercise) => exercise.id),
    );
    const used = inUseIds(
      modules.map((module) => ({
        id: module.id,
        lessons: lessons
          .filter((lesson) => lesson.module_id === module.id)
          .map((lesson) => ({
            id: lesson.id,
            exercises: exercises.filter((e) => e.lesson_id === lesson.id),
          })),
      })),
      usage,
    );
    return { course, modules, lessons, exercises, used };
  }

  private async toCourseDto(
    user: AuthUser,
    tree: CourseTree,
  ): Promise<AdminCourseDto> {
    const { course } = tree;
    const skills = await this.content.listSkills(user.accessToken);
    return {
      id: course.id,
      slug: course.slug,
      title: course.title,
      description: course.description,
      status: course.status,
      orderIndex: course.order_index,
      inUse: tree.modules.some((module) => tree.used.has(module.id)),
      skill: toSkillRef(skills, course.skill_id),
      canPublish: this.canPublish(tree),
      createdAt: course.created_at,
      updatedAt: course.updated_at,
      modules: tree.modules.map((module) => toModuleDto(module, tree)),
    };
  }

  private async courseWrite<T>(write: () => Promise<T>): Promise<T> {
    try {
      return await write();
    } catch (error) {
      if (isPgError(error, PG_UNIQUE_VIOLATION)) {
        throw slugConflict('slug is already used by another course');
      }
      throw error;
    }
  }

  private async lessonWrite<T>(write: () => Promise<T>): Promise<T> {
    try {
      return await write();
    } catch (error) {
      if (isPgError(error, PG_UNIQUE_VIOLATION)) {
        throw slugConflict(
          'slug is already used by another lesson in this module',
        );
      }
      throw error;
    }
  }
}

function toLessonDto(
  lesson: AdminLessonRow,
  module: AdminModuleRow,
  course: AdminCourseRow,
  exercises: AdminExerciseRow[],
  used: ReadonlySet<string>,
): AdminLessonDto {
  return {
    id: lesson.id,
    slug: lesson.slug,
    title: lesson.title,
    contentMd: lesson.content_md,
    estimatedMinutes: lesson.estimated_minutes,
    status: lesson.status,
    orderIndex: lesson.order_index,
    inUse: used.has(lesson.id),
    visibleToLearners: [lesson, module, course].every(
      (row) => row.status === 'published',
    ),
    module: { id: module.id, title: module.title, status: module.status },
    course: {
      id: course.id,
      slug: course.slug,
      title: course.title,
      status: course.status,
    },
    exercises: exercises.map((exercise) => toExerciseSummary(exercise, used)),
    createdAt: lesson.created_at,
    updatedAt: lesson.updated_at,
  };
}
