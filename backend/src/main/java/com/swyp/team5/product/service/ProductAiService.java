package com.swyp.team5.product.service;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.util.MimeType;
import org.springframework.util.MimeTypeUtils;
import org.springframework.web.multipart.MultipartFile;

import com.swyp.team5.category.entity.Category;
import com.swyp.team5.category.error.CategoryNotFoundException;
import com.swyp.team5.category.error.CategoryNotLeafException;
import com.swyp.team5.category.repository.CategoryRepository;
import com.swyp.team5.common.ai.AiChatExecutor;
import com.swyp.team5.product.dto.ProductAiAnalysisResult;

/**
 * 상품 이미지를 AI(Gemini, 실패 시 OpenAI GPT)에 전달해 상품 정보(제목/브랜드/설명/카테고리/상태 등급/추정 판매가/태그/구성품)를
 * 자동으로 추론하는 서비스. 구매 일시/결함 여부는 AI가 추론하지 않고 사용자가 직접 입력한다.
 */
@Service
public class ProductAiService {

    private static final String SYSTEM_PROMPT =
            """
            너는 중고거래 플랫폼의 상품 등록을 돕는 AI야. 업로드된 상품 사진들을 분석해서
            상품 제목, 브랜드, 설명, 카테고리, 상태 등급, 추정 판매가, 판단 근거, 태그, 구성품을 정확하게 추론해.
            categoryId는 반드시 아래 카테고리 목록에 있는 최하위 카테고리 ID 중 하나여야 해. 목록은 한 줄에
            "상위 경로: 최하위 이름=ID, 최하위 이름=ID, ..." 형식이야(예: "디지털 > 휴대폰: 스마트폰=3"이면
            디지털 > 휴대폰 > 스마트폰의 ID가 3). 상위가 없는 최하위 카테고리는 "(대분류)" 줄에 있어.
            brand는 로고/각인 등 사진에서 브랜드를 명확히 식별할 수 있을 때만 채우고, 확인할 수 없으면
            null로 남겨(추측해서 지어내지 마).
            includedItems는 사진에 실제로 함께 찍혀 있는 구성품(박스, 충전기, 케이블, 이어폰, 설명서 등)만
            나열하고, 사진에서 보이지 않는 것은 추측해서 넣지 마(없으면 빈 배열).
            suggestedPrice는 상품 종류와 상태 등급을 참고해 국내 중고거래 플랫폼에서 통용되는
            원화(KRW) 시세 감각으로 추정하되, 확신이 없어도 0원이 아닌 합리적인 범위의 값을 제시해.
            analysisDescription에는 사진에서 관찰한 외관/구성품 상태를 근거로 왜 그 상태 등급과
            적정가를 제시했는지 간결하게 설명해.

            카테고리 목록:
            %s
            """;

    private static final String USER_PROMPT = "첨부된 상품 사진들을 분석해서 상품 정보를 추론해줘.";

    private final AiChatExecutor aiChatExecutor;
    private final CategoryRepository categoryRepository;

    public ProductAiService(AiChatExecutor aiChatExecutor, CategoryRepository categoryRepository) {
        this.aiChatExecutor = aiChatExecutor;
        this.categoryRepository = categoryRepository;
    }

    /**
     * 상품 이미지들을 분석해 상품 정보를 추론한다. 등록된 카테고리가 하나도 없으면 AI 호출 전에
     * 즉시 실패하며, AI에는 최하위 카테고리만 보여주고 반환한 {@code categoryId}도 존재·최하위 여부를 검증한다.
     *
     * @param images 분석할 상품 이미지 목록
     * @return AI가 추론한 상품 정보
     * @throws CategoryNotFoundException 등록된 카테고리가 없거나, AI가 반환한 카테고리가 존재하지
     *     않는 경우
     * @throws CategoryNotLeafException AI가 최하위가 아닌 카테고리를 반환한 경우
     */
    public ProductAiAnalysisResult analyze(List<MultipartFile> images) {
        List<Category> categories = categoryRepository.findAllByOrderByIdAsc();
        if (categories.isEmpty()) {
            throw new CategoryNotFoundException();
        }

        // 상품은 최하위 카테고리에만 등록할 수 있고, 최하위 이름만으로는 중복이 있어(케이스/보호필름/액세서리 등)
        // 상위 경로를 함께 보여준다. 최하위마다 전체 경로를 반복하면 프롬프트가 커져(669개 기준 약 1.4만 토큰)
        // 같은 부모의 최하위를 한 줄로 묶는다(약 7천 토큰)
        Map<Long, Category> byId = categories.stream().collect(Collectors.toMap(Category::getId, Function.identity()));
        String categoryList = groupedLeafList(categories, byId);

        // Gemini가 실패하면 같은 요청을 OpenAI GPT로 대체 호출
        ProductAiAnalysisResult result = aiChatExecutor.call("상품 이미지 분석", client -> client.prompt()
                .system(SYSTEM_PROMPT.formatted(categoryList))
                .user(user -> {
                    user.text(USER_PROMPT);
                    images.forEach(image -> user.media(mimeTypeOf(image), toResource(image)));
                })
                .call()
                .entity(ProductAiAnalysisResult.class));

        assert result != null;
        if (!byId.containsKey(result.categoryId())) {
            throw new CategoryNotFoundException(result.categoryId());
        }
        if (!byId.get(result.categoryId()).isLeaf()) {
            throw new CategoryNotLeafException(result.categoryId());
        }
        return result;
    }

    /** 최하위 카테고리를 부모 경로별로 묶어 "디지털 > 휴대폰: 스마트폰=3, 태블릿=4" 형태의 줄로 만든다(조회 순서 유지). */
    private static String groupedLeafList(List<Category> categories, Map<Long, Category> byId) {
        Map<String, List<String>> leavesByParentPath = new LinkedHashMap<>();
        for (Category category : categories) {
            if (!category.isLeaf()) {
                continue;
            }
            String parentPath = category.getParent() == null
                    ? "(대분류)"
                    : pathOf(byId.get(category.getParent().getId()), byId);
            leavesByParentPath
                    .computeIfAbsent(parentPath, key -> new ArrayList<>())
                    .add("%s=%d".formatted(category.getName(), category.getId()));
        }
        return leavesByParentPath.entrySet().stream()
                .map(entry -> entry.getKey() + ": " + String.join(", ", entry.getValue()))
                .collect(Collectors.joining("\n"));
    }

    // 부모는 지연 로딩 프록시라 이름 대신 ID만 꺼내고, 이름은 이미 조회한 목록에서 찾는다
    private static String pathOf(Category category, Map<Long, Category> byId) {
        List<String> names = new ArrayList<>();
        for (Category current = category; current != null; ) {
            names.addFirst(current.getName());
            current = current.getParent() == null
                    ? null
                    : byId.get(current.getParent().getId());
        }
        return String.join(" > ", names);
    }

    private static MimeType mimeTypeOf(MultipartFile image) {
        String contentType = image.getContentType();
        return contentType != null ? MimeTypeUtils.parseMimeType(contentType) : MimeTypeUtils.IMAGE_JPEG;
    }

    private static Resource toResource(MultipartFile image) {
        try {
            return new ByteArrayResource(image.getBytes());
        } catch (IOException e) {
            throw new UncheckedIOException("상품 이미지를 읽는 중 오류가 발생했습니다.", e);
        }
    }
}
