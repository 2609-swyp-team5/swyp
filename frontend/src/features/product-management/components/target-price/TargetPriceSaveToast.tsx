import { formatPrice } from "../analysis/market-analysis/formatters";

export function TargetPriceSaveToast({
    targetPrice,
    description = "추천 가격이 목표가 이상이 되면 알려드릴게요.",
}: {
    targetPrice: number;
    description?: string;
}) {
    return (
        <div
            role="status"
            aria-live="polite"
            className="fixed top-[calc(var(--header-height)+32px)] left-1/2 z-50 flex w-[min(calc(100vw-32px),422px)] -translate-x-1/2 flex-col items-center justify-center rounded-[16px] border border-[#dee5ed] bg-white p-[33px] text-center shadow-[0_8px_24px_rgba(54,51,100,0.18)]"
        >
            <div className="flex w-full max-w-[354px] flex-col items-center gap-[35px]">
                <div className="flex w-full flex-col items-center">
                    <p className="text-[20px] leading-[30px] font-bold text-[#545d82]">
                        입력하신 목표가를 저장했습니다!
                    </p>
                    <p className="pt-1 text-[14px] leading-[21px] text-[#6b7395]">{description}</p>
                </div>
                <div className="flex w-full flex-col items-center justify-center bg-[#fafbff] py-2.5 text-[#6653fb]">
                    <span className="text-[16px] leading-[25px] font-semibold tracking-[0.5px]">
                        목표가
                    </span>
                    <strong className="text-[22px] leading-[30px] font-semibold tracking-[0.5px]">
                        {formatPrice(targetPrice)}
                    </strong>
                </div>
            </div>
        </div>
    );
}
