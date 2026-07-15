import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { createDreamVitePlugin } from "./src/server/viteDreamPlugin";

export default defineConfig(({ mode }) => ({
  plugins: [react(), createDreamVitePlugin(loadEnv(mode, process.cwd(), ""))],
  build: {
    sourcemap: false,
    target: "es2022",
  },
  server: {
    strictPort: true,
  },
  preview: {
    strictPort: true,
  },
}));
