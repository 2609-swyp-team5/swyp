ALTER TABLE products
    ADD COLUMN delivery_fee BIGINT;

ALTER TABLE products
    ADD CONSTRAINT ck_products_delivery_fee_range
        CHECK (delivery_fee IS NULL OR (delivery_fee >= 2700 AND delivery_fee <= 17000));
