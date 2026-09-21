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

        service().record(1L, "  아이패드  ");

        ArgumentCaptor<SearchLog> captor = ArgumentCaptor.forClass(SearchLog.class);
        verify(searchLogRepository).save(captor.capture());
        assertThat(captor.getValue().getKeyword()).isEqualTo("아이패드");
        assertThat(captor.getValue().getMember()).isSameAs(member);
    }

    // 키워드 검색 로그 기록 무시 - 키워드가 없거나 공백뿐이면 저장하지 않음
    @Test
    void recordIgnoresBlankKeyword() {
        service().record(1L, "   ");
        service().record(1L, null);

        verify(searchLogRepository, never()).save(any(SearchLog.class));
        verify(memberRepository, never()).getReferenceById(any());
    }

    // 인기검색어 조회 - 레포지토리 결과를 그대로 위임
    @Test
    void getPopularKeywordsDelegatesToRepository() {
        when(searchLogRepository.findPopularKeywords(any(LocalDateTime.class), any(Pageable.class)))
                .thenReturn(List.of("아이패드", "노트북"));

        List<String> result = service().getPopularKeywords();

        assertThat(result).containsExactly("아이패드", "노트북");
    }
}
