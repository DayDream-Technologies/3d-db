-- UNION: combine customers with upcoming reservations and those on the waitlist.

SELECT
  c.name,
  c.phone,
  'reservation' AS contact_reason,
  r.start_at AS scheduled_at
FROM customers c
JOIN reservations r ON r.customer_id = c.id
JOIN reservation_statuses rs ON rs.id = r.reservation_status_id
WHERE rs.code IN ('requested', 'confirmed')

UNION ALL

SELECT
  c.name,
  c.phone,
  'waitlist' AS contact_reason,
  w.requested_at AS scheduled_at
FROM customers c
JOIN waitlist w ON w.customer_id = c.id
JOIN waitlist_statuses ws ON ws.id = w.waitlist_status_id
WHERE ws.code = 'waiting'

ORDER BY scheduled_at;
