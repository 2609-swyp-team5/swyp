import type { Metadata } from "next";
import { DM_Sans, Inter } from "next/font/google";
import type { ReactNode } from "react";

import { SiteFooter } from "@/common/components/layout/SiteFooter";
import { SiteHeader } from "@/common/components/layout/SiteHeader";
import AuthInitializer from "@/features/auth/components/AuthInitializer";
import { QueryProvider } from "@/common/providers/QueryProvider";

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
    title: "지금이니?",
    description: "AI와 함께하는 똑똑한 중고거래 서비스",
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
                </QueryProvider>
            </body>
        </html>
    );
}
