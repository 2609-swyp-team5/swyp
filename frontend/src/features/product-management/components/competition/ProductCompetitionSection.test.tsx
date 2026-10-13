import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { createProductCompetitionMock } from "../../mocks/productManagementMock";
import { ProductCompetitionSection } from "./ProductCompetitionSection";

it("경쟁 상품이 없으면 0건과 수준 메타를 숨기고 안내 문구를 보여준다", () => {
    const competition = createProductCompetitionMock(1).competition;
    const query = {
        data: {
            productId: 1,
            competition: {
                ...competition,
                count: 0,
                levelLabel: "없음",
                items: [],
            },
        },
        error: null,
        isPending: false,
    } as never;

    render(<ProductCompetitionSection query={query} />);

    expect(screen.getByText("경쟁 상품 수")).toBeInTheDocument();
    expect(screen.getByText("현재 등록된 경쟁 상품이 없습니다.")).toBeInTheDocument();
    expect(screen.queryByText("0건")).not.toBeInTheDocument();
    expect(screen.queryByText("없음")).not.toBeInTheDocument();
});
