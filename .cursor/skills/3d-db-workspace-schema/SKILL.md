---
name: 3d-db-workspace-schema
description: >-
  Gitignored local workspace for full database schema JSON used with the 3D
  Database Visualizer repo. Use when the user mentions .3d-db-workspace,
  baseline.schema.json, syncing schema to disk, or keeping a canonical schema
  out of git for agents.
---

# 3D DB — Workspace schema files (gitignored)

## Location and rules

- **Directory:** `.3d-db-workspace/` at the **repository root** (sibling to `package.json`).
- **Git:** The entire directory is listed in [`.gitignore`](../../../.gitignore). **Never commit** real database exports, production names, or row counts you must keep private.
- **Canonical file:** `.3d-db-workspace/baseline.schema.json` — full schema the visualizer accepts (extended JSON: `name`, `tables[]` with `rowCount`, `columns[]`, optional `queries` per [`docs/SCHEMA_FORMAT.md`](../../../docs/SCHEMA_FORMAT.md)).

## Why keep a local full schema

Agents and humans need a **single machine-local source of truth** for “what the database looks like now” when generating proposals. The visualizer’s in-memory state resets on reload; the workspace file survives and can be refreshed after introspection (`pg_dump --schema-only`, ORM export, etc.).

## Dev server integration

With `npm run dev` only:

- **GET** `/__agent__/baseline` — Returns `baseline.schema.json` if present (404 JSON `{ "error": "baseline not found" }` otherwise). The **Agent** tab exposes **Load workspace baseline** to import it.
- **POST** `/__agent__/baseline` — Writes the request body (must be a JSON **object**) to `baseline.schema.json`. Restricted to `localhost` / `127.0.0.1`.

After the user **Accept**s a proposal in the UI, they can opt in (checkbox, dev only) to POST the accepted schema to that path so the next agent turn reads an up-to-date baseline from disk.

## Agent instructions

1. When exporting a full DB for visualization, write or update `.3d-db-workspace/baseline.schema.json` (extended JSON). Do not stage or commit it.
2. When proposing structural changes, prefer **`preview_schema_proposal`** so the user sees a 3D diff before accepting.
3. After the user applies migrations on a real database, refresh the workspace baseline from the database so disk matches reality.
