-- notification_type ENUM에 WAIT(구매 보류 추천 알림) 추가 (SELL/HOLD/BUY/WAIT/NOTICE)
ALTER TYPE notification_type ADD VALUE 'WAIT';

COMMENT ON TYPE notification_type IS '알림 유형 (SELL, HOLD, BUY, WAIT, NOTICE)';
