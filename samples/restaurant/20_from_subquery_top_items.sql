-- FROM subquery (derived table): find which kitchen stations prepare
-- the top-selling items.

SELECT
  ks.name AS station,
  top_items.item_name,
  top_items.total_qty
FROM (
  SELECT
    mi.kitchen_station_id,
    mi.name AS item_name,
    SUM(ol.qty) AS total_qty
  FROM order_lines ol
  JOIN menu_items mi ON mi.id = ol.menu_item_id
  GROUP BY mi.kitchen_station_id, mi.name
  ORDER BY total_qty DESC
  LIMIT 5
) AS top_items
JOIN kitchen_stations ks ON ks.id = top_items.kitchen_station_id
ORDER BY top_items.total_qty DESC;
