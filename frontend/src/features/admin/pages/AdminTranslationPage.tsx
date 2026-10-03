import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { PageLoader } from '../../../components/feedback/PageLoader';
import { PageTrail } from '../../../components/PageTrail';
import { ApiError } from '../../../lib/api';
import { NotFoundPage } from '../../../pages/NotFoundPage';
import { plainText } from '../../practice/kinds';
import { adminListPath } from '../content';
import { useAdminCourse, useAdminExercise, useAdminLesson } from '../queries';
import { TranslationEditor } from '../TranslationEditor';
import { LessonTrail } from './AdminLessonPage';

/** Not found (or a malformed id): the bug-report page, else an error state. */
function failed(error: Error, retry: () => void) {
  if (
    error instanceof ApiError &&
    (error.status === 404 || error.status === 400)
  ) {
    return <NotFoundPage />;
  }
  return <ErrorState error={error} onRetry={retry} />;
}

/** "Admin › Courses › Course › [Module ›] Vietnamese translation". */
function CourseTrail({
  course,
  module,
}: {
  course: { id: string; title: string };
  module?: string;
}) {
  const { t } = useTranslation();
  const coursePath = `/admin/courses/${course.id}`;
  return (
    <PageTrail
      back={{ to: coursePath, label: t('admin.lesson.back') }}
      items={[
        { label: t('admin.courses.title'), to: adminListPath() },
        { label: course.title, to: coursePath },
        ...(module ? [{ label: module }] : []),
        { label: t('admin.translation.title') },
      ]}
    />
  );
}

/** `/admin/courses/:courseId/translation` */
export function AdminCourseTranslationPage() {
  const { courseId = '' } = useParams();
  const course = useAdminCourse(courseId);
  if (course.isPending) return <PageLoader />;
  if (course.isError) return failed(course.error, () => void course.refetch());
  return (
    <TranslationEditor
      kind="course"
      id={course.data.id}
      itemTitle={course.data.title}
      trail={<CourseTrail course={course.data} />}
    />
  );
}

/** `/admin/courses/:courseId/modules/:moduleId/translation` */
export function AdminModuleTranslationPage() {
  const { courseId = '', moduleId = '' } = useParams();
  const course = useAdminCourse(courseId);
  if (course.isPending) return <PageLoader />;
  if (course.isError) return failed(course.error, () => void course.refetch());
  const module = course.data.modules.find((entry) => entry.id === moduleId);
  if (!module) return <NotFoundPage />;
  return (
    <TranslationEditor
      kind="module"
      id={module.id}
      itemTitle={module.title}
      trail={<CourseTrail course={course.data} module={module.title} />}
    />
  );
}

/** `/admin/lessons/:lessonId/translation` */
export function AdminLessonTranslationPage() {
  const { t } = useTranslation();
  const { lessonId = '' } = useParams();
  const lesson = useAdminLesson(lessonId);
  if (lesson.isPending) return <PageLoader />;
  if (lesson.isError) return failed(lesson.error, () => void lesson.refetch());
  return (
    <TranslationEditor
      kind="lesson"
      id={lesson.data.id}
      itemTitle={lesson.data.title}
      trail={
        <LessonTrail
          lesson={lesson.data}
          current={t('admin.translation.title')}
        />
      }
    />
  );
}

/** `/admin/exercises/:exerciseId/translation` */
export function AdminExerciseTranslationPage() {
  const { t } = useTranslation();
  const { exerciseId = '' } = useParams();
  const exercise = useAdminExercise(exerciseId);
  if (exercise.isPending) return <PageLoader />;
  if (exercise.isError) {
    return failed(exercise.error, () => void exercise.refetch());
  }
  const data = exercise.data;
  const exercisePath = `/admin/exercises/${data.id}`;
  return (
    <TranslationEditor
      kind="exercise"
      id={data.id}
      itemTitle={plainText(data.question)}
      trail={
        <PageTrail
          back={{
            to: exercisePath,
            label: t('admin.translation.backToExercise'),
          }}
          items={[
            { label: t('admin.courses.title'), to: adminListPath() },
            {
              label: data.course.title,
              to: `/admin/courses/${data.course.id}`,
            },
            {
              label: data.lesson.title,
              to: `/admin/lessons/${data.lesson.id}`,
            },
            { label: t('admin.exercise.editTitle'), to: exercisePath },
            { label: t('admin.translation.title') },
          ]}
        />
      }
    />
  );
}
