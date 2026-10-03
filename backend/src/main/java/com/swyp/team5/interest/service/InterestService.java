package com.swyp.team5.interest.service;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import lombok.RequiredArgsConstructor;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.swyp.team5.common.common.CursorPageResponse;
import com.swyp.team5.interest.dto.InterestCreateResponse;
import com.swyp.team5.interest.dto.InterestListItemResponse;
import com.swyp.team5.interest.dto.InterestStatus;
import com.swyp.team5.interest.dto.InterestToggleResponse;
import com.swyp.team5.interest.dto.TargetPriceResponse;
import com.swyp.team5.interest.entity.Interest;
import com.swyp.team5.interest.error.InterestNotFoundException;
import com.swyp.team5.interest.event.InterestRegisteredEvent;
import com.swyp.team5.interest.repository.InterestRepository;
import com.swyp.team5.item.entity.ListingSource;
import com.swyp.team5.member.entity.Member;
import com.swyp.team5.member.repository.MemberRepository;
import com.swyp.team5.productanalysis.entity.ProductAnalysis;
import com.swyp.team5.productanalysis.repository.ProductAnalysisRepository;

@Service
@RequiredArgsConstructor
@Transactional
public class InterestService {

    private final InterestRepository interestRepository;
    private final MemberRepository memberRepository;
    private final ProductAnalysisRepository productAnalysisRepository;
    private final List<InterestRegistrar> registrars;
    private final TargetPriceAlertService targetPriceAlertService;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * 상품 또는 외부 플랫폼 수집 매물을 관심상품으로 등록한다. {@code source}에 맞는
     * {@link InterestRegistrar}에게 대상 검증·중복 검증을 위임한다(새 source 추가 시 이 메서드는
     * 수정하지 않아도 됨). 등록이 커밋되면 대상의 시세 분석을 1회 돌리도록 {@link InterestRegisteredEvent}를 발행한다.
     *
     * @param memberId 요청자 회원 ID
     * @param source 등록 대상 종류(OUR/EXTERNAL)
     * @param targetId {@code source}가 {@code OUR}이면 productId, {@code EXTERNAL}이면 listingId
     * @return 생성된 관심상품 ID
     */
    public InterestCreateResponse register(Long memberId, ListingSource source, Long targetId) {
        Member member = memberRepository.getReferenceById(memberId);
        Interest interest = registrarFor(source).register(member, memberId, targetId);
        Long interestId = interestRepository.save(interest).getId();
        eventPublisher.publishEvent(new InterestRegisteredEvent(targetId));
        return new InterestCreateResponse(interestId);
    }

    /**
     * 관심상품 등록 상태를 뒤집는다. 이미 등록돼 있으면 해제하고, 아니면 {@link #register}와 같은 검증을 거쳐 등록한다(기존 등록·해제
     * API와 별개로 하트 버튼처럼 한 번에 쓰기 위한 용도).
     *
     * @param memberId 요청자 회원 ID
     * @param source 대상 종류(OUR/EXTERNAL)
     * @param targetId {@code source}가 {@code OUR}이면 productId, {@code EXTERNAL}이면 listingId
     * @return 호출 후 등록 상태와 관심상품 ID(해제됐으면 null)
     */
    public InterestToggleResponse toggle(Long memberId, ListingSource source, Long targetId) {
        Optional<Interest> existing = interestRepository
                .findByMemberIdAndItemId(memberId, targetId)
                .filter(interest -> interest.getItem().getSource() == source);
        if (existing.isPresent()) {
            interestRepository.delete(existing.get());
            return InterestToggleResponse.removed();
        }
        return InterestToggleResponse.registered(
                register(memberId, source, targetId).interestId());
    }

