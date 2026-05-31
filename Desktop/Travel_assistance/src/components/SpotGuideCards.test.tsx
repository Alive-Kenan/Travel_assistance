import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import SpotGuideCards from "@/components/SpotGuideCards"

describe("SpotGuideCards", () => {
  it("shows text-specific guidance and empty-state copy for sparse text results", () => {
    const markup = renderToStaticMarkup(
      <SpotGuideCards
        mode="partial"
        guide={{
          source: {
            rawInput: "demo",
            kind: "text",
          },
          coreSpot: {
            title: "待确认景点",
            city: "温州",
            summary: "当前仅提取到部分视频信息，可结合联网补充进一步确认。",
            tripTags: [],
            audienceTags: [],
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
        }}
      />,
    )

    expect(markup).toContain("当前展示的是文本解析版结果，部分栏目仍在联网补充中")
    expect(markup).toContain("暂未整理出景点亮点")
    expect(markup).toContain("暂未整理出必打卡点")
    expect(markup).toContain("暂未整理出小吃或文创信息")
    expect(markup).toContain("暂未整理出周边推荐")
    expect(markup).toContain("暂未整理出交通指南")
    expect(markup).toContain("暂未整理出票务政策")
    expect(markup).toContain("暂未整理出住宿参考")
    expect(markup).toContain("暂未整理出出行贴士")
    expect(markup).toContain("文本信息仍在补充中")
    expect(markup).toContain("当前仅提取到部分文本线索，可结合联网补充进一步确认。")
    expect(markup).not.toContain("当前仅提取到部分视频信息，可结合联网补充进一步确认。")
  })

  it("shows inference guidance when the scenic spot name is inferred", () => {
    const markup = renderToStaticMarkup(
      <SpotGuideCards
        mode="inferred"
        guide={{
          source: { rawInput: "demo", kind: "text" },
          coreSpot: {
            title: "雁荡山",
            city: "温州",
            summary: "山景壮阔",
            tripTags: [],
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
          displayMode: "inferred",
          displayHints: ["该景区名称根据视频线索推断，建议进一步核验。"],
        }}
      />,
    )

    expect(markup).toContain("该景区名称根据视频线索推断，建议进一步核验。")
  })

  it("renders trip tags, budget, best season, route, grouped extra info and checklist entry points", () => {
    const markup = renderToStaticMarkup(
      <SpotGuideCards
        guide={{
          source: { rawInput: "demo", kind: "text" },
          coreSpot: {
            title: "雁荡山",
            city: "温州",
            summary: "山景壮阔，适合一日游。",
            bestSeason: "雨后、夏秋季观景更优",
            tripTags: ["一日游", "公共交通", "徒步"],
            budget: {
              label: "参考人均",
              range: "240~300 元",
              description: "含门票、交通与基础餐饮",
            },
            audienceTags: ["山岳"],
          },
          dayRoute: {
            title: "一日游览动线",
            stops: ["游客中心", "大龙湫", "灵岩", "方洞", "灵峰"],
            summary: "适合首次到访时按顺序游玩。",
          },
          highlights: [],
          checkpoints: [
            {
              name: "大龙湫",
              description: "瀑布景观震撼，适合优先安排。",
              highlight: "190 米高空瀑布，雨后水雾景观绝佳",
              duration: "约 1.5h",
            },
          ],
          foodAndSouvenirs: [
            {
              name: "温州瘦肉丸",
              category: "food",
              reason: "当地街边老店现煮，配醋和胡椒粉口感更佳。",
            },
          ],
          nearbyRecommendations: [],
          extraInfo: {
            transportTags: [],
            stayTags: [],
            transportGuide: ["高铁至雁荡山站后可换乘景区接驳车。"],
            ticketPolicy: ["灵岩与方洞可优先关注联票信息。"],
            stayGuide: ["建议住在响岭头，第二天接景区更顺。"],
            travelTips: ["雨后地面湿滑，建议穿防滑鞋。"],
            tips: [],
          },
          travelChecklist: {
            spots: ["大龙湫", "灵岩"],
            foods: ["温州瘦肉丸"],
            essentials: ["徒步鞋", "雨伞"],
            copyText: "出行清单\n打卡地点：大龙湫、灵岩",
          },
        }}
      />,
    )

    expect(markup).toContain("生成出行清单")
    expect(markup).toContain("雨后、夏秋季观景更优")
    expect(markup).toContain("240~300 元")
    expect(markup).toContain("一日游")
    expect(markup).toContain("公共交通")
    expect(markup).toContain("一日游览动线")
    expect(markup).toContain("游客中心")
    expect(markup).toContain("190 米高空瀑布，雨后水雾景观绝佳")
    expect(markup).toContain("约 1.5h")
    expect(markup).toContain("交通指南")
    expect(markup).toContain("票务政策")
    expect(markup).toContain("住宿参考")
    expect(markup).toContain("出行贴士")
  })

  it("keeps the main card header in a wide two-column layout when best-season copy is long", () => {
    const markup = renderToStaticMarkup(
      <SpotGuideCards
        guide={{
          source: { rawInput: "demo", kind: "text" },
          coreSpot: {
            title: "雁荡山",
            city: "温州",
            summary: "山景壮阔，适合一日游。",
            bestSeason: "5-6月梅雨季后及9-10月秋季为最佳，雨后初晴云雾最盛、瀑布水量充沛；避开7-8月台风季与春节黄金周。",
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
        }}
      />,
    )

    expect(markup).toContain("lg:grid-cols-[minmax(0,1fr)_320px]")
    expect(markup).toContain("break-words")
    expect(markup).toContain("max-w-full")
  })

  it("hides generic fallback copy inside food and nearby cards while keeping real details", () => {
    const markup = renderToStaticMarkup(
      <SpotGuideCards
        guide={{
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
          foodAndSouvenirs: [
            {
              name: "温州瘦肉丸",
              category: "food",
              reason: "可优先安排在景点周边顺路体验。",
            },
            {
              name: "雁荡毛峰茶",
              category: "souvenir",
              reason: "茶汤清透，适合作为轻量伴手礼。",
            },
          ],
          nearbyRecommendations: [
            {
              name: "楠溪江风景名胜区",
              reason: "当前结果未提供更详细的周边说明。",
            },
            {
              name: "中雁荡山",
              reason: "适合和主景区串联安排。",
            },
          ],
          extraInfo: {
            transportTags: [],
            stayTags: [],
            transportGuide: [],
            ticketPolicy: [],
            stayGuide: [],
            travelTips: [],
            tips: [],
          },
        }}
      />,
    )

    expect(markup).toContain("温州瘦肉丸")
    expect(markup).toContain("雁荡毛峰茶")
    expect(markup).toContain("茶汤清透，适合作为轻量伴手礼。")
    expect(markup).toContain("楠溪江风景名胜区")
    expect(markup).toContain("中雁荡山")
    expect(markup).toContain("适合和主景区串联安排。")
    expect(markup).not.toContain("可优先安排在景点周边顺路体验。")
    expect(markup).not.toContain("当前结果未提供更详细的周边说明。")
  })
})
