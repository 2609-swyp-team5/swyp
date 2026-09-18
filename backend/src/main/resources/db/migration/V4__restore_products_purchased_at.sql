ALTER TABLE products ADD COLUMN purchased_at DATE;
ALTER TABLE products ADD CONSTRAINT ck_products_purchased_at CHECK (purchased_at <= CURRENT_DATE);
