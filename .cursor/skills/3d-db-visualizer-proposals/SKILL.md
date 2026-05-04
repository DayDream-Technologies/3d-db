---
name: 3d-db-visualizer-proposals
description: >-
  Preview database schema changes in the 3D Database Visualizer without
  replacing the accepted baseline. Use when the user runs this repo with npm
  run dev, mentions Agent tab, preview_schema_proposal, MCP WebSocket bridge,
  schema proposals from an LLM, or Accept/Dismiss proposal workflow.
---

# 3D DB — Agent proposal preview

## When to use which MCP tool

- **`load_schema`** — Replaces the entire loaded schema (JSON or SQL DDL). Use when the user wants a fresh import or to overwrite what is in the browser.
- **`preview_schema_proposal`** — Sends JSON only as a **preview**. The **accepted baseline** (`importedSchema` in the app) stays unchanged until the human clicks **Accept** in the **Agent** tab. Use for migration proposals the user should review in 3D first.

The browser must be connected to the MCP HTTP server WebSocket (same flow as `load_schema`: open the visualizer URL with `?token=...`).

## Human workflow

1. **Baseline** — Whatever was last accepted via Import / sample / `load_schema` is the baseline for SQL diff export.
2. **Preview** — Agent calls `preview_schema_proposal` with extended JSON ([`docs/SCHEMA_FORMAT.md`](../../../docs/SCHEMA_FORMAT.md)). The UI switches to the **Agent** tab; the 3D scene shows the proposal with green (new tables / new FK edges) and amber (modified tables).
3. **Review** — User inspects the graph and the diff lists in **Agent**.
4. **Migration SQL** — User opens **Export**; `toSql` compares **accepted baseline → proposal head**. They copy or download SQL for test/production (verify dialect and destructive ops such as `DROP`).
5. **Accept** — User clicks **Accept** in **Agent** to make the proposal the new accepted schema (and optionally sync the gitignored baseline file in dev — see workspace skill).
6. **Dismiss** — Restores the 3D view to the pre-proposal accepted schema.

## Local UI fallback

Without MCP, the user can paste proposal JSON in the **Agent** tab and click **Preview as proposal**.

## Errors

If `preview_schema_proposal` JSON fails to parse, the client logs to the console; ask the user to fix JSON shape to match the extended schema format.
