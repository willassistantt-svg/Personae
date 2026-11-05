package com.thepersonae.web;

import com.thepersonae.domain.UserAccount;
import com.thepersonae.service.ChatService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
public class ChatController {

    private final ChatService chat;

    public ChatController(ChatService chat) {
        this.chat = chat;
    }

    @GetMapping("/api/chat/status")
    public ChatService.Status status(@AuthenticationPrincipal UserAccount user) {
        return chat.memberStatus(user);
    }

    @GetMapping("/api/chat/messages")
    public ChatService.Page messages(
            @AuthenticationPrincipal UserAccount user,
            @RequestParam(required = false) Instant before,
            @RequestParam(required = false) Integer limit
    ) {
        return chat.memberHistory(user, before, limit);
    }

    @PostMapping("/api/chat/messages")
    public ChatService.MessageView send(@AuthenticationPrincipal UserAccount user, @RequestBody Outgoing body) {
        return chat.memberSend(user, body.body(), body.safeClientId());
    }

    @PostMapping("/api/chat/read")
    public ResponseEntity<Void> read(@AuthenticationPrincipal UserAccount user) {
        chat.memberRead(user);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/api/admin/chat/conversations")
    public List<ChatService.ConversationView> conversations() {
        return chat.conversations();
    }

    @GetMapping("/api/admin/chat/unread")
    public Map<String, Long> unread() {
        return Map.of("unread", chat.houseUnread());
    }

    @GetMapping("/api/admin/chat/conversations/{memberId}")
    public ChatService.ThreadView thread(
            @PathVariable UUID memberId,
            @RequestParam(required = false) Instant before,
            @RequestParam(required = false) Integer limit
    ) {
        return chat.houseHistory(memberId, before, limit);
    }

    @PostMapping("/api/admin/chat/conversations/{memberId}/messages")
    public ChatService.MessageView reply(@AuthenticationPrincipal UserAccount admin, @PathVariable UUID memberId, @RequestBody Outgoing body) {
        return chat.houseSend(admin, memberId, body.body(), body.safeClientId());
    }

    @PostMapping("/api/admin/chat/conversations/{memberId}/read")
    public ResponseEntity<Void> houseRead(@PathVariable UUID memberId) {
        chat.houseRead(memberId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/api/admin/chat/conversations/{memberId}")
    public ResponseEntity<Void> delete(@PathVariable UUID memberId) {
        chat.houseDelete(memberId);
        return ResponseEntity.noContent().build();
    }

    public record Outgoing(String body, String clientId) {
        String safeClientId() {
            return clientId != null && clientId.length() <= 64 ? clientId : null;
        }
    }
}
