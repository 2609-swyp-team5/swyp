// 관심 등록처럼 곧 분석 결과 알림이 올 만한 동작 뒤에는 잠시 토스트 조회 간격을 줄여, 분석이 끝나는 대로 바로 보여 준다.
const fastPollingWindowMs = 2 * 60 * 1000;
const startEvent = "jigeumini:fast-notification-polling";

let fastUntil = 0;

/** 지금부터 잠시(2분) 토스트 조회를 빠르게 한다. 여러 번 부르면 마지막 호출부터 다시 2분. */
export function startFastNotificationPolling() {
    fastUntil = Date.now() + fastPollingWindowMs;
    window.dispatchEvent(new Event(startEvent));
}

export function isFastNotificationPolling(now = Date.now()) {
    return now < fastUntil;
}

/** 빠른 조회가 시작될 때 불린다. 반환값으로 구독을 해제한다. */
export function onFastNotificationPollingStart(listener: () => void) {
    window.addEventListener(startEvent, listener);
    return () => window.removeEventListener(startEvent, listener);
}
