import { z } from "zod";

const emailSchema = z
    .string()
    .min(1, "이메일을 입력해 주세요.")
    .email("올바른 이메일 형식을 입력해 주세요.");

export const loginSchema = z.object({
    email: emailSchema,
    password: z.string().refine((value) => value.trim().length > 0, "비밀번호를 입력해 주세요."),
});

export const signUpSchema = z.object({
    email: emailSchema,
    password: z
        .string()
        .min(1, "비밀번호를 입력해 주세요.")
        .regex(
            /^(?=.*[A-Za-z])(?=.*\d).{8,64}$/,
            "비밀번호는 영문과 숫자를 포함해 8~64자로 입력해 주세요.",
        ),
    name: z
        .string()
        .max(50, "이름은 50자 이하로 입력해 주세요.")
        .refine((value) => value.trim().length > 0, "이름을 입력해 주세요."),
    nickname: z
        .string()
        .max(30, "닉네임은 30자 이하로 입력해 주세요.")
        .refine((value) => value.trim().length > 0, "닉네임을 입력해 주세요."),
    phone: z
        .string()
        .regex(/^(?:01[016789]\d{7,8})?$/, "휴대폰 번호는 하이픈 없이 올바른 번호를 입력해 주세요.")
        .transform((value) => (value === "" ? null : value)),
});

export type SignUpFormValues = z.input<typeof signUpSchema>;

export const passwordResetSchema = z.object({
    email: emailSchema,
});
