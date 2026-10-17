/**
 * Next.js 이미지 최적화(크기 축소·WebP 변환·캐시)를 거칠 원격 이미지 주소.
 * 우리가 올린 상품 이미지(R2 공개 주소)만 대상이다. 외부 매물 이미지(번개장터·중고나라)는 이미 작은
 * 썸네일이라 원본 그대로 쓴다. `next.config.ts`의 `images.remotePatterns`도 이 목록으로 만든다.
 */
export const OPTIMIZABLE_IMAGE_HOST_SUFFIXES = [".r2.dev"] as const;

/**
 * 최적화할 수 있는 이미지인지 확인한다. 앱에 포함된 정적 이미지(`/`로 시작)와 목록의 원격 주소만 해당한다.
 * 업로드 미리보기(`blob:`)·로컬 저장소·알 수 없는 주소는 최적화 서버가 받지 못하므로 원본 그대로 쓴다.
 */
export function isOptimizableImageUrl(src: string): boolean {
    if (src.startsWith("/") && !src.startsWith("//")) {
        return !src.endsWith(".svg");
    }
    try {
        const { protocol, hostname } = new URL(src);
        return (
            protocol === "https:" &&
            OPTIMIZABLE_IMAGE_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))
        );
    } catch {
        return false;
    }
}
