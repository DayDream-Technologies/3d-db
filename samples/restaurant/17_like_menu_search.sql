-- LIKE / NOT LIKE: search menu items by keyword, excluding beverages.

SELECT
  mi.id,
  mi.name,
  mc.name AS category,
  mi.price_cents
FROM menu_items mi
JOIN menu_categories mc ON mc.id = mi.category_id
WHERE mi.name LIKE '%sal%'
  AND mc.name NOT LIKE '%Beverage%'
ORDER BY mi.name;
