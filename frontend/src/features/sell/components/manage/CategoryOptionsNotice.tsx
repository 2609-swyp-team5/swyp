"use client";

import Link from "next/link";
import { CircleAlert } from "lucide-react";

import { useCategoryOptionsQuery } from "@/features/sell/hooks/queries/useCategoryOptionsQuery";
import type { ProductResponse } from "@/features/sell/types";

type CategoryOptionsNoticeProps = {
    product: ProductResponse;
    editHref: string;
};

/**
 * 카테고리 필수 추가 항목(사이즈·사용기한 등)이 빠진 상품에 번개장터 게시 전 입력을 안내한다. AI 등록은 사진 분석 뒤에 카테고리가
 * 정해져 등록 때 항목을 받지 못하고, 기능 추가 전 상품도 비어 있어 게시가 거절되기 전에 미리 알려 준다.
 */
export function CategoryOptionsNotice({ product, editHref }: CategoryOptionsNoticeProps) {
    const { data: groups = [] } = useCategoryOptionsQuery(
        product.category.leaf ? product.category.id : null,
    );
    const filledGroupIds = new Set((product.categoryOptions ?? []).map((option) => option.groupId));
    const missing = groups.filter((group) => group.required && !filledGroupIds.has(group.groupId));

    if (missing.length === 0) {
        return null;
    }

    const names = missing.map((group) => group.name).join(", ");

    return (
        <section
            aria-labelledby="category-options-notice-title"
            className="flex flex-col gap-4 rounded-[16px] border border-[#ffd8a8] bg-[#fff9f0] px-6 py-5 md:flex-row md:items-center md:justify-between"
        >
            <div className="flex items-start gap-3">
                <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[#f08c00]" />
                <div className="flex flex-col gap-1">
                    <h2
                        id="category-options-notice-title"
                        className="text-[16px] leading-[25px] font-semibold text-[#363636]"
                    >
                        번개장터에 올리려면 {names} 입력이 필요해요
                    </h2>
                    <p className="text-[14px] leading-[22px] text-[#6b6c7b]">
                        이 카테고리는 번개장터 등록 시 필수 항목이 있어요. 상품 수정에서 입력해
                        주세요.
                    </p>
                </div>
            </div>
            <Link
                href={editHref}
                className="inline-flex h-11 shrink-0 items-center justify-center rounded-[10px] bg-[#6653fb] px-5 text-[15px] font-semibold text-white transition-colors hover:bg-[#5543e8]"
            >
                추가 항목 입력하기
            </Link>
        </section>
    );
}
