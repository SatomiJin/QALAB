import { TranslationOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

/** Opens the Vietnamese translation editor of a content item. */
export function TranslationLink({
  to,
  label,
  small = false,
  testId,
}: {
  to: string;
  /** Accessible name when the visible text is not enough (a module row). */
  label?: string;
  small?: boolean;
  testId: string;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <Button
      type={small ? 'text' : 'default'}
      size={small ? 'small' : 'middle'}
      icon={<TranslationOutlined aria-hidden />}
      onClick={() => void navigate(to)}
      aria-label={label}
      data-testid={testId}
    >
      {t('admin.translation.open')}
    </Button>
  );
}
