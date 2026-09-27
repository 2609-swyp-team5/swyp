-- 탈퇴한 회원이 쓰던 이메일·휴대폰으로 다시 가입할 수 있도록 UNIQUE 제약에 조건을 건다.
-- 기존 제약은 status 를 보지 않아 탈퇴 여부와 무관하게 중복을 막았다.
ALTER TABLE members DROP CONSTRAINT uk_members_email;
ALTER TABLE members DROP CONSTRAINT uk_members_phone;

CREATE UNIQUE INDEX uk_members_email_active ON members (email) WHERE status <> 'DELETED';
CREATE UNIQUE INDEX uk_members_phone_active ON members (phone) WHERE status <> 'DELETED';

COMMENT ON INDEX uk_members_email_active IS '활성 회원끼리만 이메일 중복을 막는다. 탈퇴 회원은 제외';
COMMENT ON INDEX uk_members_phone_active IS '활성 회원끼리만 휴대폰 중복을 막는다. 탈퇴 회원은 제외';
