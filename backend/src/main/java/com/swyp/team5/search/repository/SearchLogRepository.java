package com.swyp.team5.search.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.swyp.team5.search.entity.SearchLog;

public interface SearchLogRepository extends JpaRepository<SearchLog, Long> {

    /** 결과가 0건이었던 검색은 빼고 센다(결과 건수를 기록하기 전 로그는 null이라 포함). */
    @Query(
            """
            SELECT s.keyword FROM SearchLog s
            WHERE s.createdAt >= :since AND (s.resultCount IS NULL OR s.resultCount > 0)
            GROUP BY s.keyword ORDER BY COUNT(s) DESC
            """)
    List<String> findPopularKeywords(@Param("since") LocalDateTime since, Pageable pageable);
}
