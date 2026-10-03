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
            className="group fixed right-4 bottom-[calc(2rem+env(safe-area-inset-bottom))] z-40 size-[70px] overflow-hidden rounded-full bg-[#6653fb] p-0 text-white transition-[background-color,translate,scale,box-shadow] duration-300 hover:bg-[#6653fb] hover:shadow-[0_12px_32px_rgba(108,83,255,0.3)] focus-visible:shadow-[0_12px_32px_rgba(108,83,255,0.3)] focus-visible:ring-3 focus-visible:ring-[#6653fb]/30 motion-safe:hover:-translate-y-1 motion-safe:active:scale-[0.96] motion-reduce:transition-none md:right-6 md:bottom-[calc(4.5rem+env(safe-area-inset-bottom))]"
        >
            <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-white/20 opacity-0 motion-safe:transition-[translate,opacity] motion-safe:duration-700 motion-safe:group-hover:translate-x-[500%] motion-safe:group-hover:opacity-100 motion-safe:group-focus-visible:translate-x-[500%] motion-safe:group-focus-visible:opacity-100"
            />
            <ArrowUp
                aria-hidden="true"
                strokeWidth={2.5}
                className="absolute top-2 left-1/2 size-8 -translate-x-1/2 motion-safe:transition-transform motion-safe:group-hover:-translate-y-1"
            />
            <span className="absolute top-[43px] left-0 w-full text-center text-[11px] leading-none font-medium">
                바로가기
            </span>
        </Button>
    );
}
