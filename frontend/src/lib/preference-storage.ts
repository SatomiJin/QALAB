// Per-browser UI preferences (language, theme). Storage can be unavailable
// (private mode, blocked site data), so every access is guarded.

export function readPreference(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writePreference(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore: the preference just won't survive a reload.
  }
}
