package com.swyp.team5.category;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.io.InputStream;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.swyp.team5.category.entity.Category;
import com.swyp.team5.category.repository.CategoryRepository;
import com.swyp.team5.common.passport.JwtTokenProvider;
import com.swyp.team5.member.entity.Member;
import com.swyp.team5.member.entity.MemberRole;
import com.swyp.team5.member.repository.MemberRepository;
import com.swyp.team5.platform.entity.CategoryPlatform;
import com.swyp.team5.platform.repository.CategoryPlatformRepository;
import com.swyp.team5.support.IntegrationTest;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

// V13(번개장터 카테고리 트리) 시드와 카테고리 조회 통합 테스트.
class CategoryTest extends IntegrationTest {

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

    // 번개장터 트리(대 26 / 중 176 / 소 601)가 경로·최하위 여부·번개장터 ID 매핑까지 그대로 들어갔는지 확인
    @Test
    @Transactional
    void seedMatchesBunjangCategoryTree() {
        List<CategoryPlatform> mappings = categoryPlatformRepository.findAll().stream()
                .filter(m -> m.getPlatform().getName().equals("번개장터"))
                .toList();
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

    // 추가 항목 스냅샷의 카테고리는 모두 우리 최하위 카테고리와 매핑돼 있어야 한다(번개장터 트리 V13과 같은 시점 기준)
    @Test
    @Transactional
    void categoryOptionSnapshotMatchesLeafCategories() throws Exception {
        Map<String, CategoryPlatform> mappings = categoryPlatformRepository.findAll().stream()
                .filter(m -> m.getPlatform().getName().equals("번개장터"))
                .collect(Collectors.toMap(CategoryPlatform::getExternalCategoryId, m -> m));
        JsonNode snapshot;
        try (InputStream input = new ClassPathResource("bunjang/category-options.json").getInputStream()) {
            snapshot = new JsonMapper().readTree(input).get("categories");
        }

        assertThat(snapshot.size()).isEqualTo(198);
        for (String bunjangCategoryId : snapshot.propertyNames()) {
            assertThat(mappings).containsKey(bunjangCategoryId);
            assertThat(mappings.get(bunjangCategoryId).getCategory().isLeaf()).isTrue();
        }
    }

    // 카테고리별 추가 항목 조회 - 비로그인도 가능, 추가 항목이 없으면 빈 목록, 없는 카테고리는 404
    @Test
    @Transactional
    void getCategoryOptions() throws Exception {
        Long clothing = categoryIdOf("310250");
        Long smartphone = categoryIdOf("600700001");

        mockMvc.perform(get("/categories/{categoryId}/options", clothing))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].groupId").value("100"))
                .andExpect(jsonPath("$.data[0].name").value("사이즈"))
                .andExpect(jsonPath("$.data[0].title").value("사이즈를 선택해 주세요"))
                .andExpect(jsonPath("$.data[0].required").value(true))
                .andExpect(jsonPath("$.data[0].children[0].name").value("공용 사이즈"))
                .andExpect(jsonPath("$.data[0].children[0].type").value("SINGLE_SELECT"))
                .andExpect(jsonPath("$.data[0].children[0].values[4].valueId").value(5))
                .andExpect(jsonPath("$.data[0].children[0].values[4].value").value("M"));
        mockMvc.perform(get("/categories/{categoryId}/options", smartphone))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isEmpty());
        mockMvc.perform(get("/categories/{categoryId}/options", 999_999_999L)).andExpect(status().isNotFound());
    }

    private Long categoryIdOf(String bunjangCategoryId) {
        return categoryPlatformRepository.findAll().stream()
                .filter(m -> m.getExternalCategoryId().equals(bunjangCategoryId))
                .findFirst()
                .orElseThrow()
                .getCategory()
                .getId();
    }
}
