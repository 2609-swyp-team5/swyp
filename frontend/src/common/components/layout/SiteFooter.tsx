import Image from "next/image";
import Link from "next/link";

const socialIcons = ["facebook.svg", "twitter.svg", "instagram.svg", "linkedin.svg"];
const footerLinks = [
    { href: "/home", label: "홈" },
    { href: "/search", label: "검색" },
    { href: "/sell/manage", label: "판매상품관리" },
    { href: "/sell/register", label: "상품등록" },
    { href: "/buy/wishlist", label: "관심상품" },
    { href: "/notifications", label: "알림" },
    { href: "/my", label: "마이페이지" },
];

export function SiteFooter() {
    return (
        <footer className="typography-footer bg-[#464646] text-sm leading-5 text-[#a9adbd] md:text-base lg:text-lg lg:leading-[18px]">
            <div className="layout-container flex flex-wrap items-center justify-between gap-6 py-10 xl:flex-nowrap xl:py-[50px]">
                <Link href="/" className="shrink-0">
                    <Image
                        src="/footer/logo.png"
                        alt="지금이니?"
                        width={129}
                        height={72}
                        className="h-[72px] w-[129px] object-contain"
                    />
                </Link>
                <nav
                    aria-label="푸터 메뉴"
                    className="flex w-full flex-wrap items-center gap-x-5 gap-y-3 lg:w-auto"
                >
                    {footerLinks.map((link) => (
                        <Link key={link.href} href={link.href}>
                            {link.label}
                        </Link>
                    ))}
                </nav>
                <div className="flex shrink-0 gap-4" aria-hidden="true">
                    {socialIcons.map((icon) => (
                        <Image
                            key={icon}
                            src={`/footer/${icon}`}
                            alt=""
                            width={36}
                            height={36}
                            loading="eager"
                        />
                    ))}
                </div>
            </div>
            <div className="border-t border-[#d3d3d3]">
                <div className="layout-container flex flex-wrap items-center justify-between gap-x-8 gap-y-4 py-5">
                    <p>Copyright © 2026 지금이니? | All Rights Reserved</p>
                    <div className="flex max-w-[calc(100%-90px)] flex-wrap items-center gap-[21px] sm:max-w-none">
                        <span>이용약관</span>
                        <Image src="/footer/divider.svg" alt="" width={1} height={18} />
                        <span>개인정보처리방침</span>
                        <Image src="/footer/divider.svg" alt="" width={1} height={18} />
                        <span>운영정책</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
