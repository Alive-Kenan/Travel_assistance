import { afterEach, describe, expect, test, vi } from "vitest"

import {
  analyzeVideoWithKimi,
  buildKimiRequestErrorMessage,
  enrichSpotWithKimi,
  inferSpotCandidateWithKimi,
  resolveKimiApiKey,
} from "@/services/kimiClient"
import { analyzeUploadedVideoWithKimi } from "@/server/kimiVideoAnalyzeClient"
import handler from "../../api/video-analyze"

describe("resolveKimiApiKey", () => {
  test("prefers runtime window key over vite env key", () => {
    const apiKey = resolveKimiApiKey(
      { __KIMI_API_KEY__: "window-key" },
      { VITE_KIMI_API_KEY: "env-key" },
    )

    expect(apiKey).toBe("window-key")
  })

  test("falls back to vite env key when window key is missing", () => {
    const apiKey = resolveKimiApiKey(undefined, {
      VITE_KIMI_API_KEY: "env-key",
    })

    expect(apiKey).toBe("env-key")
  })

  test("throws when no key is available", () => {
    expect(() => resolveKimiApiKey(undefined, {})).toThrowError(
      "MISSING_KIMI_API_KEY",
    )
  })
})

describe("buildKimiRequestErrorMessage", () => {
  test("includes status, type and message from kimi error payload", () => {
    const message = buildKimiRequestErrorMessage(400, {
      error: {
        type: "invalid_request_error",
        message: "File size is too large, max file size is 100MB, please confirm and re-upload",
      },
    })

    expect(message).toBe(
      "Kimi API 400: invalid_request_error - File size is too large, max file size is 100MB, please confirm and re-upload",
    )
  })

  test("falls back gracefully when payload shape is unknown", () => {
    expect(buildKimiRequestErrorMessage(500, {})).toBe("Kimi API 500: Request failed")
  })
})

