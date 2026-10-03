package com.swyp.team5.search.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.regex.Pattern;

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
    // 의미 없는 키워드를 걸러낸 뒤에도 10개를 채우도록 넉넉히 가져온다
    private static final int POPULAR_CANDIDATE_LIMIT = 50;
    private static final Pattern HANGUL_JAMO = Pattern.compile("[ㄱ-ㅎㅏ-ㅣ]");
    private static final Pattern HANGUL_SYLLABLE = Pattern.compile("[가-힣]");
    private static final Pattern ALPHANUMERIC = Pattern.compile("[A-Za-z0-9]");

    private final SearchLogRepository searchLogRepository;
    private final MemberRepository memberRepository;

    /**
     * 키워드 검색 요청 1건을 로그로 남긴다. 키워드가 없거나 공백뿐이면 아무것도 하지 않는다.
     *
     * @param memberId 요청자 회원 ID(비로그인 검색이면 null)
     * @param keyword 검색 키워드
     * @param resultCount 검색 결과 전체 건수(0건이면 인기검색어 집계에서 빠짐)
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(Long memberId, String keyword, long resultCount) {
        if (keyword == null || keyword.isBlank()) {
            return;
        }
        Member member = memberId == null ? null : memberRepository.getReferenceById(memberId);
        searchLogRepository.save(SearchLog.of(member, keyword.strip(), resultCount));
    }

    /**
     * 최근 {@value #POPULAR_WINDOW_DAYS}일간 검색 빈도 상위 {@value #POPULAR_LIMIT}개 키워드를
     * 빈도 내림차순으로 조회한다. 결과가 0건이었던 검색과 의미 없는 키워드({@link #isMeaningful})는 뺀다.
     *
     * @return 인기검색어 목록(빈도 내림차순, 순위는 배열 순서로 표현)
     */
    @Transactional(readOnly = true)
    public List<String> getPopularKeywords() {
        LocalDateTime since = LocalDateTime.now().minusDays(POPULAR_WINDOW_DAYS);
        return searchLogRepository.findPopularKeywords(since, PageRequest.of(0, POPULAR_CANDIDATE_LIMIT)).stream()
                .filter(SearchLogService::isMeaningful)
                .limit(POPULAR_LIMIT)
                .toList();
    }

    /**
     * 인기검색어로 보여줄 만한 키워드인지 판단한다. 한글 자모(ㄱ·ㅏ 등)가 섞여 있지 않고, 한글 음절이 있거나 영문·숫자가
     * 두 글자 이상이어야 한다(예: "ㅁㄴㅇ", "ㅋㅋ", "!!", "a"는 제외, "책", "TV"는 포함).
     */
    static boolean isMeaningful(String keyword) {
        String value = keyword.strip();
        if (HANGUL_JAMO.matcher(value).find()) {
            return false;
        }
        return HANGUL_SYLLABLE.matcher(value).find()
                || ALPHANUMERIC.matcher(value).results().limit(2).count() == 2;
    }
}
