package com.swyp.team5.category.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import com.swyp.team5.category.dto.CategoryOptionGroupResponse;
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

    private void givenBunjangCategory(long categoryId, String bunjangCategoryId) {
        CategoryPlatform mapping = mock(CategoryPlatform.class);
        when(mapping.getExternalCategoryId()).thenReturn(bunjangCategoryId);
        when(categoryPlatformRepository.findByCategory_IdAndPlatform_Name(categoryId, "번개장터"))
                .thenReturn(Optional.of(mapping));
    }
}
