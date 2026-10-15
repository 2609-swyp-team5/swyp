-- 카테고리별 추가 항목(사이즈·용량·사용기한 등 — 번개장터 등록 화면 기준). 상품 등록·수정 시 입력받아 번개장터 게시에 쓴다.
-- 원소 = {groupId, groupName, childName, type, valueId, value}(서버가 옵션 정의로 검증해 채움). 기존 상품은 빈 배열.
ALTER TABLE products
    ADD COLUMN category_options JSONB NOT NULL DEFAULT '[]'::jsonb;
