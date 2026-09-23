-- 상품 결함 여부를 boolean(있음/없음)에서 3단계(NORMAL/ISSUES/UNKNOWN, "모름" 포함)로 확장
CREATE TYPE defect_status AS ENUM ('NORMAL', 'ISSUES', 'UNKNOWN');
COMMENT ON TYPE defect_status IS '상품 결함(하자) 상태 (NORMAL: 정상, ISSUES: 하자 있음, UNKNOWN: 확인 안 됨)';

ALTER TABLE products ADD COLUMN defect_status defect_status;

UPDATE products SET defect_status = (CASE WHEN has_defect THEN 'ISSUES' ELSE 'NORMAL' END)::defect_status;

ALTER TABLE products ALTER COLUMN defect_status SET NOT NULL;
ALTER TABLE products ALTER COLUMN defect_status SET DEFAULT 'NORMAL';

ALTER TABLE products DROP COLUMN has_defect;
