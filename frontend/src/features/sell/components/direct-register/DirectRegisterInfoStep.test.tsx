import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DirectRegisterInfoStep } from "./DirectRegisterInfoStep";
import type { DirectRegisterInfoState } from "./types";

const categories = [
    { id: 1, name: "디지털", parentId: null, leaf: false },
    { id: 2, name: "태블릿", parentId: 1, leaf: false },
    { id: 3, name: "아이패드", parentId: 2, leaf: true },
];

const categoriesWithoutSubcategory = [
    { id: 4, name: "생활", parentId: null, leaf: false },
    { id: 5, name: "가구", parentId: 4, leaf: true },
];

const initialValue: DirectRegisterInfoState = {
    images: [],
    parentCategoryId: "",
    childCategoryId: "",
    subCategoryId: "",
    title: "아이패드 프로",
    brand: "Apple",
    description: "상품 설명",
    tags: [],
};

function DirectRegisterInfoStepHarness({
    onNext,
    initial = initialValue,
    categoryOptions = categories,
}: {
    onNext: () => void;
    initial?: DirectRegisterInfoState;
    categoryOptions?: typeof categories;
}) {
    const [value, setValue] = useState(initial);

    return (
        <DirectRegisterInfoStep
            value={value}
            categories={categoryOptions}
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
        expect(screen.getByText("소분류를 선택해 주세요.")).toBeInTheDocument();
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

    it("shows an error instead of adding an eleventh tag", async () => {
        const user = userEvent.setup();
        const tags = Array.from({ length: 10 }, (_, index) => `태그${index + 1}`);

        render(
            <DirectRegisterInfoStepHarness onNext={vi.fn()} initial={{ ...initialValue, tags }} />,
        );

        const tagInput = screen.getByRole("textbox", { name: "태그 추가" });
        await user.type(tagInput, "추가 태그");
        await user.keyboard("{Enter}");

        expect(screen.getByRole("alert")).toHaveTextContent(
            "태그는 최대 10개까지 추가할 수 있습니다.",
        );
    });

    it("allows the next step when the selected middle category has no subcategory", () => {
        const onNext = vi.fn();

        render(
            <DirectRegisterInfoStepHarness
                onNext={onNext}
                categoryOptions={categoriesWithoutSubcategory}
                initial={{
                    ...initialValue,
                    images: [{ file: null, url: "https://example.com/image.jpg" }],
                    parentCategoryId: "4",
                    childCategoryId: "5",
                }}
            />,
        );

        fireEvent.submit(document.getElementById("direct-register-form") as HTMLFormElement);

        expect(onNext).toHaveBeenCalledOnce();
        expect(screen.getByRole("combobox", { name: "소분류" })).toBeDisabled();
        expect(screen.getByText("소분류 없음")).toBeInTheDocument();
    });
});
