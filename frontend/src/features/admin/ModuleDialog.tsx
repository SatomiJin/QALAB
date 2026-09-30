import { Alert, App, Form, Input, Modal, Select } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { errorMessage } from '../../hooks/useErrorMessage';
import {
  type AdminModule,
  CONTENT_LIMITS,
  CONTENT_STATUSES,
  type ContentStatus,
} from '../../types/api';
import { applyFieldErrors } from '../auth/form-helpers';
import styles from './Admin.module.scss';
import { adminApi } from './admin-api';
import { useAdminMutation } from './queries';

interface ModuleFormValues {
  title: string;
  description: string;
  status: ContentStatus;
}

const FIELDS = ['title', 'description', 'status'];

interface ModuleDialogProps {
  courseId: string;
  /** Edit this module; without it, add a new one at the end. */
  module?: AdminModule;
  onClose: () => void;
}

export function ModuleDialog({ courseId, module, onClose }: ModuleDialogProps) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [form] = Form.useForm<ModuleFormValues>();
  const [formError, setFormError] = useState<string | null>(null);
  const save = useAdminMutation((values: ModuleFormValues) =>
    module
      ? adminApi.updateModule(module.id, values)
      : adminApi.createModule(courseId, values),
  );

  const submit = (values: ModuleFormValues) => {
    setFormError(null);
    save.mutate(values, {
      onSuccess: () => {
        void message.success(t('admin.course.moduleSaved'));
        onClose();
      },
      onError: (error) => {
        if (!applyFieldErrors(form, error, FIELDS)) {
          setFormError(errorMessage(error, t));
        }
      },
    });
  };

  return (
    <Modal
      open
      title={
        module ? t('admin.course.editModule') : t('admin.course.newModule')
      }
      okText={module ? t('admin.save') : t('admin.course.addModule')}
      cancelText={t('admin.cancel')}
      onOk={() => form.submit()}
      onCancel={onClose}
      confirmLoading={save.isPending}
      okButtonProps={{ 'data-testid': 'module-submit' }}
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{
          title: module?.title ?? '',
          description: module?.description ?? '',
          status: module?.status ?? 'draft',
        }}
        onFinish={submit}
        name="module"
        data-testid="module-form"
      >
        {formError && (
          <Alert className={styles.formAlert} type="error" title={formError} />
        )}
        <Form.Item
          name="title"
          label={t('admin.fields.title')}
          rules={[
            {
              required: true,
              whitespace: true,
              message: t('admin.validation.title'),
            },
            {
              max: CONTENT_LIMITS.titleLength,
              message: t('admin.validation.max', {
                max: CONTENT_LIMITS.titleLength,
              }),
            },
          ]}
        >
          <Input data-testid="module-title" />
        </Form.Item>
        <Form.Item
          name="description"
          label={t('admin.fields.description')}
          rules={[
            {
              max: CONTENT_LIMITS.descriptionLength,
              message: t('admin.validation.max', {
                max: CONTENT_LIMITS.descriptionLength,
              }),
            },
          ]}
        >
          <Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} />
        </Form.Item>
        <Form.Item name="status" label={t('admin.fields.status')}>
          <StatusSelect testId="module-status" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

/** Draft / published / archived, for modules, lessons and exercises. */
export function StatusSelect({
  id,
  value,
  onChange,
  testId,
}: {
  /** Set by Form.Item, so the label points at the select. */
  id?: string;
  value?: ContentStatus;
  onChange?: (status: ContentStatus) => void;
  testId?: string;
}) {
  const { t } = useTranslation();
  return (
    <Select<ContentStatus>
      id={id}
      value={value}
      onChange={onChange}
      data-testid={testId}
      options={CONTENT_STATUSES.map((status) => ({
        value: status,
        label: t(`admin.status.${status}`),
      }))}
    />
  );
}
