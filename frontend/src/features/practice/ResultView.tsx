import { Alert, Button, Checkbox } from 'antd';
import { forwardRef, type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { VerdictTag } from '../../components/VerdictTag';
import { useErrorMessage } from '../../hooks/useErrorMessage';
import {
  type Attempt,
  type ConceptResult,
  type Exercise,
  type Feedback,
  PASS_SCORE,
  type Review,
  type ScorePart,
} from '../../types/api';
import { LessonMarkdown } from '../learning/LessonMarkdown';
import { attemptVerdict, isFreeText } from './kinds';
import { useSaveSelfAssessment } from './queries';
import styles from './Practice.module.scss';

interface ResultViewProps {
  exercise: Exercise;
  attempt: Attempt;
  review: Review;
  onTryAgain: () => void;
  /** Updates the shown attempt after the self-assessment is saved. */
  onAttemptChange: (attempt: Attempt) => void;
}

/**
 * The graded attempt, read like a test run of the answer: score and
 * verdict, then one row per check (expected, actual, verdict), then the
 * explanation, the model answer and the self-assessment checklist.
 */
export const ResultView = forwardRef<HTMLElement, ResultViewProps>(
  function ResultView(
    { exercise, attempt, review, onTryAgain, onAttemptChange },
    ref,
  ) {
    const { t } = useTranslation();
    const free = isFreeText(exercise.type);
    const needsSelfAssessment =
      free && review.rubric.length > 0 && attempt.selfAssessment === null;

    return (
      <section
        ref={ref}
        tabIndex={-1}
        className={styles.result}
        aria-label={t('practice.result.label')}
        data-testid="result"
        data-state={attempt.isCorrect ? 'pass' : 'fail'}
      >
        <div className={styles.score}>
          <span className={styles.scoreValue} data-testid="result-score">
            {attempt.score}
          </span>
          <span className={styles.scoreUnit}>{t('practice.result.outOf')}</span>
          <VerdictTag
            verdict={attemptVerdict(attempt.isCorrect)}
            size="large"
          />
        </div>
        <p className={styles.muted}>
          {free
            ? t('practice.result.freeRule', { pass: PASS_SCORE })
            : t('practice.result.choiceRule')}
        </p>
        {'parts' in attempt.feedback && attempt.feedback.parts.length > 1 && (
          <Parts parts={attempt.feedback.parts} />
        )}

        <Checks exercise={exercise} feedback={attempt.feedback} />

        {review.explanation.trim() && (
          <div>
            <h2 className={styles.sectionTitle}>
              {t('practice.result.explanation')}
            </h2>
            <LessonMarkdown source={review.explanation} testId="explanation" />
          </div>
        )}
        {review.modelAnswer && (
          <div>
            <h2 className={styles.sectionTitle}>
              {t('practice.result.modelAnswer')}
            </h2>
            <LessonMarkdown source={review.modelAnswer} testId="model-answer" />
          </div>
        )}
        {free && review.rubric.length > 0 && (
          <SelfAssessment
            exercise={exercise}
            attempt={attempt}
            review={review}
            onSaved={onAttemptChange}
          />
        )}

        <div>
          {/* The one primary action: saving the checklist, else trying again. */}
          <Button
            type={needsSelfAssessment ? 'default' : 'primary'}
            size="large"
            onClick={onTryAgain}
            className={styles.primaryAction}
            data-testid="try-again"
          >
            {t('practice.exercise.tryAgain')}
          </Button>
        </div>
      </section>
    );
  },
);

function Parts({ parts }: { parts: ScorePart[] }) {
  const { t } = useTranslation();
  return (
    <ul className={styles.parts} data-testid="score-parts">
      {parts.map((part) => (
        <li key={part.part}>
          {t('practice.result.part', {
            name: t(`practice.result.parts.${part.part}`),
            score: part.score,
            weight: part.weight,
          })}
        </li>
      ))}
    </ul>
  );
}

interface CheckRow {
  key: string;
  name: ReactNode;
  expected?: ReactNode;
  actual?: ReactNode;
  /** null: nothing to judge (an option that was rightly left out). */
  pass: boolean | null;
}

function Checks({
  exercise,
  feedback,
}: {
  exercise: Exercise;
  feedback: Feedback;
}) {
  const { t } = useTranslation();
  const rows = useCheckRows(exercise, feedback);

  return (
    <div>
      {feedback.type === 'classification' && (
        <p className={styles.muted}>
          {t('practice.result.classified', {
            correct: feedback.correctCount,
            total: feedback.total,
          })}
        </p>
      )}
      <ul className={styles.checks} data-testid="checks">
        <li className={styles.checkHead} aria-hidden>
          <span>{t('practice.result.check')}</span>
          <span>{t('practice.result.expected')}</span>
          <span>{t('practice.result.actual')}</span>
          <span />
        </li>
        {rows.map((row) => (
          <li
            key={row.key}
            className={`${styles.check} ${row.pass === null ? styles.checkMuted : ''}`}
            data-testid="check"
            data-state={row.pass === null ? 'none' : row.pass ? 'pass' : 'fail'}
          >
            <span className={styles.checkName}>{row.name}</span>
            <span className={styles.checkCell}>
              <span className={styles.cellLabel}>
                {t('practice.result.expected')}
              </span>
              {row.expected}
            </span>
            <span className={styles.checkCell}>
              <span className={styles.cellLabel}>
                {t('practice.result.actual')}
              </span>
              {row.actual}
            </span>
            <span className={styles.checkVerdict}>
              {row.pass !== null && (
                <VerdictTag verdict={row.pass ? 'pass' : 'fail'} />
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function useCheckRows(exercise: Exercise, feedback: Feedback): CheckRow[] {
  const { t } = useTranslation();
  const label = (
    list: { id: string; text: string }[] | undefined,
    id: string,
  ) => list?.find((entry) => entry.id === id)?.text ?? id;
  const notSet = t('practice.exercise.notSet');
  const concepts = (list: ConceptResult[]): CheckRow[] =>
    list.map((concept) => ({
      key: `concept-${concept.concept}`,
      name: t('practice.result.conceptCheck', { concept: concept.concept }),
      expected: t('practice.result.mentioned'),
      actual: concept.matched
        ? t('practice.result.mentioned')
        : t('practice.result.notFound'),
      pass: concept.matched,
    }));
  const fields = (list: { field: string; present: boolean }[]): CheckRow[] =>
    list.map(({ field, present }) => {
      const name = t(`practice.fields.${field}` as 'practice.fields.title');
      return {
        key: `field-${field}`,
        name: t('practice.result.fieldCheck', { field: name }),
        expected: t('practice.result.filled'),
        actual: present
          ? t('practice.result.filled')
          : t('practice.result.empty'),
        pass: present,
      };
    });

  switch (feedback.type) {
    case 'multiple_choice':
      // Expected / actual say only whether the option is chosen; the
      // verdict says whether that was right.
      return feedback.options.map((option) => ({
        key: option.id,
        name: label(exercise.prompt.options, option.id),
        expected: option.correct
          ? t('practice.result.chosen')
          : t('practice.result.notChosen'),
        actual: option.selected
          ? t('practice.result.chosen')
          : t('practice.result.notChosen'),
        pass:
          option.selected || option.correct
            ? option.selected === option.correct
            : null,
      }));
    case 'classification':
      return feedback.items.map((item) => ({
        key: item.id,
        name: label(exercise.prompt.items, item.id),
        expected: label(exercise.prompt.categories, item.correct),
        actual: label(exercise.prompt.categories, item.chosen),
        pass: item.isCorrect,
      }));
    case 'test_case':
      return [...fields(feedback.fields), ...concepts(feedback.concepts)];
    case 'bug_report': {
      const match = (
        key: 'severity' | 'priority',
        result: { expected: string; given: string | null; match: boolean },
      ): CheckRow => ({
        key,
        name: t(`practice.fields.${key}`),
        expected: t(
          `practice.${key}.${result.expected}` as 'practice.priority.high',
        ),
        actual: result.given
          ? t(`practice.${key}.${result.given}` as 'practice.priority.high')
          : notSet,
        pass: result.match,
      });
      return [
        ...fields(feedback.fields),
        match('severity', feedback.severity),
        match('priority', feedback.priority),
        ...concepts(feedback.concepts),
      ];
    }
    case 'scenario':
      return concepts(feedback.concepts);
  }
}

function SelfAssessment({
  exercise,
  attempt,
  review,
  onSaved,
}: {
  exercise: Exercise;
  attempt: Attempt;
  review: Review;
  onSaved: (attempt: Attempt) => void;
}) {
  const { t } = useTranslation();
  const save = useSaveSelfAssessment(exercise.id);
  const saveError = useErrorMessage(save.error);
  const saved = attempt.selfAssessment;
  const [checked, setChecked] = useState<string[]>(saved?.checked ?? []);

  return (
    <div data-testid="self-assessment" data-state={saved ? 'saved' : 'open'}>
      <h2 className={styles.sectionTitle}>
        {t('practice.result.selfAssessment')}
      </h2>
      <p className={styles.hint}>{t('practice.result.selfAssessmentHint')}</p>
      <Checkbox.Group
        className={styles.rubric}
        value={saved?.checked ?? checked}
        disabled={saved !== null || save.isPending}
        onChange={(values) => setChecked(values as string[])}
        options={review.rubric.map((entry) => ({
          value: entry.id,
          label: entry.text,
        }))}
      />
      <div className={styles.rubricActions}>
        {saved ? (
          <p className={styles.muted} data-testid="self-assessment-saved">
            {t('practice.result.selfAssessmentSaved', {
              checked: saved.checked.length,
              total: review.rubric.length,
            })}
          </p>
        ) : (
          <Button
            type="primary"
            loading={save.isPending}
            className={styles.primaryAction}
            onClick={() =>
              save.mutate(
                { attemptId: attempt.id, checked },
                { onSuccess: onSaved },
              )
            }
            data-testid="save-self-assessment"
          >
            {t('practice.result.saveSelfAssessment')}
          </Button>
        )}
        {save.isError && (
          <Alert
            type="error"
            showIcon
            title={t('practice.result.selfAssessmentFailed')}
            description={saveError}
          />
        )}
      </div>
    </div>
  );
}
