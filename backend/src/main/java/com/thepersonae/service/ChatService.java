package com.thepersonae.service;

import com.thepersonae.domain.AccountRole;
import com.thepersonae.domain.AccountStatus;
import com.thepersonae.domain.ChatConversation;
import com.thepersonae.domain.ChatMessage;
import com.thepersonae.domain.UserAccount;
import com.thepersonae.repository.ChatConversationRepository;
import com.thepersonae.repository.ChatMessageRepository;
import com.thepersonae.repository.UserAccountRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Deque;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;

@Service
public class ChatService {

    public static final int MAX_LENGTH = 2000;
    static final int PAGE_DEFAULT = 50;
    static final int PAGE_MAX = 100;
    static final int RATE_LIMIT = 20;
    static final long RATE_WINDOW_SECONDS = 30;

    private final ChatConversationRepository conversations;
    private final ChatMessageRepository messages;
    private final UserAccountRepository users;
    private final ChatHub hub;
    private final AuditService audit;
    private final Clock clock;
    private final Map<UUID, Deque<Instant>> recentSends = new ConcurrentHashMap<>();

    @Autowired
    public ChatService(ChatConversationRepository conversations, ChatMessageRepository messages, UserAccountRepository users, ChatHub hub,
                       AuditService audit) {
        this(conversations, messages, users, hub, audit, Clock.systemUTC());
    }

    ChatService(ChatConversationRepository conversations, ChatMessageRepository messages, UserAccountRepository users, ChatHub hub,
                AuditService audit, Clock clock) {
        this.conversations = conversations;
        this.messages = messages;
        this.users = users;
        this.hub = hub;
        this.audit = audit;
        this.clock = clock;
    }

