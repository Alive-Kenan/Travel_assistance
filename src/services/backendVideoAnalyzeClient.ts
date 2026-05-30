import type { Stage1SpotExtraction } from "@/types/spotGuide"

export async function analyzeVideoViaBackend(file: File): Promise<Stage1SpotExtraction> {
  const url = import.meta.env.VITE_VIDEO_ANALYZE_API_URL || "/api/video-analyze"
  const formData = new FormData()
  formData.append("video", file)

  const response = await fetch(url, {
    method: "POST",
    body: formData,
  })

  const payload = await response.json()
  if (!response.ok) {
    throw new Error(payload?.error || "VIDEO_ANALYZE_FAILED")
  }

  return payload as Stage1SpotExtraction
}
