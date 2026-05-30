import { cn } from "@/lib/utils"

type Props = {
  children: string
  tone?: "teal" | "orange" | "neutral"
}

export default function Tag({ children, tone = "neutral" }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        tone === "teal" && "bg-brand-teal/10 text-ink-700 ring-1 ring-brand-teal/15",
        tone === "orange" && "bg-brand-orange/16 text-ink-700 ring-1 ring-brand-orange/20",
        tone === "neutral" && "bg-white/70 text-ink-700 ring-1 ring-ink-200/70",
      )}
    >
      {children}
    </span>
  )
}

