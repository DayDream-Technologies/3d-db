-- DISTINCT: unique payment methods used by each customer.

SELECT DISTINCT
  c.name AS customer_name,
  p.method
FROM customers c
JOIN orders o ON o.customer_id = c.id
JOIN payments p ON p.order_id = o.id
WHERE p.method <> 'pending'
ORDER BY c.name, p.method;
