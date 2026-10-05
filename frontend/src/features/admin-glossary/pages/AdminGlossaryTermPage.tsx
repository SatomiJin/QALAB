import { BookOutlined } from '@ant-design/icons';
import { Alert, App, Button, Form, Input, Select } from 'antd';
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
import {
  type AdminGlossaryList,
  type AdminGlossaryTerm,
  GLOSSARY_LIMITS,
  SKILL_CODES,
  SLUG_PATTERN,
} from '../../../types/api';
import adminStyles from '../../admin/Admin.module.scss';
import { slugify } from '../../admin/content';
import { DeleteButton } from '../../admin/DeleteButton';
import { StatusSelect } from '../../admin/ModuleDialog';
import { StatusLine } from '../../admin/StatusLine';
import { glossaryApi } from '../../glossary/glossary-api';
import { glossaryHref } from '../../glossary/link-terms';
import {
  useAdminGlossary,
  useAdminGlossaryTerm,
  useDeleteGlossaryTerm,
  useGlossaryMutation,
} from '../../glossary/queries';
import {
  glossaryListPath,
  termFieldErrors,
  type TermFormValues,
  termFormValues,
  termRequest,
} from '../admin-glossary';
import styles from '../AdminGlossary.module.scss';

/** `/admin/glossary/new` and `/admin/glossary/:termId`. */
export function AdminGlossaryTermPage() {
  const { termId } = useParams();
  const term = useAdminGlossaryTerm(termId);
  // Every term, for the related-terms select and the course names of usage.
  const list = useAdminGlossary();

  if ((termId && term.isPending) || list.isPending) return <PageLoader />;
  if (term.error) {
    if (
      term.error instanceof ApiError &&
      (term.error.status === 404 || term.error.status === 400)
    ) {
      return <NotFoundPage />;
    }
    return (
      <ErrorState error={term.error} onRetry={() => void term.refetch()} />
    );
  }
  if (list.isError) {
    return (
      <ErrorState error={list.error} onRetry={() => void list.refetch()} />
    );
  }
  return (
    <TermEditor
      key={term.data?.id ?? 'new'}
      term={term.data}
      list={list.data}
    />
  );
}

