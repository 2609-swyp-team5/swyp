package com.swyp.team5.productanalysis.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.LongSummaryStatistics;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.OptionalDouble;
import java.util.Set;
import java.util.TreeMap;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import java.util.stream.Stream;

import lombok.extern.slf4j.Slf4j;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.swyp.team5.category.repository.CategoryRepository;
import com.swyp.team5.common.ai.AiChatExecutor;
import com.swyp.team5.crawl.service.ListingSearchService;
import com.swyp.team5.interest.repository.InterestRepository;
import com.swyp.team5.item.entity.AnalysisSkipReason;
import com.swyp.team5.item.entity.Item;
import com.swyp.team5.item.repository.ItemRepository;
import com.swyp.team5.notification.service.NotificationService;
import com.swyp.team5.platform.entity.PlatformListing;
import com.swyp.team5.platform.repository.PlatformListingRepository;
import com.swyp.team5.product.entity.DefectStatus;
import com.swyp.team5.product.entity.Product;
import com.swyp.team5.product.entity.ProductStatus;
import com.swyp.team5.product.error.ProductNotFoundException;
import com.swyp.team5.product.repository.ProductRepository;
import com.swyp.team5.product.service.ProductTargetPriceService;
import com.swyp.team5.productanalysis.config.ProductAnalysisProperties;
import com.swyp.team5.productanalysis.dto.AnalysisPerspective;
import com.swyp.team5.productanalysis.dto.AnalysisStatus;
import com.swyp.team5.productanalysis.dto.AnalysisStep;
import com.swyp.team5.productanalysis.dto.CompetitionLevel;
import com.swyp.team5.productanalysis.dto.CompetitionSortType;
import com.swyp.team5.productanalysis.dto.MarketAnalysisResult;
import com.swyp.team5.productanalysis.dto.PriceDistributionResponse;
import com.swyp.team5.productanalysis.dto.PriceReasonResult;
import com.swyp.team5.productanalysis.dto.PriceReasonUpdate;
import com.swyp.team5.productanalysis.dto.PriceTrendResponse;
import com.swyp.team5.productanalysis.dto.ProductAnalysisResponse;
import com.swyp.team5.productanalysis.dto.ProductCompetitionResponse;
import com.swyp.team5.productanalysis.dto.ProductForecastResponse;
import com.swyp.team5.productanalysis.entity.AnalysisConfidence;
import com.swyp.team5.productanalysis.entity.AnalysisRecommendation;
import com.swyp.team5.productanalysis.entity.ComparisonBasis;
import com.swyp.team5.productanalysis.entity.ForecastPeriod;
import com.swyp.team5.productanalysis.entity.PriceForecast;
import com.swyp.team5.productanalysis.entity.ProductAnalysis;
import com.swyp.team5.productanalysis.repository.PriceForecastRepository;
import com.swyp.team5.productanalysis.repository.ProductAnalysisRepository;
import org.hibernate.Hibernate;

/**
 * 등록된 상품(또는 관심 등록된 외부 매물)과 같은 카테고리에서 수집된 매물({@link PlatformListing}) 중 <b>같은 물건인
 * 매물만</b> 근거로 시세를 분석해 {@link ProductAnalysis} 스냅샷을 생성한다. 유사 매물 선별은 {@link SimilarListingFilter}
 * (키워드 후보 선별) + AI(같은 물건 번호 선택) 2단계이고, 통계(최저/평균/최고가)는 선별된 매물에서 가격 이상치를 뺀 뒤
 * 직접 계산한다. 추천(SELL/HOLD/BUY/WAIT)/적정가/판단 근거는 AI(Gemini, 실패 시 OpenAI GPT)에게 위임한다.
 */
@Slf4j
@Service
public class ProductAnalysisService {

    private static final String SELLING_STATUS = "SELLING";
    /** 매물 재확인 배치가 기록하는 판매 완료 상태(번개장터 saleStatus·중고나라 상태 변환 값). */
    private static final String SOLD_OUT_STATUS = "SOLD_OUT";

    // 판매자에게 시세 변동 알림을 보내는 상품 상태(임시저장은 아직 판매 전이라 제외)
    private static final List<ProductStatus> PRICE_CHANGE_SELLER_TARGETS =
            List.of(ProductStatus.ON_SALE, ProductStatus.RESERVED);

    /** 추세 계산에 쓸 이전 분석 기록 기간(개월). 프롬프트의 1/3/6개월 전 대비 비교 중 가장 긴 기간과 같다. */
    private static final int TREND_MONTHS = 6;

    /**
     * 같은 카테고리 상품명 검색에서 새로 찾은 매물이 이 수보다 적으면 카테고리 없이 한 번 더 검색한다(잘못된 카테고리에 등록된
     * 상품 대비).
     */
    private static final int OUTSIDE_CATEGORY_SEARCH_THRESHOLD = 10;

    /** 대기 기간(개월)을 일로 바꿀 때 쓰는 한 달 일수. */
    private static final int DAYS_PER_MONTH = 30;

    /** 가격 분포 구간 수. */
    private static final int PRICE_DISTRIBUTION_BUCKETS = 5;

    private static final String SYSTEM_PROMPT =
            """
            너는 중고거래 플랫폼의 시세 분석 AI야. 등록된 상품 1건과, 같은 카테고리에서 최근 수집된 실제
            판매 매물 후보 목록(번호/제목/가격)을 줄게.

            먼저 후보 중 이 상품과 "같은 물건"인 매물의 번호를 모두 골라 similarListingNumbers에 담아.
            같은 물건이란 종류와 모델(세대/시리즈/용량 등 가격을 좌우하는 사양)이 같은 것이야. 단어가 겹쳐도
            액세서리·부품·다른 모델·다른 종류의 물건·묶음 판매는 고르지 마. 같은 물건이 없으면 빈 배열로 둬.
            그다음, 같은 물건은 아니지만 같은 종류·시리즈라 시세 참고가 되는 매물(세대·용량 등 일부 사양이 다르거나
            제목만으로는 사양을 확인할 수 없는 것)의 번호를 relatedListingNumbers에 담아. 이미 같은 물건으로 고른 번호와
            액세서리·부품·다른 종류의 물건·묶음 판매는 넣지 마. 없으면 빈 배열로 둬.
            추천과 적정가는 네가 고른 같은 물건 매물의 가격만 근거로 판단해. 같은 물건이 2건 미만이면 비슷한 물건 매물까지
            참고하고, 근거 문장에 "비슷한 상품 시세 기준"임을 밝혀.

            [이전 분석 추이]는 지난 분석들에서 같은 물건 매물의 평균가가 어떻게 변해 왔는지야. "하락/상승 추세"는
            반드시 이 기록으로만 판단하고, 기록이 없거나 판단 보류면 추세를 지어내지 말고 현재 가격 수준만으로 판단해.

            등록된 상품은 판매 목적으로 등록된 매물이야. 두 관점을 따로 판단해(기준 시세 = 네가 고른 같은 물건 매물의 평균가,
            추세 = [이전 분석 추이]의 "추세(월 변화율)").
            1) recommendation(판매자 관점, SELL/HOLD만):
               - HOLD: 추세가 월 +3% 이상 오르는 중일 때만. 근거에 "조금 기다리면 더 비싸게 팔 수 있다"는 점을 밝혀.
               - SELL: 그 밖의 모든 경우(하락·보합·추세 판단 보류). 중고는 시간이 지날수록 값이 떨어지기 때문이야.
                 등록가가 기준 시세보다 5% 이상 높으면 적정가로 낮춰 파는 걸 권해.
            2) buyerRecommendation(이 상품을 관심 등록한 구매자 관점, BUY/WAIT만):
               - 등록가가 기준 시세보다 5% 이상 싸면 BUY, 5% 이상 비싸면 WAIT.
               - 그 사이면 추세가 월 +3% 이상 오르는 중이면 BUY(오르기 전에 구매), 월 -3% 이하로 내리는 중이면 WAIT
                 (기다리면 더 싸짐), 뚜렷한 추세가 없으면 적정 가격이라 BUY.
            description과 buyerDescription에는 각 추천의 근거를 1~2문장으로 써.
            """;

    private static final String USER_PROMPT_TEMPLATE =
            """
            [분석 대상 상품]
            제목: %s
            브랜드: %s
            등록가: %d원
            상태 등급: %s / 결함 여부: %s

            [같은 카테고리 매물 후보 %d건(번호. 제목: 가격)]
            %s

            [이전 분석 추이(같은 물건 평균가, 최근 6개월 월별)]
            %s
            """;

    private static final String PRICE_REASON_SYSTEM_PROMPT =
            """
            너는 중고거래 플랫폼의 시세 분석 AI야. 판매자가 상품의 등록가를 바꿨어. 이미 끝난 시세 분석 결과(비교 매물 시세·추이)와
            이미 정해진 추천을 줄 테니, 새 등록가 기준으로 추천의 근거 문장만 다시 써 줘. 추천은 바꾸지 마.
            - description: 판매자 관점 추천(SELL/HOLD)의 근거 1~2문장. 새 등록가와 기준 시세(평균가)를 비교해 말하고,
              SELL이면 중고는 시간이 지날수록 값이 떨어진다는 점, 등록가가 기준 시세보다 5% 이상 높으면 적정가로 낮추길 권해.
              HOLD면 시세가 오르는 중이라 조금 기다리면 더 비싸게 팔 수 있다는 점을 밝혀.
            - buyerDescription: 구매자 관점 추천(BUY/WAIT)의 근거 1~2문장. 새 등록가가 기준 시세보다 싼지·비싼지를 중심으로.
            추세는 반드시 [이전 분석 추이]로만 말하고, 기록이 없거나 판단 보류면 추세를 지어내지 마.
            비교 기준이 "비슷한 상품"이면 근거 문장에 "비슷한 상품 시세 기준"임을 밝혀. 금액은 원 단위로 쉼표를 넣어 써.
            화면에 그대로 보여 줄 문장이야. 추천 코드(SELL/HOLD/BUY/WAIT)나 "새 등록가"·"기준 시세" 같은 입력 항목 이름은 쓰지 말고
            "등록가", "평균 시세"처럼 자연스럽게 써. 판매자 근거는 판매자에게, 구매자 근거는 구매자에게 말하듯 "~해요" 체로 써.
            """;

