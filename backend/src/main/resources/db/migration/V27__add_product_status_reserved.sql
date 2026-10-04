-- 상품 상태에 RESERVED(예약중) 추가 — 외부 매물(번개장터 예약중)과 같은 상태 체계로 통일 (DRAFT/ON_SALE/RESERVED/SOLD_OUT)
ALTER TYPE product_status ADD VALUE 'RESERVED' BEFORE 'SOLD_OUT';

COMMENT ON TYPE product_status IS '상품 판매 상태 (DRAFT: 등록됨·외부 미게시, ON_SALE: 판매중(외부 게시), RESERVED: 예약중, SOLD_OUT: 판매 완료)';
