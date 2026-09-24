// UI publishing fixtures. Replace with member data when the API is connected.
export const MY_PREVIEW_PROFILE = {
    name: "김민준",
    email: "minjun.kim@example.com",
    phone: "010-1234-5678",
};

export const MY_PREVIEW_PRODUCTS = [
    {
        id: 1,
        name: "애플 아이패드 프로 11인치 4세대",
        price: 720000,
        platform: "번개장터",
        status: "판매 중",
        change: 2.1,
    },
    {
        id: 2,
        name: "다이슨 에어랩 멀티스타일러",
        price: 340000,
        platform: "당근마켓",
        status: "판매 중",
        change: -0.8,
    },
    {
        id: 3,
        name: "나이키 에어포스 1 270mm",
        price: 85000,
        platform: "중고나라",
        status: "관심",
        change: 0.3,
    },
    {
        id: 4,
        name: "소니 WH-1000XM5 헤드폰",
        price: 220000,
        platform: "번개장터",
        status: "관심",
        change: 5.4,
    },
    {
        id: 5,
        name: "르쿠르제 냄비 22cm 체리",
        price: 180000,
        platform: "후르츠패밀리",
        status: "판매 중",
        change: 1.2,
    },
    {
        id: 6,
        name: "캐논 EOS R50 미러리스 카메라",
        price: 580000,
        platform: "당근마켓",
        status: "완료",
        change: null,
    },
] as const;
