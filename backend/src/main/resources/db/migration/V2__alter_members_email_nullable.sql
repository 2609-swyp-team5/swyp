-- ==========================================
-- 소셜 로그인 대응: members.email NOT NULL 해제
-- ------------------------------------------
-- 카카오의 경우 이메일이 권한이 없어서 가져올수가 없네요.
-- ==========================================

ALTER TABLE members
    ALTER COLUMN email DROP NOT NULL;

COMMENT ON COLUMN members.email IS '이메일. 소셜 로그인 시 provider가 제공하지 않으면 NULL 이다.';
