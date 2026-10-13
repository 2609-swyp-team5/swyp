import type { Metadata } from "next";
import { DM_Sans, Inter } from "next/font/google";
import type { ReactNode } from "react";

import { SiteFooter } from "@/common/components/layout/SiteFooter";
import { SiteHeader } from "@/common/components/layout/SiteHeader";
import { siteOrigin } from "@/common/lib/siteUrl";
import { QueryProvider } from "@/common/providers/QueryProvider";
import { defaultOgImage, defaultSiteDescription, defaultSiteTitle } from "@/common/seo/metadata";
import AuthInitializer from "@/features/auth/components/AuthInitializer";
import { NotificationToaster } from "@/features/notifications/components/NotificationToaster";

import "./globals.css";

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
    display: "swap",
});

const dmSans = DM_Sans({
    subsets: ["latin"],
    variable: "--font-dm-sans",
    display: "swap",
});

export const metadata: Metadata = {
    metadataBase: siteOrigin,
    title: {
        default: "지금이니?",
        template: "%s | 지금이니?",
    },
    description: defaultSiteDescription,
    openGraph: {
        type: "website",
        locale: "ko_KR",
        siteName: "지금이니?",
        title: defaultSiteTitle,
        description: defaultSiteDescription,
        images: [defaultOgImage],
    },
    twitter: {
        card: "summary",
        title: defaultSiteTitle,
        description: defaultSiteDescription,
        images: [defaultOgImage.url],
    },
    icons: {
        icon: "/brand/favicon.svg",
    },
};

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="ko" className={`${inter.variable} ${dmSans.variable} h-full antialiased`}>
            <body className="flex min-h-full flex-col">
                <QueryProvider>
                    <AuthInitializer />
                    <SiteHeader />
                    <div className="flex flex-1 flex-col">{children}</div>
                    <SiteFooter />
                    <NotificationToaster />
                </QueryProvider>
            </body>
        </html>
    );
}
