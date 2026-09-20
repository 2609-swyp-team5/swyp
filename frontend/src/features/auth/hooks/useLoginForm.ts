"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { getApiErrorMessage } from "@/common/lib/api/error";
import { useAuthStore } from "@/features/auth/store/authStore";
import type { LoginRequest } from "@/features/auth/types";
import { loginSchema } from "@/features/auth/schemas/authSchema";

export function useLoginForm() {
    const login = useAuthStore((state) => state.login);
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginRequest>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: "", password: "" },
    });
    const [errorMessage, setErrorMessage] = useState("");

    const onSubmit = async (params: LoginRequest) => {
        setErrorMessage("");

        try {
            const result = await login(params);

            if (result.success) {
                return;
            }

            setErrorMessage(result.message);
        } catch (error) {
            setErrorMessage(getApiErrorMessage(error));
        }
    };

    return {
        register,
        errors,
        isSubmitting,
        errorMessage,
        setErrorMessage,
        onSubmit: handleSubmit(onSubmit),
    };
}
