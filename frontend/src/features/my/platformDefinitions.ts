import type { MyPlatformType } from "./types";

export type PlatformDefinition = {
    name: string;
    icon: string;
    description: string;
};

/**
 * 플랫폼별 화면 메타데이터를 한 곳에서 관리한다.
 * 새 플랫폼을 추가할 때는 API enum과 함께 이 목록에만 정의를 추가하면 된다.
 */
export const platformDefinitions: Record<MyPlatformType, PlatformDefinition> = {
    BUNJANG: {
        name: "번개장터",
        icon: "/my/platforms/bunjang.png",
        description: "중고거래 플랫폼",
    },
};

export function getPlatformDefinition(
    platform: MyPlatformType,
    fallbackName?: string,
): PlatformDefinition {
    return (
        platformDefinitions[platform] ?? {
            name: fallbackName ?? platform,
            icon: "/my/platforms/bunjang.png",
            description: "중고거래 플랫폼",
        }
    );
}
