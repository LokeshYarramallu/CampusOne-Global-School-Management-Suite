import type { ReactNode } from 'react';

/**
 * A titled area of the account page.
 *
 * `emptyReason` is a first-class prop rather than an afterthought: PRD §11
 * requires every list and detail view to define its empty state before build,
 * and "never a blank screen" is easiest to honour when the component makes it
 * awkward to omit.
 */
interface PanelSectionProps {
  title: string;
  description?: string;
  emptyReason?: string;
  children?: ReactNode;
  action?: ReactNode;
}

export function PanelSection({
  title,
  description,
  emptyReason,
  children,
  action,
}: PanelSectionProps) {
  return (
    <section className="rounded-[20px_6px_20px_6px] border border-[#e4e7e9] bg-white p-6 shadow-[0_4px_20px_rgba(17,18,20,0.03)]">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[0.95rem] font-semibold tracking-[-0.01em] text-[#202226]">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-xs leading-5 text-[#5f6469]">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      {emptyReason ? (
        <p className="rounded-[12px_4px_12px_4px] border border-dashed border-[#d9dde0] bg-[#fbfcfc] px-4 py-5 text-xs leading-5 text-[#5f6469]">
          {emptyReason}
        </p>
      ) : (
        children
      )}
    </section>
  );
}
