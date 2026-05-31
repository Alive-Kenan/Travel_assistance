import type { ButtonHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

type Variant = "primary" | "ghost" | "soft"

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
}

export default function Button({ className, variant = "ghost", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
        variant === "primary" &&
          "h-12 w-full bg-brand-teal text-white shadow-glow hover:brightness-[1.03] active:brightness-[0.98] disabled:opacity-50 disabled:shadow-none",
        variant === "ghost" &&
          "h-10 border border-ink-200/70 bg-white/60 text-ink-700 backdrop-blur hover:bg-white/80 hover:shadow-sm disabled:opacity-50",
        variant === "soft" &&
          "h-10 bg-brand-teal/10 text-ink-700 hover:bg-brand-teal/14 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  )
}

