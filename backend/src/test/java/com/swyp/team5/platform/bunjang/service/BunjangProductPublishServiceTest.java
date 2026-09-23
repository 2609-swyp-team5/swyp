package com.swyp.team5.platform.bunjang.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.swyp.team5.category.entity.Category;
import com.swyp.team5.member.entity.Member;
import com.swyp.team5.platform.bunjang.client.BunjangProductUploader;
import com.swyp.team5.platform.bunjang.dto.BunjangListingForm;
import com.swyp.team5.platform.bunjang.dto.BunjangUploadResult;
import com.swyp.team5.platform.bunjang.dto.ProductPlatformResponse;
import com.swyp.team5.platform.entity.MemberPlatform;
import com.swyp.team5.platform.entity.MemberPlatformStatus;
import com.swyp.team5.platform.entity.Platform;
import com.swyp.team5.platform.entity.ProductPlatform;
import com.swyp.team5.platform.entity.ProductPlatformStatus;
import com.swyp.team5.platform.error.InvalidPlatformSessionException;
import com.swyp.team5.platform.error.MemberPlatformNotFoundException;
import com.swyp.team5.platform.error.PlatformPublishFailedException;
import com.swyp.team5.platform.error.ProductPlatformAlreadyLinkedException;
import com.swyp.team5.platform.error.ProductPlatformPublishInProgressException;
import com.swyp.team5.platform.repository.MemberPlatformRepository;
import com.swyp.team5.platform.repository.PlatformRepository;
import com.swyp.team5.platform.repository.ProductPlatformRepository;
import com.swyp.team5.product.entity.DefectStatus;
import com.swyp.team5.product.entity.DeliveryType;
import com.swyp.team5.product.entity.Product;
import com.swyp.team5.product.entity.ProductCondition;
import com.swyp.team5.product.entity.TradeMethod;
import com.swyp.team5.product.error.ProductAccessDeniedException;
import com.swyp.team5.product.repository.ProductRepository;
import com.swyp.team5.tag.entity.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

// 번개장터 매물 자동 등록 Service 단위 테스트(브라우저 자동화 부분은 Mock).
@ExtendWith(MockitoExtension.class)
class BunjangProductPublishServiceTest {

    private static final BunjangUploadResult UPLOAD_RESULT =
            new BunjangUploadResult("123456789", "https://m.bunjang.co.kr/products/123456789");

    @Mock
    private PlatformRepository platformRepository;

    @Mock
    private MemberPlatformRepository memberPlatformRepository;

    @Mock
    private ProductPlatformRepository productPlatformRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private BunjangProductUploader bunjangProductUploader;

    private BunjangProductPublishService service() {
        return new BunjangProductPublishService(
                platformRepository,
                memberPlatformRepository,
                productPlatformRepository,
                productRepository,
                bunjangProductUploader,
                new TransactionTemplate(mock(PlatformTransactionManager.class)));
    }

    // 등록 성공 - 등록 진행 중으로 생성된 뒤 번개장터 매물 ID/주소와 함께 게시됨으로 전환
    @Test
    void publishSucceeds() {
        MemberPlatform memberPlatform = givenConnectedMemberPlatform();
        Product product = givenProduct(newMember(2L));
        when(productPlatformRepository.findByProductIdAndMemberPlatformId(5L, 10L))
                .thenReturn(Optional.empty());
        ProductPlatform saved = givenSavedProductPlatform(memberPlatform, product);
        when(bunjangProductUploader.upload(eq("abc123"), any())).thenReturn(UPLOAD_RESULT);

        ProductPlatformResponse response = service().publish(2L, 5L);

        assertThat(response.status()).isEqualTo(ProductPlatformStatus.POSTED);
        assertThat(response.externalProductId()).isEqualTo("123456789");
        assertThat(response.productUrl()).isEqualTo("https://m.bunjang.co.kr/products/123456789");
        assertThat(saved.getStatus()).isEqualTo(ProductPlatformStatus.POSTED);
    }

    // 우리 상품 정보가 번개장터 폼 값(카테고리 이름 경로/상태 라벨/거래 옵션 등)으로 변환되는지 확인
    @Test
    void publishConvertsProductToBunjangForm() {
        MemberPlatform memberPlatform = givenConnectedMemberPlatform();
        Product product = givenProduct(newMember(2L));
        when(productPlatformRepository.findByProductIdAndMemberPlatformId(5L, 10L))
                .thenReturn(Optional.empty());
        givenSavedProductPlatform(memberPlatform, product);
        when(bunjangProductUploader.upload(eq("abc123"), any())).thenReturn(UPLOAD_RESULT);

        service().publish(2L, 5L);

        ArgumentCaptor<BunjangListingForm> captor = ArgumentCaptor.forClass(BunjangListingForm.class);
        verify(bunjangProductUploader).upload(eq("abc123"), captor.capture());
        BunjangListingForm form = captor.getValue();
        assertThat(form.title()).isEqualTo("아이폰 13");
        assertThat(form.price()).isEqualTo(500_000L);
        assertThat(form.categoryPath()).containsExactly("디지털", "휴대폰", "스마트폰");
        assertThat(form.conditionLabel()).isEqualTo("사용감 적음");
        assertThat(form.tags()).containsExactly("애플");
        assertThat(form.directTrade()).isTrue();
        assertThat(form.directTradeLocation()).isEqualTo("강남역");
        assertThat(form.shippingFeeIncluded()).isTrue();
        assertThat(form.imageUrls())
                .containsExactly("https://image.example.com/1.png", "https://image.example.com/2.png");
    }

