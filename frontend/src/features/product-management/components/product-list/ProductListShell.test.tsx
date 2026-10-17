import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

    it("다음 페이지를 못 불러와도 이미 불러온 목록은 그대로 두고 다시 시도만 보여준다", () => {
        const retry = vi.fn();
        render(
            <ProductListShell
                eyebrow="등록한 상품을 한눈에"
                title="판매 상품 관리"
                tabs={tabs}
                items={items}
                isLoading={false}
                errorMessage="일시적인 오류가 발생했어요."
                hasNextPage
                isFetchNextPageError
                onRetryLoadMore={retry}
                emptyMessage="등록된 상품이 없습니다."
                listTitle="전체 상품 목록"
                detailRenderer={(item) => <div>{item.title}</div>}
            />,
        );

        expect(screen.getAllByText("판매 중 상품").length).toBeGreaterThan(0);
        expect(screen.getAllByText("임시저장 상품").length).toBeGreaterThan(0);
        expect(screen.queryByText("일시적인 오류가 발생했어요.")).not.toBeInTheDocument();
        expect(screen.getByRole("alert")).toHaveTextContent("상품을 더 불러오지 못했습니다.");
        fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
        expect(retry).toHaveBeenCalled();
    });

    it("첫 페이지를 못 불러오면 목록 대신 오류를 보여준다", () => {
        render(
            <ProductListShell
                eyebrow="등록한 상품을 한눈에"
                title="판매 상품 관리"
                tabs={tabs}
                items={[]}
                isLoading={false}
                errorMessage="일시적인 오류가 발생했어요."
                emptyMessage="등록된 상품이 없습니다."
                listTitle="전체 상품 목록"
                detailRenderer={(item) => <div>{item.title}</div>}
            />,
        );

        expect(screen.getByText("일시적인 오류가 발생했어요.")).toBeInTheDocument();
        expect(screen.queryByText("등록된 상품이 없습니다.")).not.toBeInTheDocument();
    });

    it("분석 대기 상태는 텍스트 대신 점 세 개 아이콘을 보여준다", () => {
        render(
            <ProductListShell
                eyebrow="등록한 상품을 한눈에"
                title="판매 상품 관리"
                tabs={tabs}
                items={[
                    {
                        ...items[0],
                        badgeLabel: "PENDING",
                        badgeTone: "muted",
                    },
                ]}
                isLoading={false}
                emptyMessage="등록된 상품이 없습니다."
                listTitle="전체 상품 목록"
                detailRenderer={(item) => <div>{item.title}</div>}
            />,
        );

        expect(screen.getByAltText("분석 대기")).toBeInTheDocument();
        expect(screen.queryByText("PENDING")).not.toBeInTheDocument();
    });
});
