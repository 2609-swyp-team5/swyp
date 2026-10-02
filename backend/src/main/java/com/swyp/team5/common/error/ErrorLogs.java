package com.swyp.team5.common.error;

/** 예외를 로그에 남길 때 사용자용 메시지에 로그 전용 상세 정보({@link LogDetail})를 덧붙인다. */
public final class ErrorLogs {

    private ErrorLogs() {}

    public static String describe(Throwable e) {
        if (e instanceof LogDetail detailed && detailed.logDetail() != null) {
            return e.getMessage() + " [" + detailed.logDetail() + "]";
        }
        return e.getMessage();
    }
}
