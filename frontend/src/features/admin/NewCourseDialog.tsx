import { Alert, App, Form, Modal } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { errorMessage } from '../../hooks/useErrorMessage';
import type { Skill } from '../../types/api';
import { applyFieldErrors } from '../auth/form-helpers';
import { adminApi } from './admin-api';
import { COURSE_FIELDS, type CourseFormValues } from './content';
import { CourseFields } from './CourseFields';
import styles from './Admin.module.scss';
import { useAdminMutation } from './queries';

interface NewCourseDialogProps {
  open: boolean;
  skills: Skill[];
  defaultSkillId?: string;
  onClose: () => void;
}

/** Creates a draft course, then opens its editor. */
export function NewCourseDialog({
  open,
  skills,
  defaultSkillId,
  onClose,
}: NewCourseDialogProps) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [form] = Form.useForm<CourseFormValues>();
  const [formError, setFormError] = useState<string | null>(null);
  const create = useAdminMutation(adminApi.createCourse);

  const submit = (values: CourseFormValues) => {
    setFormError(null);
    create.mutate(values, {
      onSuccess: (course) => {
        void message.success(t('admin.courses.create.created'));
        onClose();
        void navigate(`/admin/courses/${course.id}`);
      },
      onError: (error) => {
        if (!applyFieldErrors(form, error, COURSE_FIELDS)) {
          setFormError(errorMessage(error, t));
        }
      },
    });
  };

  return (
    <Modal
      open={open}
      title={t('admin.courses.create.title')}
      okText={t('admin.courses.create.submit')}
      cancelText={t('admin.cancel')}
      onOk={() => form.submit()}
      onCancel={onClose}
      confirmLoading={create.isPending}
      okButtonProps={{ 'data-testid': 'create-course-submit' }}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        preserve={false}
        initialValues={{ skillId: defaultSkillId, description: '' }}
        onFinish={submit}
        name="newCourse"
        data-testid="new-course-form"
      >
        {formError && (
          <Alert className={styles.formAlert} type="error" title={formError} />
        )}
        <CourseFields form={form} skills={skills} autoSlug />
      </Form>
    </Modal>
  );
}
