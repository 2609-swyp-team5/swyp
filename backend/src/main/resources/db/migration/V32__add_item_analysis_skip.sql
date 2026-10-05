-- 시세 분석을 건너뛴 사유(비교 매물 부족 등)와 시각 — 분석에 성공하면 비운다. 관심상품 화면에서 "분석 대기" 이유를 보여 주는 데 쓴다
ALTER TABLE items ADD COLUMN analysis_skip_reason VARCHAR(30);
ALTER TABLE items ADD COLUMN analysis_skipped_at TIMESTAMP;
ALTER TABLE items ADD CONSTRAINT chk_items_analysis_skip_reason
    CHECK (analysis_skip_reason IN ('NOT_ENOUGH_CANDIDATES', 'NOT_ENOUGH_SIMILAR'));

COMMENT ON COLUMN items.analysis_skip_reason IS '마지막 시세 분석을 건너뛴 사유(NOT_ENOUGH_CANDIDATES 비교할 판매 글 부족, NOT_ENOUGH_SIMILAR 같은 물건 판매 글 부족). 분석 성공 시 NULL';
COMMENT ON COLUMN items.analysis_skipped_at IS '마지막으로 시세 분석을 건너뛴 시각. 분석 성공 시 NULL';
