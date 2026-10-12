import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProductSummarySkeleton } from "./ProductSummarySkeleton";

describe("ProductSummarySkeleton", () => {
    it("판매 상품 관리는 통계 영역을 포함한 관리 카드 구조로 로딩한다", () => {
        render(<ProductSummarySkeleton />);

        expect(screen.getByLabelText("상품 정보를 불러오는 중")).toBeInTheDocument();
    });
});
