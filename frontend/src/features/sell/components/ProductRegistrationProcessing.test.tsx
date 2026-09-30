import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ProductRegistrationProcessing } from "./ProductRegistrationProcessing";

describe("ProductRegistrationProcessing", () => {
    it("shows the registration error and lets the user retry or exit", async () => {
        const user = userEvent.setup();
        const onRetry = vi.fn();
        const onGoToManage = vi.fn();

        render(
            <ProductRegistrationProcessing
                kind="ai"
                status="error"
                errorMessage="등록 요청이 실패했어요"
                progress={{
                    step: "IMAGE_ANALYSIS",
                    status: "ERROR",
                    index: 2,
                    total: 3,
                    message: "AI 사진 분석에 실패했어요 잠시 후 다시 시도해 주세요",
                }}
                onRetry={onRetry}
                onGoToManage={onGoToManage}
            />,
        );

        expect(
            screen.getByRole("heading", { name: "판매 글 등록에 실패했어요" }),
        ).toBeInTheDocument();
        expect(screen.getByText("다시 시도하거나 나가기를 선택해 주세요.")).toBeInTheDocument();
        expect(screen.getByText("등록 요청이 실패했어요.")).toBeInTheDocument();
        expect(screen.getByRole("alert")).toHaveTextContent("등록 요청이 실패했어요.");
        expect(screen.getByText("상품 이미지 분석 실패")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "다시 시도" }));
        await user.click(screen.getByRole("button", { name: "나가기" }));

        expect(onRetry).toHaveBeenCalledTimes(1);
        expect(onGoToManage).toHaveBeenCalledTimes(1);
    });

    it("does not mark a step as failed when the stream never starts", () => {
        render(
            <ProductRegistrationProcessing
                kind="direct"
                status="error"
                errorMessage="상품을 등록할 수 없어요"
                onRetry={vi.fn()}
                onGoToManage={vi.fn()}
            />,
        );

        expect(screen.getByRole("alert")).toHaveTextContent("상품을 등록할 수 없어요.");
        expect(screen.queryByText("이미지 업로드 실패")).not.toBeInTheDocument();
        expect(screen.getByText("이미지 업로드")).toBeInTheDocument();
        expect(screen.getByText("상품 이미지 분석")).toBeInTheDocument();
        expect(screen.getByText("상품 등록")).toBeInTheDocument();
    });

    it("does not offer retry after a processing timeout", () => {
        render(
            <ProductRegistrationProcessing
                kind="direct"
                status="error"
                errorCode="REGISTER_TIMEOUT"
                errorMessage="처리가 지연되고 있습니다. 처리 결과는 내 상품 목록에서 확인해 주세요."
                progress={{
                    step: "IMAGE_ANALYSIS",
                    status: "ERROR",
                    index: 2,
                    total: 3,
                    message:
                        "처리가 지연되고 있습니다. 처리 결과는 내 상품 목록에서 확인해 주세요.",
                }}
                onRetry={vi.fn()}
                onGoToManage={vi.fn()}
            />,
        );

        expect(
            screen.getByRole("heading", { name: "상품 등록이 조금 늦어지고 있어요" }),
        ).toBeInTheDocument();
        expect(
            screen.getByText(
                "백그라운드에서 계속 처리 중이에요. 잠시 후 상품 목록에서 결과를 확인해 주세요.",
            ),
        ).toBeInTheDocument();
        expect(screen.getByText("상품 이미지 분석하는 중")).toBeInTheDocument();
        expect(screen.queryByText("상품 이미지 분석 실패")).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "다시 시도" })).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "상품 목록 확인" })).toBeInTheDocument();
    });

    it("keeps the completed steps and shows the manage action after success", async () => {
        const user = userEvent.setup();
        const onGoToManage = vi.fn();

        render(
            <ProductRegistrationProcessing
                kind="direct"
                status="success"
                progress={{
                    step: "PRODUCT_SAVE",
                    status: "DONE",
                    index: 3,
                    total: 3,
                    message: "상품 등록 완료",
                }}
                onGoToManage={onGoToManage}
            />,
        );

        expect(screen.getByRole("heading", { name: "판매 글이 등록되었어요" })).toBeInTheDocument();
        expect(
            screen.getByText("확인하러 가기 버튼을 눌러 등록된 판매 글을 확인해 보세요."),
        ).toBeInTheDocument();
        expect(screen.getByText("상품 등록 완료")).toBeInTheDocument();
        expect(screen.getByText("이미지 업로드 완료")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "확인하러 가기" })).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "확인하러 가기" }));

        expect(onGoToManage).toHaveBeenCalledTimes(1);
    });

    it("shows skipped image steps when an edit keeps the same images", () => {
        render(
            <ProductRegistrationProcessing
                kind="edit"
                status="success"
                progress={{
                    step: "PRODUCT_SAVE",
                    status: "DONE",
                    index: 3,
                    total: 3,
                    message: "상품 수정 완료",
                }}
                progressHistory={[
                    {
                        step: "IMAGE_UPLOAD",
                        status: "SKIP",
                        index: 1,
                        total: 3,
                        message: "새로 추가할 이미지가 없습니다.",
                    },
                    {
                        step: "IMAGE_ANALYSIS",
                        status: "SKIP",
                        index: 2,
                        total: 3,
                        message: "이미지가 바뀌지 않아 사진 분석을 건너뜁니다.",
                    },
                    {
                        step: "PRODUCT_SAVE",
                        status: "DONE",
                        index: 3,
                        total: 3,
                        message: "상품 수정 완료",
                    },
                ]}
                onGoToManage={vi.fn()}
            />,
        );

        expect(screen.getByText("이미지 업로드 건너뜀")).toBeInTheDocument();
        expect(screen.getByText("상품 이미지 분석 건너뜀")).toBeInTheDocument();
        expect(
            screen.getByText(
                "변경된 항목만 반영했어요. 확인하러 가기를 눌러 판매 글을 확인해 보세요.",
            ),
        ).toBeInTheDocument();
        expect(screen.getAllByText("−")).toHaveLength(2);
    });
});
