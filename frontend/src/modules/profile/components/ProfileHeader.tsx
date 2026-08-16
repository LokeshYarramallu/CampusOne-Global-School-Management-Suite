/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from 'react';

/**
 * Cover band with the portrait overlapping it — the anchor pattern every
 * professional profile surface uses (LinkedIn, GitHub, HR systems), because it
 * establishes *who this is* before any data is read.
 *
 * The band carries the brand orange from the sign-in screen so the two pages
 * read as one product.
 *
 * `<img>` rather than `next/image`: the portraits are static SVGs served from
 * `public/`, already the right size, and SVG is not a format the image
 * optimiser has anything useful to do with.
 */

interface ProfileHeaderProps {
  name: string;
  initials: string;
  photoUrl: string | null;
  /** Job title or class — the line people actually look for under a name. */
  subtitle: string | null;
  roleName: string;
  schoolName: string | null;
  actions?: ReactNode;
}

export function ProfileHeader({
  name,
  initials,
  photoUrl,
  subtitle,
  roleName,
  schoolName,
  actions,
}: ProfileHeaderProps) {
  return (
    <header className="border border-[#e0e4e6] bg-white">
      <div className="campusone-cover relative h-28 overflow-hidden bg-[#f85001] sm:h-32">
        <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full border border-[#111214]/15" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-44 w-44 rounded-full bg-[#de4700]" />
        <div className="pointer-events-none absolute -bottom-10 right-8 select-none text-[9rem] font-bold leading-none tracking-[-0.16em] text-[#111214]/[0.07]">
          C
        </div>
      </div>

      <div className="px-5 pb-5 sm:px-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex min-w-0 items-end gap-4">
            <div className="-mt-12 shrink-0 sm:-mt-14">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt=""
                  width={96}
                  height={96}
                  className="h-20 w-20 border-4 border-white bg-[#eef1f2] object-cover shadow-[0_6px_18px_rgba(17,18,20,0.14)] sm:h-24 sm:w-24"
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="grid h-20 w-20 place-items-center border-4 border-white bg-[#111214] text-xl font-bold text-white shadow-[0_6px_18px_rgba(17,18,20,0.14)] sm:h-24 sm:w-24"
                >
                  {initials}
                </div>
              )}
            </div>

            <div className="min-w-0 pb-1">
              <h1 className="truncate text-[1.6rem] font-semibold leading-tight tracking-[-0.035em] text-[#111214] sm:text-[1.9rem]">
                {name}
              </h1>
              {subtitle ? (
                <p className="mt-0.5 truncate text-sm text-[#4a4f54]">
                  {subtitle}
                </p>
              ) : null}
            </div>
          </div>

          {actions ? <div className="pb-1">{actions}</div> : null}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#eef1f2] pt-4">
          <Chip tone="brand">{roleName}</Chip>
          {schoolName ? <Chip>{schoolName}</Chip> : null}
        </div>
      </div>
    </header>
  );
}

function Chip({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'brand';
}) {
  const styles =
    tone === 'brand'
      ? 'bg-[#111214] text-white'
      : 'bg-[#f1f3f4] text-[#4a4f54]';
  return (
    <span
      className={`${styles} px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-[0.1em]`}
    >
      {children}
    </span>
  );
}