    private static final String PRICE_REASON_USER_PROMPT_TEMPLATE =
            """
            [상품]
            제목: %s
            브랜드: %s
            새 등록가: %d원
            상태 등급: %s / 결함 여부: %s

            [시세 분석 결과]
            비교 기준: %s / 비교 매물 수: %s
            최저가 %d원 / 평균가(기준 시세) %d원 / 최고가 %d원 / 시세 기반 추천가 %d원

            [이전 분석 추이(같은 물건 평균가, 최근 6개월 월별)]
            %s

            [정해진 추천]
            판매자 관점: %s / 구매자 관점: %s
            """;

    private static final String LISTING_SYSTEM_PROMPT =
            """
            너는 중고거래 플랫폼의 시세 분석 AI야. 사용자가 구매를 고민하며 관심 등록한 외부 플랫폼 매물 1건과,
            같은 카테고리에서 최근 수집된 실제 판매 매물 후보 목록(번호/제목/가격)을 줄게.

            먼저 후보 중 이 매물과 "같은 물건"인 매물의 번호를 모두 골라 similarListingNumbers에 담아.
            같은 물건이란 종류와 모델(세대/시리즈/용량 등 가격을 좌우하는 사양)이 같은 것이야. 단어가 겹쳐도
            액세서리·부품·다른 모델·다른 종류의 물건·묶음 판매는 고르지 마. 같은 물건이 없으면 빈 배열로 둬.
            그다음, 같은 물건은 아니지만 같은 종류·시리즈라 시세 참고가 되는 매물(세대·용량 등 일부 사양이 다르거나
            제목만으로는 사양을 확인할 수 없는 것)의 번호를 relatedListingNumbers에 담아. 이미 같은 물건으로 고른 번호와
            액세서리·부품·다른 종류의 물건·묶음 판매는 넣지 마. 없으면 빈 배열로 둬.
            추천과 적정가는 네가 고른 같은 물건 매물의 가격만 근거로 판단해. 같은 물건이 2건 미만이면 비슷한 물건 매물까지
            참고하고, 근거 문장에 "비슷한 상품 시세 기준"임을 밝혀.

            [이전 분석 추이]는 지난 분석들에서 같은 물건 매물의 평균가가 어떻게 변해 왔는지야. "하락/상승 추세"는
            반드시 이 기록으로만 판단하고, 기록이 없거나 판단 보류면 추세를 지어내지 말고 현재 가격 수준만으로 판단해.

            구매자 관점(BUY/WAIT)에서만 판단해 recommendation에 담아(SELL/HOLD는 선택하지 마). 기준 시세 = 네가 고른 같은
            물건 매물의 평균가, 추세 = [이전 분석 추이]의 "추세(월 변화율)".
            - 판매가가 기준 시세보다 5% 이상 싸면 BUY, 5% 이상 비싸면 WAIT.
            - 그 사이면 추세가 월 +3% 이상 오르는 중이면 BUY(오르기 전에 구매), 월 -3% 이하로 내리는 중이면 WAIT
              (기다리면 더 싸짐), 뚜렷한 추세가 없으면 적정 가격이라 BUY.
            buyerRecommendation과 buyerDescription은 비워 둬(null).
            """;

    private static final String LISTING_USER_PROMPT_TEMPLATE =
            """
            [분석 대상 매물]
            제목: %s
            판매가: %d원

            [같은 카테고리 매물 후보 %d건(번호. 제목: 가격)]
            %s

            [이전 분석 추이(같은 물건 평균가, 최근 6개월 월별)]
            %s
            """;

    private final AiChatExecutor aiChatExecutor;
    private final ProductRepository productRepository;
    private final PlatformListingRepository platformListingRepository;
    private final ProductAnalysisRepository productAnalysisRepository;
    private final ProductAnalysisProperties properties;
    private final NotificationService notificationService;
    private final InterestRepository interestRepository;
    private final PriceForecastRepository priceForecastRepository;
    private final CategoryRepository categoryRepository;
    private final ItemRepository itemRepository;
    private final AnalysisProgressTracker progressTracker;
    private final ListingSearchService listingSearchService;
    private final ProductTargetPriceService productTargetPriceService;

    public ProductAnalysisService(
            AiChatExecutor aiChatExecutor,
            ProductRepository productRepository,
            PlatformListingRepository platformListingRepository,
            ProductAnalysisRepository productAnalysisRepository,
            ProductAnalysisProperties properties,
            NotificationService notificationService,
            InterestRepository interestRepository,
            PriceForecastRepository priceForecastRepository,
            CategoryRepository categoryRepository,
            ItemRepository itemRepository,
            AnalysisProgressTracker progressTracker,
            ListingSearchService listingSearchService,
            ProductTargetPriceService productTargetPriceService) {
        this.aiChatExecutor = aiChatExecutor;
        this.productRepository = productRepository;
        this.platformListingRepository = platformListingRepository;
        this.productAnalysisRepository = productAnalysisRepository;
        this.properties = properties;
        this.notificationService = notificationService;
        this.interestRepository = interestRepository;
        this.priceForecastRepository = priceForecastRepository;
        this.categoryRepository = categoryRepository;
        this.itemRepository = itemRepository;
        this.listingSearchService = listingSearchService;
        this.progressTracker = progressTracker;
        this.productTargetPriceService = productTargetPriceService;
    }

    /**
     * 상품(또는 외부 매물)의 가장 최근 시세 분석 스냅샷을 감가 예측(1M/3M/6M)·가격 분포·요약 지표와 함께 조회한다(감가 예측만
     * 필요하면 {@link #getForecast} — {@code forecasts}는 프론트 전환 후 제거 예정). 외부 매물은 관심 등록된 것만 구매자 관점으로
     * 분석되므로 그 밖의 매물은 분석 이력이 없다. 분석 이력이 없으면(배치가 아직 안 돌았거나 비교 매물 부족으로 건너뛴 경우) 상품
     * ID·현재 가격만 채우고 나머지 필드는 null인 응답을 반환한다.
     *
     * <p>가격 분포는 분석 때 통계에 쓴 비교 매물 가격으로 센다(화면·조회 시점마다 달라지지 않음). 그 가격을 저장하기 전의 스냅샷만
     * 조회 시점에 같은 1단계 기준(키워드 후보·이상치 제외, AI 선별 없음)으로 다시 고른 매물 중 분석의 최저~최고가 안에 드는 것을 센다.
     *
     * @param perspective 조회 관점 — 구매자(BUY)면 우리 상품도 구매자 추천(BUY/WAIT)과 그 근거를 {@code recommendation}에 담는다
     * @throws ProductNotFoundException 존재하지 않는 상품(외부 매물 포함)인 경우
     */
    @Transactional(readOnly = true)
    public ProductAnalysisResponse getLatestAnalysis(Long productId, AnalysisPerspective perspective) {
        Item item = getItemOrThrow(productId);
        boolean buyerView = perspective == AnalysisPerspective.BUY;
        return productAnalysisRepository
                .findFirstByItemIdOrderByAnalyzedAtDesc(productId)
                .map(analysis -> {
                    Integer confidenceRate = analysis.getListingCount() == null
                            ? null
                            : ConfidenceRule.rate(analysis.getListingCount(), properties.confidence());
                    return ProductAnalysisResponse.from(
                            item,
                            analysis,
                            buyerView,
                            ConfidenceRule.current(
                                    analysis.getConfidence(),
                                    analysis.getAnalyzedAt(),
                                    LocalDateTime.now(),
                                    properties.confidence()),
                            confidenceRate,
                            priceForecastRepository.findByAnalysisId(analysis.getId()),
                            priceDistribution(item, analysis),
                            analysisSummary(
                                    item,
                                    analysis,
                                    ProductAnalysisResponse.viewRecommendation(analysis, buyerView),
                                    confidenceRate),
                            analysisStatus(item, true));
                })
                .orElseGet(() -> ProductAnalysisResponse.empty(item, analysisStatus(item, false)));
    }

    /**
     * 대상의 분석 상태. 분석 중(대기열 포함)이면 이전 결과가 있어도 ANALYZING이고, 그다음 결과 유무, 분석 대상 상태 여부, 건너뛴
     * 기록 순으로 정한다.
     *
     * @param analyzed 분석 결과(스냅샷)가 있는지
     */
    public AnalysisStatus analysisStatus(Item item, boolean analyzed) {
        if (progressTracker.isInProgress(item.getId())) {
            return AnalysisStatus.ANALYZING;
        }
        if (analyzed) {
            return AnalysisStatus.ANALYZED;
        }
        if (!isAnalysisTarget(item)) {
            return AnalysisStatus.UNAVAILABLE;
        }
        return item.getAnalysisSkipReason() == null ? AnalysisStatus.NOT_ANALYZED : AnalysisStatus.SKIPPED;
    }

    /** 분석 대상 상태인지(우리 상품은 {@link ProductStatus#ANALYSIS_TARGETS}, 외부 매물은 판매중·예약중). */
    public static boolean isAnalysisTarget(Item item) {
        Object target = Hibernate.unproxy(item);
        // List.of는 null 포함 여부를 물으면 예외라 상태가 없으면 대상 아님으로 본다
        if (target instanceof Product product) {
            return product.getStatus() != null && ProductStatus.ANALYSIS_TARGETS.contains(product.getStatus());
        }
        return target instanceof PlatformListing listing
                && listing.getStatus() != null
                && ProductStatus.EXTERNAL_ANALYSIS_TARGETS.contains(listing.getStatus());
    }

    /** 판매 추천(SELL)이면 판매 현황, 그 밖에는 대기 추천 지표. */
    private ProductAnalysisResponse.Summary analysisSummary(
            Item item, ProductAnalysis analysis, AnalysisRecommendation recommendation, Integer confidenceRate) {
        if (recommendation == AnalysisRecommendation.SELL) {
            return ProductAnalysisResponse.SaleStats.of(
                    ChronoUnit.DAYS.between(item.getCreatedAt().toLocalDate(), LocalDate.now()) + 1,
                    item instanceof Product product ? product.getViewCount() : 0,
                    interestRepository.countByItemId(item.getId()));
        }
        int waitPeriodDays = 0;
        if (recommendation == AnalysisRecommendation.HOLD || recommendation == AnalysisRecommendation.WAIT) {
            ForecastPeriod waitPeriod =
                    analysis.getWaitPeriod() == null ? ForecastPeriod.ONE_MONTH : analysis.getWaitPeriod();
            waitPeriodDays = waitPeriod.getMonths() * DAYS_PER_MONTH;
        }
        BigDecimal changeRate = analysis.getExpectedPriceChangeRate() == null
                ? BigDecimal.ZERO
                : analysis.getExpectedPriceChangeRate()
                        .multiply(BigDecimal.valueOf(100))
                        .setScale(1, RoundingMode.HALF_UP);
        return ProductAnalysisResponse.WaitRecommendation.of(
                waitPeriodDays, changeRate, confidenceRate == null ? 0 : confidenceRate);
    }

