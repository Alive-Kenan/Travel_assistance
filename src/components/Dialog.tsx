import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

type Props = {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  footer?: ReactNode
  tone?: "danger" | "neutral"
}

export default function Dialog({ open, title, description, onClose, footer, tone = "neutral" }: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 backdrop-blur-sm sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "w-full max-w-md overflow-hidden rounded-2xl border bg-white/90 shadow-card backdrop-blur",
          tone === "danger" && "border-brand-orange/30",
          tone === "neutral" && "border-ink-200/70",
        )}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4">
          <div className="min-w-0">
            <div className="font-display text-lg text-ink-950">{title}</div>
            {description ? <div className="mt-1 text-sm text-ink-500">{description}</div> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-ink-200/70 bg-white/60 text-ink-500 transition hover:bg-white"
            aria-label="关闭"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {footer ? <div className="flex items-center justify-end gap-2 border-t border-ink-200/70 px-5 py-4">{footer}</div> : null}
      </div>
    </div>
  )
}

