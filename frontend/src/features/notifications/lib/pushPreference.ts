// 푸시(사이트 안 토스트) 알림 수신 여부. 기기·브라우저마다 다를 수 있어 서버가 아니라 브라우저에 저장한다.
import { useSyncExternalStore } from "react";

const storageKey = "jigeumini:push-notifications";
const changeEvent = "jigeumini:push-notifications-change";
const defaultEnabled = true;

// 브라우저 저장소를 쓸 수 없는 환경(사생활 보호 모드 등)에서는 이 값으로 이번 방문 동안만 반영한다
let memoryValue: boolean | null = null;

function read(): boolean {
    try {
        const value = window.localStorage.getItem(storageKey);
        return value === null ? (memoryValue ?? defaultEnabled) : value === "true";
    } catch {
        return memoryValue ?? defaultEnabled;
    }
}

export function setPushEnabled(enabled: boolean) {
    memoryValue = enabled;
    try {
        window.localStorage.setItem(storageKey, String(enabled));
    } catch {
        // memoryValue로 대신한다
    }
    window.dispatchEvent(new CustomEvent(changeEvent, { detail: enabled }));
}

function subscribe(onChange: () => void) {
    window.addEventListener(changeEvent, onChange);
    window.addEventListener("storage", onChange);
    return () => {
        window.removeEventListener(changeEvent, onChange);
        window.removeEventListener("storage", onChange);
    };
}

export function usePushEnabled() {
    return useSyncExternalStore(subscribe, read, () => defaultEnabled);
}