    /**
     * 상품(또는 외부 매물)의 거래 가격 분포를 판매 중·판매 완료 두 가지로 함께 조회한다.
     *
     * <ul>
     *   <li>판매 중: 가장 최근 시세 분석 때 통계에 쓴 비교 매물 가격의 분포({@link #getLatestAnalysis}의 {@code priceDistribution}과
     *       같음). 분석 이력이 없으면 빈 분포다.
     *   <li>판매 완료: 조회 시점에 같은 카테고리에서 최근 {@code days}일(오늘 포함) 안에 판매 완료가 확인된({@code last_seen_at} 기준)
     *       외부 매물 중 시세 분석 1단계와 같은 기준(키워드 후보·중복·이상치 제외, AI 선별 없음)으로 고른 것의 가격 분포. 가격은 판매
     *       완료 직전 등록가다. 판매 완료 상태는 매물 재확인 배치가 기록하므로 재확인이 덜 된 카테고리는 매물이 적거나 없을 수 있다.
     * </ul>
     *
     * @param days 판매 완료 조회 기간(일, 오늘 포함)
     * @throws ProductNotFoundException 존재하지 않는 상품(외부 매물 포함)인 경우
     */
    @Transactional(readOnly = true)
    public PriceDistributionResponse getPriceDistribution(Long productId, int days) {
        Item item = getItemOrThrow(productId);
        Optional<ProductAnalysis> latest = productAnalysisRepository.findFirstByItemIdOrderByAnalyzedAtDesc(productId);
        return new PriceDistributionResponse(
                item.getId(),
                latest.map(analysis -> PriceDistributionResponse.OnSale.of(analysis, priceDistribution(item, analysis)))
                        .orElseGet(PriceDistributionResponse.OnSale::empty),
                soldOutDistribution(
                        item,
                        days,
                        latest.map(PriceDistributionResponse::suggestedPriceOf).orElse(null)));
    }

    private PriceDistributionResponse.SoldOut soldOutDistribution(Item item, int days, Long suggestedPrice) {
        LocalDate to = LocalDate.now();
        LocalDate from = to.minusDays(days - 1L);
        List<PlatformListing> sold = SimilarListingFilter.removeDuplicates(
                        platformListingRepository.findByCategoryIdAndStatusAndLastSeenAtAfterOrderByPriceAsc(
                                item.getCategory().getId(), SOLD_OUT_STATUS, from.atStartOfDay()))
                .stream()
                .filter(listing -> !listing.getId().equals(item.getId()))
                .toList();
        String brand = item instanceof Product product ? product.getBrand() : null;
        List<Long> prices = SimilarListingFilter.removeOutliers(
                SimilarListingFilter.selectCandidates(item.getTitle(), brand, sold, Integer.MAX_VALUE).stream()
                        .map(PlatformListing::getPrice)
                        .toList());
        return PriceDistributionResponse.SoldOut.of(days, from, to, prices, suggestedPrice, PRICE_DISTRIBUTION_BUCKETS);
    }

    /**
     * 분석 때 통계에 쓴 비교 매물 가격을 같은 폭 구간으로 센다. 그 가격이 없는 이전 스냅샷은 조회 시점 비교 매물(1단계 기준) 중 분석의
     * 최저~최고가 안에 드는 가격으로 센다.
     */
    private List<ProductAnalysisResponse.PriceBucket> priceDistribution(Item item, ProductAnalysis analysis) {
        if (analysis.getListingPrices() != null) {
            return ProductAnalysisResponse.PriceBucket.distribute(
                    analysis.getListingPrices(),
                    analysis.getMinPrice(),
                    analysis.getMaxPrice(),
                    PRICE_DISTRIBUTION_BUCKETS);
        }
        List<PlatformListing> others = freshSellingListings(item.getCategory().getId()).stream()
                .filter(listing -> !listing.getId().equals(item.getId()))
                .toList();
        String brand = item instanceof Product product ? product.getBrand() : null;
        List<Long> prices = SimilarListingFilter.removeOutliers(
                SimilarListingFilter.selectCandidates(item.getTitle(), brand, others, properties.sampleSize()).stream()
                        .map(PlatformListing::getPrice)
                        .toList());
        return ProductAnalysisResponse.PriceBucket.distribute(
                prices, analysis.getMinPrice(), analysis.getMaxPrice(), PRICE_DISTRIBUTION_BUCKETS);
    }

    /**
     * 상품(또는 외부 매물)의 감가 예측(1M/3M/6M)을 조회한다. 가장 최근 시세 분석 때 함께 계산해 둔 값이며, 기준 가치는 그 분석의
     * 평균 시세(감가 예측의 출발점)다. 분석 이력이 없으면 기준 가치를 현재 등록가로 두고 {@code forecasts}는 빈 배열인 응답을
     * 반환한다.
     *
     * @throws ProductNotFoundException 존재하지 않는 상품(외부 매물 포함)인 경우
     */
    @Transactional(readOnly = true)
    public ProductForecastResponse getForecast(Long productId) {
        Item item = getItemOrThrow(productId);
        return productAnalysisRepository
                .findFirstByItemIdOrderByAnalyzedAtDesc(productId)
                .map(analysis -> ProductForecastResponse.from(
                        item, analysis, priceForecastRepository.findByAnalysisId(analysis.getId())))
                .orElseGet(() -> ProductForecastResponse.empty(item, LocalDate.now()));
    }

    /**
     * 상품의 최근 {@code days}일(오늘 포함) 시세 분석 스냅샷을 날짜별로 묶어 가격 추이를 조회한다. 같은 날 여러 번 분석됐으면
     * 평균가는 그 평균, 최저/최고가는 그날 중 최저/최고, 비교 매물 수는 그날 중 최대이고, 기간 평균가는 일별 평균가의 평균이다
     * (분석이 몰린 날이 과대 반영되지 않도록 {@link PriceTrend}와 같은 기준). 각 점에는 직전 기록일 대비 변화가 붙는다(첫 점은
     * null). 첫 기록일이 오늘로부터 {@link PriceTrendResponse#MONTHLY_MIN_MONTHS}개월 이상 지났으면 일별 점을 달별로 다시 묶는다
     * ({@link #monthlyPoints}). 기간 평균가·변동률·비교 매물 수 합계는 단위와 무관하게 일별 점 기준이다. 외부 매물(관심 등록된 매물의 구매자 관점 분석)도 같은 방식으로 조회한다. 분석 이력이 없으면 {@code points}가 빈
     * 배열이다.
     *
     * @throws ProductNotFoundException 존재하지 않는 상품(외부 매물 포함)인 경우
     */
    @Transactional(readOnly = true)
    public PriceTrendResponse getPriceTrend(Long productId, int days) {
        Item item = getItemOrThrow(productId);
        LocalDate to = LocalDate.now();
        LocalDate from = to.minusDays(days - 1L);
        Map<LocalDate, List<ProductAnalysis>> byDate =
                productAnalysisRepository
                        .findByItemIdAndAnalyzedAtGreaterThanEqualOrderByAnalyzedAtAsc(productId, from.atStartOfDay())
                        .stream()
                        .collect(Collectors.groupingBy(
                                analysis -> analysis.getAnalyzedAt().toLocalDate(), TreeMap::new, Collectors.toList()));
        List<PriceTrendResponse.Point> points = new ArrayList<>();
        PriceTrendResponse.Point previous = null;
        for (Map.Entry<LocalDate, List<ProductAnalysis>> entry : byDate.entrySet()) {
            long averagePrice = Math.round(entry.getValue().stream()
                    .mapToLong(ProductAnalysis::getAveragePrice)
                    .average()
                    .orElseThrow());
            PriceTrendResponse.Point point = new PriceTrendResponse.Point(
                    entry.getKey(),
                    averagePrice,
                    entry.getValue().stream()
                            .map(ProductAnalysis::getListingCount)
                            .filter(Objects::nonNull)
                            .mapToLong(Integer::longValue)
                            .max()
                            .orElse(0),
                    entry.getValue().stream()
                            .mapToLong(ProductAnalysis::getMinPrice)
                            .min()
                            .orElseThrow(),
                    entry.getValue().stream()
                            .mapToLong(ProductAnalysis::getMaxPrice)
                            .max()
                            .orElseThrow(),
                    entry.getValue().size(),
                    PriceTrendResponse.Change.between(previous, averagePrice));
            points.add(point);
            previous = point;
        }
        PriceTrendResponse.Unit unit = !points.isEmpty()
                        && !points.getFirst().date().isAfter(to.minusMonths(PriceTrendResponse.MONTHLY_MIN_MONTHS))
                ? PriceTrendResponse.Unit.MONTH
                : PriceTrendResponse.Unit.DAY;
        return new PriceTrendResponse(
                item.getId(),
                item.getPrice(),
                PriceTrendResponse.Trend.of(
                        unit,
                        days,
                        from,
                        to,
                        points.isEmpty()
                                ? null
                                : Math.round(points.stream()
                                        .mapToLong(PriceTrendResponse.Point::averagePrice)
                                        .average()
                                        .orElseThrow()),
                        trendChangeRate(points),
                        points,
                        unit == PriceTrendResponse.Unit.MONTH ? monthlyPoints(points) : points));
    }

    /**
     * 일별 점을 달별로 묶는다. 점 날짜는 그달 1일, 평균가는 그달 일별 평균가의 평균, 비교 매물 수는 그달 중 최대, 최저/최고가는 그달
     * 중 최저/최고, 분석 횟수는 합이고, 변화는 직전 기록 월 대비다.
     */
    private static List<PriceTrendResponse.Point> monthlyPoints(List<PriceTrendResponse.Point> dailyPoints) {
        Map<YearMonth, List<PriceTrendResponse.Point>> byMonth = dailyPoints.stream()
                .collect(Collectors.groupingBy(
                        point -> YearMonth.from(point.date()), TreeMap::new, Collectors.toList()));
        List<PriceTrendResponse.Point> points = new ArrayList<>();
        PriceTrendResponse.Point previous = null;
        for (Map.Entry<YearMonth, List<PriceTrendResponse.Point>> entry : byMonth.entrySet()) {
            List<PriceTrendResponse.Point> days = entry.getValue();
            long averagePrice = Math.round(days.stream()
                    .mapToLong(PriceTrendResponse.Point::averagePrice)
                    .average()
                    .orElseThrow());
            PriceTrendResponse.Point point = new PriceTrendResponse.Point(
                    entry.getKey().atDay(1),
                    averagePrice,
                    days.stream()
                            .mapToLong(PriceTrendResponse.Point::transactionCount)
                            .max()
                            .orElse(0),
                    days.stream()
                            .mapToLong(PriceTrendResponse.Point::minPrice)
                            .min()
                            .orElseThrow(),
                    days.stream()
                            .mapToLong(PriceTrendResponse.Point::maxPrice)
                            .max()
                            .orElseThrow(),
                    days.stream()
                            .mapToInt(PriceTrendResponse.Point::analysisCount)
                            .sum(),
                    PriceTrendResponse.Change.between(previous, averagePrice));
            points.add(point);
            previous = point;
        }
        return points;
    }

