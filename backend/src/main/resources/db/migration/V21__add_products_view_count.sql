-- 상품 조회수(판매 관리 화면 표시용). 판매자 본인 조회는 제외하고, 같은 회원은 24시간에 1번만 센다(중복 판별은 Redis).
ALTER TABLE products ADD COLUMN view_count BIGINT NOT NULL DEFAULT 0;
ALTER TABLE products ADD CONSTRAINT chk_products_view_count CHECK (view_count >= 0);

COMMENT ON COLUMN products.view_count IS '조회수(판매자 본인 제외, 회원당 24시간 1회)';
