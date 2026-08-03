/**
 * Public API of the identity module. Nothing outside the module may reach past
 * this file (AGENTS.md, "Module Boundaries").
 */

export { DashboardShell } from './components/DashboardShell';
export { LoginForm } from './components/LoginForm';

// Layout tokens, so the login route's loading skeleton matches the real form.
export { BUTTON_RADIUS, FIELD_HEIGHT, FIELD_RADIUS } from './constants';
