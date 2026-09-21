package com.swyp.team5.search.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import com.swyp.team5.member.entity.Member;
import org.hibernate.annotations.CreationTimestamp;

/**
 * 상품 목록 키워드 검색 요청 1건의 로그. 인기검색어 집계에 사용한다. {@code member}는 nullable —
 * 현재는 인증된 요청만 존재해 항상 채워지지만, 비회원 조회가 추가돼도 스키마 변경 없이 수용하기 위함.
 */
@Entity
@Table(name = "search_logs")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SearchLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "search_log_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id")
    private Member member;

    @Column(nullable = false)
    private String keyword;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private SearchLog(Member member, String keyword) {
        this.member = member;
        this.keyword = keyword;
    }

    public static SearchLog of(Member member, String keyword) {
        return new SearchLog(member, keyword);
    }
}
