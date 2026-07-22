# Import from MySQL / MariaDB

MySQL exposes metadata in `information_schema` and approximate row counts on `information_schema.tables`.

The snippet below prints **one JSON document** as text. Paste it into the app (JSON → Visualize).

> Adjust `TABLE_SCHEMA` to your database name.

```sql
SELECT JSON_OBJECT(
  'name', DATABASE(),
  'tables', (
    SELECT JSON_ARRAYAGG(
      JSON_OBJECT(
        'name', t.table_name,
        'rowCount', COALESCE(t.table_rows, 0),
        'columns', (
          SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
              'name', c.column_name,
              'type', c.column_type,
              'nullable', c.is_nullable = 'YES',
              'primaryKey', c.column_key = 'PRI',
              'foreignKey', (
                SELECT JSON_OBJECT(
                  'table', k.referenced_table_name,
                  'column', k.referenced_column_name
                )
                FROM information_schema.key_column_usage k
                WHERE k.table_schema = c.table_schema
                  AND k.table_name = c.table_name
                  AND k.column_name = c.column_name
                  AND k.referenced_table_name IS NOT NULL
                LIMIT 1
              ),
              'indexed', c.column_key IN ('PRI', 'UNI', 'MUL')
            )
          )
          FROM information_schema.columns c
          WHERE c.table_schema = t.table_schema
            AND c.table_name = t.table_name
        )
      )
    )
    FROM information_schema.tables t
    WHERE t.table_schema = DATABASE()
      AND t.table_type = 'BASE TABLE'
  )
) AS paste_json;
```

**Note:** `JSON_ARRAYAGG` order may vary by version; reordering in the app is not required. Row counts are approximate (`TABLE_ROWS`).
