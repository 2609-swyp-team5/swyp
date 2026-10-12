package com.swyp.team5.aichat.service;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import com.swyp.team5.aichat.dto.AiChatAnswerResponse;
import com.swyp.team5.aichat.dto.AiChatDeleteAllResponse;
import com.swyp.team5.aichat.dto.AiChatDetailResponse;
import com.swyp.team5.aichat.dto.AiChatMessageResponse;
import com.swyp.team5.aichat.dto.AiChatSummaryResponse;
import com.swyp.team5.aichat.entity.AiChat;
import com.swyp.team5.aichat.entity.AiChatMessage;
import com.swyp.team5.aichat.error.AiChatMessageNotFoundException;
import com.swyp.team5.aichat.error.AiChatNotFoundException;
import com.swyp.team5.aichat.error.InvalidAiChatCursorException;
import com.swyp.team5.aichat.repository.AiChatMessageRepository;
import com.swyp.team5.aichat.repository.AiChatRepository;
import com.swyp.team5.aichat.service.AiChatAnswerService.Answer;
import com.swyp.team5.aichat.service.AiChatQuestionInterpreter.Turn;
import com.swyp.team5.common.common.CursorPageResponse;
import com.swyp.team5.member.repository.MemberRepository;

/**
 * 지금이니 AI 대화 — 최근 대화 목록·대화 열기·질문·다시 만들기·삭제. 질문을 받으면 질문을 먼저 저장하고(트랜잭션 1), 트랜잭션 밖에서
 * 답변을 만든 뒤(AI 호출 최대 2회 + 필요 시 분석 요청), 답변을 저장한다(트랜잭션 2). 답변 만들기가 예외로 끝나면 질문만 남고, 다시
 * 질문하거나 다시 만들기로 이어 갈 수 있다.
 */
@Service
public class AiChatService {

    /** AI에 맥락으로 함께 보내는 직전 메시지 수(질문·답변 2턴). */
    static final int HISTORY_MESSAGES = 4;

    private static final ZoneId CURSOR_ZONE = ZoneId.of("Asia/Seoul");

    private final AiChatRepository aiChatRepository;
    private final AiChatMessageRepository aiChatMessageRepository;
    private final MemberRepository memberRepository;
    private final AiChatAnswerService aiChatAnswerService;
    private final TransactionTemplate transactionTemplate;
    private final TransactionTemplate readOnlyTransaction;

    public AiChatService(
            AiChatRepository aiChatRepository,
            AiChatMessageRepository aiChatMessageRepository,
            MemberRepository memberRepository,
            AiChatAnswerService aiChatAnswerService,
            TransactionTemplate transactionTemplate) {
        this.aiChatRepository = aiChatRepository;
        this.aiChatMessageRepository = aiChatMessageRepository;
        this.memberRepository = memberRepository;
        this.aiChatAnswerService = aiChatAnswerService;
        this.transactionTemplate = transactionTemplate;
        this.readOnlyTransaction = new TransactionTemplate(transactionTemplate.getTransactionManager());
        this.readOnlyTransaction.setReadOnly(true);
    }

    /**
     * 본인 최근 대화 목록(마지막 메시지 시각 내림차순).
     *
     * @param cursor 이전 응답의 {@code nextCursor}(선택, {@code null}이면 첫 페이지)
     * @return 커서 페이지 응답({@code totalCount}는 매 페이지 채움)
     * @throws InvalidAiChatCursorException 해석할 수 없는 커서인 경우(400)
     */
    public CursorPageResponse<AiChatSummaryResponse> getChats(Long memberId, String cursor, int size) {
        return readOnlyTransaction.execute(status -> {
            PageRequest page = PageRequest.of(0, size + 1);
            List<AiChat> chats;
            if (cursor == null || cursor.isBlank()) {
                chats = aiChatRepository.findRecent(memberId, page);
            } else {
                ChatCursor decoded = ChatCursor.decode(cursor);
                chats = aiChatRepository.findRecentAfter(memberId, decoded.updatedAt(), decoded.id(), page);
            }
            return CursorPageResponse.of(
                            chats.stream().map(AiChatSummaryResponse::from).toList(),
                            size,
                            chat -> ChatCursor.encode(chat.updatedAt(), chat.chatId()))
                    .withTotalCount(aiChatRepository.countByMemberId(memberId));
        });
    }

