import { EyeOutlined, PlusOutlined } from '@ant-design/icons';
import { Alert, App, Button, Dropdown, Form, Input, InputNumber } from 'antd';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { PageLoader } from '../../../components/feedback/PageLoader';
import { PageHeader } from '../../../components/PageHeader';
import { PageTrail } from '../../../components/PageTrail';
import { SideLayout } from '../../../components/SideLayout';
import { errorMessage } from '../../../hooks/useErrorMessage';
import { ApiError } from '../../../lib/api';
import { NotFoundPage } from '../../../pages/NotFoundPage';
import {
  type AdminExerciseSummary,
  type AdminLesson,
  CONTENT_LIMITS,
  type ContentStatus,
  EXERCISE_TYPES,
} from '../../../types/api';
import { applyFieldErrors } from '../../auth/form-helpers';
import { plainText } from '../../practice/kinds';
import styles from '../Admin.module.scss';
import { adminApi } from '../admin-api';
import { adminListPath } from '../content';
import { SlugField } from '../CourseFields';
import { DeleteButton } from '../DeleteButton';
import { MarkdownEditor } from '../MarkdownEditor';
import { StatusSelect } from '../ModuleDialog';
import { useAdminLesson, useAdminMutation } from '../queries';
import { SortableList } from '../SortableList';
import { StatusLine } from '../StatusLine';
import { StatusTag } from '../StatusTag';
import { TranslationLink } from '../TranslationLink';

interface LessonFormValues {
  title: string;
  slug: string;
  estimatedMinutes: number;
  status: ContentStatus;
  contentMd: string;
}

const FIELDS = ['title', 'slug', 'estimatedMinutes', 'status', 'contentMd'];

export function AdminLessonPage() {
  const { lessonId = '' } = useParams();
  const lesson = useAdminLesson(lessonId);

  if (lesson.isPending) return <PageLoader />;
  if (lesson.error) {
    if (
      lesson.error instanceof ApiError &&
      (lesson.error.status === 404 || lesson.error.status === 400)
    ) {
      return <NotFoundPage />;
    }
    return (
      <ErrorState error={lesson.error} onRetry={() => void lesson.refetch()} />
    );
  }
  return <LessonEditor key={lesson.data.id} lesson={lesson.data} />;
}

/** "Admin › Courses › Course › Lesson", back to the course. */
export function LessonTrail({
  lesson,
  current,
}: {
  lesson: Pick<AdminLesson, 'id' | 'title' | 'course'>;
  /** A page below the lesson (exercise, preview). */
  current?: string;
}) {
  const { t } = useTranslation();
  const coursePath = `/admin/courses/${lesson.course.id}`;
  const lessonPath = `/admin/lessons/${lesson.id}`;
  return (
    <PageTrail
      back={
        current
          ? { to: lessonPath, label: t('admin.exercise.back') }
          : { to: coursePath, label: t('admin.lesson.back') }
      }
      items={[
        { label: t('admin.courses.title'), to: adminListPath() },
        { label: lesson.course.title, to: coursePath },
        { label: lesson.title, to: lessonPath },
        ...(current ? [{ label: current }] : []),
      ]}
    />
  );
}

function LessonEditor({ lesson }: { lesson: AdminLesson }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const remove = useAdminMutation(() => adminApi.deleteLesson(lesson.id));

  return (
    <>
      <LessonTrail lesson={lesson} />
      <PageHeader
        title={lesson.title}
        description={
          <StatusLine
            status={lesson.status}
            visible={lesson.visibleToLearners}
            inUse={lesson.inUse}
          />
        }
      />
      <SideLayout
        asideLabel={t('admin.pageActions')}
        aside={
          <div className={`${styles.actions} ${styles.pageActions}`}>
            <Button
              icon={<EyeOutlined aria-hidden />}
              onClick={() =>
                void navigate(`/admin/lessons/${lesson.id}/preview`)
              }
              data-testid="preview-lesson"
            >
              {t('admin.lesson.previewAsLearner')}
            </Button>
            <TranslationLink
              to={`/admin/lessons/${lesson.id}/translation`}
              testId="translate-lesson"
            />
            <DeleteButton
              title={lesson.title}
              inUse={lesson.inUse}
              onDelete={() => remove.mutateAsync(undefined)}
              onDeleted={() =>
                void navigate(`/admin/courses/${lesson.course.id}`)
              }
              testId="delete-lesson"
            />
          </div>
        }
      >
        <LessonForm key={lesson.updatedAt} lesson={lesson} />
        <LessonExercises lesson={lesson} />
      </SideLayout>
    </>
  );
}

