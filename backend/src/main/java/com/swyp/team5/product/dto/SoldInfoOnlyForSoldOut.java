package com.swyp.team5.product.dto;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import jakarta.validation.Constraint;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import jakarta.validation.Payload;

import com.swyp.team5.product.entity.ProductStatus;

/**
 * 최종 판매 가격·플랫폼은 판매 완료(SOLD_OUT)로 바꿀 때만 보낼 수 있다. 오류는 보낸 필드({@code soldPrice}/{@code soldPlatform})
 * 이름으로 내려가 프론트가 해당 입력칸에 바로 표시할 수 있다.
 */
@Documented
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = SoldInfoOnlyForSoldOut.Validator.class)
public @interface SoldInfoOnlyForSoldOut {

    String message() default "판매 완료(SOLD_OUT)로 바꿀 때만 입력할 수 있어요.";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};

    class Validator implements ConstraintValidator<SoldInfoOnlyForSoldOut, ProductStatusUpdateRequest> {

        @Override
        public boolean isValid(ProductStatusUpdateRequest request, ConstraintValidatorContext context) {
            if (request == null || request.status() == null || request.status() == ProductStatus.SOLD_OUT) {
                return true;
            }
            boolean hasSoldPrice = request.soldPrice() != null;
            boolean hasSoldPlatform =
                    request.soldPlatform() != null && !request.soldPlatform().isBlank();
            if (!hasSoldPrice && !hasSoldPlatform) {
                return true;
            }
            context.disableDefaultConstraintViolation();
            String message = context.getDefaultConstraintMessageTemplate();
            if (hasSoldPrice) {
                context.buildConstraintViolationWithTemplate(message)
                        .addPropertyNode("soldPrice")
                        .addConstraintViolation();
            }
            if (hasSoldPlatform) {
                context.buildConstraintViolationWithTemplate(message)
                        .addPropertyNode("soldPlatform")
                        .addConstraintViolation();
            }
            return false;
        }
    }
}