    /**
     * 대화 열기 — 질문·답변을 오래된 순으로.
     *
     * @throws AiChatNotFoundException 없거나 본인 대화가 아닌 경우
     */
    public AiChatDetailResponse getMessages(Long memberId, Long chatId) {
        return readOnlyTransaction.execute(status -> {
            AiChat chat = findOwnedChat(memberId, chatId);
            List<AiChatMessageResponse> messages = aiChatMessageRepository.findByChatIdOrderByIdAsc(chatId).stream()
                    .map(AiChatMessageResponse::from)
                    .toList();
            return new AiChatDetailResponse(chat.getId(), chat.getTitle(), messages);
        });
    }

    /** 새 대화를 만들고 첫 질문에 답한다(제목 = 첫 질문 앞 30자). */
    public AiChatAnswerResponse startChat(Long memberId, String message) {
        Saved saved = transactionTemplate.execute(status -> {
            AiChat chat = aiChatRepository.save(AiChat.start(memberRepository.getReferenceById(memberId), message));
            AiChatMessage question = aiChatMessageRepository.save(AiChatMessage.question(chat, message));
            return new Saved(chat.getId(), question.getId(), List.of());
        });
        return answerAndSave(memberId, saved, message);
    }

    /**
     * 이어서 질문한다.
     *
     * @throws AiChatNotFoundException 없거나 본인 대화가 아닌 경우
     */
    public AiChatAnswerResponse ask(Long memberId, Long chatId, String message) {
        Saved saved = transactionTemplate.execute(status -> {
            AiChat chat = findOwnedChat(memberId, chatId);
            List<Turn> history = history(aiChatMessageRepository.findByChatIdOrderByIdAsc(chatId));
            AiChatMessage question = aiChatMessageRepository.save(AiChatMessage.question(chat, message));
            chat.touch();
            return new Saved(chat.getId(), question.getId(), history);
        });
        return answerAndSave(memberId, saved, message);
    }

    /**
     * 답변을 다시 만든다. 그 답변과 뒤에 이어진 메시지는 지우고, 바로 앞 질문으로(새 질문을 보냈으면 질문을 고친 뒤) 다시 답한다.
     *
     * @param answerId 다시 만들 답변(ASSISTANT) 메시지 ID
     * @param editedQuestion 바꿀 질문 내용(선택, {@code null}이면 기존 질문 그대로)
     * @throws AiChatNotFoundException 없거나 본인 대화가 아닌 경우
     * @throws AiChatMessageNotFoundException 대화 안에 없는 메시지이거나 답변이 아닌 경우
     */
    public AiChatAnswerResponse regenerate(Long memberId, Long chatId, Long answerId, String editedQuestion) {
        Regenerating target = transactionTemplate.execute(status -> {
            AiChat chat = findOwnedChat(memberId, chatId);
            List<AiChatMessage> messages = aiChatMessageRepository.findByChatIdOrderByIdAsc(chatId);
            int index = indexOf(messages, answerId);
            if (index < 1
                    || messages.get(index).isQuestion()
                    || !messages.get(index - 1).isQuestion()) {
                throw new AiChatMessageNotFoundException();
            }
            AiChatMessage question = messages.get(index - 1);
            if (editedQuestion != null && !editedQuestion.isBlank()) {
                question.editQuestion(editedQuestion);
            }
            String content = question.getContent();
            List<Turn> history = history(messages.subList(0, index - 1));
            aiChatMessageRepository.deleteFrom(chatId, answerId);
            aiChatRepository.findById(chatId).ifPresent(AiChat::touch);
            return new Regenerating(new Saved(chat.getId(), question.getId(), history), content);
        });
        return answerAndSave(memberId, target.saved(), target.question());
    }

