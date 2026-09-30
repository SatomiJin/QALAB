import { Alert, App, Form, Input, Modal } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { errorMessage } from '../../hooks/useErrorMessage';
import { CONTENT_LIMITS } from '../../types/api';
import { applyFieldErrors } from '../auth/form-helpers';
import styles from './Admin.module.scss';
import { adminApi } from './admin-api';
import { slugify } from './content';
import { SlugField } from './CourseFields';
import { useAdminMutation } from './queries';

interface LessonFormValues {
  title: string;
  slug: string;
}

/** Title and slug for a new draft lesson, then its editor opens. */
export function NewLessonDialog({
  moduleId,
  onClose,
}: {
  moduleId: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [form] = Form.useForm<LessonFormValues>();
  const [formError, setFormError] = useState<string | null>(null);
  const create = useAdminMutation((values: LessonFormValues) =>
    adminApi.createLesson(moduleId, values),
  );

  const submit = (values: LessonFormValues) => {
    setFormError(null);
    create.mutate(values, {
      onSuccess: (lesson) => {
        void message.success(t('admin.course.lessonCreated'));
        onClose();
        void navigate(`/admin/lessons/${lesson.id}`);
      },
      onError: (error) => {
        if (!applyFieldErrors(form, error, ['title', 'slug'])) {
          setFormError(errorMessage(error, t));
        }
      },
    });
  };

  return (
    <Modal
      open
      title={t('admin.course.newLesson')}
      okText={t('admin.course.createLesson')}
      cancelText={t('admin.cancel')}
      onOk={() => form.submit()}
      onCancel={onClose}
      confirmLoading={create.isPending}
      okButtonProps={{ 'data-testid': 'lesson-submit' }}
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={submit}
        name="newLesson"
        data-testid="new-lesson-form"
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
          <Input
            data-testid="lesson-title"
            onChange={(event) => {
              if (!form.isFieldTouched('slug')) {
                form.setFieldValue('slug', slugify(event.target.value));
              }
            }}
          />
        </Form.Item>
        <SlugField />
      </Form>
    </Modal>
  );
}
