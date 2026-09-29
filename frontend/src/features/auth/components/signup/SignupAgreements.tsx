"use client";

import { Checkbox } from "@/common/components/ui/Checkbox";
import { Label } from "@/common/components/ui/Label";

const checkboxClassName =
    "size-6 border-[#d3d3d3] bg-[#fafbff] data-[state=checked]:border-[#272727] data-[state=checked]:bg-[#272727] data-[state=checked]:text-white dark:bg-[#fafbff] dark:data-[state=checked]:bg-[#272727] [&_[data-slot=checkbox-indicator]>svg]:size-[18px]";
const labelClassName =
    "text-base leading-[25px] font-semibold tracking-[0.5px] break-keep text-[#6b6c7b]";

export function SignupAgreements({ isBusy }: { isBusy: boolean }) {
    return (
        <fieldset
            disabled={isBusy}
            className="mt-10 space-y-[15px] border-t border-[#d3d3d3] pt-[50px]"
        >
            <div className="flex items-center gap-2">
                <Checkbox id="terms" defaultChecked className={checkboxClassName} />
                <Label htmlFor="terms" className={labelClassName}>
                    이용약관 및 개인정보 처리방침 동의 (필수)
                </Label>
            </div>
            <div className="flex items-center gap-2">
                <Checkbox id="marketing" className={checkboxClassName} />
                <Label htmlFor="marketing" className={labelClassName}>
                    마케팅 정보 수신 및 이벤트 알림 동의 (선택)
                </Label>
            </div>
        </fieldset>
    );
}
