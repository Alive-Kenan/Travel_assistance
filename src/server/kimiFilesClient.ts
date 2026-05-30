import { buildKimiRequestErrorMessage } from "@/services/kimiClient"

const FILES_API_BASE = "https://api.moonshot.cn/v1/files"

type KimiFileUploadResponse = {
  id?: string
}

export async function uploadVideoToKimi(file: File, apiKey: string): Promise<string> {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("purpose", "video")

  const response = await fetch(FILES_API_BASE, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => undefined)
    throw new Error(buildKimiRequestErrorMessage(response.status, payload))
  }

  const payload = (await response.json()) as KimiFileUploadResponse
  if (!payload.id) {
    throw new Error("KIMI_FILE_UPLOAD_FAILED")
  }

  return payload.id
}
