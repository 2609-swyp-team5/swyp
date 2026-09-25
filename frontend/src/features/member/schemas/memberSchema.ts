import { z } from "zod";

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
