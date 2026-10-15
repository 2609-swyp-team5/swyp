"use client";

import { Checkbox } from "@/common/components/ui/Checkbox";
import { Input } from "@/common/components/ui/Input";
import { Label } from "@/common/components/ui/Label";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/common/components/ui/Select";
import type { CategoryOptionGroup } from "@/features/sell/api/categoryApi";
import {
    FieldError,
    FieldLabel,
} from "@/features/sell/components/direct-register/DirectRegisterFields";
import type { CategoryOptionSelection } from "@/features/sell/types";

const NO_SELECTION = "none";

const fieldClassName =
    "h-[50px] rounded-[8px] border border-[#d3d3d3] bg-[#fafbff] px-4 py-3 typography-body-medium text-[#6b6c7b] shadow-none placeholder:text-[#d3d3d3] focus-visible:border-[#6653fb] focus-visible:ring-0";
const selectClassName =
    "h-[50px] w-full rounded-[8px] border border-[#d3d3d3] bg-[#fafbff] px-4 typography-body-medium text-[#6b6c7b] shadow-none data-placeholder:text-[#d3d3d3] focus-visible:border-[#6653fb] focus-visible:ring-0";

type CategoryOptionsFieldProps = {
    groups: CategoryOptionGroup[];
    value: CategoryOptionSelection[];
    errors: Record<string, string>;
    onChange: (groupId: string, selection: CategoryOptionSelection | null) => void;
};

/**
 * 카테고리별 추가 항목(사이즈·용량·사용기한 등) 입력. 선택형은 세부 분류(공용 사이즈·한국 사이즈 등)별로 묶은 목록에서 하나를,
 * 날짜·직접 입력형은 입력칸에 값을 넣고 "표시 없음" 같은 단독 선택지는 체크박스로 고른다. 외부 플랫폼 게시에 쓰인다(현재 항목 정의는 번개장터 기준).
 */
export function CategoryOptionsField({
    groups,
    value,
    errors,
    onChange,
}: CategoryOptionsFieldProps) {
    if (groups.length === 0) {
        return null;
    }

    return (
        <section className="flex flex-col gap-4" aria-labelledby="category-options-label">
            <div className="flex flex-col gap-1">
                <FieldLabel>
                    <span id="category-options-label">카테고리 추가 항목</span>
                </FieldLabel>
                <p className="typography-body-small text-[#6b6c7b]">
                    다른 플랫폼에 판매글을 올릴 때 필요한 항목이에요. * 표시는 꼭 입력해 주세요.
                </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
                {groups.map((group) => (
                    <OptionGroupInput
                        key={group.groupId}
                        group={group}
                        selection={value.find((selection) => selection.groupId === group.groupId)}
                        error={errors[group.groupId]}
                        onChange={(selection) => onChange(group.groupId, selection)}
                    />
                ))}
            </div>
        </section>
    );
}

type OptionGroupInputProps = {
    group: CategoryOptionGroup;
    selection: CategoryOptionSelection | undefined;
    error?: string;
    onChange: (selection: CategoryOptionSelection | null) => void;
};

function OptionGroupInput({ group, selection, error, onChange }: OptionGroupInputProps) {
    const inputId = `category-option-${group.groupId}`;
    const textChild = group.children.find(
        (child) => child.type === "TEXT_FIELD" || child.type === "DATE_TEXT_FIELD",
    );

    return (
        <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor={inputId} required={group.required}>
                {group.name}
            </FieldLabel>
            {group.tooltip && (
                <p className="typography-body-small text-[#6b6c7b]">{group.tooltip}</p>
            )}
            {textChild ? (
                <TextOptionInput
                    inputId={inputId}
                    group={group}
                    selection={selection}
                    error={error}
                    onChange={onChange}
                />
            ) : (
                <Select
                    value={selection ? String(selection.valueId) : ""}
                    onValueChange={(nextValue) =>
                        onChange(
                            nextValue === NO_SELECTION
                                ? null
                                : {
                                      groupId: group.groupId,
                                      valueId: Number(nextValue),
                                      text: null,
                                  },
                        )
                    }
                >
                    <SelectTrigger
                        id={inputId}
                        className={selectClassName}
                        aria-label={group.name}
                        aria-invalid={Boolean(error)}
                    >
                        <SelectValue placeholder={group.title} />
                    </SelectTrigger>
                    <SelectContent
                        position="popper"
                        side="bottom"
                        sideOffset={4}
                        align="start"
                        className="!max-h-60 !w-[var(--radix-select-trigger-width)] !overflow-y-auto !bg-white !text-[#6b6c7b]"
                    >
                        {!group.required && (
                            <SelectItem value={NO_SELECTION}>선택 안 함</SelectItem>
                        )}
                        {group.children.map((child) => (
                            <SelectGroup key={child.groupId}>
                                {child.name && <SelectLabel>{child.name}</SelectLabel>}
                                {child.values.map((option) => (
                                    <SelectItem key={option.valueId} value={String(option.valueId)}>
                                        {option.value}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        ))}
                    </SelectContent>
                </Select>
            )}
            {group.guide && group.guide.length > 0 && (
                <ul className="typography-body-small text-[#6b6c7b]">
                    {group.guide.map((line) => (
                        <li key={line}>{line}</li>
                    ))}
                </ul>
            )}
            <FieldError message={error} />
        </div>
    );
}

/** 날짜(년월일 8자리)·직접 입력 항목. 같은 항목의 단독 선택지("사용기한 표시 없음" 등)는 체크박스로, 고르면 입력칸을 비운다. */
function TextOptionInput({
    inputId,
    group,
    selection,
    error,
    onChange,
}: OptionGroupInputProps & { inputId: string }) {
    const textChild = group.children.find(
        (child) => child.type === "TEXT_FIELD" || child.type === "DATE_TEXT_FIELD",
    )!;
    const textValue = textChild.values[0];
    const isDate = textChild.type === "DATE_TEXT_FIELD";
    const roundValues = group.children
        .filter((child) => child.type === "SINGLE_ROUND")
        .flatMap((child) => child.values);
    const checkedRound = roundValues.find((option) => option.valueId === selection?.valueId);

    return (
        <>
            <Input
                id={inputId}
                value={selection?.valueId === textValue.valueId ? (selection.text ?? "") : ""}
                placeholder={textValue.placeholder ?? group.title}
                inputMode={isDate ? "numeric" : undefined}
                maxLength={isDate ? 8 : textValue.maxLength}
                disabled={Boolean(checkedRound)}
                className={fieldClassName}
                aria-invalid={Boolean(error)}
                onChange={(event) => {
                    const text = isDate
                        ? event.target.value.replace(/\D/g, "")
                        : event.target.value;
                    onChange(
                        text ? { groupId: group.groupId, valueId: textValue.valueId, text } : null,
                    );
                }}
            />
            {roundValues.map((option) => {
                const checkboxId = `${inputId}-${option.valueId}`;
                return (
                    <div key={option.valueId} className="flex items-center gap-2">
                        <Checkbox
                            id={checkboxId}
                            checked={checkedRound?.valueId === option.valueId}
                            onCheckedChange={(checked) =>
                                onChange(
                                    checked === true
                                        ? {
                                              groupId: group.groupId,
                                              valueId: option.valueId,
                                              text: null,
                                          }
                                        : null,
                                )
                            }
                        />
                        <Label
                            htmlFor={checkboxId}
                            className="typography-body-small text-[#6b6c7b]"
                        >
                            {option.value}
                        </Label>
                    </div>
                );
            })}
        </>
    );
}
