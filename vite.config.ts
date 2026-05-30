import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";
import { traeBadgePlugin } from 'vite-plugin-trae-solo-badge';
import { viteVideoAnalyzeApiPlugin } from "./src/server/viteVideoAnalyzeApiPlugin";

const kimiApiKeyForDemo = process.env.VITE_KIMI_API_KEY ?? process.env.KIMI_API_KEY ?? ""

// https://vite.dev/config/
export default defineConfig({
  build: {
    sourcemap: 'hidden',
  },
  define: {
    "import.meta.env.VITE_KIMI_API_KEY": JSON.stringify(kimiApiKeyForDemo),
  },
  plugins: [
    react({
      babel: {
        plugins: [
          'react-dev-locator',
        ],
      },
    }),
    traeBadgePlugin({
      variant: 'dark',
      position: 'bottom-right',
      prodOnly: true,
      clickable: true,
      clickUrl: 'https://www.trae.ai/solo?showJoin=1',
      autoTheme: true,
      autoThemeTarget: '#root'
    }),
    viteVideoAnalyzeApiPlugin(),
    tsconfigPaths()
  ],
})
