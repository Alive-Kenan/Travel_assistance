import { describe, expect, it } from "vitest"

import { extractTravelNoteStage1 } from "@/utils/textStage1Extractor"

describe("extractTravelNoteStage1", () => {
  it("extracts scenic clues from a travel note paragraph", () => {
    const result = extractTravelNoteStage1(
      "雁荡山适合安排一日游，上午先去灵岩景区，中午在响岭头吃麦饼，下午去大龙湫，建议提前预约门票。",
    )

    expect(result).toMatchObject({
      coreSpotName: "雁荡山",
      checkpoints: ["灵岩景区", "大龙湫"],
      foods: ["麦饼"],
      tips: expect.arrayContaining(["建议提前预约门票。"]),
      confidence: "medium",
    })
  })
})
