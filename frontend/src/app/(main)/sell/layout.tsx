import type { Metadata } from "next";
import type { ReactNode } from "react";

import { noIndexMetadata } from "@/common/seo/metadata";

export const metadata: Metadata = noIndexMetadata;

export default function SellLayout({ children }: { children: ReactNode }) {
    return children;
}
