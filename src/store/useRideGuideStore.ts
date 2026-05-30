import { create } from "zustand"
import {
  enrichSpotWithKimi,
  inferSpotCandidateWithKimi,
} from "@/services/kimiClient"
import { analyzeVideoViaBackend } from "@/services/backendVideoAnalyzeClient"
import type { SpotGuide, SpotGuideStatus } from "@/types/spotGuide"
import { EXAMPLE_INPUT, mockParserAdapter } from "@/utils/mockParserAdapter"
import { isSpotGuideContentSufficient } from "@/utils/spotGuideCompleteness"
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
        const directGuide = await enrichSpotWithKimi(stage1)

        if (isSpotGuideContentSufficient(directGuide)) {
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
    const res = await mockParserAdapter.parse({ text: inputText }, controller.signal)

    if (controller.signal.aborted) return

    if (res.ok === false) {
      set({
        status: res.errorCode === "ABORTED" ? "idle" : "error",
        error: { code: res.errorCode, message: res.message },
      })
      return
    }

    set({ status: "success", result: res.data })
  },
}))
