-- FULL OUTER JOIN: all staff paired with all shifts to find unscheduled staff
-- and shifts with no assigned person (useful for coverage gaps).

SELECT
  st.name AS staff_name,
  r.name AS role_name,
  sh.starts_at,
  sh.ends_at
FROM staff st
FULL OUTER JOIN shifts sh ON sh.staff_id = st.id
LEFT JOIN roles r ON r.id = st.role_id
ORDER BY sh.starts_at NULLS LAST, st.name;
