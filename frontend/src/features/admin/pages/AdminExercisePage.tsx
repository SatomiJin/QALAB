import { Alert, App, Button, Form, Select } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { PageLoader } from '../../../components/feedback/PageLoader';
import { PageHeader } from '../../../components/PageHeader';
import { SideLayout } from '../../../components/SideLayout';
import { errorMessage } from '../../../hooks/useErrorMessage';
import { ApiError } from '../../../lib/api';
import { NotFoundPage } from '../../../pages/NotFoundPage';
import {
  type AdminCourseRef,
  type AdminExercise,
  CONTENT_LIMITS,
  DIFFICULTIES,
  EXERCISE_TYPES,
  type ExerciseType,
} from '../../../types/api';
import styles from '../Admin.module.scss';
import { adminApi } from '../admin-api';
import { DeleteButton } from '../DeleteButton';
import {
  emptyExerciseValues,
  exerciseFieldErrors,
  type ExerciseFormValues,
  toExercisePayload,
  toExerciseValues,
} from '../exercise-form';
import {
  ChoiceFields,
  ClassificationFields,
  FreeTextFields,
  MarkdownField,
} from '../ExerciseFields';
import { StatusSelect } from '../ModuleDialog';
import { useAdminExercise, useAdminLesson, useAdminMutation } from '../queries';
import { StatusLine } from '../StatusLine';
import { LessonTrail } from './AdminLessonPage';

const isExerciseType = (value: string | null): value is ExerciseType =>
  (EXERCISE_TYPES as readonly string[]).includes(value ?? '');

/** `/admin/lessons/:lessonId/exercises/new?type=…` */
export function AdminNewExercisePage() {
  const { lessonId = '' } = useParams();
  const [search] = useSearchParams();
  const type = search.get('type');
  const lesson = useAdminLesson(lessonId);

  if (!isExerciseType(type)) return <NotFoundPage />;
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
  return (
    <ExerciseEditor
      key={type}
      type={type}
      lesson={{
        id: lesson.data.id,
        title: lesson.data.title,
        course: lesson.data.course,
      }}
    />
  );
}

/** `/admin/exercises/:exerciseId` */
export function AdminExercisePage() {
  const { exerciseId = '' } = useParams();
  const exercise = useAdminExercise(exerciseId);

  if (exercise.isPending) return <PageLoader />;
  if (exercise.error) {
    if (
      exercise.error instanceof ApiError &&
      (exercise.error.status === 404 || exercise.error.status === 400)
    ) {
      return <NotFoundPage />;
    }
    return (
      <ErrorState
        error={exercise.error}
        onRetry={() => void exercise.refetch()}
      />
    );
  }
  const data = exercise.data;
  return (
    <ExerciseEditor
      key={`${data.id}-${data.updatedAt}`}
      type={data.type}
      exercise={data}
      lesson={{
        id: data.lesson.id,
        title: data.lesson.title,
        course: data.course,
      }}
    />
  );
}

interface EditorProps {
  type: ExerciseType;
  lesson: { id: string; title: string; course: AdminCourseRef };
  exercise?: AdminExercise;
}

