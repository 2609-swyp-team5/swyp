"use client";

import { useRef, useState } from "react";

import Script from "next/script";
import { Search, X } from "lucide-react";

import { Button } from "@/common/components/ui/Button";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from "@/common/components/ui/Dialog";
import { Input } from "@/common/components/ui/Input";

type DaumPostcodeData = {
    sido?: string;
    sigungu?: string;
    bname?: string;
    address?: string;
    roadAddress?: string;
    jibunAddress?: string;
};

type DaumPostcodeInstance = {
    embed: (element: HTMLElement) => void;
};

type DaumPostcodeConstructor = new (options: {
    width?: string | number;
    height?: string | number;
    oncomplete: (data: DaumPostcodeData) => void;
}) => DaumPostcodeInstance;

declare global {
    interface Window {
        daum?: {
            Postcode: DaumPostcodeConstructor;
        };
    }
}

type TradeLocationFieldProps = {
    id: string;
    value: string;
    onChange: (value: string) => void;
};

const POSTCODE_SCRIPT_ID = "kakao-postcode-script";
const POSTCODE_SCRIPT_SRC = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";

function getDistrictName(data: DaumPostcodeData) {
    const district = [data.sido, data.sigungu, data.bname].filter(Boolean).join(" ");

    return district || data.address || data.roadAddress || data.jibunAddress || "";
}

export function TradeLocationField({ id, value, onChange }: TradeLocationFieldProps) {
    const postcodeContainerRef = useRef<HTMLDivElement>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const openSearch = () => {
        if (!window.daum?.Postcode) {
            setErrorMessage("지도 검색을 준비 중이에요. 잠시 후 다시 시도해 주세요.");
            return;
        }

        setErrorMessage("");
        setIsOpen(true);
        window.requestAnimationFrame(() => {
            if (!postcodeContainerRef.current || !window.daum?.Postcode) {
                return;
            }

            new window.daum.Postcode({
                width: "100%",
                height: "100%",
                oncomplete: (data) => {
                    onChange(getDistrictName(data));
                    setIsOpen(false);
                },
            }).embed(postcodeContainerRef.current);
        });
    };

    return (
        <div className="flex flex-col gap-2.5">
            <Script id={POSTCODE_SCRIPT_ID} src={POSTCODE_SCRIPT_SRC} strategy="afterInteractive" />
            <div className="flex gap-2">
                <Input
                    id={id}
                    value={value}
                    readOnly
                    placeholder="읍·면·동을 검색해 주세요"
                    className="h-[50px] flex-1 rounded-[8px] border border-[#d3d3d3] bg-[#fafbff] px-4 py-3 text-[16px] leading-[25px] text-[#6b6c7b] shadow-none placeholder:text-[#d3d3d3] focus-visible:border-[#6653fb] focus-visible:ring-0"
                    aria-label="거래 희망 지역"
                />
                <Button
                    type="button"
                    variant="outline"
                    className="h-[50px] shrink-0 gap-1.5 rounded-[8px] border-[#6653fb] px-4 text-[15px] font-semibold text-[#6653fb] hover:bg-[#fafbff]"
                    onClick={openSearch}
                >
                    <Search aria-hidden="true" className="size-4" />
                    지역 검색
                </Button>
            </div>
            {errorMessage && (
                <p className="text-destructive text-[12px] leading-[18px]">{errorMessage}</p>
            )}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-h-[calc(100vh-2rem)] w-[calc(100%-2rem)] max-w-[640px] gap-3 overflow-hidden p-4 sm:p-6">
                    <DialogTitle>거래 희망 지역 검색</DialogTitle>
                    <DialogDescription className="sr-only">
                        읍·면·동을 검색하고 거래 희망 지역을 선택해 주세요.
                    </DialogDescription>
                    <DialogClose asChild>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label="지역 검색 닫기"
                            className="absolute top-4 right-4 rounded-full p-0 text-[#6b6c7b] hover:bg-[#f5f4ff]"
                        >
                            <X aria-hidden="true" className="size-4" />
                        </Button>
                    </DialogClose>
                    <div className="h-[min(460px,calc(100vh-8rem))] min-h-[360px] w-full overflow-hidden rounded-lg border border-[#d3d3d3] bg-white">
                        <div ref={postcodeContainerRef} className="h-full w-full" />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
