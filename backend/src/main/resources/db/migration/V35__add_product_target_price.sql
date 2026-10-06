-- 판매자 목표 판매가: 최근 시세 분석 평균가가 목표가 이상이 되면 판매자에게 알림(SELL_TARGET_PRICE)을 1번 보낸다
ALTER TABLE products ADD COLUMN target_price BIGINT;
ALTER TABLE products ADD COLUMN target_price_notified_at TIMESTAMP;
ALTER TABLE products ADD CONSTRAINT ck_products_target_price CHECK (target_price > 0);

COMMENT ON COLUMN products.target_price IS '판매자 목표 판매가(선택). 최근 시세 분석 평균가가 이 값 이상이면 알림';
COMMENT ON COLUMN products.target_price_notified_at IS '목표 판매가 도달 알림을 보낸 시각. 평균가가 다시 목표가 아래로 내려가거나 목표가를 바꾸면 NULL';

-- notification_type ENUM에 SELL_TARGET_PRICE(내 상품 평균 시세가 목표 판매가 이상 — 판매자) 추가
ALTER TYPE notification_type ADD VALUE 'SELL_TARGET_PRICE';

COMMENT ON TYPE notification_type IS '알림 유형 (SELL, HOLD, BUY, WAIT, NOTICE, TARGET_PRICE, PLATFORM_EXPIRED, SELL_PRICE_CHANGE, BUY_PRICE_CHANGE, SELL_TARGET_PRICE)';
