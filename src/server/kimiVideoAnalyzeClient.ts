import { buildKimiRequestErrorMessage } from "@/services/kimiClient"
import { uploadVideoToKimi } from "@/server/kimiFilesClient"
import type { Stage1SpotExtraction } from "@/types/spotGuide"

const CHAT_API_BASE = "https://api.moonshot.cn/v1/chat/completions"

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

type UnknownRecord = Record<string, unknown>

const EMPTY_STAGE1: Stage1SpotExtraction = {
  coreSpotName: "",
  city: "",
  summary: "",
  highlights: [],
  checkpoints: [],
  foods: [],
  souvenirs: [],
  nearbyCandidates: [],
  transportHints: [],
  stayHints: [],
  tips: [],
  confidence: "low",
}

function asRecord(value: unknown): UnknownRecord | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as UnknownRecord
  }

  return undefined
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim()
    }
  }

  return ""
}

function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .flatMap((item) => {
      if (typeof item === "string") {
        return item.trim()
      }

      const record = asRecord(item)
      if (!record) {
        return []
      }

      const title = firstString(record.title, record.name, record.名称)
      return title ? [title] : []
    })
    .filter(Boolean)
}

function uniqueStrings(values: Array<string | undefined>): string[] {
  return [...new Set(values.map((value) => value?.trim()).filter(Boolean) as string[])]
}

function summarizeObjectEntries(
  value: unknown,
  options?: { valueIsList?: boolean },
): string[] {
  const record = asRecord(value)
  if (!record) {
    return []
  }

  return Object.entries(record)
    .flatMap(([key, entryValue]) => {
      if (options?.valueIsList) {
        const list = toStringList(entryValue)
        return list.length > 0 ? `${key}：${list.join("、")}` : []
      }

      const text = firstString(entryValue)
      return text ? `${key}：${text}` : []
    })
    .filter(Boolean)
}

