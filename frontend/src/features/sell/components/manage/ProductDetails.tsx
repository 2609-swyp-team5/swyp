import type { ProductResponse } from "@/features/sell/types";
import {
    conditionLabels,
    priceFormatter,
    tradeMethodLabels,
} from "@/features/sell/components/manage/productReviewUtils";

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="typography-body-medium flex items-center gap-4 border-b border-[#d3d3d3] py-2.5 md:py-3">
            <dt className="w-[96px] shrink-0 font-semibold tracking-[0.5px] text-[#83889e] md:w-[160px]">
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
        ["구성품", product.includedItems.length > 0 ? product.includedItems.join(", ") : "없음"],
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
                    className="typography-heading-02 font-bold text-[#363636]"
                >
                    등록된 상품 정보
                </h2>
                <dl className="flex flex-col gap-2.5">
                    {details.map(([label, value]) => (
                        <DetailRow key={label} label={label} value={value} />
                    ))}
                </dl>
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-8 md:gap-[50px]">
                <div className="flex min-h-[200px] flex-col gap-2.5 md:h-[392px]">
                    <h3 className="typography-body-bold font-semibold text-[#363636]">상세 설명</h3>
                    <div className="flex min-h-0 flex-1 flex-col items-end justify-between rounded-[5px] border border-[#d3d3d3] bg-[#fafbff] p-4 md:p-6 lg:p-[30px]">
                        <p className="typography-heading-03 w-full font-medium whitespace-pre-wrap text-[#363636]">
                            {description}
                        </p>
                        <span className="font-brand typography-body-small text-[#6b7395]">
                            현재 {descriptionLength}자 · 권장 길이에 적합해요
                        </span>
                    </div>
                </div>

                <div className="flex flex-col gap-2.5">
                    <h3 className="typography-body-bold font-semibold text-[#363636]">추천 태그</h3>
                    <div className="flex flex-wrap gap-3">
                        {product.tags.length > 0 ? (
                            product.tags.map((tag) => (
                                <span
                                    key={tag}
                                    className="typography-body-bold-small rounded-full bg-[#eaeafd] px-3 py-1 font-semibold text-[#6653fb] md:px-5"
                                >
                                    #{tag}
                                </span>
                            ))
                        ) : (
                            <span className="typography-body-small font-medium text-[#6b7395]">
                                등록된 태그가 없습니다.
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
