package com.swyp.team5.common.error;

import static org.assertj.core.api.Assertions.assertThat;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import com.swyp.team5.common.common.ApiResponse;
import org.junit.jupiter.api.Test;

// 업로드 용량 초과는 500 "일시적인 오류" 대신 413과 줄이는 방법 안내로 응답한다(멀티파트 한도는 실제 서블릿 컨테이너에서만 걸려 핸들러를 직접 확인)
class MaxUploadSizeHandlerTest {

    @Test
    void respondsPayloadTooLargeWithGuidance() {
        ResponseEntity<ApiResponse<Void>> response = new GlobalExceptionHandler()
                .handleMaxUploadSizeExceeded(new MaxUploadSizeExceededException(10_485_760L));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.PAYLOAD_TOO_LARGE);
        assertThat(response.getBody().success()).isFalse();
        assertThat(response.getBody().error().code()).isEqualTo("PAYLOAD_TOO_LARGE");
        assertThat(response.getBody().message()).isEqualTo("사진 용량이 너무 커요. 사진 수를 줄이거나 더 작은 사진으로 다시 올려 주세요.");
    }
}
