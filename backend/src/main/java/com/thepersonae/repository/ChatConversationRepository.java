package com.thepersonae.repository;

import com.thepersonae.domain.ChatConversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChatConversationRepository extends JpaRepository<ChatConversation, UUID> {

    Optional<ChatConversation> findByMemberId(UUID memberId);

    @Query("select c from ChatConversation c join fetch c.member where c.lastMessageAt is not null order by c.lastMessageAt desc")
    List<ChatConversation> findStarted();

    @Modifying
    @Query(value = "insert into chat_conversations (id, member_id, created_at) values (:id, :memberId, :now) on conflict (member_id) do nothing",
            nativeQuery = true)
    void createIfMissing(@Param("id") UUID id, @Param("memberId") UUID memberId, @Param("now") Instant now);

    @Modifying
    @Query(value = "delete from chat_conversations where member_id = :memberId", nativeQuery = true)
    int deleteByMemberId(@Param("memberId") UUID memberId);

    @Query(value = """
            select count(*) from chat_messages m
            join chat_conversations c on c.id = m.conversation_id
            where m.from_house = false and (c.house_read_at is null or m.created_at > c.house_read_at)
            """, nativeQuery = true)
    long countUnreadForHouse();
}
