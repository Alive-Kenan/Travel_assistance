import { describe, expect, it } from "vitest"

import { classifyTextInput } from "@/utils/textInputClassifier"

describe("classifyTextInput", () => {
  it("classifies douyin url as url_or_token", () => {
    expect(classifyTextInput("https://v.douyin.com/abc123/")).toMatchObject({
      kind: "url_or_token",
    })
  })

  it("classifies short scenic query as keyword_query", () => {
    expect(classifyTextInput("雁荡山 门票 住宿 美食")).toMatchObject({
      kind: "keyword_query",
    })
  })

  it("classifies long travel note as travel_note_text", () => {
    expect(
      classifyTextInput(
        "雁荡山适合安排一日游，上午先去灵岩景区，中午在响岭头吃麦饼，下午再去大龙湫。",
      ),
    ).toMatchObject({
      kind: "travel_note_text",
    })
  })
})