    /**
     * 수집한 외부 매물 중 기준 상품과 같은 유형의 판매 중 매물(경쟁 상품)을 조회한다. 같은 카테고리·판매 중·최근
     * {@code freshness-hours} 안에 확인된 매물에서 시세 분석 1단계와 같은 키워드 기준(구매 글·액세서리 제외)으로 고르고 가격
     * 이상치를 뺀다(AI 호출 없음 — 다른 모델이 조금 섞일 수 있음). 자기 자신은 뺀다.
     *
     * <ul>
     *   <li>경쟁 정도: 같은 유형 매물 수로 {@code analysis.competition.*} 기준에 따라 LOW/MEDIUM/HIGH
     *   <li>상품군 평균 시세: 이번에 고른 같은 유형 매물의 평균(최소 {@code min-listings}건, 미만이면 null)
     *   <li>목록: {@code sort} 순(기본 최신 등록 순 — 최초 수집 일시)으로 최대 {@code item-limit}건
     * </ul>
     *
     * @param sort 목록 정렬(같은 값끼리는 최신 등록 순)
     * @throws ProductNotFoundException 존재하지 않는 상품(외부 매물 포함)인 경우
     */
    @Transactional(readOnly = true)
    public ProductCompetitionResponse getCompetition(Long productId, CompetitionSortType sort) {
        Item item = getItemOrThrow(productId);
        List<PlatformListing> others = freshSellingListings(item.getCategory().getId()).stream()
                .filter(listing -> !listing.getId().equals(item.getId()))
                .toList();
        String brand = item instanceof Product product ? product.getBrand() : null;
        List<PlatformListing> sameType = SimilarListingFilter.removeOutlierListings(
                SimilarListingFilter.selectCandidates(item.getTitle(), brand, others, Integer.MAX_VALUE));

        Long marketAveragePrice = sameType.size() < properties.minListings()
                ? null
                : Math.round(sameType.stream()
                        .mapToLong(PlatformListing::getPrice)
                        .average()
                        .orElseThrow());

        ProductAnalysisProperties.Competition criteria = properties.competition();
        List<ProductCompetitionResponse.Item> items = sameType.stream()
                .sorted(competitionOrder(sort))
                .limit(criteria.itemLimit())
                .map(listing -> ProductCompetitionResponse.Item.of(listing, marketAveragePrice))
                .toList();
        return new ProductCompetitionResponse(
                item.getId(),
                ProductCompetitionResponse.Competition.of(
                        sameType.size(), competitionLevel(sameType.size(), criteria), items));
    }

    /** 경쟁 상품 목록 정렬 — 가격순이면 가격으로 먼저 정렬하고, 같은 값끼리는 최신 등록 순. */
    private static Comparator<PlatformListing> competitionOrder(CompetitionSortType sort) {
        Comparator<PlatformListing> latest = Comparator.comparing(
                        PlatformListing::getCreatedAt, Comparator.reverseOrder())
                .thenComparing(PlatformListing::getId, Comparator.reverseOrder());
        return switch (sort) {
            case PRICE_LOW -> Comparator.comparing(PlatformListing::getPrice).thenComparing(latest);
            case PRICE_HIGH -> Comparator.comparing(PlatformListing::getPrice, Comparator.reverseOrder())
                    .thenComparing(latest);
            case LATEST -> latest;
        };
    }

    private static CompetitionLevel competitionLevel(int count, ProductAnalysisProperties.Competition criteria) {
        if (count == 0) {
            return CompetitionLevel.NONE;
        }
        if (count >= criteria.highCount()) {
            return CompetitionLevel.HIGH;
        }
        return count >= criteria.mediumCount() ? CompetitionLevel.MEDIUM : CompetitionLevel.LOW;
    }

    private Item getItemOrThrow(Long productId) {
        return itemRepository.findById(productId).orElseThrow(() -> new ProductNotFoundException(productId));
    }

    /** 첫 기록일 대비 마지막 기록일 평균가 변동률(소수 4자리). 기록일이 2일 미만이거나 첫 평균가가 0이면 null. */
    private static BigDecimal trendChangeRate(List<PriceTrendResponse.Point> points) {
        if (points.size() < 2 || points.getFirst().averagePrice() == 0) {
            return null;
        }
        long first = points.getFirst().averagePrice();
        return BigDecimal.valueOf(points.getLast().averagePrice() - first)
                .divide(BigDecimal.valueOf(first), 4, RoundingMode.HALF_UP);
    }

    /**
     * 시세 분석 1단계와 같은 기준(같은 카테고리·판매중·최근 수집 매물 중 상품명 키워드가 겹치는 후보, 가격 이상치 제외,
     * 최소 {@code min-listings}건)으로 유사 매물 평균가만 계산한다(AI 호출·저장 없음 — AI 최종 선별이 없어 분석 스냅샷보다
     * 오탐이 조금 섞일 수 있음). 등록 직후 응답처럼 시세 분석 스냅샷이 아직 없을 때 사용한다(상품 상세는 분석 결과만 쓴다).
     *
     * @param product 평균가를 계산할 상품(카테고리·제목·브랜드 사용)
     * @return 유사 매물이 {@code min-listings}보다 적으면 빈 값
     */
    @Transactional(readOnly = true)
    public Optional<Long> calculateMarketAveragePrice(Product product) {
        return averageOfSimilarListings(
                product.getTitle(),
                product.getBrand(),
                freshSellingListings(product.getCategory().getId()));
    }

    private Optional<Long> averageOfSimilarListings(String title, String brand, List<PlatformListing> listings) {
        List<PlatformListing> candidates =
                SimilarListingFilter.selectCandidates(title, brand, listings, properties.sampleSize());
        List<Long> prices = SimilarListingFilter.removeOutliers(
                candidates.stream().map(PlatformListing::getPrice).toList());
        if (prices.size() < properties.minListings()) {
            return Optional.empty();
        }
        return Optional.of(
                Math.round(prices.stream().mapToLong(Long::longValue).average().orElseThrow()));
    }

    /**
     * 분석 대상 상태({@link ProductStatus#ANALYSIS_TARGETS} — 외부 게시 전 등록 상품 포함)의 상품 전체와, 관심 등록된
     * 같은 상태 기준({@link ProductStatus#EXTERNAL_ANALYSIS_TARGETS} — 판매중·예약중)의 외부 매물 전체를 분석한다(스케줄러 진입점).
     * {@code analysis.batch-concurrency}건(기본 3)까지 동시에 분석하고, 처리 스레드마다 AI 호출 사이에 {@code ai-call-interval-ms}만큼
     * 쉰다. 등록·관심 등록 직후 분석으로 이미 분석 중인 대상은 건너뛴다. 한 건이 실패해도 나머지는 계속 진행하고, 모두 끝날 때까지
     * 기다린다(다음 배치와 겹치지 않도록).
     */
    public void analyzeAll() {
        long startedAt = System.currentTimeMillis();
        List<Product> products = productRepository.findByStatusIn(ProductStatus.ANALYSIS_TARGETS);
        List<PlatformListing> listings =
                interestRepository.findInterestedListingsByStatusIn(ProductStatus.EXTERNAL_ANALYSIS_TARGETS);
        Set<Long> running = progressTracker.inProgressAmong(Stream.concat(
                        products.stream().map(Product::getId), listings.stream().map(PlatformListing::getId))
                .toList());
        log.info(
                "시세 분석 대상 상품 {}건, 관심 외부 매물 {}건(이미 분석 중이라 건너뜀 {}건), 동시 {}건",
                products.size(),
                listings.size(),
                running.size(),
                properties.batchConcurrency());

        List<Runnable> tasks = new ArrayList<>();
        products.stream()
                .filter(product -> !running.contains(product.getId()))
                .forEach(product -> tasks.add(() -> analyzeProductSafely(product, properties.minListings())));
        listings.stream()
                .filter(listing -> !running.contains(listing.getId()))
                .forEach(listing -> tasks.add(() -> analyzeListingSafely(listing)));
        runConcurrently(tasks);
        log.info("시세 분석 배치 완료: {}건, {}초", tasks.size(), (System.currentTimeMillis() - startedAt) / 1000);
    }

