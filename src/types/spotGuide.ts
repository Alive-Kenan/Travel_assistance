export type ParseErrorCode = "INVALID_INPUT" | "TIMEOUT" | "PARSE_FAILED" | "ABORTED"

export type SpotGuideDisplayMode = "full" | "partial" | "inferred"

export type SpotGuide = {
  source: {
    rawInput: string
    kind: "url" | "text"
  }
  coreSpot: {
    title: string
    city?: string
    summary: string
    bestTime?: string
    audienceTags: string[]
  }
  highlights: Array<{
    title: string
    description: string
  }>
  checkpoints: Array<{
    name: string
    description: string
    photoTip?: string
    stayHint?: string
  }>
  foodAndSouvenirs: Array<{
    name: string
    category: "food" | "souvenir"
    reason: string
  }>
  nearbyRecommendations: Array<{
    name: string
    reason: string
    relationHint?: string
  }>
  extraInfo: {
    transportTags: string[]
    stayTags: string[]
    durationHint?: string
    tips: string[]
  }
  displayMode?: SpotGuideDisplayMode
  displayHints?: string[]
}

export type ParseInput = {
  text: string
}

export type ParseResult =
  | { ok: true; data: SpotGuide }
  | { ok: false; errorCode: ParseErrorCode; message: string }

export interface ParserAdapter {
  parse(input: ParseInput, signal?: AbortSignal): Promise<ParseResult>
}

export type SpotGuideStatus =
  | "idle"
  | "validating_video"
  | "reading_video"
  | "analyzing_video"
  | "enriching_spot"
  | "success"
  | "partial_success"
  | "error"

export type Stage1SpotExtraction = {
  coreSpotName: string
  city?: string
  summary: string
  highlights: string[]
  checkpoints: string[]
  foods: string[]
  souvenirs: string[]
  nearbyCandidates: string[]
  transportHints: string[]
  stayHints: string[]
  tips: string[]
  confidence: "high" | "medium" | "low"
}
