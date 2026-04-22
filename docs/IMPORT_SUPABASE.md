# Import from Supabase (Postgres)

Supabase is Postgres. Use the **SQL Editor** to run a query that builds JSON matching [SCHEMA_FORMAT.md](./SCHEMA_FORMAT.md).

## 1. Columns, PKs, FKs, row counts

Run the query below, copy the **single JSON row** result, and paste it into the app as **JSON** → **Visualize**.

> Replace `public` with your main schema if different.

```sql
WITH cols AS (
  SELECT
    c.table_name,
    json_agg(
      json_build_object(
        'name', c.column_name,
        'type', c.data_type,
        'nullable', c.is_nullable = 'YES',
        'primaryKey', EXISTS (
          SELECT 1 FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
           AND tc.table_schema = kcu.table_schema
          WHERE tc.table_schema = c.table_schema
            AND tc.table_name = c.table_name
            AND tc.constraint_type = 'PRIMARY KEY'
            AND kcu.column_name = c.column_name
        ),
        'foreignKey', (
          SELECT json_build_object(
            'table', ccu.table_name,
            'column', ccu.column_name
          )
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
           AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage ccu
            ON ccu.constraint_name = tc.constraint_name
           AND ccu.table_schema = tc.table_schema
          WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_schema = c.table_schema
            AND tc.table_name = c.table_name
            AND kcu.column_name = c.column_name
          LIMIT 1
        ),
        'indexed', EXISTS (
          SELECT 1 FROM pg_indexes i
          WHERE i.schemaname = c.table_schema
            AND i.tablename = c.table_name
            AND i.indexdef ILIKE '%' || quote_ident(c.column_name) || '%'
        )
      ) ORDER BY c.ordinal_position
    ) AS columns
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
  GROUP BY c.table_schema, c.table_name
),
counts AS (
  SELECT relname AS table_name, COALESCE(n_live_tup, 0)::bigint AS row_count
  FROM pg_stat_user_tables
  WHERE schemaname = 'public'
)
SELECT json_build_object(
  'name', current_database(),
  'tables', json_agg(
    json_build_object(
      'name', cols.table_name,
      'rowCount', COALESCE(counts.row_count, 0),
      'columns', cols.columns
    ) ORDER BY cols.table_name
  )
)::text AS paste_json
FROM cols
LEFT JOIN counts USING (table_name);
```

## 2. Tips

- If `indexed` heuristics are noisy, you can strip the `indexed` keys from JSON and rely on manual row edits in the **Table** tab.
- Export **JSON / Markdown** from the app for LLM context after import.