describe("analyzeVideoWithKimi errors", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test("sends requests to the moonshot cn endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                coreSpotName: "雁荡山",
                city: "温州",
                summary: "山景壮阔",
                highlights: ["灵峰夜景"],
                checkpoints: ["灵岩"],
                foods: ["麦饼"],
                souvenirs: ["景区文创"],
                nearbyCandidates: ["方洞"],
                transportHints: ["建议自驾"],
                stayHints: ["可住景区附近"],
                tips: ["雨天注意防滑"],
                confidence: "high",
              }),
            },
          },
        ],
      }),
    })

    vi.stubGlobal("window", { __KIMI_API_KEY__: "window-key" })
    vi.stubGlobal("fetch", fetchMock)

    await analyzeVideoWithKimi([
      "data:image/jpeg;base64,frame-a",
      "data:image/jpeg;base64,frame-b",
    ])

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.moonshot.cn/v1/chat/completions",
      expect.any(Object),
    )
  })

  test("throws the real kimi error message for non-2xx responses", async () => {
    vi.stubGlobal("window", { __KIMI_API_KEY__: "window-key" })
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: vi.fn().mockResolvedValue({
        error: {
          type: "invalid_request_error",
          message: "File size is too large, max file size is 100MB, please confirm and re-upload",
        },
      }),
    }))

    await expect(
      analyzeVideoWithKimi([
        "data:image/jpeg;base64,frame-a",
        "data:image/jpeg;base64,frame-b",
      ]),
    ).rejects.toThrowError(
      "Kimi API 400: invalid_request_error - File size is too large, max file size is 100MB, please confirm and re-upload",
    )
  })

  test("analyzes video by file id instead of inline base64", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ id: "file_123" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  coreSpotName: "雁荡山",
                  city: "温州",
                  summary: "山景壮阔",
                  highlights: ["灵峰夜景"],
                  checkpoints: ["灵岩"],
                  foods: ["麦饼"],
                  souvenirs: ["文创"],
                  nearbyCandidates: ["方洞"],
                  transportHints: ["建议自驾"],
                  stayHints: ["可住景区附近"],
                  tips: ["雨天防滑"],
                  confidence: "high",
                }),
              },
            },
          ],
        }),
      })

    vi.stubGlobal("fetch", fetchMock)

    const file = new File([new Uint8Array([1, 2, 3])], "demo.mp4", { type: "video/mp4" })
    const result = await analyzeUploadedVideoWithKimi(file, "kimi-key")

    expect(result.coreSpotName).toBe("雁荡山")
    const uploadBody = fetchMock.mock.calls[0]?.[1]?.body as FormData
    const analyzeBody = fetchMock.mock.calls[1]?.[1]?.body as string

    expect(uploadBody.get("purpose")).toBe("video")
    expect(analyzeBody).toContain("ms://file_123")
    expect(fetchMock.mock.calls[1]?.[1]?.body).not.toContain("data:video/")
  })

  test("normalizes full-video analysis output when kimi returns chinese field names", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ id: "file_123" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  景区名称: "雁荡山",
                  地理位置: "浙江省温州市乐清市",
                  核心亮点: ["灵峰夜景", "大龙湫瀑布"],
                  打卡点: [
                    { 名称: "灵岩景区", 备注: "适合安排主要游览动线" },
                    { 名称: "方洞景区" },
                  ],
                  周边线索: {
                    大交通: "高铁可达雁荡山站",
                    当地交通: {
                      景区巴士: "建议购买多日车票",
                    },
                    住宿: {
                      推荐区域: ["响岭头"],
                      参考价格: "约80元/晚",
                    },
                    餐饮: {
                      推荐美食: ["麦饼", "瘦肉丸"],
                    },
                    优惠政策: "部分人群可享门票优惠",
                  },
                }),
              },
            },
          ],
        }),
      })

    vi.stubGlobal("fetch", fetchMock)

    const file = new File([new Uint8Array([1, 2, 3])], "demo.mp4", { type: "video/mp4" })
    const result = await analyzeUploadedVideoWithKimi(file, "kimi-key")

    expect(result).toMatchObject({
      coreSpotName: "雁荡山",
      city: "温州市",
      highlights: ["灵峰夜景", "大龙湫瀑布"],
      checkpoints: ["灵岩景区", "方洞景区"],
      foods: ["麦饼", "瘦肉丸"],
      transportHints: ["高铁可达雁荡山站", "景区巴士：建议购买多日车票"],
      stayHints: ["推荐区域：响岭头", "参考价格：约80元/晚"],
      tips: ["适合安排主要游览动线", "部分人群可享门票优惠"],
    })
    expect(result.summary).toContain("雁荡山")
    expect(result.confidence).toBe("high")
  })

  test("returns stage1 extraction from the video analyze api handler", async () => {
    const request = new Request("http://localhost/api/video-analyze", {
      method: "POST",
      body: (() => {
        const formData = new FormData()
        formData.append("video", new File([new Uint8Array([1])], "demo.mp4", { type: "video/mp4" }))
        return formData
      })(),
    })

    const response = await handler(request)
    expect(response.status).not.toBe(404)
  })
})

