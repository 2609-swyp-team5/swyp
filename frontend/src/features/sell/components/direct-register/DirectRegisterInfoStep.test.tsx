import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CategoryOptionGroup } from "@/features/sell/api/categoryApi";

import { DirectRegisterInfoStep } from "./DirectRegisterInfoStep";
import type { DirectRegisterInfoState } from "./types";

const { categoryOptionGroups, requestedOptionCategoryIds } = vi.hoisted(() => ({
    categoryOptionGroups: { current: [] as CategoryOptionGroup[] },
    requestedOptionCategoryIds: [] as (number | null)[],
}));

vi.mock("@/features/sell/hooks/queries/useCategoryOptionsQuery", () => ({
    useCategoryOptionsQuery: (categoryId: number | null) => {
        requestedOptionCategoryIds.push(categoryId);
        return { data: categoryId === null ? undefined : categoryOptionGroups.current };
    },
}));

const sizeGroup: CategoryOptionGroup = {
    groupId: "100",
    name: "사이즈",
    title: "사이즈를 선택해 주세요",
    required: true,
    children: [
        {
            groupId: "100100",
            name: "공용 사이즈",
            type: "SINGLE_SELECT",
            values: [
                { valueId: 5, value: "M" },
                { valueId: 6, value: "L" },
            ],
        },
        {
            groupId: "100102",
            name: "",
            type: "SINGLE_ROUND",
            values: [{ valueId: 17, value: "기타 (상품설명에 작성)" }],
        },
    ],
};

const expiryGroup: CategoryOptionGroup = {
    groupId: "514",
    name: "소비기한",
    title: "소비기한을 입력해 주세요",
    required: true,
    children: [
        {
            groupId: "514100",
            name: "",
            type: "DATE_TEXT_FIELD",
            values: [
                {
                    valueId: 994,
                    value: "",
                    placeholder: "년월일 8자리 (예: 20301231)",
                    maxLength: 50,
                },
            ],
        },
        {
            groupId: "514101",
            name: "",
            type: "SINGLE_ROUND",
            values: [{ valueId: 995, value: "소비기한 표시 없음" }],
        },
    ],
};

const categories = [
    { id: 1, name: "디지털", parentId: null, leaf: false },
    { id: 2, name: "태블릿", parentId: 1, leaf: false },
    { id: 3, name: "아이패드", parentId: 2, leaf: true },
];

const categoriesWithoutSubcategory = [
    { id: 4, name: "생활", parentId: null, leaf: false },
    { id: 5, name: "가구", parentId: 4, leaf: true },
];

const categoriesWithLeafParent = [{ id: 6, name: "기타", parentId: null, leaf: true }];

const initialValue: DirectRegisterInfoState = {
    images: [],
    parentCategoryId: "",
    childCategoryId: "",
    subCategoryId: "",
    title: "아이패드 프로",
    brand: "Apple",
    description: "상품 설명을 충분히 입력합니다.",
    tags: [],
    categoryOptions: [],
};

const latestValue: { current: DirectRegisterInfoState | null } = { current: null };

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
            onChange={(key, nextValue) =>
                setValue((current) => {
                    const next = { ...current, [key]: nextValue };
                    latestValue.current = next;
                    return next;
                })
            }
            onNext={onNext}
        />
    );
}

