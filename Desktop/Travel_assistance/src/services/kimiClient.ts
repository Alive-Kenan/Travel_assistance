import {
  buildSpotEnrichmentRequest,
  buildSpotInferenceRequest,
  buildVideoAnalysisRequest,
} from "@/utils/promptTemplates"
import type { SpotGuide, Stage1SpotExtraction } from "@/types/spotGuide"

const API_BASE = "https://api.moonshot.cn/v1/chat/completions"

type ChatCompletionResponse = {
  choices?: Array<{
    finish_reason?: string
    message?: {
      content?: string
      role?: string
      tool_calls?: Array<{
        id?: string
        type?: string
        function?: {
          name?: string
          arguments?: string
        }
      }>
    }
  }>
}

type KimiErrorResponse = {
  error?: {
    type?: string
    message?: string
  }
}

type KimiWindow = Window & {
  __KIMI_API_KEY__?: string
}

type KimiEnv = {
  VITE_KIMI_API_KEY?: string
}

export function resolveKimiApiKey(
  runtimeWindow?: Pick<KimiWindow, "__KIMI_API_KEY__">,
  env: KimiEnv = import.meta.env,
): string {
  const apiKey = runtimeWindow?.__KIMI_API_KEY__ || env.VITE_KIMI_API_KEY

  if (!apiKey) {
    throw new Error("MISSING_KIMI_API_KEY")
  }

  return apiKey
}

export function buildKimiRequestErrorMessage(
  status: number,
  payload?: KimiErrorResponse,
): string {
  const type = payload?.error?.type
  const message = payload?.error?.message

  if (type && message) {
    return `Kimi API ${status}: ${type} - ${message}`
  }

  return `Kimi API ${status}: Request failed`
}

async function postJson(body: unknown): Promise<ChatCompletionResponse> {
  const apiKey = resolveKimiApiKey(
    typeof window === "undefined" ? undefined : (window as KimiWindow),
  )

  const response = await fetch(API_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    let payload: KimiErrorResponse | undefined

    try {
      payload = (await response.json()) as KimiErrorResponse
    } catch {
      payload = undefined
    }

    throw new Error(buildKimiRequestErrorMessage(response.status, payload))
  }

  return (await response.json()) as ChatCompletionResponse
}

type ToolCallMessage = {
  role: "assistant" | "tool"
  content: string
  tool_calls?: Array<{
    id?: string
    type?: string
    function?: {
      name?: string
      arguments?: string
    }
  }>
  tool_call_id?: string
  name?: string
}

type SpotGuideLike = Partial<SpotGuide> & {
  coreSpotName?: string
  city?: string
  summary?: string
  dayRoute?: SpotGuide["dayRoute"]
  travelChecklist?: SpotGuide["travelChecklist"]
  highlights?: Array<string | { title?: string; description?: string }>
  checkpoints?: Array<string | { name?: string; description?: string; highlight?: string; duration?: string; photoTip?: string; stayHint?: string }>
  foods?: string[]
  souvenirs?: string[]
  nearbyCandidates?: Array<string | { name?: string; reason?: string; relationHint?: string }>
  transportHints?: string[]
  stayHints?: string[]
  tips?: string[]
}

type SpotCandidate = {
  inferredSpotName: string
  rationale: string
}

const MAX_SECTION_ITEMS = 5
const MAX_DERIVED_EXTRA_INFO_ITEMS = 3
const MAX_BUILTIN_TOOL_CALL_ROUNDS = 4
const TRANSPORT_KEYWORDS = ["高铁", "火车", "动车", "自驾", "接驳", "大巴", "公交", "巴士", "换乘", "停车", "索道", "步行", "车票"]
const TICKET_KEYWORDS = ["门票", "售票", "购票", "联票", "预约", "免票", "优惠", "入园", "车票", "有效", "开放"]
const STAY_KEYWORDS = ["住宿", "民宿", "酒店", "客栈", "住在", "入住", "营地"]

function normalizeBuiltinToolArguments(argumentsText: string): string {
  try {
    return JSON.stringify(JSON.parse(argumentsText))
  } catch {
    return argumentsText
  }
}

