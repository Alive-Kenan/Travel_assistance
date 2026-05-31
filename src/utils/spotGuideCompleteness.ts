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
<<<<<<< HEAD

export function hasSparseTravelSections(guide: SpotGuide): boolean {
  return getSparseSectionKeys(guide).length > 0
}

export function getSparseSectionKeys(guide: SpotGuide): string[] {
  const sections: string[] = []

  if (guide.highlights.length === 0) {
    sections.push("highlights")
  }

  if (guide.foodAndSouvenirs.length === 0) {
    sections.push("foodAndSouvenirs")
  }

  if (guide.nearbyRecommendations.length === 0) {
    sections.push("nearbyRecommendations")
  }

  if (guide.extraInfo.transportGuide.length === 0) {
    sections.push("transportGuide")
  }

  if (guide.extraInfo.ticketPolicy.length === 0) {
    sections.push("ticketPolicy")
  }

  if (guide.extraInfo.stayGuide.length === 0) {
    sections.push("stayGuide")
  }

  return sections
}
=======
>>>>>>> 6cb67d6e03fddfe356732e24b0d2a8ee92c2215e
