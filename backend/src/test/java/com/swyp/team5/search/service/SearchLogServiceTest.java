package com.swyp.team5.search.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.domain.Pageable;

import com.swyp.team5.member.entity.Member;
import com.swyp.team5.member.repository.MemberRepository;
import com.swyp.team5.search.entity.SearchLog;
import com.swyp.team5.search.repository.SearchLogRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

// 검색 로그 Service 단위 테스트.
@ExtendWith(MockitoExtension.class)
class SearchLogServiceTest {

    @Mock
    private SearchLogRepository searchLogRepository;

    @Mock
    private MemberRepository memberRepository;

    private SearchLogService service() {
        return new SearchLogService(searchLogRepository, memberRepository);
    }

    // 키워드 검색 로그 기록 성공 - 앞뒤 공백이 제거되어 저장됨
    @Test
    void recordSavesTrimmedKeyword() {
        Member member = Member.ofLocalSignUp("test@example.com", null, "encoded-password", "홍길동", "gildong", null);
        when(memberRepository.getReferenceById(1L)).thenReturn(member);

        service().record(1L, "  아이패드  ", 3L);

        ArgumentCaptor<SearchLog> captor = ArgumentCaptor.forClass(SearchLog.class);
        verify(searchLogRepository).save(captor.capture());
        assertThat(captor.getValue().getKeyword()).isEqualTo("아이패드");
        assertThat(captor.getValue().getMember()).isSameAs(member);
        assertThat(captor.getValue().getResultCount()).isEqualTo(3L);
    }

    // 키워드 검색 로그 기록 무시 - 키워드가 없거나 공백뿐이면 저장하지 않음
    @Test
    void recordIgnoresBlankKeyword() {
        service().record(1L, "   ", 1L);
        service().record(1L, null, 1L);

        verify(searchLogRepository, never()).save(any(SearchLog.class));
        verify(memberRepository, never()).getReferenceById(any());
    }

    // 인기검색어 조회 - 의미 없는 키워드(자모, 영문 한 글자, 기호)는 빼고 빈도순을 유지
    @Test
    void getPopularKeywordsExcludesMeaninglessKeywords() {
        when(searchLogRepository.findPopularKeywords(any(LocalDateTime.class), any(Pageable.class)))
                .thenReturn(List.of("아이패드", "ㅁㄴㅇㅁㄴㅇ", "노트북", "a", "!!", "아이폰ㅋㅋ", "PS5"));

        List<String> result = service().getPopularKeywords();

        assertThat(result).containsExactly("아이패드", "노트북", "PS5");
    }

    // 인기검색어 조회 - 거른 뒤에도 최대 10개까지만
    @Test
    void getPopularKeywordsLimitsToTen() {
        List<String> candidates = java.util.stream.IntStream.rangeClosed(1, 15)
                .mapToObj(i -> "키워드" + i)
                .toList();
        when(searchLogRepository.findPopularKeywords(any(LocalDateTime.class), any(Pageable.class)))
                .thenReturn(candidates);

        assertThat(service().getPopularKeywords()).hasSize(10).first().isEqualTo("키워드1");
    }

    // 의미 있는 키워드 판단 - 한글 음절이 있거나 영문·숫자 두 글자 이상, 자모가 섞이면 제외
    @Test
    void isMeaningfulJudgesKeywords() {
        assertThat(SearchLogService.isMeaningful("아이폰")).isTrue();
        assertThat(SearchLogService.isMeaningful("아이폰 15")).isTrue();
        assertThat(SearchLogService.isMeaningful("ipad")).isTrue();
        assertThat(SearchLogService.isMeaningful("갤럭시")).isTrue();
        assertThat(SearchLogService.isMeaningful("ㅁㄴㅇ")).isFalse();
        assertThat(SearchLogService.isMeaningful("ㅋ아이폰")).isFalse();
        assertThat(SearchLogService.isMeaningful("책")).isTrue();
        assertThat(SearchLogService.isMeaningful("TV")).isTrue();
        assertThat(SearchLogService.isMeaningful("a")).isFalse();
        assertThat(SearchLogService.isMeaningful("a1")).isTrue();
        assertThat(SearchLogService.isMeaningful("a!")).isFalse();
        assertThat(SearchLogService.isMeaningful("!!!")).isFalse();
    }
}
