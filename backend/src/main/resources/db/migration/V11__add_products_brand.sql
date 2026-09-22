-- 상품 브랜드(선택) 추가
ALTER TABLE products ADD COLUMN brand VARCHAR(50);
COMMENT ON COLUMN products.brand IS '브랜드(선택)';
