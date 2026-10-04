"use client";

import { Button } from "@/common/components/ui/Button";
import { Skeleton } from "@/common/components/ui/Skeleton";
import { LoginRequiredDialog } from "@/features/auth/components/LoginRequiredDialog";
import { useInterestToggle } from "../hooks/useInterestToggle";
import { getApiErrorMessage } from "@/common/lib/api/error";
import { usePopularProductsQuery } from "../hooks/queries/usePopularProductsQuery";
import { HomeProductCarousel } from "./HomeProductCarousel";

export function HomePopularProducts() {
    const { data, isPending, error, refetch, isFetching } = usePopularProductsQuery();
    const interests = useInterestToggle();
    const liked = Object.fromEntries(
        interests.interests
            .filter((item) => item.source === "OUR")
            .map((item) => [item.targetId, true]),
    );

    if (isPending) {
        return (
            <div
                role="status"
                aria-label="인기 상품을 불러오는 중"
                className="grid gap-5 md:grid-cols-3"
            >
                {[0, 1, 2].map((index) => (
                    <Skeleton key={index} className="h-[350px] rounded-xl" />
                ))}
            </div>
        );
    }
    if (error) {
        return (
            <div role="alert" className="flex flex-col items-center gap-4 py-10">
                <p className="text-destructive text-sm">{getApiErrorMessage(error)}</p>
                <Button variant="outline" disabled={isFetching} onClick={() => void refetch()}>
                    인기 상품 다시 조회
                </Button>
            </div>
        );
    }
    if (!data?.length) {
        return <p className="py-10 text-center text-[#83889e]">아직 인기 상품이 없습니다.</p>;
    }

    return (
        <>
            <LoginRequiredDialog
                open={interests.loginNoticeOpen}
                onOpenChange={interests.onLoginNoticeOpenChange}
            />
            {interests.errorMessage && (
                <div role="alert" className="flex flex-col items-center gap-4 py-4">
                    <p className="text-destructive text-sm">{interests.errorMessage}</p>
                    {interests.canRetry && (
                        <Button variant="outline" onClick={interests.retry}>
                            관심상품 다시 조회
                        </Button>
                    )}
                </div>
            )}
            <HomeProductCarousel
                title="인기 상품 모음"
                products={data.map((product) => ({ ...product, platformName: "지금이니?!" }))}
                interestActions={{
                    liked,
                    disabled: interests.disabled,
                    toggle: (id) => interests.toggle({ source: "OUR", targetId: id }),
                }}
            />
        </>
    );
}
