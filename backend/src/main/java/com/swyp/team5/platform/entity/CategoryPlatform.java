package com.swyp.team5.platform.entity;

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

import com.swyp.team5.category.entity.Category;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

/**
 * 우리 {@link Category} ↔ 외부 플랫폼({@link Platform}) 자체 카테고리 ID 매핑. 플랫폼별로 카테고리
 * 체계가 달라 이름 매칭이 안 되는 경우가 많아, 수작업으로 검증된 값만 row로 등록한다.
 */
@Entity
@Table(name = "category_platforms")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CategoryPlatform {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "category_platform_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "platform_id", nullable = false)
    private Platform platform;

    @Column(name = "external_category_id", nullable = false)
    private String externalCategoryId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
