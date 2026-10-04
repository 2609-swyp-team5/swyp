-- 시세 변동 알림 수신 설정 추가(알림 기능 추가 전까지 저장만)
ALTER TABLE notification_settings ADD COLUMN price_change_enabled BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN notification_settings.price_change_enabled IS '등록한 물건 시세 변동 알림. 알림 기능 추가 전까지 저장만';
