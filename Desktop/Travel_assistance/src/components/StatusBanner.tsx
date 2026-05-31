import { AlertTriangle, LoaderCircle } from "lucide-react"
import type { SpotGuideStatus } from "@/types/spotGuide"

type VideoAnalyzeWaitLevel = "normal" | "slow" | "very_slow"

type Props = {
  status: SpotGuideStatus | "loading"
  partialMessage?: string | null
  videoAnalyzeWaitLevel?: VideoAnalyzeWaitLevel
}

const labels: Partial<Record<Props["status"], string>> = {
  loading: "正在整理景点内容…",
  validating_video: "正在检查测试视频…",
  reading_video: "正在读取视频…",
  analyzing_video: "正在分析视频…",
  enriching_spot: "正在补充景区信息…",
}

export default function StatusBanner({
  status,
  partialMessage,
  videoAnalyzeWaitLevel = "normal",
}: Props) {
  if (status === "partial_success" && partialMessage) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-brand-orange/20 bg-brand-orange/10 px-4 py-3 text-sm text-ink-700">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />
        <span>{partialMessage}</span>
      </div>
    )
  }

  if (status === "analyzing_video") {
    const analyzeLabel =
      videoAnalyzeWaitLevel === "very_slow"
        ? "当前仍在分析中；如果长时间无结果，可稍后重试或替换更短测试视频。"
        : videoAnalyzeWaitLevel === "slow"
          ? "视频较大，分析可能需要 1-3 分钟，请耐心等待…"
          : "正在分析视频…"

    return (
      <div className="flex items-center gap-3 rounded-2xl border border-brand-teal/15 bg-brand-teal/10 px-4 py-3 text-sm text-ink-700">
        <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-brand-teal" />
        <span>{analyzeLabel}</span>
      </div>
    )
  }

  const label = labels[status]
  if (!label) return null

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-brand-teal/15 bg-brand-teal/10 px-4 py-3 text-sm text-ink-700">
      <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-brand-teal" />
      <span>{label}</span>
    </div>
  )
}
