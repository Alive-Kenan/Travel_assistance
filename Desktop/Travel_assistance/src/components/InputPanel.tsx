import { Link2, Trash2, Wand2 } from "lucide-react"
import Button from "@/components/Button"
import { cn } from "@/lib/utils"

type Props = {
  value: string
  onChange: (v: string) => void
  onParse: () => void
  onClear: () => void
  onExample: () => void
  disabled?: boolean
  busy?: boolean
}

export default function InputPanel({ value, onChange, onParse, onClear, onExample, disabled, busy }: Props) {
  return (
    <section className="rounded-3xl border border-ink-200/70 bg-white/75 p-5 shadow-card backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium text-ink-700">
            <Link2 className="h-4 w-4 text-brand-teal" />
            <span>抖音链接 / 口令 / 文本</span>
          </div>
          <div className="mt-1 text-xs text-ink-500">
            当前版本支持景点名、关键词和攻略文字；抖音链接 / 口令暂未开放。
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button type="button" variant="soft" onClick={onExample} disabled={disabled || busy} className="h-10 px-3">
            示例
          </Button>
          <Button type="button" variant="ghost" onClick={onClear} disabled={disabled || busy} className="h-10 px-3">
            <Trash2 className="h-4 w-4" />
            清空
          </Button>
        </div>
      </div>

      <div className="mt-4">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={7}
          placeholder="例如：粘贴抖音分享链接，或直接粘贴一段景点攻略文字…"
          className={cn(
            "w-full resize-none rounded-2xl border border-ink-200/70 bg-white/70 px-4 py-3 text-sm leading-relaxed text-ink-950",
            "outline-none transition focus:border-brand-teal/40 focus:shadow-glow",
          )}
        />
      </div>

      <div className="mt-4">
        <Button type="button" variant="primary" onClick={onParse} disabled={disabled} aria-busy={busy}>
          <Wand2 className="h-5 w-5" />
          {busy ? "正在解析…" : "一键解析"}
        </Button>
      </div>
    </section>
  )
}
