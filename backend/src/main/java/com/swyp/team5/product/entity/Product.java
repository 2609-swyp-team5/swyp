package com.swyp.team5.product.entity;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrimaryKeyJoinColumn;
import jakarta.persistence.Table;

import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import com.swyp.team5.category.entity.Category;
import com.swyp.team5.component.entity.Component;
import com.swyp.team5.item.entity.Item;
import com.swyp.team5.item.entity.ListingSource;
import com.swyp.team5.member.entity.Member;
import com.swyp.team5.tag.entity.Tag;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

/**
 * 상품(중고 물건) 엔티티. 판매자가 등록한 물건 한 건을 나타내며, 이미지·태그와 함께 관리된다.
 */
@Entity
@Table(name = "products")
@DiscriminatorValue("OUR")
@PrimaryKeyJoinColumn(name = "product_id")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Product extends Item {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @Column(length = 50)
    private String brand; // 브랜드(선택)

    @Column(columnDefinition = "TEXT")
    private String description; // 상품 설명

    @Column(name = "suggested_price")
    private Long suggestedPrice; // AI 제안가(AI 사진 분석 추정가 — 시세 분석 적정가는 product_analysis에 따로 저장)

    @Column(name = "analysis_description", columnDefinition = "TEXT")
    private String analysisDescription; // 등록 시 AI 사진 분석의 상태 등급/제안가 판단 근거(시세 분석으로는 바뀌지 않음)

    @Column(name = "target_price")
    private Long targetPrice; // 판매자 목표 판매가(선택, 최근 시세 분석 평균가가 이 값 이상이면 알림)

    @Column(name = "target_price_notified_at")
    private LocalDateTime targetPriceNotifiedAt; // 목표 판매가 도달 알림을 보낸 시각(같은 도달로 다시 보내지 않음)

    @Column(name = "view_count", nullable = false)
    private long viewCount; // 조회수(판매자 본인 제외, 회원당 24시간 1회 — 증가는 ProductRepository.incrementViewCount)

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(nullable = false, columnDefinition = "product_status")
    private ProductStatus status; // 상품 판매 상태(등록 시 DRAFT, 외부 플랫폼 게시 시 ON_SALE)

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(nullable = false, columnDefinition = "product_condition")
    private ProductCondition condition; // 상품 상태

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "defect_status", nullable = false, columnDefinition = "defect_status")
    private DefectStatus defectStatus; // 상품 결함(하자) 상태

    @Column(name = "purchased_at")
    private LocalDate purchasedAt; // 구매 일시(선택)

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

    @ManyToMany
    @JoinTable(
            name = "product_components",
            joinColumns = @JoinColumn(name = "product_id"),
            inverseJoinColumns = @JoinColumn(name = "component_id"))
    private Set<Component> components = new LinkedHashSet<>(); // 상품 구성품 목록

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt; // 상품 수정일

    @Builder
    private Product(
            Member member,
            Category category,
            String title,
            String brand,
            String description,
            Long price,
            ProductCondition condition,
            DefectStatus defectStatus,
            LocalDate purchasedAt,
            boolean allowPriceSuggestion,
            TradeMethod tradeMethod,
            DeliveryType deliveryType,
            String preferredTradeRegion) {
        super(category, title, price);
        this.member = member;
        this.brand = brand;
        this.description = description;
        this.status = ProductStatus.DRAFT;
        this.condition = condition;
        this.defectStatus = defectStatus;
        this.purchasedAt = purchasedAt;
        this.allowPriceSuggestion = allowPriceSuggestion;
        this.tradeMethod = tradeMethod;
        this.deliveryType = deliveryType;
        this.preferredTradeRegion = preferredTradeRegion;
    }

    /**
     * 신규 상품을 생성한다. 이미지는 전달된 순서대로 {@code image_order}가 부여되고, 태그/구성품은
     * 전달된 {@link Tag}/{@link Component} 집합이 그대로 연결된다.
     *
     * @param imageUrls 이미 업로드된 이미지 URL 목록(등록 순서대로 저장)
     * @param tags 연결할 태그 목록
     * @param components 연결할 구성품 목록
     * @return 생성된 상품
     */
    public static Product create(
            Member member,
            Category category,
            String title,
            String brand,
            String description,
            Long price,
            ProductCondition condition,
            DefectStatus defectStatus,
            LocalDate purchasedAt,
            boolean allowPriceSuggestion,
            TradeMethod tradeMethod,
            DeliveryType deliveryType,
            String preferredTradeRegion,
            List<String> imageUrls,
            Set<Tag> tags,
            Set<Component> components) {
        Product product = Product.builder()
                .member(member)
                .category(category)
                .title(title)
                .brand(brand)
                .description(description)
                .price(price)
                .condition(condition)
                .defectStatus(defectStatus)
                .purchasedAt(purchasedAt)
                .allowPriceSuggestion(allowPriceSuggestion)
                .tradeMethod(tradeMethod)
                .deliveryType(deliveryType)
                .preferredTradeRegion(preferredTradeRegion)
                .build();
        product.replaceImages(imageUrls);
        product.addTags(tags);
        product.addComponents(components);
        return product;
    }

    /**
     * 이 상품이 주어진 회원에 의해 등록된 상품인지 확인한다.
     *
     * @param memberId 확인할 회원 ID
     * @return 이 상품을 등록한 회원이면 {@code true}
     */
    @Override
    public ListingSource getSource() {
        return ListingSource.OUR;
    }

    public boolean isRegisteredBy(Long memberId) {
        return this.member.getId().equals(memberId);
    }

    /**
     * 상품 정보를 전달된 값으로 전체 갱신한다. 이미지·태그·구성품은 이 메소드로 갱신되지 않으므로
     * {@link #addImages}/{@link #clearImages}, {@link #addTags}/{@link #clearTags},
     * {@link #addComponents}/{@link #clearComponents}를 별도로 호출해야 한다.
     * 구매 일시({@code purchasedAt})는 호출 측이 수정 시점 기준으로 다시 계산한 값을 넘긴다.
     */
    public void update(
            Category category,
            String title,
            String brand,
            String description,
            Long price,
            ProductStatus status,
            ProductCondition condition,
            DefectStatus defectStatus,
            LocalDate purchasedAt,
            boolean allowPriceSuggestion,
            TradeMethod tradeMethod,
            DeliveryType deliveryType,
            String preferredTradeRegion) {
        changeItemInfo(category, title, price);
        this.brand = brand;
        this.description = description;
        this.status = status;
        this.condition = condition;
        this.defectStatus = defectStatus;
        this.purchasedAt = purchasedAt;
        this.allowPriceSuggestion = allowPriceSuggestion;
        this.tradeMethod = tradeMethod;
        this.deliveryType = deliveryType;
        this.preferredTradeRegion = preferredTradeRegion;
    }

    /**
     * 구매 일시로부터 오늘까지 경과한 개월 수를 계산한다(응답용, 조회할 때마다 다시 계산).
     *
     * @return 구매 일시가 없으면 {@code null}
     */
    public Integer calculatePurchasedMonths() {
        return purchasedAt == null ? null : (int) ChronoUnit.MONTHS.between(purchasedAt, LocalDate.now());
    }

    /**
     * AI 제안가를 변경한다. 사용자 수정({@link #update})으로는 바뀌지 않는 값이다.
     *
     * @param suggestedPrice AI가 추정한 적정가({@code null}이면 제안가 없음)
     */
    public void changeSuggestedPrice(Long suggestedPrice) {
        this.suggestedPrice = suggestedPrice;
    }

    /**
     * 등록 시 AI 사진 분석의 판단 근거를 기록한다. 사용자 수정({@link #update})이나 시세 분석으로는 바뀌지 않는 값이다.
     *
     * @param analysisDescription AI가 상태 등급/제안가를 그렇게 판단한 근거({@code null}이면 근거 없음)
     */
    public void changeAnalysisDescription(String analysisDescription) {
        this.analysisDescription = analysisDescription;
    }

    /**
     * 목표 판매가를 설정한다({@code null}이면 해제). 이미 도달 알림을 보냈고 새 목표가로도 여전히 도달 상태면 기록을 유지해 같은
     * 도달로 다시 알리지 않는다. 해제하거나 아직 도달하지 않은 목표가로 바꾸면 기록을 지워 도달할 때 다시 알린다.
     *
     * @param averagePrice 비교 기준인 최근 시세 분석 평균가(분석이 없으면 {@code null})
     */
    public void changeTargetPrice(Long targetPrice, Long averagePrice) {
        this.targetPrice = targetPrice;
        boolean stillReached = targetPrice != null && averagePrice != null && averagePrice >= targetPrice;
        if (!stillReached) {
            this.targetPriceNotifiedAt = null;
        }
    }

    /** 목표 판매가 도달 알림을 보냈다고 기록한다. */
    public void markTargetPriceNotified(LocalDateTime notifiedAt) {
        this.targetPriceNotifiedAt = notifiedAt;
    }

    /** 평균가가 목표가 아래로 내려가 알림 기록을 지운다(다음에 다시 오르면 다시 알림). */
    public void resetTargetPriceNotified() {
        this.targetPriceNotifiedAt = null;
    }

    /**
     * 상품 게시 상태를 변경한다.
     *
     * @param status 변경할 상태
     */
    public void changeStatus(ProductStatus status) {
        this.status = status;
    }

    /** 외부 플랫폼에 게시되면 호출한다. 아직 {@link ProductStatus#DRAFT}일 때만 판매중으로 바꾸고, 품절 상태는 그대로 둔다. */
    public void markOnSaleIfDraft() {
        if (this.status == ProductStatus.DRAFT) {
            this.status = ProductStatus.ON_SALE;
        }
    }

    /** 등록된 이미지를 모두 제거한다. */
    public void clearImages() {
        this.images.clear();
    }

    /**
     * 이미지를 순서대로 추가한다. {@code imageUrls}가 {@code null}이면 아무 동작도 하지 않는다.
     *
     * @param imageUrls 추가할 이미지 URL 목록(순서대로 {@code image_order} 1부터 부여)
     */
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

    /** 연결된 태그를 모두 제거한다. */
    public void clearTags() {
        this.tags.clear();
    }

    /**
     * 태그를 추가한다. {@code tags}가 {@code null}이면 아무 동작도 하지 않는다.
     *
     * @param tags 추가할 태그 목록
     */
    public void addTags(Set<Tag> tags) {
        if (tags == null) {
            return;
        }
        this.tags.addAll(tags);
    }

    /** 연결된 구성품을 모두 제거한다. */
    public void clearComponents() {
        this.components.clear();
    }

    /**
     * 구성품을 추가한다. {@code components}가 {@code null}이면 아무 동작도 하지 않는다.
     *
     * @param components 추가할 구성품 목록
     */
    public void addComponents(Set<Component> components) {
        if (components == null) {
            return;
        }
        this.components.addAll(components);
    }
}
