import { describe, expect, it } from "vitest"
import { mapStage1ToSpotGuide } from "@/utils/spotGuideMapper"

describe("mapStage1ToSpotGuide", () => {
  it("maps stage1 extraction into a renderable SpotGuide", () => {
    const result = mapStage1ToSpotGuide({
      coreSpotName: "夫子庙秦淮风光带",
      city: "南京",
      summary: "夜景氛围浓",
      highlights: ["夜景", "游船", "灯会", "秦淮河"],
      checkpoints: ["文德桥"],
      foods: ["鸭血粉丝汤"],
      souvenirs: ["灯彩冰箱贴"],
      nearbyCandidates: ["老门东"],
      transportHints: ["公共交通方便"],
      stayHints: ["建议住在秦淮河附近"],
      tips: ["周末注意人流"],
      confidence: "high",
    })

    expect(result.source).toEqual({
      rawInput: JSON.stringify({
        coreSpotName: "夫子庙秦淮风光带",
        city: "南京",
        summary: "夜景氛围浓",
        highlights: ["夜景", "游船", "灯会", "秦淮河"],
        checkpoints: ["文德桥"],
        foods: ["鸭血粉丝汤"],
        souvenirs: ["灯彩冰箱贴"],
        nearbyCandidates: ["老门东"],
        transportHints: ["公共交通方便"],
        stayHints: ["建议住在秦淮河附近"],
        tips: ["周末注意人流"],
        confidence: "high",
      }),
      kind: "text",
    })
    expect(result.coreSpot).toEqual({
      title: "夫子庙秦淮风光带",
      city: "南京",
      summary: "夜景氛围浓",
      tripTags: [],
      audienceTags: ["夜景", "游船", "灯会"],
    })
    expect(result.dayRoute).toEqual({
      title: "一日游览动线",
      stops: ["文德桥"],
      summary: "建议结合视频里的打卡顺序灵活安排行程。",
    })
    expect(result.highlights).toEqual([
      {
        title: "夜景",
        description: "夜景是视频中反复出现的重点内容。",
      },
      {
        title: "游船",
        description: "游船是视频中反复出现的重点内容。",
      },
      {
        title: "灯会",
        description: "灯会是视频中反复出现的重点内容。",
      },
      {
        title: "秦淮河",
        description: "秦淮河是视频中反复出现的重点内容。",
      },
    ])
    expect(result.checkpoints).toEqual([
      {
        name: "文德桥",
        description: "可作为游览过程中重点停留的打卡点。",
        highlight: "适合结合周边景观点一起安排停留。",
      },
    ])
    expect(result.foodAndSouvenirs).toEqual([
      {
        name: "鸭血粉丝汤",
        category: "food",
        reason: "可优先安排在景点周边顺路品尝。",
      },
      {
        name: "灯彩冰箱贴",
        category: "souvenir",
        reason: "适合作为带有当地特色的轻量伴手礼。",
      },
    ])
    expect(result.nearbyRecommendations).toEqual([
      {
        name: "老门东",
        reason: "视频中出现的周边候选地点。",
      },
    ])
    expect(result.extraInfo).toEqual({
      transportTags: ["公共交通方便"],
      stayTags: ["建议住在秦淮河附近"],
      transportGuide: ["公共交通方便"],
      ticketPolicy: [],
      stayGuide: ["建议住在秦淮河附近"],
      travelTips: ["周末注意人流"],
      tips: ["周末注意人流"],
    })
    expect(result.travelChecklist).toEqual({
      spots: ["文德桥"],
      foods: ["鸭血粉丝汤"],
      essentials: ["舒适好走的鞋", "手机与充电宝"],
      copyText: [
        "出行清单",
        "打卡地点：文德桥",
        "必吃美食：鸭血粉丝汤",
        "必备物品：舒适好走的鞋、手机与充电宝",
      ].join("\n"),
    })
  })

  it("falls back to empty arrays when stage1 omits list fields", () => {
    const result = mapStage1ToSpotGuide({
      coreSpotName: "雁荡山",
      city: "温州",
      summary: "山景壮阔",
      confidence: "medium",
    } as unknown as import("@/types/spotGuide").Stage1SpotExtraction)

    expect(result.coreSpot).toEqual({
      title: "雁荡山",
      city: "温州",
      summary: "山景壮阔",
      tripTags: [],
      audienceTags: [],
    })
    expect(result.highlights).toEqual([])
    expect(result.checkpoints).toEqual([])
    expect(result.foodAndSouvenirs).toEqual([])
    expect(result.nearbyRecommendations).toEqual([])
    expect(result.dayRoute).toBeUndefined()
    expect(result.extraInfo).toEqual({
      transportTags: [],
      stayTags: [],
      transportGuide: [],
      ticketPolicy: [],
      stayGuide: [],
      travelTips: [],
      tips: [],
    })
    expect(result.travelChecklist?.spots).toEqual([])
    expect(result.travelChecklist?.foods).toEqual([])
  })

  it("falls back to safe core spot text when stage1 omits title and summary", () => {
    const result = mapStage1ToSpotGuide({
      coreSpotName: "",
      city: "温州",
      summary: "",
      confidence: "low",
    } as unknown as import("@/types/spotGuide").Stage1SpotExtraction)

    expect(result.coreSpot).toEqual({
      title: "待确认景点",
      city: "温州",
      summary: "当前仅提取到部分视频信息，可结合联网补充进一步确认。",
      tripTags: [],
      audienceTags: [],
    })
  })
})
