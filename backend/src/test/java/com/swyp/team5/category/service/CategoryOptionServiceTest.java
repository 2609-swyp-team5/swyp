package com.swyp.team5.category.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.io.InputStream;
import java.util.List;
import java.util.Optional;

import org.springframework.core.io.ClassPathResource;

import com.swyp.team5.category.dto.CategoryOptionGroupResponse;
import com.swyp.team5.category.dto.CategoryOptionGroupResponse.Child;
import com.swyp.team5.category.dto.CategoryOptionGroupResponse.Value;
import com.swyp.team5.category.dto.CategoryOptionSelection;
import com.swyp.team5.category.entity.CategoryOptionType;
import com.swyp.team5.category.entity.SelectedCategoryOption;
import com.swyp.team5.category.error.CategoryNotFoundException;
import com.swyp.team5.category.error.InvalidCategoryOptionException;
import com.swyp.team5.category.repository.CategoryRepository;
import com.swyp.team5.platform.entity.CategoryPlatform;
import com.swyp.team5.platform.repository.CategoryPlatformRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

// 카테고리별 추가 항목 검증 단위 테스트(옵션 정의는 실제 스냅샷 리소스 사용).
class CategoryOptionServiceTest {

    private static final long KNIT = 1L; // 의류 리프 — 번개장터 310250, 필수 사이즈(공용 M = 5, 기타 = 17)
    private static final long SNACK = 2L; // 식품 리프 — 소비기한(필수, 날짜 입력칸 994 / 표시 없음 995), 번개장터 410900
    private static final long PHONE = 3L; // 스마트폰 — 추가 항목 없음

    private static final CategoryOptionCatalog CATALOG = new CategoryOptionCatalog(new JsonMapper());

    private final CategoryRepository categoryRepository = mock(CategoryRepository.class);
    private final CategoryPlatformRepository categoryPlatformRepository = mock(CategoryPlatformRepository.class);
    private final CategoryOptionService service =
            new CategoryOptionService(categoryRepository, categoryPlatformRepository, CATALOG);

    @BeforeEach
    void setUp() {
        givenBunjangCategory(KNIT, "310250");
        givenBunjangCategory(SNACK, "410900");
        givenBunjangCategory(PHONE, "600700001");
    }

    // 고른 값은 옵션 정의의 항목·세부 분류·값 이름과 함께 저장값으로 바뀜
    @Test
    void resolveFillsNamesFromDefinition() {
        List<SelectedCategoryOption> resolved =
                service.resolve(KNIT, List.of(new CategoryOptionSelection("100", 5L, null)));

        assertThat(resolved)
                .containsExactly(
                        new SelectedCategoryOption("100", "사이즈", "공용 사이즈", CategoryOptionType.SINGLE_SELECT, 5L, "M"));
    }

    // "기타 (상품설명에 작성)" 단독 선택지도 고를 수 있음
    @Test
    void resolveAcceptsSingleRoundValue() {
        List<SelectedCategoryOption> resolved =
                service.resolve(KNIT, List.of(new CategoryOptionSelection("100", 17L, null)));

        assertThat(resolved.getFirst().type()).isEqualTo(CategoryOptionType.SINGLE_ROUND);
        assertThat(resolved.getFirst().value()).isEqualTo("기타 (상품설명에 작성)");
    }

    // 필수 항목이 빠지면 번개장터 안내 문구로 거절
    @Test
    void resolveRejectsMissingRequired() {
        assertThatThrownBy(() -> service.resolve(KNIT, null))
                .isInstanceOf(InvalidCategoryOptionException.class)
                .hasMessage("사이즈를 선택해 주세요.");
    }

    // 항목에 없는 값·카테고리에 없는 항목·같은 항목 중복은 거절
    @Test
    void resolveRejectsInvalidSelections() {
        assertThatThrownBy(() -> service.resolve(KNIT, List.of(new CategoryOptionSelection("100", 994L, null))))
                .isInstanceOf(InvalidCategoryOptionException.class)
                .hasMessageContaining("고를 수 없는 값");
        assertThatThrownBy(() -> service.resolve(KNIT, List.of(new CategoryOptionSelection("514", 994L, "20301231"))))
                .isInstanceOf(InvalidCategoryOptionException.class)
                .hasMessageContaining("이 카테고리에 없는 추가 항목");
        assertThatThrownBy(() -> service.resolve(
                        KNIT,
                        List.of(
                                new CategoryOptionSelection("100", 5L, null),
                                new CategoryOptionSelection("100", 6L, null))))
                .isInstanceOf(InvalidCategoryOptionException.class)
                .hasMessageContaining("두 번");
    }

    // 날짜 입력칸은 실제 있는 날짜(년월일 8자리)만, "표시 없음"은 입력 없이 고를 수 있음
    @Test
    void resolveValidatesDateInput() {
        assertThat(service.resolve(SNACK, List.of(new CategoryOptionSelection("514", 994L, " 20301231 "))))
                .extracting(SelectedCategoryOption::value)
                .containsExactly("20301231");
        assertThat(service.resolve(SNACK, List.of(new CategoryOptionSelection("514", 995L, null))))
                .extracting(SelectedCategoryOption::value)
                .containsExactly("소비기한 표시 없음");
        assertThatThrownBy(() -> service.resolve(SNACK, List.of(new CategoryOptionSelection("514", 994L, "20300231"))))
                .isInstanceOf(InvalidCategoryOptionException.class)
                .hasMessageContaining("년월일 8자리");
        assertThatThrownBy(() -> service.resolve(SNACK, List.of(new CategoryOptionSelection("514", 994L, ""))))
                .isInstanceOf(InvalidCategoryOptionException.class)
                .hasMessage("소비기한을 입력해 주세요.");
    }

