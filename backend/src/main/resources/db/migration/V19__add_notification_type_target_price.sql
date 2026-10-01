-- notification_type ENUM에 TARGET_PRICE(관심상품 목표가 도달 알림) 추가 (SELL/HOLD/BUY/WAIT/NOTICE/TARGET_PRICE)
ALTER TYPE notification_type ADD VALUE 'TARGET_PRICE';

COMMENT ON TYPE notification_type IS '알림 유형 (SELL, HOLD, BUY, WAIT, NOTICE, TARGET_PRICE)';
