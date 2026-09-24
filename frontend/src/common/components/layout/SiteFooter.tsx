import Image from "next/image";
import Link from "next/link";

const socialIcons = ["facebook.svg", "twitter.svg", "instagram.svg", "linkedin.svg"];

export function SiteFooter() {
    return (
        <footer className="typography-footer min-h-[var(--footer-height)] bg-[#272727] text-[#9795b5]">
            <div className="layout-container flex min-h-[var(--footer-height)] flex-col justify-between gap-12 py-16 md:gap-0 md:pt-[76px] md:pb-10">
                <div className="flex flex-wrap items-center justify-between gap-10">
                    <Link href="/" className="shrink-0">
                        <Image src="/logo.png" alt="지금이니?" width={100} height={55} />
                    </Link>
                    <nav aria-label="푸터 메뉴" className="flex flex-wrap gap-x-10 gap-y-4">
                        <Link href="/">소개</Link>
                        <Link href="/home">홈</Link>
                        <Link href="/search">검색</Link>
                        <Link href="/sell/register">상품 등록</Link>
                        <Link href="/buy/wishlist">관심 상품</Link>
                    </nav>
                    <div className="flex gap-4" aria-hidden="true">
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
                <div className="border-t border-[#9795b5]/50 pt-8 text-center">
                    Copyright © 2026 지금이니? | All Rights Reserved
                </div>
            </div>
        </footer>
    );
}
