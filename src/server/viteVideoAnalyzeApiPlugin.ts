import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from "node:http"
import { Readable } from "node:stream"

import type { Plugin, ViteDevServer } from "vite"

const VIDEO_ANALYZE_PATH = "/api/video-analyze"
const JSON_CONTENT_TYPE = "application/json; charset=utf-8"

type RequestHandlerModule = {
  default: (request: Request) => Promise<Response> | Response
}

type NodeRequestInit = RequestInit & {
  duplex?: "half"
}

function matchesVideoAnalyzeRoute(url?: string): boolean {
  return url === VIDEO_ANALYZE_PATH || url?.startsWith(`${VIDEO_ANALYZE_PATH}?`) === true
}

function createHeaders(nodeHeaders: IncomingHttpHeaders): Headers {
  const headers = new Headers()

  for (const [key, value] of Object.entries(nodeHeaders)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(key, item)
      }
      continue
    }

    if (value) {
      headers.set(key, value)
    }
  }

  return headers
}

function createWebRequest(req: IncomingMessage): Request {
  const host = req.headers.host ?? "localhost"
  const url = new URL(req.url ?? VIDEO_ANALYZE_PATH, `http://${host}`)
  const init: NodeRequestInit = {
    method: req.method,
    headers: createHeaders(req.headers),
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = Readable.toWeb(req) as BodyInit
    init.duplex = "half"
  }

  return new Request(url, init)
}

async function writeWebResponse(res: ServerResponse, response: Response): Promise<void> {
  res.statusCode = response.status

  response.headers.forEach((value, key) => {
    res.setHeader(key, value)
  })

  if (!response.body) {
    res.end()
    return
  }

  const body = Buffer.from(await response.arrayBuffer())
  res.end(body)
}

async function runHandler(
  server: ViteDevServer,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const module = (await server.ssrLoadModule("/api/video-analyze.ts")) as RequestHandlerModule
  const response = await module.default(createWebRequest(req))
  await writeWebResponse(res, response)
}

export function viteVideoAnalyzeApiPlugin(): Plugin {
  return {
    name: "vite-video-analyze-api",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!matchesVideoAnalyzeRoute(req.url)) {
          next()
          return
        }

        try {
          await runHandler(server, req, res)
        } catch (error) {
          server.ssrFixStacktrace(error as Error)
          res.statusCode = 500
          res.setHeader("Content-Type", JSON_CONTENT_TYPE)
          res.end(
            JSON.stringify({
              error: error instanceof Error ? error.message : "DEV_VIDEO_ANALYZE_FAILED",
            }),
          )
        }
      })
    },
  }
}