function LessonForm({ lesson }: { lesson: AdminLesson }) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [form] = Form.useForm<LessonFormValues>();
  const [formError, setFormError] = useState<string | null>(null);
  const save = useAdminMutation((values: LessonFormValues) =>
    adminApi.updateLesson(lesson.id, values),
  );

  const submit = (values: LessonFormValues) => {
    setFormError(null);
    // mutateAsync: the form remounts once the saved item is cached (it is
    // keyed by its save time), and mutate() callbacks would be dropped.
    void save.mutateAsync(values).then(
      () => void message.success(t('admin.saved')),
      (error) => {
        if (!applyFieldErrors(form, error, FIELDS)) {
          setFormError(errorMessage(error, t));
        }
      },
    );
  };

  return (
    <Form
      form={form}
      layout="vertical"
      requiredMark={false}
      initialValues={{
        title: lesson.title,
        slug: lesson.slug,
        estimatedMinutes: lesson.estimatedMinutes,
        status: lesson.status,
        contentMd: lesson.contentMd,
      }}
      onFinish={submit}
      name="lesson"
      data-testid="lesson-form"
    >
      {formError && (
        <Alert className={styles.formAlert} type="error" title={formError} />
      )}
      <div className={styles.form}>
        <Form.Item
          name="title"
          label={t('admin.fields.title')}
          rules={[
            {
              required: true,
              whitespace: true,
              message: t('admin.validation.title'),
            },
            {
              max: CONTENT_LIMITS.titleLength,
              message: t('admin.validation.max', {
                max: CONTENT_LIMITS.titleLength,
              }),
            },
          ]}
        >
          <Input data-testid="lesson-title" />
        </Form.Item>
        <SlugField />
        <div className={styles.fieldRow}>
          <Form.Item
            name="estimatedMinutes"
            label={t('admin.fields.minutes')}
            rules={[
              {
                required: true,
                type: 'integer',
                min: CONTENT_LIMITS.minutesMin,
                max: CONTENT_LIMITS.minutesMax,
                message: t('admin.validation.minutes', {
                  min: CONTENT_LIMITS.minutesMin,
                  max: CONTENT_LIMITS.minutesMax,
                }),
              },
            ]}
          >
            <InputNumber
              min={CONTENT_LIMITS.minutesMin}
              max={CONTENT_LIMITS.minutesMax}
              precision={0}
              className={styles.fullWidth}
              data-testid="lesson-minutes"
            />
          </Form.Item>
          <Form.Item name="status" label={t('admin.fields.status')}>
            <StatusSelect testId="lesson-status" />
          </Form.Item>
        </div>
      </div>
      <Form.Item
        name="contentMd"
        label={t('admin.fields.content')}
        rules={[
          {
            max: CONTENT_LIMITS.contentLength,
            message: t('admin.validation.max', {
              max: CONTENT_LIMITS.contentLength,
            }),
          },
        ]}
      >
        <MarkdownEditor
          maxLength={CONTENT_LIMITS.contentLength}
          testId="lesson-content-input"
        />
      </Form.Item>
      <Button
        type="primary"
        htmlType="submit"
        loading={save.isPending}
        className={styles.primaryAction}
        data-testid="save-lesson"
      >
        {t('admin.save')}
      </Button>
    </Form>
  );
}

function LessonExercises({ lesson }: { lesson: AdminLesson }) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const reorder = useAdminMutation((ids: string[]) =>
    adminApi.reorderExercises(lesson.id, { ids }),
  );

  return (
    <section
      className={`${styles.section} ${styles.sectionAfterForm}`}
      aria-labelledby="lesson-exercises"
    >
      <div className={styles.sectionHead}>
        <h2 id="lesson-exercises">{t('admin.lesson.exercises')}</h2>
        <Dropdown
          trigger={['click']}
          menu={{
            items: EXERCISE_TYPES.map((type) => ({
              key: type,
              label: t(`practice.types.${type}`),
            })),
            onClick: ({ key }) =>
              void navigate(
                `/admin/lessons/${lesson.id}/exercises/new?type=${key}`,
              ),
          }}
        >
          <Button
            icon={<PlusOutlined aria-hidden />}
            data-testid="add-exercise"
          >
            {t('admin.lesson.addExercise')}
          </Button>
        </Dropdown>
      </div>
      {lesson.exercises.length === 0 ? (
        <p className={styles.muted}>{t('admin.lesson.noExercises')}</p>
      ) : (
        <SortableList
          items={lesson.exercises}
          titleOf={(exercise) => plainText(exercise.question)}
          className={styles.cardsTight}
          testId="exercise-list"
          onReorder={(ids) =>
            reorder
              .mutateAsync(ids)
              .then(() => message.success(t('admin.reorder.saved')))
              .catch((error: unknown) => {
                void message.error(errorMessage(error, t));
                throw error;
              })
          }
          renderItem={(exercise, _index, handle) => (
            <ExerciseCard exercise={exercise} controls={handle.controls} />
          )}
        />
      )}
    </section>
  );
}

function ExerciseCard({
  exercise,
  controls,
}: {
  exercise: AdminExerciseSummary;
  controls: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <article className={styles.card} data-testid="admin-exercise">
      {controls}
      <div className={styles.cardBody}>
        <Link
          to={`/admin/exercises/${exercise.id}`}
          className={`${styles.cardLink} ${styles.clamp}`}
        >
          {plainText(exercise.question)}
        </Link>
        <p className={styles.meta}>
          <span>{t(`practice.types.${exercise.type}`)}</span>
          <span>{t(`practice.difficulty.${exercise.difficulty}`)}</span>
          {exercise.inUse && <span>{t('admin.inUse')}</span>}
        </p>
      </div>
      <StatusTag status={exercise.status} />
    </article>
  );
}
