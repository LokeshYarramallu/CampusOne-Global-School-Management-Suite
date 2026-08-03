/**
 * Placeholder while the account route loads. Mirrors the real layout's
 * geometry so the swap does not shift anything on screen.
 */
export default function ProfileLoading() {
  return (
    <main
      aria-busy="true"
      aria-label="Loading your account"
      className="mx-auto max-w-4xl animate-pulse px-5 py-10 sm:px-8"
    >
      <div className="mb-8 flex items-center gap-5 border-b border-[#e4e7e9] pb-7">
        <div className="h-16 w-16 rounded-[22px_6px_22px_6px] bg-[#dfe3e5]" />
        <div className="space-y-2.5">
          <div className="h-7 w-56 rounded-lg bg-[#dfe3e5]" />
          <div className="h-3 w-40 rounded-full bg-[#e7eaec]" />
        </div>
      </div>

      <div className="space-y-5">
        {[0, 1, 2].map((card) => (
          <div
            key={card}
            className="rounded-[20px_6px_20px_6px] border border-[#e4e7e9] bg-white p-6"
          >
            <div className="mb-4 h-4 w-40 rounded-full bg-[#dfe3e5]" />
            <div className="space-y-3">
              <div className="h-3 w-full rounded-full bg-[#eef1f2]" />
              <div className="h-3 w-3/4 rounded-full bg-[#eef1f2]" />
              <div className="h-3 w-1/2 rounded-full bg-[#eef1f2]" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