    // 이전 등록이 실패했던 상품은 기존 행을 재사용해 다시 등록
    @Test
    void publishRetriesPreviouslyFailedProduct() {
        MemberPlatform memberPlatform = givenConnectedMemberPlatform();
        Product product = givenProduct(newMember(2L));
        ProductPlatform failed = ProductPlatform.startPosting(memberPlatform, product);
        failed.markFailed();
        setField(failed, "id", 30L);
        when(productPlatformRepository.findByProductIdAndMemberPlatformId(5L, 10L))
                .thenReturn(Optional.of(failed));
        when(productPlatformRepository.getReferenceById(30L)).thenReturn(failed);
        when(bunjangProductUploader.upload(eq("abc123"), any())).thenReturn(UPLOAD_RESULT);

        ProductPlatformResponse response = service().publish(2L, 5L);

        assertThat(response.status()).isEqualTo(ProductPlatformStatus.POSTED);
        verify(productPlatformRepository, never()).save(any());
    }

    // 이미 게시된 상품이면 실패(중복 등록 방지)
    @Test
    void publishFailsWhenAlreadyPosted() {
        MemberPlatform memberPlatform = givenConnectedMemberPlatform();
        Product product = givenProduct(newMember(2L));
        ProductPlatform posted = ProductPlatform.link(memberPlatform, product, "111111111", "url");
        when(productPlatformRepository.findByProductIdAndMemberPlatformId(5L, 10L))
                .thenReturn(Optional.of(posted));

        assertThatThrownBy(() -> service().publish(2L, 5L)).isInstanceOf(ProductPlatformAlreadyLinkedException.class);
        verify(bunjangProductUploader, never()).upload(any(), any());
    }

    // 다른 요청이 방금 등록을 시작했다면 실패(중복 클릭 등)
    @Test
    void publishFailsWhenPostingInProgress() {
        MemberPlatform memberPlatform = givenConnectedMemberPlatform();
        Product product = givenProduct(newMember(2L));
        ProductPlatform posting = ProductPlatform.startPosting(memberPlatform, product);
        setField(posting, "updatedAt", LocalDateTime.now().minusMinutes(1));
        when(productPlatformRepository.findByProductIdAndMemberPlatformId(5L, 10L))
                .thenReturn(Optional.of(posting));

        assertThatThrownBy(() -> service().publish(2L, 5L))
                .isInstanceOf(ProductPlatformPublishInProgressException.class);
    }

    // 등록 진행 중 상태가 오래 방치됐다면(서버 재시작 등으로 중단) 다시 등록 가능
    @Test
    void publishSucceedsWhenPreviousPostingIsStale() {
        MemberPlatform memberPlatform = givenConnectedMemberPlatform();
        Product product = givenProduct(newMember(2L));
        ProductPlatform stale = ProductPlatform.startPosting(memberPlatform, product);
        setField(stale, "id", 30L);
        setField(stale, "updatedAt", LocalDateTime.now().minusMinutes(30));
        when(productPlatformRepository.findByProductIdAndMemberPlatformId(5L, 10L))
                .thenReturn(Optional.of(stale));
        when(productPlatformRepository.getReferenceById(30L)).thenReturn(stale);
        when(bunjangProductUploader.upload(eq("abc123"), any())).thenReturn(UPLOAD_RESULT);

        assertThat(service().publish(2L, 5L).status()).isEqualTo(ProductPlatformStatus.POSTED);
    }

    // 브라우저 등록이 실패하면 등록 실패 상태로 남기고 예외를 그대로 전달
    @Test
    void publishMarksFailedWhenUploadFails() {
        MemberPlatform memberPlatform = givenConnectedMemberPlatform();
        Product product = givenProduct(newMember(2L));
        when(productPlatformRepository.findByProductIdAndMemberPlatformId(5L, 10L))
                .thenReturn(Optional.empty());
        ProductPlatform saved = givenSavedProductPlatform(memberPlatform, product);
        when(bunjangProductUploader.upload(eq("abc123"), any()))
                .thenThrow(new PlatformPublishFailedException("가격 입력창을 찾을 수 없습니다."));

        assertThatThrownBy(() -> service().publish(2L, 5L)).isInstanceOf(PlatformPublishFailedException.class);
        assertThat(saved.getStatus()).isEqualTo(ProductPlatformStatus.FAILED);
        assertThat(memberPlatform.getStatus()).isEqualTo(MemberPlatformStatus.CONNECTED);
    }

