import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Tests must not depend on execution order (AGENTS.md, "Tests Inside Every Module").
afterEach(() => {
  cleanup();
});
