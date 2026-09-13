-- ==========================================
-- ENUM
-- ==========================================

-- 사용자 권한 (USER : 일반 사용자, ADMIN: 관리자)
CREATE TYPE user_role AS ENUM ('USER', 'ADMIN');
-- 사용자 상태 (ACTIVE : 활성, SUSPENDED : 정지, DELETED : 탈퇴)
CREATE TYPE user_status AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');
-- 상품 판매 상태 (ON_SALE : 판매중, RESERVED : 예약중, SOLD_OUT : 품절, HIDDEN : 숨김)
CREATE TYPE product_status AS ENUM ('ON_SALE', 'RESERVED', 'SOLD_OUT', 'HIDDEN');
-- 알림 유형 (SELL : 판매 알림, HOLD : 보류 알림, BUY : 구매 알림, NOTICE : 공지 알림)
CREATE TYPE notification_type AS ENUM ('SELL', 'HOLD', 'BUY', 'NOTICE');
-- 시세 분석 추천 (SELL : 판매 추천, HOLD : 보류 추천, BUY : 구매 추천, WAIT : 관망 추천)
CREATE TYPE analysis_recommendation AS ENUM ('SELL', 'HOLD', 'BUY', 'WAIT');
-- 가격 예측 기간 (1M : 1개월, 3M : 3개월, 6M : 6개월)
CREATE TYPE forecast_period AS ENUM ('1M', '3M', '6M');
-- 회원-플랫폼 연동 상태 (CONNECTED : 연결됨, EXPIRED : 만료됨, DISCONNECTED : 연결 끊김)
CREATE TYPE member_platform_status AS ENUM ('CONNECTED', 'EXPIRED', 'DISCONNECTED');
-- 상품-플랫폼 게시 상태 (POSTING : 게시중, POSTED : 게시, FAILED : 실패, REMOVED : 제거)
CREATE TYPE product_platform_status AS ENUM ('POSTING', 'POSTED', 'FAILED', 'REMOVED');
-- 상품 상태 등급 (AI 사진 판정 기준, S/A/B/C)
CREATE TYPE product_condition AS ENUM ('S', 'A', 'B', 'C');
-- 거래 방식 (DIRECT : 직거래, DELIVERY : 택배거래)
CREATE TYPE trade_method AS ENUM ('DIRECT', 'DELIVERY');
-- 택배거래 배송비 부담 방식 (INCLUDED : 판매가에 포함, PREPAID : 선불 별도 부담)
CREATE TYPE delivery_type AS ENUM ('INCLUDED', 'PREPAID');

-- ==========================================
-- TABLE
-- ==========================================

-- 회원
CREATE TABLE members (
    member_id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email             VARCHAR(255) NOT NULL,
    phone             VARCHAR(20),
    password          VARCHAR(255),
    name              VARCHAR(50)  NOT NULL,
    profile_image_url TEXT,
    nickname          VARCHAR(30)  NOT NULL,
    role              user_role    NOT NULL DEFAULT 'USER',
    status            user_status  DEFAULT 'ACTIVE',
    created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_members_email UNIQUE (email),
    CONSTRAINT uk_members_phone UNIQUE (phone)
);


-- 소셜 인증
CREATE TABLE socials (
    social_id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    provider        VARCHAR(50)     NOT NULL,
    provider_id     VARCHAR(255),
    member_id       BIGINT          NOT NULL,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_socials_member FOREIGN KEY (member_id) REFERENCES members (member_id),
    CONSTRAINT uk_socials_provider UNIQUE (provider, provider_id)
);

-- 카테고리
CREATE TABLE categories (
    category_id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name            VARCHAR(50)     NOT NULL,
    parent_id       BIGINT,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id) REFERENCES categories (category_id),
    CONSTRAINT uk_categories_name UNIQUE (name)
);

-- 상품
CREATE TABLE products (
    product_id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    price                   BIGINT            NOT NULL,
    title                   VARCHAR(100)      NOT NULL,
    member_id               BIGINT            NOT NULL,
    category_id             BIGINT            NOT NULL,
    purchased_at            DATE,
    condition               product_condition NOT NULL,
    has_defect              BOOLEAN           NOT NULL DEFAULT FALSE,
    allow_price_suggestion  BOOLEAN           NOT NULL DEFAULT FALSE,
    trade_method            trade_method      NOT NULL,
    delivery_type           delivery_type,
    preferred_trade_region  VARCHAR(100),
    description             TEXT,
    status                  product_status    NOT NULL DEFAULT 'ON_SALE',
    created_at              TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_products_member FOREIGN KEY (member_id) REFERENCES members (member_id),
    CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories (category_id),
    CONSTRAINT ck_products_price CHECK (price >= 0)
);

