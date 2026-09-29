"use client";

const summaries = [
    { title: "등록한 물건", value: "6개", description: "판매 중 3 · 예약2 · 완료 1" },
    { title: "AI 추천 알림", value: "2건", description: "오늘 새로 분석한 타이밍" },
    { title: "평균 시세 대비", value: "+4.1%", description: "내 물건들의 전체 시세 평균" },
    { title: "최근 분석일", value: "오늘", description: "2026년 9월 9일 오전 9:12" },
];

export function MySummaryCards() {
    return (
        <section aria-label="거래 요약" className="mt-[60px] grid gap-[10px] sm:grid-cols-2">
            {summaries.map((item) => (
                <article
                    key={item.title}
                    className="flex flex-col justify-between gap-3 rounded-[10px] border border-[#d3d3d3] bg-white p-6"
                >
                    <div>
                        <h2 className="text-[13px] leading-5 font-semibold tracking-[-0.5px] text-[#464646]">
                            {item.title}
                        </h2>
                        <p className="text-[30px] leading-[42px] font-bold tracking-[0.5px] text-[#6653fb]">
                            {item.value}
                        </p>
                    </div>
                    <p className="text-base leading-[25px] text-[#464646]">{item.description}</p>
                </article>
            ))}
        </section>
    );
}
