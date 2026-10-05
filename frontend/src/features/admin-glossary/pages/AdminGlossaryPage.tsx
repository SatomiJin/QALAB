import { PlusOutlined } from '@ant-design/icons';
import { Button, Input, Select } from 'antd';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { PageLoader } from '../../../components/feedback/PageLoader';
import { ListPager } from '../../../components/ListPager';
import { PageHeader } from '../../../components/PageHeader';
import {
  type AdminGlossaryList,
  type AdminGlossaryTerm,
  CONTENT_STATUSES,
  type ContentStatus,
  SKILL_CODES,
  type SkillCode,
} from '../../../types/api';
import adminStyles from '../../admin/Admin.module.scss';
import { StatusTag } from '../../admin/StatusTag';
import { useAdminGlossary } from '../../glossary/queries';
import { lastPage } from '../../learning/list-params';
import {
  type GlossaryListParams,
  glossaryListSearch,
  glossaryPage,
  isFiltered,
  parseGlossaryListParams,
  rememberGlossaryList,
  UNUSED,
} from '../admin-glossary';
import styles from '../AdminGlossary.module.scss';

/** Admin → Glossary: every term, searchable and filterable (also by the course that uses it). */
export function AdminGlossaryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [search] = useSearchParams();
  const params = parseGlossaryListParams(search);
  const glossary = useAdminGlossary();

  useEffect(() => {
    rememberGlossaryList(location.search);
  }, [location.search]);

  const go = (target: GlossaryListParams, replace = false) =>
    navigate(
      { pathname: '/admin/glossary', search: glossaryListSearch(target) },
      { replace },
    );

  const page = glossary.data ? glossaryPage(glossary.data.items, params) : null;

  // Past the end (e.g. after filtering): move to the last page.
  useEffect(() => {
    if (!page || page.items.length > 0 || page.total === 0 || params.page === 1)
      return;
    void go({ ...params, page: lastPage(page.total, params.pageSize) }, true);
  });

  const header = (
    <PageHeader
      title={t('adminGlossary.title')}
      description={t('adminGlossary.description')}
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined aria-hidden />}
          onClick={() => void navigate('/admin/glossary/new')}
          data-testid="new-term"
        >
          {t('adminGlossary.newTerm')}
        </Button>
      }
    />
  );

  if (glossary.isPending) {
    return (
      <>
        {header}
        <PageLoader />
      </>
    );
  }
  if (glossary.isError) {
    return (
      <>
        {header}
        <ErrorState
          error={glossary.error}
          onRetry={() => void glossary.refetch()}
        />
      </>
    );
  }

  const list = glossary.data;
  if (list.items.length === 0) {
    return (
      <>
        {header}
        <EmptyState description={t('adminGlossary.empty')} />
      </>
    );
  }

  const shown = page!;
  return (
    <>
      {header}
      <Filters
        list={list}
        params={params}
        onChange={(next) => go({ ...next, page: 1 })}
      />
      {shown.total === 0 ? (
        <div data-testid="terms-empty" data-state="empty">
          <p className={adminStyles.muted}>
            {t('adminGlossary.emptyFiltered')}
          </p>
          {isFiltered(params) && (
            <Button
              type="link"
              onClick={() => go({ page: 1, pageSize: params.pageSize })}
            >
              {t('adminGlossary.clearFilters')}
            </Button>
          )}
        </div>
      ) : (
        <ul className={adminStyles.cards} data-testid="admin-term-list">
          {shown.items.map((term) => (
            <li key={term.id}>
              <TermCard term={term} />
            </li>
          ))}
        </ul>
      )}
      {shown.total > 0 && (
        <ListPager
          page={params.page}
          pageSize={params.pageSize}
          total={shown.total}
          count={shown.items.length}
          rangeTestId="admin-term-range"
          rangeLabel={(range) => t('adminGlossary.range', range)}
          sizeLabel={t('adminGlossary.pageSize')}
          optionLabel={(size) => t('adminGlossary.perPage', { size })}
          onChange={(next) => go({ ...params, ...next })}
        />
      )}
    </>
  );
}

function TermCard({ term }: { term: AdminGlossaryTerm }) {
  const { t } = useTranslation();
  return (
    <article
      className={adminStyles.card}
      data-testid="admin-term"
      data-term={term.slug}
    >
      <div className={adminStyles.cardBody}>
        <span className={styles.name}>
          <Link
            to={`/admin/glossary/${term.id}`}
            className={adminStyles.cardLink}
          >
            {term.term}
          </Link>
          {term.viName && (
            <span className={styles.viName} lang="vi">
              {term.viName}
            </span>
          )}
        </span>
        <p className={adminStyles.meta}>
          <span>{t(`skills.${term.skill}.name`)}</span>
          <span className={styles.phrases}>
            {term.matchPhrases.length > 0
              ? term.matchPhrases.join(', ')
              : t('adminGlossary.noPhrases')}
          </span>
          <span className={adminStyles.count} data-testid="term-usage">
            {t('adminGlossary.usage', { count: term.usage.lessons })}
          </span>
        </p>
      </div>
      <StatusTag status={term.status} />
    </article>
  );
}

function Filters({
  list,
  params,
  onChange,
}: {
  list: AdminGlossaryList;
  params: GlossaryListParams;
  onChange: (next: GlossaryListParams) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className={adminStyles.filters} role="search">
      <Input.Search
        // Remounts when the URL changes (back / clear filters).
        key={params.search ?? ''}
        className={styles.search}
        defaultValue={params.search}
        placeholder={t('adminGlossary.searchPlaceholder')}
        aria-label={t('adminGlossary.searchLabel')}
        maxLength={64}
        allowClear
        data-testid="term-search"
        onSearch={(value) =>
          onChange({ ...params, search: value.trim() || undefined })
        }
      />
      <Select<SkillCode | ''>
        value={params.skill ?? ''}
        aria-label={t('adminGlossary.filterSkill')}
        data-testid="filter-term-skill"
        popupMatchSelectWidth={false}
        options={[
          { value: '', label: t('adminGlossary.allSkills') },
          ...SKILL_CODES.map((code) => ({
            value: code,
            label: t(`skills.${code}.name`),
          })),
        ]}
        onChange={(skill) => onChange({ ...params, skill: skill || undefined })}
      />
      <Select<ContentStatus | ''>
        value={params.status ?? ''}
        aria-label={t('adminGlossary.filterStatus')}
        data-testid="filter-term-status"
        options={[
          { value: '', label: t('adminGlossary.allStatuses') },
          ...CONTENT_STATUSES.map((status) => ({
            value: status,
            label: t(`admin.status.${status}`),
          })),
        ]}
        onChange={(status) =>
          onChange({ ...params, status: status || undefined })
        }
      />
      <Select<string>
        value={params.course ?? ''}
        aria-label={t('adminGlossary.filterCourse')}
        data-testid="filter-term-course"
        popupMatchSelectWidth={false}
        showSearch={{ optionFilterProp: 'label' }}
        options={[
          { value: '', label: t('adminGlossary.allCourses') },
          { value: UNUSED, label: t('adminGlossary.unused') },
          ...list.courses.map((course) => ({
            value: course.id,
            label: course.title,
          })),
        ]}
        onChange={(course) =>
          onChange({ ...params, course: course || undefined })
        }
      />
    </div>
  );
}
