package com.swyp.team5.productanalysis.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.OptionalDouble;
import java.util.TreeMap;
import java.util.stream.Collectors;

/**
 * 과거 시세 분석 스냅샷의 평균가 기록으로 만든 가격 추이. 시세 분석 AI 입력(추세 판단 근거)과 감가 예측(관측 추세)에
 * 함께 쓴다.
 *
 * <p>같은 날 여러 번 분석된 평균가는 하루 평균 1개 점으로 합치고, 월 변화율은 일별 점의 로그 가격을 경과 일수로
 * 선형 회귀한 기울기로 구한다(가격이 매달 같은 비율로 변한다고 볼 때의 월 변화율).
 *
 * @param dailyAverages 날짜 오름차순 일별 평균가
 */
record PriceTrend(List<DailyPrice> dailyAverages) {

    /** 추세 계산에 필요한 최소 관측 기간(일). 이보다 짧으면 월 변화율을 내지 않는다(하루 이틀 변동을 월 단위로 늘리면 과장됨). */
    static final int MIN_TREND_DAYS = 7;

    private static final double DAYS_PER_MONTH = 30.0;

    /** AI 프롬프트에 넣을 최근 일별 점 최대 개수. */
    private static final int PROMPT_POINTS = 14;

    record DailyPrice(LocalDate date, long averagePrice) {}

    record Snapshot(LocalDateTime analyzedAt, long averagePrice) {}

    /** @param history 과거 스냅샷(순서 무관) */
    static PriceTrend of(List<Snapshot> history) {
        Map<LocalDate, Double> byDate = history.stream()
                .collect(Collectors.groupingBy(
                        snapshot -> snapshot.analyzedAt().toLocalDate(),
                        TreeMap::new,
                        Collectors.averagingLong(Snapshot::averagePrice)));
        return new PriceTrend(byDate.entrySet().stream()
                .map(entry -> new DailyPrice(entry.getKey(), Math.round(entry.getValue())))
                .toList());
    }

    /** 이번 분석 결과({@code analyzedAt}, {@code averagePrice})를 더한 추이. */
    PriceTrend plus(LocalDateTime analyzedAt, long averagePrice) {
        List<Snapshot> all = new ArrayList<>();
        dailyAverages.forEach(point -> all.add(new Snapshot(point.date().atStartOfDay(), point.averagePrice())));
        all.add(new Snapshot(analyzedAt, averagePrice));
        return of(all);
    }

    /** 관측 기간(첫 점 ~ 마지막 점, 일). */
    long observedDays() {
        if (dailyAverages.size() < 2) {
            return 0;
        }
        return ChronoUnit.DAYS.between(
                dailyAverages.getFirst().date(), dailyAverages.getLast().date());
    }

    /**
     * 로그-선형 회귀로 구한 월 변화율(예: -0.03 = 매달 3% 하락). 관측 기간이 {@link #MIN_TREND_DAYS}보다 짧으면 빈 값.
     */
    OptionalDouble monthlyRate() {
        if (observedDays() < MIN_TREND_DAYS) {
            return OptionalDouble.empty();
        }
        LocalDate origin = dailyAverages.getFirst().date();
        int n = dailyAverages.size();
        double sumX = 0, sumY = 0, sumXx = 0, sumXy = 0;
        for (DailyPrice point : dailyAverages) {
            double x = ChronoUnit.DAYS.between(origin, point.date());
            double y = Math.log(Math.max(point.averagePrice(), 1));
            sumX += x;
            sumY += y;
            sumXx += x * x;
            sumXy += x * y;
        }
        double denominator = n * sumXx - sumX * sumX;
        if (denominator == 0) {
            return OptionalDouble.empty();
        }
        double slopePerDay = (n * sumXy - sumX * sumY) / denominator;
        return OptionalDouble.of(Math.exp(slopePerDay * DAYS_PER_MONTH) - 1);
    }

    /** 마지막 점의 평균가가 {@code days}일 전(그 이전 가장 가까운 점) 대비 몇 % 변했는지. 해당 시점 기록이 없으면 빈 값. */
    OptionalDouble changeSince(int days) {
        if (dailyAverages.size() < 2) {
            return OptionalDouble.empty();
        }
        DailyPrice latest = dailyAverages.getLast();
        LocalDate target = latest.date().minusDays(days);
        return dailyAverages.stream()
                .filter(point -> !point.date().isAfter(target))
                .reduce((first, second) -> second)
                .filter(point -> point.averagePrice() > 0)
                .map(point -> OptionalDouble.of(
                        (double) (latest.averagePrice() - point.averagePrice()) / point.averagePrice()))
                .orElse(OptionalDouble.empty());
    }

    /** 시세 분석 AI 프롬프트에 넣을 추이 설명. */
    String toPromptText() {
        if (dailyAverages.isEmpty()) {
            return "이전 분석 기록 없음(첫 분석 — 추세 판단 불가, 현재 후보 매물 가격만으로 판단)";
        }
        StringBuilder text = new StringBuilder();
        dailyAverages.stream()
                .skip(Math.max(0, dailyAverages.size() - PROMPT_POINTS))
                .forEach(point -> text.append("%s: %,d원\n".formatted(point.date(), point.averagePrice())));
        text.append("마지막 기록의 7일 전 대비: ").append(percent(changeSince(7))).append('\n');
        text.append("마지막 기록의 30일 전 대비: ").append(percent(changeSince(30))).append('\n');
        text.append("추세(월 변화율): ")
                .append(
                        monthlyRate().isPresent()
                                ? percent(monthlyRate())
                                : "관측 기간 %d일 — %d일 미만이라 판단 보류".formatted(observedDays(), MIN_TREND_DAYS));
        return text.toString();
    }

    private static String percent(OptionalDouble rate) {
        return rate.isPresent() ? "%+.1f%%".formatted(rate.getAsDouble() * 100) : "기록 없음";
    }
}
