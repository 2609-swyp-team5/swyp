package com.swyp.team5.product.service;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.util.MimeType;
import org.springframework.util.MimeTypeUtils;
import org.springframework.web.multipart.MultipartFile;

import com.swyp.team5.category.entity.Category;
import com.swyp.team5.category.error.CategoryNotFoundException;
import com.swyp.team5.category.repository.CategoryRepository;
import com.swyp.team5.product.dto.ProductAiAnalysisResult;

@Service
public class ProductAiService {

    private static final String SYSTEM_PROMPT =
            """
            너는 중고거래 플랫폼의 상품 등록을 돕는 AI야. 업로드된 상품 사진들을 분석해서
            상품 제목, 설명, 카테고리, 상태 등급, 결함 여부, 태그를 정확하게 추론해.
            categoryId는 반드시 아래 카테고리 목록에 있는 값 중 하나여야 해.

            카테고리 목록:
            %s
            """;

    private static final String USER_PROMPT = "첨부된 상품 사진들을 분석해서 상품 정보를 추론해줘.";

    private final ChatClient geminiAiClient;
    private final CategoryRepository categoryRepository;

    public ProductAiService(
            @Qualifier("geminiAiClient") ChatClient geminiAiClient, CategoryRepository categoryRepository) {
        this.geminiAiClient = geminiAiClient;
        this.categoryRepository = categoryRepository;
    }

    public ProductAiAnalysisResult analyze(List<MultipartFile> images) {
        List<Category> categories = categoryRepository.findAllByOrderByIdAsc();
        if (categories.isEmpty()) {
            throw new CategoryNotFoundException();
        }

        String categoryList = categories.stream()
                .map(category -> "- %d: %s".formatted(category.getId(), category.getName()))
                .collect(Collectors.joining("\n"));

        ProductAiAnalysisResult result = geminiAiClient
                .prompt()
                .system(SYSTEM_PROMPT.formatted(categoryList))
                .user(user -> {
                    user.text(USER_PROMPT);
                    images.forEach(image -> user.media(mimeTypeOf(image), toResource(image)));
                })
                .call()
                .entity(ProductAiAnalysisResult.class);

        assert result != null;
        if (!categoryRepository.existsById(result.categoryId())) {
            throw new CategoryNotFoundException(result.categoryId());
        }
        return result;
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
