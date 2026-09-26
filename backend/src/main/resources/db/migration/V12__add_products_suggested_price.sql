-- AI 제안가(적정가) 저장 — 등록 시 AI 사진 분석 추정가로 채우고, 이후 시세 분석이 적정가를 내면 갱신
ALTER TABLE products ADD COLUMN suggested_price BIGINT CHECK (suggested_price >= 0);
COMMENT ON COLUMN products.suggested_price IS 'AI 제안가(등록 시 AI 추정가, 시세 분석 시 갱신)';
