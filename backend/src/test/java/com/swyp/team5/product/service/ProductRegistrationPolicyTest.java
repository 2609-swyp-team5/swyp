package com.swyp.team5.product.service;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;

import com.swyp.team5.product.entity.DeliveryType;
import com.swyp.team5.product.entity.IncludedStatus;
import com.swyp.team5.product.entity.TradeMethod;
import org.junit.jupiter.api.Test;

class ProductRegistrationPolicyTest {

    @Test
    void acceptsRegistrationPolicyBoundaries() {
        assertThatCode(() -> ProductRegistrationPolicy.validateProductFields(
                        "상품",
                        "상품 설명은 열 글자 이상입니다.",
                        ProductRegistrationPolicy.MIN_PRICE,
                        List.of("태그1", "태그2", "태그3", "태그4", "태그5"),
                        IncludedStatus.NONE))
                .doesNotThrowAnyException();
        assertThatCode(() -> ProductRegistrationPolicy.validatePrice(ProductRegistrationPolicy.MAX_PRICE))
                .doesNotThrowAnyException();
        assertThatCode(() -> ProductRegistrationPolicy.validateTrade(
                        TradeMethod.DELIVERY, DeliveryType.PREPAID, ProductRegistrationPolicy.MIN_DELIVERY_FEE, null))
                .doesNotThrowAnyException();
    }

    @Test
    void rejectsValuesOutsideRegistrationPolicy() {
        assertThatThrownBy(() -> ProductRegistrationPolicy.validatePrice(ProductRegistrationPolicy.MIN_PRICE - 1))
                .hasMessage("희망 가격은 500원 이상 1억 원 이하로 입력해 주세요.");
        assertThatThrownBy(() -> ProductRegistrationPolicy.validateProductFields(
                        "상품",
                        "상품 설명은 열 글자 이상입니다.",
                        ProductRegistrationPolicy.MIN_PRICE,
                        List.of("1", "2", "3", "4", "5", "6"),
                        IncludedStatus.ALL))
                .hasMessage("태그는 최대 5개까지 입력해 주세요.");
        assertThatThrownBy(() ->
                        ProductRegistrationPolicy.validateTrade(TradeMethod.DELIVERY, DeliveryType.PREPAID, null, null))
                .hasMessage("배송비를 입력해 주세요.");
    }
}
