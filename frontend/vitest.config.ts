import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Resolves the "@/*" alias from tsconfig.json.
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // `core/config/env.ts` fails fast on a missing variable, so the suite
    // supplies the same values a developer would put in .env.local.
    env: {
      NEXT_PUBLIC_API_BASE_URL: 'http://localhost:3001/api/v1',
      NEXT_PUBLIC_API_TIMEOUT_MS: '15000',
      NEXT_PUBLIC_APP_ENV: 'development',
      NEXT_PUBLIC_DEV_ADMIN_EMAIL: 'platform-admin@campusone.local',
    },
    // Module tests live beside their module; cross-module tests live in tests/.
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'tests/**/*.{test,spec}.{ts,tsx}'],
  },
});
