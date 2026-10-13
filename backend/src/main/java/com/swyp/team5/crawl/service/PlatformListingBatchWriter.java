package com.swyp.team5.crawl.service;

import java.sql.Array;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import lombok.extern.slf4j.Slf4j;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import com.swyp.team5.platform.entity.Platform;

/**
 * 한 번의 수집에서 모은 외부 매물을 {@code (platform, externalItemId)} 기준으로 한꺼번에 upsert한다. 매물마다 조회·저장하면 수집이
 * 도는 내내(수 분~십여 분) DB가 깨어 있어 Neon 컴퓨트 시간이 늘어나므로, 수집을 다 마친 뒤 {@value #CHUNK_SIZE}건씩 묶어 짧은
 * 트랜잭션으로 저장한다(묶음마다 조회 1 + 갱신 2 + ID 발급 1 + 추가 2 = SQL 6회).
 *
 * <p>JOINED 상속({@code items} + {@code platform_listings})이고 ID가 IDENTITY라 JPA로는 일괄 추가가 안 돼 JDBC로 쓴다. 새 매물 ID는
 * {@code items} 시퀀스에서 미리 받아 두 테이블에 같은 값으로 넣는다. 저장 값은 {@link PlatformListingUpserter#upsert}와 같다(이미
 * 있는 매물은 카테고리·제목·가격·상태·이미지·URL·마지막 관측 시각 갱신). 같은 시각에 키워드 검색이 같은 매물을 먼저 넣어 유니크
 * 제약에 걸리면 그 묶음만 한 건씩 저장으로 다시 처리한다.
 */
@Slf4j
@Component
public class PlatformListingBatchWriter {

    static final int CHUNK_SIZE = 1000;

    private static final String FIND_EXISTING_SQL =
            "SELECT listing_id, external_item_id FROM platform_listings WHERE platform_id = ? AND external_item_id = ANY(?)";

    private static final String UPDATE_ITEMS_SQL =
            """
            UPDATE items i SET category_id = u.category_id, title = u.title, price = u.price
            FROM unnest(?::bigint[], ?::bigint[], ?::varchar[], ?::bigint[]) AS u(item_id, category_id, title, price)
            WHERE i.item_id = u.item_id
            """;

    private static final String UPDATE_LISTINGS_SQL =
            """
            UPDATE platform_listings l
            SET status = u.status, image_url = u.image_url, listing_url = u.listing_url, last_seen_at = ?
            FROM unnest(?::bigint[], ?::varchar[], ?::text[], ?::text[]) AS u(listing_id, status, image_url, listing_url)
            WHERE l.listing_id = u.listing_id
            """;

    private static final String NEXT_IDS_SQL =
            "SELECT nextval(pg_get_serial_sequence('items', 'item_id')) FROM generate_series(1, ?)";

    private static final String INSERT_ITEMS_SQL =
            """
            INSERT INTO items (item_id, source, category_id, title, price, created_at)
            SELECT u.item_id, 'EXTERNAL', u.category_id, u.title, u.price, ?
            FROM unnest(?::bigint[], ?::bigint[], ?::varchar[], ?::bigint[]) AS u(item_id, category_id, title, price)
            """;

    private static final String INSERT_LISTINGS_SQL =
            """
            INSERT INTO platform_listings (listing_id, platform_id, external_item_id, status, image_url, listing_url, last_seen_at)
            SELECT u.listing_id, ?, u.external_item_id, u.status, u.image_url, u.listing_url, ?
            FROM unnest(?::bigint[], ?::varchar[], ?::varchar[], ?::text[], ?::text[])
                AS u(listing_id, external_item_id, status, image_url, listing_url)
            """;

    private final JdbcTemplate jdbcTemplate;
    private final TransactionTemplate transactionTemplate;
    private final PlatformListingUpserter platformListingUpserter;

    public PlatformListingBatchWriter(
            JdbcTemplate jdbcTemplate,
            TransactionTemplate transactionTemplate,
            PlatformListingUpserter platformListingUpserter) {
        this.jdbcTemplate = jdbcTemplate;
        this.transactionTemplate = transactionTemplate;
        this.platformListingUpserter = platformListingUpserter;
    }

    /**
     * 모은 매물을 저장한다. 같은 매물 ID가 여러 번 있으면 마지막 관측값을 쓴다.
     *
     * @param platform 수집한 플랫폼
     * @param observations 관측한 매물(수집 순서)
     * @return 새로 추가한 수·갱신한 수
     */
    public Result write(Platform platform, List<ListingObservation> observations) {
        Map<String, ListingObservation> latest = new LinkedHashMap<>();
        observations.forEach(observation -> latest.put(observation.externalItemId(), observation));
        List<ListingObservation> unique = new ArrayList<>(latest.values());
        int inserted = 0;
        int updated = 0;
        for (int from = 0; from < unique.size(); from += CHUNK_SIZE) {
            List<ListingObservation> chunk = unique.subList(from, Math.min(from + CHUNK_SIZE, unique.size()));
            Result result;
            try {
                result = transactionTemplate.execute(status -> writeChunk(platform.getId(), chunk));
            } catch (DataIntegrityViolationException e) {
                log.warn("외부 매물 일괄 저장 중 유니크 충돌({}건 묶음) — 한 건씩 다시 저장합니다. 원인: {}", chunk.size(), e.getMessage());
                result = writeOneByOne(platform, chunk);
            }
            inserted += result.inserted();
            updated += result.updated();
        }
        return new Result(inserted, updated);
    }

