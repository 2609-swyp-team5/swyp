package com.swyp.team5.product.repository;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Locale;

import lombok.RequiredArgsConstructor;

import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import com.swyp.team5.item.entity.ListingSource;
import com.swyp.team5.product.dto.ProductSearchCondition;
import com.swyp.team5.product.dto.ProductSearchCursor;
import com.swyp.team5.product.dto.ProductSearchHit;
import com.swyp.team5.product.dto.ProductSortType;

/**
 * 상품 목록 조회(통합 검색) 쿼리. 우리 상품과 외부 수집 매물의 공통 부모 {@code items}를 기준으로 출처별 고유 테이블
 * ({@code products}/{@code platform_listings})을 붙여 한 번에 거르고 정렬한다. 정렬은 항상 (정렬값, 등록일시 내림차순,
 * ID 내림차순)이고 커서도 같은 묶음 값을 써서, 가격순·관심순처럼 등록일시가 아닌 값으로 정렬해도 이어서 페이징할 수 있다.
 *
 * <p>여기서는 순서와 커서에 필요한 (출처, ID, 등록일시, 정렬값)만 조회하고, 응답에 필요한 엔티티는 호출 측에서 ID로 다시
 * 읽는다.
 */
@Repository
@RequiredArgsConstructor
public class ProductSearchRepository {

    private static final RowMapper<ProductSearchHit> HIT_MAPPER = (rs, rowNum) -> new ProductSearchHit(
            ListingSource.valueOf(rs.getString("source")),
            rs.getLong("id"),
            rs.getTimestamp("created_at").toLocalDateTime(),
            rs.getObject("sort_key", Long.class));

    /** 거래 상태 필터가 없을 때 외부 매물은 판매중(원본 SELLING)만 보여 준다. */
    private static final String DEFAULT_EXTERNAL_STATUS = "SELLING";

    private final NamedParameterJdbcTemplate jdbcTemplate;

    /**
     * 조건에 맞는 항목을 정렬 순서대로 최대 {@code limit}건 조회한다.
     *
     * @param condition 검색 조건
     * @param cursor 이전 페이지 마지막 항목(첫 페이지면 {@code null})
     * @param limit 최대 조회 건수(다음 페이지 존재 여부 판단을 위해 호출 측은 페이지 크기 + 1을 넘긴다)
     * @return 정렬된 결과(우리 상품·외부 매물 모두 제외되는 조건이면 빈 목록)
     */
    public List<ProductSearchHit> search(ProductSearchCondition condition, ProductSearchCursor cursor, int limit) {
        List<String> sources = sources(condition);
        if (sources.isEmpty()) {
            return List.of();
        }

        MapSqlParameterSource params =
                new MapSqlParameterSource().addValue("limit", limit).addValue("sources", sources);
        String where = whereClause(condition, params);

        // 정렬값은 별칭이라 WHERE에서 바로 쓸 수 없어 한 번 감싼 뒤 커서 조건을 건다.
        String inner = "SELECT i.source AS source, i.item_id AS id, i.created_at AS created_at, "
                + sortKeyExpression(condition.sort()) + " AS sort_key"
                + " FROM items i"
                + " LEFT JOIN products p ON p.product_id = i.item_id"
                + " LEFT JOIN platform_listings l ON l.listing_id = i.item_id"
                + sortJoin(condition.sort())
                + " WHERE " + where;
        String sql = "SELECT * FROM (" + inner + ") b"
                + (cursor == null ? "" : " WHERE " + cursorCondition(condition.sort()))
                + " ORDER BY " + orderBy(condition.sort())
                + " LIMIT :limit";
        addCursorParams(cursor, params);
        return jdbcTemplate.query(sql, params, HIT_MAPPER);
    }

