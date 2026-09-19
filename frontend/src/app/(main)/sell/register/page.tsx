import { Clock3, PenLine, Sparkles } from "lucide-react";

import { RegisterMethodCard } from "@/features/sell/components/RegisterMethodCard";

const registerMethods = [
    {
        title: "AI로 빠르게 등록하기",
        description:
            "사진을 올리면 AI가 상품명, 카테고리, 상태와 판매 글을 자동으로 작성해 드려요.",
        features: [
            "사진 한 장으로 상품 정보 자동 완성",
            "AI 시세 분석 + 판매 타이밍 추천",
            "플랫폼별 판매 글 자동 생성",
        ],
        href: "/sell/register/ai",
        tone: "ai" as const,
        icon: <Sparkles aria-hidden="true" className="size-6" fill="currentColor" />,
    },
    {
        title: "직접 등록하기",
        description:
            "상품 정보를 직접 입력하고, AI의 시세 분석으로 최적의 가격을 설정할 수 있어요.",
        features: ["상세정보 직접 입력", "AI 시세 분석 지원", "원하는 방식으로 자유롭게 작성"],
        href: "/sell/register/direct",
        tone: "direct" as const,
        icon: <PenLine aria-hidden="true" className="size-6" />,
    },
] as const;

export default function SellRegisterPage() {
    return (
        <main className="flex flex-1 flex-col bg-white">
            <section
                aria-labelledby="register-page-title"
                className="layout-container flex flex-1 flex-col gap-[50px] py-16 pb-[120px]"
            >
                <header className="flex flex-col gap-2.5">
                    <p className="typography-heading-02 text-[#363636]">판매할 상품을</p>
                    <h1 id="register-page-title" className="typography-heading-01 text-[#6653fb]">
                        어떻게 등록할까요?
                    </h1>
                </header>

                <div className="typography-body-medium flex items-center gap-3 rounded-[10px] bg-[#f5f5ff] px-5 py-3 text-[#363636]">
                    <Clock3 aria-hidden="true" className="size-[30px] shrink-0" strokeWidth={1.5} />
                    <span>작성 중인 상품이 있어요 — 이어서 등록하기</span>
                </div>

                <div className="layout-grid">
                    {registerMethods.map((method) => (
                        <RegisterMethodCard
                            key={method.href}
                            className="col-span-2 md:col-span-6 lg:col-span-4"
                            {...method}
                        />
                    ))}
                </div>
            </section>
        </main>
    );
}
