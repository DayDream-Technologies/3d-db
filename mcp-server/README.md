# 3d-db MCP Server

Lets AI tools (Claude Desktop, Claude Code, Cursor, Windsurf, VS Code with GitHub Copilot/Cline/Continue) visualize your database schema in 3D — automatically, on command.

**You do not need to clone any repository or run a dev server.** The visualizer is bundled inside this package. The only requirement is Node.js.

---

## Requirements

- **Node.js 18 or later** — check with `node --version`. Download from [nodejs.org](https://nodejs.org) if needed.
- One of: **Claude Desktop**, **Claude Code**, **Cursor**, **Windsurf**, or **VS Code** (with GitHub Copilot, Cline, or Continue).
- Your AI tool already connected to your database. This tool handles **visualization only** — it does not connect to your database directly.

---

## Setup

Run this once in your terminal:

```
npx --yes --package @daydream-technologies/3d-db-mcp 3d-db-mcp setup
```

This detects which AI tools you have installed and configures them automatically. No config files to edit.

Then **restart your AI tool** and ask it:

> "Load my database schema into the 3D visualizer"

A browser window opens with your schema in 3D.

---

## VS Code (GitHub Copilot, Cline, Continue)

VS Code MCP config is project-scoped. Add `.vscode/mcp.json` to your project:

```json
{
  "servers": {
    "3d-db": {
      "type": "stdio",
      "command": "npx",
      "args": ["--yes", "--package", "@daydream-technologies/3d-db-mcp", "3d-db-mcp"]
    }
  }
}
```

---

## What your AI can do

### `load_schema`

Loads your database schema into the 3D visualizer. Accepts JSON or SQL DDL. Replaces the current import (full load).

**Example prompt:**
> "Load my database schema into the 3D visualizer"

### `preview_schema_proposal`

Sends a **proposed** schema JSON to the visualizer as a **preview** only. The accepted baseline stays unchanged until the user clicks **Accept** in the **Agent** tab (when using the repo dev app with WebSocket bridge). Use this for LLM-suggested migrations; use `load_schema` when you intend to replace the whole schema immediately.

**Example prompt:**
> "Preview this proposed schema JSON in the 3D visualizer without replacing my baseline"

### `highlight_query`

Highlights a SQL query — dims unrelated tables, draws the join path.

**Example prompt:**
> "Show me how this query touches the database"

### `get_schema`

Reads the current schema back from the visualizer, including tables, relationships, row counts, and optimization tips.

**Example prompt:**
> "What does my schema look like right now? Any issues?"

---

## How it works

The setup command patches your AI tool's config file to add:

```json
{
  "command": "npx",
  "args": ["--yes", "--package", "@daydream-technologies/3d-db-mcp", "3d-db-mcp"]
}
```

When your AI tool starts a session, it runs this command automatically. The server:

1. Picks an available port (starting at 4242)
2. Generates a one-time session token
3. Opens your browser at `http://localhost:<port>?token=<token>`
4. Serves the 3D visualizer as a local web page
5. Listens for tool calls from your AI

The server shuts down automatically when your AI session ends.

---

## Security

- Runs on `localhost` only — never exposed to the network
- A random token is generated each session — no other tab or process can connect
- No database credentials are stored or proxied — your AI tool handles the database connection
- The server shuts down automatically when your AI tool session ends
