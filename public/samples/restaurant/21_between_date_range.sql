-- BETWEEN: orders placed in a specific date range with total line amounts.

SELECT
  o.id AS order_id,
  o.placed_at,
  c.name AS customer_name,
  SUM(ol.qty * ol.unit_price_cents) AS total_cents
FROM orders o
JOIN customers c ON c.id = o.customer_id
JOIN order_lines ol ON ol.order_id = o.id
WHERE o.placed_at BETWEEN '2026-04-01' AND '2026-04-30'
GROUP BY o.id, o.placed_at, c.name
ORDER BY o.placed_at;