    /**
     * 조건에 맞는 전체 건수를 센다({@link #search}와 같은 조건, 정렬·커서 무관).
     *
     * @return 전체 건수(우리 상품·외부 매물 모두 제외되는 조건이면 0)
     */
    public long count(ProductSearchCondition condition) {
        List<String> sources = sources(condition);
        if (sources.isEmpty()) {
            return 0;
        }
        MapSqlParameterSource params = new MapSqlParameterSource().addValue("sources", sources);
        String sql = "SELECT COUNT(*) FROM items i"
                + " LEFT JOIN products p ON p.product_id = i.item_id"
                + " LEFT JOIN platform_listings l ON l.listing_id = i.item_id"
                + " WHERE " + whereClause(condition, params);
        Long count = jdbcTemplate.queryForObject(sql, params, Long.class);
        return count == null ? 0 : count;
    }

    private static List<String> sources(ProductSearchCondition condition) {
        List<String> sources = new ArrayList<>();
        if (condition.includesOurProducts()) {
            sources.add(ListingSource.OUR.name());
        }
        if (condition.includesExternalListings()) {
            sources.add(ListingSource.EXTERNAL.name());
        }
        return sources;
    }

    private static String whereClause(ProductSearchCondition condition, MapSqlParameterSource params) {
        StringBuilder where = new StringBuilder("i.source IN (:sources)");
        appendKeywordConditions(where, condition, params);
        appendOurProductConditions(where, condition, params);
        appendExternalListingConditions(where, condition, params);
        appendPriceRange(where, condition, params);
        return where.toString();
    }

    /** 키워드는 제목·설명(외부 매물은 설명이 없어 제목만), 제외 키워드는 하나라도 포함되면 제외. */
    private static void appendKeywordConditions(
            StringBuilder where, ProductSearchCondition condition, MapSqlParameterSource params) {
        if (condition.keyword() != null) {
            where.append(" AND (LOWER(i.title) LIKE :keyword ESCAPE '\\'"
                    + " OR LOWER(COALESCE(p.description, '')) LIKE :keyword ESCAPE '\\')");
            params.addValue("keyword", containsPattern(condition.keyword()));
        }
        for (int i = 0; i < condition.excludeKeywords().size(); i++) {
            String name = "exclude" + i;
            where.append(" AND LOWER(i.title) NOT LIKE :")
                    .append(name)
                    .append(" ESCAPE '\\'")
                    .append(" AND LOWER(COALESCE(p.description, '')) NOT LIKE :")
                    .append(name)
                    .append(" ESCAPE '\\'");
            params.addValue(name, containsPattern(condition.excludeKeywords().get(i)));
        }
    }

    /**
     * 우리 상품 고유 필터(상태·거래 상태·등급·하자). 등급·하자·상태 필터가 있으면 출처가 이미 우리 상품으로 좁혀져 있고, 거래
     * 상태는 출처별로 따로 비교한다.
     */
    private static void appendOurProductConditions(
            StringBuilder where, ProductSearchCondition condition, MapSqlParameterSource params) {
        if (!condition.conditions().isEmpty()) {
            where.append(" AND CAST(p.\"condition\" AS VARCHAR) IN (:conditions)");
            params.addValue("conditions", names(condition.conditions()));
        }
        if (!condition.defectStatuses().isEmpty()) {
            where.append(" AND CAST(p.defect_status AS VARCHAR) IN (:defectStatuses)");
            params.addValue("defectStatuses", names(condition.defectStatuses()));
        }
        if (!condition.statuses().isEmpty()) {
            where.append(" AND (i.source <> 'OUR' OR CAST(p.status AS VARCHAR) IN (:ourStatuses))");
            params.addValue("ourStatuses", names(condition.statuses()));
        }
    }

    /** 외부 매물 고유 필터(원본 거래 상태 — 미지정이면 판매중만, 플랫폼). */
    private static void appendExternalListingConditions(
            StringBuilder where, ProductSearchCondition condition, MapSqlParameterSource params) {
        List<String> listingStatuses = condition.statuses().isEmpty()
                ? List.of(DEFAULT_EXTERNAL_STATUS)
                : List.copyOf(condition.externalStatuses());
        // 대응하는 외부 상태가 없으면(예: DRAFT만) 외부 매물은 이미 source에서 빠지므로 조건을 붙이지 않는다(빈 IN 방지)
        if (!listingStatuses.isEmpty()) {
            where.append(" AND (i.source <> 'EXTERNAL' OR l.status IN (:listingStatuses))");
            params.addValue("listingStatuses", listingStatuses);
        }
        if (!condition.externalPlatformNames().isEmpty()) {
            where.append(" AND (i.source <> 'EXTERNAL'"
                    + " OR l.platform_id IN (SELECT platform_id FROM platforms WHERE name IN (:platformNames)))");
            params.addValue("platformNames", condition.externalPlatformNames());
        }
    }

