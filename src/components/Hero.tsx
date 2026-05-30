import { Compass, Sparkles } from "lucide-react"

export default function Hero() {
  return (
    <header className="pt-10 sm:pt-14">
      <div className="inline-flex items-center gap-2 rounded-full border border-ink-200/70 bg-white/70 px-4 py-2 text-sm text-ink-700 backdrop-blur">
        <Compass className="h-4 w-4 text-brand-teal" />
        <span>景点速查</span>
        <span className="text-ink-500">把碎片内容变成一屏旅行指南</span>
      </div>

      <div className="mt-6 max-w-3xl">
        <h1 className="font-display text-4xl leading-[1.05] tracking-tight text-ink-950 sm:text-5xl">
          粘贴抖音链接，
          <span className="relative mx-1 inline-flex items-center">
            一键解析
            <Sparkles className="ml-2 h-6 w-6 text-brand-orange" />
          </span>
          <br className="hidden sm:block" />
          生成景点旅行速查指南
        </h1>
        <p className="mt-4 text-base leading-relaxed text-ink-500 sm:text-lg">
          景点亮点、必打卡点、特色小吃、文创与周边推荐，全部卡片化结构化呈现。
        </p>
      </div>
    </header>
  )
}
