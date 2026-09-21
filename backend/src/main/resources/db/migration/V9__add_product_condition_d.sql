-- product_condition ENUM에 D등급 추가 (S/A/B/C/D)
ALTER TYPE product_condition ADD VALUE 'D';

COMMENT ON TYPE product_condition IS '상품 상태 등급 (AI 사진 판정 기준, S/A/B/C/D)';
