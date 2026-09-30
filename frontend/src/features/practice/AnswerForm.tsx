import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Checkbox,
  Form,
  type FormInstance,
  Input,
  Radio,
  Select,
  Tooltip,
} from 'antd';
import { useTranslation } from 'react-i18next';
import {
  ANSWER_LIMITS,
  type Exercise,
  PRIORITIES,
  SEVERITIES,
  TEST_TYPES,
} from '../../types/api';
import type { FormValues } from './answers';
import styles from './Practice.module.scss';

interface AnswerFormProps {
  exercise: Exercise;
  form: FormInstance<FormValues>;
  onSubmit: (values: FormValues) => void;
  submitting: boolean;
  /** Messages that belong to no single field. */
  errors: string[];
}

/** The answer form for the exercise's type. The backend grades it. */
export function AnswerForm({
  exercise,
  form,
  onSubmit,
  submitting,
  errors,
}: AnswerFormProps) {
  const { t } = useTranslation();

  return (
    <Form<FormValues>
      form={form}
      layout="vertical"
      requiredMark={false}
      className={styles.form}
      onFinish={onSubmit}
      data-testid="answer-form"
      initialValues={initialValues(exercise)}
    >
      <Fields exercise={exercise} />
      <div className={styles.actions}>
        <Button
          type="primary"
          size="large"
          htmlType="submit"
          loading={submitting}
          data-testid="submit-answer"
        >
          {t('practice.exercise.submit')}
        </Button>
        {errors.length > 0 && (
          <Alert
            type="error"
            showIcon
            title={t('practice.exercise.submitFailed')}
            description={errors.join(' ')}
            data-testid="submit-error"
          />
        )}
      </div>
    </Form>
  );
}

function initialValues(exercise: Exercise): FormValues {
  if (exercise.type === 'test_case') return { steps: [''] };
  if (exercise.type === 'bug_report') return { stepsToReproduce: [''] };
  return {};
}

function Fields({ exercise }: { exercise: Exercise }) {
  switch (exercise.type) {
    case 'multiple_choice':
      return <MultipleChoice exercise={exercise} />;
    case 'classification':
      return <Classification exercise={exercise} />;
    case 'test_case':
      return <TestCaseFields />;
    case 'bug_report':
      return <BugReportFields />;
    case 'scenario':
      return <ScenarioField />;
  }
}

function MultipleChoice({ exercise }: { exercise: Exercise }) {
  const { t } = useTranslation();
  const options = exercise.prompt.options ?? [];
  const multiple = exercise.prompt.multiple === true;
  const rules = [
    {
      required: true,
      message: t('practice.exercise.selectRequired'),
    },
  ];

  return (
    <>
      <p className={styles.hint}>
        {multiple
          ? t('practice.exercise.chooseAny')
          : t('practice.exercise.chooseOne')}
      </p>
      <Form.Item name="selected" rules={rules}>
        {multiple ? (
          <Checkbox.Group className={styles.choices}>
            {options.map((option) => (
              <Checkbox key={option.id} value={option.id}>
                {option.text}
              </Checkbox>
            ))}
          </Checkbox.Group>
        ) : (
          <Radio.Group className={styles.choices}>
            {options.map((option) => (
              <Radio key={option.id} value={option.id}>
                {option.text}
              </Radio>
            ))}
          </Radio.Group>
        )}
      </Form.Item>
    </>
  );
}

function Classification({ exercise }: { exercise: Exercise }) {
  const { t } = useTranslation();
  const categories = exercise.prompt.categories ?? [];

  return (
    <>
      <p className={styles.hint}>{t('practice.exercise.classifyHint')}</p>
      <ul className={styles.classify}>
        {(exercise.prompt.items ?? []).map((item) => (
          <li key={item.id} data-testid="classify-item">
            <p className={styles.classifyItem} id={`item-${item.id}`}>
              {item.text}
            </p>
            <Form.Item
              name={['mapping', item.id]}
              rules={[
                {
                  required: true,
                  message: t('practice.exercise.classifyRequired'),
                },
              ]}
            >
              <Radio.Group
                aria-labelledby={`item-${item.id}`}
                optionType="button"
                options={categories.map((category) => ({
                  value: category.id,
                  label: category.text,
                }))}
              />
            </Form.Item>
          </li>
        ))}
      </ul>
    </>
  );
}

