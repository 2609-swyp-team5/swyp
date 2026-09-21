-- 상품 목록(GET /products) 키워드 검색 요청 로그. 인기검색어 집계에 사용한다.
CREATE TABLE search_logs (
    search_log_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    member_id     BIGINT,
    keyword       VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_search_logs_member FOREIGN KEY (member_id) REFERENCES members (member_id) ON DELETE CASCADE
);

CREATE INDEX idx_search_logs_created_at ON search_logs (created_at);

COMMENT ON COLUMN search_logs.member_id IS '검색 요청자(nullable — 향후 비회원 조회 확장을 대비해 미리 허용)';
COMMENT ON COLUMN search_logs.keyword IS '검색 키워드(앞뒤 공백 제거 후 저장)';
COMMENT ON COLUMN search_logs.created_at IS '검색 요청 시각. 인기검색어 집계 시 이 값으로 최근 기간을 필터링';
