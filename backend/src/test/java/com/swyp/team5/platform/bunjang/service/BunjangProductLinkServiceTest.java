package com.swyp.team5.platform.bunjang.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.util.Optional;
import java.util.Set;

import com.swyp.team5.category.entity.Category;
import com.swyp.team5.crawl.client.BunjangProductClient;
import com.swyp.team5.crawl.dto.BunjangProductDetail;
import com.swyp.team5.member.entity.Member;
import com.swyp.team5.platform.bunjang.dto.ProductPlatformResponse;
import com.swyp.team5.platform.entity.MemberPlatform;
import com.swyp.team5.platform.entity.Platform;
import com.swyp.team5.platform.entity.ProductPlatform;
import com.swyp.team5.platform.entity.ProductPlatformStatus;
import com.swyp.team5.platform.error.InvalidPlatformSessionException;
import com.swyp.team5.platform.error.InvalidProductUrlException;
import com.swyp.team5.platform.error.MemberPlatformNotFoundException;
import com.swyp.team5.platform.error.ProductPlatformAlreadyLinkedException;
import com.swyp.team5.platform.error.ProductPlatformNotFoundException;
import com.swyp.team5.platform.repository.MemberPlatformRepository;
import com.swyp.team5.platform.repository.PlatformRepository;
import com.swyp.team5.platform.repository.ProductPlatformRepository;
import com.swyp.team5.product.entity.DefectStatus;
import com.swyp.team5.product.entity.Product;
import com.swyp.team5.product.entity.ProductCondition;
import com.swyp.team5.product.entity.TradeMethod;
import com.swyp.team5.product.error.ProductAccessDeniedException;
import com.swyp.team5.product.error.ProductNotFoundException;
import com.swyp.team5.product.repository.ProductRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

// 번개장터 매물 연동/상태 동기화 Service 단위 테스트.
@ExtendWith(MockitoExtension.class)
class BunjangProductLinkServiceTest {

    private static final String PRODUCT_URL = "https://m.bunjang.co.kr/products/123456789";

    @Mock
    private PlatformRepository platformRepository;

    @Mock
    private MemberPlatformRepository memberPlatformRepository;

    @Mock
    private ProductPlatformRepository productPlatformRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private BunjangProductClient bunjangProductClient;

    private BunjangProductLinkService service() {
        return new BunjangProductLinkService(
                platformRepository,
                memberPlatformRepository,
                productPlatformRepository,
                productRepository,
                bunjangProductClient);
    }

    // 연동 성공 - 신규 ProductPlatform 생성
    @Test
    void linkSucceeds() {
        Platform platform = newPlatform(1L);
        MemberPlatform memberPlatform = MemberPlatform.connect(newMember(2L), platform, "abc123");
        setField(memberPlatform, "id", 10L);
        Product product = newProduct(5L, newMember(2L));
        givenConnectedMemberPlatform(platform, memberPlatform);
        when(productRepository.findById(5L)).thenReturn(Optional.of(product));
        when(bunjangProductClient.fetchDetail("123456789"))
                .thenReturn(new BunjangProductDetail(123456789L, "SELLING", 10_000L, "title", null));
        when(productPlatformRepository.findByProductIdAndMemberPlatformId(5L, 10L))
                .thenReturn(Optional.empty());
        ProductPlatform saved = ProductPlatform.link(memberPlatform, product, "123456789", PRODUCT_URL);
        when(productPlatformRepository.save(any())).thenReturn(saved);

        ProductPlatformResponse response = service().link(2L, 5L, PRODUCT_URL);

        assertThat(response.externalProductId()).isEqualTo("123456789");
        assertThat(response.status()).isEqualTo(ProductPlatformStatus.POSTED);
    }