    private InterestRegistrar registrarFor(ListingSource source) {
        return registrars.stream()
                .filter(registrar -> registrar.source() == source)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("지원하지 않는 관심상품 등록 대상입니다: " + source));
    }

    /**
     * 인증된 본인의 관심상품 목록을 커서 기반으로 조회한다({@code id} 내림차순 = 등록 최신순). 우리 상품 대상 건은 상품 목록 조회와
     * 동일하게 각 상품의 가장 최근 시세 분석 스냅샷({@code recommendation}/{@code marketAveragePrice})도
     * 함께 포함한다(분석 이력이 없으면 {@code null}). 외부 매물 대상 건도 관심 매물 시세 분석 스냅샷이 있으면 채운다.
     *
     * <p>관심상품 상태({@link InterestStatus} — 구매추천·관찰중·판매종료·분석대기 탭과 1:1)로 거를 수 있다. 필터는 커서보다 먼저
     * 적용하므로 {@code hasNext}·{@code totalCount}는 필터 기준이고, 탭 숫자용 {@code statusCounts}는 필터와 무관하게 관심상품 전체 기준이다.
     *
     * @param memberId 요청자 회원 ID
     * @param statuses 관심상품 상태 필터(비어 있으면 전체)
     * @param cursor 이전 페이지 마지막 관심상품의 {@code interestId}(선택, {@code null}이면 첫 페이지)
     * @param size 페이지 크기
     * @return {@code hasNext}/{@code nextCursor}를 포함한 커서 페이지 응답
     */
    @Transactional(readOnly = true)
    public CursorPageResponse<InterestListItemResponse> getInterests(
            Long memberId, Set<InterestStatus> statuses, Long cursor, int size) {
        // 관찰 상태는 저장하지 않고 계산하므로, 회원 본인 관심상품 전체를 읽어 걸러낸 뒤 커서를 적용한다(회원 단위라 양이 적음)
        List<Interest> all = interestRepository.findAllWithItemByMemberId(memberId);
        Map<Long, ProductAnalysis> analyses = findLatestAnalyses(all);
        Map<Long, ProductAnalysis> listingAnalyses = findLatestListingAnalyses(all);
        List<InterestListItemResponse> items = all.stream()
                .sorted(Comparator.comparing(Interest::getId).reversed())
                .map(interest -> toListItem(interest, analyses, listingAnalyses))
                .toList();
        List<InterestListItemResponse> matched = items.stream()
                .filter(item -> statuses == null || statuses.isEmpty() || statuses.contains(item.interestStatus()))
                .toList();
        List<InterestListItemResponse> pageItems = matched.stream()
                .filter(item -> cursor == null || item.interestId() < cursor)
                .limit(size + 1L)
                .toList();
        // 매 페이지 센다 — 전체 건수는 필터 결과 기준, 상태별 건수는 탭 숫자용이라 필터와 무관하게 관심상품 전체 기준
        return CursorPageResponse.of(pageItems, size, InterestListItemResponse::interestId)
                .withTotalCount(matched.size())
                .withStatusCounts(
                        InterestStatus.countByStatus(items.stream().map(InterestListItemResponse::interestStatus)));
    }

    private static InterestListItemResponse toListItem(
            Interest interest, Map<Long, ProductAnalysis> analyses, Map<Long, ProductAnalysis> listingAnalyses) {
        if (interest.getProduct() == null) {
            ProductAnalysis analysis = listingAnalyses.get(interest.getListing().getId());
            return InterestListItemResponse.fromListing(
                    interest,
                    analysis == null ? null : analysis.getRecommendation(),
                    analysis == null ? null : analysis.getAveragePrice());
        }
        ProductAnalysis analysis = analyses.get(interest.getProduct().getId());
        // 관심 등록한 회원에게는 구매자 관점 추천(BUY/WAIT)을 보여 준다
        return InterestListItemResponse.fromProduct(
                interest,
                analysis == null ? null : analysis.getBuyerViewRecommendation(),
                analysis == null ? null : analysis.getAveragePrice());
    }

    /**
     * 관심상품 목록 중 우리 상품 대상 건들의 가장 최근 시세 분석 스냅샷을 한 번의 쿼리로 조회한다
     * (N+1 방지). 외부 매물 대상 건은 애초에 조회 대상에서 제외된다.
     */
    private Map<Long, ProductAnalysis> findLatestAnalyses(List<Interest> interests) {
        List<Long> productIds = interests.stream()
                .filter(interest -> interest.getProduct() != null)
                .map(interest -> interest.getProduct().getId())
                .toList();
        if (productIds.isEmpty()) {
            return Map.of();
        }
        return productAnalysisRepository.findLatestByItemIdIn(productIds).stream()
                .collect(Collectors.toMap(
                        analysis -> analysis.getItem().getId(),
                        analysis -> analysis,
                        (existing, replacement) -> replacement));
    }

    /** 관심상품 목록 중 외부 매물 대상 건들의 가장 최근 시세 분석 스냅샷을 한 번의 쿼리로 조회한다(N+1 방지). */
    private Map<Long, ProductAnalysis> findLatestListingAnalyses(List<Interest> interests) {
        List<Long> listingIds = interests.stream()
                .filter(interest -> interest.getListing() != null)
                .map(interest -> interest.getListing().getId())
                .toList();
        if (listingIds.isEmpty()) {
            return Map.of();
        }
        return productAnalysisRepository.findLatestByItemIdIn(listingIds).stream()
                .collect(Collectors.toMap(
                        analysis -> analysis.getItem().getId(),
                        analysis -> analysis,
                        (existing, replacement) -> replacement));
    }

    /**
     * 관심상품 등록을 취소한다.
     *
     * @param memberId 요청자 회원 ID
     * @param interestId 취소할 관심상품 ID
     */
    public void delete(Long memberId, Long interestId) {
        Interest interest = getInterestOrThrow(memberId, interestId);
        interestRepository.delete(interest);
    }

    /**
     * 관심상품의 목표가를 설정(재설정)한다. 재설정 시 알림 발송 이력이 초기화된다.
     *
     * @param memberId 요청자 회원 ID
     * @param interestId 대상 관심상품 ID
     * @param targetPrice 새 목표 가격
     * @return 반영된 목표가
     */
    public TargetPriceResponse setTargetPrice(Long memberId, Long interestId, Long targetPrice) {
        Interest interest = getInterestOrThrow(memberId, interestId);
        interest.changeTargetPrice(targetPrice);
        // 이미 목표가 이하인 가격이면 바로 알림
        targetPriceAlertService.check(interest);
        return new TargetPriceResponse(interestId, targetPrice);
    }

    private Interest getInterestOrThrow(Long memberId, Long interestId) {
        return interestRepository.findByIdAndMemberId(interestId, memberId).orElseThrow(InterestNotFoundException::new);
    }
}
