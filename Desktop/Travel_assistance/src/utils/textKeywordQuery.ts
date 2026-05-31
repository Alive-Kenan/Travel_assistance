import type { Stage1SpotExtraction } from "@/types/spotGuide"

const CITY_WORDS = [
  "杭州",
  "上海",
  "北京",
  "广州",
  "深圳",
  "成都",
  "重庆",
  "西安",
  "南京",
  "苏州",
  "厦门",
  "青岛",
  "昆明",
  "大理",
  "温州",
]

export function extractKeywordQueryStage1(text: string): Stage1SpotExtraction {
  const tokens = text
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
  const coreSpotName = tokens[0] ?? text.trim()
  const city = CITY_WORDS.find((item) => text.includes(item))
  const stayHints = /住宿|酒店|民宿|住哪/i.test(text) ? ["用户关注住宿信息"] : []
  const transportHints = /交通|高铁|自驾|地铁|公交/i.test(text) ? ["用户关注交通信息"] : []
  const tips = [
    /门票|购票|预约/i.test(text) ? "用户关注门票信息" : "",
    /美食|小吃|文创/i.test(text) ? "用户关注美食信息" : "",
    /路线|动线|一日游/i.test(text) ? "用户关注路线信息" : "",
  ].filter(Boolean)

  return {
    coreSpotName,
    city,
    summary: "",
    highlights: [],
    checkpoints: [],
    foods: [],
    souvenirs: [],
    nearbyCandidates: [],
    transportHints,
    stayHints,
    tips,
    confidence: "medium",
  }
}
