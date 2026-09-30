const MAX_LENGTH = 2000;

/**
 * A readable one-line description of anything thrown, for logs. Supabase
 * (PostgREST) errors are plain objects, not `Error`s, so `String(error)`
 * would print `[object Object]`.
 */
export function describeError(error: unknown): string {
  if (error instanceof Error) return error.stack ?? error.message;

  if (typeof error === 'object' && error !== null) {
    const { code, message, details, hint } = error as Record<string, unknown>;
    if (typeof message === 'string') {
      return [
        code ? `[${String(code)}]` : '',
        message,
        typeof details === 'string' && details ? `Details: ${details}` : '',
        typeof hint === 'string' && hint ? `Hint: ${hint}` : '',
      ]
        .filter(Boolean)
        .join(' ');
    }
    try {
      return JSON.stringify(error).slice(0, MAX_LENGTH);
    } catch {
      return Object.prototype.toString.call(error);
    }
  }

  return String(error);
}
