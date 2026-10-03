-- 우리 상품 시세 분석의 1개월 가격 전망: 판매자 추천이 HOLD면 대기 기간(1M)과 시세 추세 기반 상승 예상, SELL이면 감가 예측
-- 기반 하락 예상을 저장한다. 외부 매물 분석과 도입 이전 스냅샷은 세 컬럼 모두 NULL.
ALTER TABLE product_analysis ADD COLUMN wait_period forecast_period;
ALTER TABLE product_analysis ADD COLUMN expected_price BIGINT CHECK (expected_price >= 0);
ALTER TABLE product_analysis ADD COLUMN expected_price_change_rate NUMERIC(7, 4) CHECK (expected_price_change_rate >= -1);

COMMENT ON COLUMN product_analysis.wait_period IS '판매자 추천이 HOLD일 때 권장 대기 기간(1M). SELL·외부 매물·도입 이전 스냅샷은 NULL';
COMMENT ON COLUMN product_analysis.expected_price IS '1개월 뒤 예상 가격(HOLD=시세 추세 기반 상승, SELL=감가 예측 1M 값)';
COMMENT ON COLUMN product_analysis.expected_price_change_rate IS '1개월 예상 변화율(HOLD=월 추세를 최대 5%로 제한, SELL=감가 예측 월 변화율, 0 이하)';
