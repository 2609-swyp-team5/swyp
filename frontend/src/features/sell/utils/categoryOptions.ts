import type { CategoryOptionGroup } from "@/features/sell/api/categoryApi";
import type { CategoryOptionSelection, ProductResponse } from "@/features/sell/types";

/**
 * 추가 항목 입력 검증 — 항목 ID별 오류 문구(문제 없으면 빈 객체). 필수 항목이 빠지면 번개장터 화면 문구(예: "사이즈를 선택해
 * 주세요."), 날짜 항목은 년월일 8자리인지 본다(실제 날짜 여부는 서버가 다시 확인).
 */
export function validateCategoryOptions(
    groups: CategoryOptionGroup[],
    selections: CategoryOptionSelection[],
): Record<string, string> {
    const errors: Record<string, string> = {};
    for (const group of groups) {
        const selection = selections.find((candidate) => candidate.groupId === group.groupId);
        if (!selection) {
            if (group.required) {
                errors[group.groupId] = `${group.title}.`;
            }
            continue;
        }
        const isDateInput = group.children.some(
            (child) =>
                child.type === "DATE_TEXT_FIELD" &&
                child.values.some((value) => value.valueId === selection.valueId),
        );
        if (isDateInput && !/^\d{8}$/.test(selection.text ?? "")) {
            errors[group.groupId] = "년월일 8자리로 입력해 주세요. (예: 20301231)";
        }
    }
    return errors;
}

/** 저장된 추가 항목을 수정 화면 입력값으로. */
export function toCategoryOptionSelections(product: ProductResponse): CategoryOptionSelection[] {
    return (product.categoryOptions ?? []).map((option) => ({
        groupId: option.groupId,
        valueId: option.valueId,
        text:
            option.type === "TEXT_FIELD" || option.type === "DATE_TEXT_FIELD" ? option.value : null,
    }));
}
