import type { Stage1SpotExtraction } from "@/types/spotGuide"

export function shouldRetryVideoAnalysis(stage1: Stage1SpotExtraction): boolean {
  return !stage1.coreSpotName || stage1.confidence !== "high"
}
