-- 분석 때 고른 비교 매물 가격을 스냅샷에 저장해, 가격 분포를 조회 시점 매물이 아니라 분석 당시 매물로 계산한다(화면마다 분포가 달라지지 않도록).
ALTER TABLE product_analysis ADD COLUMN listing_prices BIGINT[];

COMMENT ON COLUMN product_analysis.listing_prices IS '통계(최저·평균·최고가)에 쓴 비교 매물 가격 목록. 가격 분포 계산용, 도입 이전 스냅샷은 NULL';