    // ---- member side -------------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public Status memberStatus(UserAccount member) {
        requireMember(member);
        long unread = conversations.findByMemberId(member.getId()).map(c -> unread(c, true)).orElse(0L);
        return new Status(hub.houseOnline(), unread);
    }

    @Transactional(readOnly = true)
    public Page memberHistory(UserAccount member, Instant before, Integer limit) {
        requireMember(member);
        return conversations.findByMemberId(member.getId())
                .map(c -> page(c, before, limit, false))
                .orElseGet(() -> new Page(List.of(), false));
    }

    @Transactional
    public MessageView memberSend(UserAccount member, String body, String clientId) {
        requireMember(member);
        String text = clean(body);
        throttle(member.getId());
        ChatConversation conversation = conversationOf(member.getId());
        ChatMessage saved = store(conversation, member, false, text);
        conversation.setMemberReadAt(saved.getCreatedAt());
        broadcast(member, saved, clientId);
        return view(saved, clientId, false);
    }

    @Transactional
    public void memberRead(UserAccount member) {
        requireMember(member);
        conversations.findByMemberId(member.getId()).ifPresent(conversation -> {
            conversation.setMemberReadAt(now());
            afterCommit(() -> hub.toMember(member.getId(), Map.of("type", "read", "memberId", member.getId(), "side", "member")));
        });
    }

    // ---- house side --------------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<ConversationView> conversations() {
        List<ConversationView> result = new ArrayList<>();
        for (ChatConversation conversation : conversations.findStarted()) {
            UserAccount member = conversation.getMember();
            MessageView last = messages.findFirstByConversationIdOrderByCreatedAtDesc(conversation.getId())
                    .map(message -> view(message, null, true))
                    .orElse(null);
            result.add(new ConversationView(memberView(member), last, unread(conversation, false), conversation.getLastMessageAt()));
        }
        return result;
    }

    @Transactional(readOnly = true)
    public long houseUnread() {
        return conversations.countUnreadForHouse();
    }

    @Transactional(readOnly = true)
    public ThreadView houseHistory(UUID memberId, Instant before, Integer limit) {
        UserAccount member = chatMember(memberId);
        Page page = conversations.findByMemberId(memberId)
                .map(c -> page(c, before, limit, true))
                .orElseGet(() -> new Page(List.of(), false));
        return new ThreadView(memberView(member), page.messages(), page.hasMore());
    }

    @Transactional
    public MessageView houseSend(UserAccount admin, UUID memberId, String body, String clientId) {
        UserAccount member = chatMember(memberId);
        if (member.getStatus() != AccountStatus.ACTIVE) {
            throw new ApiException(HttpStatus.CONFLICT, "CHAT_MEMBER_INACTIVE", "This member cannot receive messages");
        }
        String text = clean(body);
        throttle(admin.getId());
        ChatConversation conversation = conversationOf(memberId);
        ChatMessage saved = store(conversation, admin, true, text);
        conversation.setHouseReadAt(saved.getCreatedAt());
        broadcast(member, saved, clientId);
        return view(saved, clientId, true);
    }

    @Transactional
    public void houseRead(UUID memberId) {
        chatMember(memberId);
        conversations.findByMemberId(memberId).ifPresent(conversation -> {
            conversation.setHouseReadAt(now());
            afterCommit(() -> hub.toAdmins(Map.of("type", "read", "memberId", memberId, "side", "house")));
        });
    }

    /** Erases the conversation and every message in it (the messages go with it through the foreign key cascade). */
    @Transactional
    public void houseDelete(UUID memberId) {
        UserAccount member = chatMember(memberId);
        if (conversations.deleteByMemberId(memberId) == 0) {
            return;
        }
        audit.record("CHAT_DELETED", member.getEmail(), "REMOVED");
        Map<String, Object> event = new LinkedHashMap<>();
        event.put("type", "cleared");
        event.put("memberId", memberId);
        afterCommit(() -> {
            hub.toMember(memberId, event);
            hub.toAdmins(event);
        });
    }

    // ---- internals ---------------------------------------------------------------------------------

    private void requireMember(UserAccount user) {
        if (user == null || user.getRole() != AccountRole.USER) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "The chat is for members");
        }
    }

    private UserAccount chatMember(UUID memberId) {
        UserAccount member = users.findById(memberId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Member not found"));
        if (member.getRole() != AccountRole.USER) {
            throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Member not found");
        }
        return member;
    }

    static String clean(String body) {
        String text = body == null ? "" : body.replace("\r\n", "\n").strip();
        if (text.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "CHAT_EMPTY", "Write a message first");
        }
        if (text.length() > MAX_LENGTH) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "CHAT_TOO_LONG", "Messages are limited to " + MAX_LENGTH + " characters");
        }
        return text;
    }

    void throttle(UUID userId) {
        Instant now = clock.instant();
        Deque<Instant> sends = recentSends.computeIfAbsent(userId, key -> new ConcurrentLinkedDeque<>());
        synchronized (sends) {
            Instant cutoff = now.minusSeconds(RATE_WINDOW_SECONDS);
            while (!sends.isEmpty() && sends.peekFirst().isBefore(cutoff)) {
                sends.pollFirst();
            }
            if (sends.size() >= RATE_LIMIT) {
                throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "CHAT_RATE", "Too many messages, wait a moment");
            }
            sends.addLast(now);
        }
    }

    private ChatConversation conversationOf(UUID memberId) {
        conversations.createIfMissing(UUID.randomUUID(), memberId, now());
        return conversations.findByMemberId(memberId).orElseThrow();
    }

    private ChatMessage store(ChatConversation conversation, UserAccount sender, boolean fromHouse, String text) {
        ChatMessage message = new ChatMessage();
        message.setConversation(conversation);
        message.setSender(sender);
        message.setFromHouse(fromHouse);
        message.setBody(text);
        message.setCreatedAt(now());
        messages.save(message);
        conversation.setLastMessageAt(message.getCreatedAt());
        return message;
    }

    private void broadcast(UserAccount member, ChatMessage message, String clientId) {
        Map<String, Object> toMember = event(member, message, clientId, false);
        Map<String, Object> toHouse = event(member, message, clientId, true);
        afterCommit(() -> {
            hub.toMember(member.getId(), toMember);
            hub.toAdmins(toHouse);
        });
    }

    private Map<String, Object> event(UserAccount member, ChatMessage message, String clientId, boolean forHouse) {
        Map<String, Object> event = new LinkedHashMap<>();
        event.put("type", "message");
        event.put("memberId", member.getId());
        if (forHouse) {
            event.put("memberName", member.getFirstName() + " " + member.getLastName());
        }
        event.put("message", view(message, clientId, forHouse));
        return event;
    }

    private Page page(ChatConversation conversation, Instant before, Integer limit, boolean forHouse) {
        int size = limit == null ? PAGE_DEFAULT : Math.max(1, Math.min(PAGE_MAX, limit));
        PageRequest request = PageRequest.of(0, size + 1);
        List<ChatMessage> found = before == null
                ? messages.findByConversationIdOrderByCreatedAtDesc(conversation.getId(), request)
                : messages.findByConversationIdAndCreatedAtBeforeOrderByCreatedAtDesc(conversation.getId(), before, request);
        boolean more = found.size() > size;
        List<MessageView> views = new ArrayList<>(found.subList(0, Math.min(size, found.size())).stream()
                .map(message -> view(message, null, forHouse))
                .toList());
        Collections.reverse(views);
        return new Page(views, more);
    }

    private long unread(ChatConversation conversation, boolean forMember) {
        Instant readAt = forMember ? conversation.getMemberReadAt() : conversation.getHouseReadAt();
        return readAt == null
                ? messages.countByConversationIdAndFromHouse(conversation.getId(), forMember)
                : messages.countByConversationIdAndFromHouseAndCreatedAtAfter(conversation.getId(), forMember, readAt);
    }

    private MessageView view(ChatMessage message, String clientId, boolean forHouse) {
        String sender = null;
        if (forHouse && message.isFromHouse() && message.getSender() != null) {
            sender = message.getSender().getFirstName();
        }
        return new MessageView(message.getId(), message.getBody(), message.isFromHouse(), sender, message.getCreatedAt(), clientId);
    }

    private MemberView memberView(UserAccount member) {
        return new MemberView(member.getId(), member.getFirstName(), member.getLastName(), member.getMemberCode(),
                hub.memberOnline(member.getId()), member.getStatus() == AccountStatus.ACTIVE);
    }

    private Instant now() {
        return clock.instant().truncatedTo(ChronoUnit.MICROS);
    }

    private static void afterCommit(Runnable action) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    action.run();
                }
            });
        } else {
            action.run();
        }
    }

    public record Status(boolean houseOnline, long unread) {
    }

    public record MessageView(UUID id, String body, boolean fromHouse, String senderName, Instant createdAt, String clientId) {
    }

    public record Page(List<MessageView> messages, boolean hasMore) {
    }

    public record MemberView(UUID id, String firstName, String lastName, String memberCode, boolean online, boolean active) {
    }

    public record ThreadView(MemberView member, List<MessageView> messages, boolean hasMore) {
    }

    public record ConversationView(MemberView member, MessageView lastMessage, long unread, Instant lastMessageAt) {
    }
}
