-- 회원별 알림 설정 — 행이 없으면 기본값으로 본다(설정을 처음 바꿀 때 행 생성)
CREATE TABLE notification_settings (
    member_id               BIGINT    PRIMARY KEY,
    recommendation_enabled  BOOLEAN   NOT NULL DEFAULT TRUE,
    target_price_enabled    BOOLEAN   NOT NULL DEFAULT TRUE,
    platform_expiry_enabled BOOLEAN   NOT NULL DEFAULT TRUE,
    marketing_enabled       BOOLEAN   NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notification_settings_member FOREIGN KEY (member_id) REFERENCES members (member_id) ON DELETE CASCADE
);

COMMENT ON TABLE notification_settings IS '회원별 알림 수신 설정. 행이 없는 회원은 컬럼 기본값과 같은 설정으로 취급';
COMMENT ON COLUMN notification_settings.recommendation_enabled IS 'AI 추천 타이밍 알림(SELL/HOLD/BUY/WAIT). false면 추천 전환 알림을 만들지 않음';
COMMENT ON COLUMN notification_settings.target_price_enabled IS '관심상품 목표가 도달 알림(TARGET_PRICE). false면 만들지 않음';
COMMENT ON COLUMN notification_settings.platform_expiry_enabled IS '외부 플랫폼 연동 만료 알림. 알림 기능 추가 전까지 저장만';
COMMENT ON COLUMN notification_settings.marketing_enabled IS '마케팅·이벤트 알림 수신 동의. 알림 기능 추가 전까지 저장만';
