import stage1Template from "@/prompts/kimi-video-analysis.template.json"
import spotInferenceTemplate from "@/prompts/kimi-spot-inference.template.json"
import stage2Template from "@/prompts/kimi-spot-enrichment.template.json"
import type { SpotGuide, Stage1SpotExtraction } from "@/types/spotGuide"

type UserContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }

type ChatMessage = {
  role: "system" | "user"
  content: string | UserContentPart[]
}

type ThinkingConfig = {
  type: "disabled"
}

type SpotEnrichmentPromptOptions = {
  focusSections?: string[]
  referenceGuide?: SpotGuide
}

const focusSectionLabels: Record<string, string> = {
  highlights: "景点亮点",
  foodAndSouvenirs: "特色小吃 / 文创",
  nearbyRecommendations: "周边顺路推荐",
  transportGuide: "交通指南",
  ticketPolicy: "票务政策",
  stayGuide: "住宿参考",
}

function replacePlaceholder(
  template: string,
  placeholder: string,
  value: string,
): string {
  return template.replace(placeholder, value)
}

function buildFocusInstruction(focusSections?: string[]): string {
  if (!focusSections || focusSections.length === 0) {
    return ""
  }

  const labeledSections = focusSections.map(
    (section) => `${section}（${focusSectionLabels[section] ?? section}）`,
  )

  return [
    "",
    "这是一次针对空白栏目的二次补全。",
    `请只重点补齐这些仍然稀疏的栏目：${labeledSections.join("、")}。`,
    "优先使用联网搜索，补充景区官网、官方票务页、景区公众号、文旅局或主流旅游平台可交叉验证的信息。",
    "每个空栏目至少补 1-3 条，能写具体名词就不要写泛泛建议。",
    "如果视频没有直接提到，也要结合景点名、城市名和联网结果做可信补全，不要返回“暂未整理”或留空数组。",
    "请保持 SpotGuide JSON 结构不变，仅把这些空栏目补充得更具体；其他已有内容可沿用或小幅修正。",
  ].join("\n")
}

function buildReferenceGuideInstruction(referenceGuide?: SpotGuide): string {
  if (!referenceGuide) {
    return ""
  }

  return [
    "",
    "以下是当前已经整理出的部分结果，可直接沿用其中已可信的内容，并只重点补齐空白栏目：",
    JSON.stringify(referenceGuide),
  ].join("\n")
}

export async function buildVideoAnalysisRequest(frameDataUrls: string[]) {
  return {
    model: stage1Template.model,
    temperature: stage1Template.temperature,
    response_format: stage1Template.response_format,
    messages: [
      {
        role: "system",
        content: stage1Template.system_prompt,
      } satisfies ChatMessage,
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "请基于这些视频关键帧分析景点，并返回严格 JSON。",
          },
          ...frameDataUrls.map((url) => ({
            type: "image_url" as const,
            image_url: { url },
          })),
        ],
      } satisfies ChatMessage,
    ],
  }
}

export async function buildSpotEnrichmentRequest(
  stage1: Stage1SpotExtraction,
  options?: SpotEnrichmentPromptOptions,
) {
  const focusInstruction = buildFocusInstruction(options?.focusSections)
  const referenceGuideInstruction = buildReferenceGuideInstruction(options?.referenceGuide)

  return {
    model: stage2Template.model,
    thinking: { type: "disabled" } satisfies ThinkingConfig,
    response_format: stage2Template.response_format,
    tools: stage2Template.tools,
    messages: [
      {
        role: "system",
        content: stage2Template.system_prompt,
      } satisfies ChatMessage,
      {
        role: "user",
        content: replacePlaceholder(
          stage2Template.user_prompt_template,
          "{{STAGE1_JSON}}",
          JSON.stringify(stage1),
          ) + focusInstruction + referenceGuideInstruction,
      } satisfies ChatMessage,
    ],
  }
}

export async function buildSpotInferenceRequest(stage1: Stage1SpotExtraction) {
  return {
    model: spotInferenceTemplate.model,
    temperature: spotInferenceTemplate.temperature,
    response_format: spotInferenceTemplate.response_format,
    messages: [
      {
        role: "system",
        content: spotInferenceTemplate.system_prompt,
      } satisfies ChatMessage,
      {
        role: "user",
        content: replacePlaceholder(
          spotInferenceTemplate.user_prompt_template,
          "{{STAGE1_JSON}}",
          JSON.stringify(stage1),
        ),
      } satisfies ChatMessage,
    ],
  }
}
