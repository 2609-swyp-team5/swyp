package com.swyp.team5.category.service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.format.ResolverStyle;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
import com.swyp.team5.platform.entity.PlatformType;
import com.swyp.team5.platform.repository.CategoryPlatformRepository;

/**
 * 카테고리별 추가 항목(사이즈·용량·사용기한 등). 우리 카테고리는 번개장터 카테고리와 1:1이라({@code category_platforms}) 번개장터
 * 옵션 정의({@link CategoryOptionCatalog})를 그대로 쓴다. 상품 등록·수정 시 입력값을 검증하고, 입력 화면에서 받지 않는
 * 필수 항목(사이즈·사용기한 등)은 카탈로그의 기본값으로 보완한다. 번개장터 게시 전에도 빠진 필수 항목을 기본값으로 채운다.
 */
@Service
@RequiredArgsConstructor
public class CategoryOptionService {

    private static final DateTimeFormatter DATE_INPUT =
            DateTimeFormatter.ofPattern("uuuuMMdd").withResolverStyle(ResolverStyle.STRICT);

    private final CategoryRepository categoryRepository;
    private final CategoryPlatformRepository categoryPlatformRepository;
    private final CategoryOptionCatalog catalog;

    /**
     * @throws CategoryNotFoundException 존재하지 않는 카테고리인 경우
     */
    @Transactional(readOnly = true)
    public List<CategoryOptionGroupResponse> getOptions(Long categoryId) {
        if (!categoryRepository.existsById(categoryId)) {
            throw new CategoryNotFoundException(categoryId);
        }
        return groupsOf(categoryId);
    }

    /**
     * 입력한 추가 항목을 옵션 정의로 검증해 저장할 값(항목·값 이름 포함)으로 바꾼다. 항목마다 하나만 입력할 수 있고, 입력하지 않은
     * 필수 항목은 카탈로그의 "기타"·"표시 없음" 값을 우선 사용한다. 해당 값이 없으면 첫 번째 선택값으로 보완한다.
     *
     * @param selections 입력한 추가 항목(null이면 입력 없음)
     * @throws InvalidCategoryOptionException 없는 항목·값이거나, 직접 입력 값이 형식에 맞지 않거나, 필수 항목이 빠진 경우
     */
    @Transactional(readOnly = true)
    public List<SelectedCategoryOption> resolve(Long categoryId, List<CategoryOptionSelection> selections) {
        List<CategoryOptionSelection> inputs = selections == null ? List.of() : selections;
        List<CategoryOptionGroupResponse> groups = groupsOf(categoryId);

        Set<String> inputGroupIds = new HashSet<>();
        for (CategoryOptionSelection input : inputs) {
            if (!inputGroupIds.add(input.groupId())) {
                throw invalid("같은 항목을 두 번 입력했어요. 항목마다 하나만 골라 주세요.", categoryId, input);
            }
            if (groups.stream().noneMatch(group -> group.groupId().equals(input.groupId()))) {
                throw invalid("이 카테고리에 없는 추가 항목이에요. 카테고리를 바꿨다면 추가 항목을 다시 골라 주세요.", categoryId, input);
            }
        }

        List<SelectedCategoryOption> resolved = new ArrayList<>();
        for (CategoryOptionGroupResponse group : groups) {
            Optional<CategoryOptionSelection> input = inputs.stream()
                    .filter(candidate -> candidate.groupId().equals(group.groupId()))
                    .findFirst();
            if (input.isEmpty()) {
                if (group.required()) {
                    input = defaultSelection(group);
                }
                if (input.isEmpty() && group.required()) {
                    throw new InvalidCategoryOptionException(
                            requiredMessage(group), "categoryId=" + categoryId + ", missingGroupId=" + group.groupId());
                }
                if (input.isEmpty()) {
                    continue;
                }
            }
            resolved.add(resolveOne(categoryId, group, input.get()));
        }
        return resolved;
    }

