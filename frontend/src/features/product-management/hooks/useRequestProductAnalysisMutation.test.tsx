import type { ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

import { useRequestProductAnalysisMutation } from "./useRequestProductAnalysisMutation";

const { requestProductAnalysis, streamProductAnalysis } = vi.hoisted(() => ({
    requestProductAnalysis: vi.fn(),
    streamProductAnalysis: vi.fn(),
}));

vi.mock("@/features/sell/api/productApi", () => ({
    productApi: { requestProductAnalysis, streamProductAnalysis },
}));

function setup() {
    const client = new QueryClient({
        defaultOptions: {
            mutations: { retry: false },
        },
    });
    const hook = renderHook(() => useRequestProductAnalysisMutation(), {
        wrapper: ({ children }: { children: ReactNode }) => (
            <QueryClientProvider client={client}>{children}</QueryClientProvider>
        ),
    });

    return { client, hook };
}

beforeEach(() => {
    requestProductAnalysis.mockReset();
    streamProductAnalysis.mockReset();
    requestProductAnalysis.mockResolvedValue({
        data: {
            success: true,
            message: "",
            data: {
                productId: 42,
                analysisStatus: "ANALYZING",
                analysisSkipReason: null,
                analysisSkipMessage: null,
            },
            error: null,
        },
    });
    streamProductAnalysis.mockImplementation(
        async (
            _productId: number,
            _perspective: string,
            onProgress: (progress: unknown) => void,
        ) => {
            onProgress({
                step: "AI_ANALYSIS",
                status: "START",
                index: 2,
                total: 5,
                message: "AI가 같은 물건을 고르고 시세를 판단하고 있어요.",
            });
            return {
                analysisStatus: "ANALYZED",
                analysis: null,
                message: "분석 완료",
            };
        },
    );
});

it("요청 후 SSE를 구독하고 진행 상태를 전달하며 분석 캐시를 갱신한다", async () => {
    const { client, hook } = setup();
    const invalidateQueries = vi.spyOn(client, "invalidateQueries");

    await act(async () => {
        await expect(
            hook.result.current.mutateAsync({ productId: 42, force: true, perspective: "SELL" }),
        ).resolves.toMatchObject({ analysisStatus: "ANALYZED" });
    });

    expect(requestProductAnalysis).toHaveBeenCalledWith(42, true);
    expect(streamProductAnalysis).toHaveBeenCalledWith(
        42,
        "SELL",
        expect.any(Function),
        expect.any(AbortSignal),
    );
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["product-management"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["my-products"] });
    expect(hook.result.current.progress).toMatchObject({
        step: "AI_ANALYSIS",
        status: "START",
        index: 2,
    });
});

it("분석 요청이 실제로 대기열에 들어가지 않으면 SSE를 연결하지 않는다", async () => {
    requestProductAnalysis.mockResolvedValueOnce({
        data: {
            success: true,
            message: "최근 분석 결과를 보여드려요.",
            data: {
                productId: 42,
                analysisStatus: "ANALYZED",
                analysisSkipReason: null,
                analysisSkipMessage: null,
            },
            error: null,
        },
    });
    const { hook } = setup();

    await act(async () => {
        await expect(hook.result.current.mutateAsync({ productId: 42 })).resolves.toMatchObject({
            analysisStatus: "ANALYZED",
        });
    });

    expect(streamProductAnalysis).not.toHaveBeenCalled();
    expect(hook.result.current.notice).toMatchObject({ status: "ANALYZED" });
});

it("SSE가 진행 단계 없이 바로 완료되면 안내를 유지한다", async () => {
    streamProductAnalysis.mockResolvedValueOnce({
        analysisStatus: "ANALYZED",
        analysis: null,
        message: "최근 분석 결과를 확인했어요.",
    });
    const { hook } = setup();

    await act(async () => {
        await hook.result.current.mutateAsync({ productId: 42, force: true });
    });

    expect(hook.result.current.notice).toMatchObject({ status: "ANALYZED" });
    expect(hook.result.current.notice?.message).toContain("최근 시세 분석 결과");
});

it("SSE 분석이 완료되면 완료 안내와 닫기 상태를 유지한다", async () => {
    const { hook } = setup();

    await act(async () => {
        await hook.result.current.mutateAsync({ productId: 42, force: true });
    });

    expect(hook.result.current.notice).toMatchObject({
        kind: "completed",
        status: "ANALYZED",
    });
});