async function completeBuiltinToolCalls(
  initialBody: Awaited<ReturnType<typeof buildSpotEnrichmentRequest>>,
): Promise<ChatCompletionResponse> {
  const messages = [...initialBody.messages] as Array<
    | (typeof initialBody.messages)[number]
    | ToolCallMessage
  >

  for (let round = 0; round < MAX_BUILTIN_TOOL_CALL_ROUNDS; round += 1) {
    const response = await postJson({
      ...initialBody,
      messages,
    })
    const choice = response.choices?.[0]

    if (choice?.finish_reason !== "tool_calls") {
      return response
    }

    const toolCalls = choice.message?.tool_calls
    if (!toolCalls?.length) {
      throw new Error("KIMI_EMPTY_TOOL_CALLS")
    }

    messages.push({
      role: "assistant",
      content: choice.message?.content ?? "",
      tool_calls: toolCalls,
    })

    for (const toolCall of toolCalls) {
      const toolCallName = toolCall.function?.name
      const toolCallArguments = toolCall.function?.arguments

      if (!toolCall.id || !toolCallName || !toolCallArguments) {
        throw new Error("KIMI_INVALID_TOOL_CALL")
      }

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        name: toolCallName,
        content: normalizeBuiltinToolArguments(toolCallArguments),
      })
    }
  }

  throw new Error("KIMI_TOOL_CALL_LOOP_EXCEEDED")
}

function parseMessageContentAsJson<T>(response: ChatCompletionResponse): T {
  const content = response.choices?.[0]?.message?.content

  if (!content) {
    throw new Error("KIMI_EMPTY_RESPONSE")
  }

  const normalized = content.trim()
  const fencedMatch = normalized.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  const jsonText = fencedMatch?.[1]?.trim() || normalized

  return JSON.parse(jsonText) as T
}

function normalizeStringList(
  items: unknown,
  candidateKeys: string[] = ["name", "title", "label", "description", "content", "recommendSpot"],
): string[] {
  if (!Array.isArray(items)) {
    return []
  }

  return items
    .map((item) => {
      if (typeof item === "string") {
        return item.trim()
      }

      if (!item || typeof item !== "object") {
        return ""
      }

      for (const key of candidateKeys) {
        const value = (item as Record<string, unknown>)[key]
        if (typeof value === "string" && value.trim()) {
          return value.trim()
        }
      }

      return ""
    })
    .filter(Boolean)
}

function normalizeTextValue(
  value: unknown,
  candidateKeys: string[] = ["name", "title", "label", "description", "content", "recommendSpot"],
): string {
  if (typeof value === "string") {
    return value.trim()
  }

  if (!value || typeof value !== "object") {
    return ""
  }

  for (const key of candidateKeys) {
    const candidate = (value as Record<string, unknown>)[key]
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim()
    }
  }

  return ""
}

function uniqueStrings(items: string[]): string[] {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)))
}

function filterStringsByKeywords(items: string[], keywords: string[]): string[] {
  return items.filter((item) => keywords.some((keyword) => item.includes(keyword)))
}

function deriveExtraInfoSections(extraInfo: NonNullable<SpotGuideLike["extraInfo"]>) {
  const transportTags = normalizeStringList(extraInfo.transportTags)
  const stayTags = normalizeStringList(extraInfo.stayTags)
  const transportGuide = normalizeStringList(extraInfo.transportGuide)
  const ticketPolicy = normalizeStringList(extraInfo.ticketPolicy)
  const stayGuide = normalizeStringList(extraInfo.stayGuide)
  const travelTips = normalizeStringList(extraInfo.travelTips)
  const tips = normalizeStringList(extraInfo.tips)
  const tipPool = uniqueStrings([...travelTips, ...tips])

  return {
    transportTags,
    stayTags,
    transportGuide:
      transportGuide.length > 0
        ? transportGuide
        : uniqueStrings([
            ...transportTags,
            ...filterStringsByKeywords(tipPool, TRANSPORT_KEYWORDS),
          ]).slice(0, MAX_DERIVED_EXTRA_INFO_ITEMS),
    ticketPolicy:
      ticketPolicy.length > 0
        ? ticketPolicy
        : uniqueStrings(filterStringsByKeywords(tipPool, TICKET_KEYWORDS)).slice(
            0,
            MAX_DERIVED_EXTRA_INFO_ITEMS,
          ),
    stayGuide:
      stayGuide.length > 0
        ? stayGuide
        : uniqueStrings([
            ...stayTags,
            ...filterStringsByKeywords(tipPool, STAY_KEYWORDS),
          ]).slice(0, MAX_DERIVED_EXTRA_INFO_ITEMS),
    travelTips,
    durationHint: extraInfo.durationHint,
    tips,
  }
}