function extractCity(value: string): string {
  if (!value) {
    return ""
  }

  const parts = value.split(/[省市区县]/).map((part) => part.trim()).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[1]}市`
  }
  if (parts.length === 1 && !value.endsWith("市")) {
    return `${parts[0]}市`
  }

  return value
}

function inferConfidence(stage1: Omit<Stage1SpotExtraction, "confidence">): Stage1SpotExtraction["confidence"] {
  const signalCount = [
    stage1.coreSpotName,
    stage1.summary,
    ...stage1.highlights,
    ...stage1.checkpoints,
    ...stage1.foods,
    ...stage1.nearbyCandidates,
  ].filter(Boolean).length

  if (stage1.coreSpotName && signalCount >= 6) {
    return "high"
  }
  if (stage1.coreSpotName || signalCount >= 3) {
    return "medium"
  }

  return "low"
}

function normalizeConfidence(value: unknown, stage1: Omit<Stage1SpotExtraction, "confidence">) {
  const normalized = firstString(value).toLowerCase()
  if (normalized === "high" || normalized === "medium" || normalized === "low") {
    return normalized
  }

  return inferConfidence(stage1)
}

function buildSummary(
  coreSpotName: string,
  highlights: string[],
  checkpoints: string[],
): string {
  if (highlights.length > 0) {
    return `${coreSpotName || "该景点"}以${highlights.slice(0, 3).join("、")}等内容最突出。`
  }

  if (checkpoints.length > 0) {
    return `${coreSpotName || "该景点"}可重点关注${checkpoints.slice(0, 3).join("、")}等打卡点。`
  }

  return coreSpotName
    ? `${coreSpotName}的视频已完成解析，可继续结合联网信息补充游玩细节。`
    : "视频已提取到部分景点线索，可继续结合联网信息补充。"
}

function normalizeStage1Extraction(raw: unknown): Stage1SpotExtraction {
  const record = asRecord(raw)
  if (!record) {
    return EMPTY_STAGE1
  }

  const checkpointRecords = Array.isArray(record.打卡点)
    ? record.打卡点.map((item) => asRecord(item)).filter(Boolean) as UnknownRecord[]
    : []
  const nearbyContext = asRecord(record.周边线索)
  const foodContext = asRecord(nearbyContext?.餐饮)
  const stayContext = asRecord(nearbyContext?.住宿)
  const localTransportContext = asRecord(nearbyContext?.当地交通)

  const coreSpotName = firstString(
    record.coreSpotName,
    record.景区名称,
    record.景点名称,
    record.核心景点,
    record.目的地,
  )
  const city = extractCity(firstString(record.city, record.城市, record.地理位置, record.位置))
  const highlights = uniqueStrings([
    ...toStringList(record.highlights),
    ...toStringList(record.核心亮点),
  ])
  const checkpoints = uniqueStrings([
    ...toStringList(record.checkpoints),
    ...checkpointRecords.map((item) => firstString(item.name, item.名称)),
  ])
  const foods = uniqueStrings([
    ...toStringList(record.foods),
    ...toStringList(record.美食),
    ...toStringList(foodContext?.推荐美食),
  ])
  const souvenirs = uniqueStrings([
    ...toStringList(record.souvenirs),
    ...toStringList(record.文创),
    ...toStringList(record.文创产品),
  ])
  const nearbyCandidates = uniqueStrings([
    ...toStringList(record.nearbyCandidates),
    ...toStringList(record.周边景点),
    ...toStringList(record.周边推荐),
  ])
  const transportHints = uniqueStrings([
    ...toStringList(record.transportHints),
    firstString(nearbyContext?.大交通),
    ...summarizeObjectEntries(localTransportContext),
  ])
  const stayHints = uniqueStrings([
    ...toStringList(record.stayHints),
    ...summarizeObjectEntries(stayContext, { valueIsList: true }),
    ...summarizeObjectEntries(stayContext),
  ])
  const tips = uniqueStrings([
    ...toStringList(record.tips),
    ...checkpointRecords.map((item) => firstString(item.备注, item.看点)),
    ...summarizeObjectEntries(nearbyContext?.费用参考),
    firstString(nearbyContext?.优惠政策),
  ])
  const summary = firstString(
    record.summary,
    record.摘要,
    buildSummary(coreSpotName, highlights, checkpoints),
  )

  const stage1WithoutConfidence = {
    ...EMPTY_STAGE1,
    coreSpotName,
    city,
    summary,
    highlights,
    checkpoints,
    foods,
    souvenirs,
    nearbyCandidates,
    transportHints,
    stayHints,
    tips,
  }

  return {
    ...stage1WithoutConfidence,
    confidence: normalizeConfidence(record.confidence ?? record.置信度, stage1WithoutConfidence),
  }
}

export async function analyzeUploadedVideoWithKimi(
  file: File,
  apiKey: string,
): Promise<Stage1SpotExtraction> {
  const fileId = await uploadVideoToKimi(file, apiKey)

  const response = await fetch(CHAT_API_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "kimi-k2.6",
      temperature: 1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "你是景点视频解析助手。请基于完整视频提取景区名称、亮点、打卡点和周边线索，并只返回严格 JSON。字段必须固定为 coreSpotName、city、summary、highlights、checkpoints、foods、souvenirs、nearbyCandidates、transportHints、stayHints、tips、confidence，不要输出中文字段名，也不要省略字段。",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "请分析这个视频并返回景区结构化信息。若某项不确定，请返回空字符串或空数组；confidence 只能填写 high、medium、low。",
            },
            { type: "video_url", video_url: { url: `ms://${fileId}` } },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => undefined)
    throw new Error(buildKimiRequestErrorMessage(response.status, payload))
  }

  const payload = (await response.json()) as ChatCompletionResponse
  return normalizeStage1Extraction(JSON.parse(payload.choices?.[0]?.message?.content ?? "{}"))
}
