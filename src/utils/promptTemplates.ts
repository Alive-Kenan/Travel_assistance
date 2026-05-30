import stage1Template from "@/prompts/kimi-video-analysis.template.json"
import spotInferenceTemplate from "@/prompts/kimi-spot-inference.template.json"
import stage2Template from "@/prompts/kimi-spot-enrichment.template.json"
import type { Stage1SpotExtraction } from "@/types/spotGuide"

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

function replacePlaceholder(
  template: string,
  placeholder: string,
  value: string,
): string {
  return template.replace(placeholder, value)
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

export async function buildSpotEnrichmentRequest(stage1: Stage1SpotExtraction) {
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
        ),
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
