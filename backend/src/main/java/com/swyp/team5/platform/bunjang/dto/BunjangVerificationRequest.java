package com.swyp.team5.platform.bunjang.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record BunjangVerificationRequest(
        @NotBlank @Size(max = 30) String name,
        @NotBlank @Pattern(regexp = "^\\d{6}$", message = "생년월일은 YYMMDD 형식의 숫자 6자리로 입력해야 합니다.") String birthDate,
        @NotBlank @Pattern(regexp = "^\\d$", message = "주민등록번호 뒷자리 첫 숫자 1자리를 입력해야 합니다.") String genderDigit,
        @NotNull BunjangCarrier carrier,
        @NotBlank @Pattern(regexp = "^01[016789]\\d{7,8}$", message = "휴대폰 번호 형식이 올바르지 않습니다.") String phone,
        @NotNull(message = TERMS_REQUIRED) @AssertTrue(message = TERMS_REQUIRED) Boolean agreedToBunjangTerms) {

    private static final String TERMS_REQUIRED = "번개장터 필수 약관에 동의해야 합니다.";

    @Override
    public String toString() {
        return "BunjangVerificationRequest[carrier=" + carrier + ", agreedToBunjangTerms=" + agreedToBunjangTerms + "]";
    }
}
