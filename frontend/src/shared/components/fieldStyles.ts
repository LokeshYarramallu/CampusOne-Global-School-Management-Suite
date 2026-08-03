/**
 * Form control tokens shared across CampusOne screens.
 *
 * These moved out of the identity module once the profile module became a
 * second consumer — the threshold AGENTS.md sets for shared code ("used by ≥2
 * modules, not feature-specific, no hidden coupling").
 *
 * Every foreground colour here meets WCAG 2.1 AA (4.5:1) against the surface it
 * sits on. The greys are deliberately darker than a typical mockup: these
 * controls appear on screens no user can skip.
 */

/** Text on a light panel, from most to least prominent. */
export const TEXT_PRIMARY = '#202226';
export const TEXT_BODY = '#4a4f54';
export const TEXT_MUTED = '#5f6469';
export const TEXT_PLACEHOLDER = '#6b7075';

/** Error accents, matched to StatusNotice's "error" tone. */
export const TEXT_ERROR = '#a74640';
export const BORDER_ERROR = '#c9655e';

export const BRAND_ORANGE = '#f85001';

/** The asymmetric corner treatment used across CampusOne form controls. */
export const FIELD_RADIUS = 'rounded-[16px_6px_16px_6px]';
export const BUTTON_RADIUS = 'rounded-[18px_6px_18px_6px]';
export const FIELD_HEIGHT = 'h-[54px]';

export const FIELD_LABEL_CLASS =
  'mb-2.5 block text-[0.7rem] font-bold uppercase tracking-[0.16em] text-[#5f6469]';

const FIELD_BASE_CLASS =
  `${FIELD_HEIGHT} ${FIELD_RADIUS} w-full border bg-white px-4 text-sm text-[#202226] ` +
  'shadow-[0_4px_16px_rgba(17,18,20,0.025)] outline-none ' +
  'transition-[border-color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] ' +
  'placeholder:text-[#6b7075] focus-visible:-translate-y-px ' +
  'disabled:cursor-not-allowed disabled:bg-[#f4f5f6] disabled:text-[#5f6469]';

export function fieldInputClass(hasError: boolean): string {
  return hasError
    ? `${FIELD_BASE_CLASS} border-[#c9655e] focus-visible:border-[#c9655e] focus-visible:shadow-[0_8px_24px_rgba(201,101,94,0.16)]`
    : `${FIELD_BASE_CLASS} border-[#e0e3e5] focus-visible:border-[#f85001] focus-visible:shadow-[0_8px_24px_rgba(248,80,1,0.10)]`;
}

export const PRIMARY_BUTTON_CLASS =
  `group flex ${FIELD_HEIGHT} ${BUTTON_RADIUS} w-full items-center justify-between bg-[#111214] px-5 ` +
  'text-[0.76rem] font-bold uppercase tracking-[0.12em] text-white ' +
  'shadow-[0_12px_24px_rgba(17,18,20,0.12)] ' +
  'transition-[transform,background-color,box-shadow] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] ' +
  'hover:-translate-y-0.5 hover:bg-[#202226] hover:shadow-[0_16px_30px_rgba(17,18,20,0.18)] ' +
  'active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#f85001]/30 ' +
  'disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0';

/** A compact secondary action, for use beside a field or inside a card. */
export const SECONDARY_BUTTON_CLASS =
  'inline-flex items-center gap-2 rounded-[12px_4px_12px_4px] border border-[#d9dde0] bg-white px-4 py-2.5 ' +
  'text-[0.72rem] font-bold uppercase tracking-[0.12em] text-[#202226] ' +
  'transition-[transform,box-shadow,background-color] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] ' +
  'hover:-translate-y-px hover:shadow-[0_8px_18px_rgba(17,18,20,0.08)] ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f85001]/40 ' +
  'disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0';