function TermEditor({
  term,
  list,
}: {
  term: AdminGlossaryTerm | undefined;
  list: AdminGlossaryList;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const remove = useDeleteGlossaryTerm(term?.id ?? '');
  const title = term?.term ?? t('adminGlossary.newTerm');

  return (
    <>
      <PageTrail
        back={{ to: glossaryListPath(), label: t('adminGlossary.back') }}
        items={[
          { label: t('adminGlossary.trail'), to: glossaryListPath() },
          { label: title },
        ]}
      />
      <PageHeader
        title={title}
        description={
          term && (
            <StatusLine
              status={term.status}
              visible={term.status === 'published'}
              inUse={false}
            />
          )
        }
      />
      <SideLayout
        asideLabel={t('admin.pageActions')}
        aside={
          term && (
            <div className={styles.aside}>
              <Usage term={term} list={list} />
              <div
                className={`${adminStyles.actions} ${adminStyles.pageActions}`}
              >
                {term.status === 'published' && (
                  <Button
                    icon={<BookOutlined aria-hidden />}
                    onClick={() => void navigate(glossaryHref(term.slug))}
                    data-testid="open-entry"
                  >
                    {t('adminGlossary.openEntry')}
                  </Button>
                )}
                <DeleteButton
                  title={term.term}
                  inUse={false}
                  onDelete={() => remove.mutateAsync()}
                  onDeleted={() => void navigate(glossaryListPath())}
                  testId="delete-term"
                />
              </div>
            </div>
          )
        }
      >
        <TermForm key={term?.updatedAt ?? 'new'} term={term} list={list} />
      </SideLayout>
    </>
  );
}

/** Where the saved phrases appear: lesson count and the courses by name. */
function Usage({
  term,
  list,
}: {
  term: AdminGlossaryTerm;
  list: AdminGlossaryList;
}) {
  const { t } = useTranslation();
  const titles = new Map(
    list.courses.map((course) => [course.id, course.title]),
  );
  return (
    <section className={styles.usage} data-testid="term-usage-panel">
      <h2 className={styles.usageTitle}>{t('adminGlossary.usageTitle')}</h2>
      {term.usage.lessons === 0 ? (
        <p className={adminStyles.muted}>{t('adminGlossary.usageNone')}</p>
      ) : (
        <>
          <p className={adminStyles.count} data-testid="usage-count">
            {t('adminGlossary.usage', { count: term.usage.lessons })}
          </p>
          <ul className={styles.usageCourses}>
            {term.usage.courseIds.map((id) => (
              <li key={id}>{titles.get(id) ?? id}</li>
            ))}
          </ul>
        </>
      )}
      <p className={styles.hint}>{t('adminGlossary.usageHint')}</p>
    </section>
  );
}

function TermForm({
  term,
  list,
}: {
  term: AdminGlossaryTerm | undefined;
  list: AdminGlossaryList;
}) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [form] = Form.useForm<TermFormValues>();
  const [formError, setFormError] = useState<string | null>(null);
  const save = useGlossaryMutation((values: TermFormValues) =>
    term
      ? glossaryApi.update(term.id, termRequest(values))
      : glossaryApi.create(termRequest(values)),
  );

  const submit = (values: TermFormValues) => {
    setFormError(null);
    // mutateAsync: the form remounts once the saved term is cached (it is
    // keyed by its save time), and mutate() callbacks would be dropped.
    void save.mutateAsync(values).then(
      (saved) => {
        if (term) {
          void message.success(t('admin.saved'));
        } else {
          void message.success(t('adminGlossary.created'));
          void navigate(`/admin/glossary/${saved.id}`, { replace: true });
        }
      },
      (error: unknown) => {
        const fields =
          error instanceof ApiError && [400, 409].includes(error.status)
            ? termFieldErrors(error.details, values)
            : [];
        if (fields.length > 0) form.setFields(fields);
        else setFormError(errorMessage(error, t));
      },
    );
  };

  const max = (limit: number) => ({
    max: limit,
    message: t('admin.validation.max', { max: limit }),
  });

  return (
    <Form
      form={form}
      layout="vertical"
      requiredMark={false}
      initialValues={termFormValues(term)}
      onFinish={submit}
      // The slug follows the term on a new entry until it is edited by hand.
      onValuesChange={(changed: Partial<TermFormValues>) => {
        if (
          !term &&
          changed.term !== undefined &&
          !form.isFieldTouched('slug')
        ) {
          form.setFieldValue(
            'slug',
            slugify(changed.term).slice(0, GLOSSARY_LIMITS.slugLength),
          );
        }
      }}
      name="glossary-term"
      data-testid="term-form"
    >
      {formError && (
        <Alert
          className={adminStyles.formAlert}
          type="error"
          title={formError}
        />
      )}
      <div className={adminStyles.form}>
        <Form.Item
          name="term"
          label={t('adminGlossary.fields.term')}
          rules={[
            {
              required: true,
              whitespace: true,
              message: t('adminGlossary.validation.term'),
            },
            max(GLOSSARY_LIMITS.termLength),
          ]}
        >
          <Input data-testid="term-name" />
        </Form.Item>
        <Form.Item
          name="slug"
          label={t('adminGlossary.fields.slug')}
          extra={t('adminGlossary.fields.slugHint')}
          rules={[
            { required: true, message: t('admin.validation.slug') },
            {
              pattern: SLUG_PATTERN,
              message: t('admin.validation.slugFormat'),
            },
            max(GLOSSARY_LIMITS.slugLength),
          ]}
        >
          <Input data-testid="slug" />
        </Form.Item>
        <Form.Item
          name="viName"
          label={t('adminGlossary.fields.viName')}
          extra={t('adminGlossary.fields.viNameHint')}
          rules={[max(GLOSSARY_LIMITS.viNameLength)]}
        >
          <Input lang="vi" data-testid="term-vi-name" />
        </Form.Item>
        <div className={adminStyles.fieldRow}>
          <Form.Item name="skill" label={t('adminGlossary.fields.skill')}>
            <Select
              data-testid="term-skill"
              options={SKILL_CODES.map((code) => ({
                value: code,
                label: t(`skills.${code}.name`),
              }))}
            />
          </Form.Item>
          <Form.Item name="status" label={t('adminGlossary.fields.status')}>
            <StatusSelect testId="term-status" />
          </Form.Item>
        </div>
        <Form.Item
          name="matchPhrases"
          label={t('adminGlossary.fields.phrases')}
          extra={t('adminGlossary.fields.phrasesHint')}
          rules={[
            {
              validator: (_, phrases: string[] = []) => {
                const clean = phrases.map((p) => p.trim()).filter(Boolean);
                return clean.length <= GLOSSARY_LIMITS.phrases &&
                  clean.every(
                    (p) =>
                      p.length >= GLOSSARY_LIMITS.phraseMin &&
                      p.length <= GLOSSARY_LIMITS.phraseMax,
                  )
                  ? Promise.resolve()
                  : Promise.reject(
                      new Error(
                        t('adminGlossary.validation.phrases', {
                          max: GLOSSARY_LIMITS.phrases,
                          min: GLOSSARY_LIMITS.phraseMin,
                          length: GLOSSARY_LIMITS.phraseMax,
                        }),
                      ),
                    );
              },
            },
          ]}
        >
          <Select
            mode="tags"
            open={false}
            suffixIcon={null}
            tokenSeparators={[',']}
            data-testid="term-phrases"
          />
        </Form.Item>
        <Form.Item
          name="definitionEn"
          label={t('adminGlossary.fields.definitionEn')}
          rules={[
            {
              required: true,
              whitespace: true,
              message: t('adminGlossary.validation.definition'),
            },
            max(GLOSSARY_LIMITS.definitionLength),
          ]}
        >
          <Input.TextArea
            autoSize={{ minRows: 3 }}
            showCount
            maxLength={GLOSSARY_LIMITS.definitionLength}
            data-testid="term-definition-en"
          />
        </Form.Item>
        <Form.Item
          name="definitionVi"
          label={t('adminGlossary.fields.definitionVi')}
          rules={[
            {
              required: true,
              whitespace: true,
              message: t('adminGlossary.validation.definition'),
            },
            max(GLOSSARY_LIMITS.definitionLength),
          ]}
        >
          <Input.TextArea
            lang="vi"
            autoSize={{ minRows: 3 }}
            showCount
            maxLength={GLOSSARY_LIMITS.definitionLength}
            data-testid="term-definition-vi"
          />
        </Form.Item>
        <Form.Item
          name="relatedIds"
          label={t('adminGlossary.fields.related')}
          rules={[
            {
              type: 'array',
              max: GLOSSARY_LIMITS.related,
              message: t('adminGlossary.validation.related', {
                max: GLOSSARY_LIMITS.related,
              }),
            },
          ]}
        >
          <Select
            mode="multiple"
            showSearch={{ optionFilterProp: 'label' }}
            data-testid="term-related"
            options={list.items
              .filter((other) => other.id !== term?.id)
              .map((other) => ({ value: other.id, label: other.term }))}
          />
        </Form.Item>
      </div>
      <Button
        type="primary"
        htmlType="submit"
        loading={save.isPending}
        className={adminStyles.primaryAction}
        data-testid="save-term"
      >
        {term ? t('admin.save') : t('adminGlossary.newTerm')}
      </Button>
    </Form>
  );
}
