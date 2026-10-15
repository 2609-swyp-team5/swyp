import type {
    AiChatAnalysisCard,
    AiChatRecommendation,
    AiChatRecommendedProduct,
} from "../schemas/aiChatSchema";

export const recommendationHeadline: Record<AiChatRecommendation, string> = {
    SELL: "지금 팔기 좋아요",
    HOLD: "조금 더 기다려 보세요",
    BUY: "지금 사기 좋아요",
    WAIT: "곧 사기 좋은 타이밍이 올 수 있어요",
};

/** 분석 카드가 여는 화면 — 내 상품은 판매 관리, 그 밖은 상품 상세. */
export function analysisCardHref(card: AiChatAnalysisCard) {
    return card.mine ? `/sell/manage?selected=${card.productId}` : `/search/${card.productId}`;
}

export function recommendedProductHref(product: AiChatRecommendedProduct) {
    return `/search/${product.id}`;
}

/** 평균가 대비 문구 — 비교 매물이 없으면 "비교 데이터 부족". */
export function priceDiffText(priceDiffRate: number | null) {
    if (priceDiffRate === null) return "비교 데이터 부족";
    const rate = Math.round(priceDiffRate);
    if (rate === 0) return "평균 수준이에요";
    return `평균보다 ${Math.abs(rate)}% ${rate > 0 ? "높아요" : "낮아요"}`;
}

/** 대화 목록 시각 — 오늘은 "N분 전"/"N시간 전", 그 전은 "M/D". */
export function formatChatTime(value: string, now = Date.now()) {
    const time = new Date(value).getTime();
    const minutes = Math.floor((now - time) / 60000);
    if (minutes < 1) return "방금";
    if (minutes < 60) return `${minutes}분 전`;
    if (minutes < 24 * 60) return `${Math.floor(minutes / 60)}시간 전`;
    const date = new Date(value);
    return `${date.getMonth() + 1}/${date.getDate()}`;
}