describe("DirectRegisterInfoStep", () => {
    beforeEach(() => {
        categoryOptionGroups.current = [];
        requestedOptionCategoryIds.length = 0;
        // 체크박스(Radix)가 크기 측정에 ResizeObserver를 쓴다
        vi.stubGlobal(
            "ResizeObserver",
            class {
                observe() {}
                unobserve() {}
                disconnect() {}
            },
        );
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

    it("shows an error instead of adding a sixth tag", async () => {
        const user = userEvent.setup();
        const tags = Array.from({ length: 5 }, (_, index) => `태그${index + 1}`);

        render(
            <DirectRegisterInfoStepHarness onNext={vi.fn()} initial={{ ...initialValue, tags }} />,
        );

        const tagInput = screen.getByRole("textbox", { name: "태그 추가" });
        await user.type(tagInput, "추가 태그");
        await user.keyboard("{Enter}");

        expect(screen.getByRole("alert")).toHaveTextContent(
            "태그는 최대 5개까지 추가할 수 있습니다.",
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

    it("allows a top-level leaf category to proceed without a child category", () => {
        const onNext = vi.fn();

        render(
            <DirectRegisterInfoStepHarness
                onNext={onNext}
                categoryOptions={categoriesWithLeafParent}
                initial={{
                    ...initialValue,
                    images: [{ file: null, url: "https://example.com/image.jpg" }],
                    parentCategoryId: "6",
                }}
            />,
        );

        fireEvent.submit(document.getElementById("direct-register-form") as HTMLFormElement);

        expect(onNext).toHaveBeenCalledOnce();
        expect(screen.getByRole("combobox", { name: "중분류" })).toBeDisabled();
        expect(screen.getByText("하위 카테고리 없음")).toBeInTheDocument();
        expect(screen.getByText("소분류 없음")).toBeInTheDocument();
    });

    it("requires category options of the selected leaf category before the next step", async () => {
        const user = userEvent.setup();
        const onNext = vi.fn();
        categoryOptionGroups.current = [sizeGroup];

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

        expect(requestedOptionCategoryIds).toContain(5);
        fireEvent.submit(document.getElementById("direct-register-form") as HTMLFormElement);

        expect(screen.getByText("사이즈를 선택해 주세요.")).toBeInTheDocument();
        expect(onNext).not.toHaveBeenCalled();

        await user.click(screen.getByRole("combobox", { name: "사이즈" }));
        expect(screen.getByText("공용 사이즈")).toBeInTheDocument();
        await user.click(screen.getByRole("option", { name: "M" }));

        expect(screen.queryByText("사이즈를 선택해 주세요.")).not.toBeInTheDocument();
        expect(latestValue.current?.categoryOptions).toEqual([
            { groupId: "100", valueId: 5, text: null },
        ]);

        fireEvent.submit(document.getElementById("direct-register-form") as HTMLFormElement);
        expect(onNext).toHaveBeenCalledOnce();
    });

    it("checks the date format and lets 'not marked' replace the date", async () => {
        const user = userEvent.setup();
        const onNext = vi.fn();
        categoryOptionGroups.current = [expiryGroup];

        render(
            <DirectRegisterInfoStepHarness
                onNext={onNext}
                categoryOptions={categoriesWithLeafParent}
                initial={{
                    ...initialValue,
                    images: [{ file: null, url: "https://example.com/image.jpg" }],
                    parentCategoryId: "6",
                }}
            />,
        );

        const dateInput = screen.getByPlaceholderText("년월일 8자리 (예: 20301231)");
        await user.type(dateInput, "2030-12");
        fireEvent.submit(document.getElementById("direct-register-form") as HTMLFormElement);

        expect(
            screen.getByText("년월일 8자리로 입력해 주세요. (예: 20301231)"),
        ).toBeInTheDocument();
        expect(onNext).not.toHaveBeenCalled();

        await user.click(screen.getByRole("checkbox", { name: "소비기한 표시 없음" }));

        expect(dateInput).toBeDisabled();
        expect(latestValue.current?.categoryOptions).toEqual([
            { groupId: "514", valueId: 995, text: null },
        ]);
        fireEvent.submit(document.getElementById("direct-register-form") as HTMLFormElement);
        expect(onNext).toHaveBeenCalledOnce();
    });

    it("clears category options when the category changes", async () => {
        const user = userEvent.setup();
        categoryOptionGroups.current = [sizeGroup];

        render(
            <DirectRegisterInfoStepHarness
                onNext={vi.fn()}
                initial={{
                    ...initialValue,
                    parentCategoryId: "1",
                    childCategoryId: "2",
                    categoryOptions: [{ groupId: "100", valueId: 5, text: null }],
                }}
            />,
        );

        await user.click(screen.getByRole("combobox", { name: "소분류" }));
        await user.click(screen.getByRole("option", { name: "아이패드" }));

        expect(latestValue.current?.categoryOptions).toEqual([]);
    });
});
