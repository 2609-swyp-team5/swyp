"use client";

import Image from "next/image";
import { Button } from "@/common/components/ui/Button";

const withdrawalImpacts = [
    {
        title: "상품 및 분석 정보",
        description: "등록한 상품과 AI 분석 정보를 더이상 사용할 수 없어요.",
    },
    {
        title: "플랫폼 연동",
        description: "연결된 중고 플랫폼의 연동이 해제됩니다.",
    },
];

const withdrawalGuidance = [
    "탈퇴 후에는 모든 개인 정보와 서비스 이용 기록이 즉시 삭제됩니다.",
    "현재 진행 중인 결제 및 구독 서비스는 자동으로 해지되며, 환불 규정에 따라 처리됩니다.",
    "탈퇴 후 동일한 이메일로 재가입이 가능하며, 기존 데이터는 복구되지 않습니다.",
];

type WithdrawalContentProps = {
    isPending: boolean;
    onRequest: () => void;
};
export function WithdrawalContent({ isPending, onRequest }: WithdrawalContentProps) {
    return (
        <div className="flex flex-col gap-10">
            <section className="rounded-[10px] bg-[#f1f1f1] px-[30px] py-5">
                <h2 className="flex items-center gap-[5px] text-[22px] leading-[30px] font-semibold tracking-[0.5px] text-[#fa503d]">
                    <Image
                        src="/figma/withdraw/warning.svg"
                        alt=""
                        width={34}
                        height={34}
                        className="shrink-0"
                    />
                    탈퇴 후에는 기록을 복구할 수 없어요.
                </h2>
            </section>

            <ul className="flex flex-col gap-10">
                {withdrawalImpacts.map((item) => (
                    <li key={item.title} className="flex items-center gap-5 text-[#464646]">
                        <Image
                            src="/figma/withdraw/box.svg"
                            alt=""
                            width={30}
                            height={34}
                            className="shrink-0"
                        />
                        <div className="flex flex-col gap-[5px]">
                            <h3 className="text-[16px] leading-[25px] font-semibold tracking-[0.5px]">
                                {item.title}
                            </h3>
                            <p className="text-[12px] leading-[20px] tracking-[-0.5px]">
                                {item.description}
                            </p>
                        </div>
                    </li>
                ))}
            </ul>

            <ol className="flex flex-col gap-3">
                {withdrawalGuidance.map((item, index) => (
                    <li key={item} className="flex items-center gap-3">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#272727] text-[16px] leading-[25px] font-semibold tracking-[0.5px] text-white">
                            {index + 1}
                        </span>
                        <span className="min-w-0 flex-1 text-[16px] leading-[25px] text-[#464646]">
                            {item}
                        </span>
                    </li>
                ))}
            </ol>

            <div className="flex justify-end">
                <Button
                    disabled={isPending}
                    onClick={onRequest}
                    className="h-[49px] min-w-[184px] rounded-full bg-[#6b6c7b] px-[60px] text-[16px] leading-[25px] font-normal text-white hover:bg-[#c6c6c6] focus-visible:!border-[#6653fb] focus-visible:ring-3 focus-visible:!ring-[#6653fb]/30 disabled:opacity-100 dark:hover:bg-[#c6c6c6]"
                >
                    탈퇴 요청
                </Button>
            </div>
        </div>
    );
}
