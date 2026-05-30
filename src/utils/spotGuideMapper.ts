import type { SpotGuide, Stage1SpotExtraction } from "@/types/spotGuide"

export function mapStage1ToSpotGuide(stage1: Stage1SpotExtraction): SpotGuide {
  const title = stage1.coreSpotName?.trim() || "待确认景点"
  const summary =
    stage1.summary?.trim() ||
    "当前仅提取到部分视频信息，可结合联网补充进一步确认。"
  const highlights = stage1.highlights ?? []
  const checkpoints = stage1.checkpoints ?? []
  const foods = stage1.foods ?? []
  const souvenirs = stage1.souvenirs ?? []
  const nearbyCandidates = stage1.nearbyCandidates ?? []
  const transportHints = stage1.transportHints ?? []
  const stayHints = stage1.stayHints ?? []
  const tips = stage1.tips ?? []

  return {
    source: {
      rawInput: JSON.stringify(stage1),
      kind: "text",
    },
    coreSpot: {
      title,
      city: stage1.city,
      summary,
      audienceTags: highlights.slice(0, 3),
    },
    highlights: highlights.map((title) => ({
      title,
      description: `${title}是视频中反复出现的重点内容。`,
    })),
    checkpoints: checkpoints.map((name) => ({
      name,
      description: `${name}适合安排进游览动线。`,
    })),
    foodAndSouvenirs: [
      ...foods.map((name) => ({
        name,
        category: "food" as const,
        reason: "来自视频提取结果。",
      })),
      ...souvenirs.map((name) => ({
        name,
        category: "souvenir" as const,
        reason: "来自视频提取结果。",
      })),
    ],
    nearbyRecommendations: nearbyCandidates.map((name) => ({
      name,
      reason: "视频中出现的周边候选地点。",
    })),
    extraInfo: {
      transportTags: transportHints,
      stayTags: stayHints,
      tips,
    },
  }
}
