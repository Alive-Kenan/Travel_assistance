import { Compass } from "lucide-react"
import type { SpotGuide, SpotGuideStatus } from "@/types/spotGuide"
import SpotGuideCards from "@/components/SpotGuideCards"
import SkeletonCards from "@/components/SkeletonCards"

type Props = {
  status: SpotGuideStatus | "loading"
  guide: SpotGuide | null
}

export default function ResultPanel({ status, guide }: Props) {
  if (
    status === "loading" ||
    status === "validating_video" ||
    status === "reading_video" ||
    status === "analyzing_video" ||
    status === "enriching_spot"
  ) {
    return <SkeletonCards />
  }

  if ((status === "success" || status === "partial_success") && guide) {
    return (
      <SpotGuideCards
        guide={guide}
        mode={guide.displayMode ?? (status === "partial_success" ? "partial" : "full")}
      />
    )
  }

  return (
    <div className="rounded-3xl border border-ink-200/70 bg-white/70 p-6 shadow-card backdrop-blur">
      <div className="flex items-center gap-2 text-sm font-medium text-ink-700">
        <Compass className="h-4 w-4 text-brand-teal" />
        <span>结果预览</span>
      </div>
      <div className="mt-4 text-base font-semibold text-ink-950">粘贴一段内容，生成景点速查卡</div>
      <div className="mt-2 text-sm leading-relaxed text-ink-500">
        支持抖音分享链接、口令或景点攻略文字，优先整理景点亮点、打卡点和周边推荐。
      </div>
    </div>
  )
}
