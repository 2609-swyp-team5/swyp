"use client";

import { useEffect, useRef } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

export function useSmoothScroll() {
    const lenisRef = useRef<Lenis | undefined>(undefined);

    useEffect(() => {
        const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
        let lenis: Lenis | undefined;
        const updateScroll = () => {
            lenis?.destroy();
            lenis = preference.matches
                ? undefined
                : new Lenis({ autoRaf: true, lerp: 0.12, smoothWheel: true, syncTouch: false });
            lenisRef.current = lenis;
        };

        updateScroll();
        preference.addEventListener("change", updateScroll);
        return () => {
            preference.removeEventListener("change", updateScroll);
            lenis?.destroy();
            lenisRef.current = undefined;
        };
    }, []);

    return () => {
        if (lenisRef.current) lenisRef.current.scrollTo(0);
        else window.scrollTo({ top: 0, behavior: "instant" });
    };
}
