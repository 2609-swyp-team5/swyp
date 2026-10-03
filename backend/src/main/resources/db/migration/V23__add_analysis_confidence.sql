-- 시세 분석 신뢰도: 통계에 쓴 비교 매물 수(AI 선별·이상치 제거 후)와, 매물 수·가격 변동(변동계수)으로 정한 등급을 저장한다.
-- 신뢰도 비율(%)은 매물 수로 계산하므로 저장하지 않는다. 도입 이전 스냅샷은 두 컬럼 모두 NULL.
CREATE TYPE analysis_confidence AS ENUM ('HIGH', 'MEDIUM', 'LOW');

ALTER TABLE product_analysis ADD COLUMN listing_count INTEGER CHECK (listing_count >= 0);
ALTER TABLE product_analysis ADD COLUMN confidence analysis_confidence;

COMMENT ON TYPE analysis_confidence IS '시세 분석 신뢰도 등급 (HIGH, MEDIUM, LOW)';
COMMENT ON COLUMN product_analysis.listing_count IS '통계에 쓴 비교 매물 수(AI 같은 물건 선별·가격 이상치 제거 후). 도입 이전 스냅샷은 NULL';
COMMENT ON COLUMN product_analysis.confidence IS '분석 시점 신뢰도 등급(매물 수 비율·변동계수 중 낮은 쪽). 도입 이전 스냅샷은 NULL';
