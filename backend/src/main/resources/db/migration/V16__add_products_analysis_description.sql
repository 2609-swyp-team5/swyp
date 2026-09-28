-- AI 판단 근거 저장 — 등록 시 AI 사진 분석이 상태 등급/제안가를 그렇게 판단한 근거를 남겨 상세 조회에서도 보여준다
ALTER TABLE products ADD COLUMN analysis_description TEXT;
COMMENT ON COLUMN products.analysis_description IS '등록 시 AI 사진 분석의 상태 등급/제안가 판단 근거(AI 분석 실패 시 NULL, 이후 시세 분석으로는 바뀌지 않음)';