    // 등록 중 세션 만료가 확인되면 연동 상태도 만료로 전환
    @Test
    void publishMarksSessionExpiredWhenSessionInvalid() {
        MemberPlatform memberPlatform = givenConnectedMemberPlatform();
        Product product = givenProduct(newMember(2L));
        when(productPlatformRepository.findByProductIdAndMemberPlatformId(5L, 10L))
                .thenReturn(Optional.empty());
        ProductPlatform saved = givenSavedProductPlatform(memberPlatform, product);
        when(memberPlatformRepository.getReferenceById(10L)).thenReturn(memberPlatform);
        when(bunjangProductUploader.upload(eq("abc123"), any()))
                .thenThrow(new InvalidPlatformSessionException("세션 만료"));

        assertThatThrownBy(() -> service().publish(2L, 5L)).isInstanceOf(InvalidPlatformSessionException.class);
        assertThat(saved.getStatus()).isEqualTo(ProductPlatformStatus.FAILED);
        assertThat(memberPlatform.getStatus()).isEqualTo(MemberPlatformStatus.EXPIRED);
    }

    // 번개장터 세션이 연동되어 있지 않으면 실패
    @Test
    void publishFailsWhenMemberPlatformNotFound() {
        Platform platform = newPlatform(1L);
        when(platformRepository.findByName("번개장터")).thenReturn(Optional.of(platform));
        when(memberPlatformRepository.findByMemberIdAndPlatformId(2L, 1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service().publish(2L, 5L)).isInstanceOf(MemberPlatformNotFoundException.class);
    }

    // 세션이 만료 상태면 실패
    @Test
    void publishFailsWhenSessionExpired() {
        givenConnectedMemberPlatform().markExpired();

        assertThatThrownBy(() -> service().publish(2L, 5L)).isInstanceOf(InvalidPlatformSessionException.class);
    }

    // 본인 상품이 아니면 실패
    @Test
    void publishFailsWhenNotOwner() {
        givenConnectedMemberPlatform();
        givenProduct(newMember(99L));

        assertThatThrownBy(() -> service().publish(2L, 5L)).isInstanceOf(ProductAccessDeniedException.class);
        verify(bunjangProductUploader, never()).upload(any(), any());
    }

    private MemberPlatform givenConnectedMemberPlatform() {
        Platform platform = newPlatform(1L);
        MemberPlatform memberPlatform = MemberPlatform.connect(newMember(2L), platform, "abc123");
        setField(memberPlatform, "id", 10L);
        when(platformRepository.findByName("번개장터")).thenReturn(Optional.of(platform));
        when(memberPlatformRepository.findByMemberIdAndPlatformId(2L, 1L)).thenReturn(Optional.of(memberPlatform));
        return memberPlatform;
    }

    private Product givenProduct(Member owner) {
        Product product = newProduct(5L, owner);
        when(productRepository.findById(5L)).thenReturn(Optional.of(product));
        return product;
    }

    private ProductPlatform givenSavedProductPlatform(MemberPlatform memberPlatform, Product product) {
        ProductPlatform saved = ProductPlatform.startPosting(memberPlatform, product);
        setField(saved, "id", 30L);
        when(productPlatformRepository.save(any())).thenReturn(saved);
        when(productPlatformRepository.getReferenceById(30L)).thenReturn(saved);
        return saved;
    }

    private Member newMember(Long id) {
        Member member = Member.ofLocalSignUp("test@example.com", null, "encoded-password", "홍길동", "gildong", null);
        setField(member, "id", id);
        return member;
    }

    private Product newProduct(Long id, Member member) {
        Category digital = newCategory(1L, "디지털", null);
        Category phone = newCategory(2L, "휴대폰", digital);
        Category smartphone = newCategory(3L, "스마트폰", phone);
        Product product = Product.create(
                member,
                smartphone,
                "아이폰 13",
                null,
                "설명",
                500_000L,
                ProductCondition.B,
                DefectStatus.NORMAL,
                null,
                true,
                TradeMethod.DIRECT,
                DeliveryType.INCLUDED,
                "강남역",
                List.of("https://image.example.com/1.png", "https://image.example.com/2.png"),
                Set.of(Tag.of("애플")),
                Set.of());
        setField(product, "id", id);
        return product;
    }

    private Category newCategory(Long id, String name, Category parent) {
        try {
            Constructor<Category> constructor = Category.class.getDeclaredConstructor();
            constructor.setAccessible(true);
            Category category = constructor.newInstance();
            setField(category, "id", id);
            setField(category, "name", name);
            setField(category, "parent", parent);
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
