# Publishing the MCP Package

Steps that must be done manually before CI can publish automatically.

---

## One-time setup

### 1. Create the npm organization

1. Go to [npmjs.com/signup](https://www.npmjs.com/signup) (or log in)
2. Navigate to **Organizations** → **Create Organization**
3. Name it `daydream-technologies` (this creates the `@daydream-technologies` scope)
4. Add any team members who should have publish access

### 2. Generate an npm access token

1. On npmjs.com → click your avatar → **Access Tokens**
2. Click **Generate New Token** → choose **Automation** (for CI)
3. Copy the token (you won't see it again)

### 3. Add the token to GitHub Actions secrets

1. Go to the repo on GitHub: `github.com/DayDream-Technologies/3d-db`
2. **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `NPM_TOKEN`
5. Value: paste the token from step 2
6. Click **Add secret**

### 4. Install the MCP Publisher CLI (local machine)

```bash
brew install mcp-publisher
```

Or download the binary:

```bash
curl -sL "https://github.com/modelcontextprotocol/registry/releases/download/latest/mcp-publisher_$(uname -s | tr '[:upper:]' '[:lower:]')_$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/').tar.gz" | tar xz mcp-publisher
sudo mv mcp-publisher /usr/local/bin/
```

### 5. Authenticate with the MCP Registry

```bash
cd mcp-server
mcp-publisher login github
```

This opens a browser for GitHub OAuth. The namespace `io.github.daydream-technologies/*` is tied to the `DayDream-Technologies` GitHub org.

### 6. First-time publish to the MCP Registry

After the npm package is live (either via CI or manual `npm publish`):

```bash
cd mcp-server
mcp-publisher publish
```

Verify it shows up:

```bash
curl "https://registry.modelcontextprotocol.io/v0/servers?search=io.github.daydream-technologies/3d-db"
```

### 7. Request GitHub curated registry listing

Email **partnerships@github.com** with:

- Package name: `@daydream-technologies/3d-db-mcp`
- MCP Registry name: `io.github.daydream-technologies/3d-db`
- GitHub repo: `https://github.com/DayDream-Technologies/3d-db`
- Brief description of what the server does

This gets the server listed in GitHub's browsable MCP catalog (the "Install in VS Code" button experience).

---

## Publishing a new version

Once the one-time setup is complete, releasing is automated:

```bash
# Bump version in mcp-server/package.json and server.json (or let CI do it from the tag)
git tag v0.1.0
git push origin v0.1.0
```

The `publish-mcp.yml` workflow will:

1. Build the visualizer and MCP server
2. Bundle `dist/` into `mcp-server/static/`
3. Sync the version from the git tag
4. Publish to npm as `@daydream-technologies/3d-db-mcp`
5. Publish to the MCP Registry via `mcp-publisher`

---

## Manual publish (without CI)

If you need to publish without using the workflow:

```bash
# From the repo root
npm run build:mcp

# Publish to npm
cd mcp-server
npm publish

# Publish to MCP Registry
mcp-publisher publish
```

---

## Verifying the package works

After publishing, test from a clean environment:

```bash
npx --yes --package @daydream-technologies/3d-db-mcp 3d-db-mcp setup
```

This should detect your installed AI tools and configure them. Then restart your AI tool and ask it to load a schema.
