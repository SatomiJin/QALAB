import type { FormInstance, FormRule } from 'antd';
import type { TFunction } from 'i18next';
import { ApiError } from '../../lib/api';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../../types/api';

/** True when a 400 response carries details for any of these fields. */
export function hasFieldErrors(
  error: unknown,
  fields: readonly string[],
): boolean {
  return (
    error instanceof ApiError &&
    error.status === 400 &&
    error.details.some((detail) => fields.includes(detail.field))
  );
}

/**
 * Shows backend `details` on the matching form fields: validation (400) and
 * conflicts such as a used slug (409). Returns true when at least one field
 * error was applied.
 */
export function applyFieldErrors(
  form: FormInstance,
  error: unknown,
  fields: readonly string[],
): boolean {
  if (!(error instanceof ApiError) || ![400, 409].includes(error.status)) {
    return false;
  }
  const byField = new Map<string, string[]>();
  for (const detail of error.details) {
    if (!fields.includes(detail.field)) continue;
    byField.set(detail.field, [
      ...(byField.get(detail.field) ?? []),
      detail.message,
    ]);
  }
  form.setFields([...byField].map(([name, errors]) => ({ name, errors })));
  return byField.size > 0;
}

export function emailRules(t: TFunction): FormRule[] {
  return [
    {
      required: true,
      whitespace: true,
      message: t('auth.validation.emailRequired'),
    },
    { type: 'email', message: t('auth.validation.emailInvalid') },
  ];
}

/** Password policy for new passwords (mirrors the backend DTO). */
export function newPasswordRules(t: TFunction): FormRule[] {
  return [
    { required: true, message: t('auth.validation.passwordRequired') },
    {
      min: PASSWORD_MIN_LENGTH,
      message: t('auth.validation.passwordMin', { min: PASSWORD_MIN_LENGTH }),
    },
    {
      max: PASSWORD_MAX_LENGTH,
      message: t('auth.validation.passwordMax', { max: PASSWORD_MAX_LENGTH }),
    },
  ];
}

export function confirmPasswordRules(
  t: TFunction,
  passwordField: string,
): FormRule[] {
  return [
    { required: true, message: t('auth.validation.passwordRequired') },
    ({ getFieldValue }) => ({
      validator: (_, value) =>
        !value || getFieldValue(passwordField) === value
          ? Promise.resolve()
          : Promise.reject(new Error(t('auth.validation.passwordMismatch'))),
    }),
  ];
}
