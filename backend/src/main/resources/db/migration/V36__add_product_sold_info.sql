-- 판매자가 판매 완료(SOLD_OUT)로 바꿀 때 직접 입력하는 최종 판매 정보(가격·플랫폼). 게시 플랫폼(product_platforms)과는 별개다.
ALTER TABLE products ADD COLUMN sold_price BIGINT;
ALTER TABLE products ADD COLUMN sold_platform VARCHAR(30);
ALTER TABLE products ADD CONSTRAINT ck_products_sold_price CHECK (sold_price >= 0);

COMMENT ON COLUMN products.sold_price IS '최종 판매 가격(선택). 판매 완료로 바꿀 때 판매자가 입력, 다른 상태로 바꾸면 NULL';
COMMENT ON COLUMN products.sold_platform IS '최종 판매 플랫폼명(선택, 자유 입력 예: 번개장터·당근). 판매 완료로 바꿀 때 판매자가 입력(게시 플랫폼과 달라도 됨), 다른 상태로 바꾸면 NULL';
