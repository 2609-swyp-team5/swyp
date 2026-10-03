-- 관리자가 회원을 정지할 때 남기는 사유. 정지 해제 시 비운다.
ALTER TABLE members ADD COLUMN suspended_reason VARCHAR(500);
