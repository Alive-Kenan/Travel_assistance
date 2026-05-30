import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const {
  stage1Fixture,
  spotGuideFixture,
  analyzeVideoViaBackendMock,
  analyzeVideoWithKimiMock,
  enrichSpotWithKimiMock,
  inferSpotCandidateWithKimiMock,
  analyzeTextGuideMock,
} = vi.hoisted(() => {
  const stage1Fixture = {
    coreSpotName: "夫子庙秦淮风光带",
    city: "南京",
    summary: "夜景氛围浓",
    highlights: ["夜景"],
    checkpoints: ["文德桥"],
    foods: ["鸭血粉丝汤"],
    souvenirs: ["灯彩冰箱贴"],
    nearbyCandidates: ["老门东"],
    transportHints: ["公共交通方便"],
    stayHints: [],
    tips: ["周末注意人流"],
    confidence: "high",
  } as const

  const spotGuideFixture = {
    source: {
      rawInput: "demo",
      kind: "text",
    },
    coreSpot: {
      title: "夫子庙秦淮风光带",
      city: "南京",
      summary: "夜景氛围浓",
      bestTime: "夜间",
      tripTags: ["一日游", "公共交通"],
      audienceTags: ["夜景"],
    },
    dayRoute: {
      title: "一日游览动线",
      stops: ["文德桥", "老门东"],
      summary: "适合首次到访时顺路游玩。",
    },
    highlights: [
      {
        title: "夜景",
        description: "夜景氛围浓",
      },
    ],
    checkpoints: [
      {
        name: "文德桥",
        description: "适合安排进主要游览动线。",
        highlight: "桥面夜景与河岸灯光适合打卡。",
        photoTip: "适合停下来拍照留念。",
      },
    ],
    foodAndSouvenirs: [
      {
        name: "鸭血粉丝汤",
        category: "food",
        reason: "本地高频推荐，适合顺路品尝。",
      },
    ],
    nearbyRecommendations: [
      {
        name: "老门东",
        reason: "适合和主景点一起安排。",
      },
    ],
    extraInfo: {
      transportTags: ["公共交通方便"],
      stayTags: [],
      transportGuide: ["地铁可达，步行接驳方便。"],
      ticketPolicy: ["夜游项目请以现场开放时间为准。"],
      stayGuide: [],
      travelTips: ["周末注意人流"],
      durationHint: "夜间",
      tips: ["周末注意人流"],
    },
    travelChecklist: {
      spots: ["文德桥"],
      foods: ["鸭血粉丝汤"],
      essentials: ["舒适好走的鞋"],
      copyText: "出行清单\n打卡地点：文德桥",
    },
  } as const

  return {
    stage1Fixture,
    spotGuideFixture,
    analyzeVideoViaBackendMock: vi.fn().mockResolvedValue(stage1Fixture),
    analyzeVideoWithKimiMock: vi.fn().mockResolvedValue(stage1Fixture),
    enrichSpotWithKimiMock: vi.fn().mockRejectedValue(new Error("SEARCH_FAILED")),
    inferSpotCandidateWithKimiMock: vi.fn(),
    analyzeTextGuideMock: vi.fn(),
  }
})

vi.mock("@/services/kimiClient", () => ({
  analyzeVideoWithKimi: analyzeVideoWithKimiMock,
  enrichSpotWithKimi: enrichSpotWithKimiMock,
  inferSpotCandidateWithKimi: inferSpotCandidateWithKimiMock,
}))

vi.mock("@/services/backendVideoAnalyzeClient", () => ({
  analyzeVideoViaBackend: analyzeVideoViaBackendMock,
}))

vi.mock("@/services/textGuideAnalyzer", () => ({
  analyzeTextGuide: analyzeTextGuideMock,
}))

import { useRideGuideStore } from "@/store/useRideGuideStore"

