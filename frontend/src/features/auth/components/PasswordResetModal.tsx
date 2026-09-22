"use client";

import { CircleHelp, CircleX, Info } from "lucide-react";

import { Button } from "@/common/components/ui/Button";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogTitle,
    DialogTrigger,
} from "@/common/components/ui/Dialog";
import { Input } from "@/common/components/ui/Input";
import { Label } from "@/common/components/ui/Label";

export function PasswordResetModal() {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button
                    type="button"
                    variant="link"
                    className="text-muted-foreground hover:text-foreground mt-2 h-auto rounded-none p-0 text-base font-medium underline underline-offset-2"
                >
                    비밀번호 찾기
                </Button>
            </DialogTrigger>
            <DialogContent className="top-[8dvh] max-h-[84dvh] max-w-[640px] translate-y-0 gap-0 overflow-y-auto p-6 sm:p-8">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <DialogTitle className="text-2xl leading-normal font-bold">
                            비밀번호 찾기
                        </DialogTitle>
                        <DialogDescription className="mt-2">
                            가입하신 이메일로 비밀번호 재설정 링크를 전송합니다.
                        </DialogDescription>
                    </div>
                    <DialogClose asChild>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="비밀번호 찾기 닫기"
                            className="text-muted-foreground shrink-0"
                        >
                            <CircleX aria-hidden="true" className="size-5" />
                        </Button>
                    </DialogClose>
                </div>

                <div className="mt-10">
                    <Label htmlFor="password-reset-email" className="mb-2 text-base font-semibold">
                        가입 이메일 주소
                    </Label>
                    <Input
                        id="password-reset-email"
                        type="email"
                        autoComplete="email"
                        placeholder="example@email.com"
                        aria-describedby="password-reset-hint"
                        className="h-14 rounded-md px-5 text-sm"
                    />
                    <p
                        id="password-reset-hint"
                        className="text-muted-foreground mt-2 flex items-start gap-2 text-xs leading-5"
                    >
                        <CircleHelp aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                        입력하신 이메일로 재설정 링크가 전송됩니다.
                    </p>
                </div>

                <div className="bg-primary/5 mt-6 flex items-start gap-3 rounded-md px-4 py-4">
                    <Info aria-hidden="true" className="text-primary mt-0.5 size-4 shrink-0" />
                    <p className="text-sm leading-5">
                        스팸 메일함으로 발송될 수 있으니 메일이 도착하지 않으면 확인해 주세요.
                    </p>
                </div>

                <div className="mt-6 flex justify-center gap-4">
                    <DialogClose asChild>
                        <Button
                            type="button"
                            variant="outline"
                            className="text-muted-foreground h-11 rounded-md px-6"
                        >
                            취소
                        </Button>
                    </DialogClose>
                    {/* 메일 발송 API는 추후 연결합니다. */}
                    <Button type="button" className="h-11 rounded-md px-6 font-semibold">
                        재설정 링크 보내기
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
