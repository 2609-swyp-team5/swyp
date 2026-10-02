"use client";

import { Info, TriangleAlert } from "lucide-react";
import { Button } from "@/common/components/ui/Button";
import { Checkbox } from "@/common/components/ui/Checkbox";
import { Label } from "@/common/components/ui/Label";

const sectionHeadingClassName =
    "text-[16px] leading-[25px] font-semibold tracking-[0.5px] text-[#464646]";

const infoIconClassName = "size-[18px] shrink-0";

const infoRowClassName = "flex items-center gap-[5px]";

const withdrawalGuidance = [
    "탈퇴 후에는 모든 개인 정보와 서비스 이용 기록이 즉시 삭제됩니다.",
    "현재 진행 중인 결제 및 구독 서비스는 자동으로 해지되며, 환불 규정에 따라 처리됩니다.",
    "탈퇴 후 동일한 이메일로 재가입이 가능하며, 기존 데이터는 복구되지 않습니다.",
];

type WithdrawalContentProps = {
    agreedToGuidance: boolean;
    agreedToDeletion: boolean;
    agreed: boolean;
    isPending: boolean;
    onGuidanceChange: (checked: boolean) => void;
    onDeletionChange: (checked: boolean) => void;
    onRequest: () => void;
};
export function WithdrawalContent({
    agreedToGuidance,
    agreedToDeletion,
    agreed,
    isPending,
    onGuidanceChange,
    onDeletionChange,
    onRequest,
}: WithdrawalContentProps) {
    return (
        <div>
            <section className="rounded-[10px] bg-[#f1f1f1] p-[30px] text-[#fa503d]">
                <h2 className="flex items-center gap-[5px] text-[20px] leading-[30px] font-semibold tracking-[0.5px]">
                    <TriangleAlert
                        aria-hidden="true"
                        className="size-[34px] shrink-0"
                        strokeWidth={2.5}
                    />
                    탈퇴 전 꼭 확인해주세요
                </h2>
                <ul className="mt-[15px] list-disc pl-[24px] text-[16px] leading-[25px]">
                    <li>등록된 모든 상품과 분석 데이터가 삭제됩니다.</li>
                    <li>연결된 중고 플랫폼 동기화가 해제됩니다.</li>
                    <li>AI 추천 알림 이력이 모두 삭제됩니다.</li>
                    <li>삭제된 계정과 데이터는 복구할 수 없습니다.</li>
                </ul>
            </section>

            <div className="mt-10 space-y-1.5 text-[14px] leading-[21px] tracking-[-0.5px] text-[#464646]">
                <p className={infoRowClassName}>
                    <Info aria-hidden="true" className={infoIconClassName} />
                    탈퇴를 계속하려면 아래 내용을 확인하고 동의해주세요.
                </p>
                <p className={infoRowClassName}>
                    <Info aria-hidden="true" className={infoIconClassName} />
                    탈퇴 후에는 계정 복구가 불가능하며, 모든 데이터가 영구 삭제됩니다.
                </p>
            </div>

            <section className="mt-[30px] border-b border-[#6b6c7b] pb-[30px]">
                <h2 className={sectionHeadingClassName}>탈퇴 전 확인해야 할 핵심 안내</h2>
                <ol className="mt-5 space-y-3">
                    {withdrawalGuidance.map((item, index) => (
                        <li key={item} className="flex items-center gap-3">
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#272727] text-[16px] leading-[25px] font-semibold text-white">
                                {index + 1}
                            </span>
                            <span className="text-[16px] leading-[25px] text-[#464646]">
                                {item}
                            </span>
                        </li>
                    ))}
                </ol>
            </section>

            <section className="mt-[30px]">
                <h2 className={sectionHeadingClassName}>회원 탈퇴 약정 동의</h2>
                <div className="mt-5 space-y-3">
                    {[
                        {
                            id: "withdraw-guidance",
                            checked: agreedToGuidance,
                            onCheckedChange: onGuidanceChange,
                            label: "위 안내 사항을 모두 확인하였으며, 계정 탈퇴에 동의합니다.",
                        },
                        {
                            id: "withdraw-deletion",
                            checked: agreedToDeletion,
                            onCheckedChange: onDeletionChange,
                            label: "개인 정보 및 서비스 이용 기록의 영구 삭제에 동의합니다.",
                        },
                    ].map((item) => (
                        <div key={item.id} className="flex items-center gap-2">
                            <Checkbox
                                id={item.id}
                                checked={item.checked}
                                disabled={isPending}
                                onCheckedChange={(value) => item.onCheckedChange(value === true)}
                                className="size-6 border-[#272727] bg-white data-checked:border-[#272727] data-checked:bg-[#272727] [&_svg]:!size-[18px]"
                            />
                            <Label
                                htmlFor={item.id}
                                className="cursor-pointer text-[14px] leading-[21px] font-semibold tracking-[0.07px] text-[#6b6c7b]"
                            >
                                {item.label}
                            </Label>
                        </div>
                    ))}
                </div>
            </section>

            <div className="mt-[70px] flex justify-end">
                <Button
                    disabled={!agreed || isPending}
                    onClick={onRequest}
                    className="h-[49px] min-w-[183px] rounded-full bg-[#6b6c7b] px-[60px] text-[16px] leading-[25px] font-normal text-white hover:bg-[#c6c6c6] focus-visible:!border-[#6653fb] focus-visible:ring-3 focus-visible:!ring-[#6653fb]/30 disabled:opacity-100 dark:hover:bg-[#c6c6c6]"
                >
                    탈퇴 요청
                </Button>
            </div>
        </div>
    );
}
