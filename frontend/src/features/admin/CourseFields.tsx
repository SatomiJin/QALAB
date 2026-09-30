import { Form, Input, Select } from 'antd';
import type { FormInstance } from 'antd';
import { useTranslation } from 'react-i18next';
import { CONTENT_LIMITS, SLUG_PATTERN, type Skill } from '../../types/api';
import { useSkillText } from '../learning/useSkillText';
import { type CourseFormValues, slugify } from './content';

interface CourseFieldsProps {
  form: FormInstance<CourseFormValues>;
  skills: Skill[];
  /** New course: the slug follows the title until it is edited by hand. */
  autoSlug: boolean;
}

/** Skill, title, slug and description: shared by "New course" and the editor. */
export function CourseFields({ form, skills, autoSlug }: CourseFieldsProps) {
  const { t } = useTranslation();
  const skillText = useSkillText();

  return (
    <>
      <Form.Item
        name="skillId"
        label={t('admin.fields.skill')}
        rules={[{ required: true, message: t('admin.validation.skill') }]}
      >
        <Select
          data-testid="course-skill"
          options={skills.map((skill) => ({
            value: skill.id,
            label: skillText(skill).name,
          }))}
        />
      </Form.Item>
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
          data-testid="course-title"
          onChange={(event) => {
            if (autoSlug && !form.isFieldTouched('slug')) {
              form.setFieldValue('slug', slugify(event.target.value));
            }
          }}
        />
      </Form.Item>
      <SlugField />
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
        <Input.TextArea
          autoSize={{ minRows: 2, maxRows: 8 }}
          data-testid="course-description"
        />
      </Form.Item>
    </>
  );
}

/** Slug input with the shared format rule (courses and lessons). */
export function SlugField() {
  const { t } = useTranslation();
  return (
    <Form.Item
      name="slug"
      label={t('admin.fields.slug')}
      extra={t('admin.fields.slugHint')}
      rules={[
        { required: true, message: t('admin.validation.slug') },
        { pattern: SLUG_PATTERN, message: t('admin.validation.slugFormat') },
        {
          max: CONTENT_LIMITS.slugLength,
          message: t('admin.validation.max', {
            max: CONTENT_LIMITS.slugLength,
          }),
        },
      ]}
    >
      <Input data-testid="slug" />
    </Form.Item>
  );
}
