export type ParseErrorCode = "INVALID_INPUT" | "TIMEOUT" | "PARSE_FAILED" | "ABORTED"

export type RideGuide = {
  source: {
    rawInput: string
    kind: "url" | "text"
  }
  destination: {
    title: string
    city?: string
    summary: string
  }
  ride: {
    typeTags: string[]
    difficultyTag?: string
    distanceKm?: number
    durationText?: string
    elevationM?: number
  }
  highlights: string[]
  routeText: string[]
  gearTags: string[]
  riskNotes: string[]
}

export type ParseInput = {
  text: string
}

export type ParseResult =
  | { ok: true; data: RideGuide }
  | { ok: false; errorCode: ParseErrorCode; message: string }

export interface ParserAdapter {
  parse(input: ParseInput, signal?: AbortSignal): Promise<ParseResult>
}

