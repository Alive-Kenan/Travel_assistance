import { analyzeUploadedVideoWithKimi } from "@/server/kimiVideoAnalyzeClient"

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 })
  }

  const formData = await request.formData()
  const file = formData.get("video")

  if (!(file instanceof File)) {
    return Response.json({ error: "MISSING_VIDEO_FILE" }, { status: 400 })
  }

  const apiKey = process.env.KIMI_API_KEY
  if (!apiKey) {
    return Response.json({ error: "MISSING_KIMI_API_KEY" }, { status: 500 })
  }

  try {
    const result = await analyzeUploadedVideoWithKimi(file, apiKey)
    return Response.json(result)
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "VIDEO_ANALYZE_FAILED" },
      { status: 500 },
    )
  }
}
