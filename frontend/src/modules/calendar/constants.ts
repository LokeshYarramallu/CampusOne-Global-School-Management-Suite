export const CALENDAR_SCOPES = ['SCHOOL', 'CLASS', 'PERSONAL'] as const;
export type CalendarScope = (typeof CALENDAR_SCOPES)[number];

export const CALENDAR_EVENT_TYPES = [
  'ACADEMIC',
  'CULTURAL',
  'EXAM',
  'HOLIDAY',
  'MEETING',
  'NOTICE',
] as const;
export type CalendarEventType = (typeof CALENDAR_EVENT_TYPES)[number];

export const SCOPE_LABELS: Record<CalendarScope, string> = {
  SCHOOL: 'School',
  CLASS: 'Class',
  PERSONAL: 'Personal',
};

export interface EventAura {
  /** Main card background — a very light, warm surface. */
  surface: string;
  /** Subtle gradient wash for depth. */
  wash: string;
  /** Border color with a little warmth. */
  border: string;
  /** Badge background — muted but distinct. */
  badgeBg: string;
  /** Badge text — readable, slightly earthy. */
  badgeText: string;
  /** Small accent dot / icon color. */
  dot: string;
}

export const TYPE_ACCENT: Record<CalendarEventType, EventAura> = {
  ACADEMIC: {
    surface: '#f6f9ff',
    wash: 'radial-gradient(circle at 12% 18%, rgba(59,130,246,0.06), transparent 26%)',
    border: '#dbe6fb',
    badgeBg: '#e8f0fe',
    badgeText: '#2f5aa8',
    dot: '#3b82f6',
  },
  CULTURAL: {
    surface: '#fbf6ff',
    wash: 'radial-gradient(circle at 12% 18%, rgba(124,58,237,0.06), transparent 26%)',
    border: '#eadcf7',
    badgeBg: '#f0e6fb',
    badgeText: '#5b21b6',
    dot: '#7c3aed',
  },
  EXAM: {
    surface: '#fff7f7',
    wash: 'radial-gradient(circle at 12% 18%, rgba(225,29,72,0.06), transparent 26%)',
    border: '#f5d6db',
    badgeBg: '#ffe4e8',
    badgeText: '#9f1239',
    dot: '#e11d48',
  },
  HOLIDAY: {
    surface: '#f4fbf6',
    wash: 'radial-gradient(circle at 12% 18%, rgba(21,128,61,0.06), transparent 26%)',
    border: '#d3ede0',
    badgeBg: '#dcfce6',
    badgeText: '#14532d',
    dot: '#15803d',
  },
  MEETING: {
    surface: '#fffaf5',
    wash: 'radial-gradient(circle at 12% 18%, rgba(234,88,12,0.06), transparent 26%)',
    border: '#f7dec8',
    badgeBg: '#ffedd5',
    badgeText: '#7c2d12',
    dot: '#ea580c',
  },
  NOTICE: {
    surface: '#fafafa',
    wash: 'radial-gradient(circle at 12% 18%, rgba(100,116,139,0.05), transparent 26%)',
    border: '#e7e8ea',
    badgeBg: '#f1f5f9',
    badgeText: '#334155',
    dot: '#64748b',
  },
};

export const SCOPE_ACCENT: Record<CalendarScope, { label: string; iconColor: string }> = {
  SCHOOL: { label: 'School', iconColor: '#15803d' },
  CLASS: { label: 'Class', iconColor: '#3b82f6' },
  PERSONAL: { label: 'Personal', iconColor: '#ea580c' },
};