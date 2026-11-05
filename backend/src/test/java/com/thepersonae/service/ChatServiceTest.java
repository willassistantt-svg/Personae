package com.thepersonae.service;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ChatServiceTest {

    @Test
    void trimsAndNormalisesLineBreaks() {
        assertThat(ChatService.clean("  oi\r\ntudo bem?  ")).isEqualTo("oi\ntudo bem?");
    }

    @Test
    void rejectsEmptyAndOversizedMessages() {
        assertThatThrownBy(() -> ChatService.clean("   \n ")).hasFieldOrPropertyWithValue("code", "CHAT_EMPTY");
        assertThatThrownBy(() -> ChatService.clean(null)).hasFieldOrPropertyWithValue("code", "CHAT_EMPTY");
        assertThatThrownBy(() -> ChatService.clean("a".repeat(ChatService.MAX_LENGTH + 1))).hasFieldOrPropertyWithValue("code", "CHAT_TOO_LONG");
        assertThat(ChatService.clean("a".repeat(ChatService.MAX_LENGTH))).hasSize(ChatService.MAX_LENGTH);
    }

    @Test
    void limitsBurstsPerUserAndRecoversAfterTheWindow() {
        MutableClock clock = new MutableClock(Instant.parse("2026-11-04T12:00:00Z"));
        ChatService service = new ChatService(null, null, null, null, null, clock);
        UUID user = UUID.randomUUID();
        for (int i = 0; i < ChatService.RATE_LIMIT; i++) {
            service.throttle(user);
        }
        assertThatThrownBy(() -> service.throttle(user)).hasFieldOrPropertyWithValue("code", "CHAT_RATE");
        service.throttle(UUID.randomUUID());
        clock.now = clock.now.plusSeconds(ChatService.RATE_WINDOW_SECONDS + 1);
        service.throttle(user);
    }

    private static final class MutableClock extends Clock {
        Instant now;

        MutableClock(Instant now) {
            this.now = now;
        }

        @Override
        public ZoneOffset getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(java.time.ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }
}
