import { http, HttpResponse } from "msw";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { server } from "../../../../tests/mocks/server";

const baseURL = "http://localhost:8080";
let api: typeof import("./client").api;
let useAuthStore: typeof import("@/features/auth/store/authStore").useAuthStore;

beforeAll(async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", baseURL);
    ({ api } = await import("./client"));
    ({ useAuthStore } = await import("@/features/auth/store/authStore"));
});

afterAll(() => vi.unstubAllEnvs());

beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem("accessToken", "old-token");
    useAuthStore.setState({ isLoggedIn: true, isInitialized: true });
});

const refreshed = () =>
    HttpResponse.json({ success: true, data: { accessToken: "new-token" }, error: null });

describe("access token refresh", () => {
    it("refreshes once and retries with the same method and body", async () => {
        const headers: (string | null)[] = [];
        const bodies: unknown[] = [];
        let refreshCount = 0;
        server.use(
            http.post(`${baseURL}/products`, async ({ request }) => {
                headers.push(request.headers.get("Authorization"));
                bodies.push(await request.json());
                return headers.length === 1
                    ? new HttpResponse(null, { status: 401 })
                    : HttpResponse.json({ success: true });
            }),
            http.post(`${baseURL}/auth/refresh`, () => {
                refreshCount++;
                return refreshed();
            }),
        );

        const result = await api.post("/products", { name: "product" });
        expect(result.data.success).toBe(true);
        expect(headers).toEqual(["Bearer old-token", "Bearer new-token"]);
        expect(bodies).toEqual([{ name: "product" }, { name: "product" }]);
        expect(refreshCount).toBe(1);
        expect(sessionStorage.getItem("accessToken")).toBe("new-token");
    });

    it("shares a refresh across concurrent requests and late 401 responses", async () => {
        let releaseLateResponse!: () => void;
        const lateResponse = new Promise<void>((resolve) => {
            releaseLateResponse = resolve;
        });
        let refreshCount = 0;
        server.use(
            http.get(`${baseURL}/products/:id`, async ({ request, params }) => {
                if (request.headers.get("Authorization") === "Bearer new-token") {
                    return HttpResponse.json({ success: true });
                }
                if (params.id === "late") await lateResponse;
                return new HttpResponse(null, { status: 401 });
            }),
            http.post(`${baseURL}/auth/refresh`, () => {
                refreshCount++;
                return refreshed();
            }),
        );

        const late = api.get("/products/late");
        const results = await Promise.all([api.get("/products/1"), api.get("/products/2")]);
        releaseLateResponse();
        results.push(await late);
        expect(results.every((result) => result.status === 200)).toBe(true);
        expect(refreshCount).toBe(1);
    });

    it("does not refresh again when the retried request returns 401", async () => {
        let requestCount = 0;
        let refreshCount = 0;
        server.use(
            http.get(`${baseURL}/products`, () => {
                requestCount++;
                return new HttpResponse(null, { status: 401 });
            }),
            http.post(`${baseURL}/auth/refresh`, () => {
                refreshCount++;
                return refreshed();
            }),
        );
        await expect(api.get("/products")).rejects.toMatchObject({ response: { status: 401 } });
        expect(requestCount).toBe(2);
        expect(refreshCount).toBe(1);
    });

    it.each(["/auth/login", "/auth/signup", "/auth/social/login", "/auth/refresh"])(
        "does not refresh authentication failures from %s",
        async (path) => {
            server.use(
                http.post(`${baseURL}${path}`, () => new HttpResponse(null, { status: 401 })),
            );
            await expect(api.post(path)).rejects.toMatchObject({ response: { status: 401 } });
        },
    );

    it("does not refresh when no access token is stored", async () => {
        sessionStorage.clear();
        server.use(http.get(`${baseURL}/products`, () => new HttpResponse(null, { status: 401 })));
        await expect(api.get("/products")).rejects.toMatchObject({ response: { status: 401 } });
    });

    it.each([403, 500])("does not refresh a resource HTTP %s", async (status) => {
        server.use(http.get(`${baseURL}/products`, () => new HttpResponse(null, { status })));
        await expect(api.get("/products")).rejects.toMatchObject({ response: { status } });
    });

    it("clears the session after an unsuccessful refresh response", async () => {
        server.use(
            http.get(`${baseURL}/products`, () => new HttpResponse(null, { status: 401 })),
            http.post(`${baseURL}/auth/refresh`, () =>
                HttpResponse.json({ success: false, message: "Refresh rejected", data: null }),
            ),
        );
        await expect(api.get("/products")).rejects.toThrow("Refresh rejected");
        expect(sessionStorage.getItem("accessToken")).toBeNull();
        expect(useAuthStore.getState().isLoggedIn).toBe(false);
    });

    it.each([401, 500])(
        "clears the session after refresh HTTP %s without retrying",
        async (status) => {
            let refreshCount = 0;
            server.use(
                http.get(`${baseURL}/products`, () => new HttpResponse(null, { status: 401 })),
                http.post(`${baseURL}/auth/refresh`, () => {
                    refreshCount++;
                    return new HttpResponse(null, { status });
                }),
            );
            await expect(api.get("/products")).rejects.toMatchObject({ response: { status } });
            expect(refreshCount).toBe(1);
            expect(sessionStorage.getItem("accessToken")).toBeNull();
            expect(useAuthStore.getState().isLoggedIn).toBe(false);
        },
    );

    it("does not restore a session cleared while refresh is pending", async () => {
        server.use(
            http.get(`${baseURL}/products`, () => new HttpResponse(null, { status: 401 })),
            http.post(`${baseURL}/auth/refresh`, () => {
                sessionStorage.removeItem("accessToken");
                return refreshed();
            }),
        );
        await expect(api.get("/products")).rejects.toMatchObject({ code: "ERR_CANCELED" });
        expect(sessionStorage.getItem("accessToken")).toBeNull();
    });

    it("does not clear a newer login when an older refresh fails", async () => {
        server.use(
            http.get(`${baseURL}/products`, () => new HttpResponse(null, { status: 401 })),
            http.post(`${baseURL}/auth/refresh`, () => {
                sessionStorage.setItem("accessToken", "new-login-token");
                return new HttpResponse(null, { status: 401 });
            }),
        );
        await expect(api.get("/products")).rejects.toMatchObject({ response: { status: 401 } });
        expect(sessionStorage.getItem("accessToken")).toBe("new-login-token");
        expect(useAuthStore.getState().isLoggedIn).toBe(true);
    });

    it("does not log out when the retried resource request fails with 500", async () => {
        server.use(
            http.get(
                `${baseURL}/products`,
                ({ request }) =>
                    new HttpResponse(null, {
                        status:
                            request.headers.get("Authorization") === "Bearer old-token" ? 401 : 500,
                    }),
            ),
            http.post(`${baseURL}/auth/refresh`, refreshed),
        );
        await expect(api.get("/products")).rejects.toMatchObject({ response: { status: 500 } });
        expect(sessionStorage.getItem("accessToken")).toBe("new-token");
        expect(useAuthStore.getState().isLoggedIn).toBe(true);
    });
});
