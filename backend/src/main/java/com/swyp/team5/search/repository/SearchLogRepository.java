package com.swyp.team5.search.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.swyp.team5.search.entity.SearchLog;

public interface SearchLogRepository extends JpaRepository<SearchLog, Long> {

    @Query("SELECT s.keyword FROM SearchLog s WHERE s.createdAt >= :since GROUP BY s.keyword ORDER BY COUNT(s) DESC")
    List<String> findPopularKeywords(@Param("since") LocalDateTime since, Pageable pageable);
}