-- 상품 이미지
CREATE TABLE product_images (
    image_id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    image_url       TEXT            NOT NULL,
    image_order     BIGINT          NOT NULL DEFAULT 1,
    product_id      BIGINT          NOT NULL,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_product_images_product FOREIGN KEY (product_id) REFERENCES products (product_id),
    CONSTRAINT ck_product_images_order CHECK (image_order >= 1),
    CONSTRAINT uk_product_images_order UNIQUE (product_id, image_order)
);

-- 구성품 마스터
CREATE TABLE components (
    component_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name            VARCHAR(50)     NOT NULL,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_components_name UNIQUE (name)
);

-- 상품 구성품 중간 테이블(중복 제거용)
CREATE TABLE product_components (
    product_component_id  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    component_id          BIGINT    NOT NULL,
    product_id            BIGINT    NOT NULL,
    created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_product_components_component FOREIGN KEY (component_id) REFERENCES components (component_id),
    CONSTRAINT fk_product_components_product FOREIGN KEY (product_id) REFERENCES products (product_id),
    CONSTRAINT uk_product_components UNIQUE (component_id, product_id)
);

-- 상품 태그
CREATE TABLE tags (
    tag_id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name            VARCHAR(50)     NOT NULL,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_tags_name UNIQUE (name)
);

-- 상품 태그 중간 테이블(중복 제거용)
CREATE TABLE product_tags (
    product_tag_id  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tag_id          BIGINT          NOT NULL,
    product_id      BIGINT          NOT NULL,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_product_tags_tag FOREIGN KEY (tag_id) REFERENCES tags (tag_id),
    CONSTRAINT fk_product_tags_product FOREIGN KEY (product_id) REFERENCES products (product_id),
    CONSTRAINT uk_product_tags UNIQUE (tag_id, product_id)
);

-- 관심상품
CREATE TABLE interests (
    interest_id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    target_price    BIGINT,
    product_id      BIGINT          NOT NULL,
    member_id       BIGINT          NOT NULL,
    notified_at     TIMESTAMP,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_interests_product FOREIGN KEY (product_id) REFERENCES products (product_id),
    CONSTRAINT fk_interests_member FOREIGN KEY (member_id) REFERENCES members (member_id),
    CONSTRAINT ck_interests_target_price CHECK (target_price >= 0),
    CONSTRAINT uk_interests_member_product UNIQUE (member_id, product_id)
);

-- 알림
CREATE TABLE notifications (
    notification_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    message         TEXT               NOT NULL,
    title           VARCHAR(100)       NOT NULL,
    is_read         BOOLEAN            NOT NULL DEFAULT FALSE,
    type            notification_type  NOT NULL,
    member_id       BIGINT             NOT NULL,
    product_id      BIGINT,
    created_at      TIMESTAMP          NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP          NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notifications_member FOREIGN KEY (member_id) REFERENCES members (member_id),
    CONSTRAINT fk_notifications_product FOREIGN KEY (product_id) REFERENCES products (product_id)
);

-- 상품 분석
CREATE TABLE product_analysis (
    analysis_id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    recommendation      analysis_recommendation NOT NULL,
    suggested_price     BIGINT,
    average_price       BIGINT                  NOT NULL,
    description         TEXT,
    max_price           BIGINT                  NOT NULL,
    change_rate         NUMERIC(7, 4),
    min_price           BIGINT                  NOT NULL,
    product_id          BIGINT                  NOT NULL,
    analyzed_at         TIMESTAMP               NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at          TIMESTAMP               NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP               NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_product_analysis_product FOREIGN KEY (product_id) REFERENCES products (product_id),
    CONSTRAINT ck_product_analysis_suggested_price CHECK (suggested_price >= 0),
    CONSTRAINT ck_product_analysis_average_price CHECK (average_price >= 0),
    CONSTRAINT ck_product_analysis_max_price CHECK (max_price >= 0),
    CONSTRAINT ck_product_analysis_min_price CHECK (min_price >= 0),
    CONSTRAINT ck_product_analysis_change_rate CHECK (change_rate >= -1)
);

