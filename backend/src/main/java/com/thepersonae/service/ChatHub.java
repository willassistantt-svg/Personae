package com.thepersonae.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Live chat connections of this API instance. Presence is "has at least one open socket"; the house is online
 * while any admin is connected. Messages themselves live in the database, sockets only carry notifications.
 */
@Component
public class ChatHub {

    private static final Logger log = LoggerFactory.getLogger(ChatHub.class);
    static final Duration IDLE_LIMIT = Duration.ofSeconds(75);

    private final ObjectMapper json;
    private final Map<UUID, Set<Connection>> members = new ConcurrentHashMap<>();
    private final Map<UUID, Set<Connection>> admins = new ConcurrentHashMap<>();
    private final Map<String, Connection> bySession = new ConcurrentHashMap<>();

    public ChatHub(ObjectMapper json) {
        this.json = json;
    }

    private static final class Connection {
        final UUID userId;
        final boolean admin;
        final WebSocketSession session;
        volatile Instant lastSeen = Instant.now();

        Connection(UUID userId, boolean admin, WebSocketSession session) {
            this.userId = userId;
            this.admin = admin;
            this.session = new ConcurrentWebSocketSessionDecorator(session, 5_000, 256 * 1024);
        }
    }

    public void register(WebSocketSession session, UUID userId, boolean admin) {
        Connection connection = new Connection(userId, admin, session);
        bySession.put(session.getId(), connection);
        boolean houseWasOnline = houseOnline();
        Set<Connection> own = (admin ? admins : members).computeIfAbsent(userId, key -> ConcurrentHashMap.newKeySet());
        boolean first = own.isEmpty();
        own.add(connection);
        send(connection, event("type", "hello", "houseOnline", houseOnline()));
        if (admin && !houseWasOnline) {
            toAllMembers(event("type", "house", "online", true));
        }
        if (!admin && first) {
            toAdmins(event("type", "presence", "memberId", userId, "online", true));
        }
    }

    public void unregister(WebSocketSession session) {
        Connection connection = bySession.remove(session.getId());
        if (connection == null) {
            return;
        }
        Map<UUID, Set<Connection>> pool = connection.admin ? admins : members;
        Set<Connection> own = pool.get(connection.userId);
        boolean last = false;
        if (own != null) {
            own.remove(connection);
            if (own.isEmpty()) {
                pool.remove(connection.userId, own);
                last = true;
            }
        }
        if (!last) {
            return;
        }
        if (connection.admin && !houseOnline()) {
            toAllMembers(event("type", "house", "online", false));
        }
        if (!connection.admin) {
            toAdmins(event("type", "presence", "memberId", connection.userId, "online", false));
        }
    }

    public void touch(WebSocketSession session) {
        Connection connection = bySession.get(session.getId());
        if (connection != null) {
            connection.lastSeen = Instant.now();
        }
    }

    public void reply(WebSocketSession session, Object payload) {
        Connection connection = bySession.get(session.getId());
        if (connection != null) {
            send(connection, payload);
        }
    }

    public boolean houseOnline() {
        return !admins.isEmpty();
    }

    public boolean memberOnline(UUID memberId) {
        return members.containsKey(memberId);
    }

    public void toMember(UUID memberId, Object payload) {
        sendAll(members.get(memberId), payload);
    }

    public void toAdmins(Object payload) {
        admins.values().forEach(set -> sendAll(set, payload));
    }

    public void toAllMembers(Object payload) {
        members.values().forEach(set -> sendAll(set, payload));
    }

    /** Closes every socket of an account, e.g. when it is disabled or removed. */
    public void disconnect(UUID userId) {
        for (Map<UUID, Set<Connection>> pool : List.of(members, admins)) {
            Set<Connection> own = pool.get(userId);
            if (own != null) {
                List.copyOf(own).forEach(connection -> close(connection, CloseStatus.POLICY_VIOLATION));
            }
        }
    }

    /** Drops sockets that stopped pinging (phone asleep, network gone) so presence stays truthful. */
    @Scheduled(fixedDelay = 20_000)
    public void sweep() {
        Instant limit = Instant.now().minus(IDLE_LIMIT);
        List.copyOf(bySession.values()).stream()
                .filter(connection -> connection.lastSeen.isBefore(limit))
                .forEach(connection -> close(connection, CloseStatus.SESSION_NOT_RELIABLE));
    }

    private static Map<String, Object> event(Object... pairs) {
        Map<String, Object> event = new LinkedHashMap<>();
        for (int i = 0; i < pairs.length; i += 2) {
            event.put((String) pairs[i], pairs[i + 1]);
        }
        return event;
    }

    private void close(Connection connection, CloseStatus status) {
        try {
            connection.session.close(status);
        } catch (IOException | RuntimeException ex) {
            log.debug("Closing chat socket failed: {}", ex.getMessage());
        }
        unregister(connection.session);
    }

    private void sendAll(Collection<Connection> connections, Object payload) {
        if (connections == null) {
            return;
        }
        List.copyOf(connections).forEach(connection -> send(connection, payload));
    }

    private void send(Connection connection, Object payload) {
        if (!connection.session.isOpen()) {
            return;
        }
        try {
            connection.session.sendMessage(new TextMessage(json.writeValueAsString(payload)));
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException(ex);
        } catch (IOException | RuntimeException ex) {
            log.debug("Chat socket send failed: {}", ex.getMessage());
        }
    }
}
