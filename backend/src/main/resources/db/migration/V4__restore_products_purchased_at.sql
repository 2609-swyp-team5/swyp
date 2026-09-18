ALTER TABLE products ADD COLUMN purchased_at DATE;
ALTER TABLE products ADD CONSTRAINT ck_products_purchased_at CHECK (purchased_at <= CURRENT_DATE);

-- 시세 데이터 수집은 작업 전 저장되므로 nullable로 변경
ALTER TABLE product_analysis ALTER COLUMN recommendation DROP NOT NULL;

-- 카테고리 ↔ 외부 플랫폼 카테고리 매핑. application.yaml에 플랫폼별 컬럼(bunjang_category_id 등)을
-- 계속 추가하는 대신, 플랫폼이 늘어도 스키마 변경 없이 row만 추가하면 되도록 테이블로 분리
CREATE TABLE category_platforms (
    category_platform_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    category_id             BIGINT       NOT NULL,
    platform_id             BIGINT       NOT NULL,
    external_category_id    VARCHAR(255) NOT NULL,
    created_at               TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at               TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_category_platforms_category FOREIGN KEY (category_id) REFERENCES categories (category_id),
    CONSTRAINT fk_category_platforms_platform FOREIGN KEY (platform_id) REFERENCES platforms (platform_id),
    CONSTRAINT uk_category_platforms UNIQUE (category_id, platform_id)
);

INSERT INTO platforms (name, is_active, is_crawl) VALUES ('번개장터', TRUE, TRUE);

INSERT INTO category_platforms (category_id, platform_id, external_category_id)
SELECT mapping.category_id, bunjang.platform_id, mapping.external_category_id
FROM (VALUES
    (1, '310'),
    (2, '320'),
    (3, '405'),
    (4, '430'),
    (5, '421'),
    (6, '422'),
    (7, '400'),
    (8, '410'),
    (9, '600'),
    (10, '610'),
    (11, '700'),
    (12, '910'),
    (13, '930'),
    (14, '940'),
    (15, '920'),
    (16, '900'),
    (17, '990'),
    (18, '810'),
    (19, '800'),
    (20, '830'),
    (21, '820'),
    (22, '500'),
    (23, '980'),
    (24, '210'),
    (25, '999'),
    (30, '310200'),
    (33, '320120'),
    (34, '320160'),
    (44, '430300'),
    (48, '422100'),
    (55, '400080'),
    (60, '410600'),
    (61, '610700'),
    (63, '600100'),
    (65, '600300'),
    (67, '600720'),
    (74, '700650'),
    (83, '930100'),
    (85, '930200'),
    (90, '920100'),
    (105, '810100500'),
    (112, '830100'),
    (113, '830200'),
    (116, '820100'),
    (118, '820200'),
    (120, '500117'),
    (133, '610700003'),
    (137, '600100001'),
    (144, '600300002'),
    (145, '600300001'),
    (169, '600200009'),
    (171, '610500009'),
    (172, '610500007'),
    (182, '500120006')
) AS mapping(category_id, external_category_id)
CROSS JOIN (SELECT platform_id FROM platforms WHERE name = '번개장터') AS bunjang;
