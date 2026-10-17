import type { NextConfig } from "next";

import { OPTIMIZABLE_IMAGE_HOST_SUFFIXES } from "./src/common/lib/image/optimizableImage";

const nextConfig: NextConfig = {
    images: {
        remotePatterns: OPTIMIZABLE_IMAGE_HOST_SUFFIXES.map((suffix) => ({
            protocol: "https" as const,
            hostname: `**${suffix}`,
        })),
    },
};

export default nextConfig;
