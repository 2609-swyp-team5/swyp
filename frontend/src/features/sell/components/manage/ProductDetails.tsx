import type { ProductResponse } from "@/features/sell/types";
import {
    conditionLabels,
    defectLabels,
    formatPurchasePeriod,
    priceFormatter,
    tradeMethodLabels,
} from "@/features/sell/components/manage/productReviewUtils";

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center gap-4 border-b border-[#d3d3d3] py-3 text-[16px] leading-[25px]">
            <dt className="w-[160px] shrink-0 font-semibold tracking-[0.5px] text-[#83889e]">
                {label}
            </dt>
            <dd className="font-normal break-words text-[#363636]">{value}</dd>
        </div>
    );
}

export function ProductDetails({ product }: { product: ProductResponse }) {
    const description = product.description ?? "등록된 상세 설명이 없습니다.";
    const descriptionLength = product.description?.length ?? 0;
    const details = [
        ["상품 상태", conditionLabels[product.condition]],
        ["구매 시기", formatPurchasePeriod(product.purchasedMonths)],
        ["구성품", product.includedItems.length > 0 ? product.includedItems.join(", ") : "없음"],
        ["하자 여부", defectLabels[product.defectStatus]],
        ["거래 방식", tradeMethodLabels[product.tradeMethod]],
        [
            "배송비",
            product.deliveryType === null
                ? "해당 없음"
                : product.deliveryType === "INCLUDED"
                  ? "포함"
                  : "별도",
        ],
        ["판매 가격", `${priceFormatter.format(product.price)}원`],
    ] as const;

    return (
        <section
            aria-labelledby="product-details-title"
            className="flex flex-col gap-8 rounded-[20px] border border-[#d3d3d3] bg-white px-5 py-6 md:px-8 md:py-8 lg:flex-row lg:items-start lg:gap-[100px] lg:px-[50px] lg:py-[30px]"
        >
            <div className="flex min-w-0 flex-1 flex-col gap-6 lg:gap-[30px]">
                <h2
                    id="product-details-title"
                    className="text-[28px] leading-[42px] font-bold tracking-[0.5px] text-[#363636] md:text-[30px]"
                >
                    등록된 상품 정보
                </h2>
                <dl className="flex flex-col gap-2.5">
                    {details.map(([label, value]) => (
                        <DetailRow key={label} label={label} value={value} />
                    ))}
                </dl>
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-[50px]">
                <div className="flex h-[392px] flex-col gap-2.5">
                    <h3 className="text-[16px] leading-[25px] font-semibold tracking-[0.5px] text-[#363636]">
                        상세 설명
                    </h3>
                    <div className="flex min-h-0 flex-1 flex-col items-end justify-between rounded-[5px] border border-[#d3d3d3] bg-[#fafbff] p-6 lg:p-[30px]">
                        <p className="w-full text-[18px] leading-8 font-medium tracking-[0.5px] whitespace-pre-wrap text-[#363636] lg:text-[20px]">
                            {description}
                        </p>
                        <span className="font-brand text-[12px] leading-[18px] text-[#6b7395]">
                            현재 {descriptionLength}자 · 권장 길이에 적합해요
                        </span>
                    </div>
                </div>

                <div className="flex flex-col gap-2.5">
                    <h3 className="text-[16px] leading-[25px] font-semibold tracking-[0.5px] text-[#363636]">
                        추천 태그
                    </h3>
                    <div className="flex flex-wrap gap-3">
                        {product.tags.length > 0 ? (
                            product.tags.map((tag) => (
                                <span
                                    key={tag}
                                    className="rounded-full bg-[#eaeafd] px-5 py-1 text-[13px] leading-5 font-semibold tracking-[-0.5px] text-[#6653fb]"
                                >
                                    #{tag}
                                </span>
                            ))
                        ) : (
                            <span className="text-[14px] leading-5 font-medium text-[#6b7395]">
                                등록된 태그가 없습니다.
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
