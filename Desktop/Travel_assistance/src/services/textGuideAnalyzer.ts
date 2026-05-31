import { enrichSpotWithKimi } from "@/services/kimiClient"
import type { SpotGuide } from "@/types/spotGuide"
import {
  getSparseSectionKeys,
  hasSparseTravelSections,
  isSpotGuideContentSufficient,
} from "@/utils/spotGuideCompleteness"
import { mapStage1ToSpotGuide } from "@/utils/spotGuideMapper"
import { extractKeywordQueryStage1 } from "@/utils/textKeywordQuery"
import { classifyTextInput } from "@/utils/textInputClassifier"
import { extractTravelNoteStage1 } from "@/utils/textStage1Extractor"

const TEXT_ENRICH_TIMEOUT_MS = 20_000
const MAX_TEXT_FOCUSED_RETRIES = 2
const TEXT_FOCUS_SECTION_RULES: Array<{ pattern: RegExp; section: string }> = [
  { pattern: /门票|购票|预约/i, section: "ticketPolicy" },
  { pattern: /住宿|酒店|民宿|住哪/i, section: "stayGuide" },
  { pattern: /美食|小吃|吃什么|文创|伴手礼/i, section: "foodAndSouvenirs" },
  { pattern: /交通|高铁|动车|自驾|地铁|公交|停车|接驳/i, section: "transportGuide" },
  { pattern: /亮点|特色|看点|必玩|值得去/i, section: "highlights" },
  { pattern: /周边|附近|顺路|联动|串联/i, section: "nearbyRecommendations" },
]

async function withTimeout<T>(task: Promise<T>, timeoutMs: number): Promise<T> {
  return await new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("TEXT_ENRICH_TIMEOUT"))
    }, timeoutMs)

    task.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

function getTimeoutRemaining(deadlineMs: number): number {
  return Math.max(1, deadlineMs - Date.now())
}

function hasRetryableTextGuideSeed(guide: SpotGuide): boolean {
  return Boolean(guide.coreSpot.title?.trim())
}

function inferFocusSectionsFromText(text: string): string[] {
  const sections = TEXT_FOCUS_SECTION_RULES
    .filter(({ pattern }) => pattern.test(text))
    .map(({ section }) => section)

  return Array.from(new Set(sections))
}

function buildFocusedRetrySections(
  guide: SpotGuide,
  prioritySections: string[],
): string[] {
  const sparseSections = getSparseSectionKeys(guide)

  return Array.from(
    new Set([
      ...prioritySections.filter((section) => sparseSections.includes(section)),
      ...sparseSections,
    ]),
  )
}

function mergeSpotGuide(baseGuide: SpotGuide, incomingGuide: SpotGuide): SpotGuide {
  return {
    ...baseGuide,
    ...incomingGuide,
    source: incomingGuide.source ?? baseGuide.source,
    coreSpot: {
      ...baseGuide.coreSpot,
      ...incomingGuide.coreSpot,
      title: incomingGuide.coreSpot.title || baseGuide.coreSpot.title,
      city: incomingGuide.coreSpot.city || baseGuide.coreSpot.city,
      summary: incomingGuide.coreSpot.summary || baseGuide.coreSpot.summary,
      bestTime: incomingGuide.coreSpot.bestTime || baseGuide.coreSpot.bestTime,
      bestSeason: incomingGuide.coreSpot.bestSeason || baseGuide.coreSpot.bestSeason,
      tripTags:
        incomingGuide.coreSpot.tripTags.length > 0
          ? incomingGuide.coreSpot.tripTags
          : baseGuide.coreSpot.tripTags,
      budget: incomingGuide.coreSpot.budget ?? baseGuide.coreSpot.budget,
      audienceTags:
        incomingGuide.coreSpot.audienceTags.length > 0
          ? incomingGuide.coreSpot.audienceTags
          : baseGuide.coreSpot.audienceTags,
    },
    dayRoute: incomingGuide.dayRoute ?? baseGuide.dayRoute,
    highlights:
      incomingGuide.highlights.length > 0 ? incomingGuide.highlights : baseGuide.highlights,
    checkpoints:
      incomingGuide.checkpoints.length > 0 ? incomingGuide.checkpoints : baseGuide.checkpoints,
    foodAndSouvenirs:
      incomingGuide.foodAndSouvenirs.length > 0
        ? incomingGuide.foodAndSouvenirs
        : baseGuide.foodAndSouvenirs,
    nearbyRecommendations:
      incomingGuide.nearbyRecommendations.length > 0
        ? incomingGuide.nearbyRecommendations
        : baseGuide.nearbyRecommendations,
    extraInfo: {
      transportTags:
        incomingGuide.extraInfo.transportTags.length > 0
          ? incomingGuide.extraInfo.transportTags
          : baseGuide.extraInfo.transportTags,
      stayTags:
        incomingGuide.extraInfo.stayTags.length > 0
          ? incomingGuide.extraInfo.stayTags
          : baseGuide.extraInfo.stayTags,
      transportGuide:
        incomingGuide.extraInfo.transportGuide.length > 0
          ? incomingGuide.extraInfo.transportGuide
          : baseGuide.extraInfo.transportGuide,
      ticketPolicy:
        incomingGuide.extraInfo.ticketPolicy.length > 0
          ? incomingGuide.extraInfo.ticketPolicy
          : baseGuide.extraInfo.ticketPolicy,
      stayGuide:
        incomingGuide.extraInfo.stayGuide.length > 0
          ? incomingGuide.extraInfo.stayGuide
          : baseGuide.extraInfo.stayGuide,
      travelTips:
        incomingGuide.extraInfo.travelTips.length > 0
          ? incomingGuide.extraInfo.travelTips
          : baseGuide.extraInfo.travelTips,
      durationHint:
        incomingGuide.extraInfo.durationHint ?? baseGuide.extraInfo.durationHint,
      tips:
        incomingGuide.extraInfo.tips.length > 0
          ? incomingGuide.extraInfo.tips
          : baseGuide.extraInfo.tips,
    },
    travelChecklist: incomingGuide.travelChecklist ?? baseGuide.travelChecklist,
    displayMode: incomingGuide.displayMode ?? baseGuide.displayMode,
    displayHints:
      incomingGuide.displayHints && incomingGuide.displayHints.length > 0
        ? incomingGuide.displayHints
        : baseGuide.displayHints,
  }
}

