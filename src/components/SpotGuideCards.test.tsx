import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import SpotGuideCards from "@/components/SpotGuideCards"

describe("SpotGuideCards", () => {
  it("shows partial-result guidance and empty-state copy for sparse extraction results", () => {
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
        }}
      />,
    )

    expect(markup).toContain("当前展示的是视频提取版结果，部分栏目可能为空")
    expect(markup).toContain("暂未从视频中提取到景点亮点")
    expect(markup).toContain("暂未从视频中提取到必打卡点")
    expect(markup).toContain("暂未从视频中提取到小吃或文创信息")
    expect(markup).toContain("暂未从视频中提取到周边推荐")
    expect(markup).toContain("暂未从视频中提取到补充信息")
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
          displayMode: "inferred",
          displayHints: ["该景区名称根据视频线索推断，建议进一步核验。"],
        }}
      />,
    )

    expect(markup).toContain("该景区名称根据视频线索推断，建议进一步核验。")
  })
})
