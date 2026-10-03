import { Alert, App, Button, Form, Tooltip } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { PageLoader } from '../../../components/feedback/PageLoader';
import { PageHeader } from '../../../components/PageHeader';
import { PageTrail } from '../../../components/PageTrail';
import { SideLayout } from '../../../components/SideLayout';
import { errorMessage } from '../../../hooks/useErrorMessage';
import { ApiError } from '../../../lib/api';
import { NotFoundPage } from '../../../pages/NotFoundPage';
import type { AdminCourse } from '../../../types/api';
import { applyFieldErrors } from '../../auth/form-helpers';
import { useSkills } from '../../learning/queries';
import styles from '../Admin.module.scss';
import { adminApi, type CourseStatusAction } from '../admin-api';
import {
  adminListPath,
  COURSE_FIELDS,
  type CourseFormValues,
} from '../content';
import { CourseFields } from '../CourseFields';
import { CourseOutline } from '../CourseOutline';
import { DeleteButton } from '../DeleteButton';
import { useAdminCourse, useAdminMutation } from '../queries';
import { StatusLine } from '../StatusLine';
import { TranslationLink } from '../TranslationLink';

/** Admin → course: details, publish / archive / delete, and the outline. */
export function AdminCoursePage() {
  const { courseId = '' } = useParams();
  const course = useAdminCourse(courseId);

  if (course.isPending) return <PageLoader />;
  if (course.error) {
    if (
      course.error instanceof ApiError &&
      (course.error.status === 404 || course.error.status === 400)
    ) {
      return <NotFoundPage />;
    }
    return (
      <>
        <CourseTrail />
        <ErrorState
          error={course.error}
          onRetry={() => void course.refetch()}
        />
      </>
    );
  }
  return <CourseEditor key={course.data.id} course={course.data} />;
}

function CourseTrail({ title }: { title?: string }) {
  const { t } = useTranslation();
  const listPath = adminListPath();
  return (
    <PageTrail
      back={{ to: listPath, label: t('admin.course.back') }}
      items={[
        { label: t('admin.courses.title'), to: listPath },
        ...(title ? [{ label: title }] : []),
      ]}
    />
  );
}

function CourseEditor({ course }: { course: AdminCourse }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <>
      <CourseTrail title={course.title} />
      <PageHeader
        title={course.title}
        description={
          <StatusLine
            status={course.status}
            visible={course.status === 'published'}
            inUse={course.inUse}
          />
        }
      />
      <SideLayout
        asideLabel={t('admin.pageActions')}
        aside={
          <StatusActions
            course={course}
            onDeleted={() => void navigate(adminListPath())}
          />
        }
      >
        {/* Keyed by the save time: a saved course refills the form. */}
        <CourseDetails key={course.updatedAt} course={course} />
        <CourseOutline course={course} />
      </SideLayout>
    </>
  );
}

function StatusActions({
  course,
  onDeleted,
}: {
  course: AdminCourse;
  onDeleted: () => void;
}) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const setStatus = useAdminMutation((action: CourseStatusAction) =>
    adminApi.setCourseStatus(course.id, action),
  );
  const remove = useAdminMutation(() => adminApi.deleteCourse(course.id));

  const run = (action: CourseStatusAction, done: string) =>
    setStatus.mutate(action, {
      onSuccess: () => void message.success(done),
      onError: (error) => void message.error(errorMessage(error, t)),
    });

  const publish = (
    <Button
      onClick={() => run('publish', t('admin.course.published'))}
      disabled={!course.canPublish}
      loading={setStatus.isPending && setStatus.variables === 'publish'}
      data-testid="publish-course"
    >
      {t('admin.course.publish')}
    </Button>
  );

  return (
    <div
      className={`${styles.actions} ${styles.pageActions}`}
      data-testid="course-actions"
    >
      {course.status !== 'published' &&
        (course.canPublish ? (
          publish
        ) : (
          <Tooltip title={t('admin.course.cannotPublish')}>{publish}</Tooltip>
        ))}
      {course.status !== 'draft' && (
        <Button
          onClick={() => run('unpublish', t('admin.course.unpublished'))}
          loading={setStatus.isPending && setStatus.variables === 'unpublish'}
          data-testid="unpublish-course"
        >
          {t('admin.course.unpublish')}
        </Button>
      )}
      {course.status !== 'archived' && (
        <Button
          onClick={() => run('archive', t('admin.course.archived'))}
          loading={setStatus.isPending && setStatus.variables === 'archive'}
          data-testid="archive-course"
        >
          {t('admin.course.archive')}
        </Button>
      )}
      <TranslationLink
        to={`/admin/courses/${course.id}/translation`}
        testId="translate-course"
      />
      <DeleteButton
        title={course.title}
        inUse={course.inUse}
        onDelete={() => remove.mutateAsync(undefined)}
        onDeleted={onDeleted}
        testId="delete-course"
      />
    </div>
  );
}

function CourseDetails({ course }: { course: AdminCourse }) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const skills = useSkills();
  const [form] = Form.useForm<CourseFormValues>();
  const [formError, setFormError] = useState<string | null>(null);
  const save = useAdminMutation((values: CourseFormValues) =>
    adminApi.updateCourse(course.id, values),
  );

  const initial: CourseFormValues = {
    skillId: course.skill.id,
    title: course.title,
    slug: course.slug,
    description: course.description,
  };

  const submit = (values: CourseFormValues) => {
    setFormError(null);
    // mutateAsync: the form remounts once the saved item is cached (it is
    // keyed by its save time), and mutate() callbacks would be dropped.
    void save.mutateAsync(values).then(
      () => void message.success(t('admin.saved')),
      (error) => {
        if (!applyFieldErrors(form, error, COURSE_FIELDS)) {
          setFormError(errorMessage(error, t));
        }
      },
    );
  };

  return (
    <section className={styles.section} aria-labelledby="course-details">
      <div className={styles.sectionHead}>
        <h2 id="course-details">{t('admin.course.details')}</h2>
      </div>
      {skills.isError ? (
        <ErrorState
          error={skills.error}
          onRetry={() => void skills.refetch()}
        />
      ) : (
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          initialValues={initial}
          onFinish={submit}
          className={styles.form}
          name="course"
          data-testid="course-form"
        >
          {formError && (
            <Alert
              className={styles.formAlert}
              type="error"
              title={formError}
            />
          )}
          <CourseFields
            form={form}
            skills={skills.data ?? []}
            autoSlug={false}
          />
          <Button
            type="primary"
            htmlType="submit"
            loading={save.isPending}
            className={styles.primaryAction}
            data-testid="save-course"
          >
            {t('admin.save')}
          </Button>
        </Form>
      )}
    </section>
  );
}
