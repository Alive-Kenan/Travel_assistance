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
    let guide = await withTimeout(
      enrichSpotWithKimi(stage1),
      getTimeoutRemaining(deadlineMs),
    )

    if (isSpotGuideContentSufficient(guide)) {
      let focusedRetryCount = 0

      while (
        hasSparseTravelSections(guide) &&
        focusedRetryCount < MAX_TEXT_FOCUSED_RETRIES
      ) {
        try {
          const retryGuide = await withTimeout(
            enrichSpotWithKimi(stage1, {
              focusSections: getSparseSectionKeys(guide),
              referenceGuide: guide,
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

    return { guide, partialMessage: null }
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
