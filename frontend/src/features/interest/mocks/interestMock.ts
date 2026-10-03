import type { ApiResponse } from "@/common/lib/api/types";

import type {
    InterestCreateResponse,
    InterestListItem,
    InterestListResponse,
    InterestRegisterInput,
} from "../types";

export const interestMockSource = "mock" as const;

const mockDelayMs = 250;

const mockInterestItems: InterestListItem[] = [
    {
        interestId: 1001,
        source: "OUR",
        targetId: 42,
        title: "아이폰 13 mini 128GB",
        price: 320000,
        status: "ON_SALE",
        condition: "A",
        categoryName: "스마트폰",
        thumbnailUrl: null,
        recommendation: "BUY",
        marketAveragePrice: 350000,
        platformName: null,
        externalUrl: null,
        targetPrice: 320000,
        createdAt: "2026-10-02T12:00:00+09:00",
    },
    {
        interestId: 1002,
        source: "EXTERNAL",
        targetId: 43,
        title: "아이패드 프로 5세대 12.9인치 1TB",
        price: 1100000,
        status: "SELLING",
        condition: "A",
        categoryName: "태블릿",
        thumbnailUrl:
            "https://img2.joongna.com/media/original/2026/09/23/17901243280321Lf_aZjpZ.jpg?impolicy=thumb&size=150",
        recommendation: null,
        marketAveragePrice: 1300000,
        platformName: "중고나라",
        externalUrl: "https://web.joongna.com/product/232658062",
        targetPrice: 1000000,
        createdAt: "2026-10-01T15:30:00+09:00",
    },
    {
        interestId: 1003,
        source: "OUR",
        targetId: 44,
        title: "소니 WH-1000XM5 노이즈 캔슬링 헤드폰",
        price: 280000,
        status: "SOLD_OUT",
        condition: "B",
        categoryName: "헤드폰",
        thumbnailUrl: null,
        recommendation: "BUY",
        marketAveragePrice: 300000,
        platformName: "헬로마켓",
        externalUrl: null,
        targetPrice: null,
        createdAt: "2026-09-28T09:20:00+09:00",
    },
    {
        interestId: 1004,
        source: "OUR",
        targetId: 45,
        title: "아이패드 에어 5세대 64GB",
        price: 495000,
        status: "ON_SALE",
        condition: "A",
        categoryName: "태블릿",
        thumbnailUrl: null,
        recommendation: "BUY",
        marketAveragePrice: 520000,
        platformName: null,
        externalUrl: null,
        targetPrice: 480000,
        createdAt: "2026-09-27T11:10:00+09:00",
    },
    {
        interestId: 1005,
        source: "OUR",
        targetId: 46,
        title: "다이슨 에어랩 멀티스타일러",
        price: 420000,
        status: "ON_SALE",
        condition: "B",
        categoryName: "생활가전",
        thumbnailUrl: null,
        recommendation: "WAIT",
        marketAveragePrice: 400000,
        platformName: null,
        externalUrl: null,
        targetPrice: 360000,
        createdAt: "2026-09-25T14:40:00+09:00",
    },
    {
        interestId: 1006,
        source: "EXTERNAL",
        targetId: 47,
        title: "나이키 에어포스 1 화이트",
        price: 89000,
        status: "SELLING",
        condition: null,
        categoryName: "패션",
        thumbnailUrl: null,
        recommendation: null,
        marketAveragePrice: 95000,
        platformName: "번개장터",
        externalUrl: "https://m.bunjang.co.kr/products/404048469",
        targetPrice: null,
        createdAt: "2026-09-24T08:15:00+09:00",
    },
];

let interests = mockInterestItems.map((interest) => ({ ...interest }));

function waitForMockResponse() {
    return new Promise<void>((resolve) => window.setTimeout(resolve, mockDelayMs));
}

export async function getInterestsMock(): Promise<ApiResponse<InterestListResponse>> {
    await waitForMockResponse();

    return {
        success: true,
        message: "관심상품 mock 목록 조회 성공",
        data: {
            content: interests.map((interest) => ({ ...interest })),
            nextCursor: null,
            hasNext: false,
        },
        error: null,
    };
}

export async function registerInterestMock(
    input: InterestRegisterInput,
): Promise<ApiResponse<InterestCreateResponse>> {
    await waitForMockResponse();

    const existingInterest = interests.find(
        (interest) => interest.source === input.source && interest.targetId === input.targetId,
    );

    if (existingInterest) {
        return {
            success: true,
            message: "이미 관심상품으로 등록된 상품입니다.",
            data: { interestId: existingInterest.interestId },
            error: null,
        };
    }

    const interestId = Math.max(0, ...interests.map((interest) => interest.interestId)) + 1;
    interests = [
        {
            interestId,
            source: input.source,
            targetId: input.targetId,
            title: `관심상품 mock ${input.targetId}`,
            price: 320000,
            status: input.source === "EXTERNAL" ? "SELLING" : "ON_SALE",
            condition: "A",
            categoryName: "기타",
            thumbnailUrl: null,
            recommendation: "BUY",
            marketAveragePrice: 350000,
            platformName: input.source === "EXTERNAL" ? "외부 플랫폼" : null,
            externalUrl:
                input.source === "EXTERNAL"
                    ? `https://m.bunjang.co.kr/products/${input.targetId}`
                    : null,
            targetPrice: 320000,
            createdAt: new Date().toISOString(),
        },
        ...interests,
    ];

    return {
        success: true,
        message: "관심상품 mock 등록 성공",
        data: { interestId },
        error: null,
    };
}

export async function deleteInterestMock(interestId: number): Promise<ApiResponse<null>> {
    await waitForMockResponse();
    interests = interests.filter((interest) => interest.interestId !== interestId);

    return {
        success: true,
        message: "관심상품 mock 삭제 성공",
        data: null,
        error: null,
    };
}
