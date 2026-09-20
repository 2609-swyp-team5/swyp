"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { getApiErrorMessage } from "@/common/lib/api/error";
import { authApi } from "@/features/auth/api/authApi";
import type { SignUpRequest } from "@/features/auth/types";
import { signUpSchema, type SignUpFormValues } from "@/features/auth/schemas/authSchema";

export function useSignupForm() {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<SignUpFormValues, unknown, SignUpRequest>({
        resolver: zodResolver(signUpSchema),
        defaultValues: { name: "", nickname: "", phone: "", email: "", password: "" },
    });
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const onSubmit = async (params: SignUpRequest) => {
        setSuccessMessage("");
        setErrorMessage("");

        try {
            const result = await authApi.authSignUp(params);

            if (result.data.success) {
                setSuccessMessage("회원가입이 완료되었습니다.");
                reset();
                return;
            }

            setErrorMessage(result.data.message);
        } catch (error) {
            setErrorMessage(getApiErrorMessage(error));
        }
    };

    return {
        register,
        errors,
        isSubmitting,
        successMessage,
        errorMessage,
        onSubmit: handleSubmit(onSubmit),
    };
}
