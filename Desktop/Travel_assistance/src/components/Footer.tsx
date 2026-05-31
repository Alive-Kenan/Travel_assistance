import { Info } from "lucide-react"

export default function Footer() {
  return (
    <footer className="pb-10 pt-10 text-sm text-ink-500">
      <div className="flex flex-col gap-2 rounded-3xl border border-ink-200/70 bg-white/60 px-5 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-ink-500" />
          <span>内容由输入文本提炼生成，仅供旅行参考，出行方式与住宿建议当前为辅助信息。</span>
        </div>
        <div className="text-xs text-ink-500">MVP：前端 mock 解析，后续可接入真实景点解析服务</div>
      </div>
    </footer>
  )
}
