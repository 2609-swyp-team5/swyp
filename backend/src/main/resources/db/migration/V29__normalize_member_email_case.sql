-- 이메일 대소문자만 다른 중복 가입을 막는다. 저장된 이메일을 소문자로 맞추고, 활성 회원끼리의 중복 검사도 소문자 기준으로 바꾼다.
UPDATE members SET email = lower(email) WHERE email <> lower(email);

DROP INDEX uk_members_email_active;
CREATE UNIQUE INDEX uk_members_email_active ON members (lower(email)) WHERE status <> 'DELETED';

COMMENT ON INDEX uk_members_email_active IS '활성 회원끼리 대소문자 구분 없이 이메일 중복을 막는다. 탈퇴 회원은 제외';
