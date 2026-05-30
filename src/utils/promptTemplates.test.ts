import { describe, expect, it } from "vitest"
import {
  buildSpotInferenceRequest,
  buildSpotEnrichmentRequest,
  buildVideoAnalysisRequest,
} from "@/utils/promptTemplates"
import { isSpotGuideContentSufficient } from "@/utils/spotGuideCompleteness"
import { shouldRetryVideoAnalysis } from "@/utils/videoAnalysisRetry"

describe("buildVideoAnalysisRequest", () => {
  it("builds a multimodal image request instead of inlining video data", async () => {
    const request = await buildVideoAnalysisRequest([
      "data:image/jpeg;base64,frame-a",
      "data:image/jpeg;base64,frame-b",
    ])

    expect(request.model).toBe("kimi-k2.6")
    expect(request.temperature).toBe(1)
    expect(request.messages[1]?.content).toEqual([
      { type: "text", text: expect.stringContaining("严格 JSON") },
      { type: "image_url", image_url: { url: "data:image/jpeg;base64,frame-a" } },
      { type: "image_url", image_url: { url: "data:image/jpeg;base64,frame-b" } },
    ])
    expect(JSON.stringify(request)).not.toContain("data:video/")
  })
})

describe("shouldRetryVideoAnalysis", () => {
  it("returns true when confidence is not high", () => {
    expect(
      shouldRetryVideoAnalysis({
        coreSpotName: "雁荡山",
        city: "温州",
        summary: "山景",
        highlights: [],
        checkpoints: [],
        foods: [],
        souvenirs: [],
        nearbyCandidates: [],
        transportHints: [],
        stayHints: [],
        tips: [],
        confidence: "medium",
      }),
    ).toBe(true)
  })

  it("returns true when core spot name is missing", () => {
    expect(
      shouldRetryVideoAnalysis({
        coreSpotName: "",
        city: "温州",
        summary: "山景",
        highlights: [],
        checkpoints: [],
        foods: [],
        souvenirs: [],
        nearbyCandidates: [],
        transportHints: [],
        stayHints: [],
        tips: [],
        confidence: "high",
      }),
    ).toBe(true)
  })

  it("returns false when core spot name exists and confidence is high", () => {
    expect(
      shouldRetryVideoAnalysis({
        coreSpotName: "雁荡山",
        city: "温州",
        summary: "山景",
        highlights: [],
        checkpoints: [],
        foods: [],
        souvenirs: [],
        nearbyCandidates: [],
        transportHints: [],
        stayHints: [],
        tips: [],
        confidence: "high",
      }),
    ).toBe(false)
  })
})

describe("buildSpotEnrichmentRequest", () => {
  it("injects the stage1 json into the stage2 template", async () => {
    const request = await buildSpotEnrichmentRequest({
      coreSpotName: "夫子庙秦淮风光带",
      city: "南京",
      summary: "夜景氛围浓",
      highlights: ["夜景", "游船"],
      checkpoints: ["文德桥"],
      foods: ["鸭血粉丝汤"],
      souvenirs: ["灯彩冰箱贴"],
      nearbyCandidates: ["老门东"],
      transportHints: ["公共交通方便"],
      stayHints: ["建议住在秦淮河附近"],
      tips: ["周末注意人流"],
      confidence: "high",
    })

    expect(request.model).toBe("kimi-k2.6")
    expect(request.thinking).toEqual({ type: "disabled" })
    expect(request.messages[1]?.content).toContain("\"coreSpotName\":\"夫子庙秦淮风光带\"")
  })
})

describe("isSpotGuideContentSufficient", () => {
  it("returns false when there is no title and no content sections", () => {
    expect(
      isSpotGuideContentSufficient({
        coreSpot: {
          title: "",
          city: "温州",
          summary: "",
          audienceTags: [],
        },
        highlights: [],
        checkpoints: [],
        foodAndSouvenirs: [],
        nearbyRecommendations: [],
        extraInfo: {
          transportTags: [],
          stayTags: [],
          tips: [],
        },
        source: {
          rawInput: "demo",
          kind: "text",
        },
      }),
    ).toBe(false)
  })

  it("returns true when title exists and at least one section has content", () => {
    expect(
      isSpotGuideContentSufficient({
        coreSpot: {
          title: "雁荡山",
          city: "温州",
          summary: "山景壮阔",
          audienceTags: [],
        },
        highlights: [{ title: "灵峰夜景", description: "夜景知名" }],
        checkpoints: [],
        foodAndSouvenirs: [],
        nearbyRecommendations: [],
        extraInfo: {
          transportTags: [],
          stayTags: [],
          tips: [],
        },
        source: {
          rawInput: "demo",
          kind: "text",
        },
      }),
    ).toBe(true)
  })
})

describe("buildSpotInferenceRequest", () => {
  it("builds an inference request from weak stage1 clues", async () => {
    const request = await buildSpotInferenceRequest({
      coreSpotName: "",
      city: "温州",
      summary: "",
      highlights: ["山峰", "夜景"],
      checkpoints: ["观景台"],
      foods: [],
      souvenirs: [],
      nearbyCandidates: ["景区索道"],
      transportHints: [],
      stayHints: [],
      tips: [],
      confidence: "low",
    })

    expect(request.messages[1]?.content).toContain("\"highlights\":[\"山峰\",\"夜景\"]")
    expect(request.response_format).toEqual({ type: "json_object" })
  })
})
