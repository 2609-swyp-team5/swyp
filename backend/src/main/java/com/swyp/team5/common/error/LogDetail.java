package com.swyp.team5.common.error;

/**
 * 사용자에게 보여 줄 메시지와 별도로 로그에만 남길 상세 정보(ID·외부 응답 등)를 가진 예외.
 *
 * <p>예외 메시지({@code getMessage()})는 API 응답 {@code message}로 그대로 노출되므로 내부 식별자·개인정보를 넣지 않고,
 * 원인 추적에 필요한 값은 {@link #logDetail()}로 분리해 로그에서만 쓴다({@link ErrorLogs#describe}).
 */
public interface LogDetail {

    /** 로그용 상세 정보. 없으면 null. */
    String logDetail();
}
