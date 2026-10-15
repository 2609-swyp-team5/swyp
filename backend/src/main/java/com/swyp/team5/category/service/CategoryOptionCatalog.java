package com.swyp.team5.category.service;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.List;
import java.util.Map;

import lombok.extern.slf4j.Slf4j;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import com.swyp.team5.category.dto.CategoryOptionGroupResponse;
import tools.jackson.databind.ObjectMapper;

/**
 * 번개장터 카테고리별 추가 항목(옵션) 정의. 번개장터 등록 화면이 쓰는 옵션 API는 회원 로그인이 필요해 요청마다 부를 수 없으므로,
 * 리프 카테고리 전체를 미리 수집한 스냅샷({@value #RESOURCE_PATH}, 키 = 번개장터 카테고리 ID)을 시작 시 읽어 둔다. 번개장터가
 * 항목을 바꾸면 스냅샷을 다시 수집해 교체한다(수집 방법은 {@code docs/시세수집-번개장터-API-참고.md}).
 */
@Slf4j
@Component
public class CategoryOptionCatalog {

    static final String RESOURCE_PATH = "bunjang/category-options.json";

    private final Map<String, List<CategoryOptionGroupResponse>> groupsByBunjangCategoryId;

    public CategoryOptionCatalog(ObjectMapper objectMapper) {
        try (InputStream input = new ClassPathResource(RESOURCE_PATH).getInputStream()) {
            Snapshot snapshot = objectMapper.readValue(input, Snapshot.class);
            this.groupsByBunjangCategoryId = Map.copyOf(snapshot.categories());
            log.info(
                    "번개장터 카테고리 옵션 정의 로드. 수집일={}, 옵션 있는 카테고리={}",
                    snapshot.collectedAt(),
                    groupsByBunjangCategoryId.size());
        } catch (IOException e) {
            throw new UncheckedIOException("번개장터 카테고리 옵션 정의를 읽지 못했습니다: " + RESOURCE_PATH, e);
        }
    }

    /** 번개장터 카테고리의 추가 항목(없으면 빈 목록). */
    public List<CategoryOptionGroupResponse> groupsOf(String bunjangCategoryId) {
        return groupsByBunjangCategoryId.getOrDefault(bunjangCategoryId, List.of());
    }

    private record Snapshot(String collectedAt, Map<String, List<CategoryOptionGroupResponse>> categories) {}
}
