import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { ProductListShell } from "./ProductListShell";
import type { ProductListItemData, ProductListTab } from "./productListTypes";

const tabs: ProductListTab[] = [
    {
        key: "ALL",
        label: "전체",
        filter: () => true,
    },
    {
        key: "DRAFT",
        label: "임시저장",
        filter: (item) => item.status === "DRAFT",
    },
];

const items: ProductListItemData[] = [
    {
        id: "1",
        title: "판매 중 상품",
        price: 10000,
        categoryName: "전자기기",
        thumbnailUrl: null,
        badgeLabel: null,
        badgeTone: "muted",
        metaLabel: "판매 중인 상품",
        status: "ON_SALE",
    },
    {
        id: "2",
        title: "임시저장 상품",
        price: 20000,
        categoryName: "전자기기",
        thumbnailUrl: null,
        badgeLabel: null,
        badgeTone: "muted",
        metaLabel: "임시저장 상품",
        status: "DRAFT",
    },
];

describe("ProductListShell", () => {
    beforeEach(() => {
        window.history.replaceState({}, "", "/sell/manage?selected=1");
    });

    it("탭을 변경하면 선택 상품 query를 제거한다", () => {
        render(
            <ProductListShell
                eyebrow="등록한 상품을 한눈에"
                title="판매 상품 관리"
                tabs={tabs}
                items={items}
                isLoading={false}
                emptyMessage="등록된 상품이 없습니다."
                listTitle="전체 상품 목록"
                detailRenderer={(item) => <div>{item.title}</div>}
            />,
        );

        expect(screen.getAllByText("판매 중 상품").length).toBeGreaterThan(0);

        fireEvent.click(screen.getByRole("tab", { name: /임시저장/ }));

        expect(new URLSearchParams(window.location.search).get("selected")).toBeNull();
        expect(screen.getByText("상품을 선택해 주세요")).toBeInTheDocument();
    });
});
