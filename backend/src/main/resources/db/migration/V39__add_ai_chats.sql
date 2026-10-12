-- 지금이니 AI 대화 — 회원별 대화(최근 대화 목록)와 대화 안의 질문·답변 메시지
CREATE TABLE ai_chats (
    chat_id    BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    member_id  BIGINT       NOT NULL,
    title      VARCHAR(100) NOT NULL,
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ai_chats_member FOREIGN KEY (member_id) REFERENCES members (member_id) ON DELETE CASCADE
);

CREATE INDEX idx_ai_chats_member_updated ON ai_chats (member_id, updated_at DESC, chat_id DESC);

COMMENT ON TABLE ai_chats IS '지금이니 AI 대화. 회원 본인만 조회·삭제하며 삭제하면 메시지도 함께 지운다';
COMMENT ON COLUMN ai_chats.title IS '대화 제목 — 첫 질문 앞 30자';
COMMENT ON COLUMN ai_chats.updated_at IS '마지막 메시지 시각. 최근 대화 목록 정렬 기준';

CREATE TABLE ai_chat_messages (
    message_id BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    chat_id    BIGINT      NOT NULL,
    role       VARCHAR(20) NOT NULL,
    content    TEXT        NOT NULL,
    intent     VARCHAR(20),
    payload    JSONB,
    created_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ai_chat_messages_chat FOREIGN KEY (chat_id) REFERENCES ai_chats (chat_id) ON DELETE CASCADE,
    CONSTRAINT ck_ai_chat_messages_role CHECK (role IN ('USER', 'ASSISTANT')),
    CONSTRAINT ck_ai_chat_messages_intent CHECK (intent IN ('SELL', 'BUY', 'PRICE', 'UNKNOWN'))
);

CREATE INDEX idx_ai_chat_messages_chat ON ai_chat_messages (chat_id, message_id);

COMMENT ON TABLE ai_chat_messages IS '지금이니 AI 대화의 메시지. 질문(USER)과 답변(ASSISTANT)이 번갈아 쌓인다';
COMMENT ON COLUMN ai_chat_messages.content IS '질문 원문 또는 답변 설명 문장';
COMMENT ON COLUMN ai_chat_messages.intent IS '답변이 판단한 질문 의도(SELL 팔기/BUY 사기/PRICE 시세/UNKNOWN). 질문(USER)은 NULL';
COMMENT ON COLUMN ai_chat_messages.payload IS '답변 카드(JSON) — 상세 시세 분석 카드(analysis)와 추천 상품(recommendedProducts). 질문(USER)은 NULL';