-- 상품 가격 예측
CREATE TABLE price_forecasts (
    forecast_id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    analysis_id     BIGINT          NOT NULL,
    expected_price  BIGINT          NOT NULL,
    period          forecast_period NOT NULL,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_price_forecasts_analysis FOREIGN KEY (analysis_id) REFERENCES product_analysis (analysis_id),
    CONSTRAINT ck_price_forecasts_expected_price CHECK (expected_price >= 0),
    CONSTRAINT uk_price_forecasts UNIQUE (analysis_id, period)
);

-- 플랫폼 연동
CREATE TABLE platforms (
    platform_id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name            VARCHAR(50)     NOT NULL,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    is_crawl        BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_platforms_name UNIQUE (name)
);

-- 회원 플랫폼 연동 이력
CREATE TABLE member_platforms (
    member_platform_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    member_id            BIGINT                 NOT NULL,
    platform_id          BIGINT                 NOT NULL,
    session_token        TEXT,
    status               member_platform_status NOT NULL DEFAULT 'CONNECTED',
    created_at           TIMESTAMP              NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP              NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_member_platforms_member FOREIGN KEY (member_id) REFERENCES members (member_id),
    CONSTRAINT fk_member_platforms_platform FOREIGN KEY (platform_id) REFERENCES platforms (platform_id),
    CONSTRAINT uk_member_platforms UNIQUE (member_id, platform_id)
);

-- 상품 플랫폼 연동 이력
CREATE TABLE product_platforms (
    product_platform_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    member_platform_id  BIGINT                  NOT NULL,
    product_id          BIGINT                  NOT NULL,
    external_product_id VARCHAR(255),
    status              product_platform_status NOT NULL DEFAULT 'POSTING',
    product_url         TEXT,
    created_at          TIMESTAMP               NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP               NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_product_platforms_member_platform FOREIGN KEY (member_platform_id) REFERENCES member_platforms (member_platform_id),
    CONSTRAINT fk_product_platforms_product FOREIGN KEY (product_id) REFERENCES products (product_id),
    CONSTRAINT uk_product_platforms UNIQUE (product_id, member_platform_id)
);


-- ==========================================
-- INDEXES
-- ==========================================

CREATE INDEX idx_products_member_id ON products (member_id);
CREATE INDEX idx_products_category_id ON products (category_id);
CREATE INDEX idx_product_analysis_product_id_analyzed_at ON product_analysis (product_id, analyzed_at DESC);
CREATE INDEX idx_notifications_member_id ON notifications (member_id);
CREATE INDEX idx_product_tags_product_id ON product_tags (product_id);
CREATE INDEX idx_product_components_product_id ON product_components (product_id);
CREATE INDEX idx_socials_member_id ON socials (member_id);

-- ==========================================
-- COMMENT
-- ==========================================

COMMENT ON TYPE user_role IS '사용자 권한 (USER, ADMIN)';
COMMENT ON TYPE user_status IS '사용자 상태 (ACTIVE, SUSPENDED, DELETED)';
COMMENT ON TYPE product_status IS '상품 판매 상태 (ON_SALE, RESERVED, SOLD_OUT, HIDDEN)';
COMMENT ON TYPE notification_type IS '알림 유형 (SELL, HOLD, BUY, NOTICE)';
COMMENT ON TYPE analysis_recommendation IS '시세 분석 추천 (SELL, HOLD, BUY, WAIT)';
COMMENT ON TYPE forecast_period IS '가격 예측 기간 (1M, 3M, 6M)';
COMMENT ON TYPE member_platform_status IS '회원-플랫폼 연동 상태 (CONNECTED, EXPIRED, DISCONNECTED)';
COMMENT ON TYPE product_platform_status IS '상품-플랫폼 게시 상태 (POSTING, POSTED, FAILED, REMOVED)';
COMMENT ON TYPE product_condition IS '상품 상태 등급 (AI 사진 판정 기준, S/A/B/C)';
COMMENT ON TYPE trade_method IS '거래 방식 (DIRECT, DELIVERY)';
COMMENT ON TYPE delivery_type IS '택배거래 배송비 부담 방식 (INCLUDED, PREPAID)';