    /**
     * 대화를 지운다(메시지도 함께 — DB ON DELETE CASCADE).
     *
     * @throws AiChatNotFoundException 없거나 본인 대화가 아닌 경우
     */
    public void delete(Long memberId, Long chatId) {
        transactionTemplate.executeWithoutResult(status -> aiChatRepository.delete(findOwnedChat(memberId, chatId)));
    }

    /**
     * 본인 대화를 모두 지운다(최근 대화 목록 비우기). 대화가 없어도 성공(0건)이다.
     *
     * @return 지운 대화 수
     */
    public AiChatDeleteAllResponse deleteAll(Long memberId) {
        return transactionTemplate.execute(
                status -> new AiChatDeleteAllResponse(aiChatRepository.deleteAllByMemberId(memberId)));
    }

    private AiChatAnswerResponse answerAndSave(Long memberId, Saved saved, String question) {
        Answer answer = aiChatAnswerService.answer(memberId, question, saved.history());
        return transactionTemplate.execute(status -> {
            AiChat chat = aiChatRepository.findById(saved.chatId()).orElseThrow(AiChatNotFoundException::new);
            AiChatMessage savedAnswer = aiChatMessageRepository.save(
                    AiChatMessage.answer(chat, answer.content(), answer.intent(), answer.payload()));
            chat.touch();
            aiChatMessageRepository.flush();
            AiChatMessage questionMessage =
                    aiChatMessageRepository.findById(saved.questionId()).orElseThrow(AiChatNotFoundException::new);
            return new AiChatAnswerResponse(
                    chat.getId(),
                    chat.getTitle(),
                    AiChatMessageResponse.from(questionMessage),
                    AiChatMessageResponse.from(savedAnswer));
        });
    }

    private AiChat findOwnedChat(Long memberId, Long chatId) {
        return aiChatRepository
                .findById(chatId)
                .filter(chat -> chat.isOwnedBy(memberId))
                .orElseThrow(AiChatNotFoundException::new);
    }

    private static List<Turn> history(List<AiChatMessage> messages) {
        int from = Math.max(0, messages.size() - HISTORY_MESSAGES);
        return messages.subList(from, messages.size()).stream()
                .map(message -> new Turn(message.isQuestion(), message.getContent()))
                .toList();
    }

    private static int indexOf(List<AiChatMessage> messages, Long messageId) {
        for (int i = 0; i < messages.size(); i++) {
            if (messages.get(i).getId().equals(messageId)) {
                return i;
            }
        }
        return -1;
    }

    private record Saved(Long chatId, Long questionId, List<Turn> history) {}

    private record Regenerating(Saved saved, String question) {}

    /** 커서 = 마지막 항목의 updatedAt(epoch 마이크로초)과 chatId를 "_"로 이은 문자열. */
    record ChatCursor(LocalDateTime updatedAt, Long id) {

        static String encode(LocalDateTime updatedAt, Long id) {
            Instant instant = updatedAt.atZone(CURSOR_ZONE).toInstant();
            long micros = instant.getEpochSecond() * 1_000_000 + instant.getNano() / 1_000;
            return micros + "_" + id;
        }

        static ChatCursor decode(String cursor) {
            try {
                String[] parts = cursor.split("_");
                long micros = Long.parseLong(parts[0]);
                Instant instant = Instant.ofEpochSecond(micros / 1_000_000, (micros % 1_000_000) * 1_000);
                return new ChatCursor(LocalDateTime.ofInstant(instant, CURSOR_ZONE), Long.parseLong(parts[1]));
            } catch (RuntimeException e) {
                throw new InvalidAiChatCursorException();
            }
        }
    }
}
