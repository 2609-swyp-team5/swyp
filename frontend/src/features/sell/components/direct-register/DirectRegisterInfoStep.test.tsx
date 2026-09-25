import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DirectRegisterInfoStep } from "./DirectRegisterInfoStep";
import type { DirectRegisterInfoState } from "./types";

const categories = [
    { id: 1, name: "디지털", parentId: null },
    { id: 2, name: "태블릿", parentId: 1 },
];

const initialValue: DirectRegisterInfoState = {
    images: [],
    parentCategoryId: "",
    childCategoryId: "",
    title: "아이패드 프로",
    brand: "Apple",
    description: "상품 설명",
    tags: [],
};

function DirectRegisterInfoStepHarness({ onNext }: { onNext: () => void }) {
    const [value, setValue] = useState(initialValue);

    return (
        <DirectRegisterInfoStep
            value={value}
            categories={categories}
            categoryStatus="ready"
            onChange={(key, nextValue) => setValue((current) => ({ ...current, [key]: nextValue }))}
            onNext={onNext}
        />
    );
}

describe("DirectRegisterInfoStep", () => {
    beforeEach(() => {
        Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", {
            configurable: true,
            value: () => false,
        });
        Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
            configurable: true,
            value: () => undefined,
        });
    });

    it("requires an image and keeps the child-category error until a child is selected", async () => {
        const user = userEvent.setup();
        const onNext = vi.fn();

        render(<DirectRegisterInfoStepHarness onNext={onNext} />);

        fireEvent.submit(document.getElementById("direct-register-form") as HTMLFormElement);

        expect(screen.getByText("상품 사진을 1장 이상 업로드해주세요.")).toBeInTheDocument();
        expect(screen.getByText("대분류를 선택해 주세요.")).toBeInTheDocument();
        expect(screen.getByText("중분류를 선택해 주세요.")).toBeInTheDocument();
        expect(onNext).not.toHaveBeenCalled();

        await user.click(screen.getByRole("combobox", { name: "대분류" }));
        await user.click(screen.getByRole("option", { name: "디지털" }));

        expect(screen.queryByText("대분류를 선택해 주세요.")).not.toBeInTheDocument();
        expect(screen.getByText("중분류를 선택해 주세요.")).toBeInTheDocument();
        expect(screen.getByRole("combobox", { name: "대분류" })).toHaveAttribute(
            "aria-invalid",
            "false",
        );
        expect(screen.getByRole("combobox", { name: "중분류" })).toHaveAttribute(
            "aria-invalid",
            "true",
        );
    });
});
