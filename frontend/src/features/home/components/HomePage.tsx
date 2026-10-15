"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Plus } from "lucide-react";
import { Button } from "@/common/components/ui/Button";
import { Card, CardContent } from "@/common/components/ui/Card";
import { Input } from "@/common/components/ui/Input";
import { Skeleton } from "@/common/components/ui/Skeleton";
import { cn } from "@/common/lib/utils";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useMeQuery } from "@/features/member/hooks/queries/useMeQuery";
import {
    HomeProductCarousel,
    type CarouselProduct,
} from "@/features/home/components/HomeProductCarousel";
import { HomePopularProducts } from "@/features/home/components/HomePopularProducts";
import { LoginRequiredDialog } from "@/features/auth/components/LoginRequiredDialog";
import { getApiErrorMessage } from "@/common/lib/api/error";
import { useHomeSummaryQuery } from "../hooks/queries/useHomeSummaryQuery";
import { getHomeSummaryCards } from "../utils/homeSummaryCards";

const keywords = ["필름카메라", "아이패드 프로", "다이슨 에어랩", "닌텐도 스위치", "소니 헤드폰"];
const recommendedPreviewProducts: CarouselProduct[] = Array.from({ length: 12 }, (_, index) => ({
    id: index + 1,
    title: "아이폰 13 미니 128GB 핑크",
    price: 320000,
    status: "ON_SALE",
    thumbnailUrl: null,
    marketAveragePrice: 350000,
    platformName: ["당근마켓", "중고나라", "번개장터"][index % 3],
    favorite: false,
    interestId: null,
}));

