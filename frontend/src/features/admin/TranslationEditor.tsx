import { Alert, App, Button, Form, Input } from 'antd';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ErrorState } from '../../components/feedback/ErrorState';
import { PageLoader } from '../../components/feedback/PageLoader';
import { PageHeader } from '../../components/PageHeader';
import { SideLayout } from '../../components/SideLayout';
import { errorMessage } from '../../hooks/useErrorMessage';
import { ApiError } from '../../lib/api';
import type {
  FieldTranslationStatus,
  TranslatableKind,
  TranslationField,
} from '../../types/api';
import { LessonMarkdown } from '../learning/LessonMarkdown';
import styles from './Admin.module.scss';
import { MarkdownEditor } from './MarkdownEditor';
import { useAdminTranslations, useSaveTranslations } from './queries';
import {
  fieldLabels,
  initialTranslationValues,
  translationCounts,
  translationErrors,
  type TranslationValues,
  translationWrites,
} from './translation-form';
import local from './TranslationEditor.module.scss';

interface FormValues {
  vi: TranslationValues;
}

const STAMP: Record<FieldTranslationStatus, string> = {
  current: styles.published,
  stale: styles.archived,
  missing: styles.draft,
};

/** About as tall as the English: 4 to 18 lines. */
const editorRows = (source: string) =>
  Math.min(18, Math.max(4, source.split('\n').length + 2));

/** Translation status of one text: a neutral stamp, like content status. */
function TranslationStatusTag({ status }: { status: FieldTranslationStatus }) {
  const { t } = useTranslation();
  return (
    <span className={`${styles.status} ${STAMP[status]}`} data-status={status}>
      {t(`admin.translation.status.${status}`)}
    </span>
  );
}

interface TranslationEditorProps {
  kind: TranslatableKind;
  id: string;
  /** The item's English title (or question), under the page title. */
  itemTitle: string;
  trail: ReactNode;
}

/**
 * Manual Vietnamese translations of one content item: each English text next
 * to its translation, with whether that is current, out of date or missing.
 */
export function TranslationEditor({
  kind,
  id,
  itemTitle,
  trail,
}: TranslationEditorProps) {
  const { t } = useTranslation();
  const translations = useAdminTranslations(kind, id);

  let body: ReactNode;
  if (translations.isPending) body = <PageLoader />;
  else if (translations.isError) {
    body = (
      <ErrorState
        error={translations.error}
        onRetry={() => void translations.refetch()}
      />
    );
  } else if (translations.data.fields.length === 0) {
    body = <EmptyState description={t('admin.translation.empty')} />;
  } else {
    body = (
      <TranslationForm
        kind={kind}
        id={id}
        fields={translations.data.fields}
        onConflict={() => void translations.refetch()}
      />
    );
  }

  return (
    <>
      {trail}
      <PageHeader
        title={t('admin.translation.title')}
        description={<span className={local.itemTitle}>{itemTitle}</span>}
      />
      {body}
    </>
  );
}

