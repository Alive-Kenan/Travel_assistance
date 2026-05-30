import { create } from "zustand"
import {
  enrichSpotWithKimi,
  inferSpotCandidateWithKimi,
} from "@/services/kimiClient"
import { analyzeVideoViaBackend } from "@/services/backendVideoAnalyzeClient"
import { analyzeTextGuide } from "@/services/textGuideAnalyzer"
import type { SpotGuide, SpotGuideStatus } from "@/types/spotGuide"
import { EXAMPLE_INPUT } from "@/utils/mockParserAdapter"
import {
  getSparseSectionKeys,
  hasSparseTravelSections,
  isSpotGuideContentSufficient,
} from "@/utils/spotGuideCompleteness"
import { mapStage1ToSpotGuide } from "@/utils/spotGuideMapper"
import { validateVideoFile } from "@/utils/videoFile"

type Status = SpotGuideStatus | "loading"
type VideoAnalyzeWaitLevel = "normal" | "slow" | "very_slow"

const VIDEO_ANALYZE_SLOW_MS = 15_000
const VIDEO_ANALYZE_VERY_SLOW_MS = 30_000

type RideGuideError = {
  code: "INVALID_INPUT" | "TIMEOUT" | "PARSE_FAILED" | "ABORTED"
  message: string
}

type RideGuideState = {
  inputText: string
  status: Status
  result: SpotGuide | null
  error: RideGuideError | null
  partialMessage: string | null
  selectedVideo: File | null
  videoAnalyzeWaitLevel: VideoAnalyzeWaitLevel
  setInputText: (value: string) => void
  setSelectedVideo: (file: File | null) => void
  analyzeDemoVideo: (file: File) => Promise<void>
  clearAll: () => void
  useExample: () => void
  closeError: () => void
  parseNow: () => Promise<void>
  abortParse: () => void
}

let controller: AbortController | null = null
let videoAnalyzeTimer: ReturnType<typeof setTimeout> | null = null
const INFERRED_DISPLAY_HINT = "该景区名称根据视频线索推断，建议进一步核验。"
const MAX_FOCUSED_ENRICHMENT_RETRIES = 2

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

function clearVideoAnalyzeTimer() {
  if (videoAnalyzeTimer) {
    clearTimeout(videoAnalyzeTimer)
    videoAnalyzeTimer = null
  }
}

function scheduleVideoAnalyzeHints(
  set: (partial: Partial<RideGuideState>) => void,
) {
  clearVideoAnalyzeTimer()
  videoAnalyzeTimer = setTimeout(() => {
    set({ videoAnalyzeWaitLevel: "slow" })
    videoAnalyzeTimer = setTimeout(() => {
      set({ videoAnalyzeWaitLevel: "very_slow" })
      videoAnalyzeTimer = null
    }, VIDEO_ANALYZE_VERY_SLOW_MS)
  }, VIDEO_ANALYZE_SLOW_MS)
}

export const useRideGuideStore = create<RideGuideState>((set, get) => ({
  inputText: "",
  status: "idle",
  result: null,
  error: null,
  partialMessage: null,
  selectedVideo: null,
  videoAnalyzeWaitLevel: "normal",
  setInputText: (value) => set({ inputText: value }),
  setSelectedVideo: (file) => set({ selectedVideo: file }),
  clearAll: () => {
    controller?.abort()
    controller = null
    clearVideoAnalyzeTimer()
    set({
      inputText: "",
      status: "idle",
      result: null,
      error: null,
      partialMessage: null,
      selectedVideo: null,
      videoAnalyzeWaitLevel: "normal",
    })
  },
  useExample: () => set({ inputText: EXAMPLE_INPUT }),
  closeError: () => set({ error: null }),
  abortParse: () => {
    controller?.abort()
    controller = null
    const { status } = get()
    if (status === "loading") {
      set({ status: "idle" })
    }
  },
  analyzeDemoVideo: async (file) => {
    set({
      status: "validating_video",
      error: null,
      result: null,
      partialMessage: null,
      selectedVideo: file,
      videoAnalyzeWaitLevel: "normal",
    })

    const validation = validateVideoFile(file)
    if ("reason" in validation) {
      clearVideoAnalyzeTimer()
      set({
        status: "error",
        error: { code: "PARSE_FAILED", message: validation.reason },
        videoAnalyzeWaitLevel: "normal",
      })
      return
    }

    try {
      set({ status: "reading_video" })
      set({ status: "analyzing_video" })
      scheduleVideoAnalyzeHints(set)
      const stage1 = await analyzeVideoViaBackend(file)

      try {
        set({ status: "enriching_spot" })
        let directGuide = await enrichSpotWithKimi(stage1)

        if (isSpotGuideContentSufficient(directGuide)) {
          let focusedRetryCount = 0

          while (
            hasSparseTravelSections(directGuide) &&
            focusedRetryCount < MAX_FOCUSED_ENRICHMENT_RETRIES
          ) {
            const focusSections = getSparseSectionKeys(directGuide)
            const retryGuide = await enrichSpotWithKimi(stage1, {
              focusSections,
              referenceGuide: directGuide,
            })
            directGuide = mergeSpotGuide(directGuide, retryGuide)
            focusedRetryCount += 1
          }

          clearVideoAnalyzeTimer()
          set({
            status: "success",
            result: directGuide,
            partialMessage: null,
            videoAnalyzeWaitLevel: "normal",
          })
          return
        }

        const inferred = await inferSpotCandidateWithKimi(stage1)
        const inferredGuide = await enrichSpotWithKimi(
          {
            ...stage1,
            coreSpotName: inferred.inferredSpotName,
          },
          {
            displayMode: "inferred",
            displayHints: [INFERRED_DISPLAY_HINT],
          },
        )

        clearVideoAnalyzeTimer()
        set({
          status: "success",
          result: inferredGuide,
          partialMessage: null,
          videoAnalyzeWaitLevel: "normal",
        })
      } catch (error) {
        clearVideoAnalyzeTimer()
        const detail =
          error instanceof Error && error.message
            ? `：${error.message}`
            : ""
        set({
          status: "partial_success",
          result: mapStage1ToSpotGuide(stage1),
          partialMessage: `联网补充失败${detail}。当前展示的是视频提取结果`,
          videoAnalyzeWaitLevel: "normal",
        })
      }
    } catch (error) {
      clearVideoAnalyzeTimer()
      set({
        status: "error",
        error: {
          code: "PARSE_FAILED",
          message: error instanceof Error ? error.message : "视频解析失败",
        },
        videoAnalyzeWaitLevel: "normal",
      })
    }
  },
  parseNow: async () => {
    controller?.abort()
    controller = new AbortController()

    set({ status: "loading", error: null, partialMessage: null })
    const { inputText } = get()

    try {
      const result = await analyzeTextGuide(inputText)

      if (controller.signal.aborted) return

      set({
        status: "success",
        result: result.guide,
        partialMessage: result.partialMessage,
      })
    } catch (error) {
      if (controller.signal.aborted) return

      set({
        status: "error",
        error: {
          code: "INVALID_INPUT",
          message: error instanceof Error ? error.message : "文本解析失败",
        },
      })
    }
  },
}))
