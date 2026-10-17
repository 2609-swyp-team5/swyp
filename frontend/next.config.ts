import type { NextConfig } from "next";

import { OPTIMIZABLE_IMAGE_HOST_SUFFIXES } from "./src/common/lib/image/optimizableImage";

const nextConfig: NextConfig = {
    images: {
        remotePatterns: OPTIMIZABLE_IMAGE_HOST_SUFFIXES.map((suffix) => ({
            protocol: "https" as const,
            hostname: `**${suffix}`,
        })),
        // 업로드 이미지는 파일명에 UUID가 붙어 같은 주소의 내용이 바뀌지 않는다. R2 공개 주소가 cache-control을
        // 보내지 않아 기본값(4시간)이면 같은 이미지를 자주 다시 변환하므로 31일 동안 캐시한다.
        minimumCacheTTL: 2678400,
    },
};

export default nextConfig;