    private Result writeChunk(Long platformId, List<ListingObservation> chunk) {
        LocalDateTime now = LocalDateTime.now();
        Map<String, Long> existingIds = findExistingIds(platformId, chunk);
        List<ListingObservation> toUpdate = new ArrayList<>();
        List<Long> updateIds = new ArrayList<>();
        List<ListingObservation> toInsert = new ArrayList<>();
        for (ListingObservation observation : chunk) {
            Long id = existingIds.get(observation.externalItemId());
            if (id == null) {
                toInsert.add(observation);
            } else {
                toUpdate.add(observation);
                updateIds.add(id);
            }
        }
        if (!toUpdate.isEmpty()) {
            updateItems(UPDATE_ITEMS_SQL, updateIds, toUpdate, null);
            updateListings(updateIds, toUpdate, now);
        }
        if (!toInsert.isEmpty()) {
            List<Long> newIds = jdbcTemplate.queryForList(NEXT_IDS_SQL, Long.class, toInsert.size());
            updateItems(INSERT_ITEMS_SQL, newIds, toInsert, now);
            insertListings(platformId, newIds, toInsert, now);
        }
        return new Result(toInsert.size(), toUpdate.size());
    }

    private Map<String, Long> findExistingIds(Long platformId, List<ListingObservation> chunk) {
        Map<String, Long> ids = new HashMap<>();
        jdbcTemplate.query(
                connection -> {
                    PreparedStatement statement = connection.prepareStatement(FIND_EXISTING_SQL);
                    statement.setLong(1, platformId);
                    statement.setArray(
                            2,
                            textArray(
                                    connection,
                                    chunk.stream()
                                            .map(ListingObservation::externalItemId)
                                            .toList()));
                    return statement;
                },
                row -> {
                    ids.put(row.getString("external_item_id"), row.getLong("listing_id"));
                });
        return ids;
    }

    // items 갱신(createdAt = null)과 추가(createdAt = 최초 수집 시각)는 같은 순서의 배열 4개를 받는다
    private void updateItems(String sql, List<Long> ids, List<ListingObservation> rows, LocalDateTime createdAt) {
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(sql);
            int index = 1;
            if (createdAt != null) {
                statement.setTimestamp(index++, Timestamp.valueOf(createdAt));
            }
            statement.setArray(index++, bigintArray(connection, ids));
            statement.setArray(
                    index++,
                    bigintArray(
                            connection,
                            rows.stream().map(row -> row.category().getId()).toList()));
            statement.setArray(
                    index++,
                    textArray(
                            connection,
                            rows.stream().map(ListingObservation::title).toList()));
            statement.setArray(
                    index,
                    bigintArray(
                            connection,
                            rows.stream().map(ListingObservation::price).toList()));
            return statement;
        });
    }

    private void updateListings(List<Long> ids, List<ListingObservation> rows, LocalDateTime now) {
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(UPDATE_LISTINGS_SQL);
            statement.setTimestamp(1, Timestamp.valueOf(now));
            statement.setArray(2, bigintArray(connection, ids));
            statement.setArray(
                    3,
                    textArray(
                            connection,
                            rows.stream().map(ListingObservation::status).toList()));
            statement.setArray(
                    4,
                    textArray(
                            connection,
                            rows.stream().map(ListingObservation::imageUrl).toList()));
            statement.setArray(
                    5,
                    textArray(
                            connection,
                            rows.stream().map(ListingObservation::listingUrl).toList()));
            return statement;
        });
    }

    private void insertListings(Long platformId, List<Long> ids, List<ListingObservation> rows, LocalDateTime now) {
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(INSERT_LISTINGS_SQL);
            statement.setLong(1, platformId);
            statement.setTimestamp(2, Timestamp.valueOf(now));
            statement.setArray(3, bigintArray(connection, ids));
            statement.setArray(
                    4,
                    textArray(
                            connection,
                            rows.stream()
                                    .map(ListingObservation::externalItemId)
                                    .toList()));
            statement.setArray(
                    5,
                    textArray(
                            connection,
                            rows.stream().map(ListingObservation::status).toList()));
            statement.setArray(
                    6,
                    textArray(
                            connection,
                            rows.stream().map(ListingObservation::imageUrl).toList()));
            statement.setArray(
                    7,
                    textArray(
                            connection,
                            rows.stream().map(ListingObservation::listingUrl).toList()));
            return statement;
        });
    }

    private Result writeOneByOne(Platform platform, List<ListingObservation> chunk) {
        int saved = 0;
        for (ListingObservation observation : chunk) {
            try {
                platformListingUpserter.upsert(
                        platform,
                        observation.category(),
                        observation.externalItemId(),
                        observation.listingUrl(),
                        observation.title(),
                        observation.price(),
                        observation.status(),
                        observation.imageUrl());
                saved++;
            } catch (RuntimeException e) {
                log.warn("외부 매물 {} 저장 실패: {}", observation.externalItemId(), e.getMessage());
            }
        }
        // 한 건씩 저장은 추가·갱신을 구분하지 않으므로 모두 갱신으로 센다
        return new Result(0, saved);
    }

    private static Array bigintArray(Connection connection, List<Long> values) throws SQLException {
        return connection.createArrayOf("bigint", values.toArray());
    }

    private static Array textArray(Connection connection, List<String> values) throws SQLException {
        return connection.createArrayOf("text", values.toArray());
    }

    /**
     * @param inserted 새로 추가한 매물 수
     * @param updated 이미 있어 갱신한 매물 수
     */
    public record Result(int inserted, int updated) {}
}