    private static void appendPriceRange(
            StringBuilder where, ProductSearchCondition condition, MapSqlParameterSource params) {
        if (condition.minPrice() != null) {
            where.append(" AND i.price >= :minPrice");
            params.addValue("minPrice", condition.minPrice());
        }
        if (condition.maxPrice() != null) {
            where.append(" AND i.price <= :maxPrice");
            params.addValue("maxPrice", condition.maxPrice());
        }
    }

    /** 정렬 기준별 정렬값 식. 최신순은 정렬값이 없다. */
    private static String sortKeyExpression(ProductSortType sort) {
        return switch (sort) {
            case LATEST -> "CAST(NULL AS BIGINT)";
            case PRICE_HIGH, PRICE_LOW -> "i.price";
            case INTEREST -> "COALESCE(ic.interest_count, 0)";
            case RECOMMENDED -> "CAST(CASE WHEN la.recommendation = 'BUY' THEN 1 ELSE 0 END AS BIGINT)";
        };
    }

    /** 관심순은 관심 등록 수, 추천순은 가장 최근 시세 분석 추천을 붙인다. */
    private static String sortJoin(ProductSortType sort) {
        return switch (sort) {
            case INTEREST -> " LEFT JOIN (SELECT item_id, COUNT(*) AS interest_count FROM interests GROUP BY item_id) ic"
                    + " ON ic.item_id = i.item_id";
            case RECOMMENDED -> " LEFT JOIN (SELECT DISTINCT ON (item_id) item_id, recommendation FROM product_analysis"
                    + " ORDER BY item_id, analyzed_at DESC, analysis_id DESC) la ON la.item_id = i.item_id";
            default -> "";
        };
    }

    private static String orderBy(ProductSortType sort) {
        String tieBreak = "created_at DESC, id DESC";
        return switch (sort) {
            case LATEST -> tieBreak;
            case PRICE_LOW -> "sort_key ASC, " + tieBreak;
            case PRICE_HIGH, INTEREST, RECOMMENDED -> "sort_key DESC, " + tieBreak;
        };
    }

    /** 커서 항목보다 뒤에 오는 행만 남기는 조건({@link #orderBy}와 같은 순서). */
    private static String cursorCondition(ProductSortType sort) {
        String tieBreak = "(created_at, id) < (:cursorCreatedAt, :cursorId)";
        return switch (sort) {
            case LATEST -> tieBreak;
            case PRICE_LOW -> "(sort_key > :cursorSortKey OR (sort_key = :cursorSortKey AND " + tieBreak + "))";
            case PRICE_HIGH, INTEREST, RECOMMENDED -> "(sort_key < :cursorSortKey OR (sort_key = :cursorSortKey AND "
                    + tieBreak + "))";
        };
    }

    private static void addCursorParams(ProductSearchCursor cursor, MapSqlParameterSource params) {
        if (cursor == null) {
            return;
        }
        params.addValue("cursorSortKey", cursor.sortKey())
                .addValue("cursorCreatedAt", cursor.createdAt())
                .addValue("cursorId", cursor.id());
    }

    private static List<String> names(Collection<? extends Enum<?>> values) {
        return values.stream().map(Enum::name).toList();
    }

    /** 부분 일치 LIKE 패턴(소문자, {@code %}·{@code _}·{@code \}는 문자 그대로 검색되도록 이스케이프). */
    private static String containsPattern(String word) {
        String escaped = word.toLowerCase(Locale.ROOT)
                .replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_");
        return "%" + escaped + "%";
    }
}
