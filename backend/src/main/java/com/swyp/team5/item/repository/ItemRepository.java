package com.swyp.team5.item.repository;

import java.time.LocalDateTime;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import com.swyp.team5.item.entity.AnalysisSkipReason;
import com.swyp.team5.item.entity.Item;

public interface ItemRepository extends JpaRepository<Item, Long> {

    /** 시세 분석을 건너뛴 사유·시각을 기록한다(분석은 엔티티가 분리된 상태로 돌아 JPQL UPDATE로 바꾼다). */
    @Transactional
    @Modifying
    @Query("UPDATE Item i SET i.analysisSkipReason = :reason, i.analysisSkippedAt = :skippedAt WHERE i.id = :itemId")
    int recordAnalysisSkip(
            @Param("itemId") Long itemId,
            @Param("reason") AnalysisSkipReason reason,
            @Param("skippedAt") LocalDateTime skippedAt);

    /** 시세 분석에 성공하면 건너뛴 사유를 비운다. */
    @Transactional
    @Modifying
    @Query("UPDATE Item i SET i.analysisSkipReason = NULL, i.analysisSkippedAt = NULL "
            + "WHERE i.id = :itemId AND i.analysisSkipReason IS NOT NULL")
    int clearAnalysisSkip(@Param("itemId") Long itemId);
}
