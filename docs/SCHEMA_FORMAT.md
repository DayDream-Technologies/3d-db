# Extended JSON schema format

This app accepts a single JSON object with:

- `name` (optional): display name for the schema.
- `tables` (required): array of table objects.

Each **table**:

| Field        | Type   | Description                                      |
| ------------ | ------ | ------------------------------------------------ |
| `name`       | string | Table name (unique in this file).                |
| `columns`    | array  | Column definitions.                            |
| `rowCount`   | number | Optional. Used to size boxes (∛ scaling).       |
| `sizeBytes`  | number | Optional. Reserved for future use.              |

Each **column**:

| Field         | Type   | Description |
| ------------- | ------ | ----------- |
| `name`        | string | Column name |
| `type`        | string | Logical / SQL type label (informational). |
| `primaryKey`  | bool   | Primary key marker. |
| `foreignKey`  | object | `{ "table": "other", "column": "id" }` |
| `nullable`    | bool   | Default treated as nullable if omitted. |
| `indexed`     | bool   | If `false` on FK columns, tips may suggest indexes. |

**Relationships** are inferred only from `foreignKey` on columns (no separate edges array).

### Minimal example

```json
{
  "name": "Demo",
  "tables": [
    {
      "name": "users",
      "rowCount": 100,
      "columns": [
        { "name": "id", "type": "int", "primaryKey": true },
        { "name": "email", "type": "text", "nullable": false, "indexed": true }
      ]
    },
    {
      "name": "posts",
      "rowCount": 5000,
      "columns": [
        { "name": "id", "type": "int", "primaryKey": true },
        {
          "name": "user_id",
          "type": "int",
          "foreignKey": { "table": "users", "column": "id" },
          "indexed": true
        }
      ]
    }
  ]
}
```

### CSV / stats import

There is no separate CSV parser in the UI; merge stats in SQL or a small script, then paste JSON. See import guides for row-count queries.
