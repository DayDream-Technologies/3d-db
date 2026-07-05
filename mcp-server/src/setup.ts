import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { homedir, platform } from 'os';

const MCP_ENTRY = { command: 'npx', args: ['--yes', '--package', '@daydream-technologies/3d-db-mcp', '3d-db-mcp'] };

type Format = 'mcpServers' | 'servers';

type ToolConfig = {
  name: string;
  configPath: string;
  format: Format;
};

function getToolConfigs(): ToolConfig[] {
  const home = homedir();
  const os = platform();

  let claudePath: string;
  if (os === 'win32') {
    claudePath = join(process.env['APPDATA'] ?? home, 'Claude', 'claude_desktop_config.json');
  } else if (os === 'darwin') {
    claudePath = join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
  } else {
    claudePath = join(home, '.config', 'Claude', 'claude_desktop_config.json');
  }

  return [
    { name: 'Claude Desktop', configPath: claudePath, format: 'mcpServers' },
    { name: 'Claude Code', configPath: join(home, '.claude', 'settings.json'), format: 'mcpServers' },
    { name: 'Cursor', configPath: join(home, '.cursor', 'mcp.json'), format: 'mcpServers' },
    { name: 'Windsurf', configPath: join(home, '.codeium', 'windsurf', 'mcp_config.json'), format: 'mcpServers' },
  ];
}

type PatchResult = 'added' | 'already_present' | 'skipped';

function patchConfig(tool: ToolConfig): PatchResult {
  const { configPath, format } = tool;
  const parentDir = dirname(configPath);

  if (!existsSync(configPath) && !existsSync(parentDir)) {
    return 'skipped';
  }

  let config: Record<string, unknown> = {};
  if (existsSync(configPath)) {
    try {
      config = JSON.parse(readFileSync(configPath, 'utf8'));
    } catch {
      config = {};
    }
  }

  if (format === 'mcpServers') {
    const servers = (config['mcpServers'] ?? {}) as Record<string, unknown>;
    if (servers['3d-db']) return 'already_present';
    servers['3d-db'] = MCP_ENTRY;
    config['mcpServers'] = servers;
  } else {
    const servers = (config['servers'] ?? {}) as Record<string, unknown>;
    if (servers['3d-db']) return 'already_present';
    servers['3d-db'] = { type: 'stdio', command: MCP_ENTRY.command, args: MCP_ENTRY.args };
    config['servers'] = servers;
  }

  mkdirSync(parentDir, { recursive: true });
  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
  return 'added';
}

export function runSetup(): void {
  console.log('3d-db MCP setup\n');

  const tools = getToolConfigs();
  let anyAdded = false;

  for (const tool of tools) {
    const result = patchConfig(tool);
    if (result === 'added') {
      console.log(`✓ ${tool.name} — configured (${tool.configPath})`);
      anyAdded = true;
    } else if (result === 'already_present') {
      console.log(`✓ ${tool.name} — already configured`);
    } else {
      console.log(`  ${tool.name} — not found, skipped`);
    }
  }

  console.log('');

  if (anyAdded) {
    console.log('Restart your AI tool to apply the changes.');
    console.log('Then ask it: "Load my database schema into the 3D visualizer"');
  } else if (tools.every(t => patchConfig(t) === 'skipped')) {
    console.log('No supported AI tools detected (Claude Desktop, Claude Code, Cursor, Windsurf).');
    console.log('For VS Code / GitHub Copilot, create .vscode/mcp.json in your project — see:');
    console.log('https://github.com/DayDream-Technologies/3d-db/blob/main/mcp-server/README.md');
  } else {
    console.log('All supported AI tools were already configured.');
    console.log('Ask your AI: "Load my database schema into the 3D visualizer"');
  }
}
