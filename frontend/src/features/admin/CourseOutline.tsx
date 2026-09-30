import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import { App, Button } from 'antd';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { EmptyState } from '../../components/feedback/EmptyState';
import { errorMessage } from '../../hooks/useErrorMessage';
import type {
  AdminCourse,
  AdminLessonSummary,
  AdminModule,
} from '../../types/api';
import styles from './Admin.module.scss';
import { adminApi } from './admin-api';
import { DeleteButton } from './DeleteButton';
import { ModuleDialog } from './ModuleDialog';
import { NewLessonDialog } from './NewLessonDialog';
import { useAdminMutation } from './queries';
import { SortableList } from './SortableList';
import { StatusTag } from './StatusTag';

type Dialog =
  | { kind: 'module'; module?: AdminModule }
  | { kind: 'lesson'; moduleId: string }
  | null;

/**
 * The course as a test plan outline: numbered modules, and their lessons as
 * cards (`1.2`), both reorderable by drag-and-drop or arrows.
 */
export function CourseOutline({ course }: { course: AdminCourse }) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [dialog, setDialog] = useState<Dialog>(null);
  const reorderModules = useAdminMutation((ids: string[]) =>
    adminApi.reorderModules(course.id, { ids }),
  );
  const reorderLessons = useAdminMutation(
    (vars: { moduleId: string; ids: string[] }) =>
      adminApi.reorderLessons(vars.moduleId, { ids: vars.ids }),
  );

  // Reorders show at once; a failure puts the old order back and says why.
  const saved = (promise: Promise<unknown>) =>
    promise
      .then(() => message.success(t('admin.reorder.saved')))
      .catch((error: unknown) => {
        void message.error(errorMessage(error, t));
        throw error;
      });

  return (
    <section className={styles.section} aria-labelledby="course-outline">
      <div className={styles.sectionHead}>
        <h2 id="course-outline">{t('admin.course.outline')}</h2>
        <Button
          icon={<PlusOutlined aria-hidden />}
          onClick={() => setDialog({ kind: 'module' })}
          data-testid="add-module"
        >
          {t('admin.course.addModule')}
        </Button>
      </div>

      {course.modules.length === 0 ? (
        <EmptyState description={t('admin.course.noModules')} />
      ) : (
        <>
          <p className={styles.muted}>{t('admin.course.outlineHint')}</p>
          <SortableList
            items={course.modules}
            titleOf={(module) => module.title}
            className={styles.outline}
            testId="module-list"
            onReorder={(ids) => saved(reorderModules.mutateAsync(ids))}
            renderItem={(module, index, handle) => (
              <ModuleSection
                module={module}
                number={index + 1}
                controls={handle.controls}
                onEdit={() => setDialog({ kind: 'module', module })}
                onAddLesson={() =>
                  setDialog({ kind: 'lesson', moduleId: module.id })
                }
                onReorderLessons={(ids) =>
                  saved(
                    reorderLessons.mutateAsync({ moduleId: module.id, ids }),
                  )
                }
              />
            )}
          />
        </>
      )}

      {dialog?.kind === 'module' && (
        <ModuleDialog
          courseId={course.id}
          module={dialog.module}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'lesson' && (
        <NewLessonDialog
          moduleId={dialog.moduleId}
          onClose={() => setDialog(null)}
        />
      )}
    </section>
  );
}

interface ModuleSectionProps {
  module: AdminModule;
  number: number;
  controls: ReactNode;
  onEdit: () => void;
  onAddLesson: () => void;
  onReorderLessons: (ids: string[]) => Promise<unknown>;
}

function ModuleSection({
  module,
  number,
  controls,
  onEdit,
  onAddLesson,
  onReorderLessons,
}: ModuleSectionProps) {
  const { t } = useTranslation();
  const remove = useAdminMutation(() => adminApi.deleteModule(module.id));

  return (
    <div className={styles.module} data-testid="admin-module">
      <div className={styles.moduleHead}>
        {controls}
        <div className={styles.cardBody}>
          <span className={styles.moduleNumber}>
            {t('admin.course.moduleNumber', { n: number })}
          </span>
          <h3>{module.title}</h3>
          <span className={styles.statusLine}>
            <StatusTag status={module.status} />
            {module.inUse && (
              <span data-testid="in-use">{t('admin.inUse')}</span>
            )}
          </span>
        </div>
        <div className={styles.actions}>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined aria-hidden />}
            onClick={onEdit}
            data-testid="edit-module"
          >
            {t('admin.edit')}
          </Button>
          <Button
            type="text"
            size="small"
            icon={<PlusOutlined aria-hidden />}
            onClick={onAddLesson}
            data-testid="add-lesson"
          >
            {t('admin.course.addLesson')}
          </Button>
          <DeleteButton
            size="small"
            title={module.title}
            inUse={module.inUse}
            onDelete={() => remove.mutateAsync(undefined)}
            testId="delete-module"
          />
        </div>
      </div>
      <div className={styles.moduleBody}>
        {module.lessons.length === 0 ? (
          <p className={styles.muted}>{t('admin.course.noLessons')}</p>
        ) : (
          <SortableList
            items={module.lessons}
            titleOf={(lesson) => lesson.title}
            className={styles.cardsTight}
            testId="lesson-list"
            onReorder={onReorderLessons}
            renderItem={(lesson, index, handle) => (
              <LessonCard
                lesson={lesson}
                number={`${number}.${index + 1}`}
                controls={handle.controls}
              />
            )}
          />
        )}
      </div>
    </div>
  );
}

function LessonCard({
  lesson,
  number,
  controls,
}: {
  lesson: AdminLessonSummary;
  number: string;
  controls: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <article className={styles.card} data-testid="admin-lesson">
      {controls}
      <span className={styles.number}>{number}</span>
      <div className={styles.cardBody}>
        <Link to={`/admin/lessons/${lesson.id}`} className={styles.cardLink}>
          {lesson.title}
        </Link>
        <p className={styles.meta}>
          <span className={styles.count}>
            {t('learning.minutes', { count: lesson.estimatedMinutes })}
          </span>
          <span className={styles.count}>
            {t('admin.course.exercises', { count: lesson.exercises.length })}
          </span>
          {lesson.inUse && <span>{t('admin.inUse')}</span>}
        </p>
      </div>
      <StatusTag status={lesson.status} />
    </article>
  );
}
