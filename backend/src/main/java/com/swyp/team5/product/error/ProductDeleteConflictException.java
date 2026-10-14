package com.swyp.team5.product.error;

import com.swyp.team5.common.error.LogDetail;

/**
 * 상품을 지우는 사이 이 상품을 참조하는 기록(시세 분석·알림·관심 등)이 새로 생겨 삭제가 FK 위반으로 실패한 경우. 삭제 전에 참조 기록을 모두
 * 지우므로 동시에 다른 작업이 기록을 만든 경합에서만 생기며, 다시 시도하면 지울 수 있다.
 */
public class ProductDeleteConflictException extends RuntimeException implements LogDetail {

    private final String logDetail;

    public ProductDeleteConflictException(Long productId, Throwable cause) {
        super("상품에 연결된 기록이 방금 생겨 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.", cause);
        this.logDetail = "productId=" + productId;
    }

    @Override
    public String logDetail() {
        return logDetail;
    }
}
