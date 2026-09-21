package com.swyp.team5.interest.service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.swyp.team5.interest.dto.InterestCreateResponse;
import com.swyp.team5.interest.dto.InterestListItemResponse;
import com.swyp.team5.interest.dto.TargetPriceResponse;
import com.swyp.team5.interest.entity.Interest;
import com.swyp.team5.interest.error.InterestNotFoundException;
import com.swyp.team5.interest.repository.InterestRepository;
import com.swyp.team5.member.entity.Member;
import com.swyp.team5.member.repository.MemberRepository;
import com.swyp.team5.product.dto.ListingSource;
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

    /**
     * 상품 또는 외부 플랫폼 수집 매물을 관심상품으로 등록한다. {@code source}에 맞는
     * {@link InterestRegistrar}에게 대상 검증·중복 검증을 위임한다(새 source 추가 시 이 메서드는
     * 수정하지 않아도 됨).
     *
     * @param memberId 요청자 회원 ID
     * @param source 등록 대상 종류(OUR/EXTERNAL)
     * @param targetId {@code source}가 {@code OUR}이면 productId, {@code EXTERNAL}이면 listingId
     * @return 생성된 관심상품 ID
     */
    public InterestCreateResponse register(Long memberId, ListingSource source, Long targetId) {
        Member member = memberRepository.getReferenceById(memberId);
        Interest interest = registrarFor(source).register(member, memberId, targetId);
        return new InterestCreateResponse(interestRepository.save(interest).getId());
    }

    private InterestRegistrar registrarFor(ListingSource source) {
        return registrars.stream()
                .filter(registrar -> registrar.source() == source)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("지원하지 않는 관심상품 등록 대상입니다: " + source));
    }

    /**
     * 인증된 본인의 관심상품 목록을 조회한다. 등록일시 내림차순. 우리 상품 대상 건은 상품 목록 조회와
     * 동일하게 각 상품의 가장 최근 시세 분석 스냅샷({@code recommendation}/{@code marketAveragePrice})도
     * 함께 포함한다(분석 이력이 없으면 {@code null}). 외부 매물 대상 건은 둘 다 항상 {@code null}이다.
     *
     * @param memberId 요청자 회원 ID
     * @param page 페이지 번호(0-base)
     * @param size 페이지 크기
     * @return 관심상품 목록
     */
    @Transactional(readOnly = true)
    public List<InterestListItemResponse> getInterests(Long memberId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        List<Interest> interests =
                interestRepository.findByMemberId(memberId, pageable).getContent();
        Map<Long, ProductAnalysis> analyses = findLatestAnalyses(interests);
        return interests.stream()
                .map(interest -> {
                    if (interest.getProduct() == null) {
                        return InterestListItemResponse.fromListing(interest);
                    }
                    ProductAnalysis analysis =
                            analyses.get(interest.getProduct().getId());
                    return InterestListItemResponse.fromProduct(
                            interest,
                            analysis == null ? null : analysis.getRecommendation(),
                            analysis == null ? null : analysis.getAveragePrice());
                })
                .toList();
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
        return productAnalysisRepository.findLatestByProductIdIn(productIds).stream()
                .collect(Collectors.toMap(
                        analysis -> analysis.getProduct().getId(),
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
        return new TargetPriceResponse(interestId, targetPrice);
    }

    private Interest getInterestOrThrow(Long memberId, Long interestId) {
        return interestRepository.findByIdAndMemberId(interestId, memberId).orElseThrow(InterestNotFoundException::new);
    }
}
