import type { ParseInput, ParseResult, ParserAdapter, SpotGuide } from "@/types/spotGuide"
import { sleep } from "@/utils/sleep"

export const EXAMPLE_INPUT = `南京夫子庙旅行速查：
主景点：夫子庙秦淮风光带
亮点：夜景氛围浓、秦淮河游船、传统街区、适合拍照打卡
打卡点：文德桥、泮池、江南贡院、秦淮河沿岸灯影
小吃：鸭血粉丝汤、盐水鸭、小笼包、梅花糕
文创：秦淮灯彩周边、城市冰箱贴、书签礼盒
周边：老门东顺路可逛，适合继续拍照和吃小吃
补充：公共交通方便，建议傍晚到夜间游玩，周末注意人流`

function isProbablyUrl(text: string) {
  return /https?:\/\/\S+/i.test(text) || /douyin/i.test(text)
}

function pickCity(text: string) {
  const candidates = ["杭州", "上海", "北京", "广州", "深圳", "成都", "重庆", "西安", "南京", "苏州", "厦门", "青岛", "昆明", "大理"]
  return candidates.find((c) => text.includes(c))
}

function getLineValue(text: string, label: string) {
  const line = text
    .split("\n")
    .map((item) => item.trim())
    .find((item) => item.startsWith(label))

  return line ? line.replace(new RegExp(`^${label}[:：]?\\s*`), "").trim() : ""
}

function splitItems(line: string) {
  return line
    .split(/[，,、]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function buildHighlights(items: string[]) {
  return items.map((item) => ({
    title: item,
    description: `${item}，是这个景点值得优先体验的部分。`,
  }))
}

function buildCheckpoints(items: string[]) {
  return items.map((item) => ({
    name: item,
    description: `${item}适合作为重点停留和拍照打卡的位置。`,
    highlight: `${item}有较强的现场辨识度，适合优先安排。`,
    photoTip: `${item}适合停下来拍照留念。`,
  }))
}

function buildFoodAndSouvenirs(food: string[], souvenirs: string[]) {
  return [
    ...food.map((name) => ({
      name,
      category: "food" as const,
      reason: "本地高频推荐，适合顺路品尝。",
    })),
    ...souvenirs.map((name) => ({
      name,
      category: "souvenir" as const,
      reason: "适合作为到此一游纪念。",
    })),
  ]
}

function buildNearbyRecommendations(raw: string) {
  if (!raw) return []

  return raw
    .split(/[。；;]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [name, ...rest] = item.split(/[，,]/).map((part) => part.trim()).filter(Boolean)
      return {
        name: name ?? "周边顺路点",
        reason: rest.join("，") || "适合和主景点一起安排。",
      }
    })
}

function buildExtraInfo(raw: string) {
  const items = splitItems(raw)
  const transportTags = items.filter((item) => /(交通|公交|地铁|步行|打车|方便)/.test(item))
  const stayTags = items.filter((item) => /(住|酒店|民宿|夜间|傍晚)/.test(item))
  const tips = items.filter((item) => !transportTags.includes(item) && !stayTags.includes(item))

  return {
    transportTags: transportTags.length > 0 ? transportTags : ["公共交通方便"],
    stayTags,
    transportGuide: transportTags.length > 0 ? transportTags : ["公共交通方便"],
    ticketPolicy: [],
    stayGuide: stayTags,
    travelTips: tips.length > 0 ? tips : ["周末注意人流"],
    durationHint: items.find((item) => /(半天|一天|傍晚|夜间)/.test(item)),
    tips: tips.length > 0 ? tips : ["周末注意人流"],
  }
}

function buildTravelChecklist(checkpoints: string[], foods: string[]) {
  const essentials = ["舒适好走的鞋", "手机与充电宝"]

  return {
    spots: checkpoints,
    foods,
    essentials,
    copyText: [
      "出行清单",
      `打卡地点：${checkpoints.length > 0 ? checkpoints.join("、") : "待补充"}`,
      `必吃美食：${foods.length > 0 ? foods.join("、") : "待补充"}`,
      `必备物品：${essentials.join("、")}`,
    ].join("\n"),
  }
}

function buildGuide(text: string, kind: "url" | "text"): SpotGuide {
  const city = pickCity(text)
  const spotTitle = getLineValue(text, "主景点") || (city ? `${city}人气景点` : "热门景点")
  const highlightItems = splitItems(getLineValue(text, "亮点"))
  const checkpointItems = splitItems(getLineValue(text, "打卡点"))
  const foodItems = splitItems(getLineValue(text, "小吃"))
  const souvenirItems = splitItems(getLineValue(text, "文创"))
  const nearbyRaw = getLineValue(text, "周边")
  const extraInfoRaw = getLineValue(text, "补充")
  const extraInfo = buildExtraInfo(extraInfoRaw)
  const bestTime = extraInfo.durationHint
  const audienceTags = highlightItems.slice(0, 3)
  const tripTags = [
    bestTime ? "一日游" : "",
    extraInfo.transportTags.some((item) => /(交通|地铁|公交)/.test(item)) ? "公共交通" : "",
  ].filter(Boolean)

  return {
    source: {
      rawInput: text,
      kind,
    },
    coreSpot: {
      title: spotTitle,
      city,
      summary: `${spotTitle}很值得加入行程，适合用一屏快速掌握亮点、打卡点和顺路吃逛建议。`,
      bestTime,
      tripTags,
      audienceTags: audienceTags.length > 0 ? audienceTags : ["拍照打卡", "城市漫游"],
    },
    dayRoute: {
      title: "一日游览动线",
      stops: checkpointItems.length > 0 ? checkpointItems : [spotTitle],
      summary: "适合首次到访时按主线快速游玩。",
    },
    highlights: buildHighlights(highlightItems.length > 0 ? highlightItems : ["景色出片", "氛围感强"]),
    checkpoints: buildCheckpoints(checkpointItems.length > 0 ? checkpointItems : [spotTitle]),
    foodAndSouvenirs: buildFoodAndSouvenirs(
      foodItems.length > 0 ? foodItems : ["本地特色小吃"],
      souvenirItems.length > 0 ? souvenirItems : ["城市纪念冰箱贴"],
    ),
    nearbyRecommendations: buildNearbyRecommendations(nearbyRaw).length > 0
      ? buildNearbyRecommendations(nearbyRaw)
      : [{ name: "周边街区", reason: "适合继续散步和补充小吃。" }],
    extraInfo,
    travelChecklist: buildTravelChecklist(
      checkpointItems.length > 0 ? checkpointItems : [spotTitle],
      foodItems.length > 0 ? foodItems : ["本地特色小吃"],
    ),
  }
}

export class MockParserAdapter implements ParserAdapter {
  async parse(input: ParseInput, signal?: AbortSignal): Promise<ParseResult> {
    const text = input.text.trim()
    if (!text) {
      return { ok: false, errorCode: "INVALID_INPUT", message: "请输入抖音链接、口令或攻略文本" }
    }

    const kind = isProbablyUrl(text) ? "url" : "text"

    try {
      await sleep(880, signal)
      if (/解析失败|fail|error/i.test(text)) {
        return { ok: false, errorCode: "PARSE_FAILED", message: "这段内容暂时解析不出来，换个链接/文本再试试" }
      }
      const guide = buildGuide(text, kind)
      return { ok: true, data: guide }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        return { ok: false, errorCode: "ABORTED", message: "已取消解析" }
      }
      return { ok: false, errorCode: "TIMEOUT", message: "解析超时，稍后再试或换个内容" }
    }
  }
}

export const mockParserAdapter = new MockParserAdapter()
