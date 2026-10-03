-- 우리 상품 시세 분석을 판매자/구매자 관점으로 분리: recommendation은 판매자 관점(SELL/HOLD), 아래 두 컬럼은 같은 상품을
-- 관심 등록한 구매자 관점(BUY/WAIT). 외부 매물 분석은 recommendation 자체가 구매자 관점이라 두 컬럼을 비워 둔다.
ALTER TABLE product_analysis ADD COLUMN buyer_recommendation analysis_recommendation;
ALTER TABLE product_analysis ADD COLUMN buyer_description TEXT;

COMMENT ON COLUMN product_analysis.buyer_recommendation IS '우리 상품의 구매자 관점 추천(BUY/WAIT). 외부 매물 분석과 관점 분리 이전 스냅샷은 NULL';
COMMENT ON COLUMN product_analysis.buyer_description IS '구매자 관점 추천 근거. buyer_recommendation과 함께 채워짐';
