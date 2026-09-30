import { PlusOutlined } from '@ant-design/icons';
import { App, Button, Select } from 'antd';
import { type ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { PageLoader } from '../../../components/feedback/PageLoader';
import { ListPager } from '../../../components/ListPager';
import { PageHeader } from '../../../components/PageHeader';
import { errorMessage } from '../../../hooks/useErrorMessage';
import {
  type AdminCourseSummary,
  CONTENT_STATUSES,
  type ContentStatus,
  type Skill,
} from '../../../types/api';
import { lastPage } from '../../learning/list-params';
import { useSkills } from '../../learning/queries';
import { useSkillText } from '../../learning/useSkillText';
import styles from '../Admin.module.scss';
import { adminApi } from '../admin-api';
import {
  type AdminListParams,
  adminListSearch,
  parseAdminListParams,
  rememberAdminList,
} from '../content';
import { NewCourseDialog } from '../NewCourseDialog';
import { useAdminCourses, useAdminMutation } from '../queries';
import { type ReorderHandle, SortableList } from '../SortableList';
import { StatusTag } from '../StatusTag';

/** Admin → Courses: every course in every status, filterable. */
export function AdminCoursesPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [search] = useSearchParams();
  const params = parseAdminListParams(search);
  const skills = useSkills();
  const courses = useAdminCourses(params);
  const [creating, setCreating] = useState(false);
  const reorder = useAdminMutation((vars: { skillId: string; ids: string[] }) =>
    adminApi.reorderCourses(vars.skillId, vars.ids),
  );

  useEffect(() => {
    rememberAdminList(location.search);
  }, [location.search]);

  const go = (target: AdminListParams) =>
    navigate({
      pathname: '/admin/courses',
      search: adminListSearch(target).toString(),
    });

  const data = courses.data;
  useEffect(() => {
    if (!data || data.items.length > 0 || data.total === 0 || params.page === 1)
      return;
    void navigate(
      {
        pathname: '/admin/courses',
        search: adminListSearch({
          ...params,
          page: lastPage(data.total, params.pageSize),
        }).toString(),
      },
      { replace: true },
    );
  });

  const skill = skills.data?.find((entry) => entry.code === params.skill);
  const header = (
    <PageHeader
      title={t('admin.courses.title')}
      description={t('admin.courses.description')}
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined aria-hidden />}
          onClick={() => setCreating(true)}
          disabled={!skills.data}
          data-testid="new-course"
        >
          {t('admin.courses.new')}
        </Button>
      }
    />
  );
  const dialog = skills.data && (
    <NewCourseDialog
      open={creating}
      skills={skills.data}
      defaultSkillId={skill?.id}
      onClose={() => setCreating(false)}
    />
  );

  if (courses.isPending || skills.isPending) {
    return (
      <>
        {header}
        <PageLoader />
      </>
    );
  }
  if (courses.isError || skills.isError) {
    return (
      <>
        {header}
        <ErrorState
          error={courses.error ?? skills.error}
          onRetry={() => {
            void courses.refetch();
            void skills.refetch();
          }}
        />
      </>
    );
  }

  const page = courses.data;
  const filtered = Boolean(params.skill || params.status);
  // Order is per skill: reorder when one skill's whole list is on screen.
  const canReorder =
    skill !== undefined && !params.status && page.total === page.items.length;

  const renderCourse = (course: AdminCourseSummary, handle?: ReorderHandle) => (
    <CourseCard course={course} controls={handle?.controls} />
  );

  return (
    <>
      {header}
      {dialog}
      <Filters
        params={params}
        skills={skills.data}
        onChange={(next) => go({ ...next, page: 1 })}
      />

      {page.total === 0 && !filtered ? (
        <EmptyState description={t('admin.courses.empty')} />
      ) : page.items.length === 0 ? (
        <div data-testid="courses-empty">
          <p className={styles.muted}>{t('admin.courses.emptyFiltered')}</p>
          <Button
            type="link"
            onClick={() => go({ page: 1, pageSize: params.pageSize })}
          >
            {t('admin.courses.clearFilters')}
          </Button>
        </div>
      ) : canReorder ? (
        <SortableList
          items={page.items}
          titleOf={(course) => course.title}
          className={styles.cards}
          testId="admin-course-list"
          onReorder={(ids) =>
            reorder
              .mutateAsync({ skillId: skill.id, ids })
              .then(() => message.success(t('admin.reorder.saved')))
              .catch((error: unknown) => {
                void message.error(errorMessage(error, t));
                throw error;
              })
          }
          renderItem={(course, _index, handle) => renderCourse(course, handle)}
        />
      ) : (
        <ul
          className={styles.cards}
          aria-busy={courses.isPlaceholderData}
          data-testid="admin-course-list"
        >
          {page.items.map((course) => (
            <li key={course.id}>{renderCourse(course)}</li>
          ))}
        </ul>
      )}

      {page.total > 0 && (
        <ListPager
          page={page.page}
          pageSize={page.pageSize}
          total={page.total}
          count={page.items.length}
          rangeTestId="admin-course-range"
          rangeLabel={(range) => t('admin.courses.range', range)}
          sizeLabel={t('admin.courses.pageSize')}
          optionLabel={(size) => t('admin.courses.perPage', { size })}
          onChange={(next) => go({ ...params, ...next })}
        />
      )}
    </>
  );
}

function CourseCard({
  course,
  controls,
}: {
  course: AdminCourseSummary;
  controls?: ReactNode;
}) {
  const { t, i18n } = useTranslation();
  const skillText = useSkillText();

  return (
    <article className={styles.card} data-testid="admin-course">
      {controls}
      <div className={styles.cardBody}>
        <Link to={`/admin/courses/${course.id}`} className={styles.cardLink}>
          {course.title}
        </Link>
        <p className={styles.meta}>
          <span>{skillText(course.skill).name}</span>
          <span className={styles.count}>
            {t('admin.courses.modules', { count: course.moduleCount })}
          </span>
          <span className={styles.count}>
            {t('admin.courses.lessons', { count: course.lessonCount })}
            {' ('}
            {t('admin.courses.published', {
              count: course.publishedLessonCount,
            })}
            {')'}
          </span>
          <span>
            {t('admin.updated', {
              date: new Date(course.updatedAt).toLocaleDateString(
                i18n.language,
              ),
            })}
          </span>
        </p>
      </div>
      <StatusTag status={course.status} />
    </article>
  );
}

function Filters({
  params,
  skills,
  onChange,
}: {
  params: AdminListParams;
  skills: Skill[];
  onChange: (next: AdminListParams) => void;
}) {
  const { t } = useTranslation();
  const skillText = useSkillText();

  return (
    <div className={styles.filters}>
      <Select<string>
        value={params.skill ?? ''}
        aria-label={t('admin.courses.filterSkill')}
        data-testid="filter-skill"
        options={[
          { value: '', label: t('admin.courses.allSkills') },
          ...skills.map((skill) => ({
            value: skill.code,
            label: skillText(skill).name,
          })),
        ]}
        onChange={(skill) => onChange({ ...params, skill: skill || undefined })}
      />
      <Select<ContentStatus | ''>
        value={params.status ?? ''}
        aria-label={t('admin.courses.filterStatus')}
        data-testid="filter-status"
        options={[
          { value: '', label: t('admin.courses.allStatuses') },
          ...CONTENT_STATUSES.map((status) => ({
            value: status,
            label: t(`admin.status.${status}`),
          })),
        ]}
        onChange={(status) =>
          onChange({ ...params, status: status || undefined })
        }
      />
    </div>
  );
}
