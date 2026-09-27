package com.swyp.team5.category.entity;

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

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Formula;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "categories")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "category_id")
    private Long id;

    @Column(nullable = false, length = 50)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private Category parent;

    // 하위 카테고리 존재 여부. 상품은 최하위(리프) 카테고리에만 등록할 수 있다(번개장터 등록 화면이 최하위까지 선택을 요구)
    @Getter(AccessLevel.NONE)
    @Formula("(exists (select 1 from categories child where child.parent_id = category_id))")
    private boolean hasChildren;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public boolean isLeaf() {
        return !hasChildren;
    }
}
