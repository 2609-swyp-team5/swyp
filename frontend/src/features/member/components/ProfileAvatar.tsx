"use client";

import { useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/common/components/ui/Avatar";
import { Skeleton } from "@/common/components/ui/Skeleton";

const sizes = {
    header: { avatar: "size-11", icon: "size-[16.5px]" },
    settings: { avatar: "size-22", icon: "size-[33px]" },
    sidebar: { avatar: "size-24", icon: "size-9" },
} as const;

type ProfileAvatarProps = {
    src?: string | null;
    alt?: string;
    size: keyof typeof sizes;
};

export function ProfileAvatar({ src, alt = "프로필 사진", size }: ProfileAvatarProps) {
    const [failedSrc, setFailedSrc] = useState<string | null>(null);
    const showImageLoading = size === "header" && Boolean(src) && failedSrc !== src;

    return (
        <Avatar className={`${sizes[size].avatar} after:border-0`}>
            {src ? (
                <AvatarImage
                    src={src}
                    alt={alt}
                    onLoadingStatusChange={(status) => {
                        if (status === "error") setFailedSrc(src);
                        if (status === "loading") setFailedSrc(null);
                    }}
                />
            ) : null}
            <AvatarFallback className="bg-[#efeeff]">
                {showImageLoading ? (
                    <Skeleton
                        role="status"
                        aria-label="프로필 사진 불러오는 중"
                        className="size-full rounded-full bg-[#efeeff]"
                    />
                ) : (
                    <span
                        aria-hidden="true"
                        className={`${sizes[size].icon} bg-[linear-gradient(180deg,#86b1cd,#416487)]`}
                        style={{
                            mask: "url(/my/profile/bust-in-silhouette.svg) center / contain no-repeat",
                        }}
                    />
                )}
            </AvatarFallback>
        </Avatar>
    );
}
