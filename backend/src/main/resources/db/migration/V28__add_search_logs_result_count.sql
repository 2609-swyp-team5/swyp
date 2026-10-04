-- 검색 결과 건수 기록 — 결과가 0건인 검색(오타·의미 없는 입력)을 인기검색어 집계에서 빼기 위함
ALTER TABLE search_logs ADD COLUMN result_count BIGINT CHECK (result_count >= 0);

COMMENT ON COLUMN search_logs.result_count IS '검색 결과 전체 건수(첫 페이지 기준). 이 컬럼 추가 전 기록은 null — 인기검색어 집계에서 0건만 제외하고 null은 포함';
