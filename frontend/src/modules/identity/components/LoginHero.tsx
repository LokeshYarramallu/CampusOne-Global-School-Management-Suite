'use client';

import { useEffect, useRef } from 'react';

/**
 * The branded panel beside the sign-in form.
 *
 * Purely decorative: it carries no heading for the document outline (the form
 * owns the `h1`) and no interactive content, so nothing here is required to
 * complete a sign-in. Text sits at full `#111214` on the orange field, which
 * measures 5.5:1 — the tinted variants used previously fell below 4.5:1.
 */
export function LoginHero() {
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    function handlePointerMove(this: HTMLElement, event: PointerEvent) {
      // Touch drags fire pointermove too; parallax on a finger drag reads as
      // lag, so only a real hovering pointer moves the orbs.
      if (event.pointerType !== 'mouse') return;
      const bounds = this.getBoundingClientRect();
      const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
      const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
      this.style.setProperty('--campusone-orb-x', `${x * 12}px`);
      this.style.setProperty('--campusone-orb-y', `${y * 10}px`);
    }

    function resetPointer(this: HTMLElement) {
      this.style.setProperty('--campusone-orb-x', '0px');
      this.style.setProperty('--campusone-orb-y', '0px');
    }

    hero.addEventListener('pointermove', handlePointerMove);
    hero.addEventListener('pointerleave', resetPointer);
    return () => {
      hero.removeEventListener('pointermove', handlePointerMove);
      hero.removeEventListener('pointerleave', resetPointer);
    };
  }, []);

  return (
    <section
      ref={heroRef}
      aria-hidden="true"
      className="campusone-enter campusone-orb-field relative flex min-h-[218px] flex-col justify-between overflow-hidden rounded-[40px_12px_40px_12px] bg-[#f85001] px-6 py-6 sm:px-9 sm:py-8 lg:min-h-[calc(100vh-40px)] lg:p-11 xl:p-14"
    >
      <div className="campusone-orb campusone-orb-one pointer-events-none absolute -right-28 -top-24 h-[430px] w-[430px] rounded-full border border-[#111214]/15" />
      <div className="campusone-orb campusone-orb-two pointer-events-none absolute -bottom-48 -left-28 h-[520px] w-[520px] rounded-full bg-[#de4700]" />
      <div className="campusone-orb campusone-orb-three pointer-events-none absolute left-[38%] top-[18%] h-24 w-24 rounded-full bg-[#ff8b4d]/35 blur-[1px]" />
      <div className="campusone-orbit campusone-orbit-one pointer-events-none absolute left-[18%] top-[28%] h-44 w-44 rounded-full border border-[#111214]/10" />
      <div className="campusone-orbit campusone-orbit-two pointer-events-none absolute left-[18%] top-[28%] h-44 w-44 rounded-full border border-[#ffd0b8]/25" />
      <span className="campusone-glint pointer-events-none absolute left-[30%] top-[31%] h-2 w-2 rounded-full bg-[#ffe6d8]/80" />
      <div className="pointer-events-none absolute -bottom-28 right-0 select-none text-[22rem] font-bold leading-none tracking-[-0.16em] text-[#111214]/[0.08] lg:-right-10 lg:text-[30rem]">
        C
      </div>

      <div className="relative z-10 flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-[16px_5px_16px_5px] bg-[#111214] text-base font-bold text-white shadow-[0_8px_18px_rgba(17,18,20,0.14)]">
          C
        </div>
        <span className="text-[1.05rem] font-bold uppercase tracking-[0.16em] text-[#111214]">
          CampusOne
        </span>
      </div>

      <div className="relative z-10 hidden max-w-[430px] pb-10 lg:block">
        <p className="mb-5 text-[0.7rem] font-bold uppercase tracking-[0.25em] text-[#111214]">
          Academic operations workspace
        </p>
        <p className="max-w-[390px] text-[3.7rem] font-semibold leading-[0.98] tracking-[-0.065em] text-[#111214] xl:text-[4.5rem]">
          Every school day starts here.
        </p>
        <p className="mt-6 max-w-[330px] text-sm leading-6 text-[#111214]/90">
          One calm place for the people, decisions, and details that keep your
          school moving.
        </p>
      </div>

      <div className="relative z-10 flex items-center justify-between gap-4 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#111214]/90">
        <span>CampusOne / Access desk</span>
        <span className="flex items-center gap-2 normal-case tracking-normal">
          <span className="h-1.5 w-1.5 rounded-full bg-[#111214]" /> Secure
          workspace
        </span>
      </div>
    </section>
  );
}
