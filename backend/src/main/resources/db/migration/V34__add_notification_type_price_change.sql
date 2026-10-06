-- notification_type ENUM에 시세 변동 알림 추가: SELL_PRICE_CHANGE(내 판매 상품 — 판매자), BUY_PRICE_CHANGE(관심상품 — 관심 등록 회원)
ALTER TYPE notification_type ADD VALUE 'SELL_PRICE_CHANGE';
ALTER TYPE notification_type ADD VALUE 'BUY_PRICE_CHANGE';

COMMENT ON TYPE notification_type IS '알림 유형 (SELL, HOLD, BUY, WAIT, NOTICE, TARGET_PRICE, PLATFORM_EXPIRED, SELL_PRICE_CHANGE, BUY_PRICE_CHANGE)';
