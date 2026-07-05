-- IS NULL / IS NOT NULL: find orders without a dining table (takeout)
-- and customers who never provided an email.

SELECT
  o.id AS order_id,
  o.placed_at,
  c.name AS customer_name,
  c.email
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE o.dining_table_id IS NULL
  AND c.email IS NOT NULL
ORDER BY o.placed_at DESC;
