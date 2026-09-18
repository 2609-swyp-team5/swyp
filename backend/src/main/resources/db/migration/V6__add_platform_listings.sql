-- 번개장터 등 외부 플랫폼에서 수집한 개별 매물 스냅샷 저장.
-- (platform_id, external_item_id) 기준으로 매 크롤링마다 upsert, 시세 분석 고도화 및
-- 상품 상세 화면의 비교 매물 노출에 사용한다.
CREATE TABLE platform_listings (
    listing_id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    platform_id         BIGINT       NOT NULL,
    category_id         BIGINT       NOT NULL,
    external_item_id    VARCHAR(255) NOT NULL,
    title               VARCHAR(255) NOT NULL,
    price                BIGINT       NOT NULL,
    status               VARCHAR(50)  NOT NULL,
    image_url            TEXT,
    favorite_count       INT,
    chat_count           INT,
    platform_updated_at  TIMESTAMP,
    first_seen_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_at         TIMESTAMP    NOT NULL,
    created_at           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_platform_listings_platform FOREIGN KEY (platform_id) REFERENCES platforms (platform_id),
    CONSTRAINT fk_platform_listings_category FOREIGN KEY (category_id) REFERENCES categories (category_id),
    CONSTRAINT uk_platform_listings UNIQUE (platform_id, external_item_id),
    CONSTRAINT ck_platform_listings_price CHECK (price >= 0)
);
