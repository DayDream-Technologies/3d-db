import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { createHttpServer } from './http.js';

type HttpServer = ReturnType<typeof createHttpServer>;

export function createMcpServer(http: HttpServer) {
  const server = new Server(
    { name: '3d-db', version: '0.1.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'load_schema',
        description:
          'Load a database schema into the 3D visualizer. Accepts either: (1) a JSON string in 3d-db format: { "name": string, "tables": [{ "name": string, "columns": [{ "name": string, "type": string, "primaryKey"?: boolean, "nullable"?: boolean, "foreignKey"?: { "table": string, "column": string } }] }] }, or (2) raw SQL DDL (CREATE TABLE statements).',
        inputSchema: {
          type: 'object' as const,
          properties: {
            schema_text: {
              type: 'string',
              description: 'Schema as JSON or SQL DDL string',
            },
          },
          required: ['schema_text'],
        },
      },
      {
        name: 'preview_schema_proposal',
        description:
          'Send a proposed schema JSON to the 3D visualizer as a non-destructive preview. Does not replace the accepted baseline: the user accepts or dismisses in the Agent tab. Use extended JSON (same shape as load_schema JSON). For a full replace without preview, use load_schema instead.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            schema_text: {
              type: 'string',
              description: 'Proposed schema as JSON string (3d-db extended format)',
            },
          },
          required: ['schema_text'],
        },
      },
      {
        name: 'highlight_query',
        description:
          'Highlight a SQL SELECT query on the 3D visualizer, dimming unrelated tables and drawing edges along the query path.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            sql: {
              type: 'string',
              description: 'A SQL SELECT statement to visualize',
            },
          },
          required: ['sql'],
        },
      },
      {
        name: 'get_schema',
        description:
          'Read the current schema from the 3D visualizer, including tables, columns, relationships, row counts, and optimization tips.',
        inputSchema: {
          type: 'object' as const,
          properties: {},
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params;

    if (name === 'load_schema') {
      const { schema_text } = args as { schema_text: string };
      http.broadcast({ type: 'load_schema', payload: schema_text });
      return {
        content: [{ type: 'text' as const, text: 'Schema loaded into the 3D visualizer.' }],
      };
    }

    if (name === 'preview_schema_proposal') {
      const { schema_text } = args as { schema_text: string };
      http.broadcast({ type: 'preview_proposal', payload: schema_text });
      return {
        content: [
          {
            type: 'text' as const,
            text: 'Proposal preview sent to the 3D visualizer (Agent tab). User must Accept or Dismiss.',
          },
        ],
      };
    }

    if (name === 'highlight_query') {
      const { sql } = args as { sql: string };
      http.broadcast({ type: 'highlight_query', payload: { sql } });
      return {
        content: [{ type: 'text' as const, text: 'Query highlighted in the 3D visualizer.' }],
      };
    }

    if (name === 'get_schema') {
      try {
        const schema = await http.requestSchema();
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(schema, null, 2) }],
        };
      } catch (err) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }],
          isError: true,
        };
      }
    }

    return {
      content: [{ type: 'text' as const, text: `Unknown tool: ${name}` }],
      isError: true,
    };
  });

  async function connect(): Promise<void> {
    const transport = new StdioServerTransport();
    await server.connect(transport);
  }

  return { connect };
}
