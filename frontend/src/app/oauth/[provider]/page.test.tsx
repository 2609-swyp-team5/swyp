import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

import SocialOAuthCallbackPage from "./page";

const mocks = vi.hoisted(() => ({
    mutate: vi.fn(),
    replace: vi.fn(),
    params: { provider: "kakao" },
    searchParams: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
    useParams: () => mocks.params,
    useRouter: () => ({ replace: mocks.replace }),
    useSearchParams: () => mocks.searchParams,
}));

vi.mock("@/features/auth/hooks/mutations/useSocialLoginMutation", () => ({
    useSocialLoginMutation: () => ({ mutate: mocks.mutate, isPending: false }),
}));

beforeEach(() => {
    mocks.mutate.mockReset();
    mocks.replace.mockReset();
    mocks.params = { provider: "kakao" };
    mocks.searchParams = new URLSearchParams();
});

it("카카오 인가 코드를 전달하고 로그인 성공 후 메인으로 이동한다", async () => {
    mocks.searchParams = new URLSearchParams("code=kakao-authorization-code");
    mocks.mutate.mockImplementation((_request, options) => options.onSuccess());

    render(<SocialOAuthCallbackPage />);

    await waitFor(() => {
        expect(mocks.mutate).toHaveBeenCalledWith(
            { provider: "KAKAO", token: "kakao-authorization-code" },
            expect.any(Object),
        );
        expect(mocks.replace).toHaveBeenCalledWith("/");
    });
});

it("인가 코드가 없으면 오류 메시지를 보여준다", () => {
    render(<SocialOAuthCallbackPage />);

    expect(screen.getByRole("alert")).toHaveTextContent("소셜 로그인 인증 코드를 받지 못했습니다.");
    expect(mocks.mutate).not.toHaveBeenCalled();
});

it("소셜 제공자가 로그인을 거부하면 오류 메시지를 보여준다", () => {
    mocks.params = { provider: "naver" };
    mocks.searchParams = new URLSearchParams("error=access_denied");

    render(<SocialOAuthCallbackPage />);

    expect(screen.getByRole("alert")).toHaveTextContent(
        "네이버 로그인이 취소되었거나 실패했습니다.",
    );
    expect(mocks.mutate).not.toHaveBeenCalled();
});