    /** 작업을 {@code batch-concurrency}개 스레드로 나눠 실행하고 모두 끝날 때까지 기다린다(스레드마다 작업 사이에 AI 호출 간격만큼 쉼). */
    private void runConcurrently(List<Runnable> tasks) {
        if (tasks.isEmpty()) {
            return;
        }
        int threads = Math.min(properties.batchConcurrency(), tasks.size());
        AtomicInteger threadNumber = new AtomicInteger();
        ExecutorService executor = Executors.newFixedThreadPool(threads, runnable -> {
            Thread thread = new Thread(runnable, "analysis-batch-" + threadNumber.incrementAndGet());
            thread.setDaemon(true);
            return thread;
        });
        try {
            List<Future<?>> futures = tasks.stream()
                    .<Future<?>>map(task -> executor.submit(() -> {
                        task.run();
                        sleepBetweenAiCalls();
                    }))
                    .toList();
            for (Future<?> future : futures) {
                try {
                    future.get();
                } catch (ExecutionException e) {
                    // 각 작업은 예외를 로그로만 남기므로 보통 여기까지 오지 않는다(Error 등) — 나머지 작업은 계속 기다린다
                    log.error("시세 분석 배치 작업 중 오류가 발생했습니다.", e.getCause());
                }
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("시세 분석 배치가 중단됐습니다.");
        } finally {
            executor.shutdownNow();
        }
    }

    /**
     * 상품 가격이 바뀌었을 때 가장 최근 시세 분석의 가격 비교 근거를 새 가격 기준으로 다시 쓴다(AI 호출 없음). 시세(평균·최저·최고가,
     * 분포, 감가 예측, 추천가)와 판매자 추천(SELL/HOLD — 시세 추세로만 정함)은 내 가격과 무관해 그대로 두고, 판매자 근거 문장과 구매자
     * 관점 추천(BUY/WAIT — 가격 차이로 정함)·근거만 분석 때와 같은 규칙({@link RecommendationRule})으로 다시 정한다. 새 분석 기록은
     * 만들지 않는다(가격 추이에 같은 시세 점이 늘지 않도록). 분석 이력이 없거나 외부 매물이면 아무것도 하지 않는다.
     *
     * @param productId 가격이 바뀐 상품 ID
     */
    @Transactional
    public void refreshPriceReasons(Long productId) {
        Optional<Product> product = productRepository.findById(productId);
        Optional<ProductAnalysis> latest = productAnalysisRepository.findFirstByItemIdOrderByAnalyzedAtDesc(productId);
        if (product.isEmpty() || latest.isEmpty()) {
            return;
        }
        long price = product.get().getPrice();
        ProductAnalysis analysis = latest.get();
        long averagePrice = analysis.getAveragePrice();
        ComparisonBasis basis = basisOf(analysis);
        OptionalDouble monthlyRate = priceReasonTrend(analysis).monthlyRate();
        analysis.changeDescription(basisText(
                RecommendationRule.sellerReason(analysis.getRecommendation(), price, averagePrice, monthlyRate),
                basis));
        AnalysisRecommendation buyerRecommendation = RecommendationRule.forBuyer(price, averagePrice, monthlyRate);
        analysis.assignBuyerView(
                buyerRecommendation,
                basisText(
                        RecommendationRule.buyerReason(buyerRecommendation, price, averagePrice, monthlyRate), basis));
    }

    /**
     * 가격이 바뀐 상품의 가장 최근 시세 분석 근거 문장을 AI에게 새 가격 기준으로 다시 써 달라고 한다(트랜잭션 밖 — AI 응답을 기다리는 동안
     * DB 연결을 잡지 않도록). 추천은 {@link #refreshPriceReasons}가 규칙으로 정해 둔 값을 그대로 주고 문장만 받는다. 시세 수치·추이·비교 매물
     * 수만 주고 매물 후보는 다시 고르지 않는다. 저장은 {@link #applyPriceReasons}로 한다.
     *
     * @param productId 가격이 바뀐 상품 ID
     * @return 저장할 근거(분석 이력이 없거나 외부 매물이면 빈 값)
     */
    public Optional<PriceReasonUpdate> requestPriceReasons(Long productId) {
        Optional<Product> product = productRepository.findById(productId);
        Optional<ProductAnalysis> latest = productAnalysisRepository.findFirstByItemIdOrderByAnalyzedAtDesc(productId);
        if (product.isEmpty() || latest.isEmpty()) {
            return Optional.empty();
        }
        Product target = product.get();
        ProductAnalysis analysis = latest.get();
        ComparisonBasis basis = basisOf(analysis);
        String userPrompt = PRICE_REASON_USER_PROMPT_TEMPLATE.formatted(
                target.getTitle(),
                target.getBrand() == null ? "알 수 없음" : target.getBrand(),
                target.getPrice(),
                target.getCondition(),
                defectStatusLabel(target.getDefectStatus()),
                basis == ComparisonBasis.RELATED ? "비슷한 상품(같은 종류·시리즈)" : "같은 물건",
                analysis.getListingCount() == null ? "알 수 없음" : analysis.getListingCount() + "건",
                analysis.getMinPrice(),
                analysis.getAveragePrice(),
                analysis.getMaxPrice(),
                analysis.getSuggestedPrice() == null ? analysis.getAveragePrice() : analysis.getSuggestedPrice(),
                priceReasonTrend(analysis).toPromptText(),
                analysis.getRecommendation(),
                analysis.getBuyerRecommendation());
        PriceReasonResult result = aiChatExecutor.call("가격 변경 근거", client -> client.prompt()
                .system(PRICE_REASON_SYSTEM_PROMPT)
                .user(userPrompt)
                .call()
                .entity(PriceReasonResult.class));
        if (result == null || isBlank(result.description()) || isBlank(result.buyerDescription())) {
            return Optional.empty();
        }
        return Optional.of(new PriceReasonUpdate(
                productId, analysis.getId(), target.getPrice(), result.description(), result.buyerDescription()));
    }

    /**
     * AI가 다시 쓴 근거를 저장한다. AI 응답을 기다리는 사이 새 분석이 저장됐거나 가격이 또 바뀌었으면 버린다(그쪽 근거가 더 최신).
     * 가격 변경 커밋 뒤(AFTER_COMMIT 리스너)에서 부르므로 새 트랜잭션으로 저장한다 — 기본 전파(REQUIRED)는 이미 끝난 트랜잭션에 합류해
     * 변경이 커밋되지 않는다.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void applyPriceReasons(PriceReasonUpdate update) {
        Optional<Product> product = productRepository.findById(update.productId());
        Optional<ProductAnalysis> latest =
                productAnalysisRepository.findFirstByItemIdOrderByAnalyzedAtDesc(update.productId());
        if (product.isEmpty()
                || latest.isEmpty()
                || !latest.get().getId().equals(update.analysisId())
                || product.get().getPrice() != update.price()) {
            return;
        }
        latest.get().changeDescription(update.description());
        latest.get().assignBuyerView(latest.get().getBuyerRecommendation(), update.buyerDescription());
    }

    /** 근거를 다시 쓸 때의 추세 — 분석 때와 같이 최근 분석들의 평균가(비슷한 물건 기준 분석이면 추세 없이). */
    private PriceTrend priceReasonTrend(ProductAnalysis analysis) {
        if (basisOf(analysis) == ComparisonBasis.RELATED) {
            return PriceTrend.of(List.of()).plus(analysis.getAnalyzedAt(), analysis.getAveragePrice());
        }
        return PriceTrend.of(snapshots(productAnalysisRepository.findByItemIdAndAnalyzedAtAfterOrderByAnalyzedAtAsc(
                analysis.getItem().getId(), LocalDateTime.now().minusMonths(TREND_MONTHS))));
    }

    private static boolean isBlank(String text) {
        return text == null || text.isBlank();
    }

    /**
     * 상품 1건을 정기 배치와 같은 방식으로 분석한다(등록 직후 분석 진입점). 최소 비교 매물 수는 관심 등록·재시도와 같은
     * {@code interest-min-listings}(기본 1)다. 이미 삭제됐거나 분석 대상 상태가 아니면 건너뛰고, 실패해도 예외를 던지지 않는다(로그만 남김).
     *
     * @param productId 분석할 상품 ID
     */
    public void analyzeProductById(Long productId) {
        productRepository
                .findById(productId)
                .filter(product -> ProductStatus.ANALYSIS_TARGETS.contains(product.getStatus()))
                .ifPresentOrElse(
                        // 등록 직후 분석도 관심 등록·재시도처럼 최소 매물 수를 낮춰 결과를 먼저 보여 준다(매물이 적으면 신뢰도 LOW)
                        product -> analyzeProductSafely(product, properties.interestMinListings()),
                        () -> log.info("상품 {}: 없거나 분석 대상 상태가 아니라 등록 직후 분석을 건너뜁니다.", productId));
    }

    /**
     * 관심 등록된 대상 1건(우리 상품 또는 외부 매물)을 정기 배치와 같은 방식으로 분석한다(관심 등록 직후 분석 진입점). 우리 상품은
     * 분석 대상 상태일 때, 외부 매물은 같은 기준(판매중·예약중)일 때만 분석하고, 최근 {@code analysis.interest-skip-hours}시간(기본 6) 안에 분석한
     * 대상은 건너뛴다(여러 회원이 같은 대상을 연달아 등록해도 AI를 반복 호출하지 않도록, 0이면 항상 분석). 실패해도 예외를 던지지 않는다(로그만 남김).
     *
     * @param itemId 관심 등록 대상 ID
     */
    public void analyzeInterestedItemById(Long itemId) {
        analyzeInterestedItemById(itemId, false);
    }

    /**
     * {@link #analyzeInterestedItemById(Long)}와 같지만 {@code force}면 최근 분석 여부와 관계없이 분석한다(화면 "AI 분석 재시도" 요청용).
     *
     * @param itemId 분석할 대상 ID
     * @param force true면 최근 {@code analysis.interest-skip-hours}시간 안에 분석했어도 다시 분석
     */
    public void analyzeInterestedItemById(Long itemId, boolean force) {
        Optional<Item> item = itemRepository.findById(itemId).map(found -> (Item) Hibernate.unproxy(found));
        if (item.isEmpty()) {
            log.info("관심 대상 {}: 없어서 관심 등록 직후 분석을 건너뜁니다.", itemId);
            return;
        }
        int skipHours = properties.interestSkipHours();
        LocalDateTime recent = LocalDateTime.now().minusHours(skipHours);
        boolean analyzedRecently = productAnalysisRepository
                .findFirstByItemIdOrderByAnalyzedAtDesc(itemId)
                .map(analysis -> skipHours > 0
                        && analysis.getAnalyzedAt() != null
                        && analysis.getAnalyzedAt().isAfter(recent))
                .orElse(false);
        if (analyzedRecently && !force) {
            log.info("관심 대상 {}: 최근 {}시간 안에 분석해 관심 등록 직후 분석을 건너뜁니다.", itemId, skipHours);
            return;
        }
        if (item.get() instanceof Product product && ProductStatus.ANALYSIS_TARGETS.contains(product.getStatus())) {
            // 관심 등록 대상은 같은 물건 판매 글이 드물어도 결과를 보여 주도록 최소 매물 수를 낮춘다(신뢰도는 낮게 표시)
            analyzeProductSafely(product, properties.interestMinListings());
        } else if (item.get() instanceof PlatformListing listing
                && ProductStatus.EXTERNAL_ANALYSIS_TARGETS.contains(listing.getStatus())) {
            analyzeListingSafely(listing);
        } else {
            log.info("관심 대상 {}: 분석 대상 상태가 아니라 관심 등록 직후 분석을 건너뜁니다.", itemId);
        }
    }

    private void analyzeListingSafely(PlatformListing listing) {
        progressTracker.start(listing.getId());
        try {
            analyzeListing(listing);
        } catch (Exception e) {
            log.error("외부 매물 {} 시세 분석 중 오류가 발생했습니다.", listing.getId(), e);
        } finally {
            progressTracker.finish(listing.getId());
        }
    }

    private void analyzeProductSafely(Product product, int minListings) {
        progressTracker.start(product.getId());
        try {
            analyzeProduct(product, minListings);
        } catch (Exception e) {
            log.error("상품 {} 시세 분석 중 오류가 발생했습니다.", product.getId(), e);
        } finally {
            progressTracker.finish(product.getId());
        }
    }

    private void sleepBetweenAiCalls() {
        try {
            Thread.sleep(properties.aiCallIntervalMs());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    /** 정기 배치 기준(최소 유사 매물 {@code min-listings})으로 상품을 분석한다. */
    void analyzeProduct(Product product) {
        analyzeProduct(product, properties.minListings());
    }

    /**
     * @param minListings 분석에 필요한 최소 유사 매물 수(관심 등록 직후 분석은 {@code interest-min-listings})
     */
    @Transactional
    void analyzeProduct(Product product, int minListings) {
        // 같은 물건 비교 매물을 고른다(키워드 후보 → AI 최종 선별, 부족하면 상품명 검색으로 보탬). 이전 분석 추이는 AI의
        // 추세 판단 근거로 함께 준다
        PriceTrend trend =
                PriceTrend.of(snapshots(productAnalysisRepository.findByItemIdAndAnalyzedAtAfterOrderByAnalyzedAtAsc(
                        product.getId(), LocalDateTime.now().minusMonths(TREND_MONTHS))));
        Optional<SimilarSelection> selection = selectSimilarListings(
                "상품 " + product.getId(),
                product.getId(),
                minListings,
                product.getTitle(),
                product.getBrand(),
                product.getCategory().getId(),
                null,
                freshSellingListings(product.getCategory().getId()),
                candidates -> requestAiAnalysis(product, candidates, trend));
        if (selection.isEmpty()) {
            return;
        }
        progressTracker.stepStarted(product.getId(), AnalysisStep.PRICE_CALCULATION);
        MarketAnalysisResult aiResult = selection.get().aiResult();
        List<Long> prices = selection.get().prices();
        ComparisonBasis basis = selection.get().basis();
        // 비슷한 물건까지 쓴 분석은 이전 분석과 비교 대상이 달라 추세를 믿을 수 없으므로 추세 없이 판단한다
        PriceTrend basisTrend = basis == ComparisonBasis.RELATED ? PriceTrend.of(List.of()) : trend;

        LongSummaryStatistics stats = prices.stream().mapToLong(Long::longValue).summaryStatistics();
        long minPrice = stats.getMin();
        long averagePrice = Math.round(stats.getAverage());
        long maxPrice = stats.getMax();

        Optional<ProductAnalysis> previous =
                productAnalysisRepository.findFirstByItemIdOrderByAnalyzedAtDesc(product.getId());
        // 직전 분석과 비교 기준(같은 물건/비슷한 물건)이 다르면 평균가를 비교할 수 없어 변동률을 비운다
        BigDecimal changeRate = previous.filter(p -> basisOf(p) == basis)
                .map(p -> calculateChangeRate(p.getAveragePrice(), averagePrice))
                .orElse(null);

        // 추천은 규칙으로 정한다(AI 추천이 규칙과 다르면 근거 문장도 규칙 기반으로 바꿈)
        LocalDateTime analyzedAt = LocalDateTime.now();
        OptionalDouble monthlyRate = basisTrend.plus(analyzedAt, averagePrice).monthlyRate();
        AnalysisRecommendation sellerRecommendation = RecommendationRule.forSeller(monthlyRate);
        AnalysisRecommendation buyerRecommendation =
                RecommendationRule.forBuyer(product.getPrice(), averagePrice, monthlyRate);
        ProductAnalysis analysis = ProductAnalysis.create(
                product,
                minPrice,
                averagePrice,
                maxPrice,
                changeRate,
                sellerRecommendation,
                aiResult.suggestedPrice(),
                basisText(
                        aiResult.recommendation() == sellerRecommendation
                                ? aiResult.description()
                                : RecommendationRule.sellerReason(
                                        sellerRecommendation, product.getPrice(), averagePrice, monthlyRate),
                        basis),
                analyzedAt);
        analysis.assignBuyerView(
                buyerRecommendation,
                basisText(
                        aiResult.buyerRecommendation() == buyerRecommendation && aiResult.buyerDescription() != null
                                ? aiResult.buyerDescription()
                                : RecommendationRule.buyerReason(
                                        buyerRecommendation, product.getPrice(), averagePrice, monthlyRate),
                        basis));
        assignConfidence(analysis, selection.get());
        analysis.assignListingPrices(prices);

        progressTracker.stepDone(product.getId(), AnalysisStep.PRICE_CALCULATION);

        // 감가 예측(1M/3M/6M)과, 판매자 추천에 붙는 1개월 가격 전망(SELL=감가 예측, HOLD=시세 추세)
        progressTracker.stepStarted(product.getId(), AnalysisStep.FORECAST);
        List<DepreciationForecaster.Forecast> forecasts = forecastWithOutlook(
                analysis,
                product.getCategory().getId(),
                basisTrend.plus(analyzedAt, averagePrice),
                monthlyRate,
                sellerRecommendation,
                averagePrice);
        progressTracker.stepDone(product.getId(), AnalysisStep.FORECAST);
        progressTracker.stepStarted(product.getId(), AnalysisStep.SAVE);
        productAnalysisRepository.save(analysis);
        saveForecasts(analysis, forecasts);
        itemRepository.clearAnalysisSkip(product.getId());

        // 시세 분석의 적정가는 스냅샷에만 저장한다 — 상품의 AI 제안가(products.suggested_price)는 사진 추정가로 고정

        // 관점별 추천이 직전 스냅샷과 달라졌으면 판매자(SELL/HOLD)·관심 등록 회원(BUY/WAIT)에게 각각 알림
        AnalysisRecommendation previousSeller =
                previous.map(ProductAnalysis::getRecommendation).orElse(null);
        AnalysisRecommendation previousBuyer =
                previous.map(ProductAnalysis::getBuyerRecommendation).orElse(null);
        notificationService.notifyRecommendationChanged(product, previousSeller, sellerRecommendation);
        notificationService.notifyRecommendationChanged(product, previousBuyer, buyerRecommendation);

        // 평균 시세가 직전 분석보다 크게 변했으면 시세 변동 알림 — 같은 분석에서 추천이 바뀌어 전환 알림이 나간 쪽은 생략
        if (previous.isPresent() && PriceChangeRule.shouldAlert(changeRate, analysis.getConfidence())) {
            notificationService.notifyPriceChanged(
                    product,
                    previous.get().getAveragePrice(),
                    averagePrice,
                    PRICE_CHANGE_SELLER_TARGETS.contains(product.getStatus())
                            && Objects.equals(previousSeller, sellerRecommendation),
                    Objects.equals(previousBuyer, buyerRecommendation));
        }

        // 판매자가 정한 목표 판매가에 평균 시세가 도달했으면 판매자에게 알림(도달 1번에 1회)
        productTargetPriceService.checkAfterAnalysis(product.getId(), averagePrice);
        progressTracker.stepDone(product.getId(), AnalysisStep.SAVE);
    }

    /**
     * 관심 등록된 외부 매물 1건을 구매자 관점(BUY/WAIT)으로 분석한다. 외부 매물은 관심 등록된 것만 분석하므로 최소 유사 매물 수는
     * {@code interest-min-listings}다. 비교 매물에서 분석 대상 매물 자신은 제외한다. 감가 예측·1개월
     * 가격 전망은 우리 상품과 같이 계산한다. 우리 상품과 달리 판매자 관점 추천은 없고, 알림은 관심 등록 회원에게만 간다.
     */
    @Transactional
    void analyzeListing(PlatformListing listing) {
        // 같은 물건 비교 매물을 고른다(분석 대상 매물 자신은 제외, 외부 매물은 브랜드 정보가 없음)
        PriceTrend trend =
                PriceTrend.of(snapshots(productAnalysisRepository.findByItemIdAndAnalyzedAtAfterOrderByAnalyzedAtAsc(
                        listing.getId(), LocalDateTime.now().minusMonths(TREND_MONTHS))));
        Optional<SimilarSelection> selection = selectSimilarListings(
                "외부 매물 " + listing.getId(),
                listing.getId(),
                properties.interestMinListings(),
                listing.getTitle(),
                null,
                listing.getCategory().getId(),
                listing,
                freshSellingListings(listing.getCategory().getId()),
                candidates -> requestListingAiAnalysis(listing, candidates, trend));
        if (selection.isEmpty()) {
            return;
        }
        progressTracker.stepStarted(listing.getId(), AnalysisStep.PRICE_CALCULATION);
        MarketAnalysisResult aiResult = selection.get().aiResult();
        List<Long> prices = selection.get().prices();
        ComparisonBasis basis = selection.get().basis();
        // 비슷한 물건까지 쓴 분석은 이전 분석과 비교 대상이 달라 추세를 믿을 수 없으므로 추세 없이 판단한다
        PriceTrend basisTrend = basis == ComparisonBasis.RELATED ? PriceTrend.of(List.of()) : trend;

        LongSummaryStatistics stats = prices.stream().mapToLong(Long::longValue).summaryStatistics();
        long minPrice = stats.getMin();
        long averagePrice = Math.round(stats.getAverage());
        long maxPrice = stats.getMax();

        Optional<ProductAnalysis> previous =
                productAnalysisRepository.findFirstByItemIdOrderByAnalyzedAtDesc(listing.getId());
        // 직전 분석과 비교 기준(같은 물건/비슷한 물건)이 다르면 평균가를 비교할 수 없어 변동률을 비운다
        BigDecimal changeRate = previous.filter(p -> basisOf(p) == basis)
                .map(p -> calculateChangeRate(p.getAveragePrice(), averagePrice))
                .orElse(null);

        // 추천은 구매자 관점 규칙으로 정한다(AI 추천이 규칙과 다르면 근거 문장도 규칙 기반으로 바꿈)
        LocalDateTime analyzedAt = LocalDateTime.now();
        OptionalDouble monthlyRate = basisTrend.plus(analyzedAt, averagePrice).monthlyRate();
        AnalysisRecommendation recommendation =
                RecommendationRule.forBuyer(listing.getPrice(), averagePrice, monthlyRate);
        ProductAnalysis analysis = ProductAnalysis.createForListing(
                listing,
                minPrice,
                averagePrice,
                maxPrice,
                changeRate,
                recommendation,
                aiResult.suggestedPrice(),
                basisText(
                        aiResult.recommendation() == recommendation
                                ? aiResult.description()
                                : RecommendationRule.buyerReason(
                                        recommendation, listing.getPrice(), averagePrice, monthlyRate),
                        basis),
                analyzedAt);
        assignConfidence(analysis, selection.get());
        analysis.assignListingPrices(prices);

        progressTracker.stepDone(listing.getId(), AnalysisStep.PRICE_CALCULATION);

        progressTracker.stepStarted(listing.getId(), AnalysisStep.FORECAST);
        // 감가 예측(1M/3M/6M)과 1개월 가격 전망 — 우리 상품과 같은 규칙. 전망은 시세 추세로 갈리므로(오르는 중이면 상승 전망,
        // 아니면 감가 예측 1M) 판매자 규칙을 추세 판단에만 쓰고, 저장하는 추천은 구매자 관점 그대로 둔다
        List<DepreciationForecaster.Forecast> forecasts = forecastWithOutlook(
                analysis,
                listing.getCategory().getId(),
                basisTrend.plus(analyzedAt, averagePrice),
                monthlyRate,
                RecommendationRule.forSeller(monthlyRate),
                averagePrice);
        progressTracker.stepDone(listing.getId(), AnalysisStep.FORECAST);
        progressTracker.stepStarted(listing.getId(), AnalysisStep.SAVE);
        productAnalysisRepository.save(analysis);
        saveForecasts(analysis, forecasts);
        itemRepository.clearAnalysisSkip(listing.getId());

        notificationService.notifyListingRecommendationChanged(
                listing, previous.map(ProductAnalysis::getRecommendation).orElse(null), recommendation);

        // 평균 시세가 직전 분석보다 크게 변했으면 시세 변동 알림 — 같은 분석에서 추천이 바뀌어 전환 알림이 나갔으면 생략
        if (previous.isPresent()
                && PriceChangeRule.shouldAlert(changeRate, analysis.getConfidence())
                && Objects.equals(previous.get().getRecommendation(), recommendation)) {
            notificationService.notifyListingPriceChanged(
                    listing, previous.get().getAveragePrice(), averagePrice);
        }
        progressTracker.stepDone(listing.getId(), AnalysisStep.SAVE);
    }

    /**
     * 감가 예측가(1M/3M/6M)를 계산하고, 그 1M 값을 이용한 1개월 가격 전망을 스냅샷에 채운다. 예측가는 스냅샷 저장 뒤
     * {@link #saveForecasts}로 저장한다.
     *
     * @param trendWithNow 이번 분석까지 포함한 평균가 추이
     * @param monthlyRate 관측된 월 시세 추세
     * @param trendView 전망 갈래를 정하는 판매자 관점 추천(HOLD=시세 상승 중, SELL=그 밖)
     */
    private List<DepreciationForecaster.Forecast> forecastWithOutlook(
            ProductAnalysis analysis,
            Long categoryId,
            PriceTrend trendWithNow,
            OptionalDouble monthlyRate,
            AnalysisRecommendation trendView,
            long averagePrice) {
        String rootCategoryName = categoryRepository.findRootName(categoryId).orElse(null);
        List<DepreciationForecaster.Forecast> forecasts =
                DepreciationForecaster.forecast(averagePrice, trendWithNow, rootCategoryName);
        PriceOutlookRule.Outlook outlook = PriceOutlookRule.forSeller(
                trendView,
                monthlyRate,
                DepreciationForecaster.monthlyRate(trendWithNow, rootCategoryName),
                averagePrice,
                oneMonthForecast(forecasts));
        analysis.assignOutlook(outlook.waitPeriod(), outlook.expectedPrice(), outlook.expectedPriceChangeRate());
        return forecasts;
    }

    /** 이번 스냅샷 기준 감가 예측가(1M/3M/6M)를 저장한다({@link DepreciationForecaster}). */
    private void saveForecasts(ProductAnalysis analysis, List<DepreciationForecaster.Forecast> forecasts) {
        priceForecastRepository.saveAll(forecasts.stream()
                .map(forecast -> PriceForecast.of(analysis, forecast.period(), forecast.expectedPrice()))
                .toList());
    }

    private static long oneMonthForecast(List<DepreciationForecaster.Forecast> forecasts) {
        return forecasts.stream()
                .filter(forecast -> forecast.period() == ForecastPeriod.ONE_MONTH)
                .findFirst()
                .orElseThrow()
                .expectedPrice();
    }

    private MarketAnalysisResult requestListingAiAnalysis(
            PlatformListing listing, List<PlatformListing> candidates, PriceTrend trend) {
        String userPrompt = LISTING_USER_PROMPT_TEMPLATE.formatted(
                listing.getTitle(),
                listing.getPrice(),
                candidates.size(),
                numberedCandidates(candidates),
                trend.toPromptText());

        MarketAnalysisResult result = aiChatExecutor.call("외부 매물 시세 분석", client -> client.prompt()
                .system(LISTING_SYSTEM_PROMPT)
                .user(userPrompt)
                .call()
                .entity(MarketAnalysisResult.class));
        assert result != null;
        return result;
    }

    private MarketAnalysisResult requestAiAnalysis(
            Product product, List<PlatformListing> candidates, PriceTrend trend) {
        String userPrompt = USER_PROMPT_TEMPLATE.formatted(
                product.getTitle(),
                product.getBrand() == null ? "알 수 없음" : product.getBrand(),
                product.getPrice(),
                product.getCondition(),
                defectStatusLabel(product.getDefectStatus()),
                candidates.size(),
                numberedCandidates(candidates),
                trend.toPromptText());

        // Gemini가 실패하면 같은 요청을 OpenAI GPT로 대체 호출
        MarketAnalysisResult result = aiChatExecutor.call("시세 분석", client -> client.prompt()
                .system(SYSTEM_PROMPT)
                .user(userPrompt)
                .call()
                .entity(MarketAnalysisResult.class));
        assert result != null;
        return result;
    }

    /** 시세 추세용 기록 — 비슷한 물건까지 쓴 분석은 같은 물건 시세와 섞이지 않도록 뺀다. */
    /** 분석의 비교 기준(도입 이전 분석은 같은 물건 기준). */
    private static ComparisonBasis basisOf(ProductAnalysis analysis) {
        return analysis.getComparisonBasis() == null ? ComparisonBasis.SAME : analysis.getComparisonBasis();
    }

    /** 비슷한 물건까지 쓴 분석이면 근거 문장의 "같은 물건"을 "비슷한 상품"으로 바꾼다(규칙 문장이 같은 물건 기준으로 쓰여 있음). */
    private static String basisText(String text, ComparisonBasis basis) {
        return basis == ComparisonBasis.RELATED && text != null ? text.replace("같은 물건", "비슷한 상품") : text;
    }

    private static List<PriceTrend.Snapshot> snapshots(List<ProductAnalysis> analyses) {
        return analyses.stream()
                .filter(analysis -> basisOf(analysis) == ComparisonBasis.SAME)
                .map(analysis -> new PriceTrend.Snapshot(analysis.getAnalyzedAt(), analysis.getAveragePrice()))
                .toList();
    }

    /**
     * 같은 카테고리에서 최근 {@code freshness-hours} 안에 확인된 판매중 매물(가격 오름차순). 같은 글을 반복 등록한 중복 매물은 하나만
     * 남긴다({@link SimilarListingFilter#removeDuplicates}).
     */
    private List<PlatformListing> freshSellingListings(Long categoryId) {
        LocalDateTime freshAfter = LocalDateTime.now().minusHours(properties.freshnessHours());
        return SimilarListingFilter.removeDuplicates(
                platformListingRepository.findByCategoryIdAndStatusAndLastSeenAtAfterOrderByPriceAsc(
                        categoryId, SELLING_STATUS, freshAfter));
    }

    /** AI 프롬프트용 후보 목록("1. 제목: 가격원"). 번호는 {@link #similarListings}에서 다시 매물로 바꾼다. */
    private static String numberedCandidates(List<PlatformListing> candidates) {
        return IntStream.range(0, candidates.size())
                .mapToObj(i -> "%d. %s: %d원"
                        .formatted(
                                i + 1,
                                candidates.get(i).getTitle(),
                                candidates.get(i).getPrice()))
                .collect(Collectors.joining("\n"));
    }

    /** AI가 고른 후보 번호(1부터)를 가격 목록으로 바꾼다. 범위 밖/중복 번호는 무시한다. */
    /** AI가 고른 같은 물건 매물(후보 번호 1부터). 범위 밖·중복 번호는 무시한다. */
    private static List<PlatformListing> similarListings(List<PlatformListing> candidates, List<Integer> numbers) {
        if (numbers == null) {
            return List.of();
        }
        return numbers.stream()
                .filter(number -> number != null && number >= 1 && number <= candidates.size())
                .distinct()
                .map(number -> candidates.get(number - 1))
                .toList();
    }

    /**
     * 같은 물건 비교 매물 선별 결과 — AI 응답(적정가·근거 문장), 이상치를 뺀 가격 목록, 비교 기준(같은 물건이 부족해 비슷한 물건까지
     * 썼으면 RELATED).
     */
    private record SimilarSelection(MarketAnalysisResult aiResult, List<Long> prices, ComparisonBasis basis) {}

    /**
     * 같은 물건 비교 매물을 고른다. 키워드로 후보를 넓게 고르고({@link SimilarListingFilter#selectCandidates}) AI가 같은
     * 물건만 남긴 뒤 가격 이상치를 뺀다. 후보나 같은 물건이 {@code min-listings}보다 적으면 상품명으로 번개장터를 한 번
     * 검색해(검색 결과는 저장되어 이후 분석에도 쓰임) 비교 매물을 보탠 뒤 다시 고른다. AI가 이미 확인한 같은 물건은 유지하고 새
     * 후보만 더해 AI를 한 번 더 호출하며(분석 1건당 AI 최대 2회), 그래도 부족하면 건너뛴다.
     *
     * @param label 로그용 대상 이름(예: "상품 1")
     * @param itemId 분석 대상 ID(건너뛴 사유를 기록)
     * @param minListings 분석에 필요한 최소 유사 매물 수
     * @param self 비교 매물에서 뺄 분석 대상 매물(자신과 같은 글로 반복 등록된 매물도 뺌, 우리 상품이면 null)
     * @param listings 같은 카테고리의 최근 판매중 매물
     * @param ai 후보 목록을 주고 AI 분석을 요청하는 함수
     * @return 같은 물건이 부족해 건너뛰면 빈 값(건너뛴 사유는 {@link ItemRepository#recordAnalysisSkip}로 기록)
     */
    private Optional<SimilarSelection> selectSimilarListings(
            String label,
            Long itemId,
            int minListings,
            String title,
            String brand,
            Long categoryId,
            PlatformListing self,
            List<PlatformListing> listings,
            Function<List<PlatformListing>, MarketAnalysisResult> ai) {
        progressTracker.stepStarted(itemId, AnalysisStep.CANDIDATE_SEARCH);
        int sampleSize = properties.sampleSize();
        List<PlatformListing> pool = excludeSelf(listings, self);
        List<PlatformListing> candidates = SimilarListingFilter.selectCandidates(title, brand, pool, sampleSize);
        boolean searched = false;

        // 1) 키워드 후보부터 부족하면 AI 호출 전에 검색으로 보탠다
        if (candidates.size() < minListings) {
            List<PlatformListing> found = searchListings(title, brand, categoryId, self, pool);
            if (found.isEmpty()) {
                log.info(
                        "{}: 같은 카테고리 매물 {}건 중 키워드가 겹치는 후보가 {}건뿐이고 상품명 검색에서도 새 매물을 찾지 못해 분석을 건너뜁니다(최소 {}건 필요).",
                        label,
                        pool.size(),
                        candidates.size(),
                        minListings);
                return skip(itemId, AnalysisSkipReason.NOT_ENOUGH_CANDIDATES);
            }
            searched = true;
            pool = merge(pool, found);
            candidates = SimilarListingFilter.selectCandidates(title, brand, pool, sampleSize);
            if (candidates.size() < minListings) {
                log.info(
                        "{}: 검색으로 {}건을 보탠 뒤에도 키워드가 겹치는 후보가 {}건뿐이라 분석을 건너뜁니다(최소 {}건 필요).",
                        label,
                        found.size(),
                        candidates.size(),
                        minListings);
                return skip(itemId, AnalysisSkipReason.NOT_ENOUGH_CANDIDATES);
            }
        }

        progressTracker.stepDone(itemId, AnalysisStep.CANDIDATE_SEARCH);

        // 2) AI가 같은 물건(과 같은 종류·시리즈의 비슷한 물건)을 고른다
        progressTracker.stepStarted(itemId, AnalysisStep.AI_ANALYSIS);
        MarketAnalysisResult aiResult = ai.apply(candidates);
        List<PlatformListing> similar = similarListings(candidates, aiResult.similarListingNumbers());
        List<PlatformListing> related = relatedListings(candidates, aiResult, similar);
        List<Long> prices = pricesOf(similar);

        // 3) 같은 물건이 부족하고 아직 검색 전이면, 검색으로 새 후보를 보태 확인된 매물과 함께 AI에 한 번 더 묻는다
        if (prices.size() < minListings && !searched) {
            // 새 후보는 검색 결과에서만 고른다(searchListings가 기존 풀에 있던 매물은 이미 뺌)
            List<PlatformListing> found = searchListings(title, brand, categoryId, self, pool);
            List<PlatformListing> newCandidates = SimilarListingFilter.selectCandidates(
                    title, brand, found, Math.max(sampleSize - similar.size() - related.size(), 0));
            if (newCandidates.isEmpty()) {
                log.info("{}: 같은 물건이 {}건뿐이라 상품명으로 검색했지만 보탤 새 후보가 없습니다(검색 결과 {}건).", label, prices.size(), found.size());
            } else {
                log.info("{}: 같은 물건이 {}건뿐이라 검색 후보 {}건을 보태 다시 확인합니다.", label, prices.size(), newCandidates.size());
                List<PlatformListing> retryCandidates = new ArrayList<>(similar);
                retryCandidates.addAll(related);
                retryCandidates.addAll(newCandidates);
                sleepBetweenAiCalls();
                aiResult = ai.apply(retryCandidates);
                candidates = retryCandidates;
                similar = similarListings(retryCandidates, aiResult.similarListingNumbers());
                related = relatedListings(retryCandidates, aiResult, similar);
                prices = pricesOf(similar);
            }
        }

        // 4) 그래도 같은 물건이 부족하면 같은 종류·시리즈의 비슷한 물건까지 넣어 분석한다(신뢰도는 LOW로 표시)
        ComparisonBasis basis = ComparisonBasis.SAME;
        if (prices.size() < minListings) {
            List<PlatformListing> withRelated = new ArrayList<>(similar);
            withRelated.addAll(related);
            List<Long> relatedPrices = pricesOf(withRelated);
            if (relatedPrices.size() < minListings) {
                log.info(
                        "{}: 후보 {}건 중 같은 물건 {}건·비슷한 물건 {}건뿐이라 분석을 건너뜁니다(최소 {}건 필요).",
                        label,
                        candidates.size(),
                        similar.size(),
                        related.size(),
                        minListings);
                return skip(itemId, AnalysisSkipReason.NOT_ENOUGH_SIMILAR);
            }
            log.info(
                    "{}: 같은 물건이 {}건뿐이라 비슷한 물건 {}건을 더해 분석합니다(비슷한 상품 기준, 신뢰도 LOW).",
                    label,
                    similar.size(),
                    related.size());
            prices = relatedPrices;
            basis = ComparisonBasis.RELATED;
        }
        progressTracker.stepDone(itemId, AnalysisStep.AI_ANALYSIS);
        return Optional.of(new SimilarSelection(aiResult, prices, basis));
    }

    /** AI가 고른 비슷한 물건(같은 종류·시리즈) 매물 — 같은 물건으로 고른 매물은 뺀다. */
    private static List<PlatformListing> relatedListings(
            List<PlatformListing> candidates, MarketAnalysisResult aiResult, List<PlatformListing> similar) {
        return similarListings(candidates, aiResult.relatedListingNumbers()).stream()
                .filter(listing -> !similar.contains(listing))
                .toList();
    }

    /** 매물 가격에서 이상치를 뺀 목록. */
    private static List<Long> pricesOf(List<PlatformListing> listings) {
        return SimilarListingFilter.removeOutliers(
                listings.stream().map(PlatformListing::getPrice).toList());
    }

    /** 신뢰도와 비교 기준을 붙인다. 비슷한 물건까지 쓴 분석은 같은 물건 분석보다 덜 정확하므로 신뢰도를 LOW로 고정한다. */
    private void assignConfidence(ProductAnalysis analysis, SimilarSelection selection) {
        List<Long> prices = selection.prices();
        AnalysisConfidence confidence = selection.basis() == ComparisonBasis.RELATED
                ? AnalysisConfidence.LOW
                : ConfidenceRule.grade(prices, properties.confidence());
        analysis.assignConfidence(prices.size(), confidence);
        analysis.assignComparisonBasis(selection.basis());
    }

    private Optional<SimilarSelection> skip(Long itemId, AnalysisSkipReason reason) {
        itemRepository.recordAnalysisSkip(itemId, reason, LocalDateTime.now());
        return Optional.empty();
    }

    /**
     * 상품명 검색 결과 중 기존 후보 풀에 없는 판매중 매물(분석 대상 자신·중복 매물 제외 — 풀에 있는 매물과 같은 글도 뺌). 검색이
     * 꺼져 있으면 빈 목록.
     */
    private List<PlatformListing> searchListings(
            String title, String brand, Long categoryId, PlatformListing self, List<PlatformListing> pool) {
        ProductAnalysisProperties.SearchFallback searchFallback = properties.searchFallback();
        if (!searchFallback.enabled()) {
            return List.of();
        }
        Set<Long> poolIds = pool.stream()
                .map(PlatformListing::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        List<PlatformListing> found =
                new ArrayList<>(excludeSelf(listingSearchService.searchAndSave(title, brand, categoryId), self).stream()
                        .filter(listing -> listing.getId() == null || !poolIds.contains(listing.getId()))
                        .filter(listing ->
                                pool.stream().noneMatch(other -> SimilarListingFilter.isDuplicate(listing, other)))
                        .toList());
        // 같은 카테고리 검색 결과가 적으면 상품이 잘못된 카테고리에 등록됐을 수 있어 카테고리 없이 한 번 더 찾는다(저장하지 않는
        // 이번 분석용 후보 — 같은 물건인지는 AI가 가린다)
        if (found.size() < OUTSIDE_CATEGORY_SEARCH_THRESHOLD) {
            Set<String> known = new HashSet<>();
            pool.forEach(listing -> known.add(listing.getExternalItemId()));
            found.forEach(listing -> known.add(listing.getExternalItemId()));
            if (self != null) {
                known.add(self.getExternalItemId());
            }
            excludeSelf(listingSearchService.searchOutsideCategory(title, brand, categoryId, known), self).stream()
                    .filter(listing ->
                            pool.stream().noneMatch(other -> SimilarListingFilter.isDuplicate(listing, other)))
                    .forEach(found::add);
        }
        return SimilarListingFilter.removeDuplicates(found);
    }

    /** 분석 대상 매물 자신과, 자신과 같은 글(같은 판매자의 반복 등록으로 보이는 매물)을 뺀다. */
    private static List<PlatformListing> excludeSelf(List<PlatformListing> listings, PlatformListing self) {
        if (self == null) {
            return listings;
        }
        return listings.stream()
                .filter(listing -> !Objects.equals(listing.getId(), self.getId()))
                .filter(listing -> !SimilarListingFilter.isDuplicate(listing, self))
                .toList();
    }

    private static List<PlatformListing> merge(List<PlatformListing> pool, List<PlatformListing> found) {
        List<PlatformListing> merged = new ArrayList<>(pool);
        merged.addAll(found);
        return merged;
    }

    /** 결함(하자) 상태를 AI 프롬프트에 넣을 한국어 설명으로 변환한다. */
    private static String defectStatusLabel(DefectStatus defectStatus) {
        return switch (defectStatus) {
            case NORMAL -> "없음";
            case ISSUES -> "있음";
            case UNKNOWN -> "확인 안 됨";
        };
    }

    private static BigDecimal calculateChangeRate(Long previousAveragePrice, long currentAveragePrice) {
        if (previousAveragePrice == null || previousAveragePrice == 0) {
            return null;
        }
        return BigDecimal.valueOf(currentAveragePrice - previousAveragePrice)
                .divide(BigDecimal.valueOf(previousAveragePrice), 4, RoundingMode.HALF_UP);
    }
}