describe("enrichSpotWithKimi", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test("completes the builtin web search tool call loop", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [
            {
              finish_reason: "tool_calls",
              message: {
                role: "assistant",
                content: "",
                tool_calls: [
                  {
                    id: "call_1",
                    function: {
                      name: "$web_search",
                      arguments: "{\"query\":\"雁荡山 景点亮点\"}",
                    },
                  },
                ],
              },
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [
            {
              finish_reason: "stop",
              message: {
                content: JSON.stringify({
                  source: {
                    rawInput: "demo",
                    kind: "text",
                  },
                  coreSpot: {
                    title: "雁荡山",
                    city: "温州",
                    summary: "山景壮阔",
                    audienceTags: ["山岳"],
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
                }),
              },
            },
          ],
        }),
      })

    vi.stubGlobal("window", { __KIMI_API_KEY__: "window-key" })
    vi.stubGlobal("fetch", fetchMock)

    await enrichSpotWithKimi({
      coreSpotName: "雁荡山",
      city: "温州",
      summary: "山景壮阔",
      highlights: ["灵峰"],
      checkpoints: ["灵岩"],
      foods: ["麦饼"],
      souvenirs: ["文创"],
      nearbyCandidates: ["方洞"],
      transportHints: ["建议自驾"],
      stayHints: ["可住景区附近"],
      tips: ["雨天防滑"],
      confidence: "high",
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)

    const secondRequest = fetchMock.mock.calls[1]?.[1] as { body: string }
    expect(secondRequest.body).toContain("\"role\":\"tool\"")
    expect(secondRequest.body).toContain("\"name\":\"$web_search\"")
    expect(secondRequest.body).toContain("\\\"query\\\":\\\"雁荡山 景点亮点\\\"")
  })

  test("normalizes sparse spot guide payloads to avoid blank-page rendering", async () => {
    vi.stubGlobal("window", { __KIMI_API_KEY__: "window-key" })
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        choices: [
          {
            finish_reason: "stop",
            message: {
              content: JSON.stringify({
                coreSpotName: "",
                city: "温州",
                summary: "",
                highlights: ["灵峰夜景"],
                checkpoints: ["灵岩"],
                foods: ["麦饼"],
                souvenirs: [],
                nearbyCandidates: ["方洞"],
                transportHints: ["建议自驾"],
                stayHints: [],
                tips: [],
              }),
            },
          },
        ],
      }),
    }))

    const result = await enrichSpotWithKimi({
      coreSpotName: "雁荡山",
      city: "温州",
      summary: "山景壮阔",
      highlights: ["灵峰"],
      checkpoints: ["灵岩"],
      foods: ["麦饼"],
      souvenirs: ["文创"],
      nearbyCandidates: ["方洞"],
      transportHints: ["建议自驾"],
      stayHints: ["可住景区附近"],
      tips: ["雨天防滑"],
      confidence: "high",
    })

    expect(result.coreSpot.title).toBe("待确认景点")
    expect(result.coreSpot.summary).toBe("当前仅提取到部分视频信息，可结合联网补充进一步确认。")
    expect(result.highlights).toEqual([
      {
        title: "灵峰夜景",
        description: "灵峰夜景是当前结果中提取到的景点亮点。",
      },
    ])
    expect(result.checkpoints).toEqual([
      {
        name: "灵岩",
        description: "灵岩值得作为游览动线中的停留点。",
      },
    ])
    expect(result.foodAndSouvenirs[0]).toEqual({
      name: "麦饼",
      category: "food",
      reason: "来自当前景点结果的补充信息。",
    })
    expect(result.extraInfo.transportTags).toEqual(["建议自驾"])
  })

  test("infers a candidate spot name from weak stage1 clues", async () => {
    vi.stubGlobal("window", { __KIMI_API_KEY__: "window-key" })
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                inferredSpotName: "雁荡山",
                rationale: "画面出现山峰、夜景和观景台线索",
              }),
            },
          },
        ],
      }),
    }))

    const result = await inferSpotCandidateWithKimi({
      coreSpotName: "",
      city: "温州",
      summary: "",
      highlights: ["山峰", "夜景"],
      checkpoints: ["观景台"],
      foods: [],
      souvenirs: [],
      nearbyCandidates: ["索道"],
      transportHints: [],
      stayHints: [],
      tips: [],
      confidence: "low",
    })

    expect(result).toEqual({
      inferredSpotName: "雁荡山",
      rationale: "画面出现山峰、夜景和观景台线索",
    })
  })

  test("normalizes inferred guide metadata for display", async () => {
    vi.stubGlobal("window", { __KIMI_API_KEY__: "window-key" })
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                coreSpot: {
                  title: "雁荡山",
                  city: "温州",
                  summary: "山景壮阔",
                  audienceTags: ["山岳"],
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
              }),
            },
          },
        ],
      }),
    }))

    const result = await enrichSpotWithKimi(
      {
        coreSpotName: "",
        city: "温州",
        summary: "",
        highlights: ["山峰"],
        checkpoints: [],
        foods: [],
        souvenirs: [],
        nearbyCandidates: [],
        transportHints: [],
        stayHints: [],
        tips: [],
        confidence: "low",
      },
      {
        displayMode: "inferred",
        displayHints: ["该景区名称根据视频线索推断，建议进一步核验。"],
      },
    )

    expect(result.displayMode).toBe("inferred")
    expect(result.displayHints).toContain("该景区名称根据视频线索推断，建议进一步核验。")
  })
})
