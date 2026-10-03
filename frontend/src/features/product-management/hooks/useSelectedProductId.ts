import { useSyncExternalStore } from "react";

function subscribeToLocation(onStoreChange: () => void) {
    if (typeof window === "undefined") {
        return () => undefined;
    }

    window.addEventListener("popstate", onStoreChange);
    return () => window.removeEventListener("popstate", onStoreChange);
}

function getSelectedItemIdSnapshot() {
    if (typeof window === "undefined") {
        return null;
    }

    return new URLSearchParams(window.location.search).get("selected");
}

export function useSelectedProductId() {
    return useSyncExternalStore(subscribeToLocation, getSelectedItemIdSnapshot, () => null);
}

export function persistSelectedProductId(itemId: string) {
    const params = new URLSearchParams(window.location.search);
    params.set("selected", itemId);
    persistSelectionParams(params);
}

export function clearSelectedProductId() {
    const params = new URLSearchParams(window.location.search);
    params.delete("selected");
    persistSelectionParams(params);
}

function persistSelectionParams(params: URLSearchParams) {
    const query = params.toString();
    window.history.replaceState(
        window.history.state,
        "",
        `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`,
    );
    window.dispatchEvent(new PopStateEvent("popstate"));
}
