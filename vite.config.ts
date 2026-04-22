import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

/**
 * Base path strategy:
 * - Local dev / preview: "./" (relative) works from any host.
 * - CI (GitHub Pages): the workflow sets VITE_BASE_PATH to "/<repo>/"
 *   (from actions/configure-pages), which is required for fetches
 *   like "/samples/..." and "/docs/..." to resolve correctly when
 *   hosted at https://<user>.github.io/<repo>/.
 */
const base = process.env.VITE_BASE_PATH || "./";

export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
