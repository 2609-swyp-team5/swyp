package com.swyp.team5.search.service;

import java.time.LocalDateTime;
import java.util.List;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.swyp.team5.member.entity.Member;
import com.swyp.team5.member.repository.MemberRepository;
import com.swyp.team5.search.entity.SearchLog;
import com.swyp.team5.search.repository.SearchLogRepository;

/**
 * 상품 목록 키워드 검색 로그 기록 및 인기검색어 집계를 담당하는 서비스.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class SearchLogService {

    private static final int POPULAR_WINDOW_DAYS = 7;
    private static final int POPULAR_LIMIT = 10;

    private final SearchLogRepository searchLogRepository;
    private final MemberRepository memberRepository;

    /**
     * 키워드 검색 요청 1건을 로그로 남긴다. 키워드가 없거나 공백뿐이면 아무것도 하지 않는다.
     *
     * @param memberId 요청자 회원 ID(비회원 확장 대비 nullable)
     * @param keyword 검색 키워드
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(Long memberId, String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return;
        }
        Member member = memberId == null ? null : memberRepository.getReferenceById(memberId);
        searchLogRepository.save(SearchLog.of(member, keyword.strip()));
    }

    /**
     * 최근 {@value #POPULAR_WINDOW_DAYS}일간 검색 빈도 상위 {@value #POPULAR_LIMIT}개 키워드를
     * 빈도 내림차순으로 조회한다.
     *
     * @return 인기검색어 목록(빈도 내림차순, 순위는 배열 순서로 표현)
     */
    @Transactional(readOnly = true)
    public List<String> getPopularKeywords() {
        LocalDateTime since = LocalDateTime.now().minusDays(POPULAR_WINDOW_DAYS);
        return searchLogRepository.findPopularKeywords(since, PageRequest.of(0, POPULAR_LIMIT));
    }
}
