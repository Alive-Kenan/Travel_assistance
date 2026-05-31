import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

type StoreState = {
  inputText: string
  status:
    | "idle"
    | "loading"
    | "validating_video"
    | "reading_video"
    | "analyzing_video"
    | "enriching_spot"
    | "success"
    | "partial_success"
    | "error"
  result: null
  error: { code: "INVALID_INPUT" | "TIMEOUT" | "PARSE_FAILED" | "ABORTED"; message: string } | null
  partialMessage: string | null
  selectedVideo: File | null
  videoAnalyzeWaitLevel: "normal" | "slow" | "very_slow"
  setInputText: (value: string) => void
  setSelectedVideo: (file: File | null) => void
  analyzeDemoVideo: (file: File) => Promise<void>
  clearAll: () => void
  useExample: () => void
  closeError: () => void
  parseNow: () => Promise<void>
  abortParse: () => void
}

let storeState: StoreState

const createBaseStore = (): StoreState => ({
  inputText: "",
  status: "idle",
  result: null,
  error: null,
  partialMessage: null,
  selectedVideo: null,
  videoAnalyzeWaitLevel: "normal",
  setInputText: vi.fn(),
  setSelectedVideo: vi.fn(),
  analyzeDemoVideo: vi.fn().mockResolvedValue(undefined),
  clearAll: vi.fn(),
  useExample: vi.fn(),
  closeError: vi.fn(),
  parseNow: vi.fn().mockResolvedValue(undefined),
  abortParse: vi.fn(),
})

vi.mock("@/store/useRideGuideStore", () => ({
  useRideGuideStore: <T,>(selector: (state: StoreState) => T) => selector(storeState),
}))

import Footer from "@/components/Footer"
import Hero from "@/components/Hero"
import InputPanel from "@/components/InputPanel"
import ResultPanel from "@/components/ResultPanel"
import Home from "@/pages/Home"

describe("scenic spot copy", () => {
  beforeEach(() => {
    storeState = createBaseStore()
  })

  it("uses scenic spot wording in the hero, empty state and footer", () => {
    expect(renderToStaticMarkup(<Hero />)).toContain("生成景点旅行速查指南")

    const emptyStateMarkup = renderToStaticMarkup(<ResultPanel status="idle" guide={null} />)
    expect(emptyStateMarkup).toContain("生成景点速查卡")
    expect(emptyStateMarkup).toContain("景点亮点、打卡点和周边推荐")

    const footerMarkup = renderToStaticMarkup(<Footer />)
    expect(footerMarkup).toContain("仅供旅行参考")
    expect(footerMarkup).toContain("出行方式与住宿建议当前为辅助信息")
  })

  it("uses scenic spot wording in error dialog titles", () => {
    storeState = {
      ...storeState,
      error: { code: "INVALID_INPUT", message: "请输入景点链接" },
    }
    expect(renderToStaticMarkup(<Home />)).toContain("先贴一段景点内容吧")

    storeState = {
      ...storeState,
      error: { code: "PARSE_FAILED", message: "整理失败" },
    }
    expect(renderToStaticMarkup(<Home />)).toContain("这次景点整理失败了")
  })

  it("uses scenic spot wording in the input placeholder", () => {
    const inputMarkup = renderToStaticMarkup(
      <InputPanel
        value=""
        onChange={vi.fn()}
        onParse={vi.fn()}
        onClear={vi.fn()}
        onExample={vi.fn()}
      />,
    )

    expect(inputMarkup).toContain("景点攻略文字")
    expect(inputMarkup).not.toContain("骑行攻略文字")
  })

<<<<<<< HEAD
  it("shows text-only hint for the first release", () => {
    const inputMarkup = renderToStaticMarkup(
      <InputPanel
        value=""
        onChange={vi.fn()}
        onParse={vi.fn()}
        onClear={vi.fn()}
        onExample={vi.fn()}
      />,
    )

    expect(inputMarkup).toContain(
      "当前版本支持景点名、关键词和攻略文字；抖音链接 / 口令暂未开放。",
    )
  })

=======
>>>>>>> 6cb67d6e03fddfe356732e24b0d2a8ee92c2215e
  it("shows a demo video panel for internal testing", () => {
    const homeMarkup = renderToStaticMarkup(<Home />)

    expect(homeMarkup).toContain("当前测试视频")
    expect(homeMarkup).toContain("开始分析")
    expect(homeMarkup).toContain("替换视频（仅调试）")
  })

  it("shows status copy for video analysis states", () => {
    storeState = {
      ...storeState,
      status: "analyzing_video",
    }
    expect(renderToStaticMarkup(<Home />)).toContain("正在分析视频")

    storeState = {
      ...storeState,
      status: "partial_success",
      partialMessage: "联网补充失败，当前展示的是视频提取结果",
    }
    expect(renderToStaticMarkup(<Home />)).toContain("联网补充失败，当前展示的是视频提取结果")
  })

  it("shows a slow-analysis hint after the first wait threshold", () => {
    storeState = {
      ...storeState,
      status: "analyzing_video",
      videoAnalyzeWaitLevel: "slow",
    }

    expect(renderToStaticMarkup(<Home />)).toContain("视频较大，分析可能需要 1-3 分钟，请耐心等待…")
  })

  it("shows a very-slow hint after the second wait threshold", () => {
    storeState = {
      ...storeState,
      status: "analyzing_video",
      videoAnalyzeWaitLevel: "very_slow",
    }

    expect(renderToStaticMarkup(<Home />)).toContain(
      "当前仍在分析中；如果长时间无结果，可稍后重试或替换更短测试视频。",
    )
  })
})