function TranslationForm({
  kind,
  id,
  fields,
  onConflict,
}: {
  kind: TranslatableKind;
  id: string;
  fields: TranslationField[];
  onConflict: () => void;
}) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const [confirmed, setConfirmed] = useState<ReadonlySet<string>>(new Set());
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const save = useSaveTranslations(kind, id);
  const labels = fieldLabels(fields);
  const counts = translationCounts(fields);

  const labelOf = (field: TranslationField) => {
    const label = labels.get(field.field)!;
    return t(`admin.translation.fields.${label.key}`, { n: label.number });
  };

  const submit = () => {
    setFormErrors([]);
    const values = (form.getFieldsValue(true) as FormValues).vi ?? {};
    const writes = translationWrites(fields, values, confirmed);
    if (writes.length === 0) {
      void message.info(t('admin.translation.nothingToSave'));
      return;
    }
    // Clear old field errors before showing the new ones.
    form.setFields(
      fields.map((field) => ({ name: ['vi', field.field], errors: [] })),
    );
    save.mutate(
      { fields: writes },
      {
        onSuccess: (result) => {
          setConfirmed(new Set());
          form.setFieldsValue({ vi: initialTranslationValues(result.fields) });
          void message.success(t('admin.translation.saved'));
        },
        onError: (error) => {
          if (error instanceof ApiError && error.status === 409) {
            setFormErrors([t('admin.translation.conflict')]);
            onConflict();
            return;
          }
          if (error instanceof ApiError && error.status === 400) {
            const { byField, other } = translationErrors(error.details, writes);
            form.setFields(
              [...byField].map(([field, errors]) => ({
                name: ['vi', field],
                errors,
              })),
            );
            if (byField.size === 0 || other.length > 0) {
              setFormErrors(
                other.length > 0 ? other : [errorMessage(error, t)],
              );
            }
            return;
          }
          setFormErrors([errorMessage(error, t)]);
        },
      },
    );
  };

  return (
    <SideLayout
      asideLabel={t('admin.translation.summary')}
      asideTestId="translation-summary"
      aside={
        <div className={local.summary}>
          <p className={styles.muted}>{t('admin.translation.description')}</p>
          <ul className={local.counts}>
            {(['current', 'stale', 'missing'] as const).map((status) => (
              <li key={status} data-testid={`translation-count-${status}`}>
                <TranslationStatusTag status={status} />
                <span className={styles.count}>{counts[status]}</span>
              </li>
            ))}
          </ul>
          {kind === 'exercise' && (
            <p className={styles.muted}>{t('admin.translation.reviewTexts')}</p>
          )}
        </div>
      }
    >
      <Form
        form={form}
        name="translation"
        layout="vertical"
        requiredMark={false}
        initialValues={{ vi: initialTranslationValues(fields) }}
        onFinish={submit}
        data-testid="translation-form"
      >
        {formErrors.length > 0 && (
          <Alert
            className={styles.formAlert}
            type="error"
            title={formErrors.join(' ')}
            data-testid="translation-error"
          />
        )}
        <ol className={local.rows}>
          {fields.map((field) => (
            <FieldRow
              key={field.field}
              field={field}
              label={labelOf(field)}
              confirmed={confirmed.has(field.field)}
              onConfirm={() =>
                setConfirmed((current) => new Set(current).add(field.field))
              }
              onUseMachine={() =>
                form.setFieldValue(['vi', field.field], field.machineText)
              }
            />
          ))}
        </ol>
        <Button
          type="primary"
          htmlType="submit"
          loading={save.isPending}
          className={styles.primaryAction}
          data-testid="save-translation"
        >
          {t('admin.translation.save')}
        </Button>
      </Form>
    </SideLayout>
  );
}

function FieldRow({
  field,
  label,
  confirmed,
  onConfirm,
  onUseMachine,
}: {
  field: TranslationField;
  label: string;
  confirmed: boolean;
  onConfirm: () => void;
  onUseMachine: () => void;
}) {
  const { t } = useTranslation();
  const headingId = `translation-${field.field}`;
  const viName = ['vi', field.field];
  const rules = [
    {
      max: field.maxLength,
      message: t('admin.validation.max', { max: field.maxLength }),
    },
  ];
  const english = field.markdown ? (
    <div className={`${styles.previewPane} ${local.englishMarkdown}`}>
      <LessonMarkdown
        source={field.source}
        testId={`translation-source-${field.field}`}
      />
    </div>
  ) : (
    <p
      className={local.englishText}
      lang="en"
      data-testid={`translation-source-${field.field}`}
    >
      {field.source}
    </p>
  );

  return (
    <li
      className={local.row}
      aria-labelledby={headingId}
      data-testid="translation-field"
      data-field={field.field}
      data-state={field.status}
    >
      <div className={local.rowHead}>
        <h2 id={headingId}>{label}</h2>
        <TranslationStatusTag status={field.status} />
      </div>
      {field.status === 'stale' && (
        <div className={local.note}>
          <p>
            {confirmed
              ? t('admin.translation.confirmed')
              : t('admin.translation.staleHint')}
          </p>
          {!confirmed && (
            <Button
              size="small"
              onClick={onConfirm}
              data-testid={`confirm-${field.field}`}
            >
              {t('admin.translation.confirm')}
            </Button>
          )}
        </div>
      )}
      <div className={field.markdown ? local.stack : local.pair}>
        <div className={local.english}>
          <span className={local.columnLabel}>
            {t('admin.translation.english')}
          </span>
          {english}
        </div>
        <div>
          <Form.Item
            name={viName}
            label={t('admin.translation.vietnamese')}
            rules={rules}
            extra={
              field.markdown
                ? `${t('admin.translation.markdownHint')} ${t('admin.translation.clearHint')}`
                : t('admin.translation.clearHint')
            }
          >
            {field.markdown ? (
              <MarkdownEditor
                maxLength={field.maxLength}
                rows={editorRows(field.source)}
                testId={`translation-input-${field.field}`}
              />
            ) : (
              <Input.TextArea
                autoSize={{ minRows: 1, maxRows: 8 }}
                maxLength={field.maxLength}
                lang="vi"
                aria-describedby={headingId}
                data-testid={`translation-input-${field.field}`}
              />
            )}
          </Form.Item>
          {field.machineText && field.status !== 'current' && (
            <Button
              type="link"
              className={local.machine}
              onClick={onUseMachine}
              data-testid={`use-machine-${field.field}`}
            >
              {t('admin.translation.useMachine')}
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}
