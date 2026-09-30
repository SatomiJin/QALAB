import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Checkbox, Form, Input, Select, Switch } from 'antd';
import type { FormInstance } from 'antd';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { type ExerciseType, PRIORITIES, SEVERITIES } from '../../types/api';
import styles from './Admin.module.scss';
import {
  BUG_REPORT_FIELDS,
  type ExerciseFormValues,
  type LabelPrefix,
  nextLabelId,
  TEST_CASE_FIELDS,
} from './exercise-form';
import { MarkdownEditor } from './MarkdownEditor';

const LABEL_MAX = 500;

interface FieldsProps {
  form: FormInstance<ExerciseFormValues>;
  /** Learners answered: label rows can be edited, not added or removed. */
  locked: boolean;
}

/** Remove button for a repeatable row. */
function RemoveRow({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Button
      type="text"
      icon={<DeleteOutlined aria-hidden />}
      aria-label={`${t('admin.remove')}: ${label}`}
      disabled={disabled}
      onClick={onClick}
    />
  );
}

function AddRow({
  label,
  disabled,
  onClick,
  testId,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  testId: string;
}) {
  return (
    <Button
      className={styles.addRow}
      icon={<PlusOutlined aria-hidden />}
      disabled={disabled}
      onClick={onClick}
      data-testid={testId}
    >
      {label}
    </Button>
  );
}

const textRules = (t: TFunction) => [
  { required: true, whitespace: true, message: t('admin.validation.text') },
  { max: LABEL_MAX, message: t('admin.validation.max', { max: LABEL_MAX }) },
];

/** Adds a row with a fresh id to a label list. */
function addLabel(
  form: FormInstance<ExerciseFormValues>,
  list: 'options' | 'categories' | 'items' | 'rubric',
  prefix: LabelPrefix,
  extra: object = {},
) {
  const current = (form.getFieldValue(list) ?? []) as { id: string }[];
  form.setFieldValue(list, [
    ...current,
    { id: nextLabelId(current, prefix), text: '', ...extra },
  ]);
}

// Multiple choice -----------------------------------------------------------

export function ChoiceFields({ form, locked }: FieldsProps) {
  const { t } = useTranslation();
  return (
    <>
      <p className={styles.rowLabel}>{t('admin.exercise.options')}</p>
      <Form.List
        name="options"
        rules={[
          {
            validator: async (_, options: ExerciseFormValues['options']) => {
              const correct = options.filter((option) => option.correct).length;
              if (correct === 0) throw new Error(t('admin.validation.correct'));
              if (correct > 1 && !form.getFieldValue('multiple')) {
                throw new Error(t('admin.validation.oneCorrect'));
              }
            },
          },
        ]}
      >
        {(fields, { remove }, { errors }) => (
          <>
            <div className={styles.rows} data-testid="option-rows">
              {fields.map((field, index) => {
                const label = t('admin.exercise.option', { n: index + 1 });
                return (
                  <div key={field.key} className={styles.rowWide}>
                    <Form.Item name={[field.name, 'text']} rules={textRules(t)}>
                      <Input
                        aria-label={label}
                        placeholder={label}
                        data-testid="option-text"
                      />
                    </Form.Item>
                    <Form.Item
                      name={[field.name, 'correct']}
                      valuePropName="checked"
                    >
                      <Checkbox data-testid="option-correct">
                        {t('admin.exercise.correct')}
                      </Checkbox>
                    </Form.Item>
                    <RemoveRow
                      label={label}
                      disabled={locked || fields.length <= 2}
                      onClick={() => remove(field.name)}
                    />
                  </div>
                );
              })}
            </div>
            <Form.ErrorList errors={errors} />
            <AddRow
              label={t('admin.exercise.addOption')}
              disabled={locked || fields.length >= 8}
              onClick={() =>
                addLabel(form, 'options', 'option', { correct: false })
              }
              testId="add-option"
            />
          </>
        )}
      </Form.List>
      <Form.Item
        name="multiple"
        valuePropName="checked"
        label={t('admin.exercise.multiple')}
        className={styles.switchItem}
      >
        <Switch disabled={locked} data-testid="option-multiple" />
      </Form.Item>
    </>
  );
}

// Classification ------------------------------------------------------------

