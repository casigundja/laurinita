-- Custom SQL migration file, put your code below! --
DROP TRIGGER IF EXISTS stock_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS stock_apply;
--> statement-breakpoint
DROP TRIGGER IF EXISTS movements_no_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS movements_no_delete;
--> statement-breakpoint
CREATE VIEW IF NOT EXISTS catalog_stock AS SELECT p.rowid AS sort_order,p.id,p.name,p.category,p.description,p.price,COALESCE(SUM(m.delta),0) AS stock,p.minimum,p.image,p.active FROM products p LEFT JOIN movements m ON m.product_id=p.id GROUP BY p.id;
