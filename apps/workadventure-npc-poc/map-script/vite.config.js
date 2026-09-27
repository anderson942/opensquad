import { defineConfig } from "vite";
import { getMaps, getMapsOptimizers, getMapsScripts } from "wa-map-optimizer-vite";

const maps = getMaps();

// Self-hosted WorkAdventure instance — not the default play.workadventu.re
// SaaS the plugin assumes otherwise. The generated script wrapper loads its
// iframe_api.js from this URL, so it must match where our map is actually
// played.
const optimizeOptions = {
  playUrl: "https://workadventure.andersonautomacoes.com.br",
};

export default defineConfig({
  base: "./",
  build: {
    manifest: true,
    rollupOptions: {
      input: {
        index: "./index.html",
        ...getMapsScripts(maps),
      },
    },
  },
  plugins: [...getMapsOptimizers(maps, optimizeOptions)],
  server: {
    host: "localhost",
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "X-Requested-With, content-type, Authorization",
    },
    open: "/",
  },
});
