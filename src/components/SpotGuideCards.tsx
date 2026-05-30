import {
  Camera,
  Gift,
  Hotel,
  MapPinned,
  Sparkles,
  TrainFront,
  UtensilsCrossed,
} from "lucide-react"
import type { SpotGuide } from "@/types/spotGuide"
import Tag from "@/components/Tag"

type Props = {
  guide: SpotGuide
  mode?: "full" | "partial" | "inferred"
}

function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-3xl border border-ink-200/70 bg-white/75 p-5 shadow-card backdrop-blur ${className}`}>{children}</section>
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-ink-200/70 bg-white/40 px-4 py-3 text-sm text-ink-500">
      {text}
    </div>
  )
}

export default function SpotGuideCards({ guide, mode = "full" }: Props) {
  const isPartial = mode === "partial"
  const isInferred = mode === "inferred"
  const hasExtraInfo =
    guide.extraInfo.transportTags.length > 0 ||
    guide.extraInfo.stayTags.length > 0 ||
    guide.extraInfo.tips.length > 0 ||
    !!guide.extraInfo.durationHint

  return (
    <div className="space-y-3">
      {isPartial ? (
        <SectionCard className="border-brand-orange/20 bg-brand-orange/10 shadow-none">
          <div className="text-sm text-ink-700">
            当前展示的是视频提取版结果，部分栏目可能为空；联网补充成功后会展示更完整的信息。
          </div>
        </SectionCard>
      ) : null}

      {isInferred ? (
        <SectionCard className="border-brand-teal/20 bg-brand-teal/10 shadow-none">
          <div className="text-sm text-ink-700">
            {guide.displayHints?.[0] ?? "该景区名称根据视频线索推断，建议进一步核验。"}
          </div>
        </SectionCard>
      ) : null}

      <SectionCard>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-medium text-ink-700">
              <MapPinned className="h-4 w-4 text-brand-teal" />
              <span>景点主卡</span>
            </div>
            <div className="mt-3 font-display text-2xl leading-tight text-ink-950">{guide.coreSpot.title}</div>
            <div className="mt-2 text-sm leading-relaxed text-ink-500">{guide.coreSpot.summary}</div>
          </div>
          <div className="shrink-0 text-right">
            {guide.coreSpot.city ? <div className="text-xs text-ink-500">{guide.coreSpot.city}</div> : null}
            {guide.coreSpot.bestTime ? <div className="mt-1 text-sm font-medium text-ink-700">{guide.coreSpot.bestTime}</div> : null}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {guide.coreSpot.audienceTags.length > 0 ? (
            guide.coreSpot.audienceTags.map((tag) => (
              <Tag key={tag} tone="teal">
                {tag}
              </Tag>
            ))
          ) : (
            <Tag tone="neutral">视频提取信息有限</Tag>
          )}
        </div>
      </SectionCard>

      <SectionCard>
        <div className="flex items-center gap-2 text-sm font-medium text-ink-700">
          <Sparkles className="h-4 w-4 text-brand-orange" />
          <span>景点亮点</span>
        </div>
        <div className="mt-4 space-y-2">
          {guide.highlights.length > 0 ? (
            guide.highlights.map((item) => (
              <div key={item.title} className="rounded-2xl border border-ink-200/70 bg-white/60 px-4 py-3">
                <div className="font-medium text-ink-950">{item.title}</div>
                <div className="mt-1 text-sm leading-relaxed text-ink-500">{item.description}</div>
              </div>
            ))
          ) : (
            <EmptyState text="暂未从视频中提取到景点亮点。" />
          )}
        </div>
      </SectionCard>

      <SectionCard>
        <div className="flex items-center gap-2 text-sm font-medium text-ink-700">
          <Camera className="h-4 w-4 text-brand-teal" />
          <span>必打卡点</span>
        </div>
        <div className="mt-4 space-y-2">
          {guide.checkpoints.length > 0 ? (
            guide.checkpoints.map((item) => (
              <div key={item.name} className="rounded-2xl border border-ink-200/70 bg-white/60 px-4 py-3">
                <div className="font-medium text-ink-950">{item.name}</div>
                <div className="mt-1 text-sm leading-relaxed text-ink-500">{item.description}</div>
                {item.photoTip ? <div className="mt-2 text-xs text-ink-500">拍照建议：{item.photoTip}</div> : null}
                {item.stayHint ? <div className="mt-1 text-xs text-ink-500">停留建议：{item.stayHint}</div> : null}
              </div>
            ))
          ) : (
            <EmptyState text="暂未从视频中提取到必打卡点。" />
          )}
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <SectionCard className="h-full">
          <div className="flex items-center gap-2 text-sm font-medium text-ink-700">
            <UtensilsCrossed className="h-4 w-4 text-brand-orange" />
            <span>特色小吃 / 文创</span>
          </div>
          <div className="mt-4 space-y-2">
            {guide.foodAndSouvenirs.length > 0 ? (
              guide.foodAndSouvenirs.map((item) => (
                <div key={`${item.category}-${item.name}`} className="rounded-2xl border border-ink-200/70 bg-white/60 px-4 py-3">
                  <div className="flex items-center gap-2">
                    {item.category === "souvenir" ? <Gift className="h-4 w-4 text-brand-teal" /> : null}
                    <span className="font-medium text-ink-950">{item.name}</span>
                    <span className="text-xs text-ink-500">{item.category === "food" ? "小吃" : "文创"}</span>
                  </div>
                  <div className="mt-1 text-sm leading-relaxed text-ink-500">{item.reason}</div>
                </div>
              ))
            ) : (
              <EmptyState text="暂未从视频中提取到小吃或文创信息。" />
            )}
          </div>
        </SectionCard>

        <SectionCard className="h-full">
          <div className="flex items-center gap-2 text-sm font-medium text-ink-700">
            <MapPinned className="h-4 w-4 text-brand-teal" />
            <span>周边顺路推荐</span>
          </div>
          <div className="mt-4 space-y-2">
            {guide.nearbyRecommendations.length > 0 ? (
              guide.nearbyRecommendations.map((item) => (
                <div key={item.name} className="rounded-2xl border border-ink-200/70 bg-white/60 px-4 py-3">
                  <div className="font-medium text-ink-950">{item.name}</div>
                  <div className="mt-1 text-sm leading-relaxed text-ink-500">{item.reason}</div>
                  {item.relationHint ? <div className="mt-2 text-xs text-ink-500">{item.relationHint}</div> : null}
                </div>
              ))
            ) : (
              <EmptyState text="暂未从视频中提取到周边推荐。" />
            )}
          </div>
        </SectionCard>
      </div>

      <SectionCard className="bg-white/60 shadow-none">
        <div className="flex items-center gap-2 text-sm font-medium text-ink-700">
          <TrainFront className="h-4 w-4 text-ink-500" />
          <Hotel className="h-4 w-4 text-ink-500" />
          <span>补充信息</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {guide.extraInfo.transportTags.map((tag) => (
            <Tag key={`transport-${tag}`} tone="neutral">
              {tag}
            </Tag>
          ))}
          {guide.extraInfo.stayTags.map((tag) => (
            <Tag key={`stay-${tag}`} tone="neutral">
              {tag}
            </Tag>
          ))}
          {guide.extraInfo.durationHint ? (
            <Tag tone="orange">{guide.extraInfo.durationHint}</Tag>
          ) : null}
        </div>
        {guide.extraInfo.tips.length > 0 ? (
          <ul className="mt-4 space-y-2 text-sm leading-relaxed text-ink-700">
            {guide.extraInfo.tips.map((tip) => (
              <li key={tip} className="rounded-2xl border border-ink-200/70 bg-white/60 px-4 py-2">
                {tip}
              </li>
            ))}
          </ul>
        ) : hasExtraInfo ? null : (
          <div className="mt-4">
            <EmptyState text="暂未从视频中提取到补充信息。" />
          </div>
        )}
      </SectionCard>
    </div>
  )
}
