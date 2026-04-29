import { useEffect } from 'react';
import { useAppStore } from '../state/store';
import { toAgentJson } from '../export/toAgentJson';

type InboundMsg =
  | { type: 'load_schema'; payload: string }
  | { type: 'highlight_query'; payload: { sql: string } }
  | { type: 'get_schema_request'; id: string };

export function useMcpBridge(): void {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (!token) return;

    const ws = new WebSocket(`ws://localhost:4242/ws?token=${encodeURIComponent(token)}`);

    ws.onmessage = (event: MessageEvent<string>) => {
      let msg: InboundMsg;
      try {
        msg = JSON.parse(event.data) as InboundMsg;
      } catch {
        return;
      }

      const store = useAppStore.getState();

      if (msg.type === 'load_schema') {
        const text = msg.payload.trim();
        const isJson = text.startsWith('{') || text.startsWith('[');
        store.setImportMode(isJson ? 'json' : 'sql');
        store.setImportText(text);
        store.applyImport();
      } else if (msg.type === 'highlight_query') {
        store.setQueryText(msg.payload.sql);
        store.runQueryHighlight();
      } else if (msg.type === 'get_schema_request') {
        const { schema, tips, selectedTable, savedQueries, includeQueriesInExport } = store;
        if (!schema) {
          ws.send(JSON.stringify({ type: 'schema_response', id: msg.id, payload: null }));
          return;
        }
        const jsonStr = toAgentJson(schema, tips, selectedTable, {
          includeQueries: includeQueriesInExport,
          savedQueries,
        });
        ws.send(JSON.stringify({ type: 'schema_response', id: msg.id, payload: JSON.parse(jsonStr) }));
      }
    };

    ws.onerror = () => ws.close();

    return () => {
      ws.close();
    };
  }, []);
}
