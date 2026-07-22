-- RIGHT JOIN: find promotions that have never been used on any order.

SELECT
  p.id AS promo_id,
  p.code,
  p.discount_pct,
  p.valid_from,
  p.valid_to,
  COUNT(op.order_id) AS times_used
FROM order_promotions op
RIGHT JOIN promotions p ON p.id = op.promotion_id
GROUP BY p.id, p.code, p.discount_pct, p.valid_from, p.valid_to
HAVING COUNT(op.order_id) = 0
ORDER BY p.valid_from;
