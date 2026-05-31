# 景点速查页

一个基于 `Vite + React + TypeScript` 的单页应用，用于把短视频里的景点内容整理成结构化旅行卡片。当前项目同时保留两条演示链路：

- 文本 / 链接输入后走本地 mock 解析
- 项目内置测试视频走 Kimi 两阶段分析与景区补全

## 本地运行

```bash
npm install
npm run dev
```

## Kimi Demo 说明

- 页面默认读取项目内置测试视频 `93dbd1bee8583172e030b2fde92fdea3.mp4`
- 点击“开始分析”后，会依次执行视频校验、视频理解、景区补全
- 当前前端通过 `window.__KIMI_API_KEY__` 读取 Kimi API Key
- 未注入 Key 时，视频分析链路会进入错误态；文本 mock 解析链路不受影响

可以在浏览器控制台临时注入：

```js
window.__KIMI_API_KEY__ = "你的 Kimi API Key"
```

## 常用命令

```bash
npm run test
npm run check
npm run lint
npm run build
```

## 当前边界

- 这是面向演示的前端直连方案，不适合生产环境直接暴露 API Key
- 项目内置测试视频体积较大，生产构建会把该视频打进产物，构建输出偏重