function ExerciseEditor({ type, lesson, exercise }: EditorProps) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [form] = Form.useForm<ExerciseFormValues>();
  const [otherErrors, setOtherErrors] = useState<string[]>([]);
  const save = useAdminMutation((values: ExerciseFormValues) => {
    const payload = toExercisePayload(type, values);
    const body = {
      question: values.question,
      difficulty: values.difficulty,
      status: values.status,
      explanation: values.explanation,
      ...payload,
    };
    return exercise
      ? adminApi.updateExercise(exercise.id, body)
      : adminApi.createExercise(lesson.id, { type, ...body });
  });
  const remove = useAdminMutation(() => adminApi.deleteExercise(exercise!.id));
  // Stored answers point at label ids: once answered, rows stay as they are.
  const locked =
    exercise !== undefined &&
    exercise.inUse &&
    (type === 'multiple_choice' || type === 'classification');

  const title = exercise
    ? t('admin.exercise.editTitle')
    : t('admin.exercise.newTitle');

  const submit = () => {
    setOtherErrors([]);
    // Every stored value, including the generated label ids (no inputs).
    const values = form.getFieldsValue(true) as ExerciseFormValues;
    // mutateAsync: the form remounts once the saved item is cached (it is
    // keyed by its save time), and mutate() callbacks would be dropped.
    void save.mutateAsync(values).then(
      (saved) => {
        if (exercise) {
          void message.success(t('admin.saved'));
        } else {
          void message.success(t('admin.exercise.created'));
          void navigate(`/admin/exercises/${saved.id}`, { replace: true });
        }
      },
      (error) => {
        const { fields, other } = exerciseFieldErrors(error, values);
        form.setFields(fields as Parameters<typeof form.setFields>[0]);
        const rest =
          error instanceof ApiError && error.status === 400 ? other : [];
        setOtherErrors(
          fields.length === 0 && rest.length === 0
            ? [errorMessage(error, t)]
            : rest,
        );
      },
    );
  };

  return (
    <>
      <LessonTrail lesson={lesson} current={title} />
      <PageHeader
        title={title}
        description={
          exercise ? (
            <StatusLine
              status={exercise.status}
              visible={exercise.visibleToLearners}
              inUse={exercise.inUse}
            />
          ) : undefined
        }
      />
      <SideLayout
        asideLabel={t('admin.pageActions')}
        aside={
          <p className={styles.meta}>
            <span>
              {t('admin.fields.type')}: {t(`practice.types.${type}`)}
            </span>
            <span>{t('admin.exercise.typeHint')}</span>
          </p>
        }
      >
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          initialValues={
            exercise ? toExerciseValues(exercise) : emptyExerciseValues(type)
          }
          onFinish={submit}
          className={styles.exerciseForm}
          name="exercise"
          data-testid="exercise-form"
          scrollToFirstError
        >
          {otherErrors.length > 0 && (
            <Alert
              className={styles.formAlert}
              type="error"
              title={otherErrors.join(' ')}
              data-testid="exercise-form-error"
            />
          )}

          <section className={styles.section}>
            <MarkdownField
              name="question"
              label={t('admin.fields.question')}
              max={CONTENT_LIMITS.questionLength}
              required={t('admin.validation.question')}
              testId="exercise-question"
            />
            <div className={styles.fieldRow}>
              <Form.Item name="difficulty" label={t('admin.fields.difficulty')}>
                <Select
                  data-testid="exercise-difficulty"
                  options={DIFFICULTIES.map((value) => ({
                    value,
                    label: t(`practice.difficulty.${value}`),
                  }))}
                />
              </Form.Item>
              <Form.Item name="status" label={t('admin.fields.status')}>
                <StatusSelect testId="exercise-status" />
              </Form.Item>
            </div>
          </section>

          <section className={styles.section} aria-labelledby="answer-key">
            <div className={styles.sectionHead}>
              <h2 id="answer-key">{t('admin.exercise.answerKey')}</h2>
            </div>
            <p className={styles.muted}>{t('admin.exercise.answerKeyHint')}</p>
            {locked && (
              <Alert
                type="info"
                title={t('admin.exercise.locked')}
                data-testid="locked-note"
              />
            )}
            <div className={styles.form}>
              {type === 'multiple_choice' && (
                <ChoiceFields form={form} locked={locked} />
              )}
              {type === 'classification' && (
                <ClassificationFields form={form} locked={locked} />
              )}
            </div>
            {(type === 'test_case' ||
              type === 'bug_report' ||
              type === 'scenario') && (
              <FreeTextFields form={form} type={type} />
            )}
            <MarkdownField
              name="explanation"
              label={t('admin.fields.explanation')}
              extra={t('admin.fields.explanationHint')}
              max={CONTENT_LIMITS.explanationLength}
              testId="exercise-explanation"
            />
          </section>

          <div className={styles.actions}>
            <Button
              type="primary"
              htmlType="submit"
              loading={save.isPending}
              className={styles.primaryAction}
              data-testid="save-exercise"
            >
              {exercise ? t('admin.save') : t('admin.exercise.create')}
            </Button>
            <Button
              onClick={() => void navigate(`/admin/lessons/${lesson.id}`)}
            >
              {t('admin.cancel')}
            </Button>
            {exercise && (
              <DeleteButton
                title={t(`practice.types.${type}`)}
                inUse={exercise.inUse}
                onDelete={() => remove.mutateAsync(undefined)}
                onDeleted={() => void navigate(`/admin/lessons/${lesson.id}`)}
                testId="delete-exercise"
              />
            )}
          </div>
        </Form>
      </SideLayout>
    </>
  );
}
