package com.swyp.team5.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.swyp.team5.auth.service.RefreshTokenService;
import com.swyp.team5.category.entity.Category;
import com.swyp.team5.category.repository.CategoryRepository;
import com.swyp.team5.common.passport.JwtTokenProvider;
import com.swyp.team5.file.service.FileStorageService;
import com.swyp.team5.interest.entity.Interest;
import com.swyp.team5.interest.repository.InterestRepository;
import com.swyp.team5.member.entity.Member;
import com.swyp.team5.member.entity.MemberRole;
import com.swyp.team5.member.repository.MemberRepository;
import com.swyp.team5.notification.entity.Notification;
import com.swyp.team5.notification.entity.NotificationType;
import com.swyp.team5.notification.repository.NotificationRepository;
import com.swyp.team5.notification.service.NotificationService;
import com.swyp.team5.product.entity.DefectStatus;
import com.swyp.team5.product.entity.Product;
import com.swyp.team5.product.entity.ProductCondition;
import com.swyp.team5.product.entity.TradeMethod;
import com.swyp.team5.product.repository.ProductRepository;
import com.swyp.team5.product.service.ProductAiService;
import com.swyp.team5.productanalysis.entity.AnalysisRecommendation;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

// 알림 API + 추천 전환 알림 생성 통합 테스트. 다른 테스트가 회원/상품을 deleteAll 하므로 만든 데이터는 직접 정리한다.
@SpringBootTest
@AutoConfigureMockMvc
class NotificationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private InterestRepository interestRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    // ProductTest와 같은 목 구성을 써서 스프링 컨텍스트를 재사용한다
    @MockitoBean
    private RefreshTokenService refreshTokenService;

    @MockitoBean
    private FileStorageService fileStorageService;

    @MockitoBean
    private ProductAiService productAiService;

    private Member owner;
    private Member other;
    private String ownerToken;
    private String otherToken;

    @BeforeEach
    void setUp() {
        owner = memberRepository.save(newMember("owner"));
        other = memberRepository.save(newMember("other"));
        ownerToken = jwtTokenProvider.createAccessToken(owner.getId(), MemberRole.USER);
        otherToken = jwtTokenProvider.createAccessToken(other.getId(), MemberRole.USER);
    }

    @AfterEach
    void tearDown() {
        List<Long> memberIds = List.of(owner.getId(), other.getId());
        notificationRepository.deleteAll(notificationRepository.findAll().stream()
                .filter(n -> memberIds.contains(n.getMember().getId()))
                .toList());
        interestRepository.deleteAll(interestRepository.findAll().stream()
                .filter(i -> memberIds.contains(i.getMember().getId()))
                .toList());
        productRepository.deleteAll(productRepository.findAll().stream()
                .filter(p -> memberIds.contains(p.getMember().getId()))
                .toList());
        memberRepository.deleteAllById(memberIds);
    }

    // 본인 알림만 최신순으로 조회
    @Test
    void getNotificationsReturnsOwnNotificationsNewestFirst() throws Exception {
        notificationRepository.save(Notification.create(owner, null, NotificationType.NOTICE, "첫 알림", "내용1"));
        notificationRepository.save(Notification.create(owner, null, NotificationType.NOTICE, "두번째 알림", "내용2"));
        notificationRepository.save(Notification.create(other, null, NotificationType.NOTICE, "남의 알림", "내용"));

        mockMvc.perform(get("/notifications").header(HttpHeaders.AUTHORIZATION, "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.data[0].title").value("두번째 알림"))
                .andExpect(jsonPath("$.data[0].type").value("NOTICE"))
                .andExpect(jsonPath("$.data[0].isRead").value(false))
                .andExpect(jsonPath("$.data[0].productId").doesNotExist())
                .andExpect(jsonPath("$.data[1].title").value("첫 알림"));
    }

    // 읽음 처리
    @Test
    void markReadSucceeds() throws Exception {
        Notification notification =
                notificationRepository.save(Notification.create(owner, null, NotificationType.NOTICE, "알림", "내용"));

        mockMvc.perform(patch("/notifications/{id}/read", notification.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.notificationId").value(notification.getId()))
                .andExpect(jsonPath("$.data.isRead").value(true));

        assertThat(notificationRepository
                        .findById(notification.getId())
                        .orElseThrow()
                        .isRead())
                .isTrue();
    }

    // 남의 알림은 읽음/삭제 모두 404
    @Test
    void otherMembersNotificationIsNotFound() throws Exception {
        Notification notification =
                notificationRepository.save(Notification.create(owner, null, NotificationType.NOTICE, "알림", "내용"));

        mockMvc.perform(patch("/notifications/{id}/read", notification.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + otherToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("NOT_FOUND"))
                .andExpect(jsonPath("$.message").value("존재하지 않는 알림입니다."));
        mockMvc.perform(delete("/notifications/{id}", notification.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + otherToken))
                .andExpect(status().isNotFound());

        assertThat(notificationRepository.existsById(notification.getId())).isTrue();
    }

    // 삭제
    @Test
    void deleteSucceeds() throws Exception {
        Notification notification =
                notificationRepository.save(Notification.create(owner, null, NotificationType.NOTICE, "알림", "내용"));

        mockMvc.perform(delete("/notifications/{id}", notification.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + ownerToken))
                .andExpect(status().isOk());

        assertThat(notificationRepository.existsById(notification.getId())).isFalse();
    }

    // 추천 전환 알림 - BUY는 관심 등록 회원에게, SELL은 판매자에게(실제 DB로 수신자 조회 쿼리 검증)
    @Test
    void recommendationChangeCreatesNotificationsForRecipients() throws Exception {
        Product product = productRepository.save(newProduct(owner));
        interestRepository.save(Interest.ofProduct(other, product));

        notificationService.notifyRecommendationChanged(
                product, AnalysisRecommendation.HOLD, AnalysisRecommendation.BUY);
        notificationService.notifyRecommendationChanged(
                product, AnalysisRecommendation.BUY, AnalysisRecommendation.SELL);

        mockMvc.perform(get("/notifications").header(HttpHeaders.AUTHORIZATION, "Bearer " + otherToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].type").value("BUY"))
                .andExpect(jsonPath("$.data[0].productId").value(product.getId()));
        mockMvc.perform(get("/notifications").header(HttpHeaders.AUTHORIZATION, "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].type").value("SELL"));
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
                "알림 테스트 상품",
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
