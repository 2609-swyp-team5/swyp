import { z } from "zod";

export const memberUpdateSchema = z.object({
    nickname: z
        .string()
        .max(30, "닉네임은 30자 이하로 입력해 주세요.")
        .refine((value) => value.trim().length > 0, "닉네임을 입력해 주세요."),
    phone: z
        .string()
        .refine(
            (value) => /^(?:01[016789]\d{7,8})?$/.test(value.replace(/-/g, "")),
            "올바른 휴대폰 번호를 입력해 주세요.",
        ),
});

export const passwordChangeSchema = z.object({
    currentPassword: z
        .string()
        .refine((value) => value.trim().length > 0, "기존 비밀번호를 입력해 주세요."),
    newPassword: z
        .string()
        .regex(
            /^(?=.*[A-Za-z])(?=.*\d).{8,64}$/,
            "비밀번호는 영문과 숫자를 포함해 8~64자로 입력해 주세요.",
        ),
});