    // 번개장터 세션이 연동되어 있지 않으면 실패
    @Test
    void linkFailsWhenMemberPlatformNotFound() {
        Platform platform = newPlatform(1L);
        when(platformRepository.findByName("번개장터")).thenReturn(Optional.of(platform));
        when(memberPlatformRepository.findByMemberIdAndPlatformId(2L, 1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service().link(2L, 5L, PRODUCT_URL))
                .isInstanceOf(MemberPlatformNotFoundException.class);
    }

    // 세션이 연동은 되어 있으나 만료 상태면 실패
    @Test
    void linkFailsWhenSessionNotConnected() {
        Platform platform = newPlatform(1L);
        MemberPlatform memberPlatform = MemberPlatform.connect(newMember(2L), platform, "abc123");
        memberPlatform.markExpired();
        givenConnectedMemberPlatform(platform, memberPlatform);

        assertThatThrownBy(() -> service().link(2L, 5L, PRODUCT_URL))
                .isInstanceOf(InvalidPlatformSessionException.class);
    }

    // 존재하지 않는 상품이면 실패
    @Test
    void linkFailsWhenProductNotFound() {
        Platform platform = newPlatform(1L);
        MemberPlatform memberPlatform = MemberPlatform.connect(newMember(2L), platform, "abc123");
        givenConnectedMemberPlatform(platform, memberPlatform);
        when(productRepository.findById(5L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service().link(2L, 5L, PRODUCT_URL)).isInstanceOf(ProductNotFoundException.class);
    }

    // 본인이 등록한 상품이 아니면 실패
    @Test
    void linkFailsWhenNotOwner() {
        Platform platform = newPlatform(1L);
        MemberPlatform memberPlatform = MemberPlatform.connect(newMember(2L), platform, "abc123");
        givenConnectedMemberPlatform(platform, memberPlatform);
        Product product = newProduct(5L, newMember(99L));
        when(productRepository.findById(5L)).thenReturn(Optional.of(product));

        assertThatThrownBy(() -> service().link(2L, 5L, PRODUCT_URL)).isInstanceOf(ProductAccessDeniedException.class);
    }

    // 주소에서 상품 ID를 뽑을 수 없으면 실패
    @Test
    void linkFailsWhenUrlHasNoProductId() {
        Platform platform = newPlatform(1L);
        MemberPlatform memberPlatform = MemberPlatform.connect(newMember(2L), platform, "abc123");
        givenConnectedMemberPlatform(platform, memberPlatform);
        Product product = newProduct(5L, newMember(2L));
        when(productRepository.findById(5L)).thenReturn(Optional.of(product));

        assertThatThrownBy(() -> service().link(2L, 5L, "https://m.bunjang.co.kr/"))
                .isInstanceOf(InvalidProductUrlException.class);
    }

    // 실제로 존재하지 않거나 삭제된 매물이면 실패
    @Test
    void linkFailsWhenExternalProductNotFound() {
        Platform platform = newPlatform(1L);
        MemberPlatform memberPlatform = MemberPlatform.connect(newMember(2L), platform, "abc123");
        givenConnectedMemberPlatform(platform, memberPlatform);
        Product product = newProduct(5L, newMember(2L));
        when(productRepository.findById(5L)).thenReturn(Optional.of(product));
        when(bunjangProductClient.fetchDetail("123456789"))
                .thenReturn(new BunjangProductDetail(123456789L, null, null, null, "ERR_DELETED_PRODUCT"));

        assertThatThrownBy(() -> service().link(2L, 5L, PRODUCT_URL)).isInstanceOf(InvalidProductUrlException.class);
    }

    // 이미 연동된 상품이면 실패
    @Test
    void linkFailsWhenAlreadyLinked() {
        Platform platform = newPlatform(1L);
        MemberPlatform memberPlatform = MemberPlatform.connect(newMember(2L), platform, "abc123");
        setField(memberPlatform, "id", 10L);
        Product product = newProduct(5L, newMember(2L));
        givenConnectedMemberPlatform(platform, memberPlatform);
        when(productRepository.findById(5L)).thenReturn(Optional.of(product));
        when(bunjangProductClient.fetchDetail("123456789"))
                .thenReturn(new BunjangProductDetail(123456789L, "SELLING", 10_000L, "title", null));
        ProductPlatform existing = ProductPlatform.link(memberPlatform, product, "123456789", PRODUCT_URL);
        when(productPlatformRepository.findByProductIdAndMemberPlatformId(5L, 10L))
                .thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> service().link(2L, 5L, PRODUCT_URL))
                .isInstanceOf(ProductPlatformAlreadyLinkedException.class);
    }

    // 상태 동기화 - 정상 판매중이면 POSTED 유지
    @Test
    void syncStatusMarksPostedWhenStillSelling() {
        Platform platform = newPlatform(1L);
        MemberPlatform memberPlatform = MemberPlatform.connect(newMember(2L), platform, "abc123");
        setField(memberPlatform, "id", 10L);
        Product product = newProduct(5L, newMember(2L));
        givenConnectedMemberPlatform(platform, memberPlatform);
        when(productRepository.findById(5L)).thenReturn(Optional.of(product));
        ProductPlatform productPlatform = ProductPlatform.link(memberPlatform, product, "123456789", PRODUCT_URL);
        when(productPlatformRepository.findByProductIdAndMemberPlatformId(5L, 10L))
                .thenReturn(Optional.of(productPlatform));
        when(bunjangProductClient.fetchDetail("123456789"))
                .thenReturn(new BunjangProductDetail(123456789L, "SELLING", 10_000L, "title", null));

        ProductPlatformResponse response = service().syncStatus(2L, 5L);

        assertThat(response.status()).isEqualTo(ProductPlatformStatus.POSTED);
    }

    // 상태 동기화 - 삭제/판매종료면 REMOVED로 전환
    @Test
    void syncStatusMarksRemovedWhenNoLongerSelling() {
        Platform platform = newPlatform(1L);
        MemberPlatform memberPlatform = MemberPlatform.connect(newMember(2L), platform, "abc123");
        setField(memberPlatform, "id", 10L);
        Product product = newProduct(5L, newMember(2L));
        givenConnectedMemberPlatform(platform, memberPlatform);
        when(productRepository.findById(5L)).thenReturn(Optional.of(product));
        ProductPlatform productPlatform = ProductPlatform.link(memberPlatform, product, "123456789", PRODUCT_URL);
        when(productPlatformRepository.findByProductIdAndMemberPlatformId(5L, 10L))
                .thenReturn(Optional.of(productPlatform));
        when(bunjangProductClient.fetchDetail("123456789"))
                .thenReturn(new BunjangProductDetail(123456789L, null, null, null, "ERR_DELETED_PRODUCT"));

        ProductPlatformResponse response = service().syncStatus(2L, 5L);

        assertThat(response.status()).isEqualTo(ProductPlatformStatus.REMOVED);
    }

    // 연동된 매물이 없으면 실패
    @Test
    void syncStatusFailsWhenNotLinked() {
        Platform platform = newPlatform(1L);
        MemberPlatform memberPlatform = MemberPlatform.connect(newMember(2L), platform, "abc123");
        setField(memberPlatform, "id", 10L);
        Product product = newProduct(5L, newMember(2L));
        givenConnectedMemberPlatform(platform, memberPlatform);
        when(productRepository.findById(5L)).thenReturn(Optional.of(product));
        when(productPlatformRepository.findByProductIdAndMemberPlatformId(5L, 10L))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service().syncStatus(2L, 5L)).isInstanceOf(ProductPlatformNotFoundException.class);
    }