    // 추가 항목이 없는 카테고리·번개장터 매핑이 없는 카테고리는 입력 없이 통과
    @Test
    void resolveAllowsCategoriesWithoutOptions() {
        assertThat(service.resolve(PHONE, List.of())).isEmpty();
        assertThat(service.resolve(99L, null)).isEmpty();
    }

    // 게시 전 확인 — 저장된 값에 필수 항목이 없으면 그 항목을 알려 줌
    @Test
    void findMissingRequiredReturnsFirstMissingGroup() {
        assertThat(service.findMissingRequired(KNIT, List.of()))
                .map(CategoryOptionGroupResponse::name)
                .contains("사이즈");
        List<SelectedCategoryOption> filled =
                service.resolve(KNIT, List.of(new CategoryOptionSelection("100", 5L, null)));
        assertThat(service.findMissingRequired(KNIT, filled)).isEmpty();
    }

    // 조회 — 없는 카테고리는 404, 있으면 옵션 정의 그대로
    @Test
    void getOptions() {
        when(categoryRepository.existsById(KNIT)).thenReturn(true);

        List<CategoryOptionGroupResponse> groups = service.getOptions(KNIT);

        assertThat(groups).extracting(CategoryOptionGroupResponse::name).containsExactly("사이즈");
        assertThat(groups.getFirst().required()).isTrue();
        assertThatThrownBy(() -> service.getOptions(404L)).isInstanceOf(CategoryNotFoundException.class);
    }

    // 스냅샷의 모든 카테고리·항목·값 — 필수 항목을 다 채우면 통과하고, 각 값은 이름 그대로 저장되며, 필수 항목 하나라도 빠지면 거절
    @Test
    void everySnapshotOptionValueResolves() throws Exception {
        JsonNode categories;
        try (InputStream input = new ClassPathResource(CategoryOptionCatalog.RESOURCE_PATH).getInputStream()) {
            categories = new JsonMapper().readTree(input).get("categories");
        }
        long categoryId = 1_000L;
        int checkedValues = 0;
        for (String bunjangCategoryId : categories.propertyNames()) {
            categoryId++;
            givenBunjangCategory(categoryId, bunjangCategoryId);
            List<CategoryOptionGroupResponse> groups = CATALOG.groupsOf(bunjangCategoryId);
            List<CategoryOptionSelection> firstOfEach =
                    groups.stream().map(group -> selectionOf(group, 0, 0)).toList();

            for (CategoryOptionGroupResponse group : groups) {
                for (int c = 0; c < group.children().size(); c++) {
                    Child child = group.children().get(c);
                    for (int v = 0; v < child.values().size(); v++) {
                        CategoryOptionSelection selection = selectionOf(group, c, v);
                        List<CategoryOptionSelection> inputs = firstOfEach.stream()
                                .map(other -> other.groupId().equals(group.groupId()) ? selection : other)
                                .toList();
                        SelectedCategoryOption saved = service.resolve(categoryId, inputs).stream()
                                .filter(option -> option.groupId().equals(group.groupId()))
                                .findFirst()
                                .orElseThrow();
                        assertThat(saved.groupName()).isEqualTo(group.name());
                        assertThat(saved.childName()).isEqualTo(child.name());
                        assertThat(saved.type()).isEqualTo(child.type());
                        assertThat(saved.value())
                                .isEqualTo(
                                        child.type().needsText()
                                                ? selection.text()
                                                : child.values().get(v).value());
                        checkedValues++;
                    }
                }
                if (group.required()) {
                    long id = categoryId;
                    List<CategoryOptionSelection> missing = firstOfEach.stream()
                            .filter(other -> !other.groupId().equals(group.groupId()))
                            .toList();
                    assertThatThrownBy(() -> service.resolve(id, missing))
                            .isInstanceOf(InvalidCategoryOptionException.class)
                            .hasMessage(group.title() + ".");
                }
            }
            // 선택 항목은 비워도 통과
            List<CategoryOptionSelection> requiredOnly = groups.stream()
                    .filter(CategoryOptionGroupResponse::required)
                    .map(group -> selectionOf(group, 0, 0))
                    .toList();
            assertThat(service.resolve(categoryId, requiredOnly)).hasSize(requiredOnly.size());
        }
        assertThat(categories.size()).isEqualTo(198);
        assertThat(checkedValues).isEqualTo(4_742); // 스냅샷 전체 값 수(재수집하면 갱신)
    }

    private static CategoryOptionSelection selectionOf(
            CategoryOptionGroupResponse group, int childIndex, int valueIndex) {
        Child child = group.children().get(childIndex);
        Value value = child.values().get(valueIndex);
        String text =
                switch (child.type()) {
                    case DATE_TEXT_FIELD -> "20301231";
                    case TEXT_FIELD -> "500×700×300mm";
                    default -> null;
                };
        return new CategoryOptionSelection(group.groupId(), value.valueId(), text);
    }

    private void givenBunjangCategory(long categoryId, String bunjangCategoryId) {
        CategoryPlatform mapping = mock(CategoryPlatform.class);
        when(mapping.getExternalCategoryId()).thenReturn(bunjangCategoryId);
        when(categoryPlatformRepository.findByCategory_IdAndPlatform_Name(categoryId, "번개장터"))
                .thenReturn(Optional.of(mapping));
    }
}