describe("useRideGuideStore", () => {
  beforeEach(() => {
    analyzeVideoViaBackendMock.mockReset()
    analyzeVideoViaBackendMock.mockResolvedValue(stage1Fixture)
    analyzeVideoWithKimiMock.mockReset()
    analyzeVideoWithKimiMock.mockResolvedValue(stage1Fixture)
    enrichSpotWithKimiMock.mockReset()
    enrichSpotWithKimiMock.mockRejectedValue(new Error("SEARCH_FAILED"))
    inferSpotCandidateWithKimiMock.mockReset()
    analyzeTextGuideMock.mockReset()
    useRideGuideStore.getState().clearAll()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("uses backend video analyze api as the primary stage1 path", async () => {
    analyzeVideoViaBackendMock.mockResolvedValue(stage1Fixture)
    enrichSpotWithKimiMock.mockResolvedValue(spotGuideFixture)

    const file = new File([new Uint8Array([1])], "demo.mp4", { type: "video/mp4" })
    await useRideGuideStore.getState().analyzeDemoVideo(file)

    expect(analyzeVideoViaBackendMock).toHaveBeenCalledTimes(1)
    expect(analyzeVideoWithKimiMock).not.toHaveBeenCalled()
    expect(useRideGuideStore.getState().status).toBe("success")
  })

  it("promotes video wait level during a long analysis and clears it on success", async () => {
    vi.useFakeTimers()
    analyzeVideoViaBackendMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(stage1Fixture), 50_000)
        }),
    )
    enrichSpotWithKimiMock.mockResolvedValue(spotGuideFixture)

    const file = new File([new Uint8Array([1])], "demo.mp4", { type: "video/mp4" })
    const task = useRideGuideStore.getState().analyzeDemoVideo(file)

    await vi.advanceTimersByTimeAsync(15_000)
    expect(useRideGuideStore.getState().videoAnalyzeWaitLevel).toBe("slow")

    await vi.advanceTimersByTimeAsync(30_000)
    expect(useRideGuideStore.getState().videoAnalyzeWaitLevel).toBe("very_slow")

    await vi.advanceTimersByTimeAsync(5_000)
    await task

    expect(useRideGuideStore.getState().status).toBe("success")
    expect(useRideGuideStore.getState().videoAnalyzeWaitLevel).toBe("normal")
  })

  it("falls back to partial_success when enrichment fails", async () => {
    enrichSpotWithKimiMock.mockRejectedValue(
      new Error("Kimi API 403: permission_denied_error - The API you are accessing is not open"),
    )

    const file = new File([new Uint8Array([1])], "demo.mp4", { type: "video/mp4" })

    await useRideGuideStore.getState().analyzeDemoVideo(file)

    expect(useRideGuideStore.getState().status).toBe("partial_success")
    expect(useRideGuideStore.getState().result?.coreSpot.title).toBe("夫子庙秦淮风光带")
    expect(useRideGuideStore.getState().partialMessage).toBe(
      "联网补充失败：Kimi API 403: permission_denied_error - The API you are accessing is not open。当前展示的是视频提取结果",
    )
  })

  it("tries direct enrichment first and then inferred spot enrichment when extracted content is insufficient", async () => {
    analyzeVideoViaBackendMock.mockResolvedValue({
      coreSpotName: "",
      city: "温州",
      summary: "",
      highlights: [],
      checkpoints: [],
      foods: [],
      souvenirs: [],
      nearbyCandidates: ["索道"],
      transportHints: [],
      stayHints: [],
      tips: [],
      confidence: "low",
    })

    enrichSpotWithKimiMock
      .mockResolvedValueOnce({
        ...spotGuideFixture,
        coreSpot: {
          ...spotGuideFixture.coreSpot,
          title: "",
          summary: "",
        },
        highlights: [],
        checkpoints: [],
        foodAndSouvenirs: [],
        nearbyRecommendations: [],
      })
      .mockResolvedValueOnce({
        ...spotGuideFixture,
        coreSpot: {
          ...spotGuideFixture.coreSpot,
          title: "雁荡山",
          city: "温州",
          summary: "山景壮阔",
        },
        displayMode: "inferred",
        displayHints: ["该景区名称根据视频线索推断，建议进一步核验。"],
      })

    inferSpotCandidateWithKimiMock.mockResolvedValue({
      inferredSpotName: "雁荡山",
      rationale: "出现山峰与索道线索",
    })

    const file = new File([new Uint8Array([1])], "demo.mp4", { type: "video/mp4" })
    await useRideGuideStore.getState().analyzeDemoVideo(file)

    expect(enrichSpotWithKimiMock).toHaveBeenCalledTimes(2)
    expect(inferSpotCandidateWithKimiMock).toHaveBeenCalledTimes(1)
    expect(inferSpotCandidateWithKimiMock).toHaveBeenCalledWith({
      coreSpotName: "",
      city: "温州",
      summary: "",
      highlights: [],
      checkpoints: [],
      foods: [],
      souvenirs: [],
      nearbyCandidates: ["索道"],
      transportHints: [],
      stayHints: [],
      tips: [],
      confidence: "low",
    })
    expect(enrichSpotWithKimiMock).toHaveBeenNthCalledWith(2, {
      coreSpotName: "雁荡山",
      city: "温州",
      summary: "",
      highlights: [],
      checkpoints: [],
      foods: [],
      souvenirs: [],
      nearbyCandidates: ["索道"],
      transportHints: [],
      stayHints: [],
      tips: [],
      confidence: "low",
    }, {
      displayMode: "inferred",
      displayHints: ["该景区名称根据视频线索推断，建议进一步核验。"],
    })
    expect(useRideGuideStore.getState().result?.coreSpot.title).toBe("雁荡山")
    expect(useRideGuideStore.getState().result?.displayMode).toBe("inferred")
  })

  it("retries kimi enrichment for sparse food and nearby sections before accepting success", async () => {
    enrichSpotWithKimiMock
      .mockResolvedValueOnce({
        ...spotGuideFixture,
        highlights: [],
        foodAndSouvenirs: [],
        nearbyRecommendations: [],
        extraInfo: {
          ...spotGuideFixture.extraInfo,
          transportGuide: [],
          ticketPolicy: [],
          stayGuide: [],
        },
      })
      .mockResolvedValueOnce({
        ...spotGuideFixture,
        foodAndSouvenirs: [
          {
            name: "鸭血粉丝汤",
            category: "food",
            reason: "本地高频推荐，适合顺路品尝。",
          },
        ],
        nearbyRecommendations: [
          {
            name: "老门东",
            reason: "适合和主景点一起安排。",
          },
        ],
        extraInfo: {
          ...spotGuideFixture.extraInfo,
          stayGuide: ["可优先住在秦淮河沿线，夜游结束后步行返回更方便。"],
        },
      })

    const file = new File([new Uint8Array([1])], "demo.mp4", { type: "video/mp4" })
    await useRideGuideStore.getState().analyzeDemoVideo(file)

    expect(enrichSpotWithKimiMock).toHaveBeenCalledTimes(2)
    expect(enrichSpotWithKimiMock).toHaveBeenNthCalledWith(2, stage1Fixture, {
      focusSections: [
        "highlights",
        "foodAndSouvenirs",
        "nearbyRecommendations",
        "transportGuide",
        "ticketPolicy",
        "stayGuide",
      ],
      referenceGuide: expect.objectContaining({
        coreSpot: expect.objectContaining({
          title: "夫子庙秦淮风光带",
        }),
      }),
    })
    expect(useRideGuideStore.getState().status).toBe("success")
    expect(useRideGuideStore.getState().result?.foodAndSouvenirs.length).toBeGreaterThan(0)
    expect(useRideGuideStore.getState().result?.nearbyRecommendations.length).toBeGreaterThan(0)
  })

  it("retries focused enrichment again when the first retry still leaves sparse sections", async () => {
    enrichSpotWithKimiMock
      .mockResolvedValueOnce({
        ...spotGuideFixture,
        highlights: [],
        foodAndSouvenirs: [],
        nearbyRecommendations: [],
        extraInfo: {
          ...spotGuideFixture.extraInfo,
          transportGuide: [],
          ticketPolicy: [],
          stayGuide: [],
        },
      })
      .mockResolvedValueOnce({
        ...spotGuideFixture,
        highlights: [
          {
            title: "灵峰夜景",
            description: "夜景层次丰富。",
          },
        ],
        foodAndSouvenirs: [],
        nearbyRecommendations: [],
        extraInfo: {
          ...spotGuideFixture.extraInfo,
          transportGuide: [],
          ticketPolicy: [],
          stayGuide: [],
        },
      })
      .mockResolvedValueOnce({
        ...spotGuideFixture,
        highlights: [
          {
            title: "灵峰夜景",
            description: "夜景层次丰富。",
          },
        ],
        foodAndSouvenirs: [
          {
            name: "雁荡麦饼",
            category: "food",
            reason: "游客集散区一带更容易顺路吃到。",
          },
        ],
        nearbyRecommendations: [
          {
            name: "方洞景区",
            reason: "适合与主景区串联安排。",
          },
        ],
        extraInfo: {
          ...spotGuideFixture.extraInfo,
          transportGuide: ["高铁至雁荡山站后可转景区接驳。"],
          ticketPolicy: ["联票与分景区购票规则以景区当日公示为准。"],
          stayGuide: ["响岭头民宿群更方便第二天继续进山。"],
        },
      })

    const file = new File([new Uint8Array([1])], "demo.mp4", { type: "video/mp4" })
    await useRideGuideStore.getState().analyzeDemoVideo(file)

    expect(enrichSpotWithKimiMock).toHaveBeenCalledTimes(3)
    expect(enrichSpotWithKimiMock).toHaveBeenNthCalledWith(2, stage1Fixture, {
      focusSections: [
        "highlights",
        "foodAndSouvenirs",
        "nearbyRecommendations",
        "transportGuide",
        "ticketPolicy",
        "stayGuide",
      ],
      referenceGuide: expect.objectContaining({
        coreSpot: expect.objectContaining({
          title: "夫子庙秦淮风光带",
        }),
      }),
    })
    expect(enrichSpotWithKimiMock).toHaveBeenNthCalledWith(3, stage1Fixture, {
      focusSections: [
        "foodAndSouvenirs",
        "nearbyRecommendations",
        "transportGuide",
        "ticketPolicy",
        "stayGuide",
      ],
      referenceGuide: expect.objectContaining({
        highlights: [
          {
            title: "灵峰夜景",
            description: "夜景层次丰富。",
          },
        ],
      }),
    })
    expect(useRideGuideStore.getState().status).toBe("success")
    expect(useRideGuideStore.getState().result?.foodAndSouvenirs[0]?.name).toBe("雁荡麦饼")
    expect(useRideGuideStore.getState().result?.extraInfo.transportGuide).toEqual(["高铁至雁荡山站后可转景区接驳。"])
  })

  it("surfaces the real kimi error message when video analysis fails", async () => {
    analyzeVideoViaBackendMock.mockRejectedValue(
      new Error(
        "Kimi API 400: invalid_request_error - File size is too large, max file size is 100MB, please confirm and re-upload",
      ),
    )

    const file = new File([new Uint8Array([1])], "demo.mp4", { type: "video/mp4" })

    await useRideGuideStore.getState().analyzeDemoVideo(file)

    expect(useRideGuideStore.getState().status).toBe("error")
    expect(useRideGuideStore.getState().error).toEqual({
      code: "PARSE_FAILED",
      message:
        "Kimi API 400: invalid_request_error - File size is too large, max file size is 100MB, please confirm and re-upload",
    })
  })

  it("rejects invalid video files before calling backend analysis", async () => {
    const file = new File([], "demo.mp4", { type: "video/mp4" })
    await useRideGuideStore.getState().analyzeDemoVideo(file)

    expect(useRideGuideStore.getState().status).toBe("error")
    expect(useRideGuideStore.getState().error?.message).toBe("EMPTY_FILE")
    expect(analyzeVideoViaBackendMock).not.toHaveBeenCalled()
  })

  it("uses text guide analyzer for text input instead of mock parser", async () => {
    analyzeTextGuideMock.mockResolvedValue({
      guide: spotGuideFixture,
      partialMessage: null,
    })

    useRideGuideStore.getState().setInputText("雁荡山 门票 住宿")
    await useRideGuideStore.getState().parseNow()

    expect(analyzeTextGuideMock).toHaveBeenCalledWith("雁荡山 门票 住宿")
    expect(useRideGuideStore.getState().status).toBe("success")
  })
})
