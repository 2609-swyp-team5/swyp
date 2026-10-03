-- 업로드한 프로필 이미지의 저장소 key. 교체·삭제 시 이전 파일을 지우는 데 쓴다. 외부(소셜) 이미지는 NULL.
ALTER TABLE members ADD COLUMN profile_image_key TEXT;

-- 이미 업로드된 이미지는 URL 끝의 key(profile/<UUID>_<파일명>)를 옮겨 둔다.
UPDATE members
SET profile_image_key = substring(profile_image_url from '/(profile/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}_[A-Za-z0-9._-]+)$')
WHERE profile_image_url IS NOT NULL;
