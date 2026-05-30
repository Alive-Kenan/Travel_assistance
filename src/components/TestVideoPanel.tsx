import { Film, Replace, Upload } from "lucide-react"
import Button from "@/components/Button"

type Props = {
  fileName: string
  fileSizeText: string
  busy: boolean
  onAnalyze: () => void
  onReplace: (file: File | null) => void
}

export default function TestVideoPanel({ fileName, fileSizeText, busy, onAnalyze, onReplace }: Props) {
  return (
    <section className="rounded-3xl border border-ink-200/70 bg-white/75 p-5 shadow-card backdrop-blur">
      <div className="flex items-center gap-2 text-sm font-medium text-ink-700">
        <Film className="h-4 w-4 text-brand-orange" />
        <span>当前测试视频</span>
      </div>

      <div className="mt-3 rounded-2xl border border-ink-200/70 bg-white/70 px-4 py-3">
        <div className="text-sm font-medium text-ink-950">{fileName}</div>
        <div className="mt-1 text-xs text-ink-500">{fileSizeText}</div>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <Button type="button" variant="primary" onClick={onAnalyze} disabled={busy} aria-busy={busy}>
          <Upload className="h-5 w-5" />
          {busy ? "分析中…" : "开始分析"}
        </Button>

        <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-ink-200/80 bg-white/60 px-4 py-3 text-sm font-medium text-ink-700 transition hover:bg-white/80">
          <Replace className="h-4 w-4 text-brand-teal" />
          <span>替换视频（仅调试）</span>
          <input
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            className="sr-only"
            disabled={busy}
            onChange={(event) => onReplace(event.target.files?.[0] ?? null)}
          />
        </label>
      </div>
    </section>
  )
}
