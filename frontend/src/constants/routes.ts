type Route = {
    href: string;
    label: string;
    requiresAuth?: boolean;
};

export const ROUTES: Route[] = [
    { href: "/home", label: "홈" },
    { href: "/search", label: "검색" },
    { href: "/sell/manage", label: "판매 상품 관리", requiresAuth: true },
    { href: "/sell/register", label: "상품 등록", requiresAuth: true },
    { href: "/buy/wishlist", label: "관심 상품", requiresAuth: true },
    { href: "/notifications", label: "알림", requiresAuth: true },
    { href: "/my", label: "마이페이지", requiresAuth: true },
];

export const HEADER_LINKS = ROUTES.filter((route) => route.href !== "/my");