export function ClassificationFields({ form, locked }: FieldsProps) {
  const { t } = useTranslation();
  const categories = (Form.useWatch('categories', form) ??
    []) as ExerciseFormValues['categories'];

  return (
    <>
      <p className={styles.rowLabel}>{t('admin.exercise.categories')}</p>
      <Form.List name="categories">
        {(fields, { remove }) => (
          <>
            <div className={styles.rows} data-testid="category-rows">
              {fields.map((field, index) => {
                const label = t('admin.exercise.category', { n: index + 1 });
                return (
                  <div key={field.key} className={styles.row}>
                    <Form.Item name={[field.name, 'text']} rules={textRules(t)}>
                      <Input
                        aria-label={label}
                        placeholder={label}
                        data-testid="category-text"
                      />
                    </Form.Item>
                    <RemoveRow
                      label={label}
                      disabled={locked || fields.length <= 2}
                      onClick={() => remove(field.name)}
                    />
                  </div>
                );
              })}
            </div>
            <AddRow
              label={t('admin.exercise.addCategory')}
              disabled={locked || fields.length >= 6}
              onClick={() => addLabel(form, 'categories', 'category')}
              testId="add-category"
            />
          </>
        )}
      </Form.List>

      <p className={styles.rowLabel}>{t('admin.exercise.items')}</p>
      <Form.List name="items">
        {(fields, { remove }) => (
          <>
            <div className={styles.rows} data-testid="item-rows">
              {fields.map((field, index) => {
                const label = t('admin.exercise.item', { n: index + 1 });
                return (
                  <div key={field.key} className={styles.rowWide}>
                    <Form.Item name={[field.name, 'text']} rules={textRules(t)}>
                      <Input
                        aria-label={label}
                        placeholder={label}
                        data-testid="item-text"
                      />
                    </Form.Item>
                    <Form.Item
                      name={[field.name, 'category']}
                      rules={[
                        {
                          required: true,
                          message: t('admin.validation.category'),
                        },
                      ]}
                    >
                      <Select
                        aria-label={t('admin.exercise.itemCategory', {
                          n: index + 1,
                        })}
                        placeholder={t('admin.exercise.itemCategory', {
                          n: index + 1,
                        })}
                        data-testid="item-category"
                        options={categories.map((category, i) => ({
                          value: category.id,
                          label:
                            category.text ||
                            t('admin.exercise.category', { n: i + 1 }),
                        }))}
                      />
                    </Form.Item>
                    <RemoveRow
                      label={label}
                      disabled={locked || fields.length <= 2}
                      onClick={() => remove(field.name)}
                    />
                  </div>
                );
              })}
            </div>
            <AddRow
              label={t('admin.exercise.addItem')}
              disabled={locked || fields.length >= 20}
              onClick={() => addLabel(form, 'items', 'item')}
              testId="add-item"
            />
          </>
        )}
      </Form.List>
    </>
  );
}

// Free-text types (test case, bug report, scenario) ---------------------------

