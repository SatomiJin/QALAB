import { Grid, Input, Segmented } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LessonMarkdown } from '../learning/LessonMarkdown';
import styles from './Admin.module.scss';

interface MarkdownEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  maxLength: number;
  rows?: number;
  testId?: string;
  id?: string;
}

/**
 * Markdown with a live preview rendered exactly as learners see it
 * (`LessonMarkdown`). Side by side on wide screens; Write / Preview tabs on
 * narrow ones. Works as an Ant Design form control.
 */
export function MarkdownEditor({
  value = '',
  onChange,
  maxLength,
  rows = 18,
  testId = 'markdown-input',
  id,
}: MarkdownEditorProps) {
  const { t } = useTranslation();
  const screens = Grid.useBreakpoint();
  const wide = screens.lg ?? true;
  const [tab, setTab] = useState<'write' | 'preview'>('write');

  const input = (
    <div>
      <Input.TextArea
        id={id}
        value={value}
        rows={rows}
        onChange={(event) => onChange?.(event.target.value)}
        data-testid={testId}
        spellCheck
      />
      <p className={styles.meta}>
        <span className={styles.count}>
          {t('admin.lesson.characters', {
            count: value.length,
            max: maxLength,
          })}
        </span>
      </p>
    </div>
  );
  const preview = (
    <div
      className={styles.previewPane}
      aria-label={t('admin.lesson.preview')}
      role="region"
    >
      {value.trim() ? (
        <LessonMarkdown source={value} testId="markdown-preview" />
      ) : (
        <p className={styles.muted}>{t('admin.lesson.previewEmpty')}</p>
      )}
    </div>
  );

  if (wide) {
    return (
      <div className={styles.editor}>
        {input}
        {preview}
      </div>
    );
  }
  return (
    <div className={styles.editorStack}>
      <Segmented
        value={tab}
        onChange={(next) => setTab(next as 'write' | 'preview')}
        options={[
          { value: 'write', label: t('admin.lesson.write') },
          { value: 'preview', label: t('admin.lesson.preview') },
        ]}
        data-testid="markdown-tabs"
      />
      {tab === 'write' ? input : preview}
    </div>
  );
}
