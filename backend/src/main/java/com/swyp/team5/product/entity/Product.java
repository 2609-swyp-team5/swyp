package com.swyp.team5.product.entity;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;

import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import com.swyp.team5.category.entity.Category;
import com.swyp.team5.member.entity.Member;
import com.swyp.team5.tag.entity.Tag;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "products")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "product_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @Column(nullable = false, length = 100)
    private String title; // 상품 제목

    @Column(columnDefinition = "TEXT")
    private String description; // 상품 설명

    @Column(nullable = false)
    private Long price; // 상품 가격

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(nullable = false, columnDefinition = "product_status")
    private ProductStatus status; // 상품 상태

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(nullable = false, columnDefinition = "product_condition")
    private ProductCondition condition; // 상품 상태

    @Column(name = "has_defect", nullable = false)
    private boolean hasDefect; // 상품 결함 여부(하자)

    @Column(name = "allow_price_suggestion", nullable = false)
    private boolean allowPriceSuggestion; // 가격 제안 허용 여부

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "trade_method", nullable = false, columnDefinition = "trade_method")
    private TradeMethod tradeMethod; // 거래 방법(직거래, 택배거래)

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "delivery_type", columnDefinition = "delivery_type")
    private DeliveryType deliveryType; // 배송 방법(택배거래일 경우, 택배 종류)

    @Column(name = "preferred_trade_region", length = 100)
    private String preferredTradeRegion; // 선호 거래 지역(직거래일 경우, 거래 희망 지역)

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("imageOrder ASC")
    private List<ProductImage> images = new ArrayList<>(); // 상품 이미지 목록

    @ManyToMany
    @JoinTable(
            name = "product_tags",
            joinColumns = @JoinColumn(name = "product_id"),
            inverseJoinColumns = @JoinColumn(name = "tag_id"))
    private Set<Tag> tags = new LinkedHashSet<>(); // 상품 태그 목록

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt; // 상품 등록일

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt; // 상품 수정일

    @Builder
    private Product(
            Member member,
            Category category,
            String title,
            String description,
            Long price,
            ProductCondition condition,
            boolean hasDefect,
            boolean allowPriceSuggestion,
            TradeMethod tradeMethod,
            DeliveryType deliveryType,
            String preferredTradeRegion) {
        this.member = member;
        this.category = category;
        this.title = title;
        this.description = description;
        this.price = price;
        this.status = ProductStatus.ON_SALE;
        this.condition = condition;
        this.hasDefect = hasDefect;
        this.allowPriceSuggestion = allowPriceSuggestion;
        this.tradeMethod = tradeMethod;
        this.deliveryType = deliveryType;
        this.preferredTradeRegion = preferredTradeRegion;
    }

    public static Product create(
            Member member,
            Category category,
            String title,
            String description,
            Long price,
            ProductCondition condition,
            boolean hasDefect,
            boolean allowPriceSuggestion,
            TradeMethod tradeMethod,
            DeliveryType deliveryType,
            String preferredTradeRegion,
            List<String> imageUrls,
            Set<Tag> tags) {
        Product product = Product.builder()
                .member(member)
                .category(category)
                .title(title)
                .description(description)
                .price(price)
                .condition(condition)
                .hasDefect(hasDefect)
                .allowPriceSuggestion(allowPriceSuggestion)
                .tradeMethod(tradeMethod)
                .deliveryType(deliveryType)
                .preferredTradeRegion(preferredTradeRegion)
                .build();
        product.replaceImages(imageUrls);
        product.addTags(tags);
        return product;
    }

    public boolean isRegisteredBy(Long memberId) {
        return this.member.getId().equals(memberId);
    }

    public void update(
            Category category,
            String title,
            String description,
            Long price,
            ProductStatus status,
            ProductCondition condition,
            boolean hasDefect,
            boolean allowPriceSuggestion,
            TradeMethod tradeMethod,
            DeliveryType deliveryType,
            String preferredTradeRegion) {
        this.category = category;
        this.title = title;
        this.description = description;
        this.price = price;
        this.status = status;
        this.condition = condition;
        this.hasDefect = hasDefect;
        this.allowPriceSuggestion = allowPriceSuggestion;
        this.tradeMethod = tradeMethod;
        this.deliveryType = deliveryType;
        this.preferredTradeRegion = preferredTradeRegion;
    }

    public void changeStatus(ProductStatus status) {
        this.status = status;
    }

    public void clearImages() {
        this.images.clear();
    }

    public void addImages(List<String> imageUrls) {
        if (imageUrls == null) {
            return;
        }
        for (int i = 0; i < imageUrls.size(); i++) {
            this.images.add(ProductImage.of(imageUrls.get(i), i + 1, this));
        }
    }

    private void replaceImages(List<String> imageUrls) {
        clearImages();
        addImages(imageUrls);
    }

    public void clearTags() {
        this.tags.clear();
    }

    public void addTags(Set<Tag> tags) {
        if (tags == null) {
            return;
        }
        this.tags.addAll(tags);
    }
}
