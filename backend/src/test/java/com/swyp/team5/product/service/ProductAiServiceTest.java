package com.swyp.team5.product.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.RETURNS_DEEP_STUBS;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.util.List;
import java.util.function.Consumer;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.mock.web.MockMultipartFile;

import com.swyp.team5.category.entity.Category;
import com.swyp.team5.category.error.CategoryNotFoundException;
import com.swyp.team5.category.repository.CategoryRepository;
import com.swyp.team5.product.dto.ProductAiAnalysisResult;
import com.swyp.team5.product.entity.ProductCondition;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

// 상품 이미지 AI 분석 단위 테스트.
@ExtendWith(MockitoExtension.class)
class ProductAiServiceTest {

    @Mock
    private CategoryRepository categoryRepository;

    private final ChatClient geminiAiClient = mock(ChatClient.class, RETURNS_DEEP_STUBS);

    private ProductAiService service() {
        return new ProductAiService(geminiAiClient, categoryRepository);
    }

    // AI 분석 성공
    @Test
    @SuppressWarnings("unchecked")
    void analyzeSucceedsWhenCategoryExists() {
        MockMultipartFile image = new MockMultipartFile("images", "phone.png", "image/png", new byte[] {1, 2, 3});
        ProductAiAnalysisResult analysis =
                new ProductAiAnalysisResult(1L, "아이폰 13", "설명", ProductCondition.A, 500_000L, "판단 근거", List.of("애플"));

        when(categoryRepository.findAllByOrderByIdAsc()).thenReturn(List.of(newCategory(1L, "전자기기")));
        when(geminiAiClient
                        .prompt()
                        .system(anyString())
                        .user(any(Consumer.class))
                        .call()
                        .entity(ProductAiAnalysisResult.class))
                .thenReturn(analysis);
        when(categoryRepository.existsById(1L)).thenReturn(true);

        ProductAiAnalysisResult result = service().analyze(List.of(image));

        assertThat(result).isEqualTo(analysis);
    }

    // AI 분석 실패 - 등록된 카테고리가 하나도 없어 AI 호출 전에 사전 차단되는 경우
    @Test
    void analyzeFailsWhenNoCategoriesExist() {
        MockMultipartFile image = new MockMultipartFile("images", "phone.png", "image/png", new byte[] {1, 2, 3});

        when(categoryRepository.findAllByOrderByIdAsc()).thenReturn(List.of());

        assertThatThrownBy(() -> service().analyze(List.of(image))).isInstanceOf(CategoryNotFoundException.class);
    }

    // AI 분석 실패 - AI가 존재하지 않는 카테고리를 추론한 경우
    @Test
    @SuppressWarnings("unchecked")
    void analyzeFailsWhenCategoryNotFound() {
        MockMultipartFile image = new MockMultipartFile("images", "phone.png", "image/png", new byte[] {1, 2, 3});
        ProductAiAnalysisResult analysis =
                new ProductAiAnalysisResult(99L, "아이폰 13", "설명", ProductCondition.A, 500_000L, "판단 근거", List.of("애플"));

        when(categoryRepository.findAllByOrderByIdAsc()).thenReturn(List.of(newCategory(1L, "전자기기")));
        when(geminiAiClient
                        .prompt()
                        .system(anyString())
                        .user(any(Consumer.class))
                        .call()
                        .entity(ProductAiAnalysisResult.class))
                .thenReturn(analysis);
        when(categoryRepository.existsById(99L)).thenReturn(false);

        assertThatThrownBy(() -> service().analyze(List.of(image))).isInstanceOf(CategoryNotFoundException.class);
    }

    private Category newCategory(Long id, String name) {
        try {
            Constructor<Category> constructor = Category.class.getDeclaredConstructor();
            constructor.setAccessible(true);
            Category category = constructor.newInstance();
            setField(category, "id", id);
            setField(category, "name", name);
            return category;
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