function normalizeSpotGuide(payload: SpotGuideLike): SpotGuide {
  const title = payload.coreSpot?.title?.trim() || payload.coreSpotName?.trim() || "待确认景点"
  const summary =
    payload.coreSpot?.summary?.trim() ||
    payload.summary?.trim() ||
    "当前仅提取到部分视频信息，可结合联网补充进一步确认。"
  const city = payload.coreSpot?.city || payload.city

  const highlightItems = Array.isArray(payload.highlights) ? payload.highlights : []
  const checkpointItems = Array.isArray(payload.checkpoints) ? payload.checkpoints : []
  const foodItems = Array.isArray(payload.foodAndSouvenirs) ? payload.foodAndSouvenirs : []
  const nearbyItems = Array.isArray(payload.nearbyRecommendations)
    ? payload.nearbyRecommendations
    : Array.isArray(payload.nearbyCandidates)
      ? payload.nearbyCandidates
      : []
  const budget =
    payload.coreSpot?.budget?.label && payload.coreSpot?.budget?.range
      ? {
          label: payload.coreSpot.budget.label,
          range: payload.coreSpot.budget.range,
          description: payload.coreSpot.budget.description,
        }
      : undefined
  const extraInfo = payload.extraInfo ?? {
    transportTags: payload.transportHints ?? [],
    stayTags: payload.stayHints ?? [],
    transportGuide: payload.transportHints ?? [],
    ticketPolicy: [],
    stayGuide: payload.stayHints ?? [],
    travelTips: payload.tips ?? [],
    tips: payload.tips ?? [],
  }
  const resolvedExtraInfo = deriveExtraInfoSections(extraInfo)
  const fallbackChecklist = {
    spots: checkpointItems
      .map((item) => (typeof item === "string" ? item : item?.name || ""))
      .filter(Boolean),
    foods: payload.foods ?? [],
    essentials: ["舒适好走的鞋", "手机与充电宝"],
  }

  return {
    source: {
      rawInput: payload.source?.rawInput ?? JSON.stringify(payload),
      kind: payload.source?.kind === "url" ? "url" : "text",
    },
    coreSpot: {
      title,
      city,
      summary,
      bestTime: payload.coreSpot?.bestTime,
      bestSeason: payload.coreSpot?.bestSeason,
      tripTags: normalizeStringList(payload.coreSpot?.tripTags),
      budget,
      audienceTags: Array.isArray(payload.coreSpot?.audienceTags)
        ? normalizeStringList(payload.coreSpot.audienceTags)
        : highlightItems
            .map((item) => (typeof item === "string" ? item : item?.title || ""))
            .filter(Boolean)
            .slice(0, 3),
    },
    highlights: highlightItems
      .map((item) =>
        typeof item === "string"
          ? {
              title: item,
              description: `${item}是当前结果中提取到的景点亮点。`,
            }
          : {
              title: item?.title?.trim() || "视频亮点",
              description: item?.description?.trim() || "当前结果未提供更详细的亮点描述。",
            },
      )
      .filter((item) => item.title),
    checkpoints: checkpointItems
      .map((item) =>
        typeof item === "string"
          ? {
              name: item,
              description: "当前结果未提供更详细的打卡点描述。",
            }
          : {
              name: item?.name?.trim() || "推荐停留点",
              description: item?.description?.trim() || "当前结果未提供更详细的打卡点描述。",
              highlight: item?.highlight?.trim(),
              duration: item?.duration?.trim(),
              photoTip: item?.photoTip,
              stayHint: item?.stayHint,
            },
      )
      .filter((item) => item.name)
      .slice(0, MAX_SECTION_ITEMS),
    foodAndSouvenirs:
      foodItems.length > 0
        ? foodItems
            .map((item) => ({
              name: normalizeTextValue(item.name) || "本地推荐",
              category: item.category === "souvenir" ? "souvenir" as const : "food" as const,
              reason: normalizeTextValue(item.reason) || "可优先安排在景点周边顺路体验。",
            }))
            .slice(0, MAX_SECTION_ITEMS)
        : [
            ...(payload.foods ?? []).map((name) => ({
              name,
              category: "food" as const,
              reason: "可优先安排在景点周边顺路品尝。",
            })),
            ...(payload.souvenirs ?? []).map((name) => ({
              name,
              category: "souvenir" as const,
              reason: "适合作为带有当地特色的轻量伴手礼。",
            })),
          ].slice(0, MAX_SECTION_ITEMS),
    nearbyRecommendations: nearbyItems
      .map((item) =>
        typeof item === "string"
          ? {
              name: item,
              reason: "可与主景点顺路安排。",
            }
          : {
              name: item?.name?.trim() || "周边地点",
              reason: item?.reason?.trim() || "当前结果未提供更详细的周边说明。",
              relationHint: item?.relationHint,
            },
      )
      .filter((item) => item.name),
    dayRoute:
      payload.dayRoute?.title && Array.isArray(payload.dayRoute.stops)
        ? {
            title: payload.dayRoute.title,
            stops: normalizeStringList(payload.dayRoute.stops),
            summary: payload.dayRoute.summary,
          }
        : undefined,
    extraInfo: {
      transportTags: resolvedExtraInfo.transportTags,
      stayTags: resolvedExtraInfo.stayTags,
      transportGuide: resolvedExtraInfo.transportGuide,
      ticketPolicy: resolvedExtraInfo.ticketPolicy,
      stayGuide: resolvedExtraInfo.stayGuide,
      travelTips: resolvedExtraInfo.travelTips,
      durationHint: resolvedExtraInfo.durationHint,
      tips: resolvedExtraInfo.tips,
    },
    travelChecklist: payload.travelChecklist
      ? {
          spots: Array.isArray(payload.travelChecklist.spots) ? payload.travelChecklist.spots : [],
          foods: Array.isArray(payload.travelChecklist.foods) ? payload.travelChecklist.foods : [],
          essentials: Array.isArray(payload.travelChecklist.essentials)
            ? payload.travelChecklist.essentials
            : [],
          copyText:
            payload.travelChecklist.copyText ||
            [
              "出行清单",
              `打卡地点：${fallbackChecklist.spots.join("、") || "待补充"}`,
              `必吃美食：${fallbackChecklist.foods.join("、") || "待补充"}`,
              `必备物品：${fallbackChecklist.essentials.join("、") || "待补充"}`,
            ].join("\n"),
        }
      : {
          ...fallbackChecklist,
          copyText: [
            "出行清单",
            `打卡地点：${fallbackChecklist.spots.join("、") || "待补充"}`,
            `必吃美食：${fallbackChecklist.foods.join("、") || "待补充"}`,
            `必备物品：${fallbackChecklist.essentials.join("、") || "待补充"}`,
          ].join("\n"),
        },
  }
}

