-- OFFSET: paginated list of orders (page 3, 10 per page).

SELECT
  o.id AS order_id,
  o.placed_at,
  os.name AS status,
  c.name AS customer_name
FROM orders o
JOIN order_statuses os ON os.id = o.order_status_id
JOIN customers c ON c.id = o.customer_id
ORDER BY o.placed_at DESC
LIMIT 10
OFFSET 20;
