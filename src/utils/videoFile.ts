import { MAX_DEMO_VIDEO_SIZE_MB, SUPPORTED_VIDEO_TYPES } from "@/config/demoVideo"

export type VideoValidationFailureReason =
  | "UNSUPPORTED_TYPE"
  | "FILE_TOO_LARGE"
  | "EMPTY_FILE"

export type VideoValidationResult =
  | { ok: true }
  | { ok: false; reason: VideoValidationFailureReason }

export function validateVideoFile(file: File): VideoValidationResult {
  if (file.size <= 0) {
    return { ok: false, reason: "EMPTY_FILE" }
  }

  if (!SUPPORTED_VIDEO_TYPES.includes(file.type)) {
    return { ok: false, reason: "UNSUPPORTED_TYPE" }
  }

  if (file.size > MAX_DEMO_VIDEO_SIZE_MB * 1024 * 1024) {
    return { ok: false, reason: "FILE_TOO_LARGE" }
  }

  return { ok: true }
}

function toBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64")
  }

  let binary = ""
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary)
}

export async function readFileAsDataUrl(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const mimeType = file.type || "application/octet-stream"

  return `data:${mimeType};base64,${toBase64(bytes)}`
}
