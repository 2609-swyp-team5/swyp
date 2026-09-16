import type { ReactNode } from "react";

import { MySidebar } from "@/features/my/components/MySidebar";

export default function MyLayout({ children }: { children: ReactNode }) {
    return (
        <div className="bg-muted/20 flex flex-1 flex-col md:flex-row">
            <MySidebar />
            <div className="min-w-0 flex-1">{children}</div>
        </div>
    );
}
