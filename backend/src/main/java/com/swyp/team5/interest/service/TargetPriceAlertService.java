package com.swyp.team5.interest.service;

import java.time.LocalDateTime;
import java.util.List;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.swyp.team5.interest.entity.Interest;
import com.swyp.team5.interest.repository.InterestRepository;
import com.swyp.team5.notification.service.NotificationService;
import com.swyp.team5.product.entity.ProductStatus;

/**
 * 관심상품 목표가 도달 알림. 대상의 현재 가격(우리 상품은 등록가, 외부 매물은 수집가)이 목표가 이하가 되면 관심 등록한
 * 회원에게 알림을 1번 보내고 {@code notified_at}에 기록한다. 가격이 다시 목표가보다 오르면 기록을 지워 다음에 내려올 때
 * 다시 알린다(목표가를 바꿔도 여전히 도달 상태면 다시 알리지 않고, 아직 도달 전인 목표가로 바꾸면 지움). 판매 완료된 우리
 * 상품·판매중이 아닌 외부 매물은 확인하지 않는다.
 *
 * <p>확인 시점: 목표가 설정 직후, 우리 상품 수정 직후, 주기 배치({@code TargetPriceAlertScheduler} — 외부 매물 가격 반영).
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class TargetPriceAlertService {

    private static final String SELLING_STATUS = "SELLING";

    private final InterestRepository interestRepository;
    private final NotificationService notificationService;

    /** 목표가가 설정된 관심상품 전체를 확인한다(배치 진입점). @return 보낸 알림 수 */
    public int checkAll() {
        int sent = check(interestRepository.findAllWithTargetPrice());
        log.info("목표가 도달 알림 {}건 생성", sent);
        return sent;
    }

    /** 우리 상품 1건을 관심 등록한 회원들의 목표가를 확인한다(상품 수정 직후). @return 보낸 알림 수 */
    public int checkProduct(Long productId) {
        return check(interestRepository.findWithTargetPriceByProductId(productId));
    }

    private int check(List<Interest> interests) {
        return (int) interests.stream().filter(this::check).count();
    }

    /**
     * 관심상품 1건의 목표가 도달 여부를 확인하고 필요하면 알림을 만든다.
     *
     * @return 이번에 알림을 만들었으면 {@code true}
     */
    public boolean check(Interest interest) {
        Long targetPrice = interest.getTargetPrice();
        Long currentPrice = interest.currentPrice();
        if (targetPrice == null || currentPrice == null || !isAvailable(interest)) {
            return false;
        }
        if (currentPrice > targetPrice) {
            interest.resetTargetPriceNotified();
            return false;
        }
        if (interest.getNotifiedAt() != null) {
            return false;
        }
        // 회원이 목표가 알림을 꺼 둬서 안 보냈으면 보낸 것으로 기록하지 않는다(다시 켜면 아직 목표가 이하일 때 다음 확인에서 보냄)
        if (!notificationService.notifyTargetPriceReached(interest, currentPrice)) {
            return false;
        }
        interest.markTargetPriceNotified(LocalDateTime.now());
        return true;
    }

    private static boolean isAvailable(Interest interest) {
        if (interest.getProduct() != null) {
            return interest.getProduct().getStatus() != ProductStatus.SOLD_OUT;
        }
        return SELLING_STATUS.equals(interest.getListing().getStatus());
    }
}
