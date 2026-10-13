import type { Metadata } from "next";

import { createPublicPageMetadata, defaultSiteDescription } from "@/common/seo/metadata";
import { OnboardingPage } from "@/features/onboarding/components/OnboardingPage";

export const metadata: Metadata = createPublicPageMetadata({
    title: "AI 중고거래 시세 분석",
    description: defaultSiteDescription,
    pathname: "/",
});

export default function Page() {
    return <OnboardingPage />;
}
