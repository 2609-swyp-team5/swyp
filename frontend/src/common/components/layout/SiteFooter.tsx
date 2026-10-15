import Image from "next/image";
import Link from "next/link";

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
        <footer className="typography-footer typography-body-large bg-[#464646] text-[#a9adbd]">
            <div className="layout-container flex flex-wrap items-center justify-between gap-6 py-6 md:py-10 xl:flex-nowrap xl:py-[50px]">
                <Link href="/" className="shrink-0">
                    <Image
                        src="/footer/logo.png"
                        alt="지금이니?"
                        width={129}
                        height={72}
                        className="h-[44px] w-[80px] object-contain md:h-[72px] md:w-[129px]"
                    />
                </Link>
                <nav
                    aria-label="푸터 메뉴"
                    className="hidden w-full flex-wrap items-center gap-x-5 gap-y-3 md:flex lg:w-auto"
                >
                    {footerLinks.map((link) => (
                        <Link key={link.href} href={link.href}>
                            {link.label}
                        </Link>
                    ))}
                </nav>
            </div>
            <div className="border-t border-[#d3d3d3]">
                <div className="layout-container typography-body-small flex flex-wrap items-center justify-between gap-x-8 gap-y-4 py-4 md:py-5 md:text-[inherit]">
                    <p>Copyright © 2026 지금이니? | All Rights Reserved</p>
                </div>
            </div>
        </footer>
    );
}
