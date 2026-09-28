import { Avatar, AvatarFallback, AvatarImage } from "@/common/components/ui/Avatar";

const sizes = {
    header: { avatar: "size-9", icon: "size-[13.5px]" },
    settings: { avatar: "size-22", icon: "size-[33px]" },
    sidebar: { avatar: "size-24", icon: "size-9" },
} as const;

type ProfileAvatarProps = {
    src?: string | null;
    alt?: string;
    size: keyof typeof sizes;
};

export function ProfileAvatar({ src, alt = "프로필 사진", size }: ProfileAvatarProps) {
    return (
        <Avatar className={`${sizes[size].avatar} after:border-0`}>
            {src ? <AvatarImage src={src} alt={alt} /> : null}
            <AvatarFallback className="bg-[#efeeff]">
                <span
                    aria-hidden="true"
                    className={`${sizes[size].icon} bg-[linear-gradient(180deg,#86b1cd,#416487)]`}
                    style={{
                        mask: "url(/profile/bust-in-silhouette.svg) center / contain no-repeat",
                    }}
                />
            </AvatarFallback>
        </Avatar>
    );
}
