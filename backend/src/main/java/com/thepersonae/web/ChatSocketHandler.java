package com.thepersonae.web;

import com.thepersonae.domain.AccountRole;
import com.thepersonae.domain.UserAccount;
import com.thepersonae.service.ChatHub;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.Map;

/** Notification channel only: clients ping to stay alive, every chat write goes through the REST API. */
@Component
public class ChatSocketHandler extends TextWebSocketHandler {

    private final ChatHub hub;

    public ChatSocketHandler(ChatHub hub) {
        this.hub = hub;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        if (!(session.getPrincipal() instanceof Authentication auth) || !(auth.getPrincipal() instanceof UserAccount user)) {
            session.close(CloseStatus.POLICY_VIOLATION);
            return;
        }
        session.setTextMessageSizeLimit(1024);
        hub.register(session, user.getId(), user.getRole() == AccountRole.ADMIN);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        hub.touch(session);
        if (message.getPayload().contains("\"ping\"")) {
            hub.reply(session, Map.of("type", "pong"));
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        hub.unregister(session);
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        hub.unregister(session);
    }
}
