package com.thepersonae.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "favorites")
@IdClass(Favorite.Key.class)
@Getter
@Setter
@NoArgsConstructor
public class Favorite {

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Id
    @Column(name = "profile_id")
    private UUID profileId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    public static class Key implements Serializable {
        private UUID userId;
        private UUID profileId;

        public Key() {
        }

        public Key(UUID userId, UUID profileId) {
            this.userId = userId;
            this.profileId = profileId;
        }

        @Override
        public boolean equals(Object other) {
            if (this == other) {
                return true;
            }
            if (!(other instanceof Key key)) {
                return false;
            }
            return userId.equals(key.userId) && profileId.equals(key.profileId);
        }

        @Override
        public int hashCode() {
            return userId.hashCode() * 31 + profileId.hashCode();
        }
    }
}
