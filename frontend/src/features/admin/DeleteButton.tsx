import { DeleteOutlined } from '@ant-design/icons';
import { App, Button, Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';
import { errorMessage } from '../../hooks/useErrorMessage';

interface DeleteButtonProps {
  title: string;
  /** Learner data exists: offer archiving instead (the API would say 409). */
  inUse: boolean;
  onDelete: () => Promise<unknown>;
  onDeleted?: () => void;
  size?: 'small' | 'middle';
  testId?: string;
}

/** Hard delete, only for unused content, after a confirmation. */
export function DeleteButton({
  title,
  inUse,
  onDelete,
  onDeleted,
  size = 'middle',
  testId = 'delete',
}: DeleteButtonProps) {
  const { t } = useTranslation();
  const { modal, message } = App.useApp();

  const confirm = () =>
    modal.confirm({
      title: t('admin.deleteConfirm.title', { title }),
      content: t('admin.deleteConfirm.body'),
      okText: t('admin.deleteConfirm.ok'),
      okButtonProps: { danger: true, 'data-testid': 'confirm-delete' },
      cancelText: t('admin.cancel'),
      onOk: async () => {
        try {
          await onDelete();
          void message.success(t('admin.deleted'));
          onDeleted?.();
        } catch (error) {
          void message.error(errorMessage(error, t));
        }
      },
    });

  const button = (
    <Button
      danger
      type="text"
      size={size}
      icon={<DeleteOutlined aria-hidden />}
      disabled={inUse}
      onClick={confirm}
      data-testid={testId}
    >
      {t('admin.delete')}
    </Button>
  );

  return inUse ? (
    <Tooltip title={t('admin.inUseHint')}>{button}</Tooltip>
  ) : (
    button
  );
}
