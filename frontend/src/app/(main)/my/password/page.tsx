"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/common/components/ui/Button";
import { Input } from "@/common/components/ui/Input";
import { Label } from "@/common/components/ui/Label";
import { MyPageContent, MyPanel } from "@/features/my/components/MyPageContent";

const fields = [
    { name: "currentPassword", label: "기존 비밀번호", autoComplete: "current-password" },
    { name: "newPassword", label: "변경할 비밀번호", autoComplete: "new-password" },
] as const;

export default function MyPasswordPage() {
    const [visible, setVisible] = useState({ currentPassword: false, newPassword: false });
    const [submitted, setSubmitted] = useState(false);
    const { register, handleSubmit } = useForm({
        defaultValues: { currentPassword: "", newPassword: "" },
    });

    return (
        <MyPageContent eyebrow="계정 설정" title="비밀번호 변경">
            <MyPanel className="w-full p-6 sm:p-8">
                <form
                    onSubmit={handleSubmit(() => setSubmitted(true))}
                    onChange={() => setSubmitted(false)}
                    className="space-y-7"
                >
                    {fields.map(({ name, label, autoComplete }) => (
                        <div key={name} className="space-y-2">
                            <Label htmlFor={name} className="text-[13px] font-semibold">
                                {label}
                            </Label>
                            <div className="relative">
                                <Input
                                    id={name}
                                    {...register(name)}
                                    type={visible[name] ? "text" : "password"}
                                    autoComplete={autoComplete}
                                    placeholder={`${label}를 입력해 주세요`}
                                    required
                                    aria-describedby={
                                        name === "newPassword" ? "password-hint" : undefined
                                    }
                                    className="h-12 rounded-xl pr-12 pl-4 text-base md:text-base"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`${label} ${visible[name] ? "숨기기" : "표시"}`}
                                    aria-pressed={visible[name]}
                                    onClick={() =>
                                        setVisible((previous) => ({
                                            ...previous,
                                            [name]: !previous[name],
                                        }))
                                    }
                                    className="text-muted-foreground absolute top-[calc(50%-1rem)] right-2"
                                >
                                    {visible[name] ? (
                                        <Eye className="size-5" />
                                    ) : (
                                        <EyeOff className="size-5" />
                                    )}
                                </Button>
                            </div>
                            {name === "newPassword" ? (
                                <p
                                    id="password-hint"
                                    className="text-muted-foreground text-[13px] leading-5"
                                >
                                    영문과 숫자를 포함해 8~64자로 입력해 주세요.
                                </p>
                            ) : null}
                        </div>
                    ))}
                    <Button
                        type="submit"
                        className="h-[50px] w-full rounded-xl text-base font-semibold"
                    >
                        비밀번호 변경
                    </Button>
                    {submitted ? (
                        <p role="status" className="text-muted-foreground text-center text-[13px]">
                            비밀번호 변경 기능은 준비 중입니다.
                        </p>
                    ) : null}
                </form>
            </MyPanel>
        </MyPageContent>
    );
}
