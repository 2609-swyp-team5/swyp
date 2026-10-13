"use client";

import { type ChangeEvent, type FormEvent, useId, useState } from "react";

import { getApiErrorMessage } from "@/common/lib/api/error";

const MAX_TARGET_PRICE = 100_000_000_000;

function parsePrice(value: string) {
    const digits = value.replace(/\D/g, "");
    return digits === "" ? null : Number(digits);
}

function formatInput(value: number | null) {
    return value === null ? "" : value.toLocaleString("ko-KR");
}

export function useTargetPriceInput({
    targetPrice,
    error,
    onSave,
}: {
    targetPrice: number | null;
    error: unknown;
    onSave: (targetPrice: number | null) => void;
}) {
    const inputId = useId();
    const [input, setInput] = useState(formatInput(targetPrice));
    const [validation, setValidation] = useState<string | null>(null);
    const parsed = parsePrice(input);
    const unchanged = parsed === targetPrice;

    const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
        setInput(formatInput(parsePrice(event.target.value)));
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (parsed === null || parsed <= 0) {
            setValidation("목표 가격을 0원보다 크게 입력해 주세요.");
            return;
        }
        if (parsed > MAX_TARGET_PRICE) {
            setValidation("목표 가격이 너무 커요.");
            return;
        }
        setValidation(null);
        onSave(parsed);
    };

    const handleClear = () => {
        setValidation(null);
        onSave(null);
    };

    return {
        inputId,
        input,
        unchanged,
        message: error ? getApiErrorMessage(error) : validation,
        handleInputChange,
        handleSubmit,
        handleClear,
    };
}
