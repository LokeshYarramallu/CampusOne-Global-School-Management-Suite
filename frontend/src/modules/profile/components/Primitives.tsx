import type { ReactNode } from 'react';

/**
 * The building blocks of the profile surface.
 *
 * Two rules learned from reviewing all seven roles side by side:
 *
 * 1. **Ownership is stated once, on the card** — not repeated under every
 *    field. An earlier version printed the same "maintained by your school"
 *    sentence beneath all four fields of a staff record.
 * 2. **Fields are label/value pairs in a grid**, not stacked full-width rows.
 *    A profile is scanned, not read, and a single tall column forces the eye
 *    through content it wanted to skip.
 */

interface CardProps {
  title: string;
  /** Who maintains this, stated once. */
  hint?: string;
  /** When set, replaces the body: what will appear here and who fills it. */
  empty?: string;
  /** Cards are half-width on desktop; 2 makes one span the full grid. */
  span?: 1 | 2;
  tone?: 'default' | 'accent';
  action?: ReactNode;
  children?: ReactNode;
}

export function Card({
  title,
  hint,
  empty,
  span = 1,
  tone = 'default',
  action,
  children,
}: CardProps) {
  return (
    <section
      className={`${span === 2 ? 'lg:col-span-2' : ''} border border-[#e0e4e6] bg-white ${
        tone === 'accent' ? 'border-t-2 border-t-[#f85001]' : ''
      }`}
    >
      <header className="flex items-start justify-between gap-3 border-b border-[#eef1f2] px-5 py-3.5">
        <div>
          <h3 className="text-[0.8rem] font-bold uppercase tracking-[0.1em] text-[#202226]">
            {title}
          </h3>
          {hint ? (
            <p className="mt-0.5 text-[0.7rem] text-[#5f6469]">{hint}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>

      <div className="px-5 py-4">
        {empty ? (
          <p className="border border-dashed border-[#dce0e2] bg-[#fbfcfc] px-4 py-6 text-xs leading-5 text-[#5f6469]">
            {empty}
          </p>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

/** Two columns of label/value pairs — the density a reference surface needs. */
export function DataGrid({ children }: { children: ReactNode }) {
  return <dl className="grid grid-cols-2 gap-x-6 gap-y-4">{children}</dl>;
}

export function Field({
  label,
  value,
  placeholder = '—',
}: {
  label: string;
  value?: string | null;
  placeholder?: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.62rem] font-bold uppercase tracking-[0.12em] text-[#5f6469]">
        {label}
      </dt>
      <dd className="mt-1 truncate text-sm text-[#202226]">
        {value ?? <span className="text-[#8b9095]">{placeholder}</span>}
      </dd>
    </div>
  );
}

/** Headline numbers, read before anything else on the page. */
export function StatTiles({
  stats,
}: {
  stats: Array<{ label: string; value: string }>;
}) {
  if (stats.length === 0) return null;

  return (
    <div className="grid grid-cols-2 divide-x divide-[#e0e4e6] border border-[#e0e4e6] bg-white sm:grid-cols-3 lg:grid-cols-[repeat(auto-fit,minmax(0,1fr))]">
      {stats.map((stat) => (
        <div key={stat.label} className="px-5 py-4">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.12em] text-[#5f6469]">
            {stat.label}
          </p>
          <p className="mt-1.5 truncate text-[1.35rem] font-semibold leading-none tracking-[-0.02em] text-[#111214]">
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
}