function applyDisplayMetadata(
  guide: SpotGuide,
  options?: Pick<SpotGuide, "displayMode" | "displayHints">,
): SpotGuide {
  return {
    ...guide,
    displayMode: options?.displayMode ?? guide.displayMode ?? "full",
    displayHints: options?.displayHints ?? guide.displayHints ?? [],
  }
}

export async function analyzeVideoWithKimi(
  frameDataUrls: string[],
): Promise<Stage1SpotExtraction> {
  const body = await buildVideoAnalysisRequest(frameDataUrls)
  const response = await postJson(body)

  return parseMessageContentAsJson<Stage1SpotExtraction>(response)
}

export async function inferSpotCandidateWithKimi(
  stage1: Stage1SpotExtraction,
): Promise<SpotCandidate> {
  const body = await buildSpotInferenceRequest(stage1)
  const response = await postJson(body)

  return parseMessageContentAsJson<SpotCandidate>(response)
}

export async function enrichSpotWithKimi(
  stage1: Stage1SpotExtraction,
  options?: Pick<SpotGuide, "displayMode" | "displayHints"> & {
    prioritySections?: string[]
    focusSections?: string[]
    referenceGuide?: SpotGuide
    rawUserText?: string
  },
): Promise<SpotGuide> {
  const body = await buildSpotEnrichmentRequest(stage1, {
    prioritySections: options?.prioritySections,
    focusSections: options?.focusSections,
    referenceGuide: options?.referenceGuide,
    rawUserText: options?.rawUserText,
  })
  const response = await completeBuiltinToolCalls(body)

  return applyDisplayMetadata(
    normalizeSpotGuide(parseMessageContentAsJson<SpotGuideLike>(response)),
    options,
  )
}