    /**
     * 저장된 추가 항목에 빠진 필수 항목을 기본값으로 채운다(기능 추가 전에 등록한 상품 등). 추가 항목은 사용자에게 입력받지 않으므로
     * 번개장터 게시 전에 이것으로 채운다. 빠진 게 없으면 저장된 값을 그대로 돌려준다.
     *
     * @throws InvalidCategoryOptionException 기본값으로 고를 선택지가 없는 필수 항목이 있는 경우
     */
    @Transactional(readOnly = true)
    public List<SelectedCategoryOption> fillRequiredDefaults(Long categoryId, List<SelectedCategoryOption> selected) {
        List<SelectedCategoryOption> filled = new ArrayList<>(selected);
        for (CategoryOptionGroupResponse group : groupsOf(categoryId)) {
            if (!group.required()
                    || selected.stream().anyMatch(option -> option.groupId().equals(group.groupId()))) {
                continue;
            }
            CategoryOptionSelection fallback = defaultSelection(group)
                    .orElseThrow(() -> new InvalidCategoryOptionException(
                            requiredMessage(group),
                            "categoryId=" + categoryId + ", missingGroupId=" + group.groupId()));
            filled.add(resolveOne(categoryId, group, fallback));
        }
        return filled;
    }

    /** 필수 항목이 빠졌을 때의 안내(번개장터 화면 문구 그대로 — 예: "사이즈를 선택해 주세요."). */
    public static String requiredMessage(CategoryOptionGroupResponse group) {
        return group.title() + ".";
    }

    /**
     * 직접 입력 화면에서 받지 않는 번개장터 필수 항목의 기본값을 찾는다.
     * 카탈로그에 실제로 존재하는 "기타"·"표시 없음" 값을 우선 사용하고, 없으면 첫 번째 선택값을 사용한다.
     */
    static Optional<CategoryOptionSelection> defaultSelection(CategoryOptionGroupResponse group) {
        String targetValue =
                switch (group.name()) {
                    case "사이즈", "샤프트 강도", "연식" -> "기타 (상품설명에 작성)";
                    case "사용기한" -> "사용기한 표시 없음";
                    case "소비기한" -> "소비기한 표시 없음";
                    default -> null;
                };

        Optional<CategoryOptionSelection> preferred = Optional.empty();
        if (targetValue != null) {
            preferred = group.children().stream()
                    .flatMap(child -> child.values().stream()
                            .filter(value -> value.value().equals(targetValue))
                            .map(value -> new CategoryOptionSelection(group.groupId(), value.valueId(), null)))
                    .findFirst();
        }

        return preferred.or(() -> group.children().stream()
                .flatMap(child -> child.values().stream())
                .findFirst()
                .map(value -> new CategoryOptionSelection(group.groupId(), value.valueId(), null)));
    }

    private SelectedCategoryOption resolveOne(
            Long categoryId, CategoryOptionGroupResponse group, CategoryOptionSelection input) {
        for (Child child : group.children()) {
            for (Value value : child.values()) {
                if (value.valueId() != input.valueId()) {
                    continue;
                }
                String chosen =
                        child.type().needsText() ? validText(categoryId, group, child, value, input) : value.value();
                return new SelectedCategoryOption(
                        group.groupId(), group.name(), child.name(), child.type(), value.valueId(), chosen);
            }
        }
        throw invalid("'" + group.name() + "' 항목에서 고를 수 없는 값이에요.", categoryId, input);
    }

    private String validText(
            Long categoryId,
            CategoryOptionGroupResponse group,
            Child child,
            Value value,
            CategoryOptionSelection input) {
        String text = input.text() == null ? "" : input.text().strip();
        if (text.isEmpty()) {
            throw invalid(requiredMessage(group), categoryId, input);
        }
        if (value.maxLength() != null && text.length() > value.maxLength()) {
            throw invalid("'" + group.name() + "'은(는) " + value.maxLength() + "자 이하로 입력해 주세요.", categoryId, input);
        }
        if (child.type() == CategoryOptionType.DATE_TEXT_FIELD && !isDate(text)) {
            throw invalid("'" + group.name() + "'은(는) 년월일 8자리로 입력해 주세요. (예: 20301231)", categoryId, input);
        }
        return text;
    }

    private static boolean isDate(String text) {
        try {
            LocalDate.parse(text, DATE_INPUT);
            return true;
        } catch (DateTimeParseException e) {
            return false;
        }
    }

    private List<CategoryOptionGroupResponse> groupsOf(Long categoryId) {
        return categoryPlatformRepository
                .findByCategory_IdAndPlatform_Name(categoryId, PlatformType.BUNJANG.getPlatformName())
                .map(CategoryPlatform::getExternalCategoryId)
                .map(catalog::groupsOf)
                .orElse(List.of());
    }

    private static InvalidCategoryOptionException invalid(
            String message, Long categoryId, CategoryOptionSelection input) {
        return new InvalidCategoryOptionException(
                message, "categoryId=" + categoryId + ", groupId=" + input.groupId() + ", valueId=" + input.valueId());
    }
}
