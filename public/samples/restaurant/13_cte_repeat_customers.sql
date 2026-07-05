-- CTE: customers who ordered more than once, with their total spend.

WITH repeat_buyers AS (
  SELECT
    c.id,
    c.name,
    COUNT(o.id) AS order_count,
    SUM(ol.qty * ol.unit_price_cents) AS lifetime_cents
  FROM customers c
  JOIN orders o ON o.customer_id = c.id
  JOIN order_lines ol ON ol.order_id = o.id
  GROUP BY c.id, c.name
  HAVING COUNT(o.id) > 1
)
SELECT
  rb.name,
  rb.order_count,
  rb.lifetime_cents
FROM repeat_buyers rb
ORDER BY rb.lifetime_cents DESC;