export async function analyzeTextGuide(inputText: string): Promise<{
  guide: SpotGuide
  partialMessage: string | null
}> {
  const normalized = inputText.trim()
  if (!normalized) {
    throw new Error("请输入抖音链接、口令或攻略文本")
  }

  const classification = classifyTextInput(normalized)
  if (classification.kind === "url_or_token") {
    throw new Error("当前版本仅支持纯文本分析，请粘贴景点名、关键词或一段攻略文字")
  }

  const stage1 =
    classification.kind === "keyword_query"
      ? extractKeywordQueryStage1(normalized)
      : extractTravelNoteStage1(normalized)

  try {
    const deadlineMs = Date.now() + TEXT_ENRICH_TIMEOUT_MS
    const requestedFocusSections = inferFocusSectionsFromText(normalized)
    let guide = await withTimeout(
      enrichSpotWithKimi(stage1, {
        prioritySections: requestedFocusSections,
        rawUserText: normalized,
      }),
      getTimeoutRemaining(deadlineMs),
    )

    if (hasRetryableTextGuideSeed(guide)) {
      let focusedRetryCount = 0

      while (
        hasSparseTravelSections(guide) &&
        focusedRetryCount < MAX_TEXT_FOCUSED_RETRIES
      ) {
        try {
          const focusedRetrySections = buildFocusedRetrySections(
            guide,
            requestedFocusSections,
          )
          const retryGuide = await withTimeout(
            enrichSpotWithKimi(stage1, {
              prioritySections: requestedFocusSections,
              focusSections: focusedRetrySections,
              referenceGuide: guide,
              rawUserText: normalized,
            }),
            getTimeoutRemaining(deadlineMs),
          )
          guide = mergeSpotGuide(guide, retryGuide)
          focusedRetryCount += 1
        } catch (error) {
          return {
            guide,
            partialMessage:
              error instanceof Error && error.message === "TEXT_ENRICH_TIMEOUT"
                ? "部分栏目联网补充超时，当前展示首轮结果"
                : "部分栏目联网补充失败，当前展示首轮结果",
          }
        }
      }
    }

    return {
      guide,
      partialMessage:
        isSpotGuideContentSufficient(guide) || hasRetryableTextGuideSeed(guide)
          ? null
          : "联网补充结果较简略，当前展示已获取结果",
    }
  } catch (error) {
    return {
      guide: mapStage1ToSpotGuide(stage1),
      partialMessage:
        error instanceof Error && error.message === "TEXT_ENRICH_TIMEOUT"
          ? "联网补充超时，当前展示基础结果"
          : "联网补充失败，当前展示基础结果",
    }
  }
}
