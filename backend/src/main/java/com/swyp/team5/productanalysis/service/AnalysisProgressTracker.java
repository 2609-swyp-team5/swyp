package com.swyp.team5.productanalysis.service;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.Consumer;
import java.util.stream.Collectors;

import lombok.extern.slf4j.Slf4j;

import org.springframework.stereotype.Component;

import com.swyp.team5.productanalysis.dto.AnalysisStep;
import com.swyp.team5.productanalysis.dto.AnalysisStepEvent;

/**
 * 시세 분석이 대기 중이거나 진행 중인 대상(Item ID)을 기록한다. 관심상품 목록이 분석 결과가 아직 없는 대상을 "분석대기"가 아닌
 * "관찰중"으로 보여 주기 위함이다. 같은 대상이 여러 번 시작될 수 있어(관심 등록 대기열 + 실제 분석) 횟수로 세고, 모두 끝나야
 * 빠진다. 분석 단계({@link AnalysisStep})도 대상별 마지막 단계만 기록하고, 단계가 바뀌면 {@link #onStep}으로 등록한 함수를 부른다(분석
 * 결과 구독 스트림이 진행 상황을 보내기 위함).
 *
 * <p>서버 메모리에만 두므로 재기동하면 비고(진행 중이던 분석도 함께 사라짐), 서버를 여러 대 띄우면 분석을 실행한 서버만 안다.
 */
@Slf4j
@Component
public class AnalysisProgressTracker {

    private final Map<Long, Integer> inProgress = new ConcurrentHashMap<>();
    private final Map<Long, AnalysisStepEvent> currentSteps = new ConcurrentHashMap<>();
    private final List<Consumer<Long>> finishListeners = new CopyOnWriteArrayList<>();
    private final List<StepListener> stepListeners = new CopyOnWriteArrayList<>();

    /** 분석 단계가 바뀔 때 부를 함수(분석 스레드에서 호출된다). */
    @FunctionalInterface
    public interface StepListener {
        void onStep(Long itemId, AnalysisStepEvent event);
    }

    /** 분석 시작(또는 대기열 등록)을 기록한다. 반드시 {@link #finish}와 짝을 이뤄야 한다. */
    public void start(Long itemId) {
        inProgress.merge(itemId, 1, Integer::sum);
    }

    /**
     * 분석 종료(성공·건너뜀·실패 모두)를 기록한다. 대상의 기록이 모두 끝나 빠지면 {@link #onFinished}로 등록한 함수를 부른다(분석
     * 스레드에서 호출되며, 함수가 실패해도 분석 흐름에는 영향을 주지 않는다).
     */
    public void finish(Long itemId) {
        boolean[] removed = {false};
        inProgress.computeIfPresent(itemId, (id, count) -> {
            if (count > 1) {
                return count - 1;
            }
            removed[0] = true;
            return null;
        });
        if (removed[0]) {
            currentSteps.remove(itemId);
            notifyFinished(itemId);
        }
    }

    /** 대상의 분석이 모두 끝났을 때(대기 중·진행 중 기록이 모두 빠졌을 때) 부를 함수를 등록한다. */
    public void onFinished(Consumer<Long> listener) {
        finishListeners.add(listener);
    }

    /** 분석 단계가 바뀔 때 부를 함수를 등록한다. */
    public void onStep(StepListener listener) {
        stepListeners.add(listener);
    }

    /**
     * 분석 단계 시작을 기록하고 알린다. 진행 중으로 기록된 대상만 남긴다(기록 없이 바로 분석하는 경우 단계가 쌓이지 않도록).
     */
    public void stepStarted(Long itemId, AnalysisStep step) {
        changeStep(itemId, AnalysisStepEvent.of(step, AnalysisStepEvent.START));
    }

    /** 분석 단계 완료를 기록하고 알린다. */
    public void stepDone(Long itemId, AnalysisStep step) {
        changeStep(itemId, AnalysisStepEvent.of(step, AnalysisStepEvent.DONE));
    }

    /** 대상의 마지막 분석 단계(분석 중이 아니거나 아직 첫 단계 전이면 빈 값). */
    public Optional<AnalysisStepEvent> currentStep(Long itemId) {
        return Optional.ofNullable(currentSteps.get(itemId));
    }

    private void changeStep(Long itemId, AnalysisStepEvent event) {
        if (!inProgress.containsKey(itemId)) {
            return;
        }
        currentSteps.put(itemId, event);
        for (StepListener listener : stepListeners) {
            try {
                listener.onStep(itemId, event);
            } catch (RuntimeException e) {
                log.warn("분석 단계 알림 처리 중 오류가 발생했습니다: itemId={}, step={}", itemId, event.step(), e);
            }
        }
    }

    private void notifyFinished(Long itemId) {
        for (Consumer<Long> listener : finishListeners) {
            try {
                listener.accept(itemId);
            } catch (RuntimeException e) {
                log.warn("분석 종료 알림 처리 중 오류가 발생했습니다: itemId={}", itemId, e);
            }
        }
    }

    /** 대상의 분석이 대기 중이거나 진행 중인지. */
    public boolean isInProgress(Long itemId) {
        return inProgress.containsKey(itemId);
    }

    /** 주어진 대상 중 분석이 대기 중이거나 진행 중인 것의 ID. */
    public Set<Long> inProgressAmong(Collection<Long> itemIds) {
        return itemIds.stream().filter(inProgress::containsKey).collect(Collectors.toSet());
    }
}
