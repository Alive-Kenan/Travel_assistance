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
  highlights?: Array<string | { title?: string; description?: string }>
  checkpoints?: Array<string | { name?: string; description?: string; photoTip?: string; stayHint?: string }>
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

async function completeBuiltinToolCalls(
  initialBody: Awaited<ReturnType<typeof buildSpotEnrichmentRequest>>,
): Promise<ChatCompletionResponse> {
  const messages = [...initialBody.messages] as Array<
    | (typeof initialBody.messages)[number]
    | ToolCallMessage
  >

  while (true) {
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
        content: toolCallArguments,
      })
    }
  }
}

function parseMessageContentAsJson<T>(response: ChatCompletionResponse): T {
  const content = response.choices?.[0]?.message?.content

  if (!content) {
    throw new Error("KIMI_EMPTY_RESPONSE")
  }

  return JSON.parse(content) as T
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
  const extraInfo = payload.extraInfo ?? {
    transportTags: payload.transportHints ?? [],
    stayTags: payload.stayHints ?? [],
    tips: payload.tips ?? [],
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
      audienceTags: Array.isArray(payload.coreSpot?.audienceTags)
        ? payload.coreSpot.audienceTags
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
              description: `${item}值得作为游览动线中的停留点。`,
            }
          : {
              name: item?.name?.trim() || "推荐停留点",
              description: item?.description?.trim() || "当前结果未提供更详细的打卡点描述。",
              photoTip: item?.photoTip,
              stayHint: item?.stayHint,
            },
      )
      .filter((item) => item.name),
    foodAndSouvenirs:
      foodItems.length > 0
        ? foodItems.map((item) => ({
            name: item.name,
            category: item.category,
            reason: item.reason,
          }))
        : [
            ...(payload.foods ?? []).map((name) => ({
              name,
              category: "food" as const,
              reason: "来自当前景点结果的补充信息。",
            })),
            ...(payload.souvenirs ?? []).map((name) => ({
              name,
              category: "souvenir" as const,
              reason: "来自当前景点结果的补充信息。",
            })),
          ],
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
    extraInfo: {
      transportTags: Array.isArray(extraInfo.transportTags) ? extraInfo.transportTags : [],
      stayTags: Array.isArray(extraInfo.stayTags) ? extraInfo.stayTags : [],
      durationHint: extraInfo.durationHint,
      tips: Array.isArray(extraInfo.tips) ? extraInfo.tips : [],
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
  options?: Pick<SpotGuide, "displayMode" | "displayHints">,
): Promise<SpotGuide> {
  const body = await buildSpotEnrichmentRequest(stage1)
  const response = await completeBuiltinToolCalls(body)

  return applyDisplayMetadata(
    normalizeSpotGuide(parseMessageContentAsJson<SpotGuideLike>(response)),
    options,
  )
}
