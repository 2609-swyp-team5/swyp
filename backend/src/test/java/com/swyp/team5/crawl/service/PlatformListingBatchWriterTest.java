package com.swyp.team5.crawl.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.support.TransactionTemplate;

import com.swyp.team5.category.entity.Category;
import com.swyp.team5.category.repository.CategoryRepository;
import com.swyp.team5.platform.entity.Platform;
import com.swyp.team5.platform.entity.PlatformListing;
import com.swyp.team5.platform.repository.PlatformListingRepository;
import com.swyp.team5.platform.repository.PlatformRepository;
import com.swyp.team5.support.IntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

// 수집 매물 일괄 upsert(JDBC) 통합 테스트 — 실제 DB에서 items·platform_listings 두 테이블에 같은 ID로 들어가는지 확인한다.
class PlatformListingBatchWriterTest extends IntegrationTest {

    @Autowired
    private PlatformListingBatchWriter writer;

    @Autowired
    private PlatformListingRepository platformListingRepository;

    @Autowired
    private PlatformRepository platformRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private TransactionTemplate transactionTemplate;

    private Platform platform;
    private Category category;
    private Category otherCategory;

    @BeforeEach
    void setUp() {
        platform = platformRepository.findByName("번개장터").orElseThrow();
        List<Category> leaves = categoryRepository.findAll().stream()
                .filter(Category::isLeaf)
                .limit(2)
                .toList();
        category = leaves.get(0);
        otherCategory = leaves.get(1);
    }

    // 새 매물은 추가, 있는 매물은 카테고리·제목·가격·상태·이미지·URL·마지막 관측 시각 갱신, 같은 ID가 두 번이면 마지막 값
    @Test
    void insertsNewAndUpdatesExistingListings() {
        PlatformListing existing = platformListingRepository.save(PlatformListing.create(
                platform, category, "batch-1", "옛 제목", 1000L, "SELLING", "https://img/old", "https://old"));

        PlatformListingBatchWriter.Result result = writer.write(
                platform,
                List.of(
                        observation(otherCategory, "batch-1", "새 제목", 2000L),
                        observation(category, "batch-2", "새 매물", 3000L),
                        observation(category, "batch-2", "새 매물(가격 변동)", 3500L)));

        assertThat(result).isEqualTo(new PlatformListingBatchWriter.Result(1, 1));
        transactionTemplate.executeWithoutResult(status -> {
            PlatformListing updated = platformListingRepository
                    .findByPlatformAndExternalItemId(platform, "batch-1")
                    .orElseThrow();
            assertThat(updated.getId()).isEqualTo(existing.getId());
            assertThat(updated.getCategory().getId()).isEqualTo(otherCategory.getId());
            assertThat(updated.getTitle()).isEqualTo("새 제목");
            assertThat(updated.getPrice()).isEqualTo(2000L);
            assertThat(updated.getImageUrl()).isEqualTo("https://img/batch-1");
            assertThat(updated.getListingUrl()).isEqualTo("https://m.bunjang.co.kr/products/batch-1");
            assertThat(updated.getLastSeenAt()).isAfterOrEqualTo(existing.getLastSeenAt());

            PlatformListing inserted = platformListingRepository
                    .findByPlatformAndExternalItemId(platform, "batch-2")
                    .orElseThrow();
            assertThat(inserted.getTitle()).isEqualTo("새 매물(가격 변동)");
            assertThat(inserted.getPrice()).isEqualTo(3500L);
            assertThat(inserted.getStatus()).isEqualTo("SELLING");
            assertThat(inserted.getCreatedAt()).isNotNull();
            assertThat(inserted.getPlatform().getId()).isEqualTo(platform.getId());
        });
    }

    // 묶음 크기보다 많아도 나눠서 모두 저장하고, 새 ID가 기존 ID와 겹치지 않음(JPA로 이후 추가해도 시퀀스 충돌 없음)
    @Test
    void writesMoreThanOneChunkAndKeepsSequenceInSync() {
        List<ListingObservation> observations = new ArrayList<>();
        for (int i = 0; i < PlatformListingBatchWriter.CHUNK_SIZE + 5; i++) {
            observations.add(observation(category, "chunk-" + i, "매물 " + i, 1000L + i));
        }

        PlatformListingBatchWriter.Result result = writer.write(platform, observations);

        assertThat(result.inserted()).isEqualTo(PlatformListingBatchWriter.CHUNK_SIZE + 5);
        assertThat(platformListingRepository.findByPlatformAndExternalItemId(platform, "chunk-1004"))
                .isPresent();
        PlatformListing afterBatch = platformListingRepository.save(
                PlatformListing.create(platform, category, "after-batch", "이후 매물", 1000L, "SELLING", null, null));
        assertThat(afterBatch.getId()).isNotNull();
    }

    private static ListingObservation observation(Category category, String id, String title, long price) {
        return new ListingObservation(
                category, id, "https://m.bunjang.co.kr/products/" + id, title, price, "SELLING", "https://img/" + id);
    }
}
