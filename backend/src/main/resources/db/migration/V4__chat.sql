CREATE TABLE chat_conversations (
    id UUID PRIMARY KEY,
    member_id UUID NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
    last_message_at TIMESTAMPTZ,
    member_read_at TIMESTAMPTZ,
    house_read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_chat_conversations_last ON chat_conversations (last_message_at DESC);

CREATE TABLE chat_messages (
    id UUID PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES chat_conversations (id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users (id) ON DELETE SET NULL,
    from_house BOOLEAN NOT NULL,
    body VARCHAR(2000) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_chat_messages_conversation ON chat_messages (conversation_id, created_at DESC);
