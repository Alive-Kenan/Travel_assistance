export type TextInputKind = "url_or_token" | "keyword_query" | "travel_note_text"

export function classifyTextInput(text: string): { kind: TextInputKind } {
  const normalized = text.trim()

  if (
    /https?:\/\/\S+/i.test(normalized) ||
    /douyin|抖音|复制此链接|打开抖音|口令/i.test(normalized)
  ) {
    return { kind: "url_or_token" }
  }

  if (normalized.length <= 24 && !/[。；;！!？?\n]/.test(normalized)) {
    return { kind: "keyword_query" }
  }

  return { kind: "travel_note_text" }
}
