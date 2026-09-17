import type { ReactNode } from "react";

import { SiteFooter } from "@/common/components/layout/SiteFooter";
import { SiteHeader } from "@/common/components/layout/SiteHeader";

export default function PublicLayout({ children }: { children: ReactNode }) {
    return (
        <>
            <SiteHeader />
            {children}
            <SiteFooter />
        </>
    );
}