    private void givenConnectedMemberPlatform(Platform platform, MemberPlatform memberPlatform) {
        when(platformRepository.findByName("번개장터")).thenReturn(Optional.of(platform));
        when(memberPlatformRepository.findByMemberIdAndPlatformId(2L, 1L)).thenReturn(Optional.of(memberPlatform));
    }

    private Member newMember(Long id) {
        Member member = Member.ofLocalSignUp("test@example.com", null, "encoded-password", "홍길동", "gildong", null);
        setField(member, "id", id);
        return member;
    }

    private Product newProduct(Long id, Member member) {
        Category category = newCategory(1L, "전자기기");
        Product product = Product.create(
                member,
                category,
                "아이폰 13",
                null,
                "설명",
                500_000L,
                ProductCondition.A,
                DefectStatus.NORMAL,
                null,
                true,
                TradeMethod.DIRECT,
                null,
                null,
                java.util.List.of("https://image.example.com/1.png"),
                Set.of(),
                Set.of());
        setField(product, "id", id);
        return product;
    }

    private Category newCategory(Long id, String name) {
        try {
            var constructor = Category.class.getDeclaredConstructor();
            constructor.setAccessible(true);
            Category category = constructor.newInstance();
            setField(category, "id", id);
            setField(category, "name", name);
            return category;
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }

    private Platform newPlatform(Long id) {
        try {
            Constructor<Platform> constructor = Platform.class.getDeclaredConstructor();
            constructor.setAccessible(true);
            Platform platform = constructor.newInstance();
            setField(platform, "id", id);
            setField(platform, "name", "번개장터");
            return platform;
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }

    private void setField(Object target, String fieldName, Object value) {
        try {
            Field field = target.getClass().getDeclaredField(fieldName);
            field.setAccessible(true);
            field.set(target, value);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }
}
