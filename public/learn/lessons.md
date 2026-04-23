# Practice curriculum (SQL + schema design)
#
# This file is the bundled default for the Practice tab. A copy is kept at
# public/learn/lessons.md so the same text can be fetched in production when
# the URL resolves; if fetch fails, the app uses this import.

## Lesson: SELECT and WHERE
`id: sql-select-where, track: sql, sample: ecommerce.json`

### Step 1: List all user emails
Return every `email` from the `users` table.

```sql starter
SELECT 
FROM users
```

```sql answer
SELECT email
FROM users;
```

```check yaml
must_from: users
must_select_columns:
  - email
```

### Step 2: Filter with WHERE
List `email` and `created_at` for users, but only rows you could describe as "recent" by requiring `email` to contain the `@` sign (a stand-in for *valid* addresses in this exercise). Use a `LIKE` pattern: `email LIKE '%@%'`.

```sql answer
SELECT email, created_at
FROM users
WHERE email LIKE '%@%';
```

```check yaml
must_from: users
must_select_columns:
  - email
  - created_at
```

## Lesson: ORDER BY, LIMIT, and DISTINCT
`id: sql-order-limit, track: sql, sample: ecommerce.json`

### Step 1: Newest first
List `id` and `placed_at` for `orders`, with the most recent `placed_at` first. (Use `ORDER BY` with `DESC`.)

```sql starter
SELECT id, placed_at
FROM orders
```

```sql answer
SELECT id, placed_at
FROM orders
ORDER BY placed_at DESC;
```

```check yaml
must_from: orders
must_select_columns:
  - id
  - placed_at
```

### Step 2: Top 10 (LIMIT)
From `products`, return `id`, `title`, and `price_cents` for the **10 cheapest** products. Order by `price_cents` ascending, then `LIMIT` 10.

```sql answer
SELECT id, title, price_cents
FROM products
ORDER BY price_cents ASC
LIMIT 10;
```

```check yaml
must_from: products
must_select_columns:
  - id
  - title
  - price_cents
disallow:
  - cte
```

## Lesson: JOINs
`id: sql-joins, track: sql, sample: ecommerce.json`

### Step 1: Users and their orders
Return each **user email** together with the **order id** (`orders.id`). `INNER JOIN` `orders` to `users` on `orders.user_id = users.id` (or equivalent).

```sql starter
SELECT
FROM users u
```

```sql answer
SELECT u.email, o.id
FROM users u
INNER JOIN orders o ON o.user_id = u.id;
```

```check yaml
must_from: users
must_join_to: orders
must_select_columns:
  - email
  - id
```

### Step 2: Orphan order lines (LEFT JOIN)
Return each `order_items.id` and the matching `products.title` when a product link exists, but **include** `order_items` even when a join might not find a `products` row (in a well-formed DB they always will — the point is to practice `LEFT JOIN`).

In practice, use: `FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id`, and `SELECT` e.g. `oi.id, p.title`.

```sql answer
SELECT oi.id, p.title
FROM order_items oi
LEFT JOIN products p ON p.id = oi.product_id;
```

```check yaml
must_from: order_items
must_join_to: products
```

## Lesson: GROUP BY and aggregates
`id: sql-group, track: sql, sample: ecommerce.json`

### Step 1: How many line items per order?
Count rows in `order_items` **per** `order_id` using `GROUP BY order_id` and an aggregate (e.g. `COUNT(*)` as `n`).

```sql answer
SELECT order_id, COUNT(*) AS n
FROM order_items
GROUP BY order_id;
```

```check yaml
must_from: order_items
require_group_by: true
```

## Lesson: CTEs (WITH)
`id: sql-cte, track: sql, sample: ecommerce.json`

### Step 1: Name a subquery
Write a `WITH` clause (CTE) that selects `id` and `email` from `users` into a named CTE, then `SELECT` from that CTE.

Example pattern: `WITH u AS (SELECT id, email FROM users) SELECT email FROM u;`

```sql answer
WITH u AS (
  SELECT id, email
  FROM users
)
SELECT email
FROM u;
```

```check yaml
require_cte: true
must_cte: u
```

## Lesson: Add a many-to-many bridge table
`id: schema-book-tags, track: schema, sample: library.json`

### Step 1: New tables
Create a `tags` table for tag labels and a `book_tags` table that models **which books have which tags**.  
- `tags`: a primary key and a unique `name` (text) per tag.  
- `book_tags`: composite key via **two foreign keys** — to `books.id` and `tags.id` (both required). Index FK columns to match good practices.

```check yaml
table_must_exist: [tags, book_tags]
columns_by_table:
  tags:
    - name: id
      primaryKey: true
    - name: name
      notNull: true
      type_like: text
  book_tags:
    - name: book_id
      notNull: true
      foreignKey: { table: books, column: id }
      indexed: true
    - name: tag_id
      notNull: true
      foreignKey: { table: tags, column: id }
      indexed: true
```

```text answer
Expected shape:
- tags: id (PK), name (text, NOT NULL)
- book_tags: (book_id FK->books.id, tag_id FK->tags.id) both NOT NULL, indexed; typically you also add a SERIAL PK on book_tags or a composite unique(book_id, tag_id) in real systems — the automated check keys off FKs + common columns.
```

## Lesson: Link books to a category
`id: schema-book-category, track: schema, sample: library.json`

### Step 1: A categories table + FK
Create a new table `categories` with a surrogate key (`id`, PK) and a `name` (text, NOT NULL).  
Add a nullable `category_id` column on `books` that is a **foreign key** to `categories.id` and is **indexed**.

```check yaml
min_table_count: 6
table_must_exist: [categories]
columns_by_table:
  books:
    - name: category_id
      type_like: int
      foreignKey: { table: categories, column: id }
      indexed: true
  categories:
    - name: id
      primaryKey: true
    - name: name
      notNull: true
```

```text answer
- categories: id (PK), name
- books.category_id -> categories.id, nullable, with an index (good for look-ups and many DBs for FKs).
If your editor created the FK before the column name matched exactly, use the Table tab to match the spec.
```

### Step 2: Relationship present
The validator checks the FK; click **Check** after step 1 passes to confirm the relationship is still there.

```check yaml
relationships_must_include:
  - { fromTable: books, fromColumn: category_id, toTable: categories, toColumn: id }
```

```text answer
Success means inferRelationships() sees the FK: books.category_id -> categories.id.
```
