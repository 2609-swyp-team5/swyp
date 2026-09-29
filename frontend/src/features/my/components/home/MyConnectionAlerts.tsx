"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/common/components/ui/Button";

const connectionAlerts = [
    {
        platform: "번개장터",
        icon: "/my/home/bunjang.svg",
        message: "번개장터의 로그인이 만료됐어요.",
        time: "2시간 전",
    },
    {
        platform: "당근마켓",
        icon: "/my/home/daangn.svg",
        message: "당근마켓의 로그인이 만료됐어요.",
        time: "5시간 전",
    },
    {
        platform: "중고나라",
        icon: "/my/home/joonggonara.png",
        message: "중고나라의 로그인이 만료됐어요.",
        time: "2시간 전",
    },
];

export function MyConnectionAlerts() {
    return (
        <section
            aria-labelledby="connection-alerts-title"
            className="mt-10 px-6 pt-[30px] pb-[100px] sm:px-10 xl:px-[100px]"
        >
            <div className="mb-[30px] flex items-center gap-[11px]">
                <div className="flex flex-col items-start gap-[5px]">
                    <Image src="/my/home/connection-bell.svg" alt="" width={29} height={29} />
                    <span className="text-[16px] leading-[25px] text-[#d3d3d3]">3건</span>
                </div>
                <h2
                    id="connection-alerts-title"
                    className="text-[20px] leading-[30px] font-semibold tracking-[0.5px] text-[#545d82]"
                >
                    연결 알림을
                    <br />
                    확인해주세요
                </h2>
            </div>
            <div className="grid gap-[10px] sm:grid-cols-2 xl:grid-cols-3">
                {connectionAlerts.map((item) => (
                    <article
                        key={item.platform}
                        className="flex min-h-[154px] min-w-0 flex-col rounded-[10px] border border-[#dedee6] bg-white px-5 pt-5 pb-[15px]"
                    >
                        <div className="flex min-w-0 items-center gap-[10px]">
                            <Image
                                src={item.icon}
                                alt=""
                                width={37}
                                height={37}
                                className="size-[37px] shrink-0 rounded-[8px]"
                            />
                            <div className="min-w-0">
                                <h3 className="text-[13px] leading-[20px] font-semibold tracking-[-0.5px] text-[#6b6c7b]">
                                    {item.message}
                                </h3>
                                <p className="text-[10px] leading-[15px] text-[#83889e]">
                                    {item.time}
                                </p>
                            </div>
                        </div>
                        <p className="mt-[18px] text-[10px] leading-[15px] tracking-[-0.5px] text-[#83889e]">
                            판매 상태 동기화를 위해
                            <br />
                            다시 연결해 주세요.
                        </p>
                        <Button
                            asChild
                            variant="outline"
                            className="mt-auto h-auto self-end rounded-full border-[#6b6c7b] px-[10px] py-[3px] text-[10px] leading-[15px] text-[#6b6c7b] hover:border-[#6653fb] hover:bg-[#fafbff] hover:text-[#6653fb] focus-visible:!border-[#6653fb] focus-visible:ring-3 focus-visible:!ring-[#6653fb]/30 dark:hover:bg-[#fafbff]"
                        >
                            <Link href="/my/platforms" aria-label={`${item.platform} 다시 연결`}>
                                다시 연결
                            </Link>
                        </Button>
                    </article>
                ))}
            </div>
        </section>
    );
}
