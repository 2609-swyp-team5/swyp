package com.swyp.team5.productanalysis;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;

import com.swyp.team5.category.entity.Category;
import com.swyp.team5.category.repository.CategoryRepository;
import com.swyp.team5.interest.entity.Interest;
import com.swyp.team5.interest.repository.InterestRepository;
import com.swyp.team5.item.entity.AnalysisSkipReason;
import com.swyp.team5.item.repository.ItemRepository;
import com.swyp.team5.member.entity.Member;
import com.swyp.team5.member.repository.MemberRepository;
import com.swyp.team5.product.entity.DefectStatus;
import com.swyp.team5.product.entity.Product;
import com.swyp.team5.product.entity.ProductCondition;
import com.swyp.team5.product.entity.ProductStatus;
import com.swyp.team5.product.entity.TradeMethod;
import com.swyp.team5.product.repository.ProductRepository;
import com.swyp.team5.productanalysis.entity.ProductAnalysis;
import com.swyp.team5.productanalysis.repository.ProductAnalysisRepository;
import com.swyp.team5.support.IntegrationTest;
import org.junit.jupiter.api.Test;

// 분석대기 복구 대상 조회(분석 결과·건너뛴 기록 둘 다 없는 대상) 통합 테스트.
class PendingAnalysisQueryTest extends IntegrationTest {

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private InterestRepository interestRepository;

    @Autowired
    private ItemRepository itemRepository;

    @Autowired
    private ProductAnalysisRepository productAnalysisRepository;

    // 분석 결과가 있거나, 건너뛴 기록이 있거나, 분석 대상 상태가 아니거나, 기준 시각 전에 등록된 상품은 빠짐
    @Test
    void findsOnlyUnanalyzedProductsAndInterestedItems() {
        Member seller = memberRepository.save(newMember("seller"));
        Member buyer = memberRepository.save(newMember("buyer"));
        Product pending = productRepository.save(newProduct(seller));
        Product analyzed = productRepository.save(newProduct(seller));
        Product skipped = productRepository.save(newProduct(seller));
        Product soldOut = newProduct(seller);
        soldOut.changeStatus(ProductStatus.SOLD_OUT);
        soldOut = productRepository.save(soldOut);
        productAnalysisRepository.save(
                ProductAnalysis.create(analyzed, 1000L, 2000L, 3000L, null, null, null, null, LocalDateTime.now()));
        itemRepository.recordAnalysisSkip(
                skipped.getId(), AnalysisSkipReason.NOT_ENOUGH_CANDIDATES, LocalDateTime.now());
        interestRepository.save(Interest.ofProduct(buyer, pending));
        interestRepository.save(Interest.ofProduct(buyer, analyzed));
        interestRepository.save(Interest.ofProduct(buyer, soldOut));
        LocalDateTime since = LocalDateTime.now().minusHours(1);

        assertThat(productAnalysisRepository.findUnanalyzedProductIds(ProductStatus.ANALYSIS_TARGETS, since))
                .containsExactly(pending.getId());
        // 관심 대상은 상태와 무관하게 고르고(분석할 때 확인) 분석 결과가 있는 대상만 뺌
        assertThat(productAnalysisRepository.findUnanalyzedInterestedItemIds(since))
                .containsExactly(pending.getId(), soldOut.getId());

        LocalDateTime future = LocalDateTime.now().plusHours(1);
        assertThat(productAnalysisRepository.findUnanalyzedProductIds(ProductStatus.ANALYSIS_TARGETS, future))
                .isEmpty();
        assertThat(productAnalysisRepository.findUnanalyzedInterestedItemIds(future))
                .isEmpty();
    }

    private static Member newMember(String prefix) {
        return Member.ofLocalSignUp(
                prefix + "-" + UUID.randomUUID() + "@example.com", null, "encoded-password", "회원", prefix, null);
    }

    private Product newProduct(Member member) {
        Category leaf = categoryRepository.findAll().stream()
                .filter(Category::isLeaf)
                .findFirst()
                .orElseThrow();
        return Product.create(
                member,
                leaf,
                "복구 테스트 상품",
                null,
                "설명",
                100_000L,
                ProductCondition.A,
                DefectStatus.NORMAL,
                null,
                true,
                TradeMethod.DIRECT,
                null,
                null,
                List.of("https://image.example.com/1.png"),
                Set.of(),
                Set.of());
    }
}
