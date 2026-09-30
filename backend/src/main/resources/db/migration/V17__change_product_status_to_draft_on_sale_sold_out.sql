-- 상품 판매 상태를 DRAFT(등록됨, 외부 미게시) / ON_SALE(외부 플랫폼 게시) / SOLD_OUT(품절) 3가지로 재정의한다.
-- RESERVED(예약중)·HIDDEN(숨김)은 제거한다. PostgreSQL ENUM은 값을 삭제할 수 없어 타입을 다시 만든다.
--
-- 기존 데이터 이전 규칙:
--   - SOLD_OUT은 그대로
--   - ON_SALE/RESERVED/HIDDEN은 외부 플랫폼 게시 기록(product_platforms.status = POSTED)이 있으면 ON_SALE, 없으면 DRAFT

ALTER TABLE products ALTER COLUMN status DROP DEFAULT;
ALTER TABLE products ALTER COLUMN status TYPE VARCHAR(20) USING status::text;

UPDATE products p
SET status = CASE
                 WHEN EXISTS (SELECT 1
                              FROM product_platforms pp
                              WHERE pp.product_id = p.product_id
                                AND pp.status = 'POSTED') THEN 'ON_SALE'
                 ELSE 'DRAFT'
             END
WHERE p.status IN ('ON_SALE', 'RESERVED', 'HIDDEN');

DROP TYPE product_status;
CREATE TYPE product_status AS ENUM ('DRAFT', 'ON_SALE', 'SOLD_OUT');

ALTER TABLE products ALTER COLUMN status TYPE product_status USING status::product_status;
ALTER TABLE products ALTER COLUMN status SET DEFAULT 'DRAFT';

COMMENT ON TYPE product_status IS '상품 판매 상태 (DRAFT: 등록됨·외부 미게시, ON_SALE: 외부 플랫폼 게시, SOLD_OUT: 품절)';
