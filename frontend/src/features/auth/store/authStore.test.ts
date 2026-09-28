import { beforeEach, expect, it, vi } from "vitest";

import { AUTH_LOGGED_OUT_KEY, useAuthStore } from "./authStore";

const { authRefresh, authLogout } = vi.hoisted(() => ({
    authRefresh: vi.fn(),
    authLogout: vi.fn(),
}));
vi.mock("@/features/auth/api/authApi", () => ({ authApi: { authRefresh, authLogout } }));

beforeEach(() => {
    localStorage.clear();
    authRefresh.mockReset();
    authLogout.mockReset();
    useAuthStore.getState().clearAuth();
    useAuthStore.setState({ isInitialized: false });
    authRefresh.mockResolvedValue({ data: { success: true, data: { accessToken: "restored" } } });
    authLogout.mockResolvedValue({ data: { success: true, data: null } });
});

it("skips initial refresh after explicit logout", async () => {
    useAuthStore.getState().setAccessToken("signed-in");
    await useAuthStore.getState().logout();
    expect(localStorage.getItem(AUTH_LOGGED_OUT_KEY)).toBe("true");
    await useAuthStore.getState().checkStatus();
    expect(authRefresh).not.toHaveBeenCalled();
    expect(useAuthStore.getState()).toMatchObject({
        isInitialized: true,
        isLoggedIn: false,
        accessToken: null,
    });
});

it("restores a session when there is no logout hint", async () => {
    await useAuthStore.getState().checkStatus();
    await useAuthStore.getState().checkStatus();
    expect(authRefresh).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().accessToken).toBe("restored");
});

it.each(["business", "network"])("does not persist a failed %s logout", async (failure) => {
    useAuthStore.getState().setAccessToken("signed-in");
    if (failure === "business") {
        authLogout.mockResolvedValue({ data: { success: false, message: "failed" } });
    } else authLogout.mockRejectedValue(new Error("failed"));
    await expect(useAuthStore.getState().logout()).rejects.toThrow("failed");
    expect(localStorage.getItem(AUTH_LOGGED_OUT_KEY)).toBeNull();
    expect(useAuthStore.getState().accessToken).toBe("signed-in");
});

it("removes the logout hint when a login token is stored", () => {
    localStorage.setItem(AUTH_LOGGED_OUT_KEY, "true");
    useAuthStore.getState().setAccessToken("new-login");
    expect(localStorage.getItem(AUTH_LOGGED_OUT_KEY)).toBeNull();
    expect(useAuthStore.getState().isLoggedIn).toBe(true);
});

it("syncs logout and a subsequent login in another tab", async () => {
    useAuthStore.getState().setAccessToken("signed-in");
    useAuthStore.setState({ isInitialized: true });
    localStorage.setItem(AUTH_LOGGED_OUT_KEY, "true");
    await useAuthStore.getState().checkStatus(true);
    expect(useAuthStore.getState().isLoggedIn).toBe(false);
    expect(authRefresh).not.toHaveBeenCalled();
    localStorage.removeItem(AUTH_LOGGED_OUT_KEY);
    await useAuthStore.getState().checkStatus(true);
    expect(useAuthStore.getState().accessToken).toBe("restored");
});

it("uses the existing restoration flow if localStorage is unavailable", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new DOMException("Storage blocked", "SecurityError");
    });
    await useAuthStore.getState().checkStatus();
    expect(authRefresh).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().isLoggedIn).toBe(true);
});

it("does not restore an in-flight refresh after another tab logs out", async () => {
    let resolve!: (response: unknown) => void;
    authRefresh.mockReturnValue(new Promise((release) => (resolve = release)));
    const restoration = useAuthStore.getState().checkStatus();
    localStorage.setItem(AUTH_LOGGED_OUT_KEY, "true");
    await useAuthStore.getState().checkStatus(true);
    resolve({ data: { success: true, data: { accessToken: "stale" } } });
    await restoration;
    expect(useAuthStore.getState()).toMatchObject({ accessToken: null, isLoggedIn: false });
});
