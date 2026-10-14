-- Custom SQL migration file, put your code below! --
CREATE TRIGGER stock_guard BEFORE INSERT ON movements
WHEN NOT EXISTS (SELECT 1 FROM movements WHERE event_key=NEW.event_key)
BEGIN
 SELECT CASE WHEN NEW.delta=0 OR NEW.delta != CAST(NEW.delta AS INTEGER) THEN RAISE(ABORT,'invalid_quantity') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM products WHERE id=NEW.product_id AND stock+NEW.delta>=0) THEN RAISE(ABORT,'insufficient_stock') END;
END;
--> statement-breakpoint
CREATE TRIGGER stock_apply AFTER INSERT ON movements
BEGIN
 UPDATE products SET stock=stock+NEW.delta WHERE id=NEW.product_id;
END;
--> statement-breakpoint
CREATE TRIGGER movements_no_update BEFORE UPDATE ON movements
BEGIN SELECT RAISE(ABORT,'immutable_movement'); END;
--> statement-breakpoint
CREATE TRIGGER movements_no_delete BEFORE DELETE ON movements
BEGIN SELECT RAISE(ABORT,'immutable_movement'); END;
--> statement-breakpoint
CREATE INDEX movements_product_date ON movements(product_id,created);
--> statement-breakpoint
CREATE INDEX orders_user_date ON orders(user_id,created);
