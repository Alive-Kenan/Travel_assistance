import Button from "@/components/Button"
import Dialog from "@/components/Dialog"
import Footer from "@/components/Footer"
import Hero from "@/components/Hero"
import InputPanel from "@/components/InputPanel"
import ResultPanel from "@/components/ResultPanel"
import StatusBanner from "@/components/StatusBanner"
import TestVideoPanel from "@/components/TestVideoPanel"
import { DEFAULT_DEMO_VIDEO } from "@/config/demoVideo"
import { useRideGuideStore } from "@/store/useRideGuideStore"

const DEMO_VIDEO_URL = new URL("../../雁荡山.mp4", import.meta.url).href

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

async function loadDemoVideoFile() {
  const response = await fetch(DEMO_VIDEO_URL)
  if (!response.ok) throw new Error("测试视频加载失败")

  const blob = await response.blob()
  return new File([blob], DEFAULT_DEMO_VIDEO.fileName, {
    type: blob.type || "video/mp4",
  })
}

export default function Home() {
  const inputText = useRideGuideStore((s) => s.inputText)
  const status = useRideGuideStore((s) => s.status)
  const result = useRideGuideStore((s) => s.result)
  const error = useRideGuideStore((s) => s.error)
  const partialMessage = useRideGuideStore((s) => s.partialMessage)
  const selectedVideo = useRideGuideStore((s) => s.selectedVideo)
  const videoAnalyzeWaitLevel = useRideGuideStore((s) => s.videoAnalyzeWaitLevel)
  const setInputText = useRideGuideStore((s) => s.setInputText)
  const setSelectedVideo = useRideGuideStore((s) => s.setSelectedVideo)
  const analyzeDemoVideo = useRideGuideStore((s) => s.analyzeDemoVideo)
  const clearAll = useRideGuideStore((s) => s.clearAll)
  const useExample = useRideGuideStore((s) => s.useExample)
  const closeError = useRideGuideStore((s) => s.closeError)
  const parseNow = useRideGuideStore((s) => s.parseNow)
  const abortParse = useRideGuideStore((s) => s.abortParse)

  const textBusy = status === "loading"
  const videoBusy =
    status === "validating_video" ||
    status === "reading_video" ||
    status === "analyzing_video" ||
    status === "enriching_spot"
  const busy = textBusy || videoBusy

  const handleAnalyzeDemo = async () => {
    const videoFile = selectedVideo ?? (await loadDemoVideoFile())
    await analyzeDemoVideo(videoFile)
  }

  return (
    <div className="relative min-h-full overflow-hidden">
      <div className="pointer-events-none absolute -left-48 top-24 h-[520px] w-[520px] rounded-full bg-brand-teal/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-44 top-40 h-[520px] w-[520px] rounded-full bg-brand-orange/18 blur-3xl" />

      <main className="container">
        <Hero />

        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
          <div className="space-y-4">
            <InputPanel
              value={inputText}
              onChange={setInputText}
              onParse={parseNow}
              onClear={clearAll}
              onExample={useExample}
              disabled={busy}
              busy={busy}
            />
            <TestVideoPanel
              fileName={selectedVideo?.name ?? DEFAULT_DEMO_VIDEO.fileName}
              fileSizeText={selectedVideo ? formatFileSize(selectedVideo.size) : "使用项目内置测试视频"}
              busy={videoBusy}
              onAnalyze={() => {
                void handleAnalyzeDemo()
              }}
              onReplace={setSelectedVideo}
            />
            <StatusBanner
              status={status}
              partialMessage={partialMessage}
              videoAnalyzeWaitLevel={videoAnalyzeWaitLevel}
            />
            {textBusy ? (
              <Button type="button" variant="ghost" onClick={abortParse} className="w-full">
                取消解析
              </Button>
            ) : null}
          </div>

          <div>
            <ResultPanel status={status} guide={result} />
          </div>
        </div>

        <Footer />
      </main>

      <Dialog
        open={!!error}
        title={error?.code === "INVALID_INPUT" ? "先贴一段景点内容吧" : "这次景点整理失败了"}
        description={error?.message}
        onClose={closeError}
        tone="danger"
        footer={
          <>
            <Button type="button" variant="ghost" onClick={closeError} className="h-10 px-4">
              知道了
            </Button>
            <Button
              type="button"
              variant="soft"
              onClick={() => {
                closeError()
                if (!inputText && selectedVideo) {
                  void analyzeDemoVideo(selectedVideo)
                  return
                }
                if (!inputText && !selectedVideo) {
                  void handleAnalyzeDemo()
                  return
                }
                void parseNow()
              }}
              className="h-10 px-4"
            >
              重试
            </Button>
          </>
        }
      />
    </div>
  )
}
