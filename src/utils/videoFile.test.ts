import { afterEach, describe, expect, it, vi } from "vitest"
import {
  DEFAULT_DEMO_VIDEO,
  MAX_DEMO_VIDEO_SIZE_MB,
  SUPPORTED_VIDEO_TYPES,
} from "@/config/demoVideo"
import {
  buildRetrySampleRatios,
  buildSampleRatios,
  extractVideoKeyframes,
  pickRepresentativeFrames,
} from "@/utils/videoKeyframes"
import { readFileAsDataUrl, validateVideoFile } from "@/utils/videoFile"

describe("demo video config", () => {
  it("defines a default local demo video", () => {
    expect(DEFAULT_DEMO_VIDEO.fileName).toBe("雁荡山.mp4")
  })

  it("keeps the bundled demo video within the configured size limit", () => {
    expect(DEFAULT_DEMO_VIDEO.sizeBytes).toBeLessThanOrEqual(
      MAX_DEMO_VIDEO_SIZE_MB * 1024 * 1024,
    )
  })

  it("keeps demo video config portable", () => {
    expect("absolutePath" in DEFAULT_DEMO_VIDEO).toBe(false)
  })

  it("defines supported video types and file size limit", () => {
    expect(SUPPORTED_VIDEO_TYPES).toContain("video/mp4")
    expect(MAX_DEMO_VIDEO_SIZE_MB).toBeGreaterThan(0)
  })
})

describe("validateVideoFile", () => {
  it("accepts a supported video file within size limit", () => {
    const file = new File([new Uint8Array([1, 2, 3])], "demo.mp4", {
      type: "video/mp4",
    })

    expect(validateVideoFile(file)).toEqual({ ok: true })
  })

  it("rejects unsupported file types", () => {
    const file = new File(["hello"], "demo.txt", { type: "text/plain" })

    expect(validateVideoFile(file)).toEqual({
      ok: false,
      reason: "UNSUPPORTED_TYPE",
    })
  })

  it("rejects too large video files", () => {
    const file = new File(
      [new Uint8Array(MAX_DEMO_VIDEO_SIZE_MB * 1024 * 1024 + 1)],
      "demo.mp4",
      { type: "video/mp4" },
    )

    expect(validateVideoFile(file)).toEqual({
      ok: false,
      reason: "FILE_TOO_LARGE",
    })
  })
})

describe("readFileAsDataUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("reads a video file into a data url", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "demo.mp4", {
      type: "video/mp4",
    })

    await expect(readFileAsDataUrl(file)).resolves.toBe(
      "data:video/mp4;base64,AQID",
    )
  })

  it("still works when node Buffer is unavailable", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "demo.mp4", {
      type: "video/mp4",
    })

    vi.stubGlobal("Buffer", undefined)
    vi.stubGlobal("btoa", (value: string) =>
      value
        .split("")
        .map((char) => char.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("") === "010203"
        ? "AQID"
        : "",
    )

    await expect(readFileAsDataUrl(file)).resolves.toBe(
      "data:video/mp4;base64,AQID",
    )
  })
})

describe("video keyframes", () => {
  it("builds 10 evenly distributed sample ratios between 10% and 90%", () => {
    expect(buildSampleRatios()).toEqual([
      0.1, 0.1889, 0.2778, 0.3667, 0.4556, 0.5444, 0.6333, 0.7222, 0.8111, 0.9,
    ])
  })

  it("builds retry ratios between primary sample points", () => {
    expect(buildRetrySampleRatios(buildSampleRatios())).toEqual([
      0.1445, 0.3223, 0.5, 0.6778,
    ])
  })

  it("keeps clear and diverse frames first", () => {
    const picked = pickRepresentativeFrames(
      [
        {
          dataUrl: "a",
          sharpness: 0.9,
          brightness: 0.5,
          hash: "1111",
          ratio: 0.1,
        },
        {
          dataUrl: "b",
          sharpness: 0.8,
          brightness: 0.5,
          hash: "1111",
          ratio: 0.2,
        },
        {
          dataUrl: "c",
          sharpness: 0.85,
          brightness: 0.5,
          hash: "0101",
          ratio: 0.5,
        },
        {
          dataUrl: "d",
          sharpness: 0.82,
          brightness: 0.5,
          hash: "0011",
          ratio: 0.9,
        },
      ],
      3,
    )

    expect(picked.map((frame) => frame.dataUrl)).toEqual(["a", "c", "d"])
  })
})

describe("extractVideoKeyframes", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("releases the object url after extracting frames", async () => {
    class FakeVideoElement extends EventTarget {
      preload = ""
      muted = false
      duration = 12

      set src(_value: string) {
        queueMicrotask(() => {
          this.dispatchEvent(new Event("loadedmetadata"))
        })
      }

      set currentTime(_value: number) {
        queueMicrotask(() => {
          this.dispatchEvent(new Event("seeked"))
        })
      }
    }

    class FakeCanvasElement {
      width = 0
      height = 0

      getContext() {
        return {
          drawImage: vi.fn(),
        }
      }

      toDataURL() {
        return "data:image/jpeg;base64,frame-1"
      }
    }

    const createObjectURL = vi.fn(() => "blob:demo")
    const revokeObjectURL = vi.fn()
    const video = new FakeVideoElement()
    const canvas = new FakeCanvasElement()

    vi.stubGlobal("URL", {
      createObjectURL,
      revokeObjectURL,
    })
    vi.stubGlobal("document", {
      createElement: vi.fn((tagName: string) => {
        if (tagName === "video") {
          return video
        }

        if (tagName === "canvas") {
          return canvas
        }

        throw new Error(`Unexpected tag: ${tagName}`)
      }),
    })

    const file = new File([new Uint8Array([1, 2, 3])], "demo.mp4", {
      type: "video/mp4",
    })

    await expect(extractVideoKeyframes(file, [0.1])).resolves.toEqual([
      {
        dataUrl: "data:image/jpeg;base64,frame-1",
        ratio: 0.1,
        sharpness: 0.8,
        brightness: 0.5,
        hash: "100",
      },
    ])
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:demo")
  })

  it("wraps capture errors and still releases the object url", async () => {
    class FakeVideoElement extends EventTarget {
      preload = ""
      muted = false
      duration = 12

      set src(_value: string) {
        queueMicrotask(() => {
          this.dispatchEvent(new Event("error"))
        })
      }
    }

    class FakeCanvasElement {
      getContext() {
        return null
      }
    }

    const createObjectURL = vi.fn(() => "blob:error")
    const revokeObjectURL = vi.fn()

    vi.stubGlobal("URL", {
      createObjectURL,
      revokeObjectURL,
    })
    vi.stubGlobal("document", {
      createElement: vi.fn((tagName: string) => {
        if (tagName === "video") {
          return new FakeVideoElement()
        }

        if (tagName === "canvas") {
          return new FakeCanvasElement()
        }

        throw new Error(`Unexpected tag: ${tagName}`)
      }),
    })

    const file = new File([new Uint8Array([1, 2, 3])], "demo.mp4", {
      type: "video/mp4",
    })

    await expect(extractVideoKeyframes(file, [0.1])).rejects.toThrow(
      "视频抽帧失败：VIDEO_METADATA_LOAD_FAILED",
    )
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:error")
  })
})
