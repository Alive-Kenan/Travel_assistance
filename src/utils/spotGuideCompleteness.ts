import type { SpotGuide } from "@/types/spotGuide"

export function isSpotGuideContentSufficient(guide: SpotGuide): boolean {
  const hasTitle = Boolean(guide.coreSpot.title?.trim())
  const hasSummary = Boolean(guide.coreSpot.summary?.trim())
  const hasSections =
    guide.highlights.length > 0 ||
    guide.checkpoints.length > 0 ||
    guide.foodAndSouvenirs.length > 0 ||
    guide.nearbyRecommendations.length > 0

  return hasTitle && (hasSummary || hasSections)
}
