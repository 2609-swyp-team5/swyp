package com.swyp.team5.product.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.RETURNS_DEEP_STUBS;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.util.List;
import java.util.function.Consumer;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.mock.web.MockMultipartFile;

import com.swyp.team5.category.entity.Category;
import com.swyp.team5.category.error.CategoryNotFoundException;
import com.swyp.team5.category.error.CategoryNotLeafException;
import com.swyp.team5.category.repository.CategoryRepository;
import com.swyp.team5.common.ai.AiChatExecutor;
import com.swyp.team5.product.dto.ProductAiAnalysisResult;
import com.swyp.team5.product.entity.ProductCondition;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

// 상품 이미지 AI 분석 단위 테스트.
@ExtendWith(MockitoExtension.class)
class ProductAiServiceTest {

    @Mock
    private CategoryRepository categoryRepository;

    private final ChatClient geminiAiClient = mock(ChatClient.class, RETURNS_DEEP_STUBS);
    private final ChatClient openAiClient = mock(ChatClient.class, RETURNS_DEEP_STUBS);

    private ProductAiService service() {
        return new ProductAiService(new AiChatExecutor(geminiAiClient, openAiClient), categoryRepository);
    }

    // AI 분석 성공
    @Test
    @SuppressWarnings("unchecked")
    void analyzeSucceedsWhenCategoryExists() {
        MockMultipartFile image = new MockMultipartFile("images", "phone.png", "image/png", new byte[] {1, 2, 3});
        ProductAiAnalysisResult analysis = new ProductAiAnalysisResult(
                1L, "아이폰 13", "애플", "설명", ProductCondition.A, 500_000L, "판단 근거", List.of("애플"), List.of());

        when(categoryRepository.findAllByOrderByIdAsc()).thenReturn(List.of(newCategory(1L, "전자기기")));
        when(geminiAiClient
                        .prompt()
                        .system(anyString())
                        .user(any(Consumer.class))
                        .call()
                        .entity(ProductAiAnalysisResult.class))
                .thenReturn(analysis);

        ProductAiAnalysisResult result = service().analyze(List.of(image));

        assertThat(result).isEqualTo(analysis);
    }

    // AI 분석 성공 - Gemini 호출이 실패하면 같은 요청을 GPT로 대체 호출
    @Test
    @SuppressWarnings("unchecked")
    void analyzeFallsBackToGptWhenGeminiFails() {
        MockMultipartFile image = new MockMultipartFile("images", "phone.png", "image/png", new byte[] {1, 2, 3});
        ProductAiAnalysisResult analysis = new ProductAiAnalysisResult(
                1L, "아이폰 13", "애플", "설명", ProductCondition.A, 500_000L, "판단 근거", List.of("애플"), List.of());

        when(categoryRepository.findAllByOrderByIdAsc()).thenReturn(List.of(newCategory(1L, "전자기기")));
        when(geminiAiClient.prompt()).thenThrow(new IllegalStateException("429 RESOURCE_EXHAUSTED"));
        when(openAiClient
                        .prompt()
                        .system(anyString())
                        .user(any(Consumer.class))
                        .call()
                        .entity(ProductAiAnalysisResult.class))
                .thenReturn(analysis);

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
        ProductAiAnalysisResult analysis = new ProductAiAnalysisResult(
                99L, "아이폰 13", "애플", "설명", ProductCondition.A, 500_000L, "판단 근거", List.of("애플"), List.of());

        when(categoryRepository.findAllByOrderByIdAsc()).thenReturn(List.of(newCategory(1L, "전자기기")));
        when(geminiAiClient
                        .prompt()
                        .system(anyString())
                        .user(any(Consumer.class))
                        .call()
                        .entity(ProductAiAnalysisResult.class))
                .thenReturn(analysis);

        assertThatThrownBy(() -> service().analyze(List.of(image))).isInstanceOf(CategoryNotFoundException.class);
    }

    // AI에는 최하위 카테고리만, 같은 부모 경로끼리 한 줄로 묶어 보여준다
    @Test
    @SuppressWarnings("unchecked")
    void analyzeShowsOnlyLeafCategoriesGroupedByParentPath() {
        MockMultipartFile image = new MockMultipartFile("images", "phone.png", "image/png", new byte[] {1, 2, 3});
        ProductAiAnalysisResult analysis = new ProductAiAnalysisResult(
                3L, "아이폰 13", "애플", "설명", ProductCondition.A, 500_000L, "판단 근거", List.of(), List.of());
        when(categoryRepository.findAllByOrderByIdAsc()).thenReturn(digitalTree());
        when(geminiAiClient
                        .prompt()
                        .system(anyString())
                        .user(any(Consumer.class))
                        .call()
                        .entity(ProductAiAnalysisResult.class))
                .thenReturn(analysis);

        service().analyze(List.of(image));

        ArgumentCaptor<String> systemPrompt = ArgumentCaptor.forClass(String.class);
        // 딥 스텁 설정 호출(anyString)도 기록되므로 실제 호출인 마지막 값을 본다
        verify(geminiAiClient.prompt(), atLeastOnce()).system(systemPrompt.capture());
        assertThat(systemPrompt.getValue())
                .contains("디지털 > 휴대폰: 스마트폰=3, 태블릿=4")
                .contains("(대분류): 기타=5")
                .doesNotContain("=1")
                .doesNotContain("=2");
    }

    // AI 분석 실패 - AI가 최하위가 아닌 카테고리를 추론한 경우
    @Test
    @SuppressWarnings("unchecked")
    void analyzeFailsWhenCategoryNotLeaf() {
        MockMultipartFile image = new MockMultipartFile("images", "phone.png", "image/png", new byte[] {1, 2, 3});
        ProductAiAnalysisResult analysis = new ProductAiAnalysisResult(
                2L, "아이폰 13", "애플", "설명", ProductCondition.A, 500_000L, "판단 근거", List.of(), List.of());
        when(categoryRepository.findAllByOrderByIdAsc()).thenReturn(digitalTree());
        when(geminiAiClient
                        .prompt()
                        .system(anyString())
                        .user(any(Consumer.class))
                        .call()
                        .entity(ProductAiAnalysisResult.class))
                .thenReturn(analysis);

        assertThatThrownBy(() -> service().analyze(List.of(image))).isInstanceOf(CategoryNotLeafException.class);
    }

    // 디지털(1) > 휴대폰(2) > 스마트폰(3)/태블릿(4) 최하위, 기타(5)는 상위 없는 최하위
    private List<Category> digitalTree() {
        Category digital = newCategory(1L, "디지털");
        Category phone = newCategory(2L, "휴대폰");
        Category smartphone = newCategory(3L, "스마트폰");
        Category tablet = newCategory(4L, "태블릿");
        Category etc = newCategory(5L, "기타");
        setField(digital, "hasChildren", true);
        setField(phone, "hasChildren", true);
        setField(phone, "parent", digital);
        setField(smartphone, "parent", phone);
        setField(tablet, "parent", phone);
        return List.of(digital, phone, smartphone, tablet, etc);
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
            // 상속받은 필드(Item의 id·createdAt 등)도 찾도록 상위 클래스까지 검색
            Field field = org.springframework.util.ReflectionUtils.findField(target.getClass(), fieldName);
            field.setAccessible(true);
            field.set(target, value);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }
}