export function HomePage() {
    const router = useRouter();
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
    const isInitialized = useAuthStore((state) => state.isInitialized);
    const { data: member, isPending } = useMeQuery();
    const summary = useHomeSummaryQuery();
    const summaries = getHomeSummaryCards(summary.data);
    const [keyword, setKeyword] = useState("");
    const [searchMode, setSearchMode] = useState<"general" | "ai">("general");
    const [loginNoticeOpen, setLoginNoticeOpen] = useState(false);
    const [searchError, setSearchError] = useState("");
    const search = (value: string) => {
        if (!isInitialized) return;
        setSearchError("");
        if (searchMode === "ai") {
            if (!isLoggedIn) {
                setLoginNoticeOpen(true);
                return;
            }
            if (!value.trim() || value.trim().length > 200) {
                setSearchError("AI 검색어를 1~200자로 입력해 주세요.");
                return;
            }
        }
        // AI 검색은 지금이니 AI 대화의 첫 질문으로 보낸다(검색 화면에는 AI 모드가 없다)
        router.push(
            searchMode === "ai"
                ? `/ai?q=${encodeURIComponent(value.trim())}`
                : `/search?keyword=${encodeURIComponent(value.trim())}`,
        );
    };
    const handleSearch = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        search(keyword);
    };
    const headingClass = "typography-heading-01 font-bold break-keep";

    return (
        <main className="font-brand flex-1 bg-white font-normal tracking-[0.5px]">
            <LoginRequiredDialog open={loginNoticeOpen} onOpenChange={setLoginNoticeOpen} />
            <div
                className={cn(
                    "layout-container space-y-8 pb-10 md:space-y-20 md:pb-[60px]",
                    !isLoggedIn && "pt-8 md:pt-[60px]",
                )}
            >
                {!isInitialized ? (
                    <div role="status" aria-label="로그인 상태 확인 중" className="py-20">
                        <Skeleton className="h-16 w-2/3" />
                    </div>
                ) : isLoggedIn ? (
                    <section
                        aria-label="나의 거래 요약"
                        className="flex flex-col gap-6 pt-8 md:gap-10 md:pt-[60px] lg:gap-[60px]"
                    >
                        <div className="space-y-2.5">
                            <p className="typography-heading-03 font-medium text-[#6b7395]">
                                AI와 함께하는 똑똑한 중고거래
                            </p>
                            {isPending ? (
                                <Skeleton className="h-[44px] w-2/3 lg:h-[60px]" />
                            ) : (
                                <h1 className={cn(headingClass, "text-[#363636]")}>
                                    안녕하세요, {member?.name ?? member?.nickname ?? "회원"}님
                                </h1>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4 lg:gap-[30px]">
                            {summaries.map((item, index) => (
                                <Card
                                    key={item.title}
                                    className="gap-1.5 rounded-[10px] border border-[#d3d3d3] bg-[#fafbff] px-4 py-4 ring-0 md:gap-2 md:px-6 md:py-5"
                                >
                                    <h2 className="typography-body-small text-[#464646]">
                                        {item.title}
                                    </h2>
                                    <p
                                        className={cn(
                                            "typography-heading-02 font-bold",
                                            index === 1 || index === 2
                                                ? "text-[#6653fb]"
                                                : "text-[#363636]",
                                        )}
                                    >
                                        {item.value}
                                    </p>
                                    <p
                                        role={
                                            index === 0
                                                ? summary.isError
                                                    ? "alert"
                                                    : summary.isPending
                                                      ? "status"
                                                      : undefined
                                                : undefined
                                        }
                                        className="typography-body-small font-medium break-keep text-[#464646]"
                                    >
                                        {summary.isError
                                            ? index === 0
                                                ? getApiErrorMessage(summary.error)
                                                : "요약 정보를 불러오지 못했습니다."
                                            : item.description}
                                    </p>
                                    {index === 0 && summary.isError && (
                                        <Button
                                            variant="outline"
                                            disabled={summary.isFetching}
                                            onClick={() => void summary.refetch()}
                                        >
                                            다시 시도
                                        </Button>
                                    )}
                                </Card>
                            ))}
                        </div>
                    </section>
                ) : null}
                <section
                    aria-labelledby="home-search-heading"
                    className="flex flex-col items-center gap-8 pt-6 pb-4 md:min-h-[480px] md:gap-16 md:pt-[60px] md:pb-10 lg:min-h-0 lg:gap-20 lg:pb-[60px]"
                >
                    {/* Figma 1989-14199: AI 검색이 왼쪽, 선택된 쪽만 채운 pill(AI 보라·일반 검정) */}
                    <div
                        role="group"
                        aria-label="검색 방식"
                        className="flex h-[51px] w-[226px] rounded-full border border-[#d3d3d3] bg-white p-[3px]"
                    >
                        {(
                            [
                                {
                                    mode: "ai",
                                    label: "AI 검색",
                                    activeClass: "bg-[#6653fb] hover:bg-[#5745e7]",
                                },
                                {
                                    mode: "general",
                                    label: "일반 검색",
                                    activeClass: "bg-[#272727] hover:bg-[#363636]",
                                },
                            ] as const
                        ).map(({ mode, label, activeClass }) => (
                            <Button
                                key={mode}
                                type="button"
                                variant="ghost"
                                aria-pressed={searchMode === mode}
                                onClick={() => setSearchMode(mode)}
                                className={cn(
                                    "typography-body-bold h-full w-[110px] rounded-full px-0 font-semibold transition-colors duration-200 motion-reduce:transition-none",
                                    searchMode === mode
                                        ? cn(activeClass, "text-white hover:text-white")
                                        : "text-[#d3d3d3] hover:bg-[#fafbff] hover:text-[#83889e]",
                                )}
                            >
                                {label}
                            </Button>
                        ))}
                    </div>
                    <div className="w-full space-y-6 md:space-y-10">
                        <div className="space-y-2.5 text-center">
                            <h2
                                id="home-search-heading"
                                className={cn(headingClass, "text-[#545d82]")}
                            >
                                {searchMode === "general" ? "상품 일반 검색" : "AI 검색"}
                            </h2>
                            <p className="typography-heading-03 font-medium text-[#6b7395]">
                                {searchMode === "general"
                                    ? "상품명, 모델명, 브랜드를 입력하면 현재 중고 시세를 보여드려요."
                                    : "자연어로 물어보세요. AI가 시세 분석과 거래 타이밍을 종합해 알려드려요."}
                            </p>
                        </div>
                        <div className="space-y-5 md:space-y-[30px] lg:px-6">
                            <form
                                onSubmit={handleSearch}
                                className="flex h-14 items-center gap-2 rounded-[50px] border-[1.5px] border-[#6b6c7b] bg-[#fafbff] pr-1 pl-4 md:h-[70px] md:pl-5"
                            >
                                <Search
                                    className="size-[23px] shrink-0 text-[#6b6c7b]"
                                    aria-hidden="true"
                                />
                                <Input
                                    value={keyword}
                                    maxLength={searchMode === "ai" ? 200 : undefined}
                                    onChange={(event) => setKeyword(event.target.value)}
                                    aria-label="홈 상품 검색어"
                                    placeholder={
                                        searchMode === "general"
                                            ? "예: 필름카메라 FM2, 아이패드 프로, 다이슨 에어랩"
                                            : "예: 필름카메라 지금 팔아도 될까요? 아이패드 요즘 시세 어때?"
                                    }
                                    className="typography-heading-03 h-full border-0 px-0 text-[#464646] shadow-none placeholder:text-[#6b6c7b] focus-visible:ring-0"
                                />
                                <Button
                                    type="submit"
                                    disabled={!isInitialized}
                                    aria-label={searchMode === "ai" ? "AI 검색" : "상품 검색"}
                                    className="size-12 shrink-0 rounded-full bg-[#6653fb] p-0 text-white md:size-[60px]"
                                >
                                    <Search className="size-6" />
                                </Button>
                            </form>
                            {searchError && (
                                <p role="alert" className="text-destructive typography-body-small">
                                    {searchError}
                                </p>
                            )}
                            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
                                <p className="typography-body-bold font-semibold text-[#6653fb]">
                                    인기 검색어
                                </p>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {keywords.map((value) => (
                                        <Button
                                            key={value}
                                            type="button"
                                            variant="outline"
                                            onClick={() => search(value)}
                                            className="typography-body-small h-auto rounded-full border-[#d3d3d3] bg-[#fafbff] px-3 py-1 font-normal text-[#464646]"
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
                    className="flex flex-col gap-6 py-6 md:gap-10 md:py-[60px] lg:min-h-[630px] lg:justify-between"
                >
                    <div className="space-y-2.5">
                        <p className="typography-heading-03 font-medium text-[#464646]">
                            당신만을 위한 맞춤형 중고거래 도우미
                        </p>
                        <h2
                            id="popular-products-heading"
                            className={cn(headingClass, "text-[#363636]")}
                        >
                            인기 상품 모음
                        </h2>
                    </div>
                    <HomePopularProducts />
                </section>
                <section
                    aria-labelledby="home-audiences-heading"
                    className="flex flex-col gap-6 py-6 md:gap-10 md:py-[60px] lg:min-h-[630px] lg:justify-between"
                >
                    <div className="space-y-2.5">
                        <p className="typography-heading-03 font-medium text-[#464646]">
                            당신만을 위한 맞춤형 중고거래 도우미
                        </p>
                        <h2
                            id="home-audiences-heading"
                            className={cn(headingClass, "text-[#363636]")}
                        >
                            파는 사람에게도, 사는 사람에게도
                        </h2>
                    </div>
                    <div className="grid gap-4 md:gap-8 lg:grid-cols-2 lg:gap-[60px]">
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
                                className="relative h-[280px] gap-0 rounded-[20px] border border-[#464646] bg-white py-0 ring-0 md:h-[350px]"
                            >
                                <CardContent className="space-y-3 px-5 py-6 text-center text-[#363636] md:space-y-5 md:px-6 md:py-[30px]">
                                    <h3 className="typography-heading-02 font-semibold">
                                        {item.title}
                                    </h3>
                                    <p className="typography-heading-03 font-medium break-keep">
                                        {item.description}
                                    </p>
                                </CardContent>
                                <div className="flex-1 rounded-[5px] bg-[#d3d3d3]" />
                                <Button
                                    asChild
                                    className="typography-heading-03 absolute right-5 bottom-5 left-5 h-[52px] rounded-full bg-[#6653fb] px-5 font-bold md:right-6 md:bottom-[29px] md:left-6 md:h-[60px] lg:right-auto lg:left-1/2 lg:w-[400px] lg:-translate-x-1/2"
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
                        className="hidden flex-col gap-6 py-6 md:gap-10 md:py-[60px] lg:min-h-[630px] lg:justify-between"
                    >
                        <div className="flex flex-wrap items-end justify-between gap-5 lg:pr-10">
                            <div className="space-y-2.5">
                                <p className="typography-heading-03 font-medium text-[#6b7395]">
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
                                className="typography-body-bold h-auto gap-2 rounded-full bg-[#5d55fe] px-[30px] py-3 font-semibold"
                            >
                                <Link href="/sell/register">
                                    <Plus className="size-5" />
                                    물건 등록하기
                                </Link>
                            </Button>
                        </div>
                        <HomeProductCarousel
                            title="내 물건 추천"
                            products={recommendedPreviewProducts}
                        />
                    </section>
                )}
            </div>
        </main>
    );
}
