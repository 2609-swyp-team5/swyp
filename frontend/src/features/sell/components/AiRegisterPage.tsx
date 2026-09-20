"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";
import { CircleAlert } from "lucide-react";

import { Alert, AlertDescription } from "@/common/components/ui/Alert";
import { Button } from "@/common/components/ui/Button";
import { AiRegisterAdditionalInfoStep } from "@/features/sell/components/AiRegisterAdditionalInfoStep";
import { ExitDialog } from "@/features/sell/components/ExitDialog";
import { AiRegisterUploadStep } from "@/features/sell/components/AiRegisterUploadStep";

type AiRegisterStep = "upload" | "additional-info";

export function AiRegisterPage() {
    const router = useRouter();
    const [images, setImages] = useState<File[]>([]);
    const [error, setError] = useState("");
    const [step, setStep] = useState<AiRegisterStep>("upload");
    const [isExitDialogOpen, setIsExitDialogOpen] = useState(false);

    const handleNextStep = () => {
        if (step === "upload") {
            if (images.length === 0) {
                setError("상품 사진을 1장 이상 업로드해주세요.");
                return;
            }

            setError("");
            setStep("additional-info");
            return;
        }

        setStep("upload");
    };

    const handleExit = () => {
        setIsExitDialogOpen(false);
        router.push("/sell/register");
    };

    const isUploadStep = step === "upload";

    return (
        <main className="flex flex-1 flex-col bg-white">
            <section className="layout-container flex flex-1 flex-col gap-[80px] py-16 pb-[120px]">
                <header className="flex flex-col gap-[52px]">
                    <p className="text-[30px] leading-[42px] font-bold tracking-[0.5px] text-[#363636]">
                        {isUploadStep ? "AI로 빠르게" : "AI 상품 등록"}
                    </p>
                    <h1 className="text-[60px] leading-[75px] font-bold tracking-[0.5px] text-[#6653fb]">
                        {isUploadStep ? "상품 사진을 올려주세요" : "AI 상품등록2"}
                    </h1>
                </header>

                <div className="flex w-full flex-col rounded-[20px] bg-white pt-10 sm:px-8 lg:h-[921px] lg:px-[60px]">
                    <div className="w-full" hidden={!isUploadStep}>
                        <AiRegisterUploadStep onError={setError} onFilesChange={setImages} />
                    </div>
                    <div className="w-full" hidden={isUploadStep}>
                        <AiRegisterAdditionalInfoStep />
                    </div>

                    <div className="relative flex min-h-[96px] w-full flex-1 flex-col justify-between gap-2 pb-0 sm:block">
                        {error && isUploadStep && (
                            <Alert
                                variant="destructive"
                                className="flex w-auto max-w-full items-center gap-2 border-0 bg-transparent p-0 text-left shadow-none sm:absolute sm:top-4 sm:left-0"
                            >
                                <span className="flex size-4 shrink-0 items-center justify-center">
                                    <CircleAlert aria-hidden="true" className="size-4" />
                                </span>
                                <AlertDescription className="typography-body-small text-destructive p-0 text-left">
                                    {error}
                                </AlertDescription>
                            </Alert>
                        )}
                        <div className="flex justify-end gap-3 sm:absolute sm:right-0 sm:bottom-0">
                            <Button
                                type="button"
                                className="h-[54px] rounded-full border-0 bg-[#d3d3d3] px-[50px] py-3 text-[20px] leading-[30px] font-semibold tracking-[0.5px] text-white hover:bg-[#c6c6c6]"
                                onClick={() => setIsExitDialogOpen(true)}
                            >
                                나가기
                            </Button>
                            <Button
                                type="button"
                                className="h-[54px] rounded-full bg-[#6653fb] px-[50px] py-3 text-[20px] leading-[30px] font-semibold tracking-[0.5px] text-white hover:bg-[#5745e7]"
                                onClick={handleNextStep}
                            >
                                {isUploadStep ? "다음단계" : "이전단계"}
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            <ExitDialog
                open={isExitDialogOpen}
                onClose={() => setIsExitDialogOpen(false)}
                onConfirm={handleExit}
            />
        </main>
    );
}
