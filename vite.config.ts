import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "node:fs";

/** Dev-only: read/write gitignored `.3d-db-workspace/baseline.schema.json` for agent workflows. */
function agentWorkspaceBaselinePlugin(): Plugin {
  return {
    name: "3d-db-agent-workspace-baseline",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? "").split("?")[0] ?? "";
        if (url !== "/__agent__/baseline") {
          next();
          return;
        }
        const hostRoot = (req.headers.host ?? "").split(":")[0];
        if (hostRoot !== "localhost" && hostRoot !== "127.0.0.1") {
          res.statusCode = 403;
          res.end("Forbidden");
          return;
        }
        const workspaceDir = path.resolve(process.cwd(), ".3d-db-workspace");
        const baselineFile = path.join(workspaceDir, "baseline.schema.json");

        if (req.method === "GET") {
          if (!fs.existsSync(baselineFile)) {
            res.statusCode = 404;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "baseline not found" }));
            return;
          }
          res.setHeader("Content-Type", "application/json");
          res.end(fs.readFileSync(baselineFile, "utf8"));
          return;
        }

        if (req.method === "POST") {
          const chunks: Buffer[] = [];
          req.on("data", (c: Buffer) => {
            chunks.push(c);
          });
          req.on("end", () => {
            try {
              const raw = Buffer.concat(chunks).toString("utf8");
              const parsed: unknown = JSON.parse(raw);
              if (
                !parsed ||
                typeof parsed !== "object" ||
                Array.isArray(parsed)
              ) {
                res.statusCode = 400;
                res.setHeader("Content-Type", "text/plain; charset=utf-8");
                res.end("Expected a single JSON object");
                return;
              }
              fs.mkdirSync(workspaceDir, { recursive: true });
              fs.writeFileSync(
                baselineFile,
                JSON.stringify(parsed, null, 2),
                "utf8"
              );
              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({
                  ok: true,
                  path: ".3d-db-workspace/baseline.schema.json",
                })
              );
            } catch (e) {
              res.statusCode = 400;
              res.setHeader("Content-Type", "text/plain; charset=utf-8");
              res.end(String(e instanceof Error ? e.message : e));
            }
          });
          return;
        }

        res.statusCode = 405;
        res.end();
      });
    },
  };
}

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
  plugins: [react(), agentWorkspaceBaselinePlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