export function FreeTextFields({
  form,
  type,
}: {
  form: FormInstance<ExerciseFormValues>;
  type: ExerciseType;
}) {
  const { t } = useTranslation();
  const requiredFields =
    type === 'test_case'
      ? TEST_CASE_FIELDS
      : type === 'bug_report'
        ? BUG_REPORT_FIELDS
        : [];

  return (
    <>
      {requiredFields.length > 0 && (
        <Form.Item
          name="requiredFields"
          label={t('admin.exercise.requiredFields')}
          extra={t('admin.exercise.requiredFieldsHint')}
        >
          <Checkbox.Group
            className={styles.checkGrid}
            data-testid="required-fields"
            options={requiredFields.map((field) => ({
              value: field,
              label: t(`practice.fields.${field}`),
            }))}
          />
        </Form.Item>
      )}

      {type === 'bug_report' && (
        <div className={styles.fieldRow}>
          <Form.Item
            name="expectedSeverity"
            label={t('admin.exercise.expectedSeverity')}
            rules={[
              { required: true, message: t('admin.validation.severity') },
            ]}
          >
            <Select
              data-testid="expected-severity"
              options={SEVERITIES.map((value) => ({
                value,
                label: t(`practice.severity.${value}`),
              }))}
            />
          </Form.Item>
          <Form.Item
            name="expectedPriority"
            label={t('admin.exercise.expectedPriority')}
            rules={[
              { required: true, message: t('admin.validation.priority') },
            ]}
          >
            <Select
              data-testid="expected-priority"
              options={PRIORITIES.map((value) => ({
                value,
                label: t(`practice.priority.${value}`),
              }))}
            />
          </Form.Item>
        </div>
      )}

      <p className={styles.rowLabel}>{t('admin.exercise.concepts')}</p>
      <p className={styles.muted}>{t('admin.exercise.conceptsHint')}</p>
      <Form.List name="concepts">
        {(fields, { add, remove }) => (
          <>
            <div
              className={`${styles.rows} ${styles.rowsSpaced}`}
              data-testid="concept-rows"
            >
              {fields.map((field, index) => {
                const concept = t('admin.exercise.concept', { n: index + 1 });
                const keywords = t('admin.exercise.keywords', { n: index + 1 });
                return (
                  <div key={field.key} className={styles.rowWide}>
                    <Form.Item
                      name={[field.name, 'concept']}
                      rules={[
                        {
                          required: true,
                          whitespace: true,
                          message: t('admin.validation.concept'),
                        },
                        {
                          max: 100,
                          message: t('admin.validation.max', { max: 100 }),
                        },
                      ]}
                    >
                      <Input
                        aria-label={concept}
                        placeholder={concept}
                        data-testid="concept-name"
                      />
                    </Form.Item>
                    <Form.Item
                      name={[field.name, 'keywords']}
                      rules={[
                        {
                          required: true,
                          whitespace: true,
                          message: t('admin.validation.keywords'),
                        },
                      ]}
                    >
                      <Input
                        aria-label={keywords}
                        placeholder={keywords}
                        data-testid="concept-keywords"
                      />
                    </Form.Item>
                    <RemoveRow
                      label={concept}
                      disabled={type === 'scenario' && fields.length <= 1}
                      onClick={() => remove(field.name)}
                    />
                  </div>
                );
              })}
            </div>
            <AddRow
              label={t('admin.exercise.addConcept')}
              disabled={fields.length >= 20}
              onClick={() => add({ concept: '', keywords: '' })}
              testId="add-concept"
            />
          </>
        )}
      </Form.List>

      <Form.Item
        name="modelAnswer"
        label={t('admin.exercise.modelAnswer')}
        className={styles.spacedItem}
        rules={[
          {
            required: true,
            whitespace: true,
            message: t('admin.validation.modelAnswer'),
          },
          { max: 10_000, message: t('admin.validation.max', { max: 10_000 }) },
        ]}
      >
        <MarkdownEditor maxLength={10_000} rows={8} testId="model-answer" />
      </Form.Item>

      <p className={styles.rowLabel}>{t('admin.exercise.rubric')}</p>
      <Form.List name="rubric">
        {(fields, { remove }) => (
          <>
            <div className={styles.rows} data-testid="rubric-rows">
              {fields.map((field, index) => {
                const label = t('admin.exercise.rubricItem', { n: index + 1 });
                return (
                  <div key={field.key} className={styles.row}>
                    <Form.Item name={[field.name, 'text']} rules={textRules(t)}>
                      <Input
                        aria-label={label}
                        placeholder={label}
                        data-testid="rubric-text"
                      />
                    </Form.Item>
                    <RemoveRow
                      label={label}
                      disabled={fields.length <= 1}
                      onClick={() => remove(field.name)}
                    />
                  </div>
                );
              })}
            </div>
            <AddRow
              label={t('admin.exercise.addRubric')}
              disabled={fields.length >= 12}
              onClick={() => addLabel(form, 'rubric', 'rubric')}
              testId="add-rubric"
            />
          </>
        )}
      </Form.List>
    </>
  );
}

/** Question or explanation: Markdown with preview. */
export function MarkdownField({
  name,
  label,
  extra,
  max,
  required,
  testId,
}: {
  name: 'question' | 'explanation';
  label: string;
  extra?: string;
  max: number;
  required?: string;
  testId: string;
}) {
  const { t } = useTranslation();
  return (
    <Form.Item
      name={name}
      label={label}
      extra={extra}
      rules={[
        ...(required
          ? [{ required: true, whitespace: true, message: required }]
          : []),
        { max, message: t('admin.validation.max', { max }) },
      ]}
    >
      <MarkdownEditor maxLength={max} rows={6} testId={testId} />
    </Form.Item>
  );
}
