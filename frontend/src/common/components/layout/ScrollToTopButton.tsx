import { ArrowUp } from "lucide-react";

import { Button } from "@/common/components/ui/Button";

export function ScrollToTopButton({ onClick }: { onClick: () => void }) {
    return (
        <Button
            type="button"
            size="icon-lg"
            aria-label="맨 위로 이동"
            title="맨 위로 이동"
            onClick={onClick}
            // width-before-scroll-bar: Select·Dialog가 body 스크롤을 잠가 스크롤바가 사라질 때 그 폭만큼 margin-right를 받아 제자리를 유지한다(react-remove-scroll)
            className="width-before-scroll-bar group fixed right-4 bottom-[calc(var(--mobile-tab-bar-height)+1rem+env(safe-area-inset-bottom))] z-40 size-12 overflow-hidden rounded-full bg-[#6653fb] p-0 text-white transition-[background-color,translate,scale,box-shadow] duration-300 hover:bg-[#6653fb] hover:shadow-[0_12px_32px_rgba(108,83,255,0.3)] focus-visible:shadow-[0_12px_32px_rgba(108,83,255,0.3)] focus-visible:ring-3 focus-visible:ring-[#6653fb]/30 motion-safe:hover:-translate-y-1 motion-safe:active:scale-[0.96] motion-reduce:transition-none md:right-6 md:bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:size-[50px]"
        >
            <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-white/20 opacity-0 motion-safe:transition-[translate,opacity] motion-safe:duration-700 motion-safe:group-hover:translate-x-[500%] motion-safe:group-hover:opacity-100 motion-safe:group-focus-visible:translate-x-[500%] motion-safe:group-focus-visible:opacity-100"
            />
            <ArrowUp
                aria-hidden="true"
                strokeWidth={2.5}
                className="absolute top-1/2 left-1/2 size-7 -translate-x-1/2 -translate-y-1/2 motion-safe:transition-transform motion-safe:group-hover:-translate-y-1 md:top-2 md:size-8 md:translate-y-0"
            />
        </Button>
    );
}
