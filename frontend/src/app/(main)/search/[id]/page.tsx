import { SearchProductDetailPage } from "@/features/search/components/detail/SearchProductDetailPage";
import { notFound } from "next/navigation";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const targetId = Number(id);
    if (!Number.isSafeInteger(targetId) || targetId <= 0) notFound();
    return <SearchProductDetailPage key={targetId} targetId={targetId} />;
}