/** A numbered list of steps: they are a real sequence. */
function StepsField({ name, label }: { name: string; label: string }) {
  const { t } = useTranslation();

  return (
    <Form.Item label={label} required={false}>
      <Form.List name={name}>
        {(fields, { add, remove }, { errors }) => (
          <>
            <ol className={styles.steps}>
              {fields.map((field, index) => (
                <li key={field.key} className={styles.step}>
                  <span className={styles.stepNumber}>{index + 1}.</span>
                  <Form.Item
                    name={field.name}
                    rules={[
                      {
                        max: ANSWER_LIMITS.stepLength,
                        message: t('practice.exercise.tooLong', {
                          max: ANSWER_LIMITS.stepLength,
                        }),
                      },
                    ]}
                  >
                    <Input
                      aria-label={`${label} ${index + 1}`}
                      placeholder={t('practice.exercise.stepPlaceholder')}
                    />
                  </Form.Item>
                  <Tooltip
                    title={t('practice.exercise.removeStep', {
                      number: index + 1,
                    })}
                  >
                    <Button
                      type="text"
                      icon={<DeleteOutlined />}
                      aria-label={t('practice.exercise.removeStep', {
                        number: index + 1,
                      })}
                      disabled={fields.length === 1}
                      onClick={() => remove(field.name)}
                    />
                  </Tooltip>
                </li>
              ))}
            </ol>
            <Button
              icon={<PlusOutlined />}
              onClick={() => add('')}
              disabled={fields.length >= ANSWER_LIMITS.steps}
            >
              {t('practice.exercise.addStep')}
            </Button>
            <Form.ErrorList errors={errors} />
          </>
        )}
      </Form.List>
    </Form.Item>
  );
}

function TextField({
  name,
  max,
  rows,
}: {
  name: string;
  max: number;
  rows?: number;
}) {
  const { t } = useTranslation();
  const label = t(`practice.fields.${name}` as 'practice.fields.title');
  const rules = [
    {
      max,
      message: t('practice.exercise.tooLong', { max }),
    },
  ];
  return (
    <Form.Item name={name} label={label} rules={rules}>
      {rows ? (
        <Input.TextArea autoSize={{ minRows: rows, maxRows: 12 }} />
      ) : (
        <Input />
      )}
    </Form.Item>
  );
}

function ChoiceField({
  name,
  values,
  labelKey,
}: {
  name: string;
  values: readonly string[];
  labelKey: 'priority' | 'severity' | 'testType';
}) {
  const { t } = useTranslation();
  return (
    <Form.Item
      name={name}
      label={t(`practice.fields.${name}` as 'practice.fields.title')}
    >
      <Select
        allowClear
        placeholder={t('practice.exercise.notSet')}
        options={values.map((value) => ({
          value,
          label: t(`practice.${labelKey}.${value}` as 'practice.priority.high'),
        }))}
      />
    </Form.Item>
  );
}

function TestCaseFields() {
  const { t } = useTranslation();
  const { idLength, titleLength, textLength } = ANSWER_LIMITS;
  return (
    <>
      <p className={styles.hint}>{t('practice.exercise.formHint')}</p>
      <div className={styles.fieldPair}>
        <TextField name="testCaseId" max={idLength} />
        <ChoiceField name="priority" values={PRIORITIES} labelKey="priority" />
      </div>
      <TextField name="title" max={titleLength} />
      <TextField name="preconditions" max={textLength} rows={2} />
      <TextField name="testData" max={textLength} rows={2} />
      <StepsField name="steps" label={t('practice.fields.steps')} />
      <TextField name="expectedResult" max={textLength} rows={2} />
      <ChoiceField name="testType" values={TEST_TYPES} labelKey="testType" />
    </>
  );
}

function BugReportFields() {
  const { t } = useTranslation();
  const { idLength, titleLength, textLength, attachmentLength } = ANSWER_LIMITS;
  return (
    <>
      <p className={styles.hint}>{t('practice.exercise.formHint')}</p>
      <TextField name="bugId" max={idLength} />
      <TextField name="title" max={titleLength} />
      <TextField name="environment" max={textLength} />
      <TextField name="preconditions" max={textLength} rows={2} />
      <StepsField
        name="stepsToReproduce"
        label={t('practice.fields.stepsToReproduce')}
      />
      <TextField name="actualResult" max={textLength} rows={2} />
      <TextField name="expectedResult" max={textLength} rows={2} />
      <div className={styles.fieldPair}>
        <ChoiceField name="severity" values={SEVERITIES} labelKey="severity" />
        <ChoiceField name="priority" values={PRIORITIES} labelKey="priority" />
      </div>
      <TextField name="attachment" max={attachmentLength} />
    </>
  );
}

function ScenarioField() {
  const { t } = useTranslation();
  return (
    <Form.Item
      name="text"
      rules={[
        {
          required: true,
          whitespace: true,
          message: t('practice.exercise.scenarioRequired'),
        },
      ]}
    >
      <Input.TextArea
        aria-label={t('practice.types.scenario')}
        placeholder={t('practice.exercise.scenarioPlaceholder')}
        autoSize={{ minRows: 8, maxRows: 24 }}
        showCount
        maxLength={ANSWER_LIMITS.scenarioLength}
      />
    </Form.Item>
  );
}
