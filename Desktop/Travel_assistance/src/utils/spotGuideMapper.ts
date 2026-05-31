import type { SpotGuide, Stage1SpotExtraction } from "@/types/spotGuide"

function buildChecklistCopyText(
  spots: string[],
  foods: string[],
  essentials: string[],
): string {
  return [
    "出行清单",
    `打卡地点：${spots.length > 0 ? spots.join("、") : "待补充"}`,
    `必吃美食：${foods.length > 0 ? foods.join("、") : "待补充"}`,
    `必备物品：${essentials.length > 0 ? essentials.join("、") : "待补充"}`,
  ].join("\n")
}

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
  const essentials = ["舒适好走的鞋", "手机与充电宝"]
  const routeStops = checkpoints.slice(0, 5)

  return {
    source: {
      rawInput: JSON.stringify(stage1),
      kind: "text",
    },
    coreSpot: {
      title,
      city: stage1.city,
      summary,
      tripTags: [],
      audienceTags: highlights.slice(0, 3),
    },
    dayRoute:
      routeStops.length > 0
        ? {
            title: "一日游览动线",
            stops: routeStops,
            summary: "建议结合视频里的打卡顺序灵活安排行程。",
          }
        : undefined,
    highlights: highlights.map((title) => ({
      title,
      description: `${title}是视频中反复出现的重点内容。`,
    })),
    checkpoints: checkpoints.map((name) => ({
      name,
      description: "可作为游览过程中重点停留的打卡点。",
      highlight: "适合结合周边景观点一起安排停留。",
    })),
    foodAndSouvenirs: [
      ...foods.map((name) => ({
        name,
        category: "food" as const,
        reason: "可优先安排在景点周边顺路品尝。",
      })),
      ...souvenirs.map((name) => ({
        name,
        category: "souvenir" as const,
        reason: "适合作为带有当地特色的轻量伴手礼。",
      })),
    ],
    nearbyRecommendations: nearbyCandidates.map((name) => ({
      name,
      reason: "视频中出现的周边候选地点。",
    })),
    extraInfo: {
      transportTags: transportHints,
      stayTags: stayHints,
      transportGuide: transportHints,
      ticketPolicy: [],
      stayGuide: stayHints,
      travelTips: tips,
      tips,
    },
    travelChecklist: {
      spots: checkpoints,
      foods,
      essentials,
      copyText: buildChecklistCopyText(checkpoints, foods, essentials),
    },
  }
}
