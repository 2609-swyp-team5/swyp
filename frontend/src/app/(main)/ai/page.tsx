import type { Metadata } from "next";
import { Suspense } from "react";

import { noIndexMetadata } from "@/common/seo/metadata";
import { AiChatPage } from "@/features/ai-chat/components/AiChatPage";

export const metadata: Metadata = { ...noIndexMetadata, title: "지금이니 AI" };

export default function AiPage() {
    return (
        <Suspense fallback={<main aria-label="지금이니 AI 불러오는 중" />}>
            <AiChatPage />
        </Suspense>
    );
}
