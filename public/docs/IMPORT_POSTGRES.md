# Import from PostgreSQL (generic)

Use the same approach as Supabase: run the SQL in [IMPORT_SUPABASE.md](./IMPORT_SUPABASE.md) from `psql`, pgAdmin, or any client.

1. Connect to your database.
2. Run the final `SELECT json_build_object(...)`.
3. Copy the `paste_json` cell into this app (JSON tab → Visualize).

### Permissions

You need read access to `information_schema`, `pg_stat_user_tables`, and `pg_indexes`.

### Other schemas

Change `'public'` in the `WHERE` clauses to your schema name (e.g. `'app'`).
