package com.swyp.team5.productanalysis.service;

import java.util.Collection;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

/**
 * 시세 분석이 대기 중이거나 진행 중인 대상(Item ID)을 기록한다. 관심상품 목록이 분석 결과가 아직 없는 대상을 "분석대기"가 아닌
 * "관찰중"으로 보여 주기 위함이다. 같은 대상이 여러 번 시작될 수 있어(관심 등록 대기열 + 실제 분석) 횟수로 세고, 모두 끝나야
 * 빠진다.
 *
 * <p>서버 메모리에만 두므로 재기동하면 비고(진행 중이던 분석도 함께 사라짐), 서버를 여러 대 띄우면 분석을 실행한 서버만 안다.
 */
@Component
public class AnalysisProgressTracker {

    private final Map<Long, Integer> inProgress = new ConcurrentHashMap<>();

    /** 분석 시작(또는 대기열 등록)을 기록한다. 반드시 {@link #finish}와 짝을 이뤄야 한다. */
    public void start(Long itemId) {
        inProgress.merge(itemId, 1, Integer::sum);
    }

    /** 분석 종료(성공·건너뜀·실패 모두)를 기록한다. */
    public void finish(Long itemId) {
        inProgress.computeIfPresent(itemId, (id, count) -> count > 1 ? count - 1 : null);
    }

    /** 주어진 대상 중 분석이 대기 중이거나 진행 중인 것의 ID. */
    public Set<Long> inProgressAmong(Collection<Long> itemIds) {
        return itemIds.stream().filter(inProgress::containsKey).collect(Collectors.toSet());
    }
}
