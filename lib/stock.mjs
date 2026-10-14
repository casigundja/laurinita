// A failed stock check produces NULL in a NOT NULL column, aborting the batch.
// ON CONFLICT handles only duplicate event keys, never suppressing stock errors.
export const movementSql = `INSERT INTO movements(id,product_id,delta,reason,actor,created,order_id,event_key)
SELECT ?,?,CASE WHEN EXISTS(SELECT 1 FROM movements WHERE event_key=?) OR EXISTS(SELECT 1 FROM catalog_stock WHERE id=? AND stock+?>=0) THEN ? ELSE NULL END,?,?,?,?,?
WHERE ? IS NULL OR EXISTS(SELECT 1 FROM orders WHERE id=? AND status=?)
ON CONFLICT(event_key) DO NOTHING`;
