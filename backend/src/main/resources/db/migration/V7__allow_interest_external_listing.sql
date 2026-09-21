-- 관심상품(interests)이 우리 회원 상품뿐 아니라 외부 플랫폼(번개장터 등) 수집 매물도 대상으로
-- 삼을 수 있도록 확장. product_id/listing_id 중 정확히 하나만 채워진다.
ALTER TABLE interests
    ALTER COLUMN product_id DROP NOT NULL,
    ADD COLUMN listing_id BIGINT,
    ADD CONSTRAINT fk_interests_listing FOREIGN KEY (listing_id) REFERENCES platform_listings (listing_id),
    ADD CONSTRAINT ck_interests_target_exactly_one CHECK (
        (product_id IS NOT NULL AND listing_id IS NULL) OR (product_id IS NULL AND listing_id IS NOT NULL)
    );

COMMENT ON COLUMN interests.listing_id IS '외부 플랫폼 수집 매물 대상(product_id와 배타적, 둘 중 정확히 하나만 NOT NULL)';

-- 기존 UNIQUE(member_id, product_id)는 product_id가 nullable이 되며 의미가 사라지므로
-- source별 부분 유니크 인덱스 2개로 교체.
ALTER TABLE interests DROP CONSTRAINT uk_interests_member_product;

CREATE UNIQUE INDEX uk_interests_member_product ON interests (member_id, product_id) WHERE product_id IS NOT NULL;
CREATE UNIQUE INDEX uk_interests_member_listing ON interests (member_id, listing_id) WHERE listing_id IS NOT NULL;
