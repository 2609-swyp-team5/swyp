-- 시세 분석 비교 기준. SAME = AI가 같은 물건(같은 종류·모델)으로 확인한 매물로 분석,
-- RELATED = 같은 물건이 부족해 같은 종류·시리즈의 비슷한 매물(세대·용량 등 일부 사양이 다르거나 확인 안 됨)로 분석(신뢰도 LOW).
-- 도입 이전 분석은 null(같은 물건 기준).
ALTER TABLE product_analysis
    ADD COLUMN comparison_basis VARCHAR(10),
    ADD CONSTRAINT ck_product_analysis_comparison_basis CHECK (comparison_basis IN ('SAME', 'RELATED'));
