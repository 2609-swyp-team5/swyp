-- 관심 등록된 외부 플랫폼 수집 매물도 시세 분석 대상이 되도록 확장.
-- product_analysis / notifications 모두 product_id·listing_id 중 하나를 대상으로 삼는다.

-- 시세 분석 스냅샷: 우리 상품 또는 외부 매물 중 정확히 하나
ALTER TABLE product_analysis
    ALTER COLUMN product_id DROP NOT NULL,
    ADD COLUMN listing_id BIGINT,
    ADD CONSTRAINT fk_product_analysis_listing FOREIGN KEY (listing_id) REFERENCES platform_listings (listing_id),
    ADD CONSTRAINT ck_product_analysis_target_exactly_one CHECK (
        (product_id IS NOT NULL AND listing_id IS NULL) OR (product_id IS NULL AND listing_id IS NOT NULL)
    );

COMMENT ON COLUMN product_analysis.listing_id IS '분석 대상 외부 플랫폼 수집 매물(product_id와 배타적, 둘 중 정확히 하나만 NOT NULL)';

CREATE INDEX idx_product_analysis_listing_id_analyzed_at
    ON product_analysis (listing_id, analyzed_at DESC) WHERE listing_id IS NOT NULL;

-- 알림: 외부 매물 대상 알림이면 listing_id를 채운다(공지성 알림은 둘 다 NULL일 수 있어 CHECK는 두지 않음)
ALTER TABLE notifications
    ADD COLUMN listing_id BIGINT,
    ADD CONSTRAINT fk_notifications_listing FOREIGN KEY (listing_id) REFERENCES platform_listings (listing_id),
    ADD CONSTRAINT ck_notifications_target_at_most_one CHECK (product_id IS NULL OR listing_id IS NULL);

COMMENT ON COLUMN notifications.listing_id IS '알림 대상 외부 플랫폼 수집 매물(product_id와 동시에 채워지지 않음, 상품과 무관한 알림이면 NULL)';
