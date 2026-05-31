import { describe, expect, it } from "vitest"
import { EXAMPLE_INPUT, mockParserAdapter } from "@/utils/mockParserAdapter"

describe("mockParserAdapter", () => {
  it("returns a spot-oriented guide", async () => {
    const res = await mockParserAdapter.parse({ text: EXAMPLE_INPUT })
    expect(res.ok).toBe(true)
    if (res.ok === false) return
    expect(res.data.coreSpot.title.length).toBeGreaterThan(0)
    expect(res.data.highlights.length).toBeGreaterThan(0)
    expect(res.data.checkpoints.length).toBeGreaterThan(0)
    expect(res.data.foodAndSouvenirs.length).toBeGreaterThan(0)
    expect(res.data.nearbyRecommendations.length).toBeGreaterThan(0)
  })

  it("extracts spot-first sections from the example input", async () => {
    const res = await mockParserAdapter.parse({ text: EXAMPLE_INPUT })
    expect(res.ok).toBe(true)
    if (res.ok === false) return

    expect(res.data.coreSpot.summary).toContain("值得")
    expect(res.data.foodAndSouvenirs.some((item) => item.category === "food")).toBe(true)
    expect(res.data.extraInfo.transportTags.length).toBeGreaterThan(0)
  })

  it("rejects empty input", async () => {
    const res = await mockParserAdapter.parse({ text: "   " })
    expect(res.ok).toBe(false)
    if (res.ok === true) return
    expect(res.errorCode).toBe("INVALID_INPUT")
  })

  it("keeps extra info as a secondary section", async () => {
    const res = await mockParserAdapter.parse({ text: EXAMPLE_INPUT })
    expect(res.ok).toBe(true)
    if (res.ok === false) return

    expect(res.data.extraInfo.transportTags.length).toBeGreaterThan(0)
    expect(res.data.extraInfo.tips.length).toBeGreaterThan(0)
  })
})
