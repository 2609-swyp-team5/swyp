package com.swyp.team5.aichat;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.asyncDispatch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jayway.jsonpath.JsonPath;
import com.swyp.team5.aichat.dto.AiChatStep;
import com.swyp.team5.aichat.dto.AiChatStreamEvent;
import com.swyp.team5.aichat.entity.AiChatIntent;
import com.swyp.team5.aichat.entity.AiChatPayload;
import com.swyp.team5.aichat.service.AiChatAnswerService.Answer;
import com.swyp.team5.aichat.service.AiChatProgress;
import com.swyp.team5.common.passport.JwtTokenProvider;
import com.swyp.team5.item.entity.ListingSource;
import com.swyp.team5.member.entity.Member;
import com.swyp.team5.member.entity.MemberRole;
import com.swyp.team5.member.repository.MemberRepository;
import com.swyp.team5.productanalysis.dto.AnalysisStatus;
import com.swyp.team5.productanalysis.entity.AnalysisRecommendation;
import com.swyp.team5.support.IntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

// 지금이니 AI 대화 API 통합 테스트 — 답변 조합(AiChatAnswerService)은 Mock, 저장·조회·다시 만들기·권한을 검증한다.
class AiChatTest extends IntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private Member owner;
    private String ownerToken;
    private String otherToken;

    @BeforeEach
    void setUp() {
        owner = memberRepository.save(newMember("owner"));
        Member other = memberRepository.save(newMember("other"));
        ownerToken = jwtTokenProvider.createAccessToken(owner.getId(), MemberRole.USER);
        otherToken = jwtTokenProvider.createAccessToken(other.getId(), MemberRole.USER);
        when(aiChatAnswerService.answer(anyLong(), anyString(), any(), any()))
                .thenAnswer(invocation -> answerFor(invocation.getArgument(1), invocation.getArgument(3)));
    }

    // 새 대화 — 질문·답변 저장, 제목 = 첫 질문 앞 30자, 카드(JSONB) 그대로 응답
    @Test
    void startChatSavesQuestionAndAnswerWithCards() throws Exception {
        String question = "아이폰 13 미니 지금 사도 될까? 128기가 미드나이트 색상으로 찾고 있어요";

        perform(post("/ai/chats"), ownerToken, "{\"message\":\"" + question + "\"}")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.title").value(question.substring(0, 30)))
                .andExpect(jsonPath("$.data.question.role").value("USER"))
                .andExpect(jsonPath("$.data.question.content").value(question))
                .andExpect(jsonPath("$.data.question.analysis").doesNotExist())
                .andExpect(
                        jsonPath("$.data.question.recommendedProducts.length()").value(0))
                .andExpect(jsonPath("$.data.answer.role").value("ASSISTANT"))
                .andExpect(jsonPath("$.data.answer.content").value("답변: " + question))
                .andExpect(jsonPath("$.data.answer.intent").value("BUY"))
                .andExpect(jsonPath("$.data.answer.analysis.productId").value(155400))
                .andExpect(jsonPath("$.data.answer.analysis.recommendation").value("BUY"))
                .andExpect(jsonPath("$.data.answer.analysis.analysisStatus").value("ANALYZED"))
                .andExpect(jsonPath("$.data.answer.recommendedProducts[0].priceDiffRate")
                        .value(-50.4))
                .andExpect(jsonPath("$.data.answer.recommendedProducts[0].platformName")
                        .value("번개장터"));
    }

    // 이어서 질문 — 직전 대화를 맥락으로 넘기고, 대화 열기는 오래된 순
    @Test
    void askPassesHistoryAndMessagesAreOrdered() throws Exception {
        Long chatId = startChat("아이폰 13 미니 시세 어때?");

        perform(post("/ai/chats/" + chatId + "/messages"), ownerToken, "{\"message\":\"그럼 256기가는?\"}")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.chatId").value(chatId))
                .andExpect(jsonPath("$.data.answer.content").value("답변: 그럼 256기가는?"));

        verify(aiChatAnswerService)
                .answer(
                        eq(owner.getId()),
                        eq("그럼 256기가는?"),
                        argThat(history -> history.size() == 2
                                && history.get(0).question()
                                && history.get(0).content().equals("아이폰 13 미니 시세 어때?")),
                        any());
        perform(get("/ai/chats/" + chatId + "/messages"), ownerToken, null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("아이폰 13 미니 시세 어때?"))
                .andExpect(jsonPath("$.data.messages.length()").value(4))
                .andExpect(jsonPath("$.data.messages[0].role").value("USER"))
                .andExpect(jsonPath("$.data.messages[1].role").value("ASSISTANT"))
                .andExpect(jsonPath("$.data.messages[2].content").value("그럼 256기가는?"))
                .andExpect(jsonPath("$.data.messages[3].analysis.title").value("애플 아이폰 13 미니 스타라이트"));
    }

    // 최근 대화 목록 — 마지막 메시지 순, 커서로 다음 페이지
    @Test
    void getChatsPagesByLatestMessage() throws Exception {
        Long first = startChat("첫 번째 질문");
        Long second = startChat("두 번째 질문");
        perform(post("/ai/chats/" + first + "/messages"), ownerToken, "{\"message\":\"첫 대화에 이어서\"}")
                .andExpect(status().isCreated());

        String page1 = perform(get("/ai/chats?size=1"), ownerToken, null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].chatId").value(first))
                .andExpect(jsonPath("$.data.hasNext").value(true))
                .andExpect(jsonPath("$.data.totalCount").value(2))
                .andReturn()
                .getResponse()
                .getContentAsString();
        String cursor = JsonPath.read(page1, "$.data.nextCursor");

        perform(get("/ai/chats?size=1&cursor=" + cursor), ownerToken, null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content.length()").value(1))
                .andExpect(jsonPath("$.data.content[0].chatId").value(second))
                .andExpect(jsonPath("$.data.hasNext").value(false));
        perform(get("/ai/chats"), otherToken, null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content.length()").value(0));
        perform(get("/ai/chats?cursor=bad"), ownerToken, null).andExpect(status().isBadRequest());
    }

    // 다시 만들기 — 질문 수정 시 질문을 고치고, 그 답변과 뒤 메시지를 지운 뒤 새 답변
    @Test
    void regenerateEditsQuestionAndReplacesLaterMessages() throws Exception {
        Long chatId = startChat("필름카메라 지금 팔까?");
        perform(post("/ai/chats/" + chatId + "/messages"), ownerToken, "{\"message\":\"FM2는?\"}")
                .andExpect(status().isCreated());
        String detail = perform(get("/ai/chats/" + chatId + "/messages"), ownerToken, null)
                .andReturn()
                .getResponse()
                .getContentAsString();
        Integer firstAnswerId = JsonPath.read(detail, "$.data.messages[1].messageId");
        Integer questionId = JsonPath.read(detail, "$.data.messages[0].messageId");

        perform(
                        post("/ai/chats/" + chatId + "/messages/" + firstAnswerId + "/regenerate"),
                        ownerToken,
                        "{\"message\":\"필름카메라 얼마에 팔 수 있어?\"}")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.question.messageId").value(questionId))
                .andExpect(jsonPath("$.data.question.content").value("필름카메라 얼마에 팔 수 있어?"))
                .andExpect(jsonPath("$.data.answer.content").value("답변: 필름카메라 얼마에 팔 수 있어?"));

        perform(get("/ai/chats/" + chatId + "/messages"), ownerToken, null)
                .andExpect(jsonPath("$.data.messages.length()").value(2))
                .andExpect(jsonPath("$.data.messages[0].content").value("필름카메라 얼마에 팔 수 있어?"));
        // 질문 메시지는 다시 만들 수 없음
        perform(post("/ai/chats/" + chatId + "/messages/" + questionId + "/regenerate"), ownerToken, null)
                .andExpect(status().isNotFound());
    }

    // 남의 대화는 열기·질문·삭제 모두 404, 본인은 삭제 후 404
    @Test
    void otherMembersChatIsHiddenAndDeleteRemovesIt() throws Exception {
        Long chatId = startChat("아이패드 시세");

        perform(get("/ai/chats/" + chatId + "/messages"), otherToken, null).andExpect(status().isNotFound());
        perform(post("/ai/chats/" + chatId + "/messages"), otherToken, "{\"message\":\"끼어들기\"}")
                .andExpect(status().isNotFound());
        perform(delete("/ai/chats/" + chatId), otherToken, null).andExpect(status().isNotFound());

        perform(delete("/ai/chats/" + chatId), ownerToken, null).andExpect(status().isOk());
        perform(get("/ai/chats/" + chatId + "/messages"), ownerToken, null).andExpect(status().isNotFound());
    }

    // 전체 삭제 — 본인 대화(메시지 포함)만 모두 지우고 지운 수를 응답, 남의 대화는 그대로
    @Test
    void deleteAllRemovesOnlyOwnChats() throws Exception {
        Long first = startChat("첫 대화");
        startChat("둘째 대화");
        String otherChat = perform(post("/ai/chats"), otherToken, "{\"message\":\"남의 대화\"}")
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();
        Integer otherChatId = JsonPath.read(otherChat, "$.data.chatId");

        perform(delete("/ai/chats"), ownerToken, null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.deletedCount").value(2));

        perform(get("/ai/chats"), ownerToken, null)
                .andExpect(jsonPath("$.data.content.length()").value(0))
                .andExpect(jsonPath("$.data.totalCount").value(0));
        perform(get("/ai/chats/" + first + "/messages"), ownerToken, null).andExpect(status().isNotFound());
        perform(get("/ai/chats/" + otherChatId + "/messages"), otherToken, null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.messages.length()").value(2));
        Long remaining = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM ai_chat_messages m JOIN ai_chats c ON c.chat_id = m.chat_id WHERE c.member_id = ?",
                Long.class,
                owner.getId());
        assertThat(remaining).isZero();
        perform(delete("/ai/chats"), ownerToken, null)
                .andExpect(jsonPath("$.data.deletedCount").value(0));
    }

    // 빈 질문·로그인 없이 호출
    @Test
    void rejectsBlankQuestionAndAnonymous() throws Exception {
        perform(post("/ai/chats"), ownerToken, "{\"message\":\"  \"}").andExpect(status().isBadRequest());
        mockMvc.perform(get("/ai/chats")).andExpect(status().isUnauthorized());
    }

    private Long startChat(String question) throws Exception {
        String body = perform(post("/ai/chats"), ownerToken, "{\"message\":\"" + question + "\"}")
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return ((Number) JsonPath.read(body, "$.data.chatId")).longValue();
    }

    private ResultActions perform(MockHttpServletRequestBuilder request, String token, String body) throws Exception {
        request.header(HttpHeaders.AUTHORIZATION, "Bearer " + token);
        if (body != null) {
            request.contentType(MediaType.APPLICATION_JSON).content(body);
        }
        return mockMvc.perform(request);
    }

    // 답변 스트림 — Accept: text/event-stream이면 단계 → 카드 결과 → 문장 조각 → complete(JSON 응답과 같은 필드) 순으로 보냄
    @Test
    void startChatStreamsStepsDeltasAndComplete() throws Exception {
        MvcResult started = mockMvc.perform(post("/ai/chats")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + ownerToken)
                        .accept(MediaType.TEXT_EVENT_STREAM)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"message\":\"아이폰 13 미니 살까?\"}"))
                .andExpect(request().asyncStarted())
                .andReturn();
        started.getAsyncResult(5_000);

        List<JsonNode> events = streamEvents(started);
        assertThat(events)
                .extracting(event -> event.at("/data/event").asText() + ":"
                        + event.at("/data/step").asText() + ":"
                        + event.at("/data/status").asText())
                .containsExactly(
                        "step:INTERPRET:START",
                        "step:INTERPRET:DONE",
                        "step:SEARCH:START",
                        "step:SEARCH:DONE",
                        "step:WRITE:START",
                        "delta::",
                        "delta::",
                        "step:WRITE:DONE",
                        "complete::");
        assertThat(events.get(0).at("/message").asText()).isEqualTo("질문을 이해하고 있어요.");
        assertThat(events.get(0).at("/data/total").asInt()).isEqualTo(3);
        assertThat(events.get(3).at("/data/result/analysis/productId").asLong()).isEqualTo(155400L);
        assertThat(events.get(3).at("/data/result/recommendedProducts/0/id").asLong())
                .isEqualTo(161932L);
        assertThat(events.get(5).at("/data/text").asText()
                        + events.get(6).at("/data/text").asText())
                .isEqualTo("답변: 아이폰 13 미니 살까?");
        JsonNode complete = events.get(8);
        assertThat(complete.at("/data/chatId").asLong()).isPositive();
        assertThat(complete.at("/data/answer/content").asText()).isEqualTo("답변: 아이폰 13 미니 살까?");
        assertThat(complete.at("/data/answer/analysis/productId").asLong()).isEqualTo(155400L);

        // 스트림으로 만든 답변도 저장되어 대화 열기에서 보임
        perform(get("/ai/chats/" + complete.at("/data/chatId").asLong() + "/messages"), ownerToken, null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.messages.length()").value(2))
                .andExpect(jsonPath("$.data.messages[1].content").value("답변: 아이폰 13 미니 살까?"));
    }

    // 답변 스트림 — 다른 회원 대화에 이어서 질문하면 스트림을 열기 전에 404(JSON)
    @Test
    void askStreamRejectsOtherMembersChatBeforeStreaming() throws Exception {
        Long chatId = startChat("아이폰 13 미니 시세 어때?");

        mockMvc.perform(post("/ai/chats/" + chatId + "/messages")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + otherToken)
                        .accept(MediaType.TEXT_EVENT_STREAM)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"message\":\"그럼 256기가는?\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("NOT_FOUND"));
    }

    private List<JsonNode> streamEvents(MvcResult started) throws Exception {
        String body = mockMvc.perform(asyncDispatch(started))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString(StandardCharsets.UTF_8);
        List<JsonNode> events = new ArrayList<>();
        for (String block : body.split("\n\n")) {
            StringBuilder data = new StringBuilder();
            for (String line : block.split("\n")) {
                if (line.startsWith("data:")) {
                    data.append(line.substring("data:".length()));
                }
            }
            if (!data.isEmpty()) {
                events.add(objectMapper.readTree(data.toString()));
            }
        }
        return events;
    }

    // 스트림 요청이면 실제 답변처럼 단계·카드·문장 조각을 알림
    private static Answer answerFor(String question, AiChatProgress progress) {
        Answer answer = answerFor(question);
        progress.started(AiChatStep.INTERPRET);
        progress.done(AiChatStep.INTERPRET, null);
        progress.started(AiChatStep.SEARCH);
        progress.done(
                AiChatStep.SEARCH,
                new AiChatStreamEvent.SearchResult(
                        answer.intent(),
                        answer.payload().analysis(),
                        answer.payload().recommendedProducts()));
        progress.started(AiChatStep.WRITE);
        if (progress.streamsText()) {
            progress.delta("답변: ");
            progress.delta(question);
        }
        progress.done(AiChatStep.WRITE, null);
        return answer;
    }

    private static Answer answerFor(String question) {
        AiChatPayload payload = new AiChatPayload(
                new AiChatPayload.AnalysisCard(
                        155400L,
                        ListingSource.EXTERNAL,
                        false,
                        "애플 아이폰 13 미니 스타라이트",
                        270_000L,
                        AnalysisRecommendation.BUY,
                        "평균보다 저렴해요.",
                        402_857L,
                        AnalysisStatus.ANALYZED),
                List.of(new AiChatPayload.RecommendedProduct(
                        161932L,
                        ListingSource.EXTERNAL,
                        "번개장터",
                        null,
                        "아이폰 13 미니 핑크",
                        200_000L,
                        402_857L,
                        new BigDecimal("-50.4"),
                        "https://example.com/161932")));
        return new Answer("답변: " + question, AiChatIntent.BUY, payload);
    }

    private static Member newMember(String prefix) {
        return Member.ofLocalSignUp(
                prefix + "-" + UUID.randomUUID() + "@example.com", null, "encoded-password", "회원", prefix, null);
    }
}
