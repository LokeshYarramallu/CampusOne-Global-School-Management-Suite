import { BUTTON_RADIUS, FIELD_HEIGHT, FIELD_RADIUS } from '@/modules/identity';

/**
 * Placeholder shown while the login route loads. It mirrors the real form's
 * geometry via the shared field tokens, so the swap to the live form does not
 * shift anything on screen.
 */
export default function LoginLoading() {
  return (
    <main aria-busy="true" aria-label="Loading CampusOne sign-in" className="min-h-screen bg-[#f4f5f6] p-3 sm:p-5 lg:grid lg:grid-cols-[minmax(380px,0.92fr)_1.08fr] lg:gap-5">
      <section className="relative min-h-[218px] overflow-hidden rounded-[40px_12px_40px_12px] bg-[#f85001] px-6 py-6 sm:px-9 sm:py-8 lg:min-h-[calc(100vh-40px)] lg:p-11 xl:p-14">
        <div className="absolute -right-28 -top-24 h-[430px] w-[430px] rounded-full border border-[#111214]/10" />
        <div className="absolute -bottom-48 -left-28 h-[520px] w-[520px] rounded-full bg-[#de4700]" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="h-11 w-11 animate-pulse rounded-[16px_5px_16px_5px] bg-[#111214]/80" />
          <div className="h-4 w-32 animate-pulse rounded-full bg-[#111214]/25" />
        </div>
        <div className="absolute bottom-12 left-6 hidden space-y-4 sm:left-9 lg:block lg:left-11 xl:left-14">
          <div className="h-3 w-44 animate-pulse rounded-full bg-[#111214]/20" />
          <div className="h-16 w-80 animate-pulse rounded-[12px] bg-[#111214]/15" />
          <div className="h-3 w-64 animate-pulse rounded-full bg-[#111214]/20" />
        </div>
      </section>

      <section className="flex min-h-[calc(100vh-218px)] items-center justify-center rounded-[12px_40px_12px_40px] bg-[#f9fafb] px-5 py-10 sm:px-10 lg:min-h-[calc(100vh-40px)] lg:px-12 xl:px-20">
        <div className="w-full max-w-[470px] animate-pulse">
          <div className="mb-9 flex items-center justify-between border-b border-[#e4e7e9] pb-5"><div className="h-3 w-28 rounded-full bg-[#dfe3e5]" /><div className="h-3 w-14 rounded-full bg-[#e7eaec]" /></div>
          <div className="mb-8 space-y-3"><div className="h-10 w-56 rounded-lg bg-[#dfe3e5]" /><div className="h-3 w-72 rounded-full bg-[#e7eaec]" /></div>
          <div className="space-y-6">
            <div className="space-y-2.5"><div className="h-3 w-24 rounded-full bg-[#e7eaec]" /><div className={`${FIELD_HEIGHT} ${FIELD_RADIUS} border border-[#e4e7e9] bg-white`} /></div>
            <div className="space-y-2.5"><div className="h-3 w-20 rounded-full bg-[#e7eaec]" /><div className={`${FIELD_HEIGHT} ${FIELD_RADIUS} border border-[#e4e7e9] bg-white`} /></div>
            <div className={`${FIELD_HEIGHT} ${BUTTON_RADIUS} bg-[#dfe3e5]`} />
            <div className="h-16 border-l-[3px] border-[#e9ecee] bg-[#f3f5f6]" />
          </div>
        </div>
      </section>
    </main>
  );
}
