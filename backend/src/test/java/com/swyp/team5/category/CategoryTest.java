package com.swyp.team5.category;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.swyp.team5.auth.service.RefreshTokenService;
import com.swyp.team5.category.entity.Category;
import com.swyp.team5.category.repository.CategoryRepository;
import com.swyp.team5.common.passport.JwtTokenProvider;
import com.swyp.team5.file.service.FileStorageService;
import com.swyp.team5.member.entity.Member;
import com.swyp.team5.member.entity.MemberRole;
import com.swyp.team5.member.repository.MemberRepository;
import com.swyp.team5.platform.entity.CategoryPlatform;
import com.swyp.team5.platform.repository.CategoryPlatformRepository;
import com.swyp.team5.product.service.ProductAiSearchService;
import com.swyp.team5.product.service.ProductAiService;
import org.junit.jupiter.api.Test;

// V13(번개장터 카테고리 트리) 시드와 카테고리 조회 통합 테스트.
@SpringBootTest
@AutoConfigureMockMvc
class CategoryTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private CategoryPlatformRepository categoryPlatformRepository;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    // ProductTest와 같은 목 구성을 써서 스프링 컨텍스트를 재사용한다
    @MockitoBean
    private RefreshTokenService refreshTokenService;

    @MockitoBean
    private FileStorageService fileStorageService;

    @MockitoBean
    private ProductAiService productAiService;

    @MockitoBean
    private ProductAiSearchService productAiSearchService;

    // 번개장터 트리(대 26 / 중 176 / 소 601)가 경로·최하위 여부·번개장터 ID 매핑까지 그대로 들어갔는지 확인
    @Test
    @Transactional
    void seedMatchesBunjangCategoryTree() {
        List<CategoryPlatform> mappings = categoryPlatformRepository.findAll();
        List<Category> seeded =
                mappings.stream().map(CategoryPlatform::getCategory).toList();

        assertThat(mappings).hasSize(803);
        assertThat(seeded.stream().filter(c -> c.getParent() == null)).hasSize(26);
        assertThat(seeded.stream().filter(Category::isLeaf)).hasSize(669);

        CategoryPlatform smartphone = mappings.stream()
                .filter(m -> m.getExternalCategoryId().equals("600700001"))
                .findFirst()
                .orElseThrow();
        Category category = smartphone.getCategory();
        assertThat(category.getName()).isEqualTo("스마트폰");
        assertThat(category.isLeaf()).isTrue();
        assertThat(category.getParent().getName()).isEqualTo("휴대폰");
        assertThat(category.getParent().isLeaf()).isFalse();
        assertThat(category.getParent().getParent().getName()).isEqualTo("디지털");
    }

    // 목록 응답에 최하위 여부(leaf)가 포함된다
    @Test
    void getCategoriesIncludesLeafFlag() throws Exception {
        Member member = memberRepository.save(Member.ofLocalSignUp(
                "category-" + UUID.randomUUID() + "@example.com", null, "encoded-password", "회원", "member", null));
        String token = jwtTokenProvider.createAccessToken(member.getId(), MemberRole.USER);

        mockMvc.perform(get("/categories").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.name == '디지털' && @.parentId == null)].leaf", contains(false)))
                .andExpect(jsonPath("$.data[?(@.name == '일반폰(피처폰)')].leaf", contains(true)));

        memberRepository.delete(member);
    }
}
