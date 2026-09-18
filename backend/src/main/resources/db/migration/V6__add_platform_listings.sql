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
    listing_url          TEXT,
    created_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_platform_listings_platform FOREIGN KEY (platform_id) REFERENCES platforms (platform_id),
    CONSTRAINT fk_platform_listings_category FOREIGN KEY (category_id) REFERENCES categories (category_id),
    CONSTRAINT uk_platform_listings UNIQUE (platform_id, external_item_id),
    CONSTRAINT ck_platform_listings_price CHECK (price >= 0)
);

COMMENT ON COLUMN platform_listings.platform_id IS '수집 대상 플랫폼(번개장터 등)';
COMMENT ON COLUMN platform_listings.category_id IS '크롤링 당시 매핑된 우리 카테고리';
COMMENT ON COLUMN platform_listings.external_item_id IS '플랫폼 원본 게시글 ID(번개장터 pid). (platform_id, external_item_id) 조합이 upsert 키';
COMMENT ON COLUMN platform_listings.title IS '매물 제목(원본 그대로)';
COMMENT ON COLUMN platform_listings.price IS '매물 가격(원)';
COMMENT ON COLUMN platform_listings.status IS '플랫폼이 제공하는 판매 상태 원본 값(예: SELLING). enum이 아닌 이유는 외부 값이라 우리가 종류를 통제할 수 없기 때문';
COMMENT ON COLUMN platform_listings.image_url IS '매물 대표 썸네일 이미지 URL(목록 API 기준 1장). 번개장터는 {res} 해상도 플레이스홀더가 포함될 수 있음';
COMMENT ON COLUMN platform_listings.listing_url IS '원본 매물 상세 페이지 링크. 상세 이미지 등은 이 링크로 이동해 번개장터 화면에서 확인';
COMMENT ON COLUMN platform_listings.created_at IS '이 매물을 최초로 수집한 시각(고정, 갱신 안 됨)';
COMMENT ON COLUMN platform_listings.last_seen_at IS '가장 최근 크롤링에서 이 매물이 관측될 때마다 갱신. 오래 갱신되지 않으면 판매완료/삭제로 추정 가능';
