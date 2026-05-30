import { beforeEach, describe, expect, it, vi } from "vitest"

const { enrichSpotWithKimiMock } = vi.hoisted(() => ({
  enrichSpotWithKimiMock: vi.fn(),
}))

vi.mock("@/services/kimiClient", () => ({
  enrichSpotWithKimi: enrichSpotWithKimiMock,
}))

import { analyzeTextGuide } from "@/services/textGuideAnalyzer"

describe("analyzeTextGuide", () => {
  beforeEach(() => {
    enrichSpotWithKimiMock.mockReset()
    enrichSpotWithKimiMock.mockResolvedValue({
      source: {
        rawInput: "demo",
        kind: "text",
      },
      coreSpot: {
        title: "雁荡山",
        city: "温州",
        summary: "山景壮阔",
        tripTags: ["一日游"],
        audienceTags: ["山岳"],
      },
      highlights: [],
      checkpoints: [],
      foodAndSouvenirs: [],
      nearbyRecommendations: [],
      extraInfo: {
        transportTags: [],
        stayTags: [],
        transportGuide: [],
        ticketPolicy: [],
        stayGuide: [],
        travelTips: [],
        tips: [],
      },
    })
  })

  it("rejects douyin input early", async () => {
    await expect(analyzeTextGuide("https://v.douyin.com/abc123/")).rejects.toThrow(
      "当前版本仅支持纯文本分析",
    )
  })

  it("supports short keyword input", async () => {
    const result = await analyzeTextGuide("雁荡山 门票 住宿")

    expect(result.guide.coreSpot.title).toBeTruthy()
    expect(enrichSpotWithKimiMock).toHaveBeenCalled()
  })

  it("supports long travel note input", async () => {
    const result = await analyzeTextGuide("雁荡山适合安排一日游，上午灵岩景区，下午大龙湫。")

    expect(result.guide.coreSpot.title).toBeTruthy()
    expect(enrichSpotWithKimiMock).toHaveBeenCalled()
  })

  it("falls back to a mapped stage1 guide when kimi enrichment fails", async () => {
    enrichSpotWithKimiMock.mockRejectedValue(new Error("SEARCH_FAILED"))

    const result = await analyzeTextGuide("雁荡山适合安排一日游，上午灵岩景区，下午大龙湫。")

    expect(result.partialMessage).toBe("联网补充失败，当前展示基础结果")
    expect(result.guide.coreSpot.title).toContain("雁荡山")
  })

  it("waits longer for kimi enrichment before falling back", async () => {
    vi.useFakeTimers()
    enrichSpotWithKimiMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              source: { rawInput: "demo", kind: "text" },
              coreSpot: {
                title: "雁荡山",
                city: "温州",
                summary: "山景壮阔",
                tripTags: ["一日游"],
                audienceTags: ["山岳"],
              },
              highlights: [{ title: "灵峰夜景", description: "夜景层次丰富。" }],
              checkpoints: [],
              foodAndSouvenirs: [{ name: "麦饼", category: "food", reason: "本地常见推荐。" }],
              nearbyRecommendations: [{ name: "方洞", reason: "适合顺路串联。" }],
              extraInfo: {
                transportTags: [],
                stayTags: [],
                transportGuide: ["高铁后转景区接驳。"],
                ticketPolicy: ["门票需提前预约。"],
                stayGuide: ["响岭头民宿更方便。"],
                travelTips: [],
                tips: [],
              },
            })
          }, 12_000)
        }),
    )

    const task = analyzeTextGuide("雁荡山")
    await vi.advanceTimersByTimeAsync(12_000)
    const result = await task

    expect(result.partialMessage).toBeNull()
    expect(result.guide.coreSpot.title).toContain("雁荡山")

    vi.useRealTimers()
  })

  it("retries focused enrichment when the first text result is sparse", async () => {
    enrichSpotWithKimiMock
      .mockResolvedValueOnce({
        source: { rawInput: "demo", kind: "text" },
        coreSpot: {
          title: "雁荡山",
          city: "温州",
          summary: "山景壮阔",
          tripTags: ["一日游"],
          audienceTags: ["山岳"],
        },
        highlights: [],
        checkpoints: [],
        foodAndSouvenirs: [],
        nearbyRecommendations: [],
        extraInfo: {
          transportTags: [],
          stayTags: [],
          transportGuide: [],
          ticketPolicy: [],
          stayGuide: [],
          travelTips: [],
          tips: [],
        },
      })
      .mockResolvedValueOnce({
        source: { rawInput: "demo", kind: "text" },
        coreSpot: {
          title: "雁荡山",
          city: "温州",
          summary: "山景壮阔",
          tripTags: ["一日游"],
          audienceTags: ["山岳"],
        },
        highlights: [{ title: "灵峰夜景", description: "夜景层次丰富。" }],
        checkpoints: [],
        foodAndSouvenirs: [{ name: "麦饼", category: "food", reason: "本地常见推荐。" }],
        nearbyRecommendations: [{ name: "方洞", reason: "适合顺路串联。" }],
        extraInfo: {
          transportTags: [],
          stayTags: [],
          transportGuide: ["高铁后转景区接驳。"],
          ticketPolicy: ["门票需提前预约。"],
          stayGuide: ["响岭头民宿更方便。"],
          travelTips: [],
          tips: [],
        },
      })

    const result = await analyzeTextGuide("雁荡山")

    expect(enrichSpotWithKimiMock).toHaveBeenCalledTimes(2)
    expect(enrichSpotWithKimiMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        coreSpotName: "雁荡山",
      }),
      expect.objectContaining({
        focusSections: [
          "highlights",
          "foodAndSouvenirs",
          "nearbyRecommendations",
          "transportGuide",
          "ticketPolicy",
          "stayGuide",
        ],
      }),
    )
    expect(result.partialMessage).toBeNull()
    expect(result.guide.highlights[0]?.title).toBe("灵峰夜景")
  })

  it("keeps the first successful guide when focused retry times out", async () => {
    vi.useFakeTimers()
    enrichSpotWithKimiMock
      .mockResolvedValueOnce({
        source: { rawInput: "demo", kind: "text" },
        coreSpot: {
          title: "雁荡山",
          city: "温州",
          summary: "山景壮阔",
          tripTags: ["一日游"],
          audienceTags: ["山岳"],
        },
        highlights: [{ title: "灵峰夜景", description: "夜景层次丰富。" }],
        checkpoints: [],
        foodAndSouvenirs: [],
        nearbyRecommendations: [],
        extraInfo: {
          transportTags: [],
          stayTags: [],
          transportGuide: [],
          ticketPolicy: [],
          stayGuide: [],
          travelTips: [],
          tips: [],
        },
      })
      .mockImplementationOnce(
        () =>
          new Promise(() => {
            // keep pending so the focused retry hits the timeout budget
          }),
      )

    const task = analyzeTextGuide("雁荡山")
    await vi.advanceTimersByTimeAsync(21_000)
    const result = await task

    expect(enrichSpotWithKimiMock).toHaveBeenCalledTimes(2)
    expect(result.guide.coreSpot.title).toBe("雁荡山")
    expect(result.guide.highlights[0]?.title).toBe("灵峰夜景")
    expect(result.partialMessage).toBe("部分栏目联网补充超时，当前展示首轮结果")

    vi.useRealTimers()
  })
})
