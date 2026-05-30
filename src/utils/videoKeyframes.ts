export type SampledFrame = {
  dataUrl: string
  sharpness: number
  brightness: number
  hash: string
  ratio: number
}

const SAMPLE_COUNT = 10
const SAMPLE_START = 0.1
const SAMPLE_END = 0.9
const CAPTURE_WIDTH = 1280
const CAPTURE_HEIGHT = 720

export function buildSampleRatios(): number[] {
  const step = (SAMPLE_END - SAMPLE_START) / (SAMPLE_COUNT - 1)

  return Array.from({ length: SAMPLE_COUNT }, (_, index) =>
    Number((SAMPLE_START + step * index).toFixed(4)),
  )
}

export function buildRetrySampleRatios(primaryRatios: number[]): number[] {
  return [0, 2, 4, 6].map((index) =>
    Number(
      (
        (((primaryRatios[index] ?? 0) + (primaryRatios[index + 1] ?? 0)) /
          2) +
        Number.EPSILON
      ).toFixed(4),
    ),
  )
}

function hammingDistance(left: string, right: string): number {
  const maxLength = Math.max(left.length, right.length)
  let count = 0

  for (let index = 0; index < maxLength; index += 1) {
    if (left[index] !== right[index]) {
      count += 1
    }
  }

  return count
}

export function pickRepresentativeFrames(
  frames: SampledFrame[],
  limit: number,
): SampledFrame[] {
  const picked: SampledFrame[] = []

  for (const frame of [...frames].sort((left, right) => right.sharpness - left.sharpness)) {
    const isNearDuplicate = picked.some(
      (pickedFrame) => hammingDistance(pickedFrame.hash, frame.hash) <= 1,
    )

    if (!isNearDuplicate) {
      picked.push(frame)
    }

    if (picked.length === limit) {
      break
    }
  }

  return picked.sort((left, right) => left.ratio - right.ratio)
}

function waitForEvent<T extends EventTarget>(
  target: T,
  successEvent: keyof GlobalEventHandlersEventMap,
  failureEvent: keyof GlobalEventHandlersEventMap,
  createError: () => Error,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const handleSuccess = () => {
      cleanup()
      resolve()
    }
    const handleFailure = () => {
      cleanup()
      reject(createError())
    }
    const cleanup = () => {
      target.removeEventListener(successEvent, handleSuccess as EventListener)
      target.removeEventListener(failureEvent, handleFailure as EventListener)
    }

    target.addEventListener(successEvent, handleSuccess as EventListener, { once: true })
    target.addEventListener(failureEvent, handleFailure as EventListener, { once: true })
  })
}

export async function extractVideoKeyframes(
  file: File,
  ratios: number[],
): Promise<SampledFrame[]> {
  const objectUrl = URL.createObjectURL(file)
  const video = document.createElement("video")

  video.preload = "auto"
  video.muted = true
  video.src = objectUrl

  try {
    await waitForEvent(video, "loadedmetadata", "error", () => new Error("VIDEO_METADATA_LOAD_FAILED"))

    const canvas = document.createElement("canvas")
    const context = canvas.getContext("2d")

    if (!context) {
      throw new Error("VIDEO_FRAME_CAPTURE_FAILED")
    }

    canvas.width = CAPTURE_WIDTH
    canvas.height = CAPTURE_HEIGHT

    const frames: SampledFrame[] = []

    for (const ratio of ratios) {
      video.currentTime = Math.max(0, Math.min(video.duration * ratio, video.duration - 0.1))
      await waitForEvent(video, "seeked", "error", () => new Error("VIDEO_SEEK_FAILED"))

      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      frames.push({
        dataUrl: canvas.toDataURL("image/jpeg", 0.72),
        ratio,
        sharpness: 0.8,
        brightness: 0.5,
        hash: `${Math.round(ratio * 1000)}`,
      })
    }

    return frames
  } catch (error) {
    throw new Error(
      error instanceof Error ? `视频抽帧失败：${error.message}` : "视频抽帧失败",
    )
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
