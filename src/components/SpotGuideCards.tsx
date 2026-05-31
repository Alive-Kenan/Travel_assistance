<<<<<<< HEAD
import { useState } from "react"
import {
  Camera,
  ClipboardList,
  Copy,
=======
import {
  Camera,
>>>>>>> 6cb67d6e03fddfe356732e24b0d2a8ee92c2215e
  Gift,
  Hotel,
  MapPinned,
  Sparkles,
<<<<<<< HEAD
  SunMedium,
=======
>>>>>>> 6cb67d6e03fddfe356732e24b0d2a8ee92c2215e
  TrainFront,
  UtensilsCrossed,
} from "lucide-react"
import type { SpotGuide } from "@/types/spotGuide"
<<<<<<< HEAD
import Button from "@/components/Button"
=======
>>>>>>> 6cb67d6e03fddfe356732e24b0d2a8ee92c2215e
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

<<<<<<< HEAD
const HIDDEN_FOOD_REASON = "可优先安排在景点周边顺路体验。"
const HIDDEN_NEARBY_REASON = "当前结果未提供更详细的周边说明。"

export default function SpotGuideCards({ guide, mode = "full" }: Props) {
  const [copied, setCopied] = useState(false)
=======
export default function SpotGuideCards({ guide, mode = "full" }: Props) {
>>>>>>> 6cb67d6e03fddfe356732e24b0d2a8ee92c2215e
  const isPartial = mode === "partial"
  const isInferred = mode === "inferred"
  const hasExtraInfo =
    guide.extraInfo.transportTags.length > 0 ||
    guide.extraInfo.stayTags.length > 0 ||
<<<<<<< HEAD
    guide.extraInfo.transportGuide.length > 0 ||
    guide.extraInfo.ticketPolicy.length > 0 ||
    guide.extraInfo.stayGuide.length > 0 ||
    guide.extraInfo.travelTips.length > 0 ||
    guide.extraInfo.tips.length > 0 ||
    !!guide.extraInfo.durationHint

  const handleCopyChecklist = async () => {
    if (!guide.travelChecklist?.copyText) return

    try {
      await navigator.clipboard.writeText(guide.travelChecklist.copyText)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  const groupedExtraInfo = [
    { title: "交通指南", items: guide.extraInfo.transportGuide },
    { title: "票务政策", items: guide.extraInfo.ticketPolicy },
    { title: "住宿参考", items: guide.extraInfo.stayGuide },
    { title: "出行贴士", items: guide.extraInfo.travelTips.length > 0 ? guide.extraInfo.travelTips : guide.extraInfo.tips },
  ]

  return (
    <div className="space-y-3">
      {guide.travelChecklist ? (
        <SectionCard className="border-brand-teal/20 bg-brand-teal/8">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-ink-700">
                <ClipboardList className="h-4 w-4 text-brand-teal" />
                <span>出行清单</span>
              </div>
              <div className="mt-2 text-sm text-ink-500">
                汇总打卡地点、必吃美食和必备物品，一键复制后可直接带走。
              </div>
            </div>
            <Button type="button" variant="soft" className="shrink-0" onClick={() => void handleCopyChecklist()}>
              <Copy className="h-4 w-4" />
              {copied ? "已复制" : "生成出行清单"}
            </Button>
          </div>
        </SectionCard>
      ) : null}

=======
    guide.extraInfo.tips.length > 0 ||
    !!guide.extraInfo.durationHint

  return (
    <div className="space-y-3">
>>>>>>> 6cb67d6e03fddfe356732e24b0d2a8ee92c2215e
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
<<<<<<< HEAD
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <div className="min-w-0 max-w-full">
=======
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
>>>>>>> 6cb67d6e03fddfe356732e24b0d2a8ee92c2215e
            <div className="flex items-center gap-2 text-sm font-medium text-ink-700">
              <MapPinned className="h-4 w-4 text-brand-teal" />
              <span>景点主卡</span>
            </div>
<<<<<<< HEAD
            <div className="mt-3 break-words font-display text-2xl leading-tight text-ink-950">{guide.coreSpot.title}</div>
            <div className="mt-2 break-words text-sm leading-relaxed text-ink-500">{guide.coreSpot.summary}</div>
            {guide.coreSpot.budget ? (
              <div className="mt-4 rounded-2xl border border-brand-orange/20 bg-brand-orange/10 px-4 py-3">
                <div className="text-xs font-medium text-ink-500">{guide.coreSpot.budget.label}</div>
                <div className="mt-1 text-lg font-semibold text-ink-950">{guide.coreSpot.budget.range}</div>
                {guide.coreSpot.budget.description ? (
                  <div className="mt-1 text-xs leading-relaxed text-ink-500">{guide.coreSpot.budget.description}</div>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="max-w-full lg:w-[320px] lg:justify-self-end lg:text-right">
            {guide.coreSpot.city ? <div className="text-xs text-ink-500">{guide.coreSpot.city}</div> : null}
            {guide.coreSpot.bestSeason || guide.coreSpot.bestTime ? (
              <div className="mt-1 inline-flex max-w-full items-start gap-1 rounded-2xl bg-brand-orange/12 px-3 py-2 text-sm font-medium text-ink-700">
                <SunMedium className="h-4 w-4 text-brand-orange" />
                <span className="break-words">{guide.coreSpot.bestSeason ?? guide.coreSpot.bestTime}</span>
              </div>
            ) : null}
=======
            <div className="mt-3 font-display text-2xl leading-tight text-ink-950">{guide.coreSpot.title}</div>
            <div className="mt-2 text-sm leading-relaxed text-ink-500">{guide.coreSpot.summary}</div>
          </div>
          <div className="shrink-0 text-right">
            {guide.coreSpot.city ? <div className="text-xs text-ink-500">{guide.coreSpot.city}</div> : null}
            {guide.coreSpot.bestTime ? <div className="mt-1 text-sm font-medium text-ink-700">{guide.coreSpot.bestTime}</div> : null}
>>>>>>> 6cb67d6e03fddfe356732e24b0d2a8ee92c2215e
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
<<<<<<< HEAD
          {guide.coreSpot.tripTags.length > 0 ? (
            guide.coreSpot.tripTags.map((tag) => (
              <Tag key={tag} tone="orange">
                {tag}
              </Tag>
            ))
          ) : guide.coreSpot.audienceTags.length > 0 ? (
=======
          {guide.coreSpot.audienceTags.length > 0 ? (
>>>>>>> 6cb67d6e03fddfe356732e24b0d2a8ee92c2215e
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

<<<<<<< HEAD
      {guide.dayRoute ? (
        <SectionCard>
          <div className="flex items-center gap-2 text-sm font-medium text-ink-700">
            <TrainFront className="h-4 w-4 text-brand-orange" />
            <span>{guide.dayRoute.title}</span>
          </div>
          <div className="mt-4 rounded-2xl border border-brand-orange/20 bg-brand-orange/8 px-4 py-4">
            <div className="text-base font-semibold text-ink-950">{guide.dayRoute.stops.join(" -> ")}</div>
            {guide.dayRoute.summary ? (
              <div className="mt-2 text-sm leading-relaxed text-ink-500">{guide.dayRoute.summary}</div>
            ) : null}
          </div>
        </SectionCard>
      ) : null}

=======
>>>>>>> 6cb67d6e03fddfe356732e24b0d2a8ee92c2215e
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
<<<<<<< HEAD
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium text-ink-950">{item.name}</div>
                  {item.duration ? <Tag tone="orange">{item.duration}</Tag> : null}
                </div>
                {item.highlight ? (
                  <div className="mt-2 text-sm font-medium leading-relaxed text-ink-800">看点：{item.highlight}</div>
                ) : null}
=======
                <div className="font-medium text-ink-950">{item.name}</div>
>>>>>>> 6cb67d6e03fddfe356732e24b0d2a8ee92c2215e
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
<<<<<<< HEAD
                  {item.reason && item.reason !== HIDDEN_FOOD_REASON ? (
                    <div className="mt-1 text-sm leading-relaxed text-ink-500">{item.reason}</div>
                  ) : null}
=======
                  <div className="mt-1 text-sm leading-relaxed text-ink-500">{item.reason}</div>
>>>>>>> 6cb67d6e03fddfe356732e24b0d2a8ee92c2215e
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
<<<<<<< HEAD
                  {item.reason && item.reason !== HIDDEN_NEARBY_REASON ? (
                    <div className="mt-1 text-sm leading-relaxed text-ink-500">{item.reason}</div>
                  ) : null}
=======
                  <div className="mt-1 text-sm leading-relaxed text-ink-500">{item.reason}</div>
>>>>>>> 6cb67d6e03fddfe356732e24b0d2a8ee92c2215e
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
<<<<<<< HEAD
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
          {groupedExtraInfo.map((group) => (
            <div key={group.title} className="rounded-2xl border border-ink-200/70 bg-white/60 px-4 py-4">
              <div className="text-sm font-medium text-ink-800">{group.title}</div>
              {group.items.length > 0 ? (
                <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink-700">
                  {group.items.map((item) => (
                    <li key={`${group.title}-${item}`}>{item}</li>
                  ))}
                </ul>
              ) : (
                <div className="mt-3">
                  <EmptyState text={`暂未整理出${group.title}。`} />
                </div>
              )}
            </div>
          ))}
        </div>
        {guide.extraInfo.transportTags.length > 0 || guide.extraInfo.stayTags.length > 0 || guide.extraInfo.durationHint ? (
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
            {guide.extraInfo.durationHint ? <Tag tone="orange">{guide.extraInfo.durationHint}</Tag> : null}
          </div>
        ) : hasExtraInfo ? null : null}
=======
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
>>>>>>> 6cb67d6e03fddfe356732e24b0d2a8ee92c2215e
      </SectionCard>
    </div>
  )
}
