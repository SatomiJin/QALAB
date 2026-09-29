import { defineConfig } from 'vitest/config';

// Integration tests run against the linked Supabase project (backend/.env).
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    setupFiles: ['./test/integration/setup-int.ts'],
    include: ['test/integration/**/*.int-spec.ts'],
    // Shared cloud project: run files one at a time.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
