import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function StatusPricePage() {
    return (
        <main className="flex flex-1 flex-col bg-white">
            <section className="layout-container flex flex-1 flex-col gap-16 pt-16 pb-[120px]">
                <Link
                    href="/sell/register/direct"
                    className="flex w-fit items-center gap-1 text-[20px] leading-8 font-medium tracking-[0.5px] text-[#6b7395] transition-colors hover:text-[#6653fb]"
                >
                    <ArrowLeft aria-hidden="true" className="size-5" />
                    <span>상품 정보</span>
                </Link>

                <header className="flex flex-col gap-3">
                    <p className="text-[30px] leading-[42px] font-bold tracking-[0.5px] text-[#363636]">
                        상태·가격
                    </p>
                    <h1 className="text-[60px] leading-[75px] font-bold tracking-[0.5px] text-[#6653fb]">
                        상태와 가격을 입력해 주세요
                    </h1>
                </header>

                <section className="flex min-h-[220px] w-full max-w-[1144px] items-center justify-center rounded-xl border border-[#dee5ed] bg-white p-8">
                    <p className="text-[20px] leading-8 font-medium tracking-[0.5px] text-[#6b6c7b]">
                        상태·가격 화면입니다.
                    </p>
                </section>
            </section>
        </main>
    );
}
