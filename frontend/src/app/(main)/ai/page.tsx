import type { Metadata } from "next";

import { noIndexMetadata } from "@/common/seo/metadata";
import { AiChatPage } from "@/features/ai-chat/components/AiChatPage";

export const metadata: Metadata = { ...noIndexMetadata, title: "지금이니 AI" };

export default function AiPage() {
    return <AiChatPage />;
}
