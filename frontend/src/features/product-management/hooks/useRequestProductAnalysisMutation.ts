"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { productApi } from "@/features/sell/api/productApi";
import type { ProductManagementPerspective } from "../types";
import {
    productAnalysisRequestResponseSchema,
    type ProductAnalysisRequestResponse,
} from "../schemas/productManagementResponseSchema";
import type {
    ProductAnalysisStreamResult,
    ProductAnalysisStreamStep,
} from "../schemas/productAnalysisStreamSchema";

type RequestProductAnalysisInput = {
    productId: number;
    perspective?: ProductManagementPerspective;
    force?: boolean;
};

export type ProductAnalysisRetryResult = ProductAnalysisStreamResult & {
    request: ProductAnalysisRequestResponse;
};

export type ProductAnalysisRetryNotice = {
    kind: "blocked" | "completed";
    status: ProductAnalysisRequestResponse["analysisStatus"];
    message: string;
};

function getNoProgressNotice(
    status: ProductAnalysisRequestResponse["analysisStatus"],
): ProductAnalysisRetryNotice {
    const messages: Record<ProductAnalysisRequestResponse["analysisStatus"], string> = {
        ANALYZED:
            "새 분석 진행 단계를 받지 못해 최근 시세 분석 결과를 보여드려요. 잠시 후 다시 시도해 주세요.",
        ANALYZING: "시세 분석이 아직 진행 중이에요. 잠시 후 다시 결과를 확인해 주세요.",
        SKIPPED:
            "최근 시세 분석을 건너뛰어 새 분석을 시작하지 않았어요. 잠시 후 다시 시도해 주세요.",
        NOT_ANALYZED: "시세 분석을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.",
        UNAVAILABLE: "현재 이 상품은 시세 분석 대상이 아니에요.",
    };

    return { kind: "blocked", status, message: messages[status] };
}

function getRetryNotice(
    request: ProductAnalysisRequestResponse,
    force: boolean,
): ProductAnalysisRetryNotice | null {
    if (request.analysisStatus === "ANALYZED") {
        return {
            kind: "blocked",
            status: request.analysisStatus,
            message: force
                ? "최근 10분 이내에 시세 분석이 이미 진행되어 새 분석을 시작하지 않았어요. 잠시 후 다시 시도해 주세요."
                : "최근 시세 분석 결과가 있어 새 분석을 시작하지 않았어요.",
        };
    }

    if (request.analysisStatus === "SKIPPED") {
        return {
            kind: "blocked",
            status: request.analysisStatus,
            message: force
                ? `최근 10분 이내에 시세 분석을 시도했지만 ${request.analysisSkipMessage ?? "분석을 완료하지 못했어요."} 잠시 후 다시 시도해 주세요.`
                : (request.analysisSkipMessage ??
                  "최근 시세 분석을 건너뛰어 새 분석을 시작하지 않았어요."),
        };
    }

    return null;
}

/** 상품 시세 분석 요청과 완료 SSE 구독을 함께 처리한다. */
export function useRequestProductAnalysisMutation() {
    const queryClient = useQueryClient();
    const abortControllerRef = useRef<AbortController | null>(null);
    const [progress, setProgress] = useState<
        (Omit<ProductAnalysisStreamStep, "event"> & { message: string }) | null
    >(null);
    const [notice, setNotice] = useState<ProductAnalysisRetryNotice | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const mutation = useMutation<ProductAnalysisRetryResult, Error, RequestProductAnalysisInput>({
        mutationFn: async ({ productId, perspective = "SELL", force = false }) => {
            const controller = new AbortController();
            abortControllerRef.current = controller;
            setIsProcessing(true);
            setProgress(null);
            setNotice(null);

            try {
                const { data: response } = await productApi.requestProductAnalysis(
                    productId,
                    force,
                );
                if (!response.success) {
                    throw new Error(response.message);
                }

                const request = productAnalysisRequestResponseSchema.parse(response.data);
                if (request.analysisStatus !== "ANALYZING") {
                    setNotice(getRetryNotice(request, force));
                    return {
                        request,
                        analysisStatus: request.analysisStatus,
                        analysis: null,
                        message: response.message,
                    };
                }

                let receivedProgress = false;
                const stream = await productApi.streamProductAnalysis(
                    productId,
                    perspective,
                    (nextProgress) => {
                        receivedProgress = true;
                        setProgress(nextProgress);
                    },
                    controller.signal,
                );

                if (!receivedProgress) {
                    setNotice(getNoProgressNotice(stream.analysisStatus));
                } else if (stream.analysisStatus === "ANALYZED") {
                    setNotice({
                        kind: "completed",
                        status: stream.analysisStatus,
                        message: "시세 분석이 완료됐어요. 최신 분석 결과를 확인해 주세요.",
                    });
                }

                return { request, ...stream };
            } finally {
                if (abortControllerRef.current === controller) {
                    abortControllerRef.current = null;
                }
                setIsProcessing(false);
            }
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["product-management"] });
            void queryClient.invalidateQueries({ queryKey: ["my-products"] });
        },
    });

    const cancel = useCallback(() => {
        abortControllerRef.current?.abort();
    }, []);

    const reset = useCallback(() => {
        mutation.reset();
        setIsProcessing(false);
        setProgress(null);
        setNotice(null);
    }, [mutation]);

    useEffect(() => cancel, [cancel]);

    return { ...mutation, isProcessing, progress, notice, cancel, reset };
}
