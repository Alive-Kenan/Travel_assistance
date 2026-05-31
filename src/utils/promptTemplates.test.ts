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
<<<<<<< HEAD

  it("builds a focused retry prompt for sparse travel sections", async () => {
    const request = await buildSpotEnrichmentRequest(
      {
        coreSpotName: "雁荡山",
        city: "温州",
        summary: "山景壮阔",
        highlights: ["灵峰夜景"],
        checkpoints: ["灵岩景区"],
        foods: [],
        souvenirs: [],
        nearbyCandidates: ["方洞景区"],
        transportHints: ["建议自驾或景区接驳"],
        stayHints: ["可住响岭头游客集散区"],
        tips: ["雨后山路较滑"],
        confidence: "high",
      },
      {
        focusSections: ["transportGuide", "ticketPolicy", "foodAndSouvenirs", "highlights"],
        referenceGuide: {
          source: {
            rawInput: "demo",
            kind: "text",
          },
          coreSpot: {
            title: "雁荡山",
            city: "温州",
            summary: "山景壮阔",
            tripTags: ["一日游", "徒步"],
            audienceTags: ["山岳风光"],
          },
          highlights: [],
          checkpoints: [
            {
              name: "灵岩景区",
              description: "适合安排在主线中段。",
            },
          ],
          foodAndSouvenirs: [],
          nearbyRecommendations: [],
          extraInfo: {
            transportTags: ["建议自驾或景区接驳"],
            stayTags: ["可住响岭头"],
            transportGuide: [],
            ticketPolicy: [],
            stayGuide: [],
            travelTips: ["雨后山路较滑"],
            tips: ["雨后山路较滑"],
          },
          travelChecklist: {
            spots: ["灵岩景区"],
            foods: [],
            essentials: ["防滑鞋"],
            copyText: "出行清单",
          },
        },
      },
    )

    expect(request.messages[1]?.content).toContain("这是一次针对空白栏目的二次补全")
    expect(request.messages[1]?.content).toContain("transportGuide（交通指南）")
    expect(request.messages[1]?.content).toContain("ticketPolicy（票务政策）")
    expect(request.messages[1]?.content).toContain("foodAndSouvenirs（特色小吃 / 文创）")
    expect(request.messages[1]?.content).toContain("highlights（景点亮点）")
    expect(request.messages[1]?.content).toContain("优先使用联网搜索")
    expect(request.messages[1]?.content).toContain("每个空栏目至少补 1-3 条")
    expect(request.messages[1]?.content).toContain("以下是当前已经整理出的部分结果")
    expect(request.messages[1]?.content).toContain("\"tripTags\":[\"一日游\",\"徒步\"]")
    expect(request.messages[1]?.content).toContain("\"checkpoints\":[{\"name\":\"灵岩景区\"")
    expect(request.messages[1]?.content).not.toContain("不要留空：transportGuide、ticketPolicy、foodAndSouvenirs、highlights")
  })
=======
>>>>>>> 6cb67d6e03fddfe356732e24b0d2a8ee92c2215e
})

describe("isSpotGuideContentSufficient", () => {
  it("returns false when there is no title and no content sections", () => {
    expect(
      isSpotGuideContentSufficient({
        coreSpot: {
          title: "",
          city: "温州",
          summary: "",
<<<<<<< HEAD
          tripTags: [],
=======
>>>>>>> 6cb67d6e03fddfe356732e24b0d2a8ee92c2215e
          audienceTags: [],
        },
        highlights: [],
        checkpoints: [],
        foodAndSouvenirs: [],
        nearbyRecommendations: [],
        extraInfo: {
          transportTags: [],
          stayTags: [],
<<<<<<< HEAD
          transportGuide: [],
          ticketPolicy: [],
          stayGuide: [],
          travelTips: [],
=======
>>>>>>> 6cb67d6e03fddfe356732e24b0d2a8ee92c2215e
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
<<<<<<< HEAD
          tripTags: [],
=======
>>>>>>> 6cb67d6e03fddfe356732e24b0d2a8ee92c2215e
          audienceTags: [],
        },
        highlights: [{ title: "灵峰夜景", description: "夜景知名" }],
        checkpoints: [],
        foodAndSouvenirs: [],
        nearbyRecommendations: [],
        extraInfo: {
          transportTags: [],
          stayTags: [],
<<<<<<< HEAD
          transportGuide: [],
          ticketPolicy: [],
          stayGuide: [],
          travelTips: [],
=======
>>>>>>> 6cb67d6e03fddfe356732e24b0d2a8ee92c2215e
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
