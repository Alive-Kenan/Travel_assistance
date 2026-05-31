import type { Stage1SpotExtraction } from "@/types/spotGuide"

function pickFirstMatch(text: string, items: string[]) {
  return items.find((item) => text.includes(item)) ?? ""
}

export function extractTravelNoteStage1(text: string): Stage1SpotExtraction {
  const scenicNames = ["雁荡山", "夫子庙秦淮风光带", "西湖", "黄山"]
  const checkpointNames = ["灵岩景区", "大龙湫", "灵峰", "方洞", "文德桥", "老门东"]
  const foodNames = ["麦饼", "瘦肉丸", "鸭血粉丝汤", "盐水鸭"]
  const coreSpotName = pickFirstMatch(text, scenicNames) || text.slice(0, 12)
  const checkpoints = checkpointNames.filter((item) => text.includes(item))
  const foods = foodNames.filter((item) => text.includes(item))
  const tips = text
    .split(/[，,。！？!?]/)
    .map((item) => item.trim())
    .filter((item) => /(门票|预约|注意|排队|开放|购票)/.test(item))
    .map((item) => `${item}${item.endsWith("。") ? "" : "。"}`)

  return {
    coreSpotName,
    city: text.includes("温州") ? "温州" : undefined,
    summary: text.slice(0, 80),
    highlights: [],
    checkpoints,
    foods,
    souvenirs: [],
    nearbyCandidates: [],
    transportHints: [],
    stayHints: [],
    tips,
    confidence: "medium",
  }
}
