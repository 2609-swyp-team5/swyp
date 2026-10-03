"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Sparkles, Plus } from "lucide-react";
import { Button } from "@/common/components/ui/Button";
import { Card, CardContent } from "@/common/components/ui/Card";
import { Input } from "@/common/components/ui/Input";
import { Skeleton } from "@/common/components/ui/Skeleton";
import { cn } from "@/common/lib/utils";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useMeQuery } from "@/features/member/hooks/queries/useMeQuery";
import { HomeProductCarousel } from "@/features/home/components/HomeProductCarousel";

const keywords = ["필름카메라", "아이패드 프로", "다이슨 에어랩", "닌텐도 스위치", "소니 헤드폰"];
const summaries = [
    { label: "등록한 물건", value: "6개", description: "판매 중 3 · 관심 2 · 완료 1" },
    { label: "AI 추천 알림", value: "2건", description: "오늘 새로 분석된 타이밍" },
    { label: "평균 시세 대비", value: "+4.1%", description: "내 물건들의 현재 시세 평균" },
    { label: "최근 분석일", value: "오늘", description: "2026년 9월 2일 오전 9:12" },
];

export function HomePage() {
    const router = useRouter();
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
    const isInitialized = useAuthStore((state) => state.isInitialized);
    const { data: member, isPending } = useMeQuery();
    const [keyword, setKeyword] = useState("");
    const [searchMode, setSearchMode] = useState<"general" | "ai">("general");
    const search = (value: string) =>
        router.push(`/search?keyword=${encodeURIComponent(value.trim())}`);
    const handleSearch = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (searchMode === "general") search(keyword);
    };
    const headingClass =
        "text-[32px] leading-[44px] font-bold break-keep lg:text-[60px] lg:leading-[76px]";

    return (
        <main className="font-brand flex-1 bg-white font-normal tracking-[0.5px]">
            <div
                className={cn("layout-container space-y-20 pb-[60px]", !isLoggedIn && "pt-[60px]")}
            >
                {!isInitialized ? (
                    <div role="status" aria-label="로그인 상태 확인 중" className="py-20">
                        <Skeleton className="h-16 w-2/3" />
                    </div>
                ) : isLoggedIn ? (
                    <section
                        aria-label="나의 거래 요약"
                        className="flex min-h-[480px] flex-col justify-center gap-12 py-16 lg:min-h-[630px] lg:gap-[100px] lg:py-0"
                    >
                        <div className="space-y-2.5">
                            <p className="text-base leading-5 font-medium text-[#6b7395] md:text-[20px]">
                                AI와 함께하는 똑똑한 중고거래
                            </p>
                            {isPending ? (
                                <Skeleton className="h-[76px] w-2/3" />
                            ) : (
                                <h1 className={cn(headingClass, "text-[#363636]")}>
                                    안녕하세요, {member?.name ?? member?.nickname ?? "회원"}님
                                </h1>
                            )}
                        </div>
                        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-[30px]">
                            {summaries.map((item, index) => (
                                <Card
                                    key={item.label}
                                    className="gap-2 rounded-[10px] border border-[#d3d3d3] bg-[#fafbff] px-6 py-5 ring-0"
                                >
                                    <h2 className="text-[14px] leading-[21px] text-[#464646]">
                                        {item.label}
                                    </h2>
                                    <p
                                        className={cn(
                                            "text-[28px] leading-9 font-bold",
                                            index === 1 || index === 2
                                                ? "text-[#6653fb]"
                                                : "text-[#363636]",
                                        )}
                                    >
                                        {item.value}
                                    </p>
                                    <p className="text-[13px] leading-[19.5px] font-medium text-[#464646]">
                                        {item.description}
                                    </p>
                                </Card>
                            ))}
                        </div>
                    </section>
                ) : null}
                <section
                    aria-labelledby="home-search-heading"
                    className="flex min-h-[480px] flex-col items-center gap-16 pt-[60px] pb-20 lg:min-h-[630px] lg:gap-20 lg:pb-[150px]"
                >
                    <div
                        role="group"
                        aria-label="검색 방식"
                        className="flex h-[55px] w-[264px] rounded-full border border-[#464646] bg-[#6b6c7b] p-px text-[20px] leading-5"
                    >
                        <Button
                            type="button"
                            variant="ghost"
                            aria-pressed={searchMode === "general"}
                            onClick={() => setSearchMode("general")}
                            className={cn(
                                "h-full flex-1 gap-1 rounded-full px-3 text-[20px] font-medium",
                                searchMode === "general"
                                    ? "border border-[#6b6c7b] bg-[#fafbff] text-[#464646] hover:bg-[#fafbff]"
                                    : "text-white hover:bg-white/10 hover:text-white",
                            )}
                        >
                            <Search className="size-[22px]" />
                            일반검색
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            aria-pressed={searchMode === "ai"}
                            onClick={() => setSearchMode("ai")}
                            className={cn(
                                "h-full flex-1 gap-1 rounded-full px-3 text-[20px] font-medium",
                                searchMode === "ai"
                                    ? "border border-[#6b6c7b] bg-[#fafbff] text-[#464646] hover:bg-[#fafbff]"
                                    : "text-white hover:bg-white/10 hover:text-white",
                            )}
                        >
                            <Sparkles className="size-[22px]" />
                            AI 검색
                        </Button>
                    </div>
                    <div className="w-full space-y-10">
                        <div className="space-y-2.5 text-center">
                            <h2
                                id="home-search-heading"
                                className={cn(headingClass, "text-[#545d82]")}
                            >
                                상품 {searchMode === "general" ? "일반" : "AI"} 검색
                            </h2>
                            <p className="text-base leading-7 font-medium text-[#6b7395] md:text-[20px]">
                                상품명, 모델명, 브랜드를 입력하면 현재 중고 시세를 보여드려요.
                            </p>
                        </div>
                        <div className="space-y-[30px] lg:px-6">
                            <form
                                onSubmit={handleSearch}
                                className="flex h-[70px] items-center gap-2 rounded-[50px] border-[1.5px] border-[#6b6c7b] bg-[#fafbff] pr-1 pl-5"
                            >
                                <Search
                                    className="size-[23px] shrink-0 text-[#6b6c7b]"
                                    aria-hidden="true"
                                />
                                <Input
                                    value={keyword}
                                    onChange={(event) => setKeyword(event.target.value)}
                                    aria-label="홈 상품 검색어"
                                    placeholder="예: 필름카메라 FM2, 아이패드 프로, 다이슨 에어랩"
                                    className="h-full border-0 px-0 text-base text-[#464646] shadow-none placeholder:text-[#6b6c7b] focus-visible:ring-0 md:text-[20px]"
                                />
                                <Button
                                    type="submit"
                                    disabled={searchMode === "ai"}
                                    aria-label={
                                        searchMode === "ai" ? "AI 검색 준비 중" : "상품 검색"
                                    }
                                    className="size-[60px] shrink-0 rounded-full bg-[#6653fb] p-0 text-white"
                                >
                                    <Search className="size-6" />
                                </Button>
                            </form>
                            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
                                <p className="text-[15px] leading-[18px] font-semibold text-[#6653fb]">
                                    인기 검색어
                                </p>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {keywords.map((value) => (
                                        <Button
                                            key={value}
                                            type="button"
                                            variant="outline"
                                            onClick={() => search(value)}
                                            className="h-auto rounded-full border-[#d3d3d3] bg-[#fafbff] px-3 py-1 text-[13px] leading-[19.5px] font-normal text-[#464646]"
                                        >
                                            {value}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
                <section
                    aria-labelledby="popular-products-heading"
                    className="flex flex-col gap-10 py-[60px] lg:min-h-[630px] lg:justify-between"
                >
                    <div className="space-y-2.5">
                        <p className="text-base leading-7 font-medium text-[#464646] md:text-[20px]">
                            당신만을 위한 맞춤형 중고거래 도우미
                        </p>
                        <h2
                            id="popular-products-heading"
                            className={cn(headingClass, "text-[#363636]")}
                        >
                            인기 상품 모음
                        </h2>
                    </div>
                    <HomeProductCarousel title="인기 상품 모음" />
                </section>
                <section
                    aria-labelledby="home-audiences-heading"
                    className="flex flex-col gap-10 py-[60px] lg:min-h-[630px] lg:justify-between"
                >
                    <div className="space-y-2.5">
                        <p className="text-base leading-7 font-medium text-[#464646] md:text-[20px]">
                            당신만을 위한 맞춤형 중고거래 도우미
                        </p>
                        <h2
                            id="home-audiences-heading"
                            className={cn(headingClass, "text-[#363636]")}
                        >
                            파는 사람에게도, 사는 사람에게도
                        </h2>
                    </div>
                    <div className="grid gap-8 lg:grid-cols-2 lg:gap-[60px]">
                        {[
                            {
                                title: "판매자라면",
                                description:
                                    "등록한 물건의 시세가 오르면 팔기 좋은 타이밍을, 떨어지고 있다면 조금만 더 기다리라는 신호를 보내드려요",
                                button: "판매 상품 등록하기",
                                href: "/sell/register",
                            },
                            {
                                title: "구매자라면",
                                description:
                                    "관심 등록해둔 물건이 저렴해지는 순간을 놓치지 않도록 사기 좋은 타이밍에 알려드려요.",
                                button: "내 관심상품 보러가기",
                                href: "/buy/wishlist",
                            },
                        ].map((item) => (
                            <Card
                                key={item.title}
                                className="relative h-[350px] gap-0 rounded-[20px] border border-[#464646] bg-white py-0 ring-0"
                            >
                                <CardContent className="space-y-5 px-6 py-[30px] text-center text-[#363636]">
                                    <h3 className="text-[30px] leading-[30px] font-semibold">
                                        {item.title}
                                    </h3>
                                    <p className="text-base leading-[35px] font-medium lg:text-[20px]">
                                        {item.description}
                                    </p>
                                </CardContent>
                                <div className="flex-1 rounded-[5px] bg-[#d3d3d3]" />
                                <Button
                                    asChild
                                    className="absolute right-6 bottom-[29px] left-6 h-[60px] rounded-full bg-[#6653fb] px-5 text-base leading-5 font-bold lg:right-auto lg:left-1/2 lg:w-[400px] lg:-translate-x-1/2 lg:text-[20px]"
                                >
                                    <Link href={isLoggedIn ? item.href : "/login"}>
                                        {item.button}
                                    </Link>
                                </Button>
                            </Card>
                        ))}
                    </div>
                </section>
                {isInitialized && isLoggedIn && (
                    <section
                        aria-labelledby="recommended-products-heading"
                        className="flex flex-col gap-10 py-[60px] lg:min-h-[630px] lg:justify-between"
                    >
                        <div className="flex flex-wrap items-end justify-between gap-5 lg:pr-10">
                            <div className="space-y-2.5">
                                <p className="text-base leading-7 font-medium text-[#6b7395] md:text-[20px]">
                                    관심 목록을 바탕으로 추천드려요
                                </p>
                                <h2
                                    id="recommended-products-heading"
                                    className={cn(headingClass, "text-[#545d82]")}
                                >
                                    내 물건 추천
                                </h2>
                            </div>
                            <Button
                                asChild
                                className="h-auto gap-2 rounded-full bg-[#5d55fe] px-[30px] py-3 text-base leading-6 font-semibold"
                            >
                                <Link href="/sell/register">
                                    <Plus className="size-5" />
                                    물건 등록하기
                                </Link>
                            </Button>
                        </div>
                        <HomeProductCarousel title="내 물건 추천" />
                    </section>
                )}
            </div>
        </main>
    );
}
