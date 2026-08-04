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

export const TYPE_ACCENT: Record<CalendarEventType, { badgeBg: string; badgeText: string; tint: string; borderColor: string }> = {
  ACADEMIC: { badgeBg: '#eef4ff', badgeText: '#355ba8', tint: '#f8faff', borderColor: '#d9e4f7' },
  CULTURAL: { badgeBg: '#f3e8ff', badgeText: '#7c3aed', tint: '#faf7ff', borderColor: '#e4d7f7' },
  EXAM: { badgeBg: '#ffe4e6', badgeText: '#be123c', tint: '#fff8f8', borderColor: '#f7d6da' },
  HOLIDAY: { badgeBg: '#dcfce7', badgeText: '#166534', tint: '#f6fdf9', borderColor: '#ccf2db' },
  MEETING: { badgeBg: '#fff7ed', badgeText: '#c2410c', tint: '#fffbf7', borderColor: '#fde3cd' },
  NOTICE: { badgeBg: '#f3f4f6', badgeText: '#374151', tint: '#fafafa', borderColor: '#e5e7eb' },
};
