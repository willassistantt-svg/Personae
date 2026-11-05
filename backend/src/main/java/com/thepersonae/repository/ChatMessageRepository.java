package com.thepersonae.repository;

import com.thepersonae.domain.ChatMessage;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {

    List<ChatMessage> findByConversationIdOrderByCreatedAtDesc(UUID conversationId, Pageable page);

    List<ChatMessage> findByConversationIdAndCreatedAtBeforeOrderByCreatedAtDesc(UUID conversationId, Instant before, Pageable page);

    Optional<ChatMessage> findFirstByConversationIdOrderByCreatedAtDesc(UUID conversationId);

    long countByConversationIdAndFromHouse(UUID conversationId, boolean fromHouse);

    long countByConversationIdAndFromHouseAndCreatedAtAfter(UUID conversationId, boolean fromHouse, Instant after);
}
