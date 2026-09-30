import { TranslationOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import type { TranslationStatus } from '../../types/api';
import shared from './Learning.module.scss';

interface TranslationNoteProps {
  status: TranslationStatus;
  /** The learner switched this page to the English original. */
  showingOriginal?: boolean;
  /** Offers the original / translation switch when given. */
  onToggle?: () => void;
}

/**
 * Says where the Vietnamese text comes from: a person (`manual`), a machine
 * (`machine`), or nowhere yet (`unavailable`, English shown). Nothing for
 * English.
 */
export function TranslationNote({
  status,
  showingOriginal = false,
  onToggle,
}: TranslationNoteProps) {
  const { t } = useTranslation();

  if (!showingOriginal && status === 'none') return null;

  const state = showingOriginal ? 'original' : status;
  const text = showingOriginal
    ? t('learning.translation.original')
    : t(`learning.translation.${status === 'none' ? 'unavailable' : status}`);
  // There is a Vietnamese text to switch away from (or back to).
  const canToggle =
    onToggle &&
    (showingOriginal || status === 'machine' || status === 'manual');

  return (
    <p
      className={shared.note}
      data-testid="translation-note"
      data-state={state}
    >
      <TranslationOutlined aria-hidden className={shared.noteIcon} />
      <span>{text}</span>
      {canToggle && (
        <Button type="link" className={shared.noteAction} onClick={onToggle}>
          {showingOriginal
            ? t('learning.translation.showTranslation')
            : t('learning.translation.showOriginal')}
        </Button>
      )}
    </p>
  );
}
