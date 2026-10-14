import type { Metadata } from "next";
import type { ReactNode } from "react";

import { noIndexMetadata } from "@/common/seo/metadata";

import { MyLayoutGuard } from "./MyLayoutGuard";

export const metadata: Metadata = noIndexMetadata;

export default function MyLayout({ children }: { children: ReactNode }) {
    return <MyLayoutGuard>{children}</MyLayoutGuard>;
}
