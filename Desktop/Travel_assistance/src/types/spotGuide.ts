export type ParseErrorCode = "INVALID_INPUT" | "TIMEOUT" | "PARSE_FAILED" | "ABORTED"

export type SpotGuideDisplayMode = "full" | "partial" | "inferred"

export type SpotBudget = {
  label: string
  range: string
  description?: string
}

export type SpotDayRoute = {
  title: string
  stops: string[]
  summary?: string
}

export type SpotTravelChecklist = {
  spots: string[]
  foods: string[]
  essentials: string[]
  copyText: string
}

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
    bestSeason?: string
    tripTags: string[]
    budget?: SpotBudget
    audienceTags: string[]
  }
  dayRoute?: SpotDayRoute
  highlights: Array<{
    title: string
    description: string
  }>
  checkpoints: Array<{
    name: string
    description: string
    highlight?: string
    duration?: string
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
    transportGuide: string[]
    ticketPolicy: string[]
    stayGuide: string[]
    travelTips: string[]
    durationHint?: string
    tips: string[]
  }
  travelChecklist?: SpotTravelChecklist
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
