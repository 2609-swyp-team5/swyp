"use client";

import Image from "next/image";
import { useState } from "react";

import { Button } from "@/common/components/ui/Button";
import { Checkbox } from "@/common/components/ui/Checkbox";

const withdrawalImpacts = [
    {
        icon: { src: "/figma/withdraw/box.svg", width: 30, height: 34 },
        title: "상품 및 분석 정보",
        description: "등록한 상품과 AI 분석 정보를 더이상 사용할 수 없어요.",
    },
    {
        icon: { src: "/figma/withdraw/link.svg", width: 32, height: 32 },
        title: "플랫폼 연동",
        description: "연결된 중고 플랫폼의 연동이 해제됩니다.",
    },
    {
        icon: { src: "/figma/withdraw/bell.svg", width: 30, height: 32 },
        title: "알림 설정",
        description: "시세 및 AI 추천 알림 수신이 중단됩니다.",
    },
];

const checkboxClassName =
    "size-6 border-[#d3d3d3] bg-[#fafbff] data-[state=checked]:border-[#272727] data-[state=checked]:bg-[#272727] data-[state=checked]:text-white dark:bg-[#fafbff] dark:data-[state=checked]:bg-[#272727] [&_[data-slot=checkbox-indicator]>svg]:size-[18px]";

type WithdrawalContentProps = {
    isPending: boolean;
    onRequest: () => void;
};
/** 회원 탈퇴 안내와 동의(Figma 1854-15768) */
export function WithdrawalContent({ isPending, onRequest }: WithdrawalContentProps) {
    const [agreed, setAgreed] = useState(false);

    return (
        <div className="flex flex-col gap-10">
            <div className="flex flex-col gap-[30px]">
                <div className="overflow-hidden rounded-[10px] border border-[#d3d3d3]">
                    <section className="bg-[#fff4f4] px-[30px] py-5">
                        <h2 className="flex items-center gap-[5px] text-[16px] leading-[25px] font-semibold tracking-[0.5px] text-[#fa503d]">
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

                    <section className="flex flex-col gap-5 p-[30px]">
                        <h3 className="text-[22px] leading-[30px] font-semibold tracking-[0.5px] text-[#363636]">
                            탈퇴 전 확인 사항
                        </h3>
                        <ul className="flex flex-col">
                            {withdrawalImpacts.map((item) => (
                                <li
                                    key={item.title}
                                    className="flex items-center gap-5 border-b border-[#d3d3d3] py-[15px] text-[#464646] last:border-b-0"
                                >
                                    <Image
                                        src={item.icon.src}
                                        alt=""
                                        width={item.icon.width}
                                        height={item.icon.height}
                                        className="shrink-0"
                                    />
                                    <div className="flex flex-col gap-[5px]">
                                        <h4 className="text-[16px] leading-[25px] font-semibold tracking-[0.5px]">
                                            {item.title}
                                        </h4>
                                        <p className="text-[12px] leading-[20px] tracking-[-0.5px]">
                                            {item.description}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                        <p className="flex items-center gap-[10px] text-[12px] leading-[20px] tracking-[-0.5px] text-[#6b6c7b]">
                            <Image
                                src="/figma/withdraw/info.svg"
                                alt=""
                                width={20}
                                height={20}
                                className="shrink-0"
                            />
                            <span>
                                자세한 데이터 처리 기준은{" "}
                                <span className="underline">개인정보처리방침</span>
                                에서 확인해주세요.
                            </span>
                        </p>
                    </section>
                </div>

                <div className="flex flex-col gap-[3px] px-[10px]">
                    <div className="flex items-center gap-[10px]">
                        <Checkbox
                            id="withdrawal-agreement"
                            checked={agreed}
                            disabled={isPending}
                            onCheckedChange={(value) => setAgreed(value === true)}
                            className={checkboxClassName}
                        />
                        <label
                            htmlFor="withdrawal-agreement"
                            className="cursor-pointer text-[16px] leading-[25px] text-[#464646]"
                        >
                            위 안내 사항을 모두 확인하였으며, 계정 탈퇴에 동의합니다.
                        </label>
                    </div>
                    <p className="ps-[35px] text-[12px] leading-[20px] tracking-[-0.5px] text-[#6b6c7b]">
                        동의 후 탈퇴를 진행할 수 있어요
                    </p>
                </div>
            </div>

            <div className="flex justify-end">
                <Button
                    disabled={!agreed || isPending}
                    onClick={onRequest}
                    className="h-auto rounded-full bg-[#272727] px-[30px] py-2 text-[16px] leading-[25px] font-semibold tracking-[0.5px] text-white hover:bg-[#464646] focus-visible:!border-[#6653fb] focus-visible:ring-3 focus-visible:!ring-[#6653fb]/30 disabled:bg-[#c6c6c6] disabled:opacity-100 dark:hover:bg-[#464646]"
                >
                    탈퇴 요청
                </Button>
            </div>
        </div>
    );
}
