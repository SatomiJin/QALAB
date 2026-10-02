import { Form } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { PageLoader } from '../../../components/feedback/PageLoader';
import { PageHeader } from '../../../components/PageHeader';
import { PageTrail } from '../../../components/PageTrail';
import { SideLayout } from '../../../components/SideLayout';
import { VerdictTag } from '../../../components/VerdictTag';
import { errorMessage } from '../../../hooks/useErrorMessage';
import { ApiError } from '../../../lib/api';
import { NotFoundPage } from '../../../pages/NotFoundPage';
import type { Attempt, Exercise, Review } from '../../../types/api';
import { LessonMarkdown } from '../../learning/LessonMarkdown';
import { useContentLanguage } from '../../learning/queries';
import { TranslationNote } from '../../learning/TranslationNote';
import { AnswerForm } from '../AnswerForm';
import {
  answerFieldErrors,
  type FormValues,
  toAnswer,
  toFormValues,
} from '../answers';
import { AttemptHistory } from '../AttemptHistory';
import { exerciseVerdict, kindOf, practiceListPath } from '../kinds';
import { useAttempts, useExercise, useSubmitAttempt } from '../queries';
import { ResultView } from '../ResultView';
import styles from '../Practice.module.scss';

export function ExercisePage() {
  const { exerciseId = '' } = useParams();
  const lang = useContentLanguage();
  const exercise = useExercise(exerciseId, lang);

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
  // Keyed by id: another exercise starts with a fresh form and no result.
  return <ExerciseView key={exercise.data.id} exercise={exercise.data} />;
}

interface Shown {
  attempt: Attempt;
  review: Review;
}

function ExerciseView({ exercise }: { exercise: Exercise }) {
  const { t } = useTranslation();
  const lang = useContentLanguage();
  const [form] = Form.useForm<FormValues>();
  const [shown, setShown] = useState<Shown | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [otherErrors, setOtherErrors] = useState<string[]>([]);
  const resultRef = useRef<HTMLElement>(null);
  const submit = useSubmitAttempt(exercise.id, lang);
  const submitError = (error: unknown) => errorMessage(error, t);
  const attempts = useAttempts(exercise.id, {
    page: historyPage,
    pageSize: 20,
    lang,
  });

  const kind = kindOf(exercise.type);
  const listPath = practiceListPath(kind);

  // Bring the result into view (and focus) when another attempt is shown.
  const shownId = shown?.attempt.id;
  useEffect(() => {
    if (!shownId) return;
    const reduce = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    resultRef.current?.scrollIntoView({
      behavior: reduce ? 'auto' : 'smooth',
      block: 'start',
    });
    resultRef.current?.focus({ preventScroll: true });
  }, [shownId]);

  const onSubmit = (values: FormValues) => {
    setOtherErrors([]);
    submit.mutate(
      { answer: toAnswer(exercise.type, values) },
      {
        onSuccess: (result) => {
          setShown({ attempt: result.attempt, review: result.review });
          setHistoryPage(1);
        },
        onError: (error) => {
          // Field errors go on the form; the rest into the alert.
          if (error instanceof ApiError && error.status === 400) {
            const { fields, other } = answerFieldErrors(error.details);
            form.setFields(fields);
            setOtherErrors(fields.length ? other : [submitError(error)]);
          } else {
            setOtherErrors([submitError(error)]);
          }
        },
      },
    );
  };

  const tryAgain = () => {
    if (shown) {
      form.setFieldsValue(
        toFormValues(
          exercise.type,
          shown.attempt.answer,
          exercise.prompt.multiple,
        ),
      );
    }
    setShown(null);
    submit.reset();
    window.scrollTo({ top: 0 });
  };

  return (
    <>
      <PageTrail
        back={{ to: listPath, label: t('practice.exercise.back') }}
        items={[
          { label: t('nav.practice'), to: '/practice' },
          { label: t(`pages.${kind}.title`), to: listPath },
          { label: t(`practice.types.${exercise.type}`) },
        ]}
      />
      <PageHeader title={t(`practice.types.${exercise.type}`)} />

      <SideLayout
        asideLabel={t('practice.exercise.aside')}
        asideTestId="exercise-aside"
        aside={
          <div className={styles.status}>
            <div className={styles.meta}>
              <span data-testid="exercise-status">
                <VerdictTag verdict={exerciseVerdict(exercise.stats)} />
              </span>
              <span>{t(`practice.difficulty.${exercise.difficulty}`)}</span>
              <span>
                {t('practice.exercise.fromLesson')}{' '}
                <Link to={`/learning/lessons/${exercise.lesson.id}`}>
                  {exercise.lesson.title}
                </Link>
              </span>
            </div>
          </div>
        }
      >
        <TranslationNote status={exercise.translation} />

        <div className={styles.question}>
          <LessonMarkdown
            source={exercise.question}
            testId="exercise-question"
          />
        </div>

        {/* Hidden, not unmounted, while a result is shown: "Try again" keeps
          what was typed. */}
        <div hidden={shown !== null}>
          <AnswerForm
            exercise={exercise}
            form={form}
            onSubmit={onSubmit}
            submitting={submit.isPending}
            errors={submit.isError ? otherErrors : []}
          />
        </div>

        {shown && (
          <ResultView
            ref={resultRef}
            exercise={exercise}
            attempt={shown.attempt}
            review={shown.review}
            onTryAgain={tryAgain}
            onAttemptChange={(attempt) => setShown({ ...shown, attempt })}
          />
        )}

        <AttemptHistory
          page={attempts.data}
          loading={attempts.isPending}
          failed={attempts.isError}
          onRetry={() => void attempts.refetch()}
          shownId={shown?.attempt.id ?? null}
          onShow={(attempt) =>
            attempts.data?.review &&
            setShown({ attempt, review: attempts.data.review })
          }
          onPage={setHistoryPage}
        />
      </SideLayout>
    </>
  );
}
