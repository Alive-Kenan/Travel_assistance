export default function SkeletonCards() {
  return (
    <div className="space-y-3">
      <div className="animate-pulse rounded-3xl border border-ink-200/70 bg-white/70 p-5">
        <div className="h-5 w-44 rounded bg-ink-200/70" />
        <div className="mt-3 h-4 w-72 rounded bg-ink-200/50" />
        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="h-16 rounded-2xl bg-ink-200/50" />
          <div className="h-16 rounded-2xl bg-ink-200/50" />
          <div className="h-16 rounded-2xl bg-ink-200/50" />
        </div>
      </div>
      <div className="animate-pulse rounded-3xl border border-ink-200/70 bg-white/70 p-5">
        <div className="h-4 w-40 rounded bg-ink-200/70" />
        <div className="mt-4 space-y-2">
          <div className="h-4 w-full rounded bg-ink-200/50" />
          <div className="h-4 w-5/6 rounded bg-ink-200/50" />
          <div className="h-4 w-4/6 rounded bg-ink-200/50" />
        </div>
      </div>
    </div>
  )
}

