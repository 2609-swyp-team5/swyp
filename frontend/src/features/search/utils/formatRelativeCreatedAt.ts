const minute = 60_000;
const hour = 60 * minute;
const day = 24 * hour;

export function formatRelativeCreatedAt(createdAt: string, now = Date.now()) {
    // 백엔드는 Asia/Seoul의 LocalDateTime을 시간대 표시 없이 반환합니다.
    const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(createdAt);
    const timestamp = Date.parse(hasTimezone ? createdAt : `${createdAt}+09:00`);
    if (Number.isNaN(timestamp)) return "날짜 정보 없음";

    const elapsed = Math.max(0, now - timestamp);
    if (elapsed < minute) return "방금 전";
    if (elapsed < hour) return `${Math.floor(elapsed / minute)}분 전`;
    if (elapsed < day) return `${Math.floor(elapsed / hour)}시간 전`;
    return `${Math.floor(elapsed / day)}일 전`;
}
