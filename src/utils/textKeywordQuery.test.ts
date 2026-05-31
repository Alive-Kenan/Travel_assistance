import { describe, expect, it } from "vitest"

import { extractKeywordQueryStage1 } from "@/utils/textKeywordQuery"

describe("extractKeywordQueryStage1", () => {
  it("builds a lightweight stage1 payload from short keywords", () => {
    expect(extractKeywordQueryStage1("雁荡山 门票 住宿 美食")).toMatchObject({
      coreSpotName: "雁荡山",
      transportHints: [],
      stayHints: ["用户关注住宿信息"],
      tips: ["用户关注门票信息", "用户关注美食信息"],
      confidence: "medium",
    })
  })
})
