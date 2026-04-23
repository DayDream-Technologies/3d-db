# 3D Database Visualizer

Web-based **3D schema visualization** (React + Vite + [react-three-fiber](https://github.com/pmndrs/react-three-fiber)) inspired by [DBVisualize-3D](https://github.com/halftruths/DBVisualize-3D), with:

- **Table size ∝ row count** (cube edge scales with ∛rows) to surface **bloat**
- **Hover column chips** to highlight **shared keys / FK paths**
- **Simplification tips** (heuristics from PK/FK/index/width/nullable + row stats)
- **SELECT query highlight** (tables + join edges dimmed / emphasized)
- **AI-friendly export** (structured JSON + Markdown for agents)
- **Static / client-only** — paste JSON or SQL DDL; no server required
- **Tips → Practice** — guided SQL + schema exercises from [`src/learn/lessons.md`](src/learn/lessons.md) (bundled; a copy is at [`public/learn/lessons.md`](public/learn/lessons.md) for static fetches) with structural checks and answer keys

## Quick start

```bash
npm install
npm run dev
```

Open the URL shown (e.g. `http://localhost:5173/`). The **e-commerce** sample loads automatically.

## Build & GitHub Pages

```bash
npm run build
npm run preview   # optional local check of dist/
```

### Automated deploy (recommended)

`.github/workflows/deploy.yml` builds and publishes to Pages on every push to `main`.

1. In your repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Push to `main`. The workflow will:
   - install deps (`npm ci`)
   - compute the correct base path via `actions/configure-pages` and set `VITE_BASE_PATH` (e.g. `/3d-db/`)
   - `npm run build`, copy `index.html` → `404.html` for SPA fallback, and upload `dist/`
   - deploy to the `github-pages` environment

The site will be published at `https://<user>.github.io/3d-db/`.

### Manual deploy alternative

```bash
npm run deploy      # uses gh-pages to push dist/ to the gh-pages branch
```

`vite.config.ts` honors `VITE_BASE_PATH` when set (CI), otherwise falls back to `./` (local dev + `gh-pages`-branch hosting).

## Project layout

| Path | Purpose |
|------|---------|
| `public/samples/*.json` | Bundled sample schemas + row counts |
| `public/docs/*.md` | Import guides & JSON format (linked from the UI) |
| `docs/*.md` | Same markdown for browsing on GitHub |
| `src/scene/` | Three.js / R3F scene, layout, hover edges |
| `src/parsers/` | JSON + SQL (`CREATE TABLE`) → internal model |
| `src/analysis/` | Tips + SQL SELECT parsing for highlights |
| `src/export/` | JSON + Markdown for LLMs |

## Importing real databases

See:

- [docs/SCHEMA_FORMAT.md](docs/SCHEMA_FORMAT.md)
- [docs/IMPORT_SUPABASE.md](docs/IMPORT_SUPABASE.md)
- [docs/IMPORT_POSTGRES.md](docs/IMPORT_POSTGRES.md)
- [docs/IMPORT_MYSQL.md](docs/IMPORT_MYSQL.md)
- [docs/IMPORT_MONGODB.md](docs/IMPORT_MONGODB.md)

The in-app **Import** tab links to `public/docs` (same files).

## SQL DDL support

Paste PostgreSQL-style `CREATE TABLE` statements (including `REFERENCES`). Row counts are **not** in DDL — add them via extended JSON or edit in the **Table** tab.

## License

[MIT](LICENSE).
